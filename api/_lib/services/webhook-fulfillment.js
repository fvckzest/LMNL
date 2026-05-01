import crypto from 'crypto';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getResendClient, getSquareClient } from '../clients.js';
import { getEventBySquareVariationIds } from '../repositories/events.js';
import {
  fulfillApprovedRequestById,
  fulfillApprovedRequestByOrderId,
  getRequestById,
  getRequestByOrderId,
  getRequestCustomerById,
  getRequestCustomerByOrderId,
} from '../repositories/requests.js';
import { createTicket, findTicketBySquareOrderId } from '../repositories/tickets.js';
import { generateTicketPass } from './passkit.js';

function isPlaceholderEmail(email) {
  if (!email) return true;
  const normalized = String(email).trim().toLowerCase();
  if (!normalized) return true;
  return normalized.endsWith('@example.com');
}

function verifySignature(payload, headers) {
  const { squareWebhookSignatureKey, squareWebhookUrl } = getBaseConfig();
  const signature = headers['x-square-hmacsha256-signature'];

  if (!squareWebhookSignatureKey || !signature) {
    return;
  }

  const digest = crypto
    .createHmac('sha256', squareWebhookSignatureKey)
    .update(squareWebhookUrl + JSON.stringify(payload))
    .digest('base64');

  if (digest !== signature) {
    throw new AppError('Invalid signature', {
      code: 'INVALID_SIGNATURE',
      status: 403,
      expose: true,
    });
  }
}

export async function resolveCustomer(order, squareOrderId, deps = {}) {
  let customerName = 'Guest';
  let customerEmail = '';
  const squareClient = deps.squareClient || getSquareClient();
  const loadRequestCustomerById = deps.getRequestCustomerById || getRequestCustomerById;
  const loadRequestCustomerByOrderId = deps.getRequestCustomerByOrderId || getRequestCustomerByOrderId;

  const recipient = order.fulfillments?.[0]?.pickupDetails?.recipient
    || order.fulfillments?.[0]?.shipmentDetails?.recipient
    || order.fulfillments?.[0]?.digitalDetails?.recipient
    || null;

  if (recipient) {
    customerName = recipient.displayName || customerName;
    if (!isPlaceholderEmail(recipient.emailAddress)) {
      customerEmail = recipient.emailAddress;
    }
  }

  if (!customerEmail) {
    const customerId = order.customerId || order.tenders?.[0]?.customerId;
    if (customerId) {
      try {
        const response = await squareClient.customers.get({ customerId });
        const customer = response.customer || response.result?.customer;
        customerName = `${customer?.givenName || ''} ${customer?.familyName || ''}`.trim() || customerName;
        customerEmail = isPlaceholderEmail(customer?.emailAddress) ? '' : (customer?.emailAddress || '');
      } catch (error) {
        console.warn('[webhook] customer lookup failed', error);
      }
    }
  }

  if (!customerEmail && order.metadata?.requestId) {
    const requestCustomer = await loadRequestCustomerById(order.metadata.requestId);
    customerName = requestCustomer?.customer_name || customerName;
    customerEmail = requestCustomer?.customer_email || customerEmail;
  }

  if (!customerEmail) {
    const requestCustomer = await loadRequestCustomerByOrderId(squareOrderId);
    customerName = requestCustomer?.customer_name || customerName;
    customerEmail = requestCustomer?.customer_email || customerEmail;
  }

  return { customerName, customerEmail };
}

