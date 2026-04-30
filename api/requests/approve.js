import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from '../_lib/http.js';
import { approveRequestAndSendCheckout } from '../_lib/services/approval.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const requestId = requireValue(body.requestId, 'requestId is required.');
  const data = await approveRequestAndSendCheckout(requestId);
  return sendJson(res, 200, { success: true, data });
}, { context: 'requests-approve' });
