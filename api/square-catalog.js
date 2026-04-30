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
    const relatedObjects = response.relatedObjects || [];
    const combinedObjects = [...allObjects, ...relatedObjects];

    const items = allObjects.filter(obj => obj.type === 'ITEM');
    const images = combinedObjects.filter(obj => obj.type === 'IMAGE');
    
    // Create a map of image IDs to URLs
    const imageMap = {};
    images.forEach(img => {
      if (img.imageData?.url) {
        imageMap[img.id] = img.imageData.url;
      }
    });
    
    // Extract all variation IDs to fetch inventory counts in one batch
    const variationIds = items.flatMap(item => 
      item.itemData.variations?.map(v => v.id) || []
    );

    let inventoryMap = {};
    if (variationIds.length > 0) {
      try {
        const invRes = await squareClient.inventory.batchGetCounts({
          catalogObjectIds: variationIds
        });
        
        const counts = invRes.counts || invRes.data || invRes.response?.counts || [];
        counts.forEach(count => {
          const vid = count.catalogObjectId;
          const qty = Number(count.quantity) || 0;
          inventoryMap[vid] = (inventoryMap[vid] || 0) + qty;
        });
      } catch (invErr) {
        console.error('Inventory Fetch Error:', invErr);
      }
    }
    
    // 3. Fetch Orders to calculate Sold counts
    let salesMap = {};
    try {
      const ordersRes = await squareClient.orders.search({
        locationIds: locations.map(l => l.id),
        query: {
          filter: {
            stateFilter: {
              states: ['COMPLETED', 'OPEN']
            }
          }
        }
      });
      
      const orders = ordersRes.orders || [];
      orders.forEach(order => {
        order.lineItems?.forEach(line => {
          if (line.catalogObjectId) {
            const qty = Number(line.quantity) || 0;
            salesMap[line.catalogObjectId] = (salesMap[line.catalogObjectId] || 0) + qty;
          }
        });
      });
    } catch (orderErr) {
      console.error('Order Fetch Error:', orderErr);
    }
    
    const formattedItems = items.map(item => {
      // Check for image on the item level first, then check variations
      const itemImageIds = item.itemData.imageIds || [];
      const variationImageIds = item.itemData.variations?.flatMap(v => v.itemVariationData.imageIds || []) || [];
      const allImageIds = [...itemImageIds, ...variationImageIds];
      
      const mainImageId = allImageIds[0];
      return {
        id: item.id,
        name: item.itemData.name,
        imageUrl: mainImageId ? imageMap[mainImageId] : null,
        variations: item.itemData.variations?.map(v => ({
          id: v.id,
          name: v.itemVariationData.name,
          price: v.itemVariationData.priceMoney?.amount ? Number(v.itemVariationData.priceMoney.amount) : 0,
          trackInventory: v.itemVariationData.trackInventory || false,
          quantity: inventoryMap[v.id] ?? 0,
          sold: salesMap[v.id] || 0
        })) || []
      };
    });

    return res.status(200).json({ 
      success: true,
      catalog: formattedItems,
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
