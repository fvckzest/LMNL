import { getRequestById, getRequestByOrderId } from '../repositories/requests.js';
import { getEventById, getLatestEventByName } from '../repositories/events.js';
import { findTicketBySquareOrderId, getTicketWithEventById } from '../repositories/tickets.js';
import { getBaseConfig } from '../env.js';

function isPlaceholderEmail(email) {
  if (!email) return true;
  return String(email).trim().toLowerCase().endsWith('@example.com');
}

function readCustomerEmail(request, ticket) {
  const requestEmail = request?.customer_email || '';
  if (!isPlaceholderEmail(requestEmail)) return requestEmail;
  return ticket?.customer_email || requestEmail || null;
}

function readCustomerName(request, ticket) {
  const requestName = request?.customer_name || '';
  if (requestName && requestName !== 'Guest') return requestName;
  return ticket?.customer_name || requestName || null;
}

function mapRequest(request) {
  if (!request) return null;

  return {
    id: request.id,
    eventName: request.event_name,
    customerName: readCustomerName(request),
    customerEmail: readCustomerEmail(request),
    status: request.status,
    squareOrderId: request.square_order_id || null,
    createdAt: request.created_at || null,
  };
}

function mapFallbackRequestFromTicket(ticket, event) {
  if (!ticket) return null;

  return {
    id: null,
    eventName: event?.name || null,
    customerName: ticket.customer_name,
    customerEmail: ticket.customer_email,
    status: 'issued',
    squareOrderId: ticket.square_order_id || null,
    createdAt: ticket.created_at || null,
  };
}

function mapEvent(event) {
  if (!event) return null;

  return {
    id: event.id,
    name: event.name,
    date: event.event_date || null,
    time: event.event_time || null,
    locationName: event.location_name || null,
    price: event.price ?? null,
  };
}

function mapTicket(ticket) {
  if (!ticket) return null;

  const { siteUrl } = getBaseConfig();

  return {
    id: ticket.id,
    eventId: ticket.event_id || null,
    customerName: ticket.customer_name,
    customerEmail: ticket.customer_email,
    issuedAt: ticket.created_at || null,
    isUsed: Boolean(ticket.is_used),
    url: `${siteUrl}/ticket/${ticket.id}`,
  };
}

function buildSuccessView({ request, ticket, event }) {
  return {
    request: request
      ? {
        ...mapRequest(request),
        customerName: readCustomerName(request, ticket),
        customerEmail: readCustomerEmail(request, ticket),
      }
      : mapFallbackRequestFromTicket(ticket, event),
    ticket: mapTicket(ticket),
    event: mapEvent(event),
  };
}

export async function getCheckoutSuccessView(requestId, deps = {}) {
  const loadRequest = deps.getRequestById || getRequestById;
  const loadTicketByOrderId = deps.findTicketBySquareOrderId || findTicketBySquareOrderId;
  const loadEventById = deps.getEventById || getEventById;
  const loadLatestEventByName = deps.getLatestEventByName || getLatestEventByName;

  const request = await loadRequest(requestId);
  if (!request) {
    return null;
  }

  const ticket = request.square_order_id
    ? await loadTicketByOrderId(request.square_order_id)
    : null;

  const event = ticket?.event_id
    ? await loadEventById(ticket.event_id)
    : await loadLatestEventByName(request.event_name);

  return buildSuccessView({ request, ticket, event });
}

export async function getCheckoutSuccessViewByTicketId(ticketId, deps = {}) {
  const loadTicketWithEvent = deps.getTicketWithEventById || getTicketWithEventById;
  const loadRequestBySquareOrderId = deps.getRequestByOrderId || getRequestByOrderId;

  const { ticket, event } = await loadTicketWithEvent(ticketId);
  const request = ticket?.square_order_id
    ? await loadRequestBySquareOrderId(ticket.square_order_id)
    : null;

  return buildSuccessView({ request, ticket, event });
}
