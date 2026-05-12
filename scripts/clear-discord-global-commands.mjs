import { loadLocalEnvFiles } from './_load-env.mjs';
import { getBaseConfig } from '../api/_lib/env.js';

loadLocalEnvFiles();

const { discordApplicationId, discordBotToken } = getBaseConfig();

if (!discordApplicationId) {
  throw new Error('Missing DISCORD_APPLICATION_ID.');
}

if (!discordBotToken) {
  throw new Error('Missing DISCORD_BOT_TOKEN.');
}

const response = await fetch(`https://discord.com/api/v10/applications/${discordApplicationId}/commands`, {
  method: 'PUT',
  headers: {
    Authorization: `Bot ${discordBotToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify([]),
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Discord global command cleanup failed: ${response.status} ${body}`);
}

const payload = await response.json();
console.log(`Global commands now set to ${payload.length}.`);
