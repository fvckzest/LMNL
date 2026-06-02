import { withHandler, allowMethods, readRawBody, sendJson, AppError } from './_lib/http.js';
import {
  completeDeferredDiscordInteraction,
  createDeferredDiscordResponse,
  getDiscordInteractionConfig,
  handleDiscordInteraction,
  shouldDeferDiscordInteraction,
  verifyDiscordInteractionSignature,
} from './_lib/services/discord-commands.js';

export function scheduleDeferredDiscordInteractionCompletion(req, interaction, deps = {}) {
  const completeInteraction = deps.completeDeferredDiscordInteraction || completeDeferredDiscordInteraction;
  const task = Promise.resolve()
    .then(() => completeInteraction(interaction))
    .catch((error) => {
      console.error('[discord-interactions] deferred completion task failed', error);
    });

  if (typeof req?.waitUntil === 'function') {
    req.waitUntil(task);
  } else if (typeof globalThis.waitUntil === 'function') {
    globalThis.waitUntil(task);
  }

  return task;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  allowMethods(req, ['GET', 'POST']);

  if (req.method === 'GET') {
    return sendJson(res, 200, {
      success: true,
      data: {
        service: 'discord-interactions',
        status: 'ready',
      },
    });
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const { publicKey } = getDiscordInteractionConfig();

  const isValid = verifyDiscordInteractionSignature({
    signature,
    timestamp,
    rawBody,
    publicKey,
  });

  if (!isValid) {
    throw new AppError('Invalid Discord interaction signature.', {
      code: 'DISCORD_SIGNATURE_INVALID',
      status: 401,
      expose: true,
    });
  }

  let interaction;
  try {
    interaction = JSON.parse(rawBody || '{}');
  } catch (error) {
    throw new AppError('Invalid Discord interaction payload.', {
      code: 'DISCORD_PAYLOAD_INVALID',
      status: 400,
      expose: true,
      details: error,
    });
  }

  if (shouldDeferDiscordInteraction(interaction)) {
    sendJson(res, 200, createDeferredDiscordResponse());
    scheduleDeferredDiscordInteractionCompletion(req, interaction);
    return;
  }

  const response = await handleDiscordInteraction(interaction);
  return sendJson(res, 200, response);
}

export default withHandler(handler, { context: 'discord-interactions' });
