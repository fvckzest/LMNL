import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, useEffect, useState } from 'react';
import Home from './pages/Home';
import { lazyWithRetry } from './lib/lazyWithRetry';
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
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined);
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

  if (session === undefined) return null; // Loading state

  if (!session) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}

function App() {
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const isAdminSubdomain = hostname.startsWith('admin.');

  // Admin is accessible if we are on the admin subdomain OR working locally
  const showAdmin = isLocal || isAdminSubdomain;

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
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/check-in/:token" element={
                <ProtectedRoute>
                  <CheckIn />
                </ProtectedRoute>
              } />
              {/* Allow viewing the public home via /home on the subdomain */}
              <Route path="/home" element={<Home />} />
              <Route path="/login" element={<Login />} />
              {isLocal ? <Route path="/email-lab" element={<EmailLab />} /> : null}
            </>
          ) : (
            <>
              {/* On the main site, the root is the Home page */}
              <Route path="/" element={<Home />} />
              {/* Block /admin and /login on the public site */}
              <Route path="/admin" element={<Navigate to="/" />} />
              <Route path="/login" element={<Navigate to="/" />} />
              {isLocal ? <Route path="/email-lab" element={<EmailLab />} /> : null}
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
