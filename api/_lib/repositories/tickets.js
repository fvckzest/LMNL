import { AppError } from '../errors.js';
import { getAdminSupabase } from '../clients.js';

export async function getTicketWithEventById(id) {
  const supabase = getAdminSupabase();
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!ticket) {
    throw new AppError('Ticket not found', {
      code: 'NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  let event = null;
  if (ticket.event_id) {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', ticket.event_id)
      .maybeSingle();
    if (eventError) throw eventError;
    event = eventData;
  }

  return { ticket, event };
}

export async function getTicketWithEventByQrPayload(qrPayload) {
  const supabase = getAdminSupabase();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrPayload);
  const query = supabase.from('tickets').select('*');
  
  if (isUuid) {
    query.or(`qr_code_payload.eq.${qrPayload},id.eq.${qrPayload}`);
  } else {
    query.eq('qr_code_payload', qrPayload);
  }

  const { data: ticket, error } = await query.maybeSingle();

  if (error) throw error;
  if (!ticket) {
    throw new AppError('Ticket not found', {
      code: 'NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  let event = null;
  if (ticket.event_id) {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', ticket.event_id)
      .maybeSingle();
    if (eventError) throw eventError;
    event = eventData;
  }

  return { ticket, event };
}

export async function findTicketBySquareOrderId(squareOrderId) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('square_order_id', squareOrderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listTickets() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTicket(payload) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('tickets')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markTicketAsUsed(id, usedAt = new Date().toISOString()) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('tickets')
    .update({
      is_used: true,
      used_at: usedAt,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
