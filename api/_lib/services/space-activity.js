import { AppError } from '../errors.js';
import { getEventById, getLatestEventByName } from '../repositories/events.js';
import { countTicketsByEventId, listRecentTicketsByEventId } from '../repositories/tickets.js';

function maskCustomerName(value) {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return 'Guest';
  if (parts.length === 1) return parts[0];

  const [firstName, ...rest] = parts;
  const lastInitial = rest[rest.length - 1]?.charAt(0)?.toUpperCase();
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

function formatTimeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const elapsed = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round(elapsed / (1000 * 60));

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour');
  }

  const days = Math.round(hours / 24);
  return formatter.format(days, 'day');
}

function normalizeTicketActivity(ticket) {
  return {
    id: ticket.id,
    customerName: maskCustomerName(ticket.customer_name),
    createdAt: ticket.created_at,
    timeAgo: formatTimeAgo(ticket.created_at),
  };
}

export async function getSpaceTicketActivity({ eventId, eventName = 'SPACE', limit = 8 }, deps = {}) {
  const safeLimit = Math.max(Number(limit) || 8, 1);
  const loadEventById = deps.getEventById || getEventById;
  const loadLatestEventByName = deps.getLatestEventByName || getLatestEventByName;
  const loadTicketsByEventId = deps.listRecentTicketsByEventId || listRecentTicketsByEventId;
  const loadTicketCountByEventId = deps.countTicketsByEventId || countTicketsByEventId;

  const event = eventId
    ? await loadEventById(eventId)
    : await loadLatestEventByName(eventName);

  if (!event?.id) {
    throw new AppError('Event not found.', {
      code: 'NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  const [tickets, soldTickets] = await Promise.all([
    loadTicketsByEventId(event.id, safeLimit),
    loadTicketCountByEventId(event.id),
  ]);

  return {
    eventId: event.id,
    eventName: event.name || eventName,
    soldTickets,
    activity: tickets.map(normalizeTicketActivity),
  };
}
