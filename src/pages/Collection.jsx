import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'
import PageLoader from '../components/PageLoader'

/*
 * Collection — Shows pickup info per zone for the current week.
 * Users can volunteer to collect from ONE zone per week.
 * Multiple users can volunteer for the same zone.
 */

const ZONES = ['dortmund', 'essen', 'düsseldorf', 'köln']
const ZONE_LABELS = { dortmund: 'Dortmund', essen: 'Essen', düsseldorf: 'Düsseldorf', köln: 'Köln' }

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

export default function Collection() {
  const { user, userProfile } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState([])
  const [volunteers, setVolunteers] = useState([])   // all volunteers this week
  const [myVolunteer, setMyVolunteer] = useState(null) // { id, city } or null
  const [saving, setSaving] = useState(false)

  const weekStart = getWeekStart(weekOffset)
  const userCity = userProfile?.city?.toLowerCase() || ''

  useEffect(() => {
    fetchData()
  }, [weekStart, user])

  async function fetchData() {
    if (!user) return
    setLoading(true)

    const [settingsRes, volRes] = await Promise.all([
      supabase
          .from('collection_settings')
          .select('*')
          .eq('week_start', weekStart)
          .order('city'),
      supabase
          .from('collection_volunteers')
          .select('id, user_id, city')
          .eq('week_start', weekStart),
    ])

    setSettings(settingsRes.data || [])

    const vols = volRes.data || []

    // Fetch volunteer names from users table
    if (vols.length > 0) {
      const userIds = [...new Set(vols.map(v => v.user_id))]
      const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds)
      const nameMap = {}
      for (const u of (usersData || [])) nameMap[u.id] = u.full_name
      for (const v of vols) v.full_name = nameMap[v.user_id] || 'Member'
    }

    setVolunteers(vols)

    const mine = vols.find(v => v.user_id === user.id)
    setMyVolunteer(mine ? { id: mine.id, city: mine.city } : null)

    setLoading(false)
  }

  async function handleVolunteer(zone) {
    setSaving(true)

    if (myVolunteer) {
      if (myVolunteer.city === zone) {
        // Un-volunteer
        const { error } = await supabase
            .from('collection_volunteers')
            .delete()
            .eq('id', myVolunteer.id)
        if (!error) {
          setMyVolunteer(null)
          setVolunteers(prev => prev.filter(v => v.id !== myVolunteer.id))
        }
      } else {
        // Switch zone
        const { error } = await supabase
            .from('collection_volunteers')
            .update({ city: zone })
            .eq('id', myVolunteer.id)
        if (!error) {
          setMyVolunteer({ ...myVolunteer, city: zone })
          setVolunteers(prev =>
              prev.map(v => v.id === myVolunteer.id ? { ...v, city: zone } : v)
          )
        }
      }
    } else {
      // New volunteer (upsert to handle duplicate key gracefully)
      const { data, error } = await supabase
          .from('collection_volunteers')
          .upsert({
            user_id: user.id,
            week_start: weekStart,
            city: zone,
          }, { onConflict: 'user_id,week_start' })
          .select('id, user_id, city')
          .single()
      if (!error && data) {
        setMyVolunteer({ id: data.id, city: data.city })
        setVolunteers(prev => [
          ...prev.filter(v => v.user_id !== user.id),
          { ...data, full_name: userProfile?.full_name || 'You' },
        ])
      }
    }
    setSaving(false)
  }

  // Sort: user's zone first
  const sortedZones = ZONES.slice().sort((a, b) => {
    if (a === userCity) return -1
    if (b === userCity) return 1
    return 0
  })

  // Count volunteers per zone
  function getZoneVolunteers(zone) {
    return volunteers.filter(v => v.city === zone)
  }

  return (
      <div style={styles.page}>
        <div style={styles.statusBar} />
        <BackHeader title="Collection" />

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

          {loading ? (
              <PageLoader message="Loading zones..." />
          ) : settings.length === 0 ? (
              <div className="field-card" style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 24 }}>
                No collection points set for this week
              </div>
          ) : (
              sortedZones.map(zone => {
                const info = settings.find(s => s.city === zone)
                if (!info) return null

                const isMyZone = zone === userCity
                const zoneVols = getZoneVolunteers(zone)
                const iAmCollecting = myVolunteer?.city === zone
                const iVolunteeredElsewhere = myVolunteer && myVolunteer.city !== zone

                return (
                    <div key={zone} style={{
                      ...styles.zoneCard,
                      borderColor: iAmCollecting ? 'var(--primary)' : isMyZone ? '#86EFAC' : '#E5E7EB',
                      background: iAmCollecting ? '#F0FDF4' : 'white',
                    }}>
                      {/* Zone header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iAmCollecting ? 'var(--primary)' : '#D97706'} strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                          </svg>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
                            {ZONE_LABELS[zone] || zone}
                          </p>
                        </div>
                        {isMyZone && (
                            <span style={styles.myZoneBadge}>Your Zone</span>
                        )}
                      </div>

                      {/* Contact name, address + time */}
                      {info.contact_name && (
                          <p style={styles.infoLine}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 4 }}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                            {info.contact_name}
                          </p>
                      )}
                      {info.address && (
                          <p style={styles.infoLine}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 4 }}>
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                            </svg>
                            {info.address}
                          </p>
                      )}
                      {(info.start_time || info.end_time) && (
                          <p style={styles.infoLine}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 4 }}>
                              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                            </svg>
                            {info.start_time || '—'}{info.end_time ? ` – ${info.end_time}` : ''}
                          </p>
                      )}

                      {!info.address && !info.start_time && (
                          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Details not yet set</p>
                      )}

                      {/* Volunteer section */}
                      <div style={styles.volunteerSection}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span style={styles.volCount}>
                        {zoneVols.length} {zoneVols.length === 1 ? 'collector' : 'collectors'}
                      </span>
                          </div>
                          <button
                              style={{
                                ...styles.volBtn,
                                background: iAmCollecting ? 'var(--primary)' : 'white',
                                color: iAmCollecting ? 'white' : 'var(--primary)',
                                borderColor: 'var(--primary)',
                                opacity: saving || iVolunteeredElsewhere ? 0.5 : 1,
                              }}
                              onClick={() => !saving && handleVolunteer(zone)}
                              disabled={saving}
                          >
                            {saving ? '...' : iAmCollecting ? '✓ Collecting' : "I'll collect"}
                          </button>
                        </div>

                        {/* Show volunteer names */}
                        {zoneVols.length > 0 && (
                            <div style={styles.volNames}>
                              {zoneVols.map(v => (
                                  <span key={v.id} style={{
                                    ...styles.volNameBadge,
                                    background: v.user_id === user.id ? '#E8F5EE' : '#F3F4F6',
                                    color: v.user_id === user.id ? 'var(--primary)' : '#374151',
                                    fontWeight: v.user_id === user.id ? 600 : 400,
                                  }}>
                          {v.user_id === user.id ? 'You' : (v.full_name || 'Member')}
                        </span>
                              ))}
                            </div>
                        )}
                      </div>
                    </div>
                )
              })
          )}

          {/* Info note */}
          {myVolunteer && (
              <div style={styles.infoNote}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                </svg>
                <p style={{ fontSize: 12, color: '#6B7280' }}>
                  You are collecting from <strong>{ZONE_LABELS[myVolunteer.city]}</strong>. Tap the button again to cancel, or tap another zone to switch.
                </p>
              </div>
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
  headerArea: {
    padding: '0 24px 16px',
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1A1A1A',
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
  zoneCard: {
    padding: '14px 16px',
    borderRadius: 12,
    border: '1.5px solid',
    marginBottom: 10,
  },
  myZoneBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--primary)',
    background: '#DCFCE7',
    padding: '3px 8px',
    borderRadius: 6,
  },
  infoLine: {
    fontSize: 13,
    color: '#374151',
    marginTop: 6,
  },
  volunteerSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: '1px solid #F3F4F6',
  },
  volCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 500,
  },
  volBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1.5px solid',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  volNames: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  volNameBadge: {
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 11,
  },
  infoNote: {
    display: 'flex',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 10,
    background: '#F9FAFB',
    border: '1px solid #E5E7EB',
    marginTop: 6,
    marginBottom: 12,
  },
}