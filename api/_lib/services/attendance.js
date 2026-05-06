import { AppError } from '../errors.js';
import { getEventById } from '../repositories/events.js';
import * as attendanceRepo from '../repositories/attendance.js';

const ATTENDEE_POINTS = 10;
const PERFORMER_BONUS_POINTS = 15;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function dedupe(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

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

function wrapPhase2SetupError(error) {
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

export function chooseParticipationTier(currentTier = 'attendee', nextTier = 'attendee') {
  return currentTier === 'performer' || nextTier !== 'performer' ? currentTier : 'performer';
}

export function buildKnownCommunityEmails(user = {}, identityRows = []) {
  return dedupe([
    normalizeEmail(user?.email),
    ...identityRows.map((row) => normalizeEmail(row?.provider_email)),
  ]);
}

function buildArtifactTitle(event = {}) {
  return event?.name || 'LMNL Attendance';
}

function buildArtifactSubtitle(event = {}, participationTier = 'attendee') {
  const date = event?.event_date ? new Date(event.event_date).toLocaleDateString() : 'Verified event';
  return participationTier === 'performer'
    ? `${date} • Performer proof`
    : `${date} • Attendance proof`;
}

async function maybeResolveCommunityUserIdByEmail(email, deps = {}) {
  const repo = deps.repo || attendanceRepo;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const matchingUserIds = await repo.findCommunityUserIdsByEmail(normalizedEmail, deps);
  const uniqueUserIds = dedupe(matchingUserIds);
  return uniqueUserIds.length === 1 ? uniqueUserIds[0] : null;
}

async function ensureArtifact(attendanceRecord, event, deps = {}) {
  const repo = deps.repo || attendanceRepo;
  const existingArtifact = await repo.findAttendanceArtifactByAttendanceId(attendanceRecord.id, deps);
  const artifactPayload = {
    artifact_type: 'event_proof',
    title: buildArtifactTitle(event),
    subtitle: buildArtifactSubtitle(event, attendanceRecord.participation_tier),
    metadata: {
      event_id: event?.id || attendanceRecord.event_id,
      participation_tier: attendanceRecord.participation_tier,
    },
  };

  if (!existingArtifact) {
    return repo.createAttendanceArtifact({
      attendance_id: attendanceRecord.id,
      issued_at: attendanceRecord.verified_at,
      ...artifactPayload,
    }, deps);
  }

  const nextMetadata = {
    ...(existingArtifact.metadata || {}),
    ...artifactPayload.metadata,
  };

  if (
    existingArtifact.title === artifactPayload.title
    && existingArtifact.subtitle === artifactPayload.subtitle
    && JSON.stringify(existingArtifact.metadata || {}) === JSON.stringify(nextMetadata)
  ) {
    return existingArtifact;
  }

  return repo.updateAttendanceArtifact(existingArtifact.id, {
    title: artifactPayload.title,
    subtitle: artifactPayload.subtitle,
    metadata: nextMetadata,
  }, deps);
}

async function ensurePointTransaction(attendanceRecord, reason, pointsDelta, metadata, deps = {}) {
  const repo = deps.repo || attendanceRepo;
  const existingTransaction = await repo.findPointTransactionByAttendanceAndReason(attendanceRecord.id, reason, deps);
  if (existingTransaction) {
    return existingTransaction;
  }

  return repo.createPointTransaction({
    user_id: attendanceRecord.user_id,
    attendance_id: attendanceRecord.id,
    reason,
    points_delta: pointsDelta,
    metadata,
  }, deps);
}

async function ensurePoints(attendanceRecord, event, deps = {}) {
  await ensurePointTransaction(
    attendanceRecord,
    'attendance_verified',
    ATTENDEE_POINTS,
    {
      event_id: event?.id || attendanceRecord.event_id,
      participation_tier: attendanceRecord.participation_tier,
    },
    deps,
  );

  if (attendanceRecord.participation_tier === 'performer') {
    await ensurePointTransaction(
      attendanceRecord,
      'performer_bonus',
      PERFORMER_BONUS_POINTS,
      {
        event_id: event?.id || attendanceRecord.event_id,
      },
      deps,
    );
  }
}

async function issueAttendanceForSource(source, deps = {}) {
  const repo = deps.repo || attendanceRepo;
  const loadEventById = deps.getEventById || getEventById;

  if (!source?.resolved_user_id || !source?.event_id) {
    return { attendanceRecord: null, artifact: null };
  }

  const event = await loadEventById(source.event_id);
  const desiredTier = source.participation_tier || source?.metadata?.participation_tier || 'attendee';
  const existingRecord = await repo.findAttendanceRecordByUserAndEvent(
    source.resolved_user_id,
    source.event_id,
    deps,
  );

  let attendanceRecord = existingRecord;

  if (!attendanceRecord) {
    attendanceRecord = await repo.createAttendanceRecord({
      user_id: source.resolved_user_id,
      event_id: source.event_id,
      verification_source_id: source.id,
      attendance_state: 'verified',
      participation_tier: desiredTier,
      verified_at: source.verified_at || new Date().toISOString(),
    }, deps);
  } else {
    const nextTier = chooseParticipationTier(attendanceRecord.participation_tier, desiredTier);
    const shouldUpdate = (
      attendanceRecord.verification_source_id !== source.id
      || attendanceRecord.participation_tier !== nextTier
      || attendanceRecord.attendance_state !== 'verified'
    );

    if (shouldUpdate) {
      attendanceRecord = await repo.updateAttendanceRecord(attendanceRecord.id, {
        verification_source_id: source.id,
        attendance_state: 'verified',
        participation_tier: nextTier,
        verified_at: attendanceRecord.verified_at || source.verified_at || new Date().toISOString(),
      }, deps);
    }
  }

  const artifact = await ensureArtifact(attendanceRecord, event, deps);
  await ensurePoints(attendanceRecord, event, deps);

  return {
    attendanceRecord,
    artifact,
    event,
  };
}

function buildSourceMetadata(source = {}, extra = {}) {
  return {
    ...(source && source.metadata && typeof source.metadata === 'object' ? source.metadata : {}),
    ...extra,
  };
}

export async function recordTicketAttendanceVerification(
  { ticket, event, verifiedByAdminUserId = null },
  deps = {},
) {
  const repo = deps.repo || attendanceRepo;

  try {
    if (!ticket?.id || !event?.id) {
      return null;
    }

    const resolvedUserId = await maybeResolveCommunityUserIdByEmail(ticket.customer_email, deps);
    const existingSource = await repo.findVerificationSourceBySource('ticket', ticket.id, deps);
    const payload = {
      event_id: event.id,
      source_type: 'ticket',
      source_id: ticket.id,
      verification_method: 'ticket_check_in',
      verification_status: resolvedUserId ? 'verified' : 'pending_resolution',
      participation_tier: 'attendee',
      verified_at: ticket.used_at || new Date().toISOString(),
      verified_by_admin_user_id: verifiedByAdminUserId,
      contact_email: normalizeEmail(ticket.customer_email) || null,
      contact_name: ticket.customer_name || null,
      resolved_user_id: resolvedUserId,
      metadata: buildSourceMetadata(existingSource, {
        qr_code_payload: ticket.qr_code_payload || null,
      }),
    };

    const source = existingSource
      ? await repo.updateVerificationSource(existingSource.id, payload, deps)
      : await repo.createVerificationSource(payload, deps);

    if (!source.resolved_user_id) {
      return {
        source,
        attendanceRecord: null,
        artifact: null,
      };
    }

    return issueAttendanceForSource(source, deps).then((result) => ({
      source,
      ...result,
    }));
  } catch (error) {
    wrapPhase2SetupError(error);
  }
}

export async function claimAttendanceSourceForUser(sourceId, user, deps = {}) {
  const repo = deps.repo || attendanceRepo;

  try {
    const source = await repo.findVerificationSourceById(sourceId, deps);
    if (!source) {
      throw new AppError('Attendance source not found.', {
        code: 'NOT_FOUND',
        status: 404,
        expose: true,
      });
    }

    const identityRows = await repo.listUserIdentitiesByUserId(user.id, deps);
    const knownEmails = buildKnownCommunityEmails(user, identityRows);
    const sourceEmail = normalizeEmail(source.contact_email);

    if (!sourceEmail || !knownEmails.includes(sourceEmail)) {
      throw new AppError('This attendance proof cannot be claimed by the current user.', {
        code: 'FORBIDDEN',
        status: 403,
        expose: true,
      });
    }

    const resolvedSource = source.resolved_user_id === user.id
      ? source
      : await repo.updateVerificationSource(source.id, {
        resolved_user_id: user.id,
        verification_status: 'verified',
      }, deps);

    const result = await issueAttendanceForSource(resolvedSource, deps);
    return {
      source: resolvedSource,
      ...result,
    };
  } catch (error) {
    wrapPhase2SetupError(error);
  }
}

export async function attachAttendanceSourceToUser(
  {
    sourceId,
    userId,
    adminUserId,
    participationTier,
  },
  deps = {},
) {
  const repo = deps.repo || attendanceRepo;

  try {
    const source = await repo.findVerificationSourceById(sourceId, deps);
    if (!source) {
      throw new AppError('Attendance source not found.', {
        code: 'NOT_FOUND',
        status: 404,
        expose: true,
      });
    }

    const resolvedSource = await repo.updateVerificationSource(source.id, {
      resolved_user_id: userId,
      verified_by_admin_user_id: adminUserId || source.verified_by_admin_user_id || null,
      verification_method: 'retroactive_staff_attach',
      verification_status: 'verified',
      participation_tier: participationTier || source.participation_tier || 'attendee',
      metadata: buildSourceMetadata(source, {
        attached_by_admin_user_id: adminUserId || null,
        attached_at: new Date().toISOString(),
      }),
    }, deps);

    const result = await issueAttendanceForSource(resolvedSource, deps);
    return {
      source: resolvedSource,
      ...result,
    };
  } catch (error) {
    wrapPhase2SetupError(error);
  }
}

export async function createManualAttendanceSource(
  {
    eventId,
    userId,
    adminUserId,
    contactEmail,
    contactName,
    participationTier = 'attendee',
    notes = '',
  },
  deps = {},
) {
  const repo = deps.repo || attendanceRepo;
  const loadEventById = deps.getEventById || getEventById;

  try {
    const event = await loadEventById(eventId);
    if (!event?.id) {
      throw new AppError('Event not found.', {
        code: 'NOT_FOUND',
        status: 404,
        expose: true,
      });
    }

    const source = await repo.createVerificationSource({
      event_id: eventId,
      source_type: 'manual_staff',
      source_id: null,
      verification_method: userId ? 'retroactive_staff_attach' : 'staff_confirmed',
      verification_status: userId ? 'verified' : 'pending_resolution',
      participation_tier: participationTier,
      verified_at: new Date().toISOString(),
      verified_by_admin_user_id: adminUserId || null,
      contact_email: normalizeEmail(contactEmail) || null,
      contact_name: contactName || null,
      resolved_user_id: userId || null,
      metadata: {
        notes,
      },
    }, deps);

    if (!userId) {
      return { source, attendanceRecord: null, artifact: null, event };
    }

    const result = await issueAttendanceForSource(source, deps);
    return {
      source,
      ...result,
    };
  } catch (error) {
    wrapPhase2SetupError(error);
  }
}

export async function getAdminAttendanceQueue(deps = {}) {
  const repo = deps.repo || attendanceRepo;

  try {
    const sources = await repo.listUnresolvedVerificationSources(deps);
    const eventIds = dedupe(sources.map((source) => source.event_id).filter(Boolean));
    const events = await repo.listEventsByIds(eventIds, deps);
    const eventById = new Map(events.map((event) => [event.id, event]));

    const emails = dedupe(sources.map((source) => normalizeEmail(source.contact_email)).filter(Boolean));
    const userIdsByEmail = new Map();

    await Promise.all(
      emails.map(async (email) => {
        const matchingUserIds = dedupe(await repo.findCommunityUserIdsByEmail(email, deps));
        userIdsByEmail.set(email, matchingUserIds);
      }),
    );

    const candidateUserIds = dedupe(
      Array.from(userIdsByEmail.values()).flat().filter(Boolean),
    );
    const profiles = await repo.listProfilesByIds(candidateUserIds, deps);
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    const items = sources.map((source) => {
      const normalizedEmail = normalizeEmail(source.contact_email);
      const candidateIds = userIdsByEmail.get(normalizedEmail) || [];
      const candidates = candidateIds
        .map((userId) => {
          const profile = profileById.get(userId);
          return {
            userId,
            displayName: profile?.display_name || 'LMNL Member',
            profileSlug: profile?.profile_slug || '',
            avatarUrl: profile?.avatar_url || '',
            visibility: profile?.visibility || '',
          };
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      return {
        id: source.id,
        eventId: source.event_id,
        eventName: eventById.get(source.event_id)?.name || 'LMNL Event',
        eventDate: eventById.get(source.event_id)?.event_date || null,
        locationName: eventById.get(source.event_id)?.location_name || '',
        sourceType: source.source_type,
        sourceId: source.source_id || '',
        verificationMethod: source.verification_method,
        verificationStatus: source.verification_status,
        participationTier: source.participation_tier || 'attendee',
        verifiedAt: source.verified_at || source.created_at || '',
        contactEmail: source.contact_email || '',
        contactName: source.contact_name || '',
        candidateCount: candidates.length,
        candidates,
      };
    });

    return {
      summary: {
        unresolvedCount: items.length,
        exactMatchCount: items.filter((item) => item.candidateCount === 1).length,
        multiMatchCount: items.filter((item) => item.candidateCount > 1).length,
        noMatchCount: items.filter((item) => item.candidateCount === 0).length,
      },
      items,
    };
  } catch (error) {
    wrapPhase2SetupError(error);
  }
}
