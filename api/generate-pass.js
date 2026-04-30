import { withHandler, requireValue, sendJson } from './_lib/http.js';
import { generateTicketPass } from './_lib/services/passkit.js';

export default withHandler(async function handler(req, res) {
  const ticketId = requireValue(req.query?.ticketId, 'Missing ticketId parameter');
  const result = await generateTicketPass(ticketId);

  if (result.kind === 'unavailable') {
    return sendJson(res, 503, {
      success: false,
      error: {
        code: 'PASS_UNAVAILABLE',
        message: result.reason,
      },
    });
  }

  res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  return res.send(result.buffer);
}, { context: 'generate-pass' });
