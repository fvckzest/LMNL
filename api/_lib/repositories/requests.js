import { getAdminSupabase } from '../clients.js';

export async function createAccessRequest(payload) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('requests')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listRequests() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRequestById(id) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase.from('requests').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateRequestStatus(id, status) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRequestById(id) {
  const supabase = getAdminSupabase();
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function approveRequestWithOrderId(id, squareOrderId) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('requests')
    .update({ status: 'approved', square_order_id: squareOrderId })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fulfillApprovedRequestById(id) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('requests')
    .update({ status: 'fulfilled' })
    .eq('id', id)
    .eq('status', 'approved')
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fulfillApprovedRequestByOrderId(squareOrderId) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('requests')
    .update({ status: 'fulfilled' })
    .eq('square_order_id', squareOrderId)
    .eq('status', 'approved')
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRequestCustomerById(id) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('requests')
    .select('customer_email, customer_name')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRequestCustomerByOrderId(squareOrderId) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('requests')
    .select('customer_email, customer_name')
    .eq('square_order_id', squareOrderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
