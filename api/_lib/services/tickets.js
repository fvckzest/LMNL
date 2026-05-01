import { AppError } from '../errors.js';
import {
  getTicketWithEventById,
  getTicketWithEventByQrPayload,
  markTicketAsUsed,
} from '../repositories/tickets.js';

export async function getTicketView(ticketId, deps = {}) {
  const loadTicket = deps.getTicketWithEventById || getTicketWithEventById;
  return loadTicket(ticketId);
}

export function extractTicketIdFromScanValue(scanValue) {
  const normalized = String(scanValue || '').trim();
  if (!normalized) return '';

  const ticketPathMatch = normalized.match(/\/ticket\/([^/?#]+)/i);
  if (ticketPathMatch) {
    return decodeURIComponent(ticketPathMatch[1]);
  }

  if (/^https?:\/\//i.test(normalized)) {
    return '';
  }

  if (/^LMNL-/i.test(normalized)) {
    return '';
  }

  return normalized;
}

export async function checkInTicket(scanValue, deps = {}) {
  const normalized = String(scanValue || '').trim();
  if (!normalized) {
    throw new AppError('Scan value is required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  const loadTicketById = deps.getTicketWithEventById || getTicketWithEventById;
  const loadTicketByQrPayload = deps.getTicketWithEventByQrPayload || getTicketWithEventByQrPayload;
  const updateTicketUsage = deps.markTicketAsUsed || markTicketAsUsed;

  const ticketId = extractTicketIdFromScanValue(normalized);
  const { ticket, event } = ticketId
    ? await loadTicketById(ticketId)
    : await loadTicketByQrPayload(normalized);

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
