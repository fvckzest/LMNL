import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildKnownCommunityEmails,
  claimAttendanceSourceForUser,
  getAdminAttendanceQueue,
  recordTicketAttendanceVerification,
} from '../api/_lib/services/attendance.js';
import { getCommunityDashboard } from '../api/_lib/services/community-dashboard.js';

test('buildKnownCommunityEmails normalizes and deduplicates user identity emails', () => {
  const emails = buildKnownCommunityEmails(
    { email: 'Zest@Example.com ' },
    [
      { provider_email: 'zest@example.com' },
      { provider_email: 'alt@example.com' },
    ],
  );

  assert.deepEqual(emails, ['zest@example.com', 'alt@example.com']);
});

test('recordTicketAttendanceVerification resolves a known community user and issues attendance artifacts', async () => {
  const transactions = [];
  const repo = {
    findCommunityUserIdsByEmail: async () => ['user_1'],
    findVerificationSourceBySource: async () => null,
    createVerificationSource: async (payload) => ({ id: 'source_1', ...payload }),
    findAttendanceRecordByUserAndEvent: async () => null,
    createAttendanceRecord: async (payload) => ({ id: 'attendance_1', ...payload }),
    findAttendanceArtifactByAttendanceId: async () => null,
    createAttendanceArtifact: async (payload) => ({ id: 'artifact_1', ...payload }),
    findPointTransactionByAttendanceAndReason: async () => null,
    createPointTransaction: async (payload) => {
      transactions.push(payload);
      return { id: `tx_${transactions.length}`, ...payload };
    },
  };

  const result = await recordTicketAttendanceVerification({
    ticket: {
      id: 'ticket_1',
      customer_email: 'zest@example.com',
      customer_name: 'Zest',
      used_at: '2026-05-04T18:00:00.000Z',
      qr_code_payload: 'LMNL-1',
    },
    event: {
      id: 'event_1',
      name: 'LMNL Night',
      event_date: '2026-05-04',
    },
    verifiedByAdminUserId: 'admin_1',
  }, {
    repo,
    getEventById: async () => ({
      id: 'event_1',
      name: 'LMNL Night',
      event_date: '2026-05-04',
    }),
  });

  assert.equal(result.source.resolved_user_id, 'user_1');
  assert.equal(result.attendanceRecord.user_id, 'user_1');
  assert.equal(result.attendanceRecord.event_id, 'event_1');
  assert.equal(result.artifact.title, 'LMNL Night');
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].reason, 'attendance_verified');
  assert.equal(transactions[0].points_delta, 10);
});

test('claimAttendanceSourceForUser rejects claims when the attendance proof email does not match the session user', async () => {
  await assert.rejects(
    () => claimAttendanceSourceForUser('source_1', { id: 'user_1', email: 'member@example.com' }, {
      repo: {
        findVerificationSourceById: async () => ({
          id: 'source_1',
          contact_email: 'other@example.com',
          event_id: 'event_1',
          participation_tier: 'attendee',
        }),
        listUserIdentitiesByUserId: async () => [{ provider_email: 'member@example.com' }],
      },
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );
});

test('getCommunityDashboard aggregates attendance, points, overlap, and pending claims', async () => {
  const dashboard = await getCommunityDashboard(
    { id: 'user_1', email: 'zest@example.com' },
    {
      repo: {
        listUserIdentitiesByUserId: async () => [{ provider_email: 'zest@example.com' }],
        listAttendanceRecordsByUser: async () => ([
          {
            id: 'attendance_1',
            user_id: 'user_1',
            event_id: 'event_1',
            attendance_state: 'verified',
            participation_tier: 'performer',
            verified_at: '2026-05-04T19:00:00.000Z',
          },
        ]),
        listAttendanceArtifactsByAttendanceIds: async () => ([
          {
            id: 'artifact_1',
            attendance_id: 'attendance_1',
            artifact_type: 'event_proof',
            title: 'LMNL Night',
            subtitle: '05/04/2026 • Performer proof',
            issued_at: '2026-05-04T19:00:00.000Z',
          },
        ]),
        listPointTransactionsByUser: async () => ([
          { attendance_id: 'attendance_1', points_delta: 10 },
          { attendance_id: 'attendance_1', points_delta: 15 },
        ]),
        listEventsByIds: async (eventIds) => eventIds.map((id) => ({
          id,
          name: 'LMNL Night',
          event_date: '2026-05-04',
          location_name: 'LMNL Space',
        })),
        listOverlappingAttendanceByEventIds: async () => ([
          {
            user_id: 'user_2',
            event_id: 'event_1',
            verified_at: '2026-05-04T19:10:00.000Z',
            participation_tier: 'attendee',
          },
          {
            user_id: 'user_2',
            event_id: 'event_2',
            verified_at: '2026-05-01T19:10:00.000Z',
            participation_tier: 'performer',
          },
        ]),
        listPendingVerificationSourcesByEmails: async () => ([
          {
            id: 'source_pending',
            event_id: 'event_3',
            verification_status: 'pending_resolution',
            participation_tier: 'attendee',
            verification_method: 'ticket_check_in',
            contact_email: 'zest@example.com',
          },
        ]),
        listProfilesByIds: async () => ([
          {
            id: 'user_2',
            display_name: 'Shared Member',
            profile_slug: 'shared-member',
            avatar_url: null,
          },
        ]),
      },
    },
  );

  assert.equal(dashboard.summary.totalVerifiedEvents, 1);
  assert.equal(dashboard.summary.totalPoints, 25);
  assert.equal(dashboard.summary.performerAppearances, 1);
  assert.equal(dashboard.summary.pendingClaims, 1);
  assert.equal(dashboard.latestAttendance.eventName, 'LMNL Night');
  assert.equal(dashboard.sharedAttendancePreview[0].displayName, 'Shared Member');
  assert.equal(dashboard.sharedAttendancePreview[0].overlapCount, 2);
  assert.equal(dashboard.pendingClaims[0].eventName, 'LMNL Night');
});

test('getCommunityDashboard includes unresolved pending-resolution proof in claimable history', async () => {
  const dashboard = await getCommunityDashboard(
    { id: 'user_1', email: 'zest@example.com' },
    {
      repo: {
        listUserIdentitiesByUserId: async () => [{ provider_email: 'zest@example.com' }],
        listAttendanceRecordsByUser: async () => [],
        listAttendanceArtifactsByAttendanceIds: async () => [],
        listPointTransactionsByUser: async () => [],
        listEventsByIds: async (eventIds) => eventIds.map((id) => ({
          id,
          name: id === 'event_pending' ? 'Unclaimed LMNL Night' : 'LMNL Event',
          event_date: '2026-05-04',
          location_name: 'LMNL Space',
        })),
        listOverlappingAttendanceByEventIds: async () => [],
        listPendingVerificationSourcesByEmails: async () => ([
          {
            id: 'source_pending',
            event_id: 'event_pending',
            verification_status: 'pending_resolution',
            participation_tier: 'attendee',
            verification_method: 'ticket_check_in',
            contact_email: 'zest@example.com',
          },
        ]),
        listProfilesByIds: async () => [],
      },
    },
  );

  assert.equal(dashboard.summary.pendingClaims, 1);
  assert.equal(dashboard.pendingClaims[0].id, 'source_pending');
  assert.equal(dashboard.pendingClaims[0].eventName, 'Unclaimed LMNL Night');
});

test('getAdminAttendanceQueue groups unresolved proof with exact-match LMNL candidates', async () => {
  const queue = await getAdminAttendanceQueue({
    repo: {
      listUnresolvedVerificationSources: async () => ([
        {
          id: 'source_1',
          event_id: 'event_1',
          source_type: 'ticket',
          source_id: 'ticket_1',
          verification_method: 'ticket_check_in',
          verification_status: 'pending_resolution',
          participation_tier: 'attendee',
          verified_at: '2026-05-04T19:00:00.000Z',
          contact_email: 'member@example.com',
          contact_name: 'Member One',
        },
        {
          id: 'source_2',
          event_id: 'event_2',
          source_type: 'manual_staff',
          source_id: null,
          verification_method: 'staff_confirmed',
          verification_status: 'pending_resolution',
          participation_tier: 'performer',
          verified_at: '2026-05-05T19:00:00.000Z',
          contact_email: 'nomatch@example.com',
          contact_name: 'Mystery Guest',
        },
      ]),
      listEventsByIds: async (eventIds) => eventIds.map((id) => ({
        id,
        name: id === 'event_1' ? 'LMNL Night' : 'After Hours',
        event_date: '2026-05-04',
        location_name: 'LMNL Space',
      })),
      findCommunityUserIdsByEmail: async (email) => (
        email === 'member@example.com' ? ['user_1'] : []
      ),
      listProfilesByIds: async () => ([
        {
          id: 'user_1',
          display_name: 'Member One',
          profile_slug: 'member-one',
          avatar_url: null,
          visibility: 'community',
        },
      ]),
    },
  });

  assert.equal(queue.summary.unresolvedCount, 2);
  assert.equal(queue.summary.exactMatchCount, 1);
  assert.equal(queue.summary.noMatchCount, 1);
  assert.equal(queue.items[0].candidates[0].displayName, 'Member One');
  assert.equal(queue.items[1].candidateCount, 0);
});
