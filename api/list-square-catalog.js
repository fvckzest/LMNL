import { SquareClient, SquareEnvironment } from 'square';

export default async function handler(req, res) {
  const isProd = process.env.SQUARE_ENVIRONMENT === 'production';
  const squareToken = isProd ? (process.env.SQUARE_PROD_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN) : process.env.SQUARE_ACCESS_TOKEN;

  try {
    if (!squareToken) {
      return res.status(500).json({ 
        error: `Square access token is missing. Please check your Vercel Dashboard.`
      });
    }

    const squareClient = new SquareClient({
      token: squareToken,
      environment: isProd ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log(`--- Square Debug (Env: ${isProd ? 'PRODUCTION' : 'SANDBOX'}) ---`);
    
    // 1. Check Locations
    const locRes = await squareClient.locations.list();
    const locations = locRes.locations || [];
    
    // 2. Check Catalog via Search
    const response = await squareClient.catalog.search({
      includeRelatedObjects: true,
      objectTypes: ['ITEM', 'ITEM_VARIATION', 'CATEGORY', 'IMAGE']
    });
    
    const allObjects = response.objects || [];
    const items = allObjects.filter(obj => obj.type === 'ITEM');
    
    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.itemData.name,
      variations: item.itemData.variations?.map(v => ({
        id: v.id,
        name: v.itemVariationData.name,
        price: v.itemVariationData.priceMoney?.amount ? Number(v.itemVariationData.priceMoney.amount) : 0,
        trackInventory: v.itemVariationData.trackInventory || false
      })) || []
    }));

    return res.status(200).json({ 
      items: formattedItems,
      count: items.length,
      environment: process.env.SQUARE_ENVIRONMENT 
    });
  } catch (error) {
    console.error('Square Catalog Error:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.errors || []
    });
  }
}
