import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import ContentPageShell from '../components/ContentPageShell';
import { useAppLocation, useAppNavigate } from '../components/RouterAdapter';
import { useThemeNeutralColor } from '../components/ThemeProvider';

export default function Login() {
  const neutralColor = useThemeNeutralColor();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useAppNavigate();
  const location = useAppLocation();
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
    <ContentPageShell
      title="LOGIN"
      color={neutralColor}
      introTitle="LOGIN"
      introCopy="AUTHENTICATED NODE / ESTABLISH SESSION TO CONTINUE"
      contentClassName="login-content page-stack"
    >
        <div className="login-box theme-panel theme-form-shell">
          <div className="login-header theme-panel-header">
            <div className="login-rect theme-accent-bar" />
            <h1>ADMIN ACCESS</h1>
          </div>

          <form onSubmit={handleLogin} className="login-form theme-form">
            <div className="login-input-group theme-field">
              <label className="theme-field-label">IDENTIFIER</label>
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
              <label className="theme-field-label">CREDENTIAL</label>
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
    </ContentPageShell>
  );
}
