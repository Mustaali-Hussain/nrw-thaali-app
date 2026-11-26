import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'

/*
 * Profile / Settings — User profile screen
 * Avatar + name + role badge, editable name, zone selector,
 * functional change password, save + logout
 */

const roleBadge = {
  user: { bg: '#FEF3C7', color: '#92400E', label: 'User' },
  admin: { bg: '#FEE2E2', color: '#DC2626', label: 'Admin' },
  dev: { bg: '#FEE2E2', color: '#DC2626', label: 'Developer' },
  khidmatguzar: { bg: '#EDE9FE', color: '#5B21B6', label: 'Khidmatguzar' },
}

export default function Profile() {
  const { user, userProfile, role, signOut } = useAuth()
  const displayName = userProfile?.full_name || userProfile?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const badge = roleBadge[role] || roleBadge.user

  const [fullName, setFullName] = useState(displayName)
  const [selectedZone, setSelectedZone] = useState(userProfile?.city || 'dortmund')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const zones = [
    { id: 'dortmund', label: 'Dortmund' },
    { id: 'essen', label: 'Essen' },
    { id: 'düsseldorf', label: 'Düsseldorf' },
  ]

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    const { error } = await supabase
        .from('users')
        .update({ full_name: fullName.trim(), city: selectedZone })
        .eq('id', user.id)
    if (error) {
      setSaveMsg('Failed to save')
    } else {
      setSaveMsg('Saved!')
      // Update AuthContext profile in memory
      if (userProfile) {
        userProfile.full_name = fullName.trim()
        userProfile.city = selectedZone
      }
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setSaving(false)
  }

  async function handleChangePassword() {
    setPwError('')
    setPwSuccess('')

    if (!newPassword || newPassword.length < 6) {
      return setPwError('Password must be at least 6 characters')
    }
    if (newPassword !== confirmPassword) {
      return setPwError('Passwords do not match')
    }

    setPwLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPwSuccess('Password updated!')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setPwSuccess('')
        setShowPassword(false)
      }, 2000)
    } catch (err) {
      setPwError(err.message || 'Failed to update password')
    } finally {
      setPwLoading(false)
    }
  }

  function handleLogout() {
    signOut()
  }

  return (
      <div style={styles.page}>
        <div style={styles.statusBar} />
        <BackHeader title="Profile" />

        <div style={styles.scroll}>
          {/* Avatar + name + badge */}
          <div style={styles.avatarSection}>
            <div style={styles.avatar}>
              <span style={styles.initials}>{initials}</span>
            </div>
            <p style={styles.displayName}>{displayName}</p>
            <span style={{ ...styles.roleBadge, background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
          </div>

          {/* Full Name */}
          <div className="field-card">
            <div className="input-group">
              <label>Full Name</label>
              <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name"
              />
            </div>

            {/* Username (readonly) */}
            <div className="input-group" style={{ marginTop: 16 }}>
              <label>Username</label>
              <input
                  type="text"
                  value={userProfile?.username || userProfile?.email?.split('@')[0] || ''}
                  readOnly
                  style={{ background: '#F9FAFB', color: 'var(--text-muted)' }}
              />
              <p style={styles.hint}>Username cannot be changed</p>
            </div>
          </div>

          {/* Zone Selector */}
          <p className="section-title" style={{ marginTop: 8 }}>Your Zone</p>
          {zones.map(zone => (
              <div
                  key={zone.id}
                  className={`zone-option ${selectedZone === zone.id ? 'zone-selected' : 'zone-unselected'}`}
                  onClick={() => setSelectedZone(zone.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                       stroke={selectedZone === zone.id ? 'var(--primary)' : '#9CA3AF'} strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <p style={{
                    fontSize: 14, fontWeight: 500,
                    color: selectedZone === zone.id ? 'var(--primary)' : '#374151',
                  }}>{zone.label}</p>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: selectedZone === zone.id ? 'none' : '2px solid #D1D5DB',
                  background: selectedZone === zone.id ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selectedZone === zone.id && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                  )}
                </div>
              </div>
          ))}

          {/* Change Password */}
          <div className="field-card" style={{ marginTop: 8 }}>
            <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => { setShowPassword(!showPassword); setPwError(''); setPwSuccess('') }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Change Password</p>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                   style={{ transform: showPassword ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            {showPassword && (
                <div style={{ marginTop: 16 }}>
                  <div className="input-group" style={{ marginBottom: 12 }}>
                    <label>New Password</label>
                    <input
                        type="password"
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Confirm Password</label>
                    <input
                        type="password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  {pwError && <p style={styles.pwError}>{pwError}</p>}
                  {pwSuccess && <p style={styles.pwSuccess}>✓ {pwSuccess}</p>}

                  <button
                      className="btn btn-primary"
                      style={{ marginTop: 12, width: '100%' }}
                      onClick={handleChangePassword}
                      disabled={pwLoading}
                  >
                    {pwLoading ? <span className="spinner" /> : 'Update Password'}
                  </button>
                </div>
            )}
          </div>

          {/* Save button */}
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : saveMsg || 'Save Changes'}
          </button>

          {/* Logout */}
          <button className="btn btn-danger-outline" style={{ marginTop: 10 }} onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Log Out
          </button>

          <div style={{ height: 32 }} />
        </div>
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
  statusBar: { height: 44, flexShrink: 0 },
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
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  initials: {
    fontSize: 22,
    fontWeight: 700,
    color: 'white',
  },
  displayName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1A1A1A',
    marginBottom: 6,
  },
  roleBadge: {
    padding: '4px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  pwError: {
    marginTop: 8,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: 500,
  },
  pwSuccess: {
    marginTop: 8,
    fontSize: 13,
    color: '#1B7A4A',
    fontWeight: 500,
  },
}