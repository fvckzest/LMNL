import { useEffect, useMemo, useState } from 'react';
import { useAppLocation, useAppNavigate } from '../components/RouterAdapter';
import ContentPageShell from '../components/ContentPageShell';
import { useThemeNeutralColor } from '../components/ThemeProvider';
import { buildCommunityLoginPath, readCommunityNextPath } from '../lib/communityAuth';
import {
  ensureCommunityProfile,
  isEligibleCommunitySession,
  resolveCommunityDestination,
} from '../lib/communityProfile';
import { hasSupabaseCredentials, supabase } from '../lib/supabase';

export default function AuthCallback({ session }) {
  const neutralColor = useThemeNeutralColor();
  const location = useAppLocation();
  const navigate = useAppNavigate();
  const [status, setStatus] = useState('working');
  const [error, setError] = useState('');
  const [hasRecoveredSession, setHasRecoveredSession] = useState(Boolean(session));
  const nextPath = useMemo(() => readCommunityNextPath(location.search), [location.search]);
  const loginPath = useMemo(() => buildCommunityLoginPath(nextPath), [nextPath]);

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      if (!hasSupabaseCredentials) {
        if (!cancelled) {
          setStatus('error');
          setError('Community auth is not configured in this environment yet.');
        }
        return;
      }

      const url = window.location.href;
      const hasCode = new URL(url).searchParams.has('code');
      let currentSession = isEligibleCommunitySession(session) ? session : null;
      let exchangeFailureMessage = '';

      if (hasCode) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
        const { data: postExchangeSessionData } = await supabase.auth.getSession();
        currentSession = postExchangeSessionData?.session || null;
        exchangeFailureMessage = exchangeError?.message || '';

        if (exchangeError) {
          if (!isEligibleCommunitySession(currentSession)) {
            if (!cancelled) {
              setHasRecoveredSession(false);
              setStatus('error');
              setError(exchangeFailureMessage || 'Unable to complete sign-in.');
            }
            return;
          }
        }
      }

      if (!currentSession) {
        const { data } = await supabase.auth.getSession();
        currentSession = isEligibleCommunitySession(data?.session) ? data.session : null;
      }

      if (!cancelled) {
        setHasRecoveredSession(isEligibleCommunitySession(currentSession));
        if (currentSession) {
          try {
            const { profile } = await ensureCommunityProfile({
              supabaseClient: supabase,
              session: currentSession,
            });

            if (!cancelled) {
              setStatus('done');
              navigate(resolveCommunityDestination(profile, nextPath), { replace: true });
            }
          } catch (profileError) {
            setStatus('error');
            setError(profileError.message || 'Unable to prepare your community profile.');
          }
        } else {
          setStatus('error');
          setError(exchangeFailureMessage || 'No community session was created. Try signing in again.');
        }
      }
    }

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate, nextPath, session]);

  async function handleRetrySignIn() {
    if (hasRecoveredSession) {
      await supabase.auth.signOut();
    }

    navigate(loginPath, { replace: true });
  }

  return (
    <ContentPageShell title="AUTH" color={neutralColor} contentClassName="app-login-content">
      <div className="app-login-layout theme-shell-section">
        <div className="app-login-panel theme-panel theme-panel-stack">
          <p className="app-login-kicker theme-kicker">LMNL Community</p>
          <h2 className="app-login-title theme-title-xl">
            {status === 'error' ? 'Sign-in could not be completed.' : 'Completing sign-in...'}
          </h2>
          <p className="app-login-copy theme-body-copy">
            {status === 'error'
              ? error
              : 'We are finishing the community session and routing you into the app shell.'}
          </p>

          {status === 'error' ? (
            <div className="app-login-actions">
              <button type="button" className="app-login-button theme-button" onClick={handleRetrySignIn}>
                {hasRecoveredSession ? 'SIGN OUT AND TRY AGAIN' : 'RETURN TO COMMUNITY SIGN-IN'}
              </button>
              <button type="button" className="app-login-button theme-button" onClick={() => navigate('/', { replace: true })}>
                BACK TO LMNL HOME
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </ContentPageShell>
  );
}
