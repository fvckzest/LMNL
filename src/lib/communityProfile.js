import { buildCommunityOnboardingPath } from './communityAuth.js';

export const COMMUNITY_APP_PATH = '/app';
export const COMMUNITY_ONBOARDING_PATH = '/app/onboarding';
export const COMMUNITY_DASHBOARD_BASE_PATH = '/dashboard';
export const COMMUNITY_AUTH_PROVIDERS = ['google', 'discord', 'apple'];

function readUserMetadata(user) {
  return user?.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata
    : {};
}

function readIdentityData(identity) {
  return identity?.identity_data && typeof identity.identity_data === 'object'
    ? identity.identity_data
    : {};
}

function readUserIdentities(user) {
  return Array.isArray(user?.identities) ? user.identities : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeProvider(value) {
  return normalizeString(value).toLowerCase();
}

export function readCommunityIdentity(session) {
  const user = session?.user;
  const identities = readUserIdentities(user);
  const providerHint = normalizeProvider(user?.app_metadata?.provider);

  if (!identities.length) {
    return null;
  }

  if (!providerHint) {
    return identities[0];
  }

  return (
    identities.find((identity) => normalizeProvider(identity?.provider) === providerHint)
    || identities[0]
  );
}

export function readCommunityProvider(session) {
  return normalizeProvider(
    session?.user?.app_metadata?.provider || readCommunityIdentity(session)?.provider || 'unknown',
  ) || 'unknown';
}

export function isSupportedCommunityProvider(provider) {
  return COMMUNITY_AUTH_PROVIDERS.includes(normalizeProvider(provider));
}

function hasCommunityProviderSessionSignal(session, provider) {
  const providers = Array.isArray(session?.user?.app_metadata?.providers)
    ? session.user.app_metadata.providers.map(normalizeProvider)
    : [];

  return providers.includes(provider) || normalizeProvider(session?.user?.app_metadata?.provider) === provider;
}

export function isEligibleCommunitySession(session) {
  const provider = readCommunityProvider(session);
  const identity = readCommunityIdentity(session);

  if (!session?.user?.id) {
    return false;
  }

  if (!isSupportedCommunityProvider(provider)) {
    return false;
  }

  if (identity) {
    return true;
  }

  return hasCommunityProviderSessionSignal(session, provider);
}

export function deriveCommunityDisplayName(user, identity = null) {
  const metadata = readUserMetadata(user);
  const identityData = readIdentityData(identity);
  const candidates = [
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    metadata.user_name,
    metadata.preferred_username,
    metadata.username,
    metadata.global_name,
    identityData.display_name,
    identityData.full_name,
    identityData.name,
    identityData.global_name,
    identityData.user_name,
    identityData.preferred_username,
    identityData.username,
    `${normalizeString(metadata.given_name)} ${normalizeString(metadata.family_name)}`.trim(),
    `${normalizeString(identityData.given_name)} ${normalizeString(identityData.family_name)}`.trim(),
  ];

  return candidates.find((candidate) => normalizeString(candidate))?.trim() || '';
}

export function deriveCommunityAvatarUrl(user, identity = null) {
  const metadata = readUserMetadata(user);
  const identityData = readIdentityData(identity);
  const candidates = [
    metadata.avatar_url,
    metadata.picture,
    identityData.avatar_url,
    identityData.picture,
  ];

  return candidates.find((candidate) => normalizeString(candidate))?.trim() || '';
}

export function deriveProfileSlug(value) {
  const slug = normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40);

  return slug.replace(/-+$/g, '');
}

export function buildCommunityDashboardPath(profileSlug) {
  const slug = deriveProfileSlug(profileSlug);
  return slug ? `${COMMUNITY_DASHBOARD_BASE_PATH}/${slug}` : COMMUNITY_APP_PATH;
}

export function profileNeedsOnboarding(profile) {
  if (!profile) {
    return true;
  }

  if (!normalizeString(profile.display_name)) {
    return true;
  }

  if (!normalizeString(profile.profile_slug)) {
    return true;
  }

  return profile.onboarding_completed !== true;
}

export function resolveCommunityDestination(profile, nextPath = COMMUNITY_APP_PATH) {
  if (profileNeedsOnboarding(profile)) {
    return buildCommunityOnboardingPath(nextPath);
  }

  if (nextPath && nextPath !== COMMUNITY_APP_PATH) {
    return nextPath;
  }

  return buildCommunityDashboardPath(profile?.profile_slug);
}

