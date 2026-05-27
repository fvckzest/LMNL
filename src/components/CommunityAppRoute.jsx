import { cloneElement, useEffect, useState } from 'react';
import ContentPageShell from './ContentPageShell';
import RouteStatusScreen from './RouteStatusScreen';
import { useThemeNeutralColor } from './ThemeProvider';
import { AppNavigate, useAppLocation, useAppNavigate } from './RouterAdapter';
import {
  buildCommunityLoginPath,
  buildCommunityOnboardingPath,
  readCommunityNextPath,
  sanitizeCommunityNextPath,
} from '../lib/communityAuth';
import {
  ensureCommunityProfile,
  profileNeedsOnboarding,
} from '../lib/communityProfile';

function RouteGateFallback({ message = 'VERIFYING ACCESS...' }) {
  return <RouteStatusScreen message={message} />;
}

function CommunityRouteError({ message, nextPath }) {
  const neutralColor = useThemeNeutralColor();
  const navigate = useAppNavigate();
  const [busy, setBusy] = useState(false);

  async function handleResetSession() {
    setBusy(true);

    try {
      const { supabase } = await import('../lib/supabase');
      await supabase.auth.signOut();
    } finally {
      navigate(buildCommunityLoginPath(nextPath), { replace: true });
    }
  }

  return (
    <ContentPageShell title="APP ACCESS" color={neutralColor} contentClassName="app-login-content">
      <div className="app-login-layout theme-shell-section">
        <div className="app-login-panel theme-panel theme-panel-stack">
          <p className="app-login-kicker theme-kicker">LMNL Community</p>
          <h2 className="app-login-title theme-title-xl">Community profile setup hit a blocker.</h2>
          <p className="app-login-copy theme-body-copy">{message || 'Unable to prepare your community profile.'}</p>

          <div className="app-login-actions">
            <button
              type="button"
              className="app-login-button theme-button"
              disabled={busy}
              onClick={handleResetSession}
            >
              {busy ? 'RESETTING SESSION...' : 'SIGN OUT AND TRY AGAIN'}
            </button>
            <button
              type="button"
              className="app-login-button theme-button"
              disabled={busy}
              onClick={() => navigate('/', { replace: true })}
            >
              BACK TO LMNL HOME
            </button>
          </div>
        </div>
      </div>
    </ContentPageShell>
  );
}

export default function CommunityAppRoute({ children, session, allowIncomplete = false }) {
  const location = useAppLocation();
  const [state, setState] = useState({
    status: session ? 'checking' : 'idle',
    profile: null,
    provider: 'unknown',
    error: '',
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrapCommunityProfile() {
      if (!session) {
        setState({
          status: 'idle',
          profile: null,
          provider: 'unknown',
          error: '',
        });
        return;
      }

      setState((current) => ({
        ...current,
        status: 'checking',
        error: '',
      }));

      const { supabase } = await import('../lib/supabase');

      try {
        const result = await ensureCommunityProfile({
          supabaseClient: supabase,
          session,
        });

        if (!cancelled) {
          setState({
            status: 'ready',
            profile: result.profile,
            provider: result.provider,
            error: '',
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            profile: null,
            provider: 'unknown',
            error: error.message || 'Unable to prepare the community profile.',
          });
        }
      }
    }

    bootstrapCommunityProfile();

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (session === undefined) return <RouteGateFallback />;

  if (!session) {
    const next = sanitizeCommunityNextPath(`${location.pathname}${location.search}${location.hash}`);
    return <AppNavigate to={buildCommunityLoginPath(next)} replace />;
  }

  if (state.status === 'checking' || state.status === 'idle') {
    return <RouteGateFallback message="PREPARING PROFILE..." />;
  }

  if (state.status === 'error') {
    const next = sanitizeCommunityNextPath(`${location.pathname}${location.search}${location.hash}`);
    return <CommunityRouteError message={state.error} nextPath={next} />;
  }

  const needsOnboarding = profileNeedsOnboarding(state.profile);

  if (!allowIncomplete && needsOnboarding) {
    const next = sanitizeCommunityNextPath(`${location.pathname}${location.search}${location.hash}`);
    return <AppNavigate to={buildCommunityOnboardingPath(next)} replace />;
  }

  if (allowIncomplete && !needsOnboarding) {
    return <AppNavigate to={readCommunityNextPath(location.search)} replace />;
  }

  return cloneElement(children, {
    profile: state.profile,
    provider: state.provider,
    session,
  });
}
