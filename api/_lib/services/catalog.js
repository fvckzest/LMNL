import { getSquareClient } from '../clients.js';

let catalogCache;
const CATALOG_TTL_MS = 60_000;

export async function getAdminCatalogView() {
  if (catalogCache && catalogCache.expiresAt > Date.now()) {
    return catalogCache.data;
  }

  const squareClient = getSquareClient();
  const response = await squareClient.catalog.search({
    includeRelatedObjects: true,
    objectTypes: ['ITEM', 'ITEM_VARIATION', 'CATEGORY', 'IMAGE'],
  });

  const allObjects = response.objects || [];
  const relatedObjects = response.relatedObjects || [];
  const combinedObjects = [...allObjects, ...relatedObjects];
  const items = allObjects.filter((object) => object.type === 'ITEM');
  const images = combinedObjects.filter((object) => object.type === 'IMAGE');

  const imageMap = {};
  for (const image of images) {
    if (image.imageData?.url) {
      imageMap[image.id] = image.imageData.url;
    }
  }

  const variationIds = items.flatMap((item) => item.itemData.variations?.map((variation) => variation.id) || []);

  let inventoryMap = {};
  if (variationIds.length > 0) {
    try {
      const inventoryResponse = await squareClient.inventory.batchGetCounts({
        catalogObjectIds: variationIds,
      });
      const counts = inventoryResponse.counts || inventoryResponse.data || inventoryResponse.result?.counts || [];
      inventoryMap = counts.reduce((acc, count) => {
        const variationId = count.catalogObjectId;
        const quantity = Number(count.quantity || 0);
        acc[variationId] = (acc[variationId] || 0) + quantity;
        return acc;
      }, {});
    } catch (error) {
      console.error('[catalog] inventory overlay failed', error);
    }
  }

  const catalog = items.map((item) => {
    const itemImageIds = item.itemData.imageIds || [];
    const variationImageIds = item.itemData.variations?.flatMap((variation) => variation.itemVariationData.imageIds || []) || [];
    const mainImageId = [...itemImageIds, ...variationImageIds][0];

    return {
      id: item.id,
      name: item.itemData.name,
      imageUrl: mainImageId ? imageMap[mainImageId] : null,
      variations: item.itemData.variations?.map((variation) => ({
        id: variation.id,
        name: variation.itemVariationData.name,
        price: Number(variation.itemVariationData.priceMoney?.amount || 0),
        trackInventory: variation.itemVariationData.trackInventory || false,
        quantity: inventoryMap[variation.id] ?? 0,
        sold: 0,
      })) || [],
    };
  });

  catalogCache = {
    expiresAt: Date.now() + CATALOG_TTL_MS,
    data: catalog,
  };

  return catalog;
}
