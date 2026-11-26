import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { usernameToEmail } from '../lib/auth-helpers'
import ThaaliLogo from '../components/ThaaliLogo'

/*
 * Login Page — users log in with username + password.
 * Internally converts username to email for Supabase auth.
 */

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(usernameToEmail(username), password)
      navigate('/', { replace: true })
    } catch (err) {
      // Supabase returns "Invalid login credentials" — we show a friendlier message
      setError(
          err.message === 'Invalid login credentials'
              ? 'Wrong email or password'
              : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="login-page">
        {/* Logo — 88×88 green rounded square with thaali bowl SVG */}
        <div className="login-logo">
          <ThaaliLogo />
        </div>

        {/* App name & tagline */}
        <h1 className="login-title">NRW Thaali</h1>
        <p className="login-subtitle">Community food distribution</p>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-fields">
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                  className="login-input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    className="login-input"
                    style={{ paddingRight: 44 }}
                />
                <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                    {showPw ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </>
                    ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && <div className="error-box login-error">{error}</div>}

          {/* Forgot password notice */}
          {showForgot && (
              <div style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 8,
                background: '#FEF3C7', color: '#92400E', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Please contact your admin to reset your password.
              </div>
          )}

          <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>

          <button
              type="button"
              onClick={() => setShowForgot(true)}
              style={{
                marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'inherit',
                width: '100%', textAlign: 'center',
              }}
          >
            Forgot password?
          </button>
        </form>

        {/*
        Scoped styles for the login page.

        Why inline <style>? For page-specific styles that don't belong
        in the global stylesheet. The login page has unique layout
        (centered, no nav) and unique input sizing.

        In a larger app you'd use CSS Modules or a login.css file,
        but for a small PWA this keeps things simple and colocated.
      */}
        <style>{`
        .login-page {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          background: var(--bg);
        }

        .login-logo {
          width: 88px;
          height: 88px;
          border-radius: 22px;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .login-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .login-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 32px;
        }

        .login-form {
          width: 100%;
          max-width: 400px;
        }

        .login-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        /*
         * Login inputs override the global input styles.
         * The prototype's login inputs are bigger and bolder
         * than the in-app form inputs — this is intentional
         * to make the first impression feel spacious.
         */
        .login-input {
          padding: 14px 16px !important;
          border: 1.5px solid var(--border-input) !important;
          border-radius: 10px !important;
          font-size: 15px !important;
          background: var(--surface) !important;
        }

        .login-input:focus {
          border-color: var(--primary) !important;
        }

        .login-error {
          margin-bottom: 16px;
        }
      `}</style>
      </div>
  )
}