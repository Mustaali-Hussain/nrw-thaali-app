import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'
import PageLoader from '../components/PageLoader'

/*
 * AdminFeedback — Week-based feedback management
 *
 * Shows menus for the selected week (fetched from menus table).
 * Admin can toggle feedback on/off per menu.
 * When enabled, users see the feedback form for that menu.
 * Shows response counts and summary per menu.
 */

function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1
}

function getWeekDates(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = d => `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`
  return `${fmt(monday)} – ${fmt(sunday)}`
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  const yyyy = monday.getFullYear()
  const mm = String(monday.getMonth() + 1).padStart(2, '0')
  const dd = String(monday.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function AdminFeedback() {
  const [now] = useState(new Date())
  const [weekOffset, setWeekOffset] = useState(0)

  const currentDate = new Date(now)
  currentDate.setDate(currentDate.getDate() + weekOffset * 7)

  const weekNum = getWeekNumber(currentDate)
  const weekDates = getWeekDates(currentDate)
  const weekStart = getWeekStart(currentDate)

  const [menus, setMenus] = useState([])
  const [feedbackStatus, setFeedbackStatus] = useState({}) // { menu_id: { enabled, response_count } }
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null) // menu_id being toggled

  useEffect(() => {
    fetchData()
  }, [weekOffset])

  async function fetchData() {
    setLoading(true)

    // Fetch menus for this week
    const { data: menuData, error: menuErr } = await supabase
        .from('menus')
        .select('*')
        .eq('week_start', weekStart)
        .order('menu_number')

    if (menuErr) {
      console.error('Fetch menus error:', menuErr)
      setMenus([])
      setFeedbackStatus({})
      setLoading(false)
      return
    }

    setMenus(menuData || [])

    // Fetch feedback toggle status for these menus
    if (menuData && menuData.length > 0) {
      const menuIds = menuData.map(m => m.id)

      const { data: toggleData } = await supabase
          .from('feedback_toggles')
          .select('*')
          .in('menu_id', menuIds)

      // Fetch response counts
      const { data: responseCounts } = await supabase
          .from('feedback_responses')
          .select('menu_id')
          .in('menu_id', menuIds)

      // Fetch total opted-in thaalis for this week
      const { count: optedCount } = await supabase
          .from('thaali_selections')
          .select('*', { count: 'exact', head: true })
          .eq('week_start', weekStart)
          .eq('opted_in', true)

      const totalOpted = optedCount || 0

      const countMap = {}
      if (responseCounts) {
        responseCounts.forEach(r => {
          countMap[r.menu_id] = (countMap[r.menu_id] || 0) + 1
        })
      }

      const statusMap = {}
      if (toggleData) {
        toggleData.forEach(t => {
          statusMap[t.menu_id] = {
            id: t.id,
            enabled: t.enabled,
            response_count: countMap[t.menu_id] || 0,
            total_opted: totalOpted,
          }
        })
      }

      // Fill in menus with no toggle row yet
      menuData.forEach(m => {
        if (!statusMap[m.id]) {
          statusMap[m.id] = {
            id: null,
            enabled: false,
            response_count: countMap[m.id] || 0,
            total_opted: totalOpted,
          }
        }
      })

      setFeedbackStatus(statusMap)
    } else {
      setFeedbackStatus({})
    }

    setLoading(false)
  }

  async function handleToggle(menu) {
    const current = feedbackStatus[menu.id]
    const newEnabled = !(current?.enabled)
    setToggling(menu.id)

    if (current?.id) {
      // Update existing toggle row
      const { error } = await supabase
          .from('feedback_toggles')
          .update({ enabled: newEnabled })
          .eq('id', current.id)

      if (!error) {
        setFeedbackStatus(prev => ({
          ...prev,
          [menu.id]: { ...prev[menu.id], enabled: newEnabled },
        }))
      }
    } else {
      // Insert new toggle row
      const { data, error } = await supabase
          .from('feedback_toggles')
          .insert({ menu_id: menu.id, enabled: newEnabled })
          .select('id')
          .single()

      if (!error && data) {
        setFeedbackStatus(prev => ({
          ...prev,
          [menu.id]: { ...prev[menu.id], id: data.id, enabled: newEnabled },
        }))
      }
    }

    setToggling(null)
  }

  function menuSummary(menu) {
    const parts = [menu.main_dish]
    if (menu.roti) parts.push(menu.roti)
    if (menu.dessert) parts.push(menu.dessert)
    if (menu.fruit) parts.push(menu.fruit)
    return parts.join(', ')
  }

  if (loading) {
    return (
        <div style={styles.page}>
          <BackHeader title="Feedback Forms" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <PageLoader />
          </div>
        </div>
    )
  }

  return (
      <div style={styles.page}>
        <div style={{ height: 44, flexShrink: 0 }} />
        <BackHeader title="Feedback Forms" />

        <div style={styles.scroll}>
          {/* Week navigator */}
          <div style={styles.weekNav}>
            <div style={styles.navArrow} onClick={() => setWeekOffset(w => w - 1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={styles.weekLabel}>Week {weekNum}</p>
              <p style={styles.weekDates}>{weekDates}</p>
            </div>
            <div style={styles.navArrow} onClick={() => setWeekOffset(w => w + 1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>

          <p style={styles.desc}>
            Toggle feedback on to allow users to submit feedback for each menu.
          </p>

          {menus.length === 0 ? (
              <div className="field-card" style={{ textAlign: 'center', padding: '32px 16px' }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}>📋</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  No menus set
                </p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                  Set menus for this week first, then enable feedback here.
                </p>
              </div>
          ) : (
              menus.map(menu => {
                const status = feedbackStatus[menu.id] || { enabled: false, response_count: 0 }
                const isToggling = toggling === menu.id

                return (
                    <div key={menu.id} className="field-card" style={styles.card}>
                      {/* Header with toggle */}
                      <div style={styles.cardHeader}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={styles.menuBadge}>Menu {menu.menu_number}</span>
                        </div>
                        <div
                            style={{
                              ...styles.toggle,
                              background: status.enabled ? 'var(--primary)' : '#D1D5DB',
                              opacity: isToggling ? 0.6 : 1,
                              pointerEvents: isToggling ? 'none' : 'auto',
                            }}
                            onClick={() => handleToggle(menu)}
                        >
                          <div style={{
                            ...styles.toggleKnob,
                            transform: status.enabled ? 'translateX(18px)' : 'translateX(2px)',
                          }} />
                        </div>
                      </div>

                      {/* Menu items */}
                      <p style={styles.menuText}>{menuSummary(menu)}</p>

                      {/* Stats row */}
                      <div style={styles.statsRow}>
                        <div style={styles.stat}>
                          <p style={{ ...styles.statNum, color: 'var(--primary)' }}>{status.total_opted}</p>
                          <p style={styles.statLabel}>Opted In</p>
                        </div>
                        <div style={styles.stat}>
                          <p style={{ ...styles.statNum, color: 'var(--primary)' }}>{status.response_count}</p>
                          <p style={styles.statLabel}>Submitted</p>
                        </div>
                        <div style={styles.stat}>
                          <p style={{
                            ...styles.statNum,
                            color: (status.total_opted - status.response_count) > 0 ? '#D97706' : 'var(--primary)',
                          }}>
                            {Math.max(0, status.total_opted - status.response_count)}
                          </p>
                          <p style={styles.statLabel}>Pending</p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{ marginTop: 2 }}>
                        {status.enabled ? (
                            <span style={styles.enabledBadge}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      Feedback enabled
                    </span>
                        ) : (
                            <span style={styles.disabledBadge}>Feedback disabled</span>
                        )}
                      </div>
                    </div>
                )
              })
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
    marginBottom: 16,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'white',
    border: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1A1A1A',
    margin: 0,
  },
  weekDates: {
    fontSize: 12,
    color: '#6B7280',
    margin: 0,
    marginTop: 2,
  },
  desc: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuBadge: {
    fontSize: 14,
    fontWeight: 700,
    color: 'white',
    background: 'var(--primary)',
    padding: '3px 10px',
    borderRadius: 6,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'white',
    position: 'absolute',
    top: 2,
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  },
  menuText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  statsRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 10,
  },
  stat: {
    flex: 1,
    background: '#FAFAF7',
    borderRadius: 10,
    padding: '10px 6px',
    textAlign: 'center',
    border: '1px solid var(--border)',
  },
  statNum: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    margin: 0,
  },
  enabledBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#1B7A4A',
    background: '#E8F5EE',
    padding: '4px 10px',
    borderRadius: 6,
  },
  disabledBadge: {
    fontSize: 11,
    fontWeight: 500,
    color: '#9CA3AF',
    background: '#F3F4F6',
    padding: '4px 10px',
    borderRadius: 6,
  },
}