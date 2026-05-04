import crypto from 'crypto';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getLatestEventByName } from '../repositories/events.js';
import { countTicketsByEventId } from '../repositories/tickets.js';
import { getRemainingTicketCount } from './discord.js';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const EPHEMERAL_FLAG = 1 << 6;

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
      //flags: EPHEMERAL_FLAG,
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
