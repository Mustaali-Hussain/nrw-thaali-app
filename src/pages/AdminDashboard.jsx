import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import PageLoader from '../components/PageLoader'

function getWeekStart(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getWeekNumber(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const start = new Date(d.getFullYear(), 0, 1)
  const diff = (d - start + ((start.getDay() + 6) % 7) * 86400000) / 86400000
  return Math.ceil((diff + 1) / 7)
}

const badgeColor = {
  selected:   { bg: '#E8F5EE', color: '#3A9B68' },
  unselected: { bg: '#F0FAF4', color: '#7BC4A0' },
}
const mainBadge = { bg: '#E8F5EE', color: '#3A9B68' }

/**
 * Thaali voting schedule (CET):
 * Mon–Wed: menus visible, voting open
 * Thu–Fri: menus visible, voting locked
 * Sat–Sun: menus hidden entirely
 */
function getThaaliPhase() {
  // const day = new Date().getDay()
  // if (day === 0 || day === 6) return 'hidden'
  // if (day >= 4) return 'locked'
  return 'open'
}

export default function AdminDashboard() {
  const { user, userProfile, isDev } = useAuth()
  const navigate = useNavigate()

  // Thaali voting state
  const [loading, setLoading] = useState(true)
  const [menus, setMenus] = useState([])
  const [selections, setSelections] = useState({})
  const [saving, setSaving] = useState(null)

  const weekStart = getWeekStart()
  const thaaliPhase = getThaaliPhase()
  const votingLocked = thaaliPhase !== 'open'

  useEffect(() => {
    if (user) fetchThaaliData()
  }, [user])

  async function fetchThaaliData() {
    setLoading(true)

    const [menuRes, selRes] = await Promise.all([
      supabase.from('menus').select('*').eq('week_start', weekStart).order('menu_number'),
      supabase.from('thaali_selections').select('*').eq('week_start', weekStart).eq('user_id', user.id),
    ])

    const menuData = menuRes.data || []
    setMenus(menuData)

    const selMap = {}
    for (const s of (selRes.data || [])) {
      selMap[s.menu_number] = {
        id: s.id,
        opted_in: s.opted_in,
        wants_roti: s.wants_roti ?? true,
        wants_dessert: s.wants_dessert ?? true,
        wants_fruit: s.wants_fruit ?? true,
      }
    }
    setSelections(selMap)
    setLoading(false)
  }

  async function toggleOptIn(menuNumber) {
    setSaving(menuNumber)
    const existing = selections[menuNumber]

    if (existing) {
      const newVal = !existing.opted_in
      const { error } = await supabase
          .from('thaali_selections')
          .update({ opted_in: newVal })
          .eq('id', existing.id)
      if (!error) {
        setSelections(prev => ({
          ...prev,
          [menuNumber]: { ...existing, opted_in: newVal },
        }))
      }
    } else {
      const { data, error } = await supabase
          .from('thaali_selections')
          .insert({
            user_id: user.id,
            week_start: weekStart,
            menu_number: menuNumber,
            opted_in: true,
            wants_roti: true,
            wants_dessert: true,
            wants_fruit: true,
          })
          .select()
          .single()
      if (!error && data) {
        setSelections(prev => ({
          ...prev,
          [menuNumber]: {
            id: data.id,
            opted_in: true,
            wants_roti: true,
            wants_dessert: true,
            wants_fruit: true,
          },
        }))
      }
    }
    setSaving(null)
  }

  async function toggleOptional(menuNumber, field) {
    const sel = selections[menuNumber]
    if (!sel || !sel.opted_in) return

    const newVal = !sel[field]
    const { error } = await supabase
        .from('thaali_selections')
        .update({ [field]: newVal })
        .eq('id', sel.id)
    if (!error) {
      setSelections(prev => ({
        ...prev,
        [menuNumber]: { ...sel, [field]: newVal },
      }))
    }
  }

  const menuLabels = ['Menu 1', 'Menu 2', 'Menu 3']

  /* Manage section items — compact button grid */
  const manageItems = [
    {
      title: 'Weekly Menu',
      href: '/admin/menu',
      iconBg: '#E8F5EE',
      icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
      ),
    },
    {
      title: 'Collection',
      href: '/admin/collection-settings',
      iconBg: '#FEF3C7',
      icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
      ),
    },
    {
      title: 'Zone Status',
      href: '/admin/zone-status',
      iconBg: '#DBEAFE',
      icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
      ),
    },
    {
      title: 'Feedback',
      href: '/admin/feedback',
      iconBg: '#EDE9FE',
      icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
      ),
    },
    {
      title: 'Users',
      href: '/admin/users',
      iconBg: '#FEE2E2',
      icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
      ),
    },
  ]

  return (
      <div style={styles.page}>
        {/* Status bar spacer */}
        <div style={styles.statusBar} />

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <p style={styles.greeting}>Assalamu Alaikum</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={styles.pageTitle}>{userProfile?.full_name || 'Dashboard'}</h1>
              {userProfile?.role && (
                  <span style={{
                    ...styles.roleBadge,
                    background: '#FEE2E2',
                    color: '#DC2626',
                  }}>
                {isDev ? 'Dev' : 'Admin'}
              </span>
              )}
            </div>
          </div>
          <div style={styles.settingsBtn} onClick={() => navigate('/profile')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={styles.scroll}>
          {/* Manage section — compact button grid */}
          <p style={styles.sectionTitle}>Manage</p>
          <div style={styles.manageGrid}>
            {manageItems.map((item, i) => (
                <div key={i} style={styles.manageBtn} onClick={() => navigate(item.href)}>
                  <div style={{ ...styles.manageBtnIcon, background: item.iconBg }}>
                    {item.icon}
                  </div>
                  <span style={styles.manageBtnLabel}>{item.title}</span>
                </div>
            ))}
          </div>

          {/* ─── Thaali Voting Section ─── */}
          <div style={{ marginTop: 16 }}>
            <div style={styles.weekHeader}>
              <p style={styles.weekLabel}>This Week's Thaali</p>
              <span style={styles.weekBadge}>Week {getWeekNumber(weekStart)}</span>
            </div>

            {loading ? (
                <PageLoader message="Loading menus..." />
            ) : thaaliPhase === 'hidden' ? (
                <div className="field-card" style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 24 }}>
                  Menu will be available on Monday
                </div>
            ) : menus.length === 0 ? (
                <div className="field-card" style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 24 }}>
                  No menus set for this week
                </div>
            ) : (
                <>
                  {votingLocked && (
                      <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <span style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>Voting closed — selections are locked until next week</span>
                      </div>
                  )}
                  {menus.map(menu => {
                    const sel = selections[menu.menu_number]
                    const isOptedIn = sel?.opted_in || false
                    const isSaving = saving === menu.menu_number
                    const isDisabled = votingLocked || isSaving

                    const optionals = [
                      menu.roti && { key: 'wants_roti', label: 'Roti', value: menu.roti, field: 'wants_roti' },
                      menu.dessert && { key: 'wants_dessert', label: 'Dessert', value: menu.dessert, field: 'wants_dessert' },
                      menu.fruit && { key: 'wants_fruit', label: 'Fruit', value: menu.fruit, field: 'wants_fruit' },
                    ].filter(Boolean)

                    return (
                        <div key={menu.id} style={{
                          ...styles.menuCard,
                          borderColor: isOptedIn ? 'var(--primary)' : '#E5E7EB',
                          opacity: votingLocked ? 0.7 : 1,
                        }}>
                          <div style={styles.menuCardHeader}>
                      <span style={styles.menuLabel}>
                        {menuLabels[menu.menu_number - 1] || `Menu ${menu.menu_number}`}
                      </span>
                            <button
                                style={{
                                  ...styles.optBtn,
                                  background: isOptedIn ? 'var(--primary)' : 'white',
                                  color: isOptedIn ? 'white' : 'var(--primary)',
                                  borderColor: 'var(--primary)',
                                  opacity: isDisabled ? 0.6 : 1,
                                  cursor: isDisabled ? 'default' : 'pointer',
                                }}
                                onClick={() => !isDisabled && toggleOptIn(menu.menu_number)}
                                disabled={isDisabled}
                            >
                              {isSaving ? '...' : votingLocked ? (isOptedIn ? '🔒 Locked' : '🔒 Closed') : isOptedIn ? '✓ Opted in' : 'Opt in'}
                            </button>
                          </div>

                          <div style={styles.mainDishRow}>
                      <span style={{
                        ...styles.dishBadge,
                        background: mainBadge.bg,
                        color: mainBadge.color,
                      }}>Main</span>
                            <p style={styles.mainDishName}>{menu.main_dish}</p>
                          </div>

                          {optionals.length > 0 && (
                              <div style={styles.optionalsWrap}>
                                {optionals.map(item => {
                                  const isSelected = sel?.[item.field] ?? true
                                  const colors = (isOptedIn && isSelected) ? badgeColor.selected : badgeColor.unselected

                                  return (
                                      <div
                                          key={item.key}
                                          style={{
                                            ...styles.optionalRow,
                                            opacity: isOptedIn ? 1 : 0.5,
                                            cursor: (isOptedIn && !votingLocked) ? 'pointer' : 'default',
                                          }}
                                          onClick={() => isOptedIn && !votingLocked && toggleOptional(menu.menu_number, item.field)}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                <span style={{
                                  ...styles.dishBadge,
                                  background: colors.bg,
                                  color: colors.color,
                                  fontSize: 10,
                                  padding: '2px 8px',
                                }}>{item.label}</span>
                                          <span style={styles.optionalName}>{item.value}</span>
                                        </div>
                                        {isOptedIn && (
                                            <div style={{
                                              ...styles.checkBox,
                                              background: isSelected ? 'var(--primary)' : 'white',
                                              borderColor: isSelected ? 'var(--primary)' : '#D1D5DB',
                                            }}>
                                              {isSelected && (
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                                              )}
                                            </div>
                                        )}
                                      </div>
                                  )
                                })}
                              </div>
                          )}
                        </div>
                    )
                  })}
                </>
            )}
          </div>

          {/* Developer section — only for dev role */}
          {isDev && (
              <>
                <p style={{ ...styles.sectionTitle, marginTop: 16 }}>Developer</p>
                <div className="card" style={{ padding: 16, fontSize: 13, lineHeight: 1.8 }}>
                  <p>Project: <code style={styles.code}>kngqrmlegpsrlexopsxj</code></p>
                  <p>Region: <code style={styles.code}>eu-north-1</code></p>
                  <p>Role: <strong>dev</strong> — full superuser access</p>
                </div>
              </>
          )}

          {/* Bottom spacer — clears BottomNav */}
          <div style={{ height: 100 }} />
        </div>

        <BottomNav />
      </div>
  )
}

