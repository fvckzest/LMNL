import { createClient } from '@supabase/supabase-js';
import { generatePassBuffer } from './_lib/generate-pass-helper.js';

export default async function handler(req, res) {
  const { ticketId } = req.query;

  if (!ticketId) {
    return res.status(400).json({ error: 'Missing ticketId parameter' });
  }

  try {
    // 1. Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Fetch Ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // 3. Fetch Event
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

    // 4. Generate Pass Buffer
    const buffer = await generatePassBuffer(ticket, eventData);

    if (!buffer) {
      return res.status(503).json({ 
        error: 'Apple Wallet integration is pending configuration.',
        message: 'Required environment variables (APPLE_PASS_TYPE_IDENTIFIER, APPLE_TEAM_ID, APPLE_PASS_CERTIFICATE) are missing or invalid.'
      });
    }

    // 5. Return Buffer
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.id}.pkpass"`);
    return res.send(buffer);

  } catch (error) {
    console.error('Error in generate-pass API:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
