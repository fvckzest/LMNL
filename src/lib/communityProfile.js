export const COMMUNITY_APP_PATH = '/app';
export const COMMUNITY_ONBOARDING_PATH = '/app/onboarding';

function readUserMetadata(user) {
  return user?.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata
    : {};
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function readCommunityProvider(session) {
  return normalizeString(
    session?.user?.app_metadata?.provider || session?.user?.identities?.[0]?.provider || 'unknown',
  ) || 'unknown';
}

export function deriveCommunityDisplayName(user) {
  const metadata = readUserMetadata(user);
  const candidates = [
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    metadata.user_name,
    metadata.preferred_username,
    `${normalizeString(metadata.given_name)} ${normalizeString(metadata.family_name)}`.trim(),
  ];

  return candidates.find((candidate) => normalizeString(candidate))?.trim() || '';
}

export function deriveCommunityAvatarUrl(user) {
  const metadata = readUserMetadata(user);
  const candidates = [
    metadata.avatar_url,
    metadata.picture,
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

export function profileNeedsOnboarding(profile) {
  if (!profile) {
    return true;
  }

  if (!normalizeString(profile.display_name)) {
    return true;
  }

  return profile.onboarding_completed !== true;
}

export function resolveCommunityDestination(profile, nextPath = COMMUNITY_APP_PATH) {
  return profileNeedsOnboarding(profile) ? COMMUNITY_ONBOARDING_PATH : nextPath;
}

export function createUserIdentityPayload(session) {
  const user = session?.user;
  const identity = user?.identities?.[0] || {};

  return {
    user_id: user?.id,
    provider: readCommunityProvider(session),
    provider_user_id: normalizeString(identity.id || identity.user_id || identity.identity_id) || null,
    provider_email: normalizeString(identity.identity_data?.email || user?.email) || null,
  };
}

export async function ensureCommunityProfile({ supabaseClient, session }) {
  const user = session?.user;

  if (!supabaseClient?.from) {
    throw new Error('Community profile bootstrap is unavailable.');
  }

  if (!user?.id) {
    throw new Error('A signed-in community user is required.');
  }

  const bootstrapDisplayName = deriveCommunityDisplayName(user);
  const bootstrapAvatarUrl = deriveCommunityAvatarUrl(user);

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
      onboarding_completed: Boolean(bootstrapDisplayName),
    };

    const { data: insertedProfile, error: insertError } = await supabaseClient
      .from('profiles')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      throw new Error(insertError.message || 'Unable to create community profile.');
    }

    profile = insertedProfile;
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
        throw new Error(identityInsertError.message || 'Unable to record user identity.');
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

