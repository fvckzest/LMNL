import crypto from 'crypto';
import { getSquareClient, getSquareLocationId } from '../clients.js';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getPreorderById } from '../repositories/preorders.js';
import { createAccessRequest, attachOrderIdToRequest, getRequestById } from '../repositories/requests.js';
import { getEventById, getLatestEventByName } from '../repositories/events.js';

async function resolveVariationId(squareItemId) {
  const squareClient = getSquareClient();
  const response = await squareClient.catalog.object.get({ objectId: squareItemId });
  const object = response.object || response.result?.object;

  if (!object) {
    throw new AppError('Square catalog item not found.', {
      code: 'SQUARE_ITEM_NOT_FOUND',
      status: 400,
      expose: true,
    });
  }

  if (object.type === 'ITEM_VARIATION') {
    return object.id;
  }

  if (object.type === 'ITEM') {
    const variationId = object.itemData?.variations?.[0]?.id;
    if (!variationId) {
      throw new AppError('This Square item has no variations.', {
        code: 'SQUARE_VARIATION_MISSING',
        status: 400,
        expose: true,
      });
    }

    return variationId;
  }

  throw new AppError('Unsupported Square object type for checkout.', {
    code: 'SQUARE_ITEM_INVALID',
    status: 400,
    expose: true,
  });
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBuyer(payload = {}) {
  return {
    fullName: readString(payload.fullName),
    email: readString(payload.email),
    phone: readString(payload.phone),
  };
}

function buildPrePopulatedData(buyer) {
  return {
    buyerEmail: buyer.email || undefined,
    buyerPhoneNumber: buyer.phone || undefined,
  };
}

export async function createCheckoutForPreorder(preorderId, deps = {}) {
  const loadPreorder = deps.getPreorderById || getPreorderById;
  const resolveSquareVariationId = deps.resolveVariationId || resolveVariationId;
  const loadLocationId = deps.getSquareLocationId || getSquareLocationId;
  const readBaseConfig = deps.getBaseConfig || getBaseConfig;

  const preorder = await loadPreorder(preorderId);
  if (!preorder) {
    throw new AppError('Preorder not found.', {
      code: 'PREORDER_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  if (!preorder.square_item_id) {
    throw new AppError('This preorder is not linked to a Square item.', {
      code: 'SQUARE_ITEM_MISSING',
      status: 400,
      expose: true,
    });
  }

  const [variationId, locationId] = await Promise.all([
    resolveSquareVariationId(preorder.square_item_id),
    loadLocationId(),
  ]);

  if (!locationId) {
    throw new AppError('No active Square location found.', {
      code: 'SQUARE_LOCATION_MISSING',
      status: 500,
      expose: true,
    });
  }

  const { siteUrl } = readBaseConfig();
  const squareClient = deps.squareClient || getSquareClient();
  const response = await squareClient.checkout.paymentLinks.create({
    idempotencyKey: crypto.randomUUID(),
    order: {
      locationId,
      referenceId: String(preorderId),
      lineItems: [
        {
          quantity: '1',
          catalogObjectId: variationId,
        },
      ],
      pricingOptions: {
        autoApplyDiscounts: true,
      },
    },
    checkoutOptions: {
      redirectUrl: `${siteUrl}/shop?checkout=success&preorderId=${preorderId}`,
      askForShippingAddress: true,
      enableCoupon: true,
    },
    prePopulatedData: buildPrePopulatedData(normalizeBuyer(deps.buyer)),
  });

  const paymentLink = response.paymentLink || response.result?.paymentLink;
  if (!paymentLink?.url) {
    throw new AppError('Square did not return a checkout URL.', {
      code: 'SQUARE_CHECKOUT_FAILED',
      status: 502,
      expose: true,
    });
  }

  return {
    checkoutUrl: paymentLink.url,
    orderId: paymentLink.orderId || null,
    variationId,
  };
}

async function loadEventOrThrow(eventId, deps = {}) {
  const event = await (deps.getEventById || getEventById)(eventId);

  if (!event) {
    throw new AppError('Event not found.', {
      code: 'EVENT_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  if (event.is_private) {
    throw new AppError('This event requires approval before checkout.', {
      code: 'EVENT_PRIVATE',
      status: 400,
      expose: true,
    });
  }

  return event;
}

async function createHostedTicketLink({ request, event, buyer, deps = {} }) {
  const squareClient = deps.squareClient || getSquareClient();
  const locationId = await (deps.getSquareLocationId || getSquareLocationId)();

  if (!locationId) {
    throw new AppError('No active Square location found.', {
      code: 'SQUARE_LOCATION_MISSING',
      status: 500,
      expose: true,
    });
  }

  const { siteUrl } = (deps.getBaseConfig || getBaseConfig)();
  const response = await squareClient.checkout.paymentLinks.create({
    idempotencyKey: crypto.randomUUID(),
    order: {
      locationId,
      referenceId: String(request.id),
      metadata: {
        requestId: String(request.id),
        eventId: String(event.id),
      },
      lineItems: event.square_variation_id
        ? [{
          quantity: '1',
          catalogObjectId: event.square_variation_id,
        }]
        : [{
          quantity: '1',
          name: `${event.name} - Access Ticket`,
          basePriceMoney: {
            amount: BigInt(Math.round(Number(event.price || 0))),
            currency: 'USD',
          },
        }],
      pricingOptions: {
        autoApplyDiscounts: true,
      },
      fulfillments: [
        {
          type: 'DIGITAL',
        },
      ],
    },
    checkoutOptions: {
      redirectUrl: `${siteUrl}/success?requestId=${request.id}`,
      enableCoupon: true,
    },
    prePopulatedData: buildPrePopulatedData(buyer),
    paymentNote: `LMNL ticket checkout for ${event.name}`,
  });

  const paymentLink = response.paymentLink || response.result?.paymentLink;
  if (!paymentLink?.url) {
    throw new AppError('Square did not return a checkout URL.', {
      code: 'SQUARE_CHECKOUT_FAILED',
      status: 502,
      expose: true,
    });
  }

  if (paymentLink.orderId) {
    await (deps.attachOrderIdToRequest || attachOrderIdToRequest)(request.id, paymentLink.orderId);
  }

  return {
    checkoutUrl: paymentLink.url,
    orderId: paymentLink.orderId || null,
    requestId: request.id,
  };
}

export async function createCheckoutForEvent(eventId, payload = {}, deps = {}) {
  const event = await loadEventOrThrow(eventId, deps);
  const buyer = normalizeBuyer(payload.buyer);
  const requestBuyer = {
    fullName: buyer.fullName || 'Guest',
    email: buyer.email || `guest-${crypto.randomUUID()}@example.com`,
    phone: buyer.phone,
  };

  const request = await (deps.createAccessRequest || createAccessRequest)({
    event_name: event.name,
    customer_name: requestBuyer.fullName,
    customer_email: requestBuyer.email,
    status: 'approved',
  });

  return createHostedTicketLink({ request, event, buyer: requestBuyer, deps });
}

export async function createCheckoutForRequest(requestId, payload = {}, deps = {}) {
  const request = await (deps.getRequestById || getRequestById)(requestId);

  if (!request) {
    throw new AppError('Request not found.', {
      code: 'REQUEST_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  if (request.status !== 'approved' && request.status !== 'fulfilled') {
    throw new AppError('This invite is not approved for checkout.', {
      code: 'REQUEST_NOT_APPROVED',
      status: 400,
      expose: true,
    });
  }

  const event = await (deps.getLatestEventByName || getLatestEventByName)(request.event_name);
  if (!event) {
    throw new AppError('Event not found for this request.', {
      code: 'EVENT_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  const buyer = normalizeBuyer({
    fullName: payload.buyer?.fullName || request.customer_name,
    email: payload.buyer?.email || request.customer_email,
    phone: payload.buyer?.phone,
  });

  if (!buyer.email) {
    throw new AppError('Email is required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  return createHostedTicketLink({
    request,
    event,
    buyer,
    deps,
  });
}
