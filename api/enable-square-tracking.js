import { SquareClient, SquareEnvironment } from 'square';

const isProd = process.env.SQUARE_ENVIRONMENT === 'production';
const squareClient = new SquareClient({
  token: isProd ? (process.env.SQUARE_PROD_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN) : process.env.SQUARE_ACCESS_TOKEN,
  environment: isProd ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { variationId } = req.body;

  if (!variationId) {
    return res.status(400).json({ error: 'Variation ID is required' });
  }

  try {
    // 1. Get the current variation data
    const getRes = await squareClient.catalog.get({
      objectId: variationId
    });
    
    const variation = getRes.object;
    if (!variation || variation.type !== 'ITEM_VARIATION') {
      throw new Error('Invalid variation ID');
    }

    // 2. Update the trackInventory property
    variation.itemVariationData.trackInventory = true;

    // 3. Upsert back to Square
    const updateRes = await squareClient.catalog.upsert({
      idempotencyKey: crypto.randomUUID(),
      object: variation
    });

    return res.status(200).json({ success: true, variation: updateRes.object });
  } catch (error) {
    console.error('Square Tracking Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
