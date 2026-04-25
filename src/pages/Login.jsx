import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import HeaderBar from '../components/HeaderBar';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
      navigate('/');
    }
  }

  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content login-content">
        <div className="login-box">
          <div className="login-header">
            <div className="login-rect" />
            <h1>ADMIN ACCESS</h1>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-input-group">
              <label>IDENTIFIER</label>
              <input 
                type="email" 
                placeholder="EMAIL ADDRESS"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-input-group">
              <label>CREDENTIAL</label>
              <input 
                type="password" 
                placeholder="PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="login-error">AUTH_ERROR: {error.toUpperCase()}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'AUTHENTICATING...' : 'ESTABLISH SESSION'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
