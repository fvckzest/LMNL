import crypto from 'crypto';
import { getBaseConfig } from '../env.js';
import { AppError, asAppError } from '../errors.js';
import { getLatestEventByName } from '../repositories/events.js';
import { getRequestById, updateRequestStatus } from '../repositories/requests.js';
import { countTicketsByEventId } from '../repositories/tickets.js';
import { approveRequestAndSendCheckout } from './approval.js';
import {
  buildArtistInterestDiscordEmbed,
  buildInviteRequestDiscordEmbed,
  buildInquiryDiscordEmbed,
  getRemainingTicketCount,
} from './discord.js';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const MANAGE_GUILD_PERMISSION = '32';
const EPHEMERAL_FLAG = 64;

export const discordCommandDefinitions = [
  {
    name: 'ping',
    description: 'Check whether the LMNL bot is responding.',
    type: 1,
  },
  {
    name: 'help',
    description: 'Show the currently available LMNL slash commands.',
    type: 1,
  },
  {
    name: 'rate',
    description: 'Rate someone with a random number.',
    type: 1,
    options: [
      {
        type: 6,
        name: 'name',
        description: 'The person to rate.',
        required: true,
      },
    ],
  },
  {
    name: 'tickets-left',
    description: 'Look up remaining tickets for an LMNL event.',
    type: 1,
    options: [
      {
        type: 3,
        name: 'event',
        description: 'The event name as it appears in LMNL admin.',
        required: true,
      },
    ],
  },
  {
    name: 'ticket',
    description: 'Look up tickets sold for an LMNL event.',
    type: 1,
    options: [
      {
        type: 3,
        name: 'event_title',
        description: 'The event title as it appears in LMNL admin.',
        required: true,
      },
    ],
  },
  {
    name: 'test-intake',
    description: 'Preview the Discord embed used for website intake submissions.',
    type: 1,
    options: [
      {
        type: 3,
        name: 'form',
        description: 'Which intake form preview to render.',
        required: true,
        choices: [
          { name: 'contact', value: 'contact' },
          { name: 'service', value: 'service' },
          { name: 'artist', value: 'artist' },
          { name: 'invite', value: 'invite' },
        ],
      },
    ],
  },
  {
    name: 'approve',
    description: 'Approve an LMNL invite request by request ID.',
    type: 1,
    default_member_permissions: MANAGE_GUILD_PERMISSION,
    dm_permission: false,
    options: [
      {
        type: 3,
        name: 'request_id',
        description: 'The invite request ID from the Discord notification.',
        required: true,
      },
    ],
  },
  {
    name: 'deny',
    description: 'Deny an LMNL invite request by request ID.',
    type: 1,
    default_member_permissions: MANAGE_GUILD_PERMISSION,
    dm_permission: false,
    options: [
      {
        type: 3,
        name: 'request_id',
        description: 'The invite request ID from the Discord notification.',
        required: true,
      },
    ],
  },
];

function toPublicKeyObject(publicKeyHex) {
  const normalized = String(publicKeyHex || '').trim();
  if (!/^[0-9a-f]{64}$/i.test(normalized)) {
    throw new AppError('Discord public key is invalid.', {
      code: 'DISCORD_PUBLIC_KEY_INVALID',
      status: 500,
      expose: true,
    });
  }

  return crypto.createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(normalized, 'hex')]),
    format: 'der',
    type: 'spki',
  });
}

function getOptionValue(interaction, optionName) {
  const options = interaction?.data?.options || [];
  const option = options.find((entry) => entry?.name === optionName);
  return option?.value;
}

function getInviteRequestIdOption(interaction) {
  return String(getOptionValue(interaction, 'request_id') || '').trim();
}

function formatRequestLabel(request, requestId) {
  const requesterName = String(request?.customer_name || '').trim();
  return requesterName || `request ${requestId}`;
}

function getOptionUserMention(interaction, optionName) {
  const userId = String(getOptionValue(interaction, optionName) || '').trim();
  if (!userId) return '';
  return `<@${userId}>`;
}

function createMessageResponse(content, ephemeral = false) {
  return {
    type: 4,
    data: {
      content,
      ...(ephemeral ? { flags: EPHEMERAL_FLAG } : {}),
    },
  };
}

function createEmbedResponse(embed, content = 'Previewing the current intake embed.', ephemeral = false) {
  return {
    type: 4,
    data: {
      content,
      embeds: [embed],
      ...(ephemeral ? { flags: EPHEMERAL_FLAG } : {}),
    },
  };
}

export function shouldDeferDiscordInteraction(interaction) {
  return interaction?.type === 2 && interaction?.data?.name === 'approve';
}

