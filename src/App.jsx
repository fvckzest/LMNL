import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, cloneElement, useEffect, useState } from 'react';
import Home from './pages/Home';
import ContentPageShell from './components/ContentPageShell';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { ThemeProvider, useThemeNeutralColor } from './components/ThemeProvider';
import RouteStatusScreen from './components/RouteStatusScreen';
import {
  buildCommunityLoginPath,
  buildCommunityOnboardingPath,
  readCommunityNextPath,
  sanitizeCommunityNextPath,
} from './lib/communityAuth';
import {
  COMMUNITY_APP_PATH,
  COMMUNITY_DASHBOARD_BASE_PATH,
  COMMUNITY_ONBOARDING_PATH,
  ensureCommunityProfile,
  profileNeedsOnboarding,
} from './lib/communityProfile';
import './styles/community-app.css';

const Contact = lazyWithRetry(() => import('./pages/Contact'));
const GenericPage = lazyWithRetry(() => import('./pages/GenericPage'));
const Space = lazyWithRetry(() => import('./pages/Space'));
const Events = lazyWithRetry(() => import('./pages/Events'));
const Admin = lazyWithRetry(() => import('./pages/Admin'));
const CheckIn = lazyWithRetry(() => import('./pages/CheckIn'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Ticket = lazyWithRetry(() => import('./pages/Ticket'));
const Success = lazyWithRetry(() => import('./pages/Success'));
const Services = lazyWithRetry(() => import('./pages/Services'));
const Community = lazyWithRetry(() => import('./pages/Community'));
const ArtistInterest = lazyWithRetry(() => import('./pages/ArtistInterest'));
const Shop = lazyWithRetry(() => import('./pages/Shop'));
const Blog = lazyWithRetry(() => import('./pages/Blog'));
const BlogPostView = lazyWithRetry(() => import('./pages/BlogPostView'));
const EmailLab = lazyWithRetry(() => import('./pages/EmailLab'));
const About = lazyWithRetry(() => import('./pages/About'));
const AppLogin = lazyWithRetry(() => import('./pages/AppLogin'));
const AuthCallback = lazyWithRetry(() => import('./pages/AuthCallback'));
const AppHome = lazyWithRetry(() => import('./pages/AppHome'));
const AppOnboarding = lazyWithRetry(() => import('./pages/AppOnboarding'));
const UserDashboard = lazyWithRetry(() => import('./pages/UserDashboard'));

function RouteLoadingFallback() {
  return <RouteStatusScreen message="LOADING PAGE..." />;
}

function RouteGateFallback({ message = 'VERIFYING ACCESS...' }) {
  return <RouteStatusScreen message={message} />;
}

function PrsmPage() {
  const neutralColor = useThemeNeutralColor();

  return <GenericPage title="PRSM" color={neutralColor} />;
}

function CommunityRouteError({ message, nextPath }) {
  const neutralColor = useThemeNeutralColor();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleResetSession() {
    setBusy(true);

    try {
      const { supabase } = await import('./lib/supabase');
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

function ProtectedRoute({ children, requireAdmin = false }) {
  const [session, setSession] = useState(undefined);
  const [adminStatus, setAdminStatus] = useState(requireAdmin ? 'idle' : 'authorized');
  const [adminError, setAdminError] = useState('');
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    async function initSession() {
      const { supabase } = await import('./lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(session);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (isMounted) {
          setSession(nextSession);
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    }

    initSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function verifyAdminAccess() {
      if (!requireAdmin) {
        setAdminStatus('authorized');
        setAdminError('');
        return;
      }

      if (!session?.access_token) {
        setAdminStatus('idle');
        setAdminError('');
        return;
      }

      setAdminStatus('checking');
      setAdminError('');

      const response = await fetch('/api/admin-session', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (cancelled) {
        return;
      }

      if (response.ok && payload?.success) {
        setAdminStatus('authorized');
        return;
      }

      if (response.status === 401 || response.status === 403) {
        setAdminStatus('denied');
        return;
      }

      setAdminStatus('error');
      setAdminError(payload?.error?.message || payload?.message || 'Unable to verify admin access.');
    }

    verifyAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [requireAdmin, session]);

  if (session === undefined) return <RouteGateFallback />;

  if (!session) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (requireAdmin) {
    if (adminStatus === 'checking' || adminStatus === 'idle') {
      return <RouteGateFallback />;
    }

    if (adminStatus === 'denied') {
      const next = `${location.pathname}${location.search}${location.hash}`;
      return <Navigate to={`/login?next=${encodeURIComponent(next)}&unauthorized=1`} replace />;
    }

    if (adminStatus === 'error') {
      return <RouteGateFallback message={adminError || 'ADMIN ACCESS IS UNAVAILABLE.'} />;
    }
  }

  return children;
}

function CommunityAppRoute({ children, session, allowIncomplete = false }) {
  const location = useLocation();
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

      const { supabase } = await import('./lib/supabase');

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
    return <Navigate to={buildCommunityLoginPath(next)} replace />;
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
    return <Navigate to={buildCommunityOnboardingPath(next)} replace />;
  }

  if (allowIncomplete && !needsOnboarding) {
    return <Navigate to={readCommunityNextPath(location.search)} replace />;
  }

  return cloneElement(children, {
    profile: state.profile,
    provider: state.provider,
    session,
  });
}

function App() {
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const isAdminSubdomain = hostname.startsWith('admin.');

  const showAdmin = isLocal || isAdminSubdomain;
  const showCommunityApp = isLocal || !isAdminSubdomain;
  const [appSession, setAppSession] = useState(undefined);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    async function initSession() {
      const { supabase } = await import('./lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (isMounted) {
        setAppSession(session);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (isMounted) {
          setAppSession(nextSession);
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    }

    initSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/ticket/:ticketId" element={<Ticket />} />
            <Route path="/success" element={<Success />} />
            <Route path="/events" element={<Events />} />
            <Route path="/space" element={<Space />} />
            <Route path="/about" element={<About />} />

            {showAdmin ? (
              <>
                <Route path="/" element={
                  <ProtectedRoute requireAdmin>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="/check-in/:token" element={
                  <ProtectedRoute requireAdmin>
                    <CheckIn />
                  </ProtectedRoute>
                } />
                <Route path="/home" element={<Home />} />
                <Route path="/login" element={<Login />} />
                {isLocal ? <Route path="/email-lab" element={<EmailLab />} /> : null}
                {showCommunityApp ? <Route path="/auth/callback" element={<AuthCallback session={appSession} />} /> : null}
              </>
            ) : (
              <>
                <Route path="/" element={<Home />} />
                <Route path="/admin" element={<Navigate to="/" />} />
                <Route path="/login" element={<Navigate to="/" />} />
                {isLocal ? <Route path="/email-lab" element={<EmailLab />} /> : null}
                <Route path="/auth/callback" element={<AuthCallback session={appSession} />} />
              </>
            )}

            {showCommunityApp ? (
              <>
                <Route path={buildCommunityLoginPath(COMMUNITY_APP_PATH)} element={<AppLogin session={appSession} />} />
                <Route
                  path={COMMUNITY_APP_PATH}
                  element={(
                    <CommunityAppRoute session={appSession}>
                      <AppHome session={appSession} />
                    </CommunityAppRoute>
                  )}
                />
                <Route
                  path={`${COMMUNITY_DASHBOARD_BASE_PATH}/:userSlug`}
                  element={(
                    <CommunityAppRoute session={appSession}>
                      <UserDashboard session={appSession} />
                    </CommunityAppRoute>
                  )}
                />
                <Route
                  path={COMMUNITY_ONBOARDING_PATH}
                  element={(
                    <CommunityAppRoute session={appSession} allowIncomplete>
                      <AppOnboarding session={appSession} />
                    </CommunityAppRoute>
                  )}
                />
              </>
            ) : (
              <>
                <Route path={buildCommunityLoginPath(COMMUNITY_APP_PATH)} element={<Navigate to="/" replace />} />
                <Route path={COMMUNITY_APP_PATH} element={<Navigate to="/" replace />} />
                <Route path={`${COMMUNITY_DASHBOARD_BASE_PATH}/:userSlug`} element={<Navigate to="/" replace />} />
                <Route path={COMMUNITY_ONBOARDING_PATH} element={<Navigate to="/" replace />} />
              </>
            )}

            <Route path="/services" element={<Services />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/share" element={<ArtistInterest />} />
            <Route path="/share-your-work" element={<Navigate to="/community/share" replace />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostView />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/prsm" element={<PrsmPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
