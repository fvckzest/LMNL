import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import { readCommunityProvider } from '../lib/communityProfile';
import { supabase } from '../lib/supabase';
import './AppLogin.css';

export default function AppHome({ session, profile }) {
  const navigate = useNavigate();
  const provider = useMemo(() => readCommunityProvider(session), [session]);
  const email = session?.user?.email || 'No email returned';
  const displayName = profile?.display_name || 'Profile name pending';
  const profileSlug = profile?.profile_slug || 'Not set yet';

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/app/login', { replace: true });
  }

  return (
    <ContentPageShell title="APP" color="#00c2ff" contentClassName="app-login-content">
      <div className="app-login-layout theme-shell-section">
        <div className="app-login-panel theme-panel">
          <p className="app-login-kicker">Community Session Active</p>
          <h2 className="app-login-title">Your community profile is live.</h2>
          <p className="app-login-copy">
            Phase 1 community auth is now establishing LMNL-owned identity on top of the session shell.
            Admin authorization stays separate while the app gains a stable profile layer for the next buildout.
          </p>

          <div className="app-login-note">
            <p>Display name: {displayName}</p>
            <p>Profile slug: {profileSlug}</p>
            <p>Signed in with: {String(provider).toUpperCase()}</p>
            <p>Identity: {email}</p>
          </div>

          <div className="app-login-actions">
            <button type="button" className="app-login-button theme-button" onClick={handleSignOut}>
              SIGN OUT
            </button>
          </div>
        </div>
      </div>
    </ContentPageShell>
  );
}
