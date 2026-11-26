import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import PageLoader from '../components/PageLoader'

/*
 * AdminReports — Weekly reports with 3 tabs
 *   Zone Breakdown: thaali counts per zone per menu day
 *   Feedback Overview: aggregated feedback responses per menu
 *   User Participation: opt-in rate, feedback rate, per-user breakdown
 */

const ZONES = ['Dortmund', 'Essen', 'Düsseldorf', 'Köln']

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

function getWeekDates(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  const fmt = dt => dt.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  return `${fmt(d)} – ${fmt(end)}`
}

function fmtDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function AdminReports() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeTab, setActiveTab] = useState('zone')
  const [loading, setLoading] = useState(true)

  // Data
  const [menus, setMenus] = useState([])
  const [selections, setSelections] = useState([])
  const [feedbackResponses, setFeedbackResponses] = useState([])
  const [profiles, setProfiles] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)

  const weekStart = getWeekStart(weekOffset)

  useEffect(() => {
    fetchData()
  }, [weekStart])

  async function fetchData() {
    setLoading(true)

    const [menuRes, selRes, fbRes, profileRes, userCountRes] = await Promise.all([
      supabase.from('menus').select('*').eq('week_start', weekStart).order('menu_number'),
      supabase.from('thaali_selections').select('*').eq('week_start', weekStart),
      supabase.from('feedback_responses').select('*'),
      supabase.from('users').select('id, full_name, city'),
      supabase.from('users').select('*', { count: 'exact', head: true }),
    ])

    setMenus(menuRes.data || [])
    setSelections(selRes.data || [])
    setProfiles(profileRes.data || [])
    setTotalUsers(userCountRes.count || 0)

    // Fetch feedback responses for this week's menus
    const menuIds = (menuRes.data || []).map(m => m.id)
    if (menuIds.length > 0) {
      const { data: fbData } = await supabase
          .from('feedback_responses')
          .select('*')
          .in('menu_id', menuIds)
      setFeedbackResponses(fbData || [])
    } else {
      setFeedbackResponses([])
    }

    setLoading(false)
  }

  // ---- Computed data ----

  // Zone breakdown: per menu day, count opted-in users by zone
  const zoneData = useMemo(() => {
    const profileMap = {}
    for (const p of profiles) profileMap[p.id] = p

    // Group selections by menu date
    const menuDates = menus.map(m => ({ id: m.id, date: m.date, dish: m.dish_name || m.menu_items }))

    return menuDates.map(menu => {
      const menuSelections = selections.filter(s => s.opted_in)
      // We need to match selections to menus — selections have week_start but not menu_id
      // Count by zone from profiles
      const zoneCounts = {}
      for (const z of ZONES) zoneCounts[z] = 0

      for (const sel of menuSelections) {
        const profile = profileMap[sel.user_id]
        if (profile && profile.city) {
          const zone = ZONES.find(z => z.toLowerCase() === profile.city.toLowerCase())
          if (zone) zoneCounts[zone]++
        }
      }

      const total = Object.values(zoneCounts).reduce((a, b) => a + b, 0)
      return { ...menu, zoneCounts, total }
    })
  }, [menus, selections, profiles])

  // Total opted in this week
  const totalOptedIn = selections.filter(s => s.opted_in).length

  // Feedback aggregation
  const feedbackAgg = useMemo(() => {
    if (feedbackResponses.length === 0) return null

    const count = (field, value) =>
        feedbackResponses.filter(r => r[field] === value).length

    const total = feedbackResponses.length
    const mostCommon = (field, options) => {
      let best = options[0], bestCount = 0
      for (const opt of options) {
        const c = count(field, opt)
        if (c > bestCount) { best = opt; bestCount = c }
      }
      return { value: best, count: bestCount, pct: total > 0 ? Math.round((bestCount / total) * 100) : 0 }
    }

    return {
      total,
      portion: mostCommon('portion', ['Too Little', 'Just Right', 'Too Much']),
      taste: mostCommon('taste', ['Poor', 'Average', 'Good', 'Excellent']),
      oiliness: mostCommon('oiliness', ['Too Oily', 'Just Right', 'Too Dry']),
    }
  }, [feedbackResponses])

  // Per-menu feedback breakdown
  const perMenuFeedback = useMemo(() => {
    return menus.map(menu => {
      const fb = feedbackResponses.filter(r => r.menu_id === menu.id)
      return {
        date: menu.date,
        dish: menu.dish_name || menu.menu_items || '—',
        responses: fb.length,
      }
    })
  }, [menus, feedbackResponses])

  // User participation
  const participation = useMemo(() => {
    const optedInCount = selections.filter(s => s.opted_in).length
    const feedbackCount = feedbackResponses.length
    const optInRate = totalUsers > 0 ? Math.round((optedInCount / totalUsers) * 100) : 0
    const feedbackRate = optedInCount > 0 ? Math.round((feedbackCount / optedInCount) * 100) : 0

    // Per-zone participation
    const zoneStats = ZONES.map(zone => {
      const zoneUsers = profiles.filter(p => p.city && p.city.toLowerCase() === zone.toLowerCase())
      const zoneOptedIn = selections.filter(s => {
        const p = profiles.find(pr => pr.id === s.user_id)
        return s.opted_in && p && p.city && p.city.toLowerCase() === zone.toLowerCase()
      }).length
      return {
        zone,
        total: zoneUsers.length,
        optedIn: zoneOptedIn,
        rate: zoneUsers.length > 0 ? Math.round((zoneOptedIn / zoneUsers.length) * 100) : 0,
      }
    })

    return { optedInCount, feedbackCount, optInRate, feedbackRate, zoneStats }
  }, [selections, feedbackResponses, profiles, totalUsers])

  const tabs = [
    { id: 'zone', label: 'Zone Breakdown' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'users', label: 'Participation' },
  ]

  return (
      <div style={styles.page}>
        <div style={styles.statusBar} />

        <div style={styles.header}>
          <div>
            <p style={styles.adminLabel}>Admin Panel</p>
            <h1 style={styles.pageTitle}>Reports</h1>
          </div>
        </div>

        <div style={styles.scroll}>
          {/* Week navigator */}
          <div style={styles.weekNav}>
            <div style={styles.navArrow} onClick={() => setWeekOffset(o => o - 1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </div>
            <p style={styles.weekLabel}>Week {getWeekNumber(weekStart)} — {getWeekDates(weekStart)}</p>
            <div style={styles.navArrow} onClick={() => setWeekOffset(o => o + 1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>

          {/* Top stats */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <p style={{ ...styles.statNumber, color: 'var(--primary)' }}>{loading ? '—' : totalOptedIn}</p>
              <p style={styles.statLabel}>Opted in</p>
            </div>
            <div style={styles.statCard}>
              <p style={{ ...styles.statNumber, color: '#7C3AED' }}>{loading ? '—' : feedbackResponses.length}</p>
              <p style={styles.statLabel}>Feedback</p>
            </div>
            <div style={styles.statCard}>
              <p style={{ ...styles.statNumber, color: '#D97706' }}>{loading ? '—' : menus.length}</p>
              <p style={styles.statLabel}>Menus</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={styles.tabBar}>
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    style={{
                      ...styles.tab,
                      ...(activeTab === tab.id ? styles.tabActive : styles.tabInactive),
                    }}
                    onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </div>
            ))}
          </div>

          {loading ? (
              <PageLoader />
          ) : (
              <>
                {/* ---- ZONE BREAKDOWN ---- */}
                {activeTab === 'zone' && (
                    <>
                      {menus.length === 0 ? (
                          <div className="field-card" style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 24 }}>
                            No menus set for this week
                          </div>
                      ) : (
                          <div className="field-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={styles.tableHeader}>
                              <p style={styles.th}>Zone</p>
                              {menus.map(m => (
                                  <p key={m.id} style={{ ...styles.th, textAlign: 'center' }}>{fmtDay(m.date)}</p>
                              ))}
                              <p style={{ ...styles.th, textAlign: 'center' }}>Total</p>
                            </div>
                            {ZONES.map((zone, i) => {
                              const zoneProfiles = profiles.filter(p => p.city && p.city.toLowerCase() === zone.toLowerCase())
                              // For now, we show opted-in count per zone (not per menu day since selections are per-week)
                              const zoneOptedIn = selections.filter(s => {
                                const p = profiles.find(pr => pr.id === s.user_id)
                                return s.opted_in && p && p.city && p.city.toLowerCase() === zone.toLowerCase()
                              }).length
                              return (
                                  <div key={zone} style={{
                                    ...styles.tableRow,
                                    gridTemplateColumns: `1.5fr ${menus.map(() => '0.7fr').join(' ')} 0.7fr`,
                                    background: i % 2 === 1 ? '#FAFAF7' : 'white',
                                  }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{zone}</p>
                                    {menus.map(m => (
                                        <p key={m.id} style={{ fontSize: 13, textAlign: 'center', color: '#374151' }}>{zoneOptedIn}</p>
                                    ))}
                                    <p style={{ fontSize: 13, textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{zoneOptedIn}</p>
                                  </div>
                              )
                            })}
                            {/* Totals row */}
                            <div style={{
                              ...styles.tableRow,
                              gridTemplateColumns: `1.5fr ${menus.map(() => '0.7fr').join(' ')} 0.7fr`,
                              background: '#F0FDF4',
                              borderTop: '2px solid #86EFAC',
                            }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>Total</p>
                              {menus.map(m => (
                                  <p key={m.id} style={{ fontSize: 13, textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{totalOptedIn}</p>
                              ))}
                              <p style={{ fontSize: 13, textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{totalOptedIn}</p>
                            </div>
                          </div>
                      )}

                      {/* Zone user counts */}
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginTop: 16, marginBottom: 8 }}>Registered Users per Zone</p>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        {ZONES.map(zone => {
                          const count = profiles.filter(p => p.city && p.city.toLowerCase() === zone.toLowerCase()).length
                          return (
                              <div key={zone} style={styles.miniCard}>
                                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{count}</p>
                                <p style={{ fontSize: 10, color: '#6B7280' }}>{zone}</p>
                              </div>
                          )
                        })}
                      </div>
                    </>
                )}

                {/* ---- FEEDBACK OVERVIEW ---- */}
                {activeTab === 'feedback' && (
                    <>
                      {!feedbackAgg ? (
                          <div className="field-card" style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 24 }}>
                            No feedback submitted this week
                          </div>
                      ) : (
                          <>
                            <div className="field-card">
                              <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                                {feedbackAgg.total} response{feedbackAgg.total !== 1 ? 's' : ''} this week
                              </p>
                              {[
                                { label: 'Portion Size', data: feedbackAgg.portion, color: 'var(--primary)' },
                                { label: 'Taste', data: feedbackAgg.taste, color: '#D97706' },
                                { label: 'Oiliness', data: feedbackAgg.oiliness, color: '#7C3AED' },
                              ].map((item, i) => (
                                  <div key={i} style={styles.feedbackRow}>
                                    <div>
                                      <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{item.label}</p>
                                      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                                        Most common: {item.data.value}
                                      </p>
                                    </div>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.data.pct}%</span>
                                  </div>
                              ))}
                            </div>

                            {/* Per-menu feedback counts */}
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginTop: 16, marginBottom: 8 }}>Per Menu</p>
                            <div className="field-card" style={{ padding: 0, overflow: 'hidden' }}>
                              {perMenuFeedback.map((m, i) => (
                                  <div key={i} style={{ ...styles.entryRow, background: i % 2 === 1 ? '#FAFAF7' : 'white' }}>
                                    <div style={{ flex: 1 }}>
                                      <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{m.dish}</p>
                                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{fmtDay(m.date)}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <p style={{ fontSize: 16, fontWeight: 700, color: '#7C3AED' }}>{m.responses}</p>
                                      <p style={{ fontSize: 10, color: '#9CA3AF' }}>responses</p>
                                    </div>
                                  </div>
                              ))}
                            </div>
                          </>
                      )}
                    </>
                )}

                {/* ---- USER PARTICIPATION ---- */}
                {activeTab === 'users' && (
                    <>
                      {/* Rate cards */}
                      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                        <div style={styles.rateCard}>
                          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{participation.optInRate}%</p>
                          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Opt-in rate</p>
                          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{participation.optedInCount} of {totalUsers} users</p>
                        </div>
                        <div style={styles.rateCard}>
                          <p style={{ fontSize: 28, fontWeight: 700, color: '#D97706' }}>{participation.feedbackRate}%</p>
                          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Feedback rate</p>
                          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{participation.feedbackCount} of {participation.optedInCount} opted-in</p>
                        </div>
                      </div>

                      {/* Per-zone participation */}
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Zone Participation</p>
                      <div className="field-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ ...styles.tableHeader, gridTemplateColumns: '1.5fr 0.7fr 0.7fr 0.7fr' }}>
                          <p style={styles.th}>Zone</p>
                          <p style={{ ...styles.th, textAlign: 'center' }}>Users</p>
                          <p style={{ ...styles.th, textAlign: 'center' }}>Opted In</p>
                          <p style={{ ...styles.th, textAlign: 'center' }}>Rate</p>
                        </div>
                        {participation.zoneStats.map((z, i) => (
                            <div key={z.zone} style={{
                              ...styles.tableRow,
                              gridTemplateColumns: '1.5fr 0.7fr 0.7fr 0.7fr',
                              background: i % 2 === 1 ? '#FAFAF7' : 'white',
                            }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{z.zone}</p>
                              <p style={{ fontSize: 13, textAlign: 'center', color: '#374151' }}>{z.total}</p>
                              <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--primary)', fontWeight: 600 }}>{z.optedIn}</p>
                              <p style={{ fontSize: 13, textAlign: 'center', fontWeight: 700, color: z.rate >= 70 ? 'var(--primary)' : z.rate >= 40 ? '#D97706' : '#DC2626' }}>
                                {z.rate}%
                              </p>
                            </div>
                        ))}
                      </div>

                      {/* Not opted in users */}
                      {(() => {
                        const optedInIds = new Set(selections.filter(s => s.opted_in).map(s => s.user_id))
                        const notOptedIn = profiles.filter(p => !optedInIds.has(p.id))
                        if (notOptedIn.length === 0) return null
                        return (
                            <>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginTop: 16, marginBottom: 8 }}>
                                Not Opted In ({notOptedIn.length})
                              </p>
                              <div className="field-card" style={{ padding: 0, overflow: 'hidden' }}>
                                {notOptedIn.slice(0, 20).map((p, i) => (
                                    <div key={p.id} style={{ ...styles.entryRow, background: i % 2 === 1 ? '#FAFAF7' : 'white' }}>
                                      <p style={{ fontSize: 13, color: '#374151' }}>{p.full_name || '—'}</p>
                                      <p style={{ fontSize: 11, color: '#9CA3AF' }}>{p.city || '—'}</p>
                                    </div>
                                ))}
                                {notOptedIn.length > 20 && (
                                    <p style={{ padding: 10, textAlign: 'center', fontSize: 11, color: '#9CA3AF' }}>
                                      +{notOptedIn.length - 20} more
                                    </p>
                                )}
                              </div>
                            </>
                        )
                      })()}
                    </>
                )}
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
    flexShrink: 0,
    marginBottom: 16,
  },
  adminLabel: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: 600,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1A1A1A',
    marginTop: 4,
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px',
    WebkitOverflowScrolling: 'touch',
  },
  weekNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'white',
    border: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
  },
  statsRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    background: 'var(--surface)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    padding: '14px 12px',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 500,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tabBar: {
    display: 'flex',
    background: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    textAlign: 'center',
    padding: '8px 4px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'white',
    color: '#374151',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  tabInactive: {
    background: 'transparent',
    color: '#6B7280',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 0.7fr 0.7fr 0.7fr',
    padding: '10px 14px',
    background: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  th: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 0.7fr 0.7fr 0.7fr',
    padding: '11px 14px',
    borderTop: '1px solid #F3F4F6',
    alignItems: 'center',
  },
  feedbackRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #F3F4F6',
  },
  entryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '12px 14px',
    borderTop: '1px solid #F3F4F6',
  },
  miniCard: {
    flex: 1,
    background: 'var(--surface)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    padding: '10px 8px',
    textAlign: 'center',
  },
  rateCard: {
    flex: 1,
    background: 'var(--surface)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    padding: '16px 12px',
    textAlign: 'center',
  },
}