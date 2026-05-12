import crypto from 'crypto';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getLatestEventByName } from '../repositories/events.js';
import { countTicketsByEventId } from '../repositories/tickets.js';
import {
  buildArtistInterestDiscordEmbed,
  buildInquiryDiscordEmbed,
  getRemainingTicketCount,
} from './discord.js';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

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
        ],
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

function createMessageResponse(content) {
  return {
    type: 4,
    data: {
      content,
    },
  };
}

function createEmbedResponse(embed, content = 'Previewing the current intake embed.', ephemeral = false) {
  return {
    type: 4,
    data: {
      content,
      embeds: [embed],
      ...(ephemeral ? { flags: 64 } : {}),
    },
  };
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

  if (commandName === 'ping') {
    return createMessageResponse('Pong. LMNL is online.');
  }

  if (commandName === 'help') {
    const commandList = discordCommandDefinitions
      .map((command) => `/${command.name} - ${command.description}`)
      .join('\n');
    return createMessageResponse(`Available LMNL commands:\n${commandList}`);
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

    return createMessageResponse('Please choose one of: contact, service, or artist.');
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
