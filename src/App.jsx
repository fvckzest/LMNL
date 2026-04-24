import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Home from './pages/Home';
import GenericPage from './pages/GenericPage';
import Space from './pages/Space';
import Events from './pages/Events';
import Admin from './pages/Admin';
import Login from './pages/Login';
import './index.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // Loading state
  return session ? children : <Navigate to="/login" />;
}

function App() {
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const isAdminSubdomain = hostname.startsWith('admin.');
  
  // Admin is accessible if we are on the admin subdomain OR working locally
  const showAdmin = isLocal || isAdminSubdomain;

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTES - Always accessible */}
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/services" element={<GenericPage title="SERVICES" color="#6222d8" />} />
        <Route path="/community" element={<GenericPage title="COMMUNITY" color="#ff5bb8" />} />
        <Route path="/shop" element={<GenericPage title="SHOP" color="#ff0000" />} />
        <Route path="/about" element={
          <GenericPage title="ABOUT" color="#ff9300">
            <img src="/rules.png" alt="Rules" className="about-rules-img" />
          </GenericPage>
        } />
        <Route path="/blog" element={<GenericPage title="BLOG" color="#ffde00" />} />
        <Route path="/contact" element={<GenericPage title="CONTACT" color="#90e937" />} />
        <Route path="/prsm" element={<GenericPage title="PRSM" color="#000000" />} />
        <Route path="/space" element={<Space />} />

        {/* ADMIN ROUTES - Only accessible via admin subdomain or localhost */}
        {showAdmin ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
          </>
        ) : (
          // If someone tries to go to /admin on the main site, send them to Space
          <>
            <Route path="/login" element={<Navigate to="/" />} />
            <Route path="/admin" element={<Navigate to="/" />} />
          </>
        )}

        {/* CATCH-ALL */}
        <Route path="*" element={<Space />} />
      </Routes>
    </Router>
  );
}

export default App;
