import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import HeaderBar from '../components/HeaderBar';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('next') || '/';
  }, [location.search]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      navigate(nextPath, { replace: true });
    }
  }

  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content login-content">
        <div className="login-box theme-panel">
          <div className="login-header">
            <div className="login-rect" />
            <h1>ADMIN ACCESS</h1>
          </div>

          <form onSubmit={handleLogin} className="login-form theme-form">
            <div className="login-input-group theme-field">
              <label>IDENTIFIER</label>
              <input 
                className="theme-input"
                type="email" 
                placeholder="EMAIL ADDRESS"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-input-group theme-field">
              <label>CREDENTIAL</label>
              <input 
                className="theme-input"
                type="password" 
                placeholder="PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="login-error">AUTH_ERROR: {error.toUpperCase()}</p>}

            <button type="submit" className="login-btn theme-button" disabled={loading}>
              {loading ? 'AUTHENTICATING...' : 'ESTABLISH SESSION'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