export function createDeferredDiscordResponse(ephemeral = false) {
  return {
    type: 5,
    ...(ephemeral ? { data: { flags: EPHEMERAL_FLAG } } : {}),
  };
}

async function editOriginalInteractionResponse(interaction, response, deps = {}) {
  const applicationId = interaction?.application_id || deps.applicationId || getBaseConfig().discordApplicationId;
  const interactionToken = interaction?.token;

  if (!applicationId || !interactionToken) {
    throw new AppError('Discord interaction token is missing.', {
      code: 'DISCORD_INTERACTION_TOKEN_MISSING',
      status: 500,
      expose: true,
    });
  }

  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new AppError('Fetch is unavailable in this runtime.', {
      code: 'FETCH_UNAVAILABLE',
      status: 500,
      expose: true,
    });
  }

  const apiBaseUrl = String(deps.discordApiBaseUrl || 'https://discord.com/api/v10').replace(/\/$/, '');
  const payload = {
    content: response?.data?.content || 'Done.',
  };

  if (Array.isArray(response?.data?.embeds)) {
    payload.embeds = response.data.embeds;
  }

  const discordResponse = await fetchImpl(
    `${apiBaseUrl}/webhooks/${encodeURIComponent(applicationId)}/${encodeURIComponent(interactionToken)}/messages/@original`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!discordResponse.ok) {
    throw new AppError('Discord interaction response update failed.', {
      code: 'DISCORD_INTERACTION_UPDATE_FAILED',
      status: 502,
      details: { status: discordResponse.status },
      expose: true,
    });
  }
}

export async function completeDeferredDiscordInteraction(interaction, deps = {}) {
  try {
    const response = await handleDiscordInteraction(interaction, deps);
    await editOriginalInteractionResponse(interaction, response, deps);
  } catch (error) {
    const appError = asAppError(error, 'Approval failed.');
    console.error('[discord-interactions] deferred command failed', appError);

    if (interaction?.data?.name === 'approve') {
      const requestId = getInviteRequestIdOption(interaction);
      const loadRequest = deps.getRequestById || getRequestById;
      try {
        const request = requestId ? await loadRequest(requestId) : null;
        if (request?.status === 'approved' || request?.status === 'fulfilled') {
          await editOriginalInteractionResponse(
            interaction,
            createMessageResponse(`Approved ${formatRequestLabel(request, requestId)}.`),
            deps,
          );
          return;
        }
      } catch (lookupError) {
        console.error('[discord-interactions] approved request recovery lookup failed', lookupError);
      }
    }

    const errorDetail = appError.expose ? ` ${appError.message}` : '';
    await editOriginalInteractionResponse(
      interaction,
      createMessageResponse(`Approval failed.${errorDetail} Please try again or approve from the admin dashboard.`),
      deps,
    );
  }
}

export function verifyDiscordInteractionSignature({ signature, timestamp, rawBody, publicKey }) {
  if (!signature || !timestamp || !rawBody || !publicKey) {
    return false;
  }

  const keyObject = toPublicKeyObject(publicKey);
  return crypto.verify(
    null,
    Buffer.from(`${timestamp}${rawBody}`, 'utf8'),
    keyObject,
    Buffer.from(signature, 'hex'),
  );
}

