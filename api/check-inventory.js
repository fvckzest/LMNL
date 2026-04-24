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
    const response = await squareClient.inventory.retrieveCounts({
      catalogObjectId: variationId
    });
    
    const counts = response.counts || [];
    // Sum up counts across all locations or just use the first one
    const totalCount = counts.reduce((acc, count) => acc + Number(count.quantity), 0);

    return res.status(200).json({ count: totalCount });
  } catch (error) {
    console.error('Square Inventory Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
