import { getAdminSupabase } from '../clients.js';

const PERSISTENT_END_DATE = '2099-12-31T23:59:00.000Z';

function normalizePreorderPayload(payload = {}) {
  const goalQuantity = Number(payload.goal_quantity || 0);
  const isPersistent = goalQuantity <= 0;

  return {
    ...payload,
    end_date: isPersistent ? payload.end_date || PERSISTENT_END_DATE : payload.end_date,
  };
}

export async function getPreorderById(id) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('merch_preorders')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listOpenPreorders() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('merch_preorders')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listPreorders() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('merch_preorders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertPreorder(payload) {
  const supabase = getAdminSupabase();
  const { id, ...rawData } = payload;
  const data = normalizePreorderPayload(rawData);
  if (id) {
    const { data: updated, error } = await supabase
      .from('merch_preorders')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  const { data: inserted, error } = await supabase
    .from('merch_preorders')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

export async function updatePreorderStatus(id, status) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('merch_preorders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePreorderById(id) {
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('merch_preorders')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}
