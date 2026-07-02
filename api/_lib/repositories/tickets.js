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

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isPlaceholderEmail(email) {
  const normalized = normalizeEmail(email);
  return !normalized || normalized.endsWith('@example.com');
}

function toTicketHolderRecipients(tickets = []) {
  const recipientsByEmail = new Map();
  tickets.forEach((ticket) => {
    const email = normalizeEmail(ticket.customer_email);
    if (isPlaceholderEmail(email)) return;
    if (recipientsByEmail.has(email)) {
      const existing = recipientsByEmail.get(email);
      ticket.sources.forEach((source) => existing.sources.add(source));
      return;
    }
    recipientsByEmail.set(email, {
      email,
      name: ticket.customer_name || 'Guest',
      ticketId: ticket.id,
      sources: new Set(ticket.sources),
    });
  });

  return [...recipientsByEmail.values()].map((recipient) => ({
    ...recipient,
    sources: [...recipient.sources],
  }));
}

export async function listTicketHolderEmailRecipientsByEvent(event) {
  const supabase = getAdminSupabase();
  const { data: directTickets, error: directError } = await supabase
    .from('tickets')
    .select('id,event_id,square_order_id,customer_name,customer_email,created_at')
    .eq('event_id', event.id)
    .order('created_at', { ascending: false });

  if (directError) throw directError;

  const eventName = String(event?.name || '').trim();
  if (!eventName) {
    return toTicketHolderRecipients((directTickets || []).map((ticket) => ({
      ...ticket,
      sources: ['direct'],
    })));
  }

  const { data: linkedRequests, error: requestError } = await supabase
    .from('requests')
    .select('square_order_id')
    .eq('event_name', eventName)
    .not('square_order_id', 'is', null);

  if (requestError) throw requestError;

  const directOrderIds = new Set((directTickets || []).map((ticket) => ticket.square_order_id).filter(Boolean));
  const linkedOrderIds = (linkedRequests || [])
    .map((request) => request.square_order_id)
    .filter((orderId) => orderId && !directOrderIds.has(orderId));

  if (linkedOrderIds.length === 0) {
    return toTicketHolderRecipients((directTickets || []).map((ticket) => ({
      ...ticket,
      sources: ['direct'],
    })));
  }

  const { data: linkedTickets, error: linkedError } = await supabase
    .from('tickets')
    .select('id,event_id,square_order_id,customer_name,customer_email,created_at')
    .in('square_order_id', linkedOrderIds)
    .order('created_at', { ascending: false });

  if (linkedError) throw linkedError;

  return toTicketHolderRecipients([
    ...(directTickets || []).map((ticket) => ({
      ...ticket,
      sources: ['direct'],
    })),
    ...(linkedTickets || []).map((ticket) => ({
      ...ticket,
      sources: ['linked_request'],
    })),
  ]);
}

export async function listTicketHolderEmailRecipientsByEventId(eventId) {
  return listTicketHolderEmailRecipientsByEvent({ id: eventId, name: '' });
}

export async function listRecentTicketsByEventId(eventId, limit = 8) {
  const supabase = getAdminSupabase();
  const safeLimit = Math.max(Number(limit) || 8, 1);
  const { data, error } = await supabase
    .from('tickets')
    .select('id,event_id,customer_name,created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data || [];
}

export async function countTicketsByEventId(eventId) {
  const supabase = getAdminSupabase();
  const { count, error } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) throw error;
  return count || 0;
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
