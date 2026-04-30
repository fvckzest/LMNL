import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from './_lib/http.js';
import { createCheckoutForPreorder } from './_lib/services/checkout.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const preorderId = requireValue(body.preorderId, 'preorderId is required.');
  const data = await createCheckoutForPreorder(preorderId);
  return sendJson(res, 200, { success: true, data });
}, { context: 'create-checkout' });
