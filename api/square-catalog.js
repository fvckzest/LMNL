import { withHandler, allowMethods, sendJson } from './_lib/http.js';
import { getAdminCatalogView } from './_lib/services/catalog.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['GET']);
  const catalog = await getAdminCatalogView();
  return sendJson(res, 200, {
    success: true,
    data: {
      catalog,
      count: catalog.length,
    },
  });
}, { context: 'square-catalog' });
