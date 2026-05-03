import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import { sanitizeCommunityNextPath } from '../lib/communityAuth';
import { ensureCommunityProfile, resolveCommunityDestination } from '../lib/communityProfile';
import { hasSupabaseCredentials, supabase } from '../lib/supabase';
import './AppLogin.css';

export default function AuthCallback({ session }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('working');
  const [error, setError] = useState('');
  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return sanitizeCommunityNextPath(params.get('next'));
  }, [location.search]);

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

      if (hasCode) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
        if (exchangeError) {
          if (!cancelled) {
            setStatus('error');
            setError(exchangeError.message || 'Unable to complete sign-in.');
          }
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        if (data?.session) {
          try {
            const { profile } = await ensureCommunityProfile({
              supabaseClient: supabase,
              session: data.session,
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
          setError('No community session was created. Try signing in again.');
        }
      }
    }

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate, nextPath]);

  if (session) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <ContentPageShell title="AUTH" color="#00c2ff" contentClassName="app-login-content">
      <div className="app-login-layout theme-shell-section">
        <div className="app-login-panel theme-panel">
          <p className="app-login-kicker">LMNL Community</p>
          <h2 className="app-login-title">
            {status === 'error' ? 'Sign-in could not be completed.' : 'Completing sign-in...'}
          </h2>
          <p className="app-login-copy">
            {status === 'error'
              ? error
              : 'We are finishing the community session and routing you into the app shell.'}
          </p>
        </div>
      </div>
    </ContentPageShell>
  );
}
