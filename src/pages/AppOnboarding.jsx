import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import { COMMUNITY_APP_PATH, deriveProfileSlug, profileNeedsOnboarding } from '../lib/communityProfile';
import { supabase } from '../lib/supabase';
import './AppOnboarding.css';

function formatProvider(provider) {
  return String(provider || 'unknown').replace(/[_-]+/g, ' ').toUpperCase();
}

export default function AppOnboarding({ session, profile, provider }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(() => profile?.display_name || '');
  const [profileSlug, setProfileSlug] = useState(() => profile?.profile_slug || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profileNeedsOnboarding(profile)) {
      navigate(COMMUNITY_APP_PATH, { replace: true });
    }
  }, [navigate, profile]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedDisplayName = displayName.trim();
    const normalizedSlug = deriveProfileSlug(profileSlug);

    if (!trimmedDisplayName) {
      setError('Display name is required.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: trimmedDisplayName,
        profile_slug: normalizedSlug || null,
        onboarding_completed: true,
      })
      .eq('id', session.user.id);

    if (updateError) {
      setError(updateError.message || 'Unable to save onboarding details.');
      setLoading(false);
      return;
    }

    navigate(COMMUNITY_APP_PATH, { replace: true });
  }

  return (
    <ContentPageShell title="APP ONBOARDING" color="#00c2ff" contentClassName="app-login-content">
      <div className="app-login-layout theme-shell-section">
        <div className="app-onboarding-panel theme-panel">
          <div className="app-onboarding-header">
            <p className="app-login-kicker">LMNL Community</p>
            <h2 className="app-login-title">Finish your LMNL identity.</h2>
            <p className="app-login-copy">
              We use provider login for session access, but LMNL keeps its own profile layer. Confirm the
              name you want attached to future attendance, collection history, and access.
            </p>
          </div>

          <div className="app-onboarding-context">
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
              <span className="theme-field-label">Public Slug (Optional)</span>
              <input
                className="theme-input"
                type="text"
                value={profileSlug}
                onChange={(event) => setProfileSlug(deriveProfileSlug(event.target.value))}
                placeholder="future-public-node"
                autoComplete="off"
                maxLength={40}
              />
            </label>

            {error ? <p className="app-login-error">{error.toUpperCase()}</p> : null}

            <div className="theme-action-row">
              <button type="submit" className="app-login-button theme-button" disabled={loading}>
                {loading ? 'SAVING PROFILE...' : 'COMPLETE ONBOARDING'}
              </button>
            </div>
          </form>

          <div className="app-login-note">
            <p>Current Phase 1 scope: name confirmation and profile bootstrap.</p>
            <p>Attendance history and collectible surfaces open up after this foundation lands.</p>
          </div>
        </div>
      </div>
    </ContentPageShell>
  );
}
