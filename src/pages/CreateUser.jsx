import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { usernameToEmail } from '../lib/auth-helpers'
import BackHeader from '../components/BackHeader'

/*
 * CreateUser — Admin form to create new user
 *
 * Uses a temporary Supabase client (persistSession: false) to call
 * auth.signUp so the admin's own session is never disrupted.
 * Then inserts the profile row via the main client (as admin).
 */

const ZONES = ['Dortmund', 'Essen', 'Düsseldorf', 'Köln']
const ROLES = ['User', 'Khidmatguzar', 'Admin']

// Temp client — signup won't touch the admin's session
const tempSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
)

export default function CreateUser() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    zone: 'Dortmund',
    role: 'User',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate
    if (!form.name.trim()) return setError('Full name is required')
    if (!form.username.trim()) return setError('Username is required')
    if (/\s/.test(form.username)) return setError('Username cannot contain spaces')
    if (!form.password || form.password.length < 6) return setError('Password must be at least 6 characters')

    setLoading(true)
    try {
      // 1. Create auth user via temp client (admin stays logged in)
      const fakeEmail = usernameToEmail(form.username)

      const { data: signUpData, error: signUpError } = await tempSupabase.auth.signUp({
        email: fakeEmail,
        password: form.password,
      })

      if (signUpError) throw signUpError
      if (!signUpData.user) throw new Error('User creation failed — check if email confirmation is disabled in Supabase')

      // 2. Insert profile row via main client (as admin — RLS allows)
      const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: signUpData.user.id,
            email: fakeEmail,
            username: form.username.trim().toLowerCase(),
            full_name: form.name.trim(),
            role: form.role.toLowerCase(),
            city: form.zone.toLowerCase(),
          })

      if (insertError) throw insertError

      setSuccess(`${form.name} created successfully!`)
      setForm({ name: '', username: '', password: '', zone: 'Dortmund', role: 'User' })

      // Navigate back after a moment
      setTimeout(() => navigate(-1), 1500)
    } catch (err) {
      console.error('Create user error:', err)
      if (err.message?.includes('already registered')) {
        setError('This username is already taken')
      } else {
        setError(err.message || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
      <div style={styles.page}>
        <div style={{ height: 44, flexShrink: 0 }} />
        <BackHeader title="Create User" />

        <form onSubmit={handleCreate} style={styles.scroll}>
          <div className="field-card">
            <div style={styles.fieldGroup}>
              <div style={styles.field}>
                <p style={styles.label}>Full Name</p>
                <input
                    style={styles.input}
                    placeholder="Enter full name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    required
                />
              </div>

              <div style={styles.field}>
                <p style={styles.label}>Username</p>
                <input
                    style={styles.input}
                    placeholder="Choose a username"
                    value={form.username}
                    onChange={e => set('username', e.target.value)}
                    required
                />
              </div>

              <div style={styles.field}>
                <p style={styles.label}>Password</p>
                <input
                    type="password"
                    style={styles.input}
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    required
                    minLength={6}
                />
              </div>

              <div style={styles.field}>
                <p style={styles.label}>Zone</p>
                <div style={styles.chipRow}>
                  {ZONES.map(z => (
                      <div
                          key={z}
                          style={{
                            ...styles.chip,
                            ...(form.zone === z ? styles.chipSelected : {}),
                          }}
                          onClick={() => set('zone', z)}
                      >
                        {form.zone === z && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        )}
                        {z}
                      </div>
                  ))}
                </div>
              </div>

              <div style={styles.field}>
                <p style={styles.label}>Role</p>
                <div style={styles.chipRow}>
                  {ROLES.map(r => (
                      <div
                          key={r}
                          style={{
                            ...styles.chip,
                            ...(form.role === r ? styles.chipSelected : {}),
                          }}
                          onClick={() => set('role', r)}
                      >
                        {form.role === r && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        )}
                        {r}
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && (
              <div style={styles.errorBox}>{error}</div>
          )}

          {success && (
              <div style={styles.successBox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                {success}
              </div>
          )}

          <button
              type="submit"
              className="btn-primary"
              style={styles.submitBtn}
              disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Create User'}
          </button>

          <div style={{ height: 40 }} />
        </form>
      </div>
  )
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    background: 'var(--bg)',
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px',
    WebkitOverflowScrolling: 'touch',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {},
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1.5px solid var(--border)',
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#1A1A1A',
    background: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  },
  chipRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    padding: '8px 14px',
    borderRadius: 20,
    border: '1.5px solid var(--border)',
    fontSize: 13,
    fontWeight: 500,
    color: '#6B7280',
    background: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.15s',
  },
  chipSelected: {
    background: 'var(--primary)',
    color: 'white',
    borderColor: 'var(--primary)',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    marginTop: 16,
  },
  errorBox: {
    marginTop: 12,
    padding: '10px 14px',
    borderRadius: 8,
    background: '#FEE2E2',
    color: '#DC2626',
    fontSize: 13,
    fontWeight: 500,
  },
  successBox: {
    marginTop: 12,
    padding: '10px 14px',
    borderRadius: 8,
    background: '#E8F5EE',
    color: '#1B7A4A',
    fontSize: 13,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
}