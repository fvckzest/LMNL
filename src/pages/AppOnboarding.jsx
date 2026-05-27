import { useEffect, useMemo, useState } from 'react';
import ContentPageShell from '../components/ContentPageShell';
import { useAppLocation, useAppNavigate } from '../components/RouterAdapter';
import { useThemeNeutralColor } from '../components/ThemeProvider';
import { COMMUNITY_APP_PATH, deriveProfileSlug, profileNeedsOnboarding } from '../lib/communityProfile';
import { readCommunityNextPath } from '../lib/communityAuth';
import { supabase } from '../lib/supabase';

function formatProvider(provider) {
  return String(provider || 'unknown').replace(/[_-]+/g, ' ').toUpperCase();
}

function normalizeOptionalUrl(value) {
  const trimmed = String(value || '').trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export default function AppOnboarding({ session, profile, provider }) {
  const neutralColor = useThemeNeutralColor();
  const location = useAppLocation();
  const navigate = useAppNavigate();
  const [displayName, setDisplayName] = useState(() => profile?.display_name || '');
  const [profileSlug, setProfileSlug] = useState(() => profile?.profile_slug || deriveProfileSlug(profile?.display_name || ''));
  const [websiteUrl, setWebsiteUrl] = useState(() => profile?.website_url || '');
  const [xUrl, setXUrl] = useState(() => profile?.x_url || '');
  const [instagramUrl, setInstagramUrl] = useState(() => profile?.instagram_url || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nextPath = useMemo(() => readCommunityNextPath(location.search), [location.search]);

  useEffect(() => {
    if (!profileNeedsOnboarding(profile)) {
      navigate(nextPath || COMMUNITY_APP_PATH, { replace: true });
    }
  }, [navigate, nextPath, profile]);

  function readOnboardingErrorMessage(updateError) {
    const message = updateError?.message || '';
    const code = updateError?.code || '';

    if (
      code === '23505'
      && (message.includes('profiles_profile_slug_key') || message.toLowerCase().includes('profile_slug'))
    ) {
      return 'That public slug is already claimed. Try another one or leave it blank for now.';
    }

    return message || 'Unable to save onboarding details.';
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedDisplayName = displayName.trim();
    const normalizedSlug = deriveProfileSlug(profileSlug || trimmedDisplayName);

    if (!trimmedDisplayName) {
      setError('Display name is required.');
      return;
    }

    if (!normalizedSlug) {
      setError('A dashboard slug is required.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: trimmedDisplayName,
        profile_slug: normalizedSlug || null,
        website_url: normalizeOptionalUrl(websiteUrl),
        x_url: normalizeOptionalUrl(xUrl),
        instagram_url: normalizeOptionalUrl(instagramUrl),
        onboarding_completed: true,
      })
      .eq('id', session.user.id);

    if (updateError) {
      setError(readOnboardingErrorMessage(updateError));
      setLoading(false);
      return;
    }

    navigate(nextPath || COMMUNITY_APP_PATH, { replace: true });
  }

  return (
    <ContentPageShell title="APP ONBOARDING" color={neutralColor} contentClassName="app-login-content">
      <div className="app-login-layout theme-shell-section">
        <div className="app-onboarding-panel theme-panel theme-panel-stack">
          <div className="app-onboarding-header theme-copy-stack">
            <p className="app-login-kicker theme-kicker">LMNL Community</p>
            <h2 className="app-login-title theme-title-xl">Finish your LMNL identity.</h2>
            <p className="app-login-copy theme-body-copy">
              We use provider login for session access, but LMNL keeps its own profile layer. Confirm the
              name you want attached to future attendance, collection history, and access.
            </p>
          </div>

          <div className="app-onboarding-context theme-context-block">
            <p>Connected through {formatProvider(provider)}.</p>
            <p>{session?.user?.email || 'No email returned from provider.'}</p>
          </div>

          <form className="app-onboarding-form theme-form" onSubmit={handleSubmit}>
            <label className="theme-field">
              <span className="theme-field-label">Display Name</span>
              <input
                className="theme-input"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="How LMNL should know you"
                autoComplete="nickname"
                maxLength={80}
                required
              />
            </label>

            <label className="theme-field">
              <span className="theme-field-label">Dashboard Slug</span>
              <input
                className="theme-input"
                type="text"
                value={profileSlug}
                onChange={(event) => setProfileSlug(deriveProfileSlug(event.target.value))}
                placeholder="lmnl-member-node"
                autoComplete="off"
                maxLength={40}
                required
              />
            </label>

            <div className="app-onboarding-links theme-form-grid theme-form-grid--three">
              <label className="theme-field">
                <span className="theme-field-label">Website</span>
                <input
                  className="theme-input"
                  type="text"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="your-site.com"
                  autoComplete="url"
                  maxLength={200}
                />
              </label>

              <label className="theme-field">
                <span className="theme-field-label">X</span>
                <input
                  className="theme-input"
                  type="text"
                  value={xUrl}
                  onChange={(event) => setXUrl(event.target.value)}
                  placeholder="x.com/yourname"
                  autoComplete="url"
                  maxLength={200}
                />
              </label>

              <label className="theme-field">
                <span className="theme-field-label">Instagram</span>
                <input
                  className="theme-input"
                  type="text"
                  value={instagramUrl}
                  onChange={(event) => setInstagramUrl(event.target.value)}
                  placeholder="instagram.com/yourname"
                  autoComplete="url"
                  maxLength={200}
                />
              </label>
            </div>

            {error ? <p className="app-login-error">{error.toUpperCase()}</p> : null}

            <div className="theme-action-row">
              <button type="submit" className="app-login-button theme-button" disabled={loading}>
                {loading ? 'SAVING PROFILE...' : 'COMPLETE ONBOARDING'}
              </button>
            </div>
          </form>

          <div className="app-login-note">
            <p>Your dashboard path will use this slug: <code>/dashboard/{profileSlug || 'your-slug'}</code></p>
            <p>Attendance history, proof, and overlap all resolve through this LMNL-owned identity layer.</p>
          </div>
        </div>
      </div>
    </ContentPageShell>
  );
}
