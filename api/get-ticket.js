import { withHandler, requireValue, sendJson } from './_lib/http.js';
import { getTicketView } from './_lib/services/tickets.js';

export default withHandler(async function handler(req, res) {
  const ticketId = requireValue(req.query?.ticketId, 'Missing ticketId parameter');
  const data = await getTicketView(ticketId);
  return sendJson(res, 200, { success: true, data });
}, { context: 'get-ticket' });
