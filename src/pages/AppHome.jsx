import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import { supabase } from '../lib/supabase';
import './AppLogin.css';

function readProvider(session) {
  return session?.user?.app_metadata?.provider || session?.user?.identities?.[0]?.provider || 'unknown';
}

export default function AppHome({ session, profile }) {
  const navigate = useNavigate();
  const provider = useMemo(() => readProvider(session), [session]);
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
            Community auth is now bootstrapping LMNL-owned identity on top of the session shell. This keeps
            admin authorization separate while giving Phase 1 a stable profile layer to build on.
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
