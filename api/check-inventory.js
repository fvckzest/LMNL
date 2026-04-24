import { SquareClient, SquareEnvironment } from 'square';

export default async function handler(req, res) {
  const isProd = process.env.SQUARE_ENVIRONMENT === 'production';
  const token = isProd ? (process.env.SQUARE_PROD_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN) : process.env.SQUARE_ACCESS_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'Square access token is missing.' });
  }

  const squareClient = new SquareClient({
    token: token,
    environment: isProd ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });

  const { variationId } = req.query;

  if (!variationId) {
    return res.status(400).json({ error: 'Variation ID is required' });
  }

  try {
    // 1. Get Inventory Count
    const invResponse = await squareClient.inventory.batchGetCounts({
      catalogObjectIds: [variationId]
    });
    const counts = invResponse.counts || invResponse.data || invResponse.result?.counts || [];
    const totalCount = counts.reduce((acc, count) => acc + Number(count.quantity), 0);

    // 2. Get Price from Catalog
    const catResponse = await squareClient.catalog.batchGet({
      objectIds: [variationId]
    });
    
    // The price is in the catalog_object.item_variation_data.price_money
    const objects = catResponse.objects || catResponse.result?.objects || [];
    const variation = objects[0];
    const priceAmount = variation?.itemVariationData?.priceMoney?.amount 
      ? Number(variation.itemVariationData.priceMoney.amount) 
      : 0;

    return res.status(200).json({ 
      count: totalCount,
      price: Number(priceAmount)
    });
  } catch (error) {
    console.error('Square Sync Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
