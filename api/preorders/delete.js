import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from '../_lib/http.js';
import { deletePreorderById } from '../_lib/repositories/preorders.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  await deletePreorderById(requireValue(body.id, 'id is required.'));
  return sendJson(res, 200, { success: true, data: { deleted: true } });
}, { context: 'preorders-delete' });
