import { SquareClient, SquareEnvironment } from 'square';

export default async function handler(req, res) {
  const isProd = process.env.SQUARE_ENVIRONMENT === 'production';
  const token = isProd ? (process.env.SQUARE_PROD_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN) : process.env.SQUARE_ACCESS_TOKEN;
  
  if (!token) {
    return res.status(500).json({ 
      error: `Square access token is missing. Please set SQUARE_PROD_ACCESS_TOKEN or SQUARE_ACCESS_TOKEN in your environment variables. Current environment: ${isProd ? 'production' : 'sandbox'}`
    });
  }

  const squareClient = new SquareClient({
    token: token,
    environment: isProd ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = isProd ? (process.env.SQUARE_PROD_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN) : process.env.SQUARE_ACCESS_TOKEN;
    console.log(`--- Square Debug (Env: ${isProd ? 'PRODUCTION' : 'SANDBOX'}) ---`);
    console.log(`Using token ending in: ...${token?.slice(-4)}`);
    
    // Check Locations
    const locRes = await squareClient.locations.list();
    const locations = locRes.locations || [];
    console.log(`Locations found: ${locations.length} (${locations.map(l => l.name).join(', ')})`);

    // Check Catalog via Search (More robust than list)
    const response = await squareClient.catalog.search({
      includeRelatedObjects: true,
      objectTypes: ['ITEM', 'ITEM_VARIATION', 'CATEGORY', 'IMAGE']
    });
    
    const allObjects = response.objects || [];
    console.log(`Total catalog objects (via search): ${allObjects.length}`);
    
    const items = allObjects.filter(obj => obj.type === 'ITEM');
    console.log(`ITEM objects found: ${items.length}`);
    
    if (allObjects.length > 0 && items.length === 0) {
      console.log('Object types found:', [...new Set(allObjects.map(o => o.type))]);
    }
    
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
