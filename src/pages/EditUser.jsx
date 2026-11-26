import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usernameToEmail } from '../lib/auth-helpers'
import BackHeader from '../components/BackHeader'
import PageLoader from '../components/PageLoader'

const ZONES = ['Dortmund', 'Essen', 'Düsseldorf', 'Köln']
const ROLES = ['User', 'Khidmatguzar', 'Admin']

export default function EditUser() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [form, setForm] = useState({
    name: '',
    username: '',
    zone: 'Dortmund',
    role: 'User',
    password: '',
  })
  const [original, setOriginal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  // Fetch user on mount
  useEffect(() => {
    async function load() {
      const { data, error: fetchErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single()

      if (fetchErr || !data) {
        setError('User not found')
        setLoading(false)
        return
      }

      const loaded = {
        name: data.full_name || '',
        username: data.username || data.email?.split('@')[0] || '',
        zone: capitalize(data.city || 'dortmund'),
        role: capitalize(data.role || 'user'),
        password: '',
      }
      setForm(loaded)
      setOriginal(loaded)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim()) return setError('Full name is required')
    if (!form.username.trim()) return setError('Username is required')
    if (/\s/.test(form.username)) return setError('Username cannot contain spaces')
    if (form.password && form.password.length < 6) return setError('Password must be at least 6 characters')

    setSaving(true)
    try {
      // 1. Update profile row in users table
      const updates = {
        full_name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: usernameToEmail(form.username),
        role: form.role.toLowerCase(),
        city: form.zone.toLowerCase(),
      }

      const { error: updateErr } = await supabase
          .from('users')
          .update(updates)
          .eq('id', id)

      if (updateErr) throw updateErr

      // 2. If username changed, update auth.users email too
      const usernameChanged = original && form.username.trim().toLowerCase() !== original.username.trim().toLowerCase()
      if (usernameChanged) {
        const { error: emailRpcErr } = await supabase.rpc('admin_update_user_email', {
          target_user_id: id,
          new_email: usernameToEmail(form.username),
        })

        if (emailRpcErr) {
          console.warn('Email update RPC not available:', emailRpcErr.message)
          setSuccess('Profile updated, but login email sync requires the admin_update_user_email function — run admin-functions.sql in Supabase.')
          setSaving(false)
          return
        }
      }

      // 3. If password was changed, update auth user
      if (form.password) {
        const { error: rpcErr } = await supabase.rpc('admin_update_user_password', {
          target_user_id: id,
          new_password: form.password,
        })

        if (rpcErr) {
          console.warn('Password update RPC not available:', rpcErr.message)
          setSuccess('Profile updated! Password reset requires the admin_update_user_password function — run admin-functions.sql in Supabase.')
          setSaving(false)
          return
        }
      }

      setSuccess('User updated successfully!')
      setForm(f => ({ ...f, password: '' }))
      setOriginal({ ...form, password: '' })

      setTimeout(() => navigate(-1), 1200)
    } catch (err) {
      console.error('Update user error:', err)
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        setError('This username is already taken')
      } else {
        setError(err.message || 'Something went wrong')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setDeleting(true)
    setError('')
    try {
      // Delete from users table (RLS should allow admin)
      const { error: delErr } = await supabase
          .from('users')
          .delete()
          .eq('id', id)

      if (delErr) throw delErr

      // Note: deleting the auth.users entry requires admin API / Edge Function.
      // The profile row is removed; the auth entry will be orphaned but harmless.

      navigate(-1)
    } catch (err) {
      console.error('Delete user error:', err)
      setError(err.message || 'Could not delete user')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const initials = (form.name || '?')
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  if (loading) {
    return (
        <div style={styles.page}>
          <div style={{ height: 44, flexShrink: 0 }} />
          <BackHeader title="Edit User" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <PageLoader />
          </div>
        </div>
    )
  }

  return (
      <div style={styles.page}>
        <div style={{ height: 44, flexShrink: 0 }} />
        <BackHeader title="Edit User" />

        <form onSubmit={handleSave} style={styles.scroll}>
          {/* Avatar */}
          <div style={styles.avatarSection}>
            <div style={styles.avatar}>{initials}</div>
            <p style={styles.avatarName}>{form.name || 'Unnamed'}</p>
          </div>

          <div className="field-card">
            <div style={styles.fieldGroup}>
              <div>
                <p style={styles.label}>Full Name</p>
                <input
                    style={styles.input}
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Full name"
                />
              </div>

              <div>
                <p style={styles.label}>Username</p>
                <input
                    style={styles.input}
                    value={form.username}
                    onChange={e => set('username', e.target.value)}
                    placeholder="Username"
                />
              </div>

              <div>
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

              <div>
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

              <div>
                <p style={styles.label}>Reset Password</p>
                <input
                    type="password"
                    style={styles.input}
                    placeholder="New password (leave blank to keep)"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                />
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Min 6 characters</p>
              </div>
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          {success && (
              <div style={styles.successBox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                {success}
              </div>
          )}

          <div style={styles.btnGroup}>
            <button
                type="submit"
                className="btn-primary"
                style={styles.saveBtn}
                disabled={saving}
            >
              {saving ? <span className="spinner" /> : 'Save Changes'}
            </button>

            <button
                type="button"
                style={styles.removeBtn}
                onClick={handleDelete}
                disabled={deleting}
            >
              {deleting ? <span className="spinner" /> : confirmDelete ? 'Tap again to confirm' : 'Remove User'}
            </button>
          </div>

          <div style={{ height: 40 }} />
        </form>
      </div>
  )
}

function capitalize(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
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
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#E8F5EE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--primary)',
  },
  avatarName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1A1A1A',
    marginTop: 8,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
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
  btnGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
  },
  saveBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  removeBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: '1.5px solid #DC2626',
    background: 'white',
    color: '#DC2626',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
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