import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'

const roleBadge = {
  user: { bg: '#FEF3C7', color: '#92400E', label: 'User' },
  admin: { bg: '#FEE2E2', color: '#DC2626', label: 'Admin' },
  dev: { bg: '#FEE2E2', color: '#DC2626', label: 'Dev' },
  khidmatguzar: { bg: '#EDE9FE', color: '#5B21B6', label: 'Khidmatguzar' },
}

export default function ManageUsers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    setError('')
    const { data, error: fetchErr } = await supabase
        .from('users')
        .select('id, full_name, username, role, city')
        .order('created_at', { ascending: false })

    if (fetchErr) {
      console.error('Fetch users error:', fetchErr)
      setError('Could not load users')
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.city || '').toLowerCase().includes(q)
    )
  })

  return (
      <div style={styles.page}>
        <div style={styles.statusBar} />
        <BackHeader title="Manage Users" />

        <div style={styles.scroll}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                 style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users..."
                style={{ paddingLeft: 36 }}
            />
          </div>

          {/* Count */}
          <p style={styles.count}>
            {loading ? 'Loading...' : `${filtered.length} member${filtered.length !== 1 ? 's' : ''}`}
          </p>

          {/* Error */}
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Loading skeleton */}
          {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => (
                    <div key={i} style={styles.skeleton} />
                ))}
              </div>
          )}

          {/* User rows */}
          {!loading && filtered.map(user => {
            const badge = roleBadge[user.role] || roleBadge.user
            const initials = (user.full_name || '?')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
            return (
                <div
                    key={user.id}
                    className="user-row"
                    onClick={() => navigate(`/admin/users/edit/${user.id}`)}
                    style={{ cursor: 'pointer' }}
                >
                  <div style={styles.avatar}>
                    <span style={styles.initials}>{initials}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={styles.userName}>{user.full_name}</p>
                    <p style={styles.userSub}>@{user.username} · {capitalize(user.city)}</p>
                  </div>
                  <span className="badge" style={{ background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ marginLeft: 4, flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
            )
          })}

          {/* Empty state */}
          {!loading && filtered.length === 0 && users.length > 0 && (
              <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 20 }}>
                No users match "{search}"
              </p>
          )}

          {/* Add user card */}
          <div style={styles.addCard} onClick={() => navigate('/admin/users/create')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Add New User</p>
          </div>

          <div style={{ height: 100 }} />
        </div>
        <BottomNav />
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
  statusBar: { height: 44, flexShrink: 0 },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px',
    WebkitOverflowScrolling: 'touch',
  },
  count: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
    fontWeight: 500,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initials: {
    fontSize: 14,
    fontWeight: 600,
    color: 'white',
  },
  userName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A1A1A',
  },
  userSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  addCard: {
    marginTop: 8,
    padding: 14,
    background: 'white',
    border: '1px dashed #D1D5DB',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  errorBox: {
    marginBottom: 12,
    padding: '10px 14px',
    borderRadius: 8,
    background: '#FEE2E2',
    color: '#DC2626',
    fontSize: 13,
    fontWeight: 500,
  },
  skeleton: {
    height: 56,
    borderRadius: 12,
    background: '#F3F4F6',
    animation: 'pulse 1.5s infinite',
  },
}