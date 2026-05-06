import { getAdminSupabase } from '../clients.js';

function getSupabase(deps = {}) {
  return deps.supabase || getAdminSupabase();
}

export async function listUserIdentitiesByUserId(userId, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('user_identities')
    .select('user_id, provider, provider_email')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function findCommunityUserIdsByEmail(email, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('user_identities')
    .select('user_id')
    .ilike('provider_email', String(email || '').trim())
    .limit(10);

  if (error) throw error;
  return (data || []).map((row) => row.user_id).filter(Boolean);
}

export async function findVerificationSourceById(id, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_verification_sources')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findVerificationSourceBySource(sourceType, sourceId, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_verification_sources')
    .select('*')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createVerificationSource(payload, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_verification_sources')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateVerificationSource(id, updates, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_verification_sources')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findAttendanceRecordByUserAndEvent(userId, eventId, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAttendanceRecord(payload, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_records')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateAttendanceRecord(id, updates, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_records')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findAttendanceArtifactByAttendanceId(attendanceId, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_artifacts')
    .select('*')
    .eq('attendance_id', attendanceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAttendanceArtifact(payload, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_artifacts')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateAttendanceArtifact(id, updates, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_artifacts')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listPointTransactionsByUser(userId, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function findPointTransactionByAttendanceAndReason(attendanceId, reason, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('attendance_id', attendanceId)
    .eq('reason', reason)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createPointTransaction(payload, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('point_transactions')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listAttendanceRecordsByUser(userId, deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .eq('attendance_state', 'verified')
    .order('verified_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listAttendanceArtifactsByAttendanceIds(attendanceIds, deps = {}) {
  if (!attendanceIds?.length) {
    return [];
  }

  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_artifacts')
    .select('*')
    .in('attendance_id', attendanceIds);

  if (error) throw error;
  return data || [];
}

export async function listEventsByIds(eventIds, deps = {}) {
  if (!eventIds?.length) {
    return [];
  }

  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('id', eventIds);

  if (error) throw error;
  return data || [];
}

export async function listOverlappingAttendanceByEventIds(eventIds, excludedUserId, deps = {}) {
  if (!eventIds?.length) {
    return [];
  }

  const supabase = getSupabase(deps);
  const query = supabase
    .from('attendance_records')
    .select('*')
    .in('event_id', eventIds)
    .eq('attendance_state', 'verified');

  if (excludedUserId) {
    query.neq('user_id', excludedUserId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function listProfilesByIds(userIds, deps = {}) {
  if (!userIds?.length) {
    return [];
  }

  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, profile_slug, avatar_url, visibility')
    .in('id', userIds);

  if (error) throw error;
  return data || [];
}

export async function listPendingVerificationSourcesByEmails(emails, deps = {}) {
  if (!emails?.length) {
    return [];
  }

  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_verification_sources')
    .select('*')
    .is('resolved_user_id', null)
    .neq('verification_status', 'revoked')
    .in('contact_email', emails)
    .order('verified_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listUnresolvedVerificationSources(deps = {}) {
  const supabase = getSupabase(deps);
  const { data, error } = await supabase
    .from('attendance_verification_sources')
    .select('*')
    .is('resolved_user_id', null)
    .neq('verification_status', 'revoked')
    .order('verified_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
