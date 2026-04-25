import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { ticketId } = req.query;

  if (!ticketId) {
    return res.status(400).json({ error: 'Missing ticketId parameter' });
  }

  try {
    // Initialize Supabase with Service Role Key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Fetch Ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // 2. Fetch Event (if mapped)
    let eventData = null;
    if (ticket.event_id) {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', ticket.event_id)
        .single();
        
      if (!eventError) {
        eventData = event;
      }
    }

    // 3. Return merged payload
    return res.status(200).json({
      ticket,
      event: eventData
    });

  } catch (error) {
    console.error('Error in get-ticket API:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
