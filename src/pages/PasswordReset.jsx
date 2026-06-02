import { useEffect, useMemo, useState } from 'react';
import ContentPageShell from '../components/ContentPageShell';
import { useThemeNeutralColor } from '../components/ThemeProvider';
import { hasSupabaseCredentials, supabase } from '../lib/supabase';
import './Login.css';

const ADMIN_ORIGIN = 'https://admin.lmnl.art';

function hasRecoveryToken() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);

  return hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery';
}

function readAdminOrigin() {
  const { hostname, origin } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('admin.')) {
    return origin;
  }

  return ADMIN_ORIGIN;
}

function buildPasswordResetRedirectTo() {
  return `${readAdminOrigin()}/reset-password`;
}

function goToAdmin() {
  const adminOrigin = readAdminOrigin();

  if (adminOrigin === window.location.origin) {
    window.location.assign('/');
    return;
  }

  window.location.assign(adminOrigin);
}

export default function PasswordReset() {
  const neutralColor = useThemeNeutralColor();
  const [mode, setMode] = useState(hasRecoveryToken() ? 'update' : 'request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isUpdateMode = mode === 'update';
  const title = useMemo(
    () => (isUpdateMode ? 'RESET PASSWORD' : 'REQUEST RESET'),
    [isUpdateMode],
  );

  useEffect(() => {
    let cancelled = false;

    async function readRecoverySession() {
      const { data } = await supabase.auth.getSession();

      if (!cancelled && data?.session) {
        setMode('update');
      }
    }

    readRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update');
        setMessage('');
        setError('');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function handleRequestReset(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (!hasSupabaseCredentials) {
      setError('Password reset is not configured in this environment yet.');
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildPasswordResetRedirectTo(),
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('If that email has access, a reset link is on its way.');
    }

    setLoading(false);
  }

  async function handleUpdatePassword(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setPassword('');
    setConfirmPassword('');
    setMessage('Password updated. Return to admin access with the new credential.');
    setLoading(false);
  }

  return (
    <ContentPageShell
      title={title}
      color={neutralColor}
      introTitle={title}
      introCopy={isUpdateMode ? 'SET A NEW CREDENTIAL FOR THIS ACCOUNT' : 'SEND A SUPABASE RECOVERY LINK'}
      contentClassName="login-content page-stack"
    >
      <div className="login-box theme-panel theme-form-shell">
        <div className="login-header theme-panel-header">
          <div className="login-rect theme-accent-bar" />
          <h1>{isUpdateMode ? 'NEW CREDENTIAL' : 'PASSWORD RECOVERY'}</h1>
        </div>

        {isUpdateMode ? (
          <form onSubmit={handleUpdatePassword} className="login-form theme-form">
            <div className="login-input-group theme-field">
              <label className="theme-field-label">NEW PASSWORD</label>
              <input
                className="theme-input"
                type="password"
                placeholder="AT LEAST 8 CHARACTERS"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>

            <div className="login-input-group theme-field">
              <label className="theme-field-label">CONFIRM PASSWORD</label>
              <input
                className="theme-input"
                type="password"
                placeholder="RETYPE NEW PASSWORD"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>

            {error ? <p className="login-error">RESET_ERROR: {error.toUpperCase()}</p> : null}
            {message ? <p className="login-status">{message.toUpperCase()}</p> : null}

            <button type="submit" className="login-btn theme-button" disabled={loading}>
              {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
            {message ? (
              <button type="button" className="login-link-button" onClick={goToAdmin}>
                RETURN TO ADMIN
              </button>
            ) : null}
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="login-form theme-form">
            <div className="login-input-group theme-field">
              <label className="theme-field-label">IDENTIFIER</label>
              <input
                className="theme-input"
                type="email"
                placeholder="EMAIL ADDRESS"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            {error ? <p className="login-error">RESET_ERROR: {error.toUpperCase()}</p> : null}
            {message ? <p className="login-status">{message.toUpperCase()}</p> : null}

            <button type="submit" className="login-btn theme-button" disabled={loading}>
              {loading ? 'SENDING...' : 'SEND RESET LINK'}
            </button>
            <button type="button" className="login-link-button" onClick={goToAdmin}>
              RETURN TO ADMIN
            </button>
          </form>
        )}
      </div>
    </ContentPageShell>
  );
}
