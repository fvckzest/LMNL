import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from './_lib/http.js';
import { upsertEvent, updateEventMetadata, updateEventStatus, deleteEventById } from './_lib/repositories/events.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);

  if (body.action === 'delete') {
    await deleteEventById(requireValue(body.id, 'id is required.'));
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  if (body.action === 'update-status') {
    const event = await updateEventStatus(
      requireValue(body.id, 'id is required.'),
      requireValue(body.status, 'status is required.')
    );
    return sendJson(res, 200, { success: true, data: event });
  }

  if (body.action === 'update-metadata') {
    const event = await updateEventMetadata(
      requireValue(body.id, 'id is required.'),
      body.metadata || {}
    );
    return sendJson(res, 200, { success: true, data: event });
  }

  const event = await upsertEvent(body);
  return sendJson(res, 200, { success: true, data: event });
}, { context: 'events' });
