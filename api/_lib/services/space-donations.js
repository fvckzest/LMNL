import { getSquareClient, getSquareLocationId } from '../clients.js';

const SPACE_DONATION_CACHE_TTL_MS = 60 * 1000;
const spaceDonationCache = new Map();
const DONATION_TEXT_MATCHERS = [
  /feed\s+the\s+horse/i,
  /horse\s+fed/i,
  /horse\s+feed/i,
  /\bhorse\b/i,
];
const CONTEXT_TEXT_MATCHERS = [
  /\blmnl\b/i,
  /\bspace\b/i,
  /donat/i,
  /feed\s+the\s+horse/i,
];

function parseDonationDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function collectOrderText(order = {}) {
  const values = [
    order.id,
    order.referenceId,
    order.source?.name,
    order.ticketName,
    order.metadata && Object.values(order.metadata).join(' '),
    ...(order.lineItems || []).flatMap((lineItem) => [
      lineItem.name,
      lineItem.note,
      lineItem.catalogObjectId,
      lineItem.variationName,
      lineItem.metadata && Object.values(lineItem.metadata).join(' '),
    ]),
  ];

  return values.filter(Boolean).join(' ');
}

function isDonationOrder(order = {}) {
  const orderText = collectOrderText(order);
  const hasDonationSignal = DONATION_TEXT_MATCHERS.some((matcher) => matcher.test(orderText));
  if (hasDonationSignal) return true;

  const hasDonationWord = /donat/i.test(orderText);
  const hasContext = CONTEXT_TEXT_MATCHERS.some((matcher) => matcher.test(orderText));
  return hasDonationWord && hasContext;
}

function normalizeDonationOrder(order = {}) {
  const date = order.closedAt || order.createdAt || order.updatedAt;
  const parsedDate = parseDonationDate(date);
  if (!parsedDate) return null;

  const orderId = order.id || parsedDate.getTime();
  const amount = Number(order.totalMoney?.amount);

  return {
    id: `square-donation-${orderId}`,
    customerName: 'Anonymous supporter',
    activityLabel: Number.isFinite(amount) && amount > 0
      ? `horse fed $${Math.round(amount / 100)}`
      : 'horse fed',
    createdAt: parsedDate.toISOString(),
    source: 'square',
  };
}

function getDonationCacheKey(limit) {
  return String(Math.max(Number(limit) || 8, 1));
}

function readDonationCache(limit) {
  const entry = spaceDonationCache.get(getDonationCacheKey(limit));
  if (!entry) return null;

  return {
    ...entry,
    isFresh: Date.now() - entry.updatedAt < SPACE_DONATION_CACHE_TTL_MS,
  };
}

function writeDonationCache(limit, data) {
  spaceDonationCache.set(getDonationCacheKey(limit), {
    data,
    updatedAt: Date.now(),
    promise: null,
  });
}

function setDonationCachePromise(limit, promise) {
  const existing = readDonationCache(limit);

  spaceDonationCache.set(getDonationCacheKey(limit), {
    data: existing?.data || null,
    updatedAt: existing?.updatedAt || 0,
    promise,
  });
}

function clearDonationCachePromise(limit) {
  const existing = readDonationCache(limit);
  if (!existing) return;

  spaceDonationCache.set(getDonationCacheKey(limit), {
    data: existing.data || null,
    updatedAt: existing.updatedAt || 0,
    promise: null,
  });
}

async function searchCompletedSquareOrders(limit, deps = {}) {
  const squareClient = deps.squareClient || getSquareClient();
  const locationId = await (deps.getSquareLocationId || getSquareLocationId)();
  if (!locationId) return [];

  const response = await squareClient.orders.search({
    locationIds: [locationId],
    query: {
      filter: {
        stateFilter: {
          states: ['COMPLETED'],
        },
      },
      sort: {
        sortField: 'CLOSED_AT',
        sortOrder: 'DESC',
      },
    },
    limit: Math.max(Number(limit) || 8, 20),
    returnEntries: false,
  });

  return response.orders || response.result?.orders || [];
}

async function loadSpaceDonationActivity(limit = 8, deps = {}) {
  const safeLimit = Math.max(Number(limit) || 8, 1);
  const orders = await (deps.searchCompletedSquareOrders || searchCompletedSquareOrders)(safeLimit * 4, deps);

  return orders
    .filter(isDonationOrder)
    .map(normalizeDonationOrder)
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, safeLimit);
}

export async function getSpaceDonationActivity(limit = 8, deps = {}) {
  if (deps.disableCache) {
    return loadSpaceDonationActivity(limit, deps);
  }

  const cached = readDonationCache(limit);
  if (cached?.data && cached.isFresh) {
    return cached.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const request = loadSpaceDonationActivity(limit, deps)
    .then((data) => {
      writeDonationCache(limit, data);
      return data;
    })
    .catch((error) => {
      if (cached?.data) return cached.data;
      throw error;
    })
    .finally(() => {
      clearDonationCachePromise(limit);
    });

  setDonationCachePromise(limit, request);
  return request;
}

export function buildSpaceDonationSiteHistoryItem(donation) {
  return {
    id: donation.id,
    type: 'SPACE',
    title: 'SPACE',
    date: donation.createdAt,
    href: '/space',
    accent: '#004ffa',
    meta: 'Horse fed',
  };
}
