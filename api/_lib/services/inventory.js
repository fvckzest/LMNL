import { getSquareClient } from '../clients.js';
import { AppError } from '../errors.js';

const priceCache = new Map();
const PRICE_TTL_MS = 60_000;

function getCachedPrice(variationId) {
  const cached = priceCache.get(variationId);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    priceCache.delete(variationId);
    return null;
  }
  return cached;
}

export async function getVariationInventory(variationId, deps = {}) {
  if (!variationId) {
    throw new AppError('Variation ID is required', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  const squareClient = deps.squareClient || getSquareClient();
  const cachedPrice = getCachedPrice(variationId);

  const inventoryPromise = squareClient.inventory.batchGetCounts({
    catalogObjectIds: [variationId],
  });

  const pricePromise = cachedPrice
    ? Promise.resolve(cachedPrice)
    : squareClient.catalog.batchGet({ objectIds: [variationId] });

  const [inventoryResponse, priceResponse] = await Promise.all([inventoryPromise, pricePromise]);

  const counts = inventoryResponse.counts || inventoryResponse.data || inventoryResponse.result?.counts || [];
  const available = counts.reduce((sum, count) => sum + Number(count.quantity || 0), 0);

  let price = 0;
  let cached = false;

  if (cachedPrice) {
    price = cachedPrice.price;
    cached = true;
  } else {
    const objects = priceResponse.objects || priceResponse.result?.objects || [];
    const variation = objects[0];
    price = Number(variation?.itemVariationData?.priceMoney?.amount || 0);
    priceCache.set(variationId, { price, expiresAt: Date.now() + PRICE_TTL_MS });
  }

  return { variationId, available, price, cached };
}

export function __resetInventoryCache() {
  priceCache.clear();
}
