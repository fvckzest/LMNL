import crypto from 'crypto';
import { getSquareApplicationId, getSquareClient, getSquareEnvironmentName, getSquareLocationId } from '../clients.js';
import { AppError } from '../errors.js';
import { getPreorderById } from '../repositories/preorders.js';
import { getBaseConfig } from '../env.js';

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeCountry(value) {
  const country = readString(value).toUpperCase();
  return country || 'US';
}

function toDisplayPrice(amount) {
  return (Number(amount || 0) / 100).toFixed(2);
}

function toBigIntAmount(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new AppError('Invalid preorder price.', {
      code: 'INVALID_PREORDER_PRICE',
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
    country: normalizeCountry(address.country),
    firstName: readString(address.firstName) || undefined,
    lastName: readString(address.lastName) || undefined,
  };
}

function validateShippingAddress(address) {
  if (!address.addressLine1 || !address.locality || !address.administrativeDistrictLevel1 || !address.postalCode) {
    throw new AppError('Shipping address is incomplete.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  return address;
}

function normalizeBuyerDetails(payload = {}) {
  const fullName = readString(payload.fullName);
  const [firstName = '', ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(' ');

  return {
    fullName,
    email: readString(payload.email),
    phone: readString(payload.phone),
    firstName: readString(payload.firstName) || firstName,
    lastName: readString(payload.lastName) || lastName,
  };
}

function getPreorderMetadata(preorder) {
  return parseMetadata(preorder?.metadata);
}

function preorderRequiresShipping(preorder) {
  const metadata = getPreorderMetadata(preorder);
  if (typeof metadata.requires_shipping === 'boolean') return metadata.requires_shipping;
  if (typeof metadata.fulfillment_type === 'string') {
    return metadata.fulfillment_type.toLowerCase() !== 'digital';
  }
  if (typeof preorder?.requires_shipping === 'boolean') return preorder.requires_shipping;
  if (typeof preorder?.is_digital === 'boolean') return !preorder.is_digital;
  return true;
}

function preorderCategory(preorder) {
  const metadata = getPreorderMetadata(preorder);
  if (typeof metadata.checkout_category === 'string') return metadata.checkout_category;
  return preorderRequiresShipping(preorder) ? 'physical' : 'digital';
}

function readFallbackPreorderPrice(preorder) {
  const numeric = Number(preorder?.price);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

async function resolveSquarePricing(squareItemId, deps = {}) {
  if (!squareItemId) {
    return null;
  }

  const squareClient = deps.squareClient || getSquareClient();
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
    return {
      variationId: object.id,
      price: Number(object.itemVariationData?.priceMoney?.amount || 0),
    };
  }

  if (object.type === 'ITEM') {
    const variation = object.itemData?.variations?.[0];
    if (!variation?.id) {
      throw new AppError('This Square item has no variations.', {
        code: 'SQUARE_VARIATION_MISSING',
        status: 400,
        expose: true,
      });
    }

    return {
      variationId: variation.id,
      price: Number(variation.itemVariationData?.priceMoney?.amount || 0),
    };
  }

  throw new AppError('Unsupported Square object type for checkout.', {
    code: 'SQUARE_ITEM_INVALID',
    status: 400,
    expose: true,
  });
}

function buildCheckoutView(preorder, resolvedPrice, squareConfig = {}) {
  return {
    preorderId: preorder.id,
    itemName: preorder.item_name || 'LMNL Product',
    description: preorder.description || '',
    imageUrl: preorder.image_url || '',
    category: preorder.category || '',
    price: resolvedPrice,
    displayPrice: toDisplayPrice(resolvedPrice),
    requiresShipping: preorderRequiresShipping(preorder),
    checkoutCategory: preorderCategory(preorder),
    square: {
      applicationId: squareConfig.applicationId || '',
      locationId: squareConfig.locationId || '',
      environment: squareConfig.environment || 'sandbox',
      currencyCode: 'USD',
      countryCode: 'US',
    },
  };
}

async function loadPreorderOrThrow(preorderId, deps = {}) {
  const loadPreorder = deps.getPreorderById || getPreorderById;
  const preorder = await loadPreorder(preorderId);

  if (!preorder) {
    throw new AppError('Preorder not found.', {
      code: 'PREORDER_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  return preorder;
}

function buildRecipient(buyer, shippingAddress) {
  return {
    displayName: buyer.fullName,
    emailAddress: buyer.email || undefined,
    phoneNumber: buyer.phone,
    address: shippingAddress,
  };
}

async function createSquareOrderForPreorder(preorder, buyer, shippingAddress, deps = {}) {
  const squareClient = deps.squareClient || getSquareClient();
  const loadLocationId = deps.getSquareLocationId || getSquareLocationId;
  const locationId = await loadLocationId();
  const squarePricing = await resolveSquarePricing(preorder.square_item_id, deps);
  const fallbackPrice = readFallbackPreorderPrice(preorder);
  const price = squarePricing?.price ?? fallbackPrice;

  if (!locationId) {
    throw new AppError('No active Square location found.', {
      code: 'SQUARE_LOCATION_MISSING',
      status: 500,
      expose: true,
    });
  }

  const orderPayload = {
    idempotencyKey: crypto.randomUUID(),
    order: {
      locationId,
      referenceId: String(preorder.id),
      metadata: {
        preorderId: String(preorder.id),
      },
      lineItems: [
        squarePricing?.variationId
          ? {
            quantity: '1',
            catalogObjectId: squarePricing.variationId,
          }
          : {
            name: preorder.item_name || 'LMNL Product',
            quantity: '1',
            basePriceMoney: {
              amount: toBigIntAmount(price),
              currency: 'USD',
            },
          },
      ],
    },
  };

  if (preorderRequiresShipping(preorder)) {
    orderPayload.order.fulfillments = [
      {
        type: 'SHIPMENT',
        state: 'PROPOSED',
        lineItemApplication: 'ALL',
        shipmentDetails: {
          recipient: buildRecipient(buyer, validateShippingAddress(shippingAddress)),
          shippingType: 'Standard',
          placedAt: new Date().toISOString(),
        },
      },
    ];
  }

  const response = await squareClient.orders.create(orderPayload);
  const order = response.order || response.result?.order;

  if (!order?.id) {
    throw new AppError('Square did not return an order.', {
      code: 'SQUARE_ORDER_FAILED',
      status: 502,
      expose: true,
    });
  }

  return {
    order,
    locationId,
    price,
  };
}

export async function getPreorderCheckoutView(preorderId, deps = {}) {
  const preorder = await loadPreorderOrThrow(preorderId, deps);
  const loadLocationId = deps.getSquareLocationId || getSquareLocationId;
  const locationId = await loadLocationId();
  const squarePricing = await resolveSquarePricing(preorder.square_item_id, deps);
  const price = squarePricing?.price ?? readFallbackPreorderPrice(preorder);

  return buildCheckoutView(preorder, price, {
    applicationId: deps.getSquareApplicationId ? deps.getSquareApplicationId() : getSquareApplicationId(),
    locationId,
    environment: deps.squareEnvironment || getSquareEnvironmentName(),
  });
}

export async function createPaymentForPreorder(preorderId, payload = {}, deps = {}) {
  const preorder = await loadPreorderOrThrow(preorderId, deps);
  const buyer = normalizeBuyerDetails(payload.buyer);

  if (!buyer.fullName || !buyer.email) {
    throw new AppError('Name and email are required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  if (preorderRequiresShipping(preorder) && !buyer.phone) {
    throw new AppError('Phone number is required for shipping.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  const shippingAddress = preorderRequiresShipping(preorder)
    ? buildAddress(payload.shippingAddress)
    : undefined;

  const { order, locationId, price } = await createSquareOrderForPreorder(preorder, buyer, shippingAddress, deps);
  const squareClient = deps.squareClient || getSquareClient();
  const { siteUrl } = deps.getBaseConfig ? deps.getBaseConfig() : getBaseConfig();

  const paymentResponse = await squareClient.payments.create({
    sourceId: payload.sourceId,
    idempotencyKey: crypto.randomUUID(),
    orderId: order.id,
    locationId,
    amountMoney: {
      amount: toBigIntAmount(price),
      currency: 'USD',
    },
    autocomplete: true,
    referenceId: String(preorder.id),
    verificationToken: readString(payload.verificationToken) || undefined,
    buyerEmailAddress: buyer.email,
    buyerPhoneNumber: buyer.phone || undefined,
    shippingAddress: shippingAddress || undefined,
    billingAddress: payload.billingAddress ? buildAddress(payload.billingAddress) : undefined,
    note: `LMNL checkout for ${preorder.item_name || preorder.id}`,
  });

  const payment = paymentResponse.payment || paymentResponse.result?.payment;
  if (!payment?.id) {
    throw new AppError('Square did not return a payment.', {
      code: 'SQUARE_PAYMENT_FAILED',
      status: 502,
      expose: true,
    });
  }

  return {
    paymentId: payment.id,
    orderId: payment.orderId || order.id,
    redirectUrl: `${siteUrl}/shop?checkout=success&preorderId=${preorder.id}`,
  };
}

export { preorderRequiresShipping };
