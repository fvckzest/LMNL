import { withHandler, sendJson, requireValue } from './_lib/http.js';
import { getVariationInventory } from './_lib/services/inventory.js';

export default withHandler(async function handler(req, res) {
  const variationId = requireValue(req.query?.variationId, 'Variation ID is required');
  const data = await getVariationInventory(variationId);
  return sendJson(res, 200, { success: true, data });
}, { context: 'check-inventory' });
