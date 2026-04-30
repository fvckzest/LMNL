import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from '../_lib/http.js';
import { updateRequestStatus } from '../_lib/repositories/requests.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const request = await updateRequestStatus(
    requireValue(body.id, 'id is required.'),
    requireValue(body.status, 'status is required.')
  );
  return sendJson(res, 200, { success: true, data: request });
}, { context: 'requests-update' });
