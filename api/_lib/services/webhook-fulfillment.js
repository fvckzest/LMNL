import crypto from 'crypto';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getResendClient, getSquareClient } from '../clients.js';
import { getEventBySquareVariationIds } from '../repositories/events.js';
import {
  fulfillApprovedRequestById,
  fulfillApprovedRequestByOrderId,
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
  if (!customerEmail) return;

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
  const passResult = await makePass(ticket.id);
  if (passResult.kind === 'buffer') {
    emailOptions.attachments = [{
      filename: passResult.filename,
      content: passResult.buffer,
    }];
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

export async function processSquareOrderUpdate(payload, headers, deps = {}) {
  const verify = deps.verifySignature || verifySignature;
  const loadTicketByOrderId = deps.findTicketBySquareOrderId || findTicketBySquareOrderId;
  const fulfillById = deps.fulfillApprovedRequestById || fulfillApprovedRequestById;
  const fulfillByOrderId = deps.fulfillApprovedRequestByOrderId || fulfillApprovedRequestByOrderId;
  const loadEvent = deps.getEventBySquareVariationIds || getEventBySquareVariationIds;
  const loadCustomer = deps.resolveCustomer || resolveCustomer;
  const insertTicket = deps.createTicket || createTicket;
  const sendEmail = deps.sendTicketEmail || sendTicketEmail;

  verify(payload, headers);

  if (payload.type !== 'order.updated') {
    return { ignored: true, reason: `Unhandled event type: ${payload.type}` };
  }

  const squareOrderId = payload.data?.object?.order_updated?.order_id || payload.data?.id || payload.data?.object?.id;
  if (!squareOrderId) {
    return { ignored: true, reason: 'No order ID found in payload' };
  }

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

  const isPaid = Array.isArray(order.tenders) && order.tenders.length > 0;
  if (order.state !== 'COMPLETED' && !(order.state === 'OPEN' && isPaid)) {
    return { ignored: true, reason: `Order state ${order.state} is not fulfillable` };
  }

  let lockedRequest = null;
  if (order.metadata?.requestId) {
    lockedRequest = await fulfillById(order.metadata.requestId);
  }
  if (!lockedRequest) {
    lockedRequest = await fulfillByOrderId(squareOrderId);
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