/* ---- Inline styles ---- */
const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    background: 'var(--bg)',
  },
  statusBar: {
    height: 44,
    flexShrink: 0,
  },
  header: {
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1A1A1A',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  greeting: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: 500,
    margin: 0,
    marginBlockEnd: 2,
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 6,
    flexShrink: 0,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#FEE2E2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px',
    WebkitOverflowScrolling: 'touch',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    margin: 0,
    marginBlockEnd: 10,
  },
  manageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 8,
  },
  manageBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '14px 6px 12px',
    background: 'white',
    borderRadius: 12,
    border: '1px solid #E5E7EB',
    cursor: 'pointer',
  },
  manageBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtnLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 1.2,
  },
  // Thaali voting styles
  weekHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1A1A1A',
  },
  weekBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--primary)',
    background: '#E8F5EE',
    padding: '4px 10px',
    borderRadius: 6,
  },
  menuCard: {
    background: 'white',
    borderRadius: 14,
    border: '1.5px solid',
    marginBottom: 12,
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  menuCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #F3F4F6',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1A1A1A',
  },
  optBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1.5px solid',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  mainDishRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px 8px',
  },
  mainDishName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1A1A1A',
  },
  dishBadge: {
    padding: '3px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  },
  optionalsWrap: {
    padding: '0 16px 12px',
  },
  optionalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderTop: '1px solid #F3F4F6',
    cursor: 'pointer',
  },
  optionalName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  code: {
    background: 'var(--bg)',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 12,
  },
}