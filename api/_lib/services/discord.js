import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { countTicketsByEventId } from '../repositories/tickets.js';
import { getVariationInventory } from './inventory.js';

const DISCORD_EMBED_LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
};

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

function truncate(value, maxLength) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function cleanFieldValue(value, fallback = '—') {
  const normalized = truncate(value, DISCORD_EMBED_LIMITS.fieldValue);
  return normalized || fallback;
}

function sanitizeField(field) {
  const name = truncate(field?.name, DISCORD_EMBED_LIMITS.fieldName);
  if (!name) return null;

  return {
    name,
    value: cleanFieldValue(field?.value),
    inline: field?.inline === true,
  };
}

async function postDiscordMessage(channelId, body, deps = {}) {
  const config = deps.getBaseConfig ? deps.getBaseConfig() : getBaseConfig();
  const botToken = config.discordBotToken;

  if (!botToken || !channelId) {
    return { skipped: true, reason: 'Missing Discord bot configuration.' };
  }

  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return { skipped: true, reason: 'Fetch is unavailable in this runtime.' };
  }

  const apiBaseUrl = String(deps.discordApiBaseUrl || 'https://discord.com/api/v10').replace(/\/$/, '');
  const timeoutMs = Number.isFinite(Number(deps.discordTimeoutMs)) ? Number(deps.discordTimeoutMs) : 5000;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response;
  try {
    response = await fetchImpl(`${apiBaseUrl}/channels/${encodeURIComponent(channelId)}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    if (controller?.signal?.aborted) {
      throw new AppError('Discord bot message timed out.', {
        code: 'DISCORD_BOT_MESSAGE_TIMEOUT',
        status: 504,
        details: { timeoutMs },
        expose: true,
      });
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  if (!response.ok) {
    throw new AppError('Discord bot message failed.', {
      code: 'DISCORD_BOT_MESSAGE_FAILED',
      status: 502,
      details: { status: response.status },
      expose: true,
    });
  }

  return { success: true };
}

export async function sendDiscordTicketNotification(ticket, event, customerName, deps = {}) {
  const config = deps.getBaseConfig ? deps.getBaseConfig() : getBaseConfig();
  const channelId = config.discordTicketChannelId;

  const remainingTickets = await getRemainingTicketCount(event, deps);
  const buyerName = String(customerName || ticket?.customer_name || 'Guest').trim() || 'Guest';
  const eventName = String(event?.name || 'LMNL Event').trim() || 'LMNL Event';
  const content = `${buyerName} bought a ticket for ${eventName}. ${formatRemainingTicketsLabel(remainingTickets)}.`;
  await postDiscordMessage(channelId, { content }, deps);

  return {
    success: true,
    content,
    remainingTickets,
  };
}

export function buildInquiryDiscordEmbed(inquiry) {
  const selectedServices = Array.isArray(inquiry?.selected_services)
    ? inquiry.selected_services.filter(Boolean)
    : [];
  const isGeneralContact = selectedServices.includes('general');

  return {
    title: truncate(
      isGeneralContact ? 'New Contact Intake' : 'New Service Inquiry',
      DISCORD_EMBED_LIMITS.title,
    ),
    color: isGeneralContact ? 0x90e937 : 0x7b52d6,
    fields: [
      { name: 'Name', value: inquiry?.name, inline: true },
      { name: 'Email', value: inquiry?.email, inline: true },
      { name: 'Inquiry Type', value: isGeneralContact ? 'General contact' : 'Service inquiry', inline: true },
      { name: 'Selected Services', value: selectedServices.length ? selectedServices.join('\n') : '—' },
      { name: 'Notes', value: inquiry?.notes || '—' },
    ].map(sanitizeField).filter(Boolean),
    footer: {
      text: truncate(`Inquiry ID: ${inquiry?.id || 'pending'}`, DISCORD_EMBED_LIMITS.footer),
    },
    timestamp: inquiry?.created_at || new Date().toISOString(),
  };
}

export function buildArtistInterestDiscordEmbed(interest) {
  return {
    title: truncate('New Artist Interest Submission', DISCORD_EMBED_LIMITS.title),
    color: 0xff5bb8,
    fields: [
      { name: 'Name', value: interest?.name, inline: true },
      { name: 'Email', value: interest?.email, inline: true },
      { name: 'Project', value: interest?.project_name || '—', inline: true },
      { name: 'Location', value: interest?.location || '—', inline: true },
      { name: 'Practice', value: interest?.practice },
      { name: 'Open To', value: interest?.format || '—' },
      { name: 'Links', value: interest?.links || '—' },
      { name: 'Notes', value: interest?.notes || '—' },
    ].map(sanitizeField).filter(Boolean),
    footer: {
      text: truncate(`Artist interest ID: ${interest?.id || 'pending'}`, DISCORD_EMBED_LIMITS.footer),
    },
    timestamp: interest?.created_at || new Date().toISOString(),
  };
}

export function buildInviteRequestDiscordEmbed(request) {
  return {
    title: truncate('New Event Invite Request', DISCORD_EMBED_LIMITS.title),
    color: 0x4f46e5,
    fields: [
      { name: 'Name', value: request?.customer_name, inline: true },
      { name: 'Email', value: request?.customer_email, inline: true },
      { name: 'Event', value: request?.event_name || '—', inline: true },
      { name: 'Status', value: request?.status || 'pending', inline: true },
      { name: 'Action', value: `Use \`/approve request_id:${request?.id || 'REQUEST_ID'}\` or \`/deny request_id:${request?.id || 'REQUEST_ID'}\`.` },
    ].map(sanitizeField).filter(Boolean),
    footer: {
      text: truncate(`Invite Request ID: ${request?.id || 'pending'}`, DISCORD_EMBED_LIMITS.footer),
    },
    timestamp: request?.created_at || new Date().toISOString(),
  };
}

export async function sendDiscordIntakeNotification(embed, deps = {}) {
  const config = deps.getBaseConfig ? deps.getBaseConfig() : getBaseConfig();
  const channelId = config.discordIntakeChannelId;

  if (!channelId) {
    return { skipped: true, reason: 'Missing Discord intake channel configuration.' };
  }

  await postDiscordMessage(channelId, {
    embeds: [{
      title: truncate(embed?.title, DISCORD_EMBED_LIMITS.title),
      description: truncate(embed?.description, DISCORD_EMBED_LIMITS.description) || undefined,
      color: embed?.color,
      fields: Array.isArray(embed?.fields) ? embed.fields.map(sanitizeField).filter(Boolean) : [],
      footer: embed?.footer?.text
        ? { text: truncate(embed.footer.text, DISCORD_EMBED_LIMITS.footer) }
        : undefined,
      timestamp: embed?.timestamp || new Date().toISOString(),
    }],
  }, deps);

  return {
    success: true,
    channelId,
  };
}