export async function handleDiscordInteraction(interaction, deps = {}) {
  if (interaction?.type === 1) {
    return { type: 1 };
  }

  if (interaction?.type !== 2) {
    return createMessageResponse('LMNL does not support that Discord interaction yet.');
  }

  const commandName = interaction?.data?.name;
  const loadEventByName = deps.getLatestEventByName || getLatestEventByName;
  const loadRemainingTicketCount = deps.getRemainingTicketCount || getRemainingTicketCount;
  const loadTicketsSoldCount = deps.countTicketsByEventId || countTicketsByEventId;
  const approveInviteRequest = deps.approveRequestAndSendCheckout || approveRequestAndSendCheckout;
  const setRequestStatus = deps.updateRequestStatus || updateRequestStatus;
  const randomImpl = deps.randomImpl || Math.random;

  if (commandName === 'ping') {
    return createMessageResponse('Pong. LMNL is online.');
  }

  if (commandName === 'help') {
    const commandList = discordCommandDefinitions
      .map((command) => `/${command.name} - ${command.description}`)
      .join('\n');
    return createMessageResponse(`Available LMNL commands:\n${commandList}`);
  }

  if (commandName === 'rate') {
    const mention = getOptionUserMention(interaction, 'name');
    if (!mention) {
      return createMessageResponse('Please choose someone to rate.');
    }

    const randomValue = Number(randomImpl());
    const score = Math.floor((Number.isFinite(randomValue) ? randomValue : 0) * 101);
    return createMessageResponse(`${mention} gets a ${score}`);
  }

  if (commandName === 'tickets-left') {
    const eventName = String(getOptionValue(interaction, 'event') || '').trim();
    if (!eventName) {
      return createMessageResponse('Please provide an event name.');
    }

    const event = await loadEventByName(eventName);
    if (!event) {
      return createMessageResponse(`No LMNL event matched "${eventName}".`);
    }

    const remainingTickets = await loadRemainingTicketCount(event, deps);
    if (typeof remainingTickets !== 'number' || Number.isNaN(remainingTickets)) {
      return createMessageResponse(`${event.name}: remaining ticket count is unavailable right now.`);
    }

    return createMessageResponse(`${event.name}: ${remainingTickets} ticket${remainingTickets === 1 ? '' : 's'} left.`);
  }

  if (commandName === 'ticket') {
    const eventTitle = String(getOptionValue(interaction, 'event_title') || '').trim();
    if (!eventTitle) {
      return createMessageResponse('Please provide an event title.');
    }

    const event = await loadEventByName(eventTitle);
    if (!event) {
      return createMessageResponse(`No LMNL event matched "${eventTitle}".`);
    }

    const ticketsSold = await loadTicketsSoldCount(event.id);
    return createMessageResponse(`${event.name}: ${ticketsSold} ticket${ticketsSold === 1 ? '' : 's'} sold.`);
  }

  if (commandName === 'approve') {
    const requestId = getInviteRequestIdOption(interaction);
    if (!requestId) {
      return createMessageResponse('Please provide an invite request ID.', true);
    }

    const result = await approveInviteRequest(requestId, deps);
    const requestLabel = formatRequestLabel(result?.request || result, requestId);
    const warning = result?.warning ? ` ${result.warning}` : '';
    return createMessageResponse(`Approved ${requestLabel}.${warning}`);
  }

  if (commandName === 'deny') {
    const requestId = getInviteRequestIdOption(interaction);
    if (!requestId) {
      return createMessageResponse('Please provide an invite request ID.', true);
    }

    const updatedRequest = await setRequestStatus(requestId, 'rejected');
    const requestLabel = formatRequestLabel(updatedRequest, requestId);
    return createMessageResponse(`Denied ${requestLabel}.`, true);
  }

  if (commandName === 'test-intake') {
    const formType = String(getOptionValue(interaction, 'form') || '').trim().toLowerCase();

    if (formType === 'contact') {
      return createEmbedResponse(buildInquiryDiscordEmbed({
        id: 'preview-contact',
        name: 'Alex Rivera',
        email: 'alex@example.com',
        notes: 'SUBJECT: Partnership inquiry\n\nInterested in collaborating on an upcoming activation.',
        selected_services: ['general'],
        created_at: '2026-05-12T19:00:00.000Z',
      }), 'Previewing the contact form intake embed.');
    }

    if (formType === 'service') {
      return createEmbedResponse(buildInquiryDiscordEmbed({
        id: 'preview-service',
        name: 'Maya Chen',
        email: 'maya@example.com',
        notes: 'Looking for creative direction, production support, and rollout planning for a launch.',
        selected_services: ['DESIGN', 'PRODUCTION', 'MARKETING'],
        created_at: '2026-05-12T19:00:00.000Z',
      }), 'Previewing the service inquiry intake embed.');
    }

    if (formType === 'artist') {
      return createEmbedResponse(buildArtistInterestDiscordEmbed({
        id: 'preview-artist',
        name: 'Nova',
        email: 'nova@example.com',
        project_name: 'Signal Bloom',
        location: 'Los Angeles',
        practice: 'Live audiovisual performance',
        format: 'Performance, screening, installation',
        links: 'https://example.com/portfolio',
        notes: 'Building a new hybrid set and looking for spaces that support immersive work.',
        created_at: '2026-05-12T19:00:00.000Z',
      }), 'Previewing the artist interest intake embed.');
    }

    if (formType === 'invite') {
      return createEmbedResponse(buildInviteRequestDiscordEmbed({
        id: 'preview-invite',
        customer_name: 'Jordan Ellis',
        customer_email: 'jordan@example.com',
        event_name: 'SPACE',
        status: 'pending',
        created_at: '2026-05-21T19:00:00.000Z',
      }), 'Previewing the event invite request intake embed.');
    }

    return createMessageResponse('Please choose one of: contact, service, artist, or invite.');
  }

  return createMessageResponse(`/${commandName} is not wired up yet.`);
}

export function getDiscordInteractionConfig() {
  const config = getBaseConfig();
  return {
    applicationId: config.discordApplicationId,
    botToken: config.discordBotToken,
    publicKey: config.discordPublicKey,
  };
}
