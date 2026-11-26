import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'
import PageLoader from '../components/PageLoader'

/*
 * Feedback — User submits feedback per menu item.
 * Shows only menus where feedback is enabled (via feedback_toggles).
 * User can submit once per menu (upsert on menu_id + user_id).
 */

function getWeekStart(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function Feedback() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [menusWithFeedback, setMenusWithFeedback] = useState([]) // menus that have feedback enabled
  const [responses, setResponses] = useState({})   // { menu_id: { portion, taste, oiliness, comment } }
  const [submitted, setSubmitted] = useState({})   // { menu_id: true }
  const [saving, setSaving] = useState(null)

  const weekStart = getWeekStart()

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  async function fetchData() {
    setLoading(true)

    // Get this week's menus
    const { data: menus } = await supabase
        .from('menus')
        .select('*')
        .eq('week_start', weekStart)
        .order('menu_number')

    if (!menus || menus.length === 0) {
      setMenusWithFeedback([])
      setLoading(false)
      return
    }

    const menuIds = menus.map(m => m.id)

    // Get feedback toggles and existing responses
    const [toggleRes, fbRes] = await Promise.all([
      supabase.from('feedback_toggles').select('menu_id, enabled').in('menu_id', menuIds),
      supabase.from('feedback_responses').select('*').in('menu_id', menuIds).eq('user_id', user.id),
    ])

    const enabledMenuIds = new Set(
        (toggleRes.data || []).filter(t => t.enabled).map(t => t.menu_id)
    )

    // Only show menus with feedback enabled
    const availableMenus = menus.filter(m => enabledMenuIds.has(m.id))
    setMenusWithFeedback(availableMenus)

    // Pre-fill existing responses
    const respMap = {}
    const subMap = {}
    for (const fb of (fbRes.data || [])) {
      respMap[fb.menu_id] = {
        portion: fb.portion || null,
        taste: fb.taste || null,
        oiliness: fb.oiliness || null,
        comment: fb.comment || '',
      }
      subMap[fb.menu_id] = true
    }
    setResponses(respMap)
    setSubmitted(subMap)
    setLoading(false)
  }

  function updateResponse(menuId, field, value) {
    setResponses(prev => ({
      ...prev,
      [menuId]: { ...(prev[menuId] || {}), [field]: value },
    }))
  }

  async function handleSubmit(menuId) {
    const resp = responses[menuId]
    if (!resp?.portion || !resp?.taste || !resp?.oiliness) {
      alert('Please select all three criteria')
      return
    }

    setSaving(menuId)
    const payload = {
      menu_id: menuId,
      user_id: user.id,
      portion: resp.portion,
      taste: resp.taste,
      oiliness: resp.oiliness,
      comment: resp.comment || null,
    }

    // Upsert — update if exists, insert if not
    const { error } = await supabase
        .from('feedback_responses')
        .upsert(payload, { onConflict: 'menu_id,user_id' })

    if (error) {
      alert('Failed to submit: ' + error.message)
    } else {
      setSubmitted(prev => ({ ...prev, [menuId]: true }))
    }
    setSaving(null)
  }

  const menuLabels = ['Menu 1', 'Menu 2', 'Menu 3']

  function CriteriaRow({ label, value, onChange, options }) {
    return (
        <div style={{ marginBottom: 14 }}>
          <p style={styles.criteriaLabel}>{label}</p>
          <div style={styles.criteriaRow}>
            {options.map(opt => (
                <button
                    key={opt}
                    style={{
                      ...styles.criteriaBtn,
                      ...(value === opt
                          ? (opt.startsWith('Too') || opt === 'Needs Work'
                              ? styles.criteriaBtnWarn
                              : styles.criteriaBtnSelected)
                          : {}),
                    }}
                    onClick={() => onChange(opt)}
                >
                  {opt}
                </button>
            ))}
          </div>
        </div>
    )
  }

  return (
      <div style={styles.page}>
        <div style={styles.statusBar} />
        <BackHeader title="Feedback" />

        <div style={styles.scroll}>
          {loading ? (
              <PageLoader message="Loading feedback..." />
          ) : menusWithFeedback.length === 0 ? (
              <div className="field-card" style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 24 }}>
                No feedback forms open this week
              </div>
          ) : (
              menusWithFeedback.map(menu => {
                const resp = responses[menu.id] || {}
                const isSubmitted = submitted[menu.id]
                const isSaving = saving === menu.id

                return (
                    <div key={menu.id} className="field-card" style={{ marginBottom: 16 }}>
                      <div style={styles.formHeader}>
                        <p style={styles.formDay}>
                          {menuLabels[menu.menu_number - 1] || `Menu ${menu.menu_number}`}
                        </p>
                        <span style={{
                          ...styles.dishBadge,
                          background: isSubmitted ? '#E8F5EE' : '#FEF3C7',
                          color: isSubmitted ? '#1B7A4A' : '#92400E',
                        }}>
                    {isSubmitted ? '✓ Submitted' : menu.main_dish}
                  </span>
                      </div>

                      <CriteriaRow
                          label="Portion Size"
                          value={resp.portion}
                          onChange={v => updateResponse(menu.id, 'portion', v)}
                          options={['Too Little', 'Just Right', 'Too Much']}
                      />

                      <CriteriaRow
                          label="Taste"
                          value={resp.taste}
                          onChange={v => updateResponse(menu.id, 'taste', v)}
                          options={['Needs Work', 'Good', 'Excellent']}
                      />

                      <CriteriaRow
                          label="Oiliness"
                          value={resp.oiliness}
                          onChange={v => updateResponse(menu.id, 'oiliness', v)}
                          options={['Too Oily', 'Just Right', 'Too Dry']}
                      />

                      <div style={{ marginBottom: 12 }}>
                        <label style={styles.criteriaLabel}>Comments (optional)</label>
                        <textarea
                            value={resp.comment || ''}
                            onChange={e => updateResponse(menu.id, 'comment', e.target.value)}
                            placeholder="Any additional feedback..."
                            rows={3}
                            style={styles.textarea}
                        />
                      </div>

                      <button
                          style={{
                            ...styles.submitBtn,
                            opacity: isSaving ? 0.6 : 1,
                            background: isSubmitted ? '#E8F5EE' : 'var(--primary)',
                            color: isSubmitted ? 'var(--primary)' : 'white',
                            border: isSubmitted ? '1.5px solid var(--primary)' : 'none',
                          }}
                          onClick={() => handleSubmit(menu.id)}
                          disabled={isSaving}
                      >
                        {isSaving ? (
                            <span className="spinner" style={{ width: 16, height: 16 }} />
                        ) : isSubmitted ? (
                            'Update Feedback'
                        ) : (
                            'Submit Feedback'
                        )}
                      </button>
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
  statusBar: { height: 44, flexShrink: 0 },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px',
    WebkitOverflowScrolling: 'touch',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formDay: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1A1A1A',
  },
  dishBadge: {
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  criteriaLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 8,
  },
  criteriaRow: {
    display: 'flex',
    gap: 6,
  },
  criteriaBtn: {
    flex: 1,
    padding: '9px 4px',
    borderRadius: 8,
    border: '1.5px solid #E5E7EB',
    background: 'white',
    color: '#374151',
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  criteriaBtnSelected: {
    background: '#E8F5EE',
    borderColor: 'var(--primary)',
    color: 'var(--primary)',
    fontWeight: 600,
  },
  criteriaBtnWarn: {
    background: '#FEF2F2',
    borderColor: '#FCA5A5',
    color: '#DC2626',
    fontWeight: 600,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1.5px solid #E5E7EB',
    background: 'white',
    fontSize: 13,
    fontFamily: 'inherit',
    resize: 'vertical',
    color: '#374151',
    outline: 'none',
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
}