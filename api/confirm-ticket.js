import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from './_lib/http.js';
import { getCheckoutSuccessView, getCheckoutSuccessViewByTicketId } from './_lib/services/checkout-success.js';
import { reconcileApprovedRequestTicket } from './_lib/services/webhook-fulfillment.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['GET', 'POST']);

  const body = req.method === 'POST' ? await parseJsonBody(req) : {};
  const requestId = req.query?.requestId || body.requestId || '';
  const ticketId = req.query?.ticketId || body.ticketId || '';

  if (!requestId && !ticketId) {
    requireValue('', 'requestId or ticketId is required.');
  }

  if (ticketId && !requestId) {
    const data = await getCheckoutSuccessViewByTicketId(ticketId);
    return sendJson(res, 200, { success: true, data });
  }

  const fulfillment = await reconcileApprovedRequestTicket(requestId);
  const summary = await getCheckoutSuccessView(requestId);

  return sendJson(res, 200, {
    success: true,
    data: {
      fulfillment,
      ...summary,
    },
  });
}, { context: 'confirm-ticket' });
