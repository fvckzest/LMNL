import { getTicketWithEventById } from '../repositories/tickets.js';

export async function getTicketView(ticketId, deps = {}) {
  const loadTicket = deps.getTicketWithEventById || getTicketWithEventById;
  return loadTicket(ticketId);
}
