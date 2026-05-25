import crypto from 'crypto';
import { getSquareApplicationId, getSquareClient, getSquareEnvironmentName, getSquareLocationId } from '../clients.js';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getLatestEventByName } from '../repositories/events.js';
import { attachOrderIdToRequest, getRequestById } from '../repositories/requests.js';

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toBigIntAmount(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new AppError('Invalid ticket price.', {
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
    firstName: readString(address.firstName) || undefined,
    lastName: readString(address.lastName) || undefined,
  };
}

async function loadRequestWithEvent(requestId, deps = {}) {
  const loadRequest = deps.getRequestById || getRequestById;
  const loadEvent = deps.getLatestEventByName || getLatestEventByName;
  const request = await loadRequest(requestId);

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

  const event = await loadEvent(request.event_name);
  if (!event) {
    throw new AppError('Event not found for this request.', {
      code: 'EVENT_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  return { request, event };
}

export async function getRequestCheckoutView(requestId, deps = {}) {
  const { request, event } = await loadRequestWithEvent(requestId, deps);
  const locationId = await (deps.getSquareLocationId || getSquareLocationId)();

  return {
    mode: 'request',
    requestId: request.id,
    preorderId: null,
    itemName: `${event.name} Ticket`,
    description: event.description || `${event.name} access ticket`,
    imageUrl: event.image_url || '',
    category: 'ticket',
    price: Number(event.price || 0),
    displayPrice: (Number(event.price || 0) / 100).toFixed(2),
    requiresShipping: false,
    checkoutCategory: 'digital',
    request: {
      id: request.id,
      customerName: request.customer_name,
      customerEmail: request.customer_email,
      eventName: request.event_name,
      status: request.status,
    },
    square: {
      applicationId: deps.getSquareApplicationId ? deps.getSquareApplicationId() : getSquareApplicationId(),
      locationId,
      environment: deps.squareEnvironment || getSquareEnvironmentName(),
      currencyCode: 'USD',
      countryCode: 'US',
    },
  };
}

export async function createPaymentForRequest(requestId, payload = {}, deps = {}) {
  const { request, event } = await loadRequestWithEvent(requestId, deps);
  const squareClient = deps.squareClient || getSquareClient();
  const locationId = await (deps.getSquareLocationId || getSquareLocationId)();

  if (!locationId) {
    throw new AppError('No active Square location found.', {
      code: 'SQUARE_LOCATION_MISSING',
      status: 500,
      expose: true,
    });
  }

  const email = readString(payload.buyer?.email) || request.customer_email;
  const phone = readString(payload.buyer?.phone);

  if (!email) {
    throw new AppError('Email is required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  const orderPayload = {
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
  };

  const orderResponse = await squareClient.orders.create(orderPayload);
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
    note: `LMNL ticket checkout for ${event.name}`,
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
    redirectUrl: `${siteUrl}/success?requestId=${request.id}`,
  };
}
