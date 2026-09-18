import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import weatherStationImg from '../assets/weather-station.webp';

const FEATURES = [
  'Real-time weather analytics',
  'Historical data & trends',
  'Multi-device monitoring',
  'Downloadable field reports',
];

// No response at all means the request never got an answer the browser would
// hand over (offline, CORS block, proxy error) — credentials were never checked,
// so this must not be reported as a wrong password.
function loginErrorMessage(err) {
  if (!err?.response) return "Can't reach the server. Check your connection and try again.";
  const { status, data } = err.response;
  if (data?.detail || data?.error) return data.detail || data.error;
  if (status === 400) return 'Enter both username and password';
  if (status === 401) return 'Invalid username or password';
  if (status === 403) return 'This account does not have dashboard access';
  return `Sign-in failed (error ${status}). Please try again.`;
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-inner">
          <div className="brand">
            <span className="brand-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 14a4 4 0 1 1 1.1-7.85A5 5 0 0 1 17 8a3.5 3.5 0 0 1-.5 6.98H6Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 17v2M12 17v2.5M16 17v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="brand-name">Weather Station</span>
          </div>

          <h1 className="welcome-heading">Welcome Back</h1>
          <p className="welcome-sub">Sign in to access your dashboard</p>

          <form className="login-card" onSubmit={handleSubmit}>
            <div className="card-badge">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
              Secure Sign In
            </div>

            <label htmlFor="username">Username <span className="required">*</span></label>
            <div className="input-wrap">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <label htmlFor="password">Password <span className="required">*</span></label>
            <div className="input-wrap">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
              {!loading && (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>

            <p className="protected-note">Protected by enterprise-grade security</p>
          </form>

          <p className="powered-by">Powered by Rashail Infotech</p>
        </div>
      </div>

      <div className="login-right">
        <div className="secure-pill">
          <span className="dot" />
          Secure Login
        </div>

        <div className="device-frame">
          <img src={weatherStationImg} alt="Rashail IoT Weather Station device" />
        </div>

        <h2 className="right-heading">Monitor Every Field</h2>
        <p className="right-sub">
          Access live sensor data, track climate trends, and manage every weather
          station device from one dashboard.
        </p>

        <ul className="feature-list">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