export function createUserIdentityPayload(session) {
  const user = session?.user;
  const identity = readCommunityIdentity(session) || {};
  const identityData = readIdentityData(identity);
  const providerUserId = normalizeString(
    identity.provider_id
    || identityData.sub
    || identityData.id
    || identityData.user_id
    || identity.identity_id
    || identity.id,
  ) || null;

  return {
    user_id: user?.id,
    provider: readCommunityProvider(session),
    provider_user_id: providerUserId,
    provider_email: normalizeString(identityData.email || user?.email) || null,
  };
}

function isDuplicateConstraintError(error, constraintName) {
  const message = normalizeString(error?.message).toLowerCase();
  const code = normalizeString(error?.code);

  return code === '23505' && message.includes(String(constraintName).toLowerCase());
}

export async function ensureCommunityProfile({ supabaseClient, session }) {
  const user = session?.user;

  if (!supabaseClient?.from) {
    throw new Error('Community profile bootstrap is unavailable.');
  }

  if (!user?.id) {
    throw new Error('A signed-in community user is required.');
  }

  if (!isEligibleCommunitySession(session)) {
    throw new Error('This session is not eligible for community app access. Sign out and use community sign-in.');
  }

  const identity = readCommunityIdentity(session);
  const bootstrapDisplayName = deriveCommunityDisplayName(user, identity);
  const bootstrapAvatarUrl = deriveCommunityAvatarUrl(user, identity);

  const { data: existingProfile, error: profileReadError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileReadError) {
    throw new Error(profileReadError.message || 'Unable to read community profile.');
  }

  let profile = existingProfile;

  if (!profile) {
    const insertPayload = {
      id: user.id,
      display_name: bootstrapDisplayName || null,
      avatar_url: bootstrapAvatarUrl || null,
      visibility: 'private',
      onboarding_completed: false,
    };

    const { data: insertedProfile, error: insertError } = await supabaseClient
      .from('profiles')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      if (isDuplicateConstraintError(insertError, 'profiles_pkey')) {
        const { data: recoveredProfile, error: recoveredProfileError } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (recoveredProfileError) {
          throw new Error(recoveredProfileError.message || 'Unable to recover community profile.');
        }

        profile = recoveredProfile;
      } else {
        throw new Error(insertError.message || 'Unable to create community profile.');
      }
    } else {
      profile = insertedProfile;
    }
  } else {
    const updates = {};

    if (!normalizeString(profile.display_name) && bootstrapDisplayName) {
      updates.display_name = bootstrapDisplayName;
    }

    if (!normalizeString(profile.avatar_url) && bootstrapAvatarUrl) {
      updates.avatar_url = bootstrapAvatarUrl;
    }

    if (Object.keys(updates).length > 0) {
      const { data: updatedProfile, error: updateError } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('*')
        .single();

      if (updateError) {
        throw new Error(updateError.message || 'Unable to refresh community profile.');
      }

      profile = updatedProfile;
    }
  }

  const identityPayload = createUserIdentityPayload(session);

  if (identityPayload.provider && identityPayload.user_id) {
    const { data: existingIdentity, error: identityReadError } = await supabaseClient
      .from('user_identities')
      .select('id, provider_email, provider_user_id')
      .eq('user_id', identityPayload.user_id)
      .eq('provider', identityPayload.provider)
      .maybeSingle();

    if (identityReadError) {
      throw new Error(identityReadError.message || 'Unable to read user identity.');
    }

    if (!existingIdentity) {
      const { error: identityInsertError } = await supabaseClient
        .from('user_identities')
        .insert(identityPayload);

      if (identityInsertError) {
        if (!isDuplicateConstraintError(identityInsertError, 'user_identities_user_provider_key')) {
          throw new Error(identityInsertError.message || 'Unable to record user identity.');
        }
      }
    } else {
      const identityUpdates = {};

      if (!normalizeString(existingIdentity.provider_email) && identityPayload.provider_email) {
        identityUpdates.provider_email = identityPayload.provider_email;
      }

      if (!normalizeString(existingIdentity.provider_user_id) && identityPayload.provider_user_id) {
        identityUpdates.provider_user_id = identityPayload.provider_user_id;
      }

      if (Object.keys(identityUpdates).length > 0) {
        const { error: identityUpdateError } = await supabaseClient
          .from('user_identities')
          .update(identityUpdates)
          .eq('id', existingIdentity.id);

        if (identityUpdateError) {
          throw new Error(identityUpdateError.message || 'Unable to update user identity.');
        }
      }
    }
  }

  return {
    profile,
    needsOnboarding: profileNeedsOnboarding(profile),
    provider: readCommunityProvider(session),
  };
}
