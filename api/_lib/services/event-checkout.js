import crypto from 'crypto';
import { getSquareApplicationId, getSquareClient, getSquareLocationId } from '../clients.js';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getEventById } from '../repositories/events.js';
import { createAccessRequest, attachOrderIdToRequest } from '../repositories/requests.js';

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toBigIntAmount(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new AppError('Invalid event price.', {
      code: 'INVALID_EVENT_PRICE',
      status: 500,
      expose: true,
    });
  }

  return BigInt(Math.round(numeric));
}

function buildAddress(address = {}) {
  return {
    addressLine1: readString(address.addressLine1),
    addressLine2: readString(address.addressLine2) || undefined,
    locality: readString(address.locality),
    administrativeDistrictLevel1: readString(address.administrativeDistrictLevel1),
    postalCode: readString(address.postalCode),
    country: readString(address.country).toUpperCase() || 'US',
  };
}

async function loadPublicEvent(eventId, deps = {}) {
  const loadEvent = deps.getEventById || getEventById;
  const event = await loadEvent(eventId);

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

export async function getEventCheckoutView(eventId, deps = {}) {
  const event = await loadPublicEvent(eventId, deps);
  const locationId = await (deps.getSquareLocationId || getSquareLocationId)();

  return {
    mode: 'event',
    eventId: event.id,
    preorderId: null,
    requestId: null,
    itemName: `${event.name} Ticket`,
    description: event.description || `${event.name} access ticket`,
    imageUrl: event.image_url || '',
    category: 'ticket',
    price: Number(event.price || 0),
    displayPrice: (Number(event.price || 0) / 100).toFixed(2),
    requiresShipping: false,
    checkoutCategory: 'digital',
    event: {
      id: event.id,
      name: event.name,
      date: event.event_date || null,
      time: event.event_time || null,
      locationName: event.location_name || null,
    },
    square: {
      applicationId: deps.getSquareApplicationId ? deps.getSquareApplicationId() : getSquareApplicationId(),
      locationId,
      environment: deps.squareEnvironment || 'sandbox',
      currencyCode: 'USD',
      countryCode: 'US',
    },
  };
}

export async function createPaymentForEvent(eventId, payload = {}, deps = {}) {
  const event = await loadPublicEvent(eventId, deps);
  const squareClient = deps.squareClient || getSquareClient();
  const locationId = await (deps.getSquareLocationId || getSquareLocationId)();

  if (!locationId) {
    throw new AppError('No active Square location found.', {
      code: 'SQUARE_LOCATION_MISSING',
      status: 500,
      expose: true,
    });
  }

  const fullName = readString(payload.buyer?.fullName);
  const email = readString(payload.buyer?.email);
  const phone = readString(payload.buyer?.phone);

  if (!fullName || !email) {
    throw new AppError('Name and email are required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  const request = await (deps.createAccessRequest || createAccessRequest)({
    event_name: event.name,
    customer_name: fullName,
    customer_email: email,
    status: 'approved',
  });

  const orderResponse = await squareClient.orders.create({
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
            amount: toBigIntAmount(event.price || 0),
            currency: 'USD',
          },
        }],
    },
  });

  const order = orderResponse.order || orderResponse.result?.order;
  if (!order?.id) {
    throw new AppError('Square did not return an order.', {
      code: 'SQUARE_ORDER_FAILED',
      status: 502,
      expose: true,
    });
  }

  await (deps.attachOrderIdToRequest || attachOrderIdToRequest)(request.id, order.id);

  const paymentResponse = await squareClient.payments.create({
    sourceId: payload.sourceId,
    idempotencyKey: crypto.randomUUID(),
    orderId: order.id,
    locationId,
    amountMoney: {
      amount: toBigIntAmount(event.price || 0),
      currency: 'USD',
    },
    autocomplete: true,
    referenceId: String(request.id),
    verificationToken: readString(payload.verificationToken) || undefined,
    buyerEmailAddress: email,
    buyerPhoneNumber: phone || undefined,
    billingAddress: payload.billingAddress ? buildAddress(payload.billingAddress) : undefined,
    note: `LMNL public ticket checkout for ${event.name}`,
  });

  const payment = paymentResponse.payment || paymentResponse.result?.payment;
  if (!payment?.id) {
    throw new AppError('Square did not return a payment.', {
      code: 'SQUARE_PAYMENT_FAILED',
      status: 502,
      expose: true,
    });
  }

  const { siteUrl } = deps.getBaseConfig ? deps.getBaseConfig() : getBaseConfig();
  return {
    paymentId: payment.id,
    orderId: payment.orderId || order.id,
    requestId: request.id,
    redirectUrl: `${siteUrl}/success?requestId=${request.id}`,
  };
}
