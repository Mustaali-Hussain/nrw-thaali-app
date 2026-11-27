import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import BackHeader from '../components/BackHeader'
import PageLoader from '../components/PageLoader'

function getWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const CITIES = ['dortmund', 'essen', 'düsseldorf', 'köln']
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

export default function CookingKhidmat() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [menus, setMenus] = useState([])
  const [mySignups, setMySignups] = useState({})
  const [counts, setCounts] = useState({})
  // key: "menuNumber-city" → [{ name, wants_roti, wants_dessert, wants_fruit }]
  const [userDetails, setUserDetails] = useState({})
  const [saving, setSaving] = useState(null)
  // which zone's packing list is expanded: "menuNumber-city" or null
  const [expanded, setExpanded] = useState(null)
  // city → [name1, name2, ...]
  const [collectors, setCollectors] = useState({})

  const weekStart = getWeekStart()

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    setLoading(true)
    const [menuRes, volRes, selRes, usersRes, collVolRes] = await Promise.all([
      supabase.from('menus').select('*').eq('week_start', weekStart).order('menu_number'),
      supabase.from('cooking_volunteers').select('*').eq('week_start', weekStart).eq('user_id', user.id),
      supabase.from('thaali_selections').select('user_id, menu_number, opted_in, wants_roti, wants_dessert, wants_fruit').eq('week_start', weekStart).eq('opted_in', true),
      supabase.from('users').select('id, city, full_name, username'),
      supabase.from('collection_volunteers').select('user_id, city').eq('week_start', weekStart),
    ])
    setMenus(menuRes.data || [])

    const signupMap = {}
    for (const v of (volRes.data || [])) signupMap[`${v.menu_number}-${v.city}`] = true
    setMySignups(signupMap)

    // Build user lookups
    const userCityMap = {}
    const userNameMap = {}
    for (const u of (usersRes.data || [])) {
      if (u.city) userCityMap[u.id] = u.city.toLowerCase()
      userNameMap[u.id] = u.full_name || u.username || 'User'
    }

    // Build collectors per city
    const collMap = {}
    for (const v of (collVolRes.data || [])) {
      const c = v.city?.toLowerCase()
      if (!c) continue
      if (!collMap[c]) collMap[c] = new Set()
      collMap[c].add(userNameMap[v.user_id] || 'Unknown')
    }
    for (const c in collMap) collMap[c] = [...collMap[c]]
    setCollectors(collMap)

    const countMap = {}
    const detailMap = {}
    for (const sel of (selRes.data || [])) {
      const city = userCityMap[sel.user_id]
      if (!city) continue
      const key = `${sel.menu_number}-${city}`

      if (!countMap[key]) countMap[key] = { total: 0, roti: 0, dessert: 0, fruit: 0 }
      countMap[key].total++
      if (sel.wants_roti) countMap[key].roti++
      if (sel.wants_dessert) countMap[key].dessert++
      if (sel.wants_fruit) countMap[key].fruit++

      if (!detailMap[key]) detailMap[key] = []
      detailMap[key].push({
        name: userNameMap[sel.user_id],
        wants_roti: sel.wants_roti,
        wants_dessert: sel.wants_dessert,
        wants_fruit: sel.wants_fruit,
      })
    }
    // Sort each list alphabetically
    for (const key in detailMap) detailMap[key].sort((a, b) => a.name.localeCompare(b.name))

    setCounts(countMap)
    setUserDetails(detailMap)
    setLoading(false)
  }

  async function toggleZone(menuNumber, city) {
    const key = `${menuNumber}-${city}`
    if (saving) return
    setSaving(key)
    if (mySignups[key]) {
      const { error } = await supabase.from('cooking_volunteers').delete()
          .eq('user_id', user.id).eq('week_start', weekStart)
          .eq('menu_number', menuNumber).eq('city', city)
      if (!error) setMySignups(prev => { const n = { ...prev }; delete n[key]; return n })
    } else {
      const { error } = await supabase.from('cooking_volunteers').insert({
        user_id: user.id, week_start: weekStart, menu_number: menuNumber, city,
      })
      if (!error) setMySignups(prev => ({ ...prev, [key]: true }))
    }
    setSaving(null)
  }

  const signupKeys = Object.keys(mySignups)
  const hasSignups = signupKeys.length > 0
  const summaryByMenu = {}
  for (const key of signupKeys) {
    const [mn, city] = key.split(/-(.+)/)
    if (!summaryByMenu[mn]) summaryByMenu[mn] = []
    summaryByMenu[mn].push(city)
  }

  const Check = () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1B7A4A" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
  )
  const Cross = () => (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
  )

  return (
      <div style={S.page}>
        <div style={{ height: 44, flexShrink: 0 }} />
        <BackHeader title="Cooking Khidmat" />

        <div style={S.scroll}>
          {loading ? (
              <PageLoader message="Loading cooking assignments..." />
          ) : menus.length === 0 ? (
              <div style={S.empty}>
                <span style={{ fontSize: 28 }}>👨‍🍳</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 8 }}>No menus this week</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Cooking assignments will appear once menus are set</p>
              </div>
          ) : (
              <>
                {/* ─── Zone selection — 3-column grid per menu ─── */}
                <p style={S.section}>Select zones to cook</p>

                {menus.map(menu => {
                  const mn = menu.menu_number
                  return (
                      <div key={menu.id} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Menu {mn}</span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>· {menu.main_dish}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          {CITIES.map(city => {
                            const key = `${mn}-${city}`
                            const on = !!mySignups[key]
                            const busy = saving === key
                            return (
                                <div key={city} onClick={() => toggleZone(mn, city)}
                                     style={{
                                       flex: 1, textAlign: 'center', padding: '7px 0',
                                       borderRadius: 8, border: '1.5px solid',
                                       borderColor: on ? '#7C3AED' : '#E5E7EB',
                                       background: on ? '#EDE9FE' : 'white',
                                       cursor: 'pointer', opacity: busy ? 0.5 : 1,
                                       transition: 'all 0.15s',
                                     }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: on ? '#7C3AED' : '#374151' }}>{cap(city)}</span>
                                </div>
                            )
                          })}
                        </div>
                      </div>
                  )
                })}

                {/* ─── Summary ─── */}
                {hasSignups && (
                    <>
                      <div style={{ height: 1, background: '#E5E7EB', margin: '4px 0 14px' }} />
                      <p style={S.section}>Your Cooking Summary</p>

                      {Object.keys(summaryByMenu).sort().map(mn => {
                        const cities = summaryByMenu[mn].sort()
                        const menu = menus.find(m => m.menu_number === Number(mn))
                        if (!menu) return null

                        let menuTotal = 0, menuRoti = 0, menuDessert = 0, menuFruit = 0
                        for (const c of cities) {
                          const ct = counts[`${mn}-${c}`]
                          if (ct) { menuTotal += ct.total; menuRoti += ct.roti; menuDessert += ct.dessert; menuFruit += ct.fruit }
                        }

                        const items = [{ label: menu.main_dish, count: menuTotal, accent: true }]
                        if (menu.roti) items.push({ label: menu.roti, count: menuRoti })
                        if (menu.dessert) items.push({ label: menu.dessert, count: menuDessert })
                        if (menu.fruit) items.push({ label: menu.fruit, count: menuFruit })

                        const optCols = []
                        if (menu.roti) optCols.push({ key: 'wants_roti', label: menu.roti })
                        if (menu.dessert) optCols.push({ key: 'wants_dessert', label: menu.dessert })
                        if (menu.fruit) optCols.push({ key: 'wants_fruit', label: menu.fruit })

                        return (
                            <div key={mn} style={S.summaryCard}>
                              {/* Header */}
                              <div style={S.summaryHeader}>
                                <div>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Menu {mn}</span>
                                  <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 8 }}>
                            {cities.map(cap).join(', ')}
                          </span>
                                </div>
                                <div style={S.totalBadge}>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED' }}>{menuTotal}</span>
                                  <span style={{ fontSize: 9, color: '#7C3AED', fontWeight: 600 }}>thaalis</span>
                                </div>
                              </div>

                              {/* Items table */}
                              <div style={{ padding: '0 12px 6px' }}>
                                {items.map((item, i) => (
                                    <div key={i} style={{
                                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                      padding: '6px 0', borderTop: i > 0 ? '1px solid #F3F4F6' : 'none',
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={item.accent ? S.tagMain : S.tagOpt}>{item.accent ? 'Main' : 'Optional'}</span>
                                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{item.label}</span>
                                      </div>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: item.accent ? '#1A1A1A' : '#6B7280' }}>×{item.count}</span>
                                    </div>
                                ))}
                              </div>

                              {/* Per-zone packing lists */}
                              {cities.map(city => {
                                const key = `${mn}-${city}`
                                const users = userDetails[key] || []
                                const ct = counts[key] || { total: 0 }
                                const isOpen = expanded === key

                                return (
                                    <div key={city} style={{ borderTop: '1px solid #F3F4F6' }}>
                                      {/* Zone header — tap to expand */}
                                      <div onClick={() => setExpanded(isOpen ? null : key)} style={S.zoneListHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#7C3AED" stroke="none">
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
                                          </svg>
                                          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{cap(city)}</span>
                                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {ct.total} thaali{ct.total !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 10, color: '#7C3AED', fontWeight: 600 }}>
                                  {isOpen ? 'Hide' : 'Packing list'}
                                </span>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"
                                               style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                            <path d="M6 9l6 6 6-6"/>
                                          </svg>
                                        </div>
                                      </div>

                                      {/* Collecting volunteers for this zone */}
                                      {isOpen && collectors[city] && collectors[city].length > 0 && (
                                          <div style={{ padding: '6px 12px 8px', background: '#F0FAF4', margin: '0 8px', borderRadius: 8, marginTop: 10, marginBottom: 6 }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>📦 Collecting</span>
                                            <div style={{ marginTop: 3 }}>
                                              {collectors[city].map((name, ni) => (
                                                  <span key={ni} style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
                                      {name}{ni < collectors[city].length - 1 ? ', ' : ''}
                                    </span>
                                              ))}
                                            </div>
                                          </div>
                                      )}

                                      {/* Expanded packing list */}
                                      {isOpen && users.length > 0 && (
                                          <div style={{ padding: '0 12px 10px' }}>
                                            {/* Column headers */}
                                            {optCols.length > 0 && (
                                                <div style={S.packingHeaderRow}>
                                                  <span style={{ flex: 1, fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>Name</span>
                                                  {optCols.map(col => (
                                                      <span key={col.key} style={S.packingColHead}>
                                        {col.label}
                                      </span>
                                                  ))}
                                                </div>
                                            )}

                                            {/* User rows */}
                                            {users.map((u, i) => (
                                                <div key={i} style={{
                                                  ...S.packingRow,
                                                  background: i % 2 === 0 ? '#FAFAFA' : 'white',
                                                }}>
                                                  <span style={{ flex: 1, fontSize: 12, color: '#374151', fontWeight: 500 }}>{u.name}</span>
                                                  {optCols.map(col => (
                                                      <div key={col.key} style={S.packingCell}>
                                                        {u[col.key] ? <Check /> : <Cross />}
                                                      </div>
                                                  ))}
                                                </div>
                                            ))}
                                          </div>
                                      )}
                                      {isOpen && users.length === 0 && (
                                          <p style={{ padding: '8px 12px 12px', fontSize: 12, color: '#9CA3AF' }}>No users opted in for this zone</p>
                                      )}
                                    </div>
                                )
                              })}
                            </div>
                        )
                      })}
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

const S = {
  page: { display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' },
  scroll: { flex: 1, overflowY: 'auto', padding: '0 20px', WebkitOverflowScrolling: 'touch' },
  section: { fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  empty: { textAlign: 'center', padding: '32px 16px', background: 'white', borderRadius: 12, border: '1.5px dashed #D1D5DB' },

  // Summary
  summaryCard: {
    background: 'white', borderRadius: 12, border: '1px solid #E5E7EB',
    overflow: 'hidden', marginBottom: 10,
  },
  summaryHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', borderBottom: '1px solid #F3F4F6',
  },
  totalBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: '#EDE9FE', borderRadius: 8, padding: '4px 10px', minWidth: 48,
  },
  tagMain: {
    fontSize: 9, fontWeight: 700, color: '#7C3AED', background: '#EDE9FE',
    padding: '1px 6px', borderRadius: 4, flexShrink: 0,
  },
  tagOpt: {
    fontSize: 9, fontWeight: 600, color: '#9CA3AF', background: '#F3F4F6',
    padding: '1px 6px', borderRadius: 4, flexShrink: 0,
  },

  // Packing list
  zoneListHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', cursor: 'pointer', background: '#FAFAFA',
  },
  packingHeaderRow: {
    display: 'flex', alignItems: 'center', padding: '6px 0 4px',
    borderBottom: '1px solid #E5E7EB',
  },
  packingColHead: {
    width: 48, textAlign: 'center', fontSize: 10, fontWeight: 600,
    color: '#7C3AED',
  },
  packingRow: {
    display: 'flex', alignItems: 'center', padding: '6px 0',
    borderRadius: 6,
  },
  packingCell: {
    width: 48, display: 'flex', justifyContent: 'center', alignItems: 'center',
  },
}