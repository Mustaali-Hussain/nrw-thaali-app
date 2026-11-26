import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'
import PageLoader from '../components/PageLoader'

/*
 * WeeklyMenu — Admin set menu screen
 *
 * Menus are stored per week. Each week can have multiple menus
 * (Menu 1, Menu 2, ...) — scalable for future needs.
 *
 * Flow:
 *   1. Admin sees list of saved menus for this week + "Set Menu" button
 *   2. Pressing "Set Menu" opens form for the next menu number
 *   3. After saving, admin returns to the list and can add more
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d.setDate(diff))
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const fmt = d => `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`
  return `${fmt(monday)} – ${fmt(friday)}`
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const emptyMenu = { main: '', roti: '', dessert: '', fruit: '' }

export default function WeeklyMenu() {
  const [now] = useState(new Date())
  const [weekOffset, setWeekOffset] = useState(0)

  const currentDate = new Date(now)
  currentDate.setDate(currentDate.getDate() + weekOffset * 7)

  const weekNum = getWeekNumber(currentDate)
  const weekDates = getWeekDates(currentDate)
  const weekStart = getWeekStart(currentDate)
  const year = currentDate.getFullYear()

  const [menus, setMenus] = useState([]) // saved menus for this week
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null = list view, number = form for that menu
  const [form, setForm] = useState({ ...emptyMenu })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchMenus()
    setEditing(null)
  }, [weekOffset])

  async function fetchMenus() {
    setLoading(true)
    setError('')
    const { data, error: fetchErr } = await supabase
        .from('menus')
        .select('*')
        .eq('week_start', weekStart)
        .order('menu_number', { ascending: true })

    if (fetchErr) {
      console.error('Fetch menus error:', fetchErr)
      // Table might not exist yet — show empty
      setMenus([])
    } else {
      setMenus(data || [])
    }
    setLoading(false)
  }

  function handleSetMenu() {
    const nextNum = menus.length + 1
    setEditing(nextNum)
    setForm({ ...emptyMenu })
    setError('')
    setSuccess('')
  }

  function handleEditMenu(menu) {
    setEditing(menu.menu_number)
    setForm({
      main: menu.main_dish || '',
      roti: menu.roti || '',
      dessert: menu.dessert || '',
      fruit: menu.fruit || '',
    })
    setError('')
    setSuccess('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.main.trim()) return setError('Main dish is required')

    setSaving(true)
    try {
      const existing = menus.find(m => m.menu_number === editing)

      const row = {
        week_start: weekStart,
        year,
        week_number: weekNum,
        menu_number: editing,
        main_dish: form.main.trim(),
        roti: form.roti.trim() || null,
        dessert: form.dessert.trim() || null,
        fruit: form.fruit.trim() || null,
      }

      if (existing) {
        const { error: updateErr } = await supabase
            .from('menus')
            .update(row)
            .eq('id', existing.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
            .from('menus')
            .insert(row)
        if (insertErr) throw insertErr
      }

      setSuccess('Menu saved!')
      await fetchMenus()
      setTimeout(() => {
        setEditing(null)
        setSuccess('')
      }, 800)
    } catch (err) {
      console.error('Save menu error:', err)
      setError(err.message || 'Could not save menu')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMenu() {
    const existing = menus.find(m => m.menu_number === editing)
    if (!existing) {
      setEditing(null)
      return
    }

    setSaving(true)
    try {
      const { error: delErr } = await supabase
          .from('menus')
          .delete()
          .eq('id', existing.id)
      if (delErr) throw delErr

      await fetchMenus()
      setEditing(null)
    } catch (err) {
      console.error('Delete menu error:', err)
      setError(err.message || 'Could not delete menu')
    } finally {
      setSaving(false)
    }
  }

  // ---- Form view ----
  if (editing !== null) {
    const isExisting = menus.some(m => m.menu_number === editing)
    return (
        <div style={styles.page}>
          <div style={styles.statusBar} />
          <BackHeader title={`Menu ${editing}`} onBack={() => setEditing(null)} />

          <form onSubmit={handleSave} style={styles.scroll}>
            <p style={styles.weekSubtitle}>Week {weekNum} · {weekDates}</p>

            <div className="field-card">
              <div style={styles.fieldGroup}>
                <div>
                  <p style={styles.label}>Main Dish *</p>
                  <input
                      style={styles.input}
                      value={form.main}
                      onChange={e => setForm(f => ({ ...f, main: e.target.value }))}
                      placeholder="e.g. Chicken Biryani"
                  />
                </div>
                <div>
                  <p style={styles.label}>Roti</p>
                  <input
                      style={styles.input}
                      value={form.roti}
                      onChange={e => setForm(f => ({ ...f, roti: e.target.value }))}
                      placeholder="e.g. Naan, Chapati"
                  />
                </div>
                <div>
                  <p style={styles.label}>Dessert</p>
                  <input
                      style={styles.input}
                      value={form.dessert}
                      onChange={e => setForm(f => ({ ...f, dessert: e.target.value }))}
                      placeholder="e.g. Kheer"
                  />
                </div>
                <div>
                  <p style={styles.label}>Fruit</p>
                  <input
                      style={styles.input}
                      value={form.fruit}
                      onChange={e => setForm(f => ({ ...f, fruit: e.target.value }))}
                      placeholder="e.g. Banana, Apple"
                  />
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

            <button
                type="submit"
                className="btn-primary"
                style={styles.saveBtn}
                disabled={saving}
            >
              {saving ? <span className="spinner" /> : 'Save Menu'}
            </button>

            {isExisting && (
                <button
                    type="button"
                    style={styles.deleteBtn}
                    onClick={handleDeleteMenu}
                    disabled={saving}
                >
                  Delete Menu {editing}
                </button>
            )}

            <div style={{ height: 100 }} />
          </form>
          <BottomNav />
        </div>
    )
  }

  // ---- List view ----
  return (
      <div style={styles.page}>
        <div style={styles.statusBar} />
        <BackHeader title="Set Weekly Menu" />

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

          {/* Loading */}
          {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <PageLoader />
              </div>
          )}

          {/* Saved menus */}
          {!loading && menus.map(menu => (
              <div
                  key={menu.id}
                  className="card"
                  style={styles.menuCard}
                  onClick={() => handleEditMenu(menu)}
              >
                <div style={styles.menuHeader}>
                  <div style={styles.menuBadge}>Menu {menu.menu_number}</div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                <p style={styles.menuMain}>{menu.main_dish}</p>
                <p style={styles.menuSub}>
                  {[menu.roti, menu.dessert, menu.fruit].filter(Boolean).join(' · ') || 'No extras'}
                </p>
              </div>
          ))}

          {/* Empty state */}
          {!loading && menus.length === 0 && (
              <div style={styles.emptyState}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <p style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>No menus set for this week</p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>Tap "Set Menu" to add one</p>
              </div>
          )}

          {/* Set Menu button */}
          <button
              className="btn-primary"
              style={styles.setMenuBtn}
              onClick={handleSetMenu}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Set Menu {menus.length + 1}
          </button>

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
  weekSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: 500,
    marginBottom: 16,
    textAlign: 'center',
  },
  menuCard: {
    padding: 16,
    marginBottom: 10,
    cursor: 'pointer',
  },
  menuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--primary)',
    background: '#E8F5EE',
    padding: '4px 10px',
    borderRadius: 6,
  },
  menuMain: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1A1A1A',
    margin: 0,
  },
  menuSub: {
    fontSize: 12,
    color: '#6B7280',
    margin: 0,
    marginTop: 4,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 0',
  },
  setMenuBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  saveBtn: {
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
  deleteBtn: {
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
    marginTop: 10,
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