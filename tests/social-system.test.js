import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOCIAL_SYSTEM_PHASES,
  SOCIAL_SYSTEM_PRIMITIVES,
  buildCommunityDirectoryBridge,
  getSocialSystemConfig,
  isSocialSystemEnabled,
  shouldExposeSocialPreviewRoutes,
} from '../src/lib/socialSystem.js';

test('social system stays disabled by default', () => {
  const config = getSocialSystemConfig({});

  assert.equal(config.enabled, false);
  assert.equal(config.exposePreviewRoutes, false);
  assert.equal(config.phase, 'foundation');
  assert.equal(config.currentPhase.id, 'foundation');
  assert.equal(isSocialSystemEnabled(config), false);
  assert.equal(shouldExposeSocialPreviewRoutes(config), false);
});

test('social system preview routes require both the main flag and preview flag', () => {
  const disabledConfig = getSocialSystemConfig({
    NEXT_PUBLIC_SOCIAL_SYSTEM_ENABLED: 'false',
    NEXT_PUBLIC_SOCIAL_SYSTEM_PREVIEW_ROUTES: 'true',
    NEXT_PUBLIC_SOCIAL_SYSTEM_PHASE: 'identity',
  });

  assert.equal(shouldExposeSocialPreviewRoutes(disabledConfig), false);

  const enabledConfig = getSocialSystemConfig({
    NEXT_PUBLIC_SOCIAL_SYSTEM_ENABLED: 'true',
    NEXT_PUBLIC_SOCIAL_SYSTEM_PREVIEW_ROUTES: 'true',
    NEXT_PUBLIC_SOCIAL_SYSTEM_PHASE: 'identity',
  });

  assert.equal(enabledConfig.currentPhase.id, 'identity');
  assert.equal(shouldExposeSocialPreviewRoutes(enabledConfig), true);
});

test('social system primitives and phases preserve roadmap foundations', () => {
  assert.ok(SOCIAL_SYSTEM_PRIMITIVES.includes('attendance'));
  assert.ok(SOCIAL_SYSTEM_PRIMITIVES.includes('link'));
  assert.equal(SOCIAL_SYSTEM_PHASES[0].id, 'foundation');
  assert.equal(SOCIAL_SYSTEM_PHASES.at(-1).id, 'provenance');
});

test('community directory bridge builds a deduplicated read-only member summary', () => {
  const directory = buildCommunityDirectoryBridge({
    events: [
      {
        name: 'Genesis',
        metadata: {
          performers: 'Avery, Blake',
          artists: 'Casey',
        },
      },
      {
        name: 'Bloom',
        metadata: {
          performers: 'Avery',
        },
      },
    ],
    credits: [
      { name: 'Avery', role: 'performer', event_name: 'Genesis', link: 'https://example.com/avery' },
      { name: 'Casey', role: 'artist', event_name: 'Bloom', link: 'https://example.com/casey' },
      { name: 'Drew', role: 'host', event_name: 'Bloom' },
    ],
  });

  assert.equal(directory.totalUnique, 4);
  assert.equal(directory.performers.length, 2);
  assert.equal(directory.artists.length, 2);
  assert.deepEqual(
    directory.members.find((member) => member.name === 'Avery'),
    {
      name: 'Avery',
      role: 'performer',
      event: 'Genesis, Bloom',
      events: ['Genesis', 'Bloom'],
      link: 'https://example.com/avery',
      links: ['https://example.com/avery'],
    },
  );
  assert.equal(
    directory.members.find((member) => member.name === 'Drew').role,
    'artist',
  );
});
