import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from '../_lib/http.js';
import { deleteEventById } from '../_lib/repositories/events.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  await deleteEventById(requireValue(body.id, 'id is required.'));
  return sendJson(res, 200, { success: true, data: { deleted: true } });
}, { context: 'events-delete' });
