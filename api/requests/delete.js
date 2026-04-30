import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from '../_lib/http.js';
import { deleteRequestById } from '../_lib/repositories/requests.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  await deleteRequestById(requireValue(body.id, 'id is required.'));
  return sendJson(res, 200, { success: true, data: { deleted: true } });
}, { context: 'requests-delete' });
