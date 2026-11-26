import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'
import PageLoader from '../components/PageLoader'

const ZONES = ['Dortmund', 'Essen', 'Düsseldorf', 'Köln']

const emptyZone = { contact_name: '', address: '', start: '', end: '' }

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

export default function CollectionSettings() {
  const [now] = useState(new Date())
  const [weekOffset, setWeekOffset] = useState(0)

  const currentDate = new Date(now)
  currentDate.setDate(currentDate.getDate() + weekOffset * 7)

  const weekNum = getWeekNumber(currentDate)
  const weekDates = getWeekDates(currentDate)
  const weekStart = getWeekStart(currentDate)

  const [zones, setZones] = useState(
      Object.fromEntries(ZONES.map(z => [z, { ...emptyZone }]))
  )
  const [dbIds, setDbIds] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [weekOffset])

  async function fetchSettings() {
    setLoading(true)
    setError('')
    setSuccess('')

    // Reset to empty
    const fresh = Object.fromEntries(ZONES.map(z => [z, { ...emptyZone }]))

    const { data, error: fetchErr } = await supabase
        .from('collection_settings')
        .select('*')
        .eq('week_start', weekStart)

    if (fetchErr) {
      console.error('Fetch collection settings error:', fetchErr)
      setZones(fresh)
      setDbIds({})
      setLoading(false)
      return
    }

    const ids = {}
    if (data) {
      data.forEach(row => {
        const city = capitalize(row.city)
        if (fresh[city]) {
          fresh[city] = {
            contact_name: row.contact_name || '',
            address: row.address || '',
            start: row.start_time || '',
            end: row.end_time || '',
          }
          ids[city] = row.id
        }
      })
    }
    setZones(fresh)
    setDbIds(ids)
    setLoading(false)
  }

  const set = (city, key, val) =>
      setZones(z => ({ ...z, [city]: { ...z[city], [key]: val } }))

  async function handleSave() {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      for (const city of ZONES) {
        const data = zones[city]
        // Skip zones with nothing filled in
        const hasData = data.contact_name.trim() || data.address.trim() || data.start.trim() || data.end.trim()

        if (dbIds[city]) {
          if (!hasData) {
            // Delete empty row
            await supabase.from('collection_settings').delete().eq('id', dbIds[city])
            setDbIds(prev => { const n = { ...prev }; delete n[city]; return n })
          } else {
            const { error: updateErr } = await supabase
                .from('collection_settings')
                .update({
                  contact_name: data.contact_name.trim() || null,
                  address: data.address.trim() || null,
                  start_time: data.start.trim() || null,
                  end_time: data.end.trim() || null,
                })
                .eq('id', dbIds[city])
            if (updateErr) throw updateErr
          }
        } else if (hasData) {
          const { data: inserted, error: insertErr } = await supabase
              .from('collection_settings')
              .insert({
                week_start: weekStart,
                city: city.toLowerCase(),
                contact_name: data.contact_name.trim() || null,
                address: data.address.trim() || null,
                start_time: data.start.trim() || null,
                end_time: data.end.trim() || null,
              })
              .select('id')
              .single()
          if (insertErr) throw insertErr
          if (inserted) {
            setDbIds(prev => ({ ...prev, [city]: inserted.id }))
          }
        }
      }

      setSuccess('Settings saved!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      console.error('Save settings error:', err)
      setError(err.message || 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  // Copy last week's settings into the current empty week
  async function handleCopyLastWeek() {
    const lastWeekDate = new Date(currentDate)
    lastWeekDate.setDate(lastWeekDate.getDate() - 7)
    const lastWeekStart = getWeekStart(lastWeekDate)

    setSaving(true)
    setError('')
    const { data, error: fetchErr } = await supabase
        .from('collection_settings')
        .select('*')
        .eq('week_start', lastWeekStart)

    if (fetchErr || !data || data.length === 0) {
      setError('No settings found for last week')
      setSaving(false)
      return
    }

    const loaded = Object.fromEntries(ZONES.map(z => [z, { ...emptyZone }]))
    data.forEach(row => {
      const city = capitalize(row.city)
      if (loaded[city]) {
        loaded[city] = {
          contact_name: row.contact_name || '',
          address: row.address || '',
          start: row.start_time || '',
          end: row.end_time || '',
        }
      }
    })
    setZones(loaded)
    setSaving(false)
  }

  const hasAnyData = Object.values(dbIds).length > 0

  if (loading) {
    return (
        <div style={styles.page}>
          <div style={{ height: 44, flexShrink: 0 }} />
          <BackHeader title="Collection Settings" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <PageLoader />
          </div>
        </div>
    )
  }

  return (
      <div style={styles.page}>
        <div style={{ height: 44, flexShrink: 0 }} />
        <BackHeader title="Collection Settings" />

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

          {/* Copy from last week — only show if current week is empty */}
          {!hasAnyData && (
              <button
                  style={styles.copyBtn}
                  onClick={handleCopyLastWeek}
                  disabled={saving}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy from last week
              </button>
          )}

          {ZONES.map(city => (
              <div key={city}>
                <p style={styles.sectionTitle}>{city}</p>
                <div className="field-card" style={styles.card}>
                  <div style={{ marginBottom: 12 }}>
                    <p style={styles.label}>Contact Name</p>
                    <input
                        style={styles.input}
                        value={zones[city].contact_name}
                        onChange={e => set(city, 'contact_name', e.target.value)}
                        placeholder="e.g. Mulla Saheb"
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <p style={styles.label}>Pickup Address</p>
                    <input
                        style={styles.input}
                        value={zones[city].address}
                        onChange={e => set(city, 'address', e.target.value)}
                        placeholder="e.g. Musterstraße 12, 44135"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={styles.label}>Start Time</p>
                      <input
                          type="time"
                          style={styles.input}
                          value={zones[city].start}
                          onChange={e => set(city, 'start', e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={styles.label}>End Time</p>
                      <input
                          type="time"
                          style={styles.input}
                          value={zones[city].end}
                          onChange={e => set(city, 'end', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
          ))}

          {error && <div style={styles.errorBox}>{error}</div>}
          {success && (
              <div style={styles.successBox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                {success}
              </div>
          )}

          <button
              className="btn-primary"
              style={styles.submitBtn}
              onClick={handleSave}
              disabled={saving}
          >
            {saving ? <span className="spinner" /> : 'Save Settings'}
          </button>

          <div style={{ height: 100 }} />
        </div>
        <BottomNav />
      </div>
  )
}

function capitalize(s) {
  if (!s) return ''
  if (s === 'düsseldorf') return 'Düsseldorf'
  if (s === 'köln') return 'Köln'
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
  copyBtn: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1.5px dashed var(--border)',
    background: 'white',
    color: '#6B7280',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 8,
  },
  card: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: '#6B7280',
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
  submitBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    marginTop: 8,
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
  successBox: {
    marginBottom: 12,
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