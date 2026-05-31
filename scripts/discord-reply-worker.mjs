import { getBaseConfig } from '../api/_lib/env.js';
import { handleDiscordInviteRequestReply } from '../api/_lib/services/discord.js';

const DISCORD_API_BASE_URL = 'https://discord.com/api/v10';
const DISCORD_GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';
const GATEWAY_OPS = {
  dispatch: 0,
  heartbeat: 1,
  identify: 2,
  hello: 10,
  heartbeatAck: 11,
};
const INTENTS = 1 | 512 | 32768;

const { discordBotToken } = getBaseConfig();

if (!discordBotToken) {
  throw new Error('DISCORD_BOT_TOKEN is required to run the Discord reply worker.');
}

if (typeof WebSocket !== 'function') {
  throw new Error('This Node runtime does not provide WebSocket. Run the worker with Node 22 or newer.');
}

let socket = null;
let lastSequence = null;
let heartbeatTimer = null;
let reconnectTimer = null;

function clearHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function send(payload) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

async function fetchDiscordMessage(channelId, messageId) {
  if (!channelId || !messageId) return null;

  const response = await fetch(
    `${DISCORD_API_BASE_URL}/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}`,
    {
      headers: {
        Authorization: `Bot ${discordBotToken}`,
      },
    },
  );

  if (!response.ok) {
    console.warn(`[discord-reply-worker] unable to load referenced message ${messageId}: ${response.status}`);
    return null;
  }

  return response.json();
}

async function handleMessageCreate(message) {
  if (message?.author?.bot) return;
  if (!message?.message_reference?.message_id && !message?.referenced_message) return;

  const referencedMessage = message.referenced_message
    || await fetchDiscordMessage(message.message_reference.channel_id || message.channel_id, message.message_reference.message_id);

  try {
    const result = await handleDiscordInviteRequestReply(message, { referencedMessage });
    if (result?.success) {
      console.log(`[discord-reply-worker] ${result.action} handled for ${result.requestId}`);
    }
  } catch (error) {
    console.error('[discord-reply-worker] failed to handle invite reply', error);
  }
}

function scheduleReconnect() {
  clearHeartbeat();
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 5000);
}

function connect() {
  socket = new WebSocket(DISCORD_GATEWAY_URL);

  socket.addEventListener('open', () => {
    console.log('[discord-reply-worker] connected to Discord gateway');
  });

  socket.addEventListener('message', async (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    if (typeof payload.s === 'number') {
      lastSequence = payload.s;
    }

    if (payload.op === GATEWAY_OPS.hello) {
      clearHeartbeat();
      heartbeatTimer = setInterval(() => {
        send({ op: GATEWAY_OPS.heartbeat, d: lastSequence });
      }, payload.d.heartbeat_interval);

      send({
        op: GATEWAY_OPS.identify,
        d: {
          token: discordBotToken,
          intents: INTENTS,
          properties: {
            os: process.platform,
            browser: 'lmnl-discord-reply-worker',
            device: 'lmnl-discord-reply-worker',
          },
        },
      });
      return;
    }

    if (payload.op !== GATEWAY_OPS.dispatch) return;

    if (payload.t === 'READY') {
      console.log(`[discord-reply-worker] signed in as ${payload.d?.user?.username || 'LMNL bot'}`);
    }

    if (payload.t === 'MESSAGE_CREATE') {
      await handleMessageCreate(payload.d);
    }
  });

  socket.addEventListener('close', scheduleReconnect);
  socket.addEventListener('error', (error) => {
    console.error('[discord-reply-worker] gateway error', error);
    socket.close();
  });
}

connect();
