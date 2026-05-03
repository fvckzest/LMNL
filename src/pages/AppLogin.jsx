import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import { sanitizeCommunityNextPath, buildCommunityAuthRedirectTo } from '../lib/communityAuth';
import { hasSupabaseCredentials, supabase } from '../lib/supabase';
import './AppLogin.css';

const PROVIDERS = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'discord', label: 'Continue with Discord' },
  { id: 'apple', label: 'Continue with Apple' },
];

export default function AppLogin({ session }) {
  const location = useLocation();
  const [activeProvider, setActiveProvider] = useState('');
  const [error, setError] = useState('');
  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return sanitizeCommunityNextPath(params.get('next'));
  }, [location.search]);

  if (session) {
    return <Navigate to={nextPath} replace />;
  }

  async function handleProviderLogin(provider) {
    if (!hasSupabaseCredentials) {
      setError('Community auth is not configured in this environment yet.');
      return;
    }

    setActiveProvider(provider);
    setError('');

    const redirectTo = buildCommunityAuthRedirectTo(window.location.origin, nextPath);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (signInError) {
      setError(signInError.message || 'Unable to start sign-in.');
      setActiveProvider('');
    }
  }

  return (
    <ContentPageShell title="APP ACCESS" color="#00c2ff" contentClassName="app-login-content">
      <div className="app-login-layout theme-shell-section">
        <div className="app-login-panel theme-panel">
          <p className="app-login-kicker">LMNL Community</p>
          <h2 className="app-login-title">Sign in without touching admin access.</h2>
          <p className="app-login-copy">
            This path is reserved for future community identity, attendance history, and collection access.
            Admin login stays separate at <code>/login</code>.
          </p>

          <div className="app-login-actions">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className="app-login-button theme-button"
                disabled={Boolean(activeProvider)}
                onClick={() => handleProviderLogin(provider.id)}
              >
                {activeProvider === provider.id ? 'CONNECTING...' : provider.label.toUpperCase()}
              </button>
            ))}
          </div>

          {error ? <p className="app-login-error">{error.toUpperCase()}</p> : null}

          <div className="app-login-note">
            <p>Current scope: separate auth shell only.</p>
            <p>Profile bootstrap and onboarding land next.</p>
          </div>
        </div>
      </div>
    </ContentPageShell>
  );
}
