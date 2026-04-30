import crypto from 'crypto';
import { getAdminSupabase, getResendClient, getSquareClient, getSquareLocationId } from '../clients.js';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getRequestById, approveRequestWithOrderId } from '../repositories/requests.js';

async function getEventPricing(eventName) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('price, square_variation_id')
    .eq('name', eventName)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function sendApprovalEmail(to, eventName, checkoutUrl) {
  const resend = getResendClient();
  const primaryFrom = process.env.RESEND_API_KEY?.startsWith('re_')
    ? 'LMNL <tickets@lmnl.art>'
    : 'onboarding@resend.dev';

  const payload = {
    from: primaryFrom,
    to,
    subject: `Approved: Your Invite to ${eventName}`,
    html: `<p>Your invite to ${eventName} is approved. Pay here: <a href="${checkoutUrl}">${checkoutUrl}</a></p>`,
  };

  const response = await resend.emails.send(payload);
  if (response.error && primaryFrom !== 'onboarding@resend.dev') {
    const fallback = await resend.emails.send({
      ...payload,
      from: 'onboarding@resend.dev',
    });
    if (fallback.error) {
      throw new AppError(`Email failed: ${fallback.error.message}`, {
        code: 'EMAIL_SEND_FAILED',
        status: 502,
        expose: true,
      });
    }
    return fallback.data;
  }

  if (response.error) {
    throw new AppError(`Email failed: ${response.error.message}`, {
      code: 'EMAIL_SEND_FAILED',
      status: 502,
      expose: true,
    });
  }

  return response.data;
}

export async function approveRequestAndSendCheckout(requestId) {
  const request = await getRequestById(requestId);
  if (!request) {
    throw new AppError('Request not found.', {
      code: 'REQUEST_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  const squareClient = getSquareClient();
  const locationId = await getSquareLocationId();
  if (!locationId) {
    throw new AppError('No active Square location found.', {
      code: 'SQUARE_LOCATION_MISSING',
      status: 500,
      expose: true,
    });
  }

  const eventData = await getEventPricing(request.event_name);
  const { siteUrl } = getBaseConfig();
  const order = {
    locationId,
    metadata: {
      requestId,
    },
  };

  if (eventData?.square_variation_id) {
    order.lineItems = [{
      quantity: '1',
      catalogObjectId: eventData.square_variation_id,
    }];
  } else {
    order.lineItems = [{
      quantity: '1',
      name: `${request.event_name} - Access Ticket`,
      basePriceMoney: {
        amount: BigInt(eventData?.price || 100),
        currency: 'USD',
      },
    }];
  }

  const paymentLinkResponse = await squareClient.checkout.paymentLinks.create({
    idempotencyKey: crypto.randomUUID(),
    order,
    checkoutOptions: {
      redirectUrl: `${siteUrl}/events?approval=success&requestId=${requestId}`,
      askForShippingAddress: true,
    },
  });

  const paymentLink = paymentLinkResponse.paymentLink || paymentLinkResponse.result?.paymentLink;
  if (!paymentLink?.url) {
    throw new AppError('Square did not return a payment link.', {
      code: 'SQUARE_CHECKOUT_FAILED',
      status: 502,
      expose: true,
    });
  }

  await sendApprovalEmail(request.customer_email, request.event_name, paymentLink.url);
  const updatedRequest = await approveRequestWithOrderId(requestId, paymentLink.orderId);

  return {
    checkoutUrl: paymentLink.url,
    status: updatedRequest.status,
    orderId: paymentLink.orderId || null,
  };
}
