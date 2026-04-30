import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from '../_lib/http.js';
import { upsertPreorder, updatePreorderStatus } from '../_lib/repositories/preorders.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);

  if (body.action === 'update-status') {
    const preorder = await updatePreorderStatus(requireValue(body.id, 'id is required.'), requireValue(body.status, 'status is required.'));
    return sendJson(res, 200, { success: true, data: preorder });
  }

  const preorder = await upsertPreorder(body);
  return sendJson(res, 200, { success: true, data: preorder });
}, { context: 'preorders-upsert' });
