import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from './_lib/http.js';
import { createAccessRequest, updateRequestStatus, deleteRequestById } from './_lib/repositories/requests.js';
import { approveRequestAndSendCheckout } from './_lib/services/approval.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);

  if (body.action === 'create') {
    const created = await createAccessRequest({
      event_name: requireValue(body.eventName, 'eventName is required.'),
      customer_name: requireValue(body.customerName, 'customerName is required.'),
      customer_email: requireValue(body.customerEmail, 'customerEmail is required.'),
    });

    return sendJson(res, 200, {
      success: true,
      data: { id: created.id, request: created },
    });
  }

  if (body.action === 'approve') {
    const requestId = requireValue(body.requestId, 'requestId is required.');
    const data = await approveRequestAndSendCheckout(requestId);
    return sendJson(res, 200, { success: true, data });
  }

  if (body.action === 'delete') {
    await deleteRequestById(requireValue(body.id, 'id is required.'));
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  if (body.action === 'update') {
    const request = await updateRequestStatus(
      requireValue(body.id, 'id is required.'),
      requireValue(body.status, 'status is required.')
    );
    return sendJson(res, 200, { success: true, data: request });
  }

  throw new Error('Unsupported requests action.');
}, { context: 'requests' });
