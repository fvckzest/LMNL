import { SquareClient, SquareEnvironment } from 'square';
import crypto from 'crypto';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await squareClient.catalog.object.upsert({
      idempotencyKey: crypto.randomUUID(),
      object: {
        type: 'ITEM',
        id: '#new',
        itemData: {
          name: 'API TEST TICKET',
          description: 'Created via LMNL Admin to test connection.',
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#var',
              itemVariationData: {
                name: 'Regular',
                pricingType: 'FIXED_PRICING',
                priceMoney: {
                  amount: 1000n,
                  currency: 'USD'
                }
              }
            }
          ]
        }
      }
    });

    return res.status(200).json({ success: true, item: response.object });
  } catch (error) {
    console.error('Square Create Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