export async function sendTicketEmail(ticket, event, customerEmail, customerName, deps = {}) {
  if (!customerEmail) {
    console.warn('[webhook] ticket email skipped: missing customer email', {
      ticketId: ticket?.id || null,
      squareOrderId: ticket?.square_order_id || null,
    });
    return { skipped: true, reason: 'Missing customer email.' };
  }

  const resend = deps.resendClient || getResendClient();
  const { siteUrl } = getBaseConfig();
  const ticketUrl = `${siteUrl}/ticket/${ticket.id}`;
  const eventName = event?.name || 'LMNL Event';
  const primaryFrom = process.env.RESEND_API_KEY?.startsWith('re_')
    ? 'LMNL <tickets@lmnl.art>'
    : 'onboarding@resend.dev';

  const emailOptions = {
    from: primaryFrom,
    to: customerEmail,
    subject: `Your Ticket: ${eventName}`,
    html: `<p>Your ticket for ${eventName} is ready. View it here: <a href="${ticketUrl}">${ticketUrl}</a></p><p>Guest: ${customerName}</p>`,
  };

  const makePass = deps.generateTicketPass || generateTicketPass;
  try {
    const passResult = await makePass(ticket.id);
    if (passResult.kind === 'buffer') {
      emailOptions.attachments = [{
        filename: passResult.filename,
        content: passResult.buffer,
      }];
    }
  } catch (error) {
    console.error('[webhook] pass generation failed; sending ticket email without attachment', {
      ticketId: ticket.id,
      error,
    });
  }

  const response = await resend.emails.send(emailOptions);
  if (response.error && primaryFrom !== 'onboarding@resend.dev') {
    const fallback = await resend.emails.send({
      ...emailOptions,
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

function getPayloadType(payload) {
  return payload?.type || payload?.event_type || '';
}

function getOrderIdFromOrderPayload(payload) {
  return payload.data?.object?.order_updated?.order_id
    || payload.data?.id
    || payload.data?.object?.id
    || null;
}

async function getOrderIdFromPaymentPayload(payload, deps = {}) {
  const payment = payload.data?.object?.payment || null;
  const paymentId = payment?.id || payload.data?.id || payload.data?.object?.id || null;
  const paymentStatus = payment?.status || '';
  const orderId = payment?.orderId || payment?.order_id || null;

  if (paymentStatus && paymentStatus !== 'COMPLETED') {
    return {
      orderId,
      ignored: true,
      reason: `Payment status ${paymentStatus} is not fulfillable`,
    };
  }

  if (orderId) {
    return { orderId };
  }

  if (!paymentId) {
    return {
      orderId: null,
      ignored: true,
      reason: 'No payment ID found in payload',
    };
  }

  const squareClient = deps.squareClient || getSquareClient();
  const paymentResponse = await squareClient.payments.get({ paymentId });
  const hydratedPayment = paymentResponse.payment || paymentResponse.result?.payment;
  const hydratedOrderId = hydratedPayment?.orderId || hydratedPayment?.order_id || null;

  if ((hydratedPayment?.status || '') && hydratedPayment.status !== 'COMPLETED') {
    return {
      orderId: hydratedOrderId,
      ignored: true,
      reason: `Payment status ${hydratedPayment.status} is not fulfillable`,
    };
  }

  return { orderId: hydratedOrderId };
}

async function resolveSquareOrderIdFromPayload(payload, deps = {}) {
  const eventType = getPayloadType(payload);

  if (eventType === 'order.updated') {
    const orderId = getOrderIdFromOrderPayload(payload);
    return orderId
      ? { orderId }
      : { orderId: null, ignored: true, reason: 'No order ID found in payload' };
  }

  if (eventType === 'payment.updated') {
    return getOrderIdFromPaymentPayload(payload, deps);
  }

  return {
    orderId: null,
    ignored: true,
    reason: `Unhandled event type: ${eventType || 'unknown'}`,
  };
}

function isFulfillableOrder(order) {
  const isPaid = Array.isArray(order.tenders) && order.tenders.length > 0;
  return order.state === 'COMPLETED' || (order.state === 'OPEN' && isPaid);
}

export async function fulfillTicketForSquareOrder(squareOrderId, deps = {}) {
  const loadTicketByOrderId = deps.findTicketBySquareOrderId || findTicketBySquareOrderId;
  const fulfillById = deps.fulfillApprovedRequestById || fulfillApprovedRequestById;
  const fulfillByOrderId = deps.fulfillApprovedRequestByOrderId || fulfillApprovedRequestByOrderId;
  const loadRequestBySquareOrderId = deps.getRequestByOrderId || getRequestByOrderId;
  const loadEvent = deps.getEventBySquareVariationIds || getEventBySquareVariationIds;
  const loadCustomer = deps.resolveCustomer || resolveCustomer;
  const insertTicket = deps.createTicket || createTicket;
  const sendEmail = deps.sendTicketEmail || sendTicketEmail;

  const existingTicket = await loadTicketByOrderId(squareOrderId);
  if (existingTicket) {
    return { replay: true, ticketId: existingTicket.id };
  }

  const squareClient = deps.squareClient || getSquareClient();
  const orderResponse = await squareClient.orders.get({ orderId: squareOrderId });
  const order = orderResponse.order || orderResponse.result?.order;

  if (!order) {
    throw new AppError('Square order not found.', {
      code: 'SQUARE_ORDER_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  if (!isFulfillableOrder(order)) {
    return { ignored: true, reason: `Order state ${order.state} is not fulfillable` };
  }

  let lockedRequest = null;
  if (order.metadata?.requestId) {
    lockedRequest = await fulfillById(order.metadata.requestId);
  }
  if (!lockedRequest) {
    lockedRequest = await fulfillByOrderId(squareOrderId);
  }
  if (!lockedRequest && deps.allowExistingRequestLookup) {
    lockedRequest = await loadRequestBySquareOrderId(squareOrderId);
  }

  if (!lockedRequest) {
    const replayTicket = await loadTicketByOrderId(squareOrderId);
    if (replayTicket) {
      return { replay: true, ticketId: replayTicket.id };
    }
    return { success: true, noop: true, reason: 'No approved request matched this order.' };
  }

  const catalogObjectIds = (order.lineItems || []).map((lineItem) => lineItem.catalogObjectId).filter(Boolean);
  const [event, customer] = await Promise.all([
    loadEvent(catalogObjectIds),
    loadCustomer(order, squareOrderId),
  ]);

  let ticket;
  try {
    ticket = await insertTicket({
      event_id: event?.id || null,
      square_order_id: squareOrderId,
      customer_name: customer.customerName,
      customer_email: customer.customerEmail,
      qr_code_payload: `LMNL-${crypto.randomUUID()}`,
    });
  } catch (error) {
    if (error?.code === '23505' || /duplicate/i.test(error?.message || '')) {
      const replayTicket = await loadTicketByOrderId(squareOrderId);
      return { replay: true, ticketId: replayTicket?.id || null };
    }
    throw error;
  }

  try {
    await sendEmail(ticket, event, customer.customerEmail, customer.customerName);
  } catch (error) {
    console.error('[webhook] post-ticket email flow failed', error);
  }

  return { success: true, ticketId: ticket.id };
}

export async function reconcileApprovedRequestTicket(requestId, deps = {}) {
  const loadRequest = deps.getRequestById || getRequestById;
  const request = await loadRequest(requestId);

  if (!request) {
    throw new AppError('Request not found.', {
      code: 'REQUEST_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  if (!request.square_order_id) {
    throw new AppError('This request is not linked to a Square order yet.', {
      code: 'SQUARE_ORDER_MISSING',
      status: 400,
      expose: true,
    });
  }

  return fulfillTicketForSquareOrder(request.square_order_id, {
    ...deps,
    allowExistingRequestLookup: true,
  });
}

export async function processSquareOrderUpdate(payload, headers, deps = {}) {
  const verify = deps.verifySignature || verifySignature;
  verify(payload, headers);

  const { orderId, ignored, reason } = await resolveSquareOrderIdFromPayload(payload, deps);
  if (!orderId) {
    return { ignored: true, reason: reason || 'No order ID found in payload' };
  }
  if (ignored) {
    return { ignored, reason };
  }

  return fulfillTicketForSquareOrder(orderId, deps);
}
