import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from '../_lib/http.js';
import { createAccessRequest } from '../_lib/repositories/requests.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const created = await createAccessRequest({
    event_name: requireValue(body.eventName, 'eventName is required.'),
    customer_name: requireValue(body.customerName, 'customerName is required.'),
    customer_email: requireValue(body.customerEmail, 'customerEmail is required.'),
  });

  return sendJson(res, 200, {
    success: true,
    data: { id: created.id, request: created },
  });
}, { context: 'requests-create' });
