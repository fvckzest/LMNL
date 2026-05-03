import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommunityAuthRedirectTo, sanitizeCommunityNextPath } from '../src/lib/communityAuth.js';
import {
  COMMUNITY_ONBOARDING_PATH,
  createUserIdentityPayload,
  deriveCommunityDisplayName,
  deriveProfileSlug,
  profileNeedsOnboarding,
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
          id: 'provider-abc',
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
