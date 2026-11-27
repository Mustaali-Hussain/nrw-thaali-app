import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import PageLoader from '../components/PageLoader'

/*
 * User Dashboard (Home screen)
 * Shows this week's menus with inline opt-in + optional item toggles.
 * Menu display and opt-in are merged into one card per menu.
 */

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
 * Thu–Fri: menus visible, voting locked (khidmatguzar needs final count)
 * Sat–Sun: menus hidden entirely
 */
function getThaaliPhase() {
  const day = new Date().getDay() // 0=Sun … 6=Sat
  if (day === 0 || day === 6) return 'hidden'
  if (day >= 4) return 'locked'
  return 'open'
}

export default function Dashboard() {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [menus, setMenus] = useState([])
  // { menu_number: { id, opted_in, wants_roti, wants_dessert, wants_fruit } }
  const [selections, setSelections] = useState({})
  const [feedbackToggles, setFeedbackToggles] = useState({})
  const [myFeedback, setMyFeedback] = useState({})
  const [collectionInfo, setCollectionInfo] = useState(null)
  const [collectingCity, setCollectingCity] = useState(null) // city user volunteered for
  const [saving, setSaving] = useState(null)

  const weekStart = getWeekStart()
  const thaaliPhase = getThaaliPhase() // 'open' | 'locked' | 'hidden'
  const votingLocked = thaaliPhase !== 'open'
  const displayName = userProfile?.full_name || userProfile?.email?.split('@')[0] || 'User'
  const userCity = userProfile?.city || ''

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  async function fetchData() {
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

    if (menuData.length > 0) {
      const menuIds = menuData.map(m => m.id)
      const [toggleRes, fbRes] = await Promise.all([
        supabase.from('feedback_toggles').select('menu_id, enabled').in('menu_id', menuIds),
        supabase.from('feedback_responses').select('menu_id').in('menu_id', menuIds).eq('user_id', user.id),
      ])
      const toggleMap = {}
      for (const t of (toggleRes.data || [])) toggleMap[t.menu_id] = t.enabled
      setFeedbackToggles(toggleMap)

      const fbMap = {}
      for (const f of (fbRes.data || [])) fbMap[f.menu_id] = true
      setMyFeedback(fbMap)
    }

    // Check if user volunteered to collect from a zone
    const { data: volData } = await supabase
        .from('collection_volunteers')
        .select('city')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .single()

    const myCollectCity = volData?.city || null
    setCollectingCity(myCollectCity)

    if (myCollectCity) {
      const { data: colData } = await supabase
          .from('collection_settings')
          .select('*')
          .eq('week_start', weekStart)
          .eq('city', myCollectCity)
          .single()
      setCollectionInfo(colData || null)
    } else {
      setCollectionInfo(null)
    }

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

  return (
      <div style={styles.page}>
        <div style={styles.statusBar} />

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <p style={styles.greeting}>Assalamu Alaikum</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={styles.name}>{displayName}</h1>
              <span style={styles.roleBadge}>User</span>
            </div>
          </div>
          <div style={styles.settingsBtn} onClick={() => navigate('/profile')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
        </div>

        <div style={styles.scroll}>
          {loading ? (
              <PageLoader message="Loading your thaali..." />
          ) : (
              <>
                {/* ─── Week header ─── */}
                <div style={styles.weekHeader}>
                  <p style={styles.sectionLabel}>This Week's Thaali</p>
                  <span style={styles.weekBadge}>Week {getWeekNumber(weekStart)}</span>
                </div>

                {thaaliPhase === 'hidden' ? (
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

                {/* ─── Collection Info ─── */}
                <p style={styles.sectionTitle}>Collection Point</p>
                {collectionInfo && collectingCity ? (
                    <div
                        onClick={() => navigate('/collection')}
                        style={{
                          background: 'white',
                          borderRadius: 14,
                          border: '1px solid #E5E7EB',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          display: 'flex',
                          marginBottom: 12,
                        }}
                    >
                      {/* Green accent bar */}
                      <div style={{ width: 4, background: 'var(--primary)', flexShrink: 0 }} />
                      <div style={{ padding: '14px 16px', flex: 1 }}>
                        {/* City name + pin icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)" stroke="none">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
                          </svg>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
                      {collectingCity.charAt(0).toUpperCase() + collectingCity.slice(1)}
                    </span>
                        </div>
                        {/* Details rows */}
                        {collectionInfo.contact_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                              </svg>
                              <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{collectionInfo.contact_name}</span>
                            </div>
                        )}
                        {collectionInfo.address && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                              </svg>
                              <span style={{ fontSize: 13, color: '#6B7280' }}>{collectionInfo.address}</span>
                            </div>
                        )}
                        {(collectionInfo.start_time || collectionInfo.end_time) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              <span style={{ fontSize: 13, color: '#6B7280' }}>
                        {collectionInfo.start_time}{collectionInfo.end_time ? ` – ${collectionInfo.end_time}` : ''}
                      </span>
                            </div>
                        )}
                      </div>
                      {/* Chevron */}
                      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </div>
                ) : (
                    <div
                        onClick={() => navigate('/collection')}
                        style={{
                          background: 'white',
                          borderRadius: 14,
                          border: '1.5px dashed #D1D5DB',
                          cursor: 'pointer',
                          textAlign: 'center',
                          padding: '20px 16px',
                          marginBottom: 12,
                        }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" style={{ marginBottom: 6 }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>No collection zone selected</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>Tap to choose a zone</p>
                    </div>
                )}

                {/* ─── Feedback banner ─── */}
                {(() => {
                  const anyEnabled = menus.some(m => feedbackToggles[m.id])
                  const hasPending = menus.some(m => feedbackToggles[m.id] && !myFeedback[m.id])
                  // 3 states: pending, submitted, not requested
                  const state = !anyEnabled ? 'none' : hasPending ? 'pending' : 'done'
                  const cfg = {
                    pending: { bg: '#FEF9E7', border: '#FDE68A', icon: '#D97706', title: '#92400E', sub: '#B45309', chev: '#D97706', label: 'Feedback submission pending', desc: "Share your feedback on this week's thaali" },
                    done:    { bg: '#E8F5EE', border: '#A7D7C5', icon: '#1B7A4A', title: '#1B7A4A', sub: '#3A9B68', chev: '#1B7A4A', label: 'Feedback submitted', desc: 'Thank you for your feedback' },
                    none:    { bg: 'white',   border: '#E5E7EB', icon: '#9CA3AF', title: '#6B7280', sub: '#9CA3AF', chev: '#D1D5DB', label: 'Feedback', desc: 'No feedback requested this week' },
                  }[state]
                  return (
                      <div
                          onClick={() => navigate('/feedback')}
                          style={{
                            background: cfg.bg,
                            borderRadius: 12,
                            border: `1px solid ${cfg.border}`,
                            padding: '12px 16px',
                            marginTop: 8,
                            marginBottom: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfg.icon} strokeWidth="2" style={{ flexShrink: 0 }}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: cfg.title }}>{cfg.label}</p>
                          <p style={{ fontSize: 12, color: cfg.sub, marginTop: 2 }}>{cfg.desc}</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cfg.chev} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                  )
                })()}
              </>
          )}

          <div style={{ height: 100 }} />
        </div>

        <BottomNav />
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
  greeting: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: 500,
    margin: 0,
    marginBlockEnd: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1A1A1A',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 6,
    flexShrink: 0,
    background: '#FEF3C7',
    color: '#D97706',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#FEF3C7',
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
  weekHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 10,
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
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#DC2626',
    color: 'white',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}