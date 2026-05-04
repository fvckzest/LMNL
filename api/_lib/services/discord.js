import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { countTicketsByEventId } from '../repositories/tickets.js';
import { getVariationInventory } from './inventory.js';

function formatRemainingTicketsLabel(remainingTickets) {
  if (typeof remainingTickets !== 'number' || Number.isNaN(remainingTickets)) {
    return 'Tickets left: unavailable';
  }

  return remainingTickets === 1
    ? '1 ticket left'
    : `${remainingTickets} tickets left`;
}

export async function getRemainingTicketCount(event, deps = {}) {
  if (!event) return null;

  const loadVariationInventory = deps.getVariationInventory || getVariationInventory;
  const loadTicketCountByEventId = deps.countTicketsByEventId || countTicketsByEventId;

  if (event.square_variation_id) {
    const inventory = await loadVariationInventory(event.square_variation_id);
    if (typeof inventory?.available === 'number') {
      return Math.max(0, inventory.available);
    }
  }

  if (Number.isFinite(Number(event.capacity))) {
    const soldTicketCount = await loadTicketCountByEventId(event.id);
    return Math.max(0, Number(event.capacity) - soldTicketCount);
  }

  return null;
}

export async function sendDiscordTicketNotification(ticket, event, customerName, deps = {}) {
  const config = deps.getBaseConfig ? deps.getBaseConfig() : getBaseConfig();
  const botToken = config.discordBotToken;
  const channelId = config.discordTicketChannelId;

  if (!botToken || !channelId) {
    return { skipped: true, reason: 'Missing Discord bot configuration.' };
  }

  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return { skipped: true, reason: 'Fetch is unavailable in this runtime.' };
  }

  const remainingTickets = await getRemainingTicketCount(event, deps);
  const buyerName = String(customerName || ticket?.customer_name || 'Guest').trim() || 'Guest';
  const eventName = String(event?.name || 'LMNL Event').trim() || 'LMNL Event';
  const content = `${buyerName} bought a ticket for ${eventName}. ${formatRemainingTicketsLabel(remainingTickets)}.`;
  const apiBaseUrl = String(deps.discordApiBaseUrl || 'https://discord.com/api/v10').replace(/\/$/, '');

  const response = await fetchImpl(`${apiBaseUrl}/channels/${encodeURIComponent(channelId)}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new AppError('Discord bot message failed.', {
      code: 'DISCORD_BOT_MESSAGE_FAILED',
      status: 502,
      details: { status: response.status },
      expose: true,
    });
  }

  return {
    success: true,
    content,
    remainingTickets,
  };
}
