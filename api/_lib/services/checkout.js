import crypto from 'crypto';
import { getSquareClient, getSquareLocationId } from '../clients.js';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getPreorderById } from '../repositories/preorders.js';

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
    },
    checkoutOptions: {
      redirectUrl: `${siteUrl}/shop?checkout=success&preorderId=${preorderId}`,
      askForShippingAddress: true,
    },
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
