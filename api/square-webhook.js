import { withHandler, allowMethods, sendJson } from './_lib/http.js';
import { processSquareOrderUpdate } from './_lib/services/webhook-fulfillment.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const result = await processSquareOrderUpdate(req.body, req.headers);
  return sendJson(res, 200, { success: true, data: result });
}, { context: 'square-webhook' });
