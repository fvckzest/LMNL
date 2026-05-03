import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, cloneElement, useEffect, useState } from 'react';
import Home from './pages/Home';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { buildCommunityOnboardingPath, readCommunityNextPath, sanitizeCommunityNextPath } from './lib/communityAuth';
import {
  COMMUNITY_APP_PATH,
  COMMUNITY_ONBOARDING_PATH,
  ensureCommunityProfile,
  profileNeedsOnboarding,
} from './lib/communityProfile';
import './index.css';

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

function RouteLoadingFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Gantari, sans-serif',
        fontSize: '12px',
        letterSpacing: '0.18em',
      }}
    >
      LOADING PAGE...
    </div>
  );
}

// Protected Route Component
function RouteGateFallback({ message = 'VERIFYING ACCESS...' }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Gantari, sans-serif',
        fontSize: '12px',
        letterSpacing: '0.18em',
      }}
    >
      {message}
    </div>
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
    return <Navigate to={`/app/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (state.status === 'checking' || state.status === 'idle') {
    return <RouteGateFallback message="PREPARING PROFILE..." />;
  }

  if (state.status === 'error') {
    return <RouteGateFallback message={state.error || 'COMMUNITY ACCESS IS UNAVAILABLE.'} />;
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

  // Admin is accessible if we are on the admin subdomain OR working locally
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
    <Router>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* SHARED / PUBLIC CONTENT */}
          <Route path="/ticket/:ticketId" element={<Ticket />} />
          <Route path="/success" element={<Success />} />
          <Route path="/events" element={<Events />} />
          <Route path="/space" element={<Space />} />
          <Route path="/about" element={<About />} />

          {/* SUBDOMAIN SPECIFIC LOGIC */}
          {showAdmin ? (
            <>
              {/* On admin.lmnl.art, the root is the Dashboard */}
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
              {/* Allow viewing the public home via /home on the subdomain */}
              <Route path="/home" element={<Home />} />
              <Route path="/login" element={<Login />} />
              {isLocal ? <Route path="/email-lab" element={<EmailLab />} /> : null}
              {showCommunityApp ? <Route path="/auth/callback" element={<AuthCallback session={appSession} />} /> : null}
            </>
          ) : (
            <>
              {/* On the main site, the root is the Home page */}
              <Route path="/" element={<Home />} />
              {/* Block /admin and /login on the public site */}
              <Route path="/admin" element={<Navigate to="/" />} />
              <Route path="/login" element={<Navigate to="/" />} />
              {isLocal ? <Route path="/email-lab" element={<EmailLab />} /> : null}
              <Route path="/auth/callback" element={<AuthCallback session={appSession} />} />
            </>
          )}

          {showCommunityApp ? (
            <>
              <Route path="/app/login" element={<AppLogin session={appSession} />} />
              <Route
                path="/app"
                element={(
                  <CommunityAppRoute session={appSession}>
                    <AppHome session={appSession} />
                  </CommunityAppRoute>
                )}
              />
              <Route
                path="/app/onboarding"
                element={(
                  <CommunityAppRoute session={appSession} allowIncomplete>
                    <AppOnboarding session={appSession} />
                  </CommunityAppRoute>
                )}
              />
            </>
          ) : (
            <>
              <Route path="/app/login" element={<Navigate to="/" replace />} />
              <Route path="/app" element={<Navigate to="/" replace />} />
              <Route path="/app/onboarding" element={<Navigate to="/" replace />} />
            </>
          )}

          {/* CATCH-ALL / UTILITY */}
          <Route path="/services" element={<Services />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/share" element={<ArtistInterest />} />
          <Route path="/share-your-work" element={<Navigate to="/community/share" replace />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPostView />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/prsm" element={<GenericPage title="PRSM" color="#000000" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
