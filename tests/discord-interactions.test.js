import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleDeferredDiscordInteractionCompletion } from '../api/discord-interactions.js';

test('deferred Discord completion is scheduled without waiting for approval work', async () => {
  let releaseCompletion;
  let completed = false;
  let scheduledTask = null;

  const task = scheduleDeferredDiscordInteractionCompletion(
    {
      waitUntil: (promise) => {
        scheduledTask = promise;
      },
    },
    {
      type: 2,
      data: { name: 'approve' },
    },
    {
      completeDeferredDiscordInteraction: async () => {
        await new Promise((resolve) => {
          releaseCompletion = resolve;
        });
        completed = true;
      },
    },
  );

  assert.equal(scheduledTask, task);
  assert.equal(completed, false);

  await Promise.resolve();
  assert.equal(completed, false);

  releaseCompletion();
  await task;
  assert.equal(completed, true);
});
