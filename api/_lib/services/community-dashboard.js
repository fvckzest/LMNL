import { AppError } from '../errors.js';
import * as attendanceRepo from '../repositories/attendance.js';
import { buildKnownCommunityEmails } from './attendance.js';

function isMissingPhase2TableError(error) {
  if (error?.code !== 'PGRST205') {
    return false;
  }

  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('attendance_verification_sources')
    || message.includes('attendance_records')
    || message.includes('attendance_artifacts')
    || message.includes('point_transactions')
  );
}

function formatEventDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString();
}

export async function getCommunityDashboard(user, deps = {}) {
  const repo = deps.repo || attendanceRepo;

  try {
    const identityRows = await repo.listUserIdentitiesByUserId(user.id, deps);
    const knownEmails = buildKnownCommunityEmails(user, identityRows);
    const attendanceRecords = await repo.listAttendanceRecordsByUser(user.id, deps);
    const attendanceIds = attendanceRecords.map((record) => record.id);
    const eventIds = attendanceRecords.map((record) => record.event_id);

    const [artifacts, pointTransactions, events, overlapRecords, pendingSources] = await Promise.all([
      repo.listAttendanceArtifactsByAttendanceIds(attendanceIds, deps),
      repo.listPointTransactionsByUser(user.id, deps),
      repo.listEventsByIds(eventIds, deps),
      repo.listOverlappingAttendanceByEventIds(eventIds, user.id, deps),
      repo.listPendingVerificationSourcesByEmails(knownEmails, deps),
    ]);

    const artifactByAttendanceId = new Map(artifacts.map((artifact) => [artifact.attendance_id, artifact]));
    const eventById = new Map(events.map((event) => [event.id, event]));
    const pointsByAttendanceId = new Map();

    pointTransactions.forEach((transaction) => {
      if (!transaction.attendance_id) {
        return;
      }

      const current = pointsByAttendanceId.get(transaction.attendance_id) || 0;
      pointsByAttendanceId.set(transaction.attendance_id, current + Number(transaction.points_delta || 0));
    });

    const history = attendanceRecords.map((record) => {
      const event = eventById.get(record.event_id) || {};
      const artifact = artifactByAttendanceId.get(record.id) || null;
      return {
        id: record.id,
        eventId: record.event_id,
        eventName: event.name || 'LMNL Event',
        eventDate: event.event_date || null,
        eventDateLabel: formatEventDate(event.event_date),
        locationName: event.location_name || '',
        attendanceState: record.attendance_state,
        participationTier: record.participation_tier,
        verifiedAt: record.verified_at,
        artifact: artifact ? {
          id: artifact.id,
          type: artifact.artifact_type,
          title: artifact.title,
          subtitle: artifact.subtitle,
          issuedAt: artifact.issued_at,
        } : null,
        pointsEarned: pointsByAttendanceId.get(record.id) || 0,
      };
    });

    const latestAttendance = history[0] || null;
    const totalPoints = pointTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.points_delta || 0),
      0,
    );

    const overlapByUserId = new Map();
    overlapRecords.forEach((record) => {
      const current = overlapByUserId.get(record.user_id) || {
        userId: record.user_id,
        sharedEventIds: new Set(),
        latestVerifiedAt: '',
        performerCount: 0,
      };

      current.sharedEventIds.add(record.event_id);
      if (!current.latestVerifiedAt || new Date(record.verified_at) > new Date(current.latestVerifiedAt)) {
        current.latestVerifiedAt = record.verified_at;
      }
      if (record.participation_tier === 'performer') {
        current.performerCount += 1;
      }

      overlapByUserId.set(record.user_id, current);
    });

    const overlapUserIds = Array.from(overlapByUserId.keys());
    const overlapProfiles = await repo.listProfilesByIds(overlapUserIds, deps);
    const profileById = new Map(overlapProfiles.map((profile) => [profile.id, profile]));

    const sharedAttendancePreview = Array.from(overlapByUserId.values())
      .map((entry) => {
        const profile = profileById.get(entry.userId);
        const sharedEventList = Array.from(entry.sharedEventIds).map((eventId) => eventById.get(eventId)?.name).filter(Boolean);
        return {
          userId: entry.userId,
          displayName: profile?.display_name || 'LMNL Member',
          profileSlug: profile?.profile_slug || '',
          avatarUrl: profile?.avatar_url || '',
          overlapCount: entry.sharedEventIds.size,
          sharedEvents: sharedEventList,
          latestVerifiedAt: entry.latestVerifiedAt,
          performerSharedCount: entry.performerCount,
        };
      })
      .sort((a, b) => {
        if (b.overlapCount !== a.overlapCount) {
          return b.overlapCount - a.overlapCount;
        }

        return new Date(b.latestVerifiedAt || 0) - new Date(a.latestVerifiedAt || 0);
      })
      .slice(0, 6);

    const pendingEventIds = pendingSources.map((source) => source.event_id).filter(Boolean);
    const pendingEvents = pendingEventIds.length
      ? await repo.listEventsByIds(pendingEventIds, deps)
      : [];
    const pendingEventById = new Map(pendingEvents.map((event) => [event.id, event]));

    const pendingClaims = pendingSources.map((source) => {
      const event = pendingEventById.get(source.event_id) || {};
      return {
        id: source.id,
        eventId: source.event_id,
        eventName: event.name || 'LMNL Event',
        eventDate: event.event_date || null,
        eventDateLabel: formatEventDate(event.event_date),
        participationTier: source.participation_tier || 'attendee',
        verificationMethod: source.verification_method,
        contactEmail: source.contact_email || '',
      };
    });

    return {
      summary: {
        totalVerifiedEvents: history.length,
        totalPoints,
        performerAppearances: history.filter((entry) => entry.participationTier === 'performer').length,
        pendingClaims: pendingClaims.length,
      },
      latestAttendance,
      history,
      sharedAttendancePreview,
      pendingClaims,
      knownEmails,
    };
  } catch (error) {
    if (isMissingPhase2TableError(error)) {
      throw new AppError('Phase 2 attendance tables are not available yet. Apply `sql/phase2_attendance_dashboard.sql` and try again.', {
        code: 'PHASE2_SETUP_REQUIRED',
        status: 503,
        details: error,
        expose: true,
      });
    }

    throw error;
  }
}
