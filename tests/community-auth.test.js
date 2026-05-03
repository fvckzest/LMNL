import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommunityAuthPreflightUrl,
  buildCommunityAuthRedirectTo,
  buildCommunityLoginPath,
  buildCommunityOnboardingPath,
  readCommunityNextPath,
  sanitizeCommunityNextPath,
} from '../src/lib/communityAuth.js';
import {
  COMMUNITY_ONBOARDING_PATH,
  createUserIdentityPayload,
  deriveCommunityDisplayName,
  deriveCommunityAvatarUrl,
  deriveProfileSlug,
  profileNeedsOnboarding,
  readCommunityIdentity,
  readCommunityProvider,
  resolveCommunityDestination,
} from '../src/lib/communityProfile.js';

test('sanitizeCommunityNextPath keeps only community app paths', () => {
  assert.equal(sanitizeCommunityNextPath('/app'), '/app');
  assert.equal(sanitizeCommunityNextPath('/app/profile?tab=1'), '/app/profile?tab=1');
  assert.equal(sanitizeCommunityNextPath('/login'), '/app');
  assert.equal(sanitizeCommunityNextPath('https://evil.example/app'), '/app');
  assert.equal(sanitizeCommunityNextPath('/app//escape'), '/app');
});

test('buildCommunityAuthRedirectTo builds a callback URL with a safe next path', () => {
  assert.equal(
    buildCommunityAuthRedirectTo('https://lmnl.art/', '/app/collection'),
    'https://lmnl.art/auth/callback?next=%2Fapp%2Fcollection',
  );

  assert.equal(
    buildCommunityAuthRedirectTo('https://lmnl.art', '/login'),
    'https://lmnl.art/auth/callback?next=%2Fapp',
  );
});

test('buildCommunityAuthPreflightUrl forces JSON auth responses for provider checks', () => {
  assert.equal(
    buildCommunityAuthPreflightUrl('https://example.supabase.co/auth/v1/authorize?provider=google'),
    'https://example.supabase.co/auth/v1/authorize?provider=google&skip_http_redirect=true',
  );
});

test('community next-path helpers preserve safe destinations through onboarding', () => {
  assert.equal(readCommunityNextPath('?next=%2Fapp%2Fcollection'), '/app/collection');
  assert.equal(buildCommunityLoginPath('/app'), '/app/login');
  assert.equal(buildCommunityLoginPath('/app/collection'), '/app/login?next=%2Fapp%2Fcollection');
  assert.equal(buildCommunityOnboardingPath('/app'), COMMUNITY_ONBOARDING_PATH);
  assert.equal(
    buildCommunityOnboardingPath('/app/collection'),
    '/app/onboarding?next=%2Fapp%2Fcollection',
  );
});

test('deriveCommunityDisplayName uses the strongest available provider metadata', () => {
  assert.equal(
    deriveCommunityDisplayName({
      user_metadata: {
        full_name: 'LMNL Member',
      },
    }),
    'LMNL Member',
  );

  assert.equal(
    deriveCommunityDisplayName({
      user_metadata: {
        given_name: 'LMNL',
        family_name: 'Builder',
      },
    }),
    'LMNL Builder',
  );

  assert.equal(
    deriveCommunityDisplayName(
      {
        user_metadata: {},
      },
      {
        identity_data: {
          global_name: 'Discord Alias',
        },
      },
    ),
    'Discord Alias',
  );
});

test('deriveCommunityAvatarUrl falls back to identity metadata when needed', () => {
  assert.equal(
    deriveCommunityAvatarUrl(
      {
        user_metadata: {},
      },
      {
        identity_data: {
          picture: 'https://cdn.lmnl.art/avatar.png',
        },
      },
    ),
    'https://cdn.lmnl.art/avatar.png',
  );
});

test('deriveProfileSlug normalizes free-form input into a safe slug', () => {
  assert.equal(deriveProfileSlug('  Future Public Node  '), 'future-public-node');
  assert.equal(deriveProfileSlug('LMNL///ART!!!'), 'lmnl-art');
});

test('profileNeedsOnboarding requires both a name and a completed flag', () => {
  assert.equal(profileNeedsOnboarding(null), true);
  assert.equal(profileNeedsOnboarding({ display_name: '', onboarding_completed: false }), true);
  assert.equal(profileNeedsOnboarding({ display_name: 'LMNL', onboarding_completed: false }), true);
  assert.equal(profileNeedsOnboarding({ display_name: 'LMNL', onboarding_completed: true }), false);
});

test('resolveCommunityDestination sends incomplete users into onboarding', () => {
  assert.equal(
    resolveCommunityDestination({ display_name: null, onboarding_completed: false }, '/app'),
    COMMUNITY_ONBOARDING_PATH,
  );

  assert.equal(
    resolveCommunityDestination({ display_name: 'LMNL', onboarding_completed: true }, '/app'),
    '/app',
  );
});

test('createUserIdentityPayload extracts normalized provider identity details', () => {
  const payload = createUserIdentityPayload({
    user: {
      id: 'user-123',
      email: 'hello@lmnl.art',
      app_metadata: {
        provider: 'google',
      },
      identities: [
        {
          provider_id: 'provider-abc',
          id: 'identity-row-1',
          identity_data: {
            email: 'hello@lmnl.art',
          },
        },
      ],
    },
  });

  assert.deepEqual(payload, {
    user_id: 'user-123',
    provider: 'google',
    provider_user_id: 'provider-abc',
    provider_email: 'hello@lmnl.art',
  });
});

test('createUserIdentityPayload prefers provider metadata over the Supabase identity row id', () => {
  const payload = createUserIdentityPayload({
    user: {
      id: 'user-456',
      app_metadata: {
        provider: 'google',
      },
      identities: [
        {
          provider: 'google',
          id: 'identity-row-2',
          identity_data: {
            sub: 'google-subject-42',
          },
        },
      ],
    },
  });

  assert.equal(payload.provider_user_id, 'google-subject-42');
});

test('provider selection prefers the identity matching the active provider hint', () => {
  const session = {
    user: {
      app_metadata: {
        provider: 'discord',
      },
      identities: [
        {
          provider: 'google',
          id: 'google-id',
          identity_data: {
            email: 'google@lmnl.art',
            full_name: 'Google User',
          },
        },
        {
          provider: 'discord',
          identity_data: {
            sub: 'discord-sub',
            email: 'discord@lmnl.art',
            global_name: 'Discord User',
            picture: 'https://cdn.lmnl.art/discord.png',
          },
        },
      ],
    },
  };

  assert.equal(readCommunityProvider(session), 'discord');
  assert.equal(readCommunityIdentity(session)?.provider, 'discord');
  assert.equal(deriveCommunityDisplayName(session.user, readCommunityIdentity(session)), 'Discord User');
  assert.equal(deriveCommunityAvatarUrl(session.user, readCommunityIdentity(session)), 'https://cdn.lmnl.art/discord.png');
  assert.deepEqual(createUserIdentityPayload(session), {
    user_id: undefined,
    provider: 'discord',
    provider_user_id: 'discord-sub',
    provider_email: 'discord@lmnl.art',
  });
});

test('apple identity payload falls back to subject and persisted email', () => {
  const payload = createUserIdentityPayload({
    user: {
      id: 'apple-user',
      email: 'relay@privaterelay.appleid.com',
      app_metadata: {
        provider: 'apple',
      },
      identities: [
        {
          provider: 'apple',
          identity_data: {
            sub: 'apple-subject-id',
          },
        },
      ],
    },
  });

  assert.deepEqual(payload, {
    user_id: 'apple-user',
    provider: 'apple',
    provider_user_id: 'apple-subject-id',
    provider_email: 'relay@privaterelay.appleid.com',
  });
});
