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
        {/* SHARED / PUBLIC CONTENT */}
        <Route path="/events" element={<Events />} />
        <Route path="/space" element={<Space />} />
        <Route path="/about" element={
          <GenericPage title="ABOUT" color="#ff9300">
            <img src="/rules.png" alt="Rules" className="about-rules-img" />
          </GenericPage>
        } />

        {/* SUBDOMAIN SPECIFIC LOGIC */}
        {showAdmin ? (
          <>
            {/* On admin.lmnl.art, the root is the Dashboard */}
            <Route path="/" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
            {/* Allow viewing the public home via /home on the subdomain */}
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
          </>
        ) : (
          <>
            {/* On the main site, the root is the Home page */}
            <Route path="/" element={<Home />} />
            {/* Block /admin and /login on the public site */}
            <Route path="/admin" element={<Navigate to="/" />} />
            <Route path="/login" element={<Navigate to="/" />} />
          </>
        )}

        {/* CATCH-ALL / UTILITY */}
        <Route path="/services" element={<GenericPage title="SERVICES" color="#6222d8" />} />
        <Route path="/community" element={<GenericPage title="COMMUNITY" color="#ff5bb8" />} />
        <Route path="/shop" element={<GenericPage title="SHOP" color="#ff0000" />} />
        <Route path="/blog" element={<GenericPage title="BLOG" color="#ffde00" />} />
        <Route path="/contact" element={<GenericPage title="CONTACT" color="#90e937" />} />
        <Route path="/prsm" element={<GenericPage title="PRSM" color="#000000" />} />
        
        <Route path="*" element={<Space />} />
      </Routes>
    </Router>
  );
}

export default App;
