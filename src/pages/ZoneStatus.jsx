import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import PageLoader from '../components/PageLoader'

const ZONES = ['Dortmund', 'Essen', 'Düsseldorf', 'Köln']

function getCurrentWeekStart() {
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

export default function ZoneStatus() {
    const [zoneStats, setZoneStats] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedZone, setExpandedZone] = useState(null)

    useEffect(() => {
        fetchZoneStats()
    }, [])

    async function fetchZoneStats() {
        try {
            const weekStart = getCurrentWeekStart()

            const [selectionsRes, profilesRes, settingsRes, cookVolRes, collVolRes, menusRes] = await Promise.all([
                supabase.from('thaali_selections').select('user_id, opted_in').eq('week_start', weekStart),
                supabase.from('users').select('id, full_name, username, city'),
                supabase.from('collection_settings').select('*').eq('week_start', weekStart),
                supabase.from('cooking_volunteers').select('user_id, city, menu_number').eq('week_start', weekStart),
                supabase.from('collection_volunteers').select('user_id, city').eq('week_start', weekStart),
                supabase.from('menus').select('menu_number, main_dish').eq('week_start', weekStart).order('menu_number'),
            ])

            const selections = selectionsRes.data || []
            const profiles = profilesRes.data || []
            const settings = settingsRes.data || []
            const cookVols = cookVolRes.data || []
            const collVols = collVolRes.data || []
            const menusList = menusRes.data || []

            const nameMap = {}
            for (const p of profiles) nameMap[p.id] = p.full_name || p.username || 'User'

            const result = ZONES.map(zone => {
                const zl = zone.toLowerCase()
                const zoneProfiles = profiles.filter(p => p.city && p.city.toLowerCase() === zl)
                const zoneUserIds = new Set(zoneProfiles.map(p => p.id))
                const optedIn = selections.filter(s => s.opted_in && zoneUserIds.has(s.user_id)).length

                const cooksByMenu = {}
                for (const v of cookVols) {
                    if (v.city !== zl) continue
                    const mn = v.menu_number
                    if (!cooksByMenu[mn]) cooksByMenu[mn] = new Set()
                    cooksByMenu[mn].add(nameMap[v.user_id] || 'Unknown')
                }
                for (const mn in cooksByMenu) cooksByMenu[mn] = [...cooksByMenu[mn]]

                const collNames = [...new Set(collVols.filter(v => v.city === zl).map(v => nameMap[v.user_id] || 'Unknown'))]

                return {
                    name: zone,
                    totalUsers: zoneProfiles.length,
                    optedIn,
                    cooksByMenu,
                    collNames,
                    menus: menusList,
                }
            })

            setZoneStats(result)
        } catch (err) {
            console.error('Error fetching zone stats:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={styles.page}>
            <div style={{ height: 44, flexShrink: 0 }} />
            <BackHeader title="Zone Status" />

            <div style={styles.scroll}>
                {loading ? (
                    <PageLoader />
                ) : (
                    <>
                        <p style={styles.sectionTitle}>This Week</p>
                        {zoneStats.map((zone, i) => {
                            const totalCooks = Object.values(zone.cooksByMenu).reduce((s, arr) => s + arr.length, 0)
                            const allGood = zone.optedIn > 0 && totalCooks > 0 && zone.collNames.length > 0
                            const statusColor = allGood ? 'var(--primary)' : '#DC2626'
                            const isExpanded = expandedZone === i
                            return (
                                <div key={i} style={{ ...styles.zoneCard, cursor: 'pointer' }} onClick={() => setExpandedZone(isExpanded ? null : i)}>
                                    {/* Zone header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <p style={styles.zoneName}>{zone.name}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor }} />
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                                <path d="M6 9l6 6 6-6"/>
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Summary counts row */}
                                    <div style={styles.zoneStatsRow}>
                                        <div style={styles.zoneStat}>
                                            <p style={{ ...styles.zoneStatNum, color: 'var(--primary)' }}>{zone.optedIn}</p>
                                            <p style={styles.zoneStatLabel}>Thaalis</p>
                                        </div>
                                        <div style={{ ...styles.zoneStat, borderLeft: '1px solid #F3F4F6', borderRight: '1px solid #F3F4F6' }}>
                                            <p style={{ ...styles.zoneStatNum, color: totalCooks > 0 ? 'var(--primary)' : '#D1D5DB' }}>{totalCooks}</p>
                                            <p style={styles.zoneStatLabel}>Cook</p>
                                        </div>
                                        <div style={styles.zoneStat}>
                                            <p style={{ ...styles.zoneStatNum, color: zone.collNames.length > 0 ? 'var(--primary)' : '#D1D5DB' }}>{zone.collNames.length}</p>
                                            <p style={styles.zoneStatLabel}>Collecting</p>
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <div style={styles.detailSection}>
                                                <p style={styles.detailSectionTitle}>🍳 Cooking</p>
                                                {zone.menus.map(menu => {
                                                    const cooks = zone.cooksByMenu[menu.menu_number]
                                                    return (
                                                        <div key={menu.menu_number} style={{ padding: '2px 0' }}>
                                                            <span style={styles.detailLabel}>Menu {menu.menu_number}: </span>
                                                            <span style={{ fontSize: 13, fontWeight: 600, color: cooks ? 'var(--primary)' : '#D1D5DB' }}>
                                {cooks ? cooks.join(', ') : '—'}
                              </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div style={styles.detailSection}>
                                                <p style={styles.detailSectionTitle}>📦 Collecting</p>
                                                {zone.collNames.length > 0
                                                    ? zone.collNames.map((name, ni) => (
                                                        <p key={ni} style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', margin: '2px 0' }}>{name}</p>
                                                    ))
                                                    : <span style={{ fontSize: 13, fontWeight: 600, color: '#D1D5DB' }}>—</span>
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </>
                )}

                <div style={{ height: 40 }} />
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
    zoneCard: {
        padding: '14px 16px',
        background: 'white',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        marginBottom: 10,
    },
    zoneName: {
        fontSize: 15,
        fontWeight: 700,
        color: '#1A1A1A',
        margin: 0,
    },
    zoneStatsRow: {
        display: 'flex',
    },
    zoneStat: {
        flex: 1,
        textAlign: 'center',
        padding: '4px 0',
    },
    zoneStatNum: {
        fontSize: 20,
        fontWeight: 700,
        margin: 0,
        lineHeight: 1,
    },
    zoneStatLabel: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: 500,
        margin: 0,
        marginBlockStart: 4,
        textTransform: 'uppercase',
    },
    detailSection: {
        background: '#F9FAFB',
        borderRadius: 8,
        padding: '8px 12px',
    },
    detailSectionTitle: {
        fontSize: 11,
        fontWeight: 600,
        color: '#6B7280',
        textTransform: 'uppercase',
        margin: 0,
        marginBottom: 4,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: 500,
        flexShrink: 0,
    },
}