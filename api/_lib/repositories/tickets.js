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
