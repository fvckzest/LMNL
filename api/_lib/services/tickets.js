import { AppError } from '../errors.js';
import {
  getTicketWithEventById,
  getTicketWithEventByQrPayload,
  markTicketAsUsed,
} from '../repositories/tickets.js';

function isLocalHostname(hostname = '') {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function buildAdminCheckInUrl(token, options = {}) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return '';
  }

  const siteUrl = options.siteUrl || 'https://lmnl.art';
  const url = new URL(siteUrl);
  const host = url.hostname.replace(/^www\./i, '');
  const adminOrigin = isLocalHostname(host) || host.startsWith('admin.')
    ? url.origin
    : `${url.protocol}//admin.${url.host}`;

  return new URL(`/check-in/${encodeURIComponent(normalizedToken)}`, adminOrigin).toString();
}

export async function getTicketView(ticketId, deps = {}) {
  const loadTicket = deps.getTicketWithEventById || getTicketWithEventById;
  return loadTicket(ticketId);
}

export async function getCheckInTicketView(token, deps = {}) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new AppError('Check-in token is required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  const loadTicketByQrPayload = deps.getTicketWithEventByQrPayload || getTicketWithEventByQrPayload;
  const { ticket, event } = await loadTicketByQrPayload(normalizedToken);

  return {
    status: ticket.is_used ? 'already_used' : 'valid',
    ticket,
    event,
  };
}

export async function confirmCheckInTicket(token, deps = {}) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new AppError('Check-in token is required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  const loadTicketByQrPayload = deps.getTicketWithEventByQrPayload || getTicketWithEventByQrPayload;
  const updateTicketUsage = deps.markTicketAsUsed || markTicketAsUsed;
  const { ticket, event } = await loadTicketByQrPayload(normalizedToken);

  if (ticket.is_used) {
    return {
      status: 'already_used',
      ticket,
      event,
    };
  }

  const updatedTicket = await updateTicketUsage(ticket.id);
  return {
    status: 'checked_in',
    ticket: updatedTicket,
    event,
  };
}
