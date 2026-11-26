import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'

/*
 * AddThaaliCost — Add or edit thaali cost entry
 * Fields: Date, Hijri Date, Khidmatguzaar, Mauze, No. of Thaalis,
 *         Vazifa per Dabba, Thaali Category, Menu,
 *         Ingredient Cost, Transport Cost, Vazifa Cost (auto) → Total Cost (auto)
 */

const ZONES = ['Dortmund', 'Essen', 'Düsseldorf', 'Köln']
const CATEGORIES = ['Veg', 'Daal', 'Non Veg']

export default function AddThaaliCost() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    hijri_date: '',
    khidmatguzaar: '',
    mauze: '',
    no_of_thaalis: '',
    vazifa_per_dabba: '',
    thaali_category: '',
    menu: '',
    ingredient_cost: '',
    transport_cost: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
        ;(async () => {
      const { data } = await supabase.from('budget_thaali_costs').select('*').eq('id', id).single()
      if (data) setForm({
        date: data.date || '',
        hijri_date: data.hijri_date || '',
        khidmatguzaar: data.khidmatguzaar || '',
        mauze: data.mauze || '',
        no_of_thaalis: data.no_of_thaalis?.toString() || '',
        vazifa_per_dabba: data.vazifa_per_dabba?.toString() || '',
        thaali_category: data.thaali_category || '',
        menu: data.menu || '',
        ingredient_cost: data.ingredient_cost?.toString() || '',
        transport_cost: data.transport_cost?.toString() || '',
      })
      setLoading(false)
    })()
  }, [id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const vazifaCost = (parseFloat(form.no_of_thaalis) || 0) * (parseFloat(form.vazifa_per_dabba) || 0)
  const totalCost = (parseFloat(form.ingredient_cost) || 0) + (parseFloat(form.transport_cost) || 0) + vazifaCost

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.date || totalCost <= 0) {
      setError('Date and at least one cost field are required')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      date: form.date,
      hijri_date: form.hijri_date.trim() || null,
      khidmatguzaar: form.khidmatguzaar.trim() || null,
      mauze: form.mauze || null,
      no_of_thaalis: form.no_of_thaalis ? parseInt(form.no_of_thaalis) : null,
      vazifa_per_dabba: form.vazifa_per_dabba ? parseFloat(form.vazifa_per_dabba) : null,
      thaali_category: form.thaali_category || null,
      menu: form.menu.trim() || null,
      total_cost: totalCost,
      ingredient_cost: form.ingredient_cost ? parseFloat(form.ingredient_cost) : null,
      transport_cost: form.transport_cost ? parseFloat(form.transport_cost) : null,
      vazifa_cost: vazifaCost || null,
    }

    const { error: dbErr } = isEdit
        ? await supabase.from('budget_thaali_costs').update(payload).eq('id', id)
        : await supabase.from('budget_thaali_costs').insert(payload)

    if (dbErr) {
      setError(dbErr.message || 'Could not save')
      setSaving(false)
      return
    }

    navigate('/budget')
  }

  if (loading) return (
      <div style={styles.page}>
        <div style={{ height: 44, flexShrink: 0 }} />
        <BackHeader title="Edit Thaali Cost" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>
        <BottomNav />
      </div>
  )

  return (
      <div style={styles.page}>
        <div style={{ height: 44, flexShrink: 0 }} />
        <BackHeader title={isEdit ? 'Edit Thaali Cost' : 'Thaali Cost'} />

        <form onSubmit={handleSubmit} style={styles.scroll}>
          <div style={styles.field}>
            <label style={styles.label}>Date *</label>
            <input
                type="date"
                style={styles.input}
                value={form.date}
                onChange={e => set('date', e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Hijri Date</label>
            <input
                style={styles.input}
                placeholder="e.g. 20 Jumadal Ula 1448"
                value={form.hijri_date}
                onChange={e => set('hijri_date', e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Khidmatguzaar</label>
            <input
                style={styles.input}
                placeholder="Name of the person cooking"
                value={form.khidmatguzaar}
                onChange={e => set('khidmatguzaar', e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Mauze (Zone)</label>
            <div style={styles.chipRow}>
              {ZONES.map(z => (
                  <div
                      key={z}
                      style={{
                        ...styles.chip,
                        ...(form.mauze === z ? styles.chipActive : {}),
                      }}
                      onClick={() => set('mauze', form.mauze === z ? '' : z)}
                  >
                    {z}
                  </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>No. of Thaalis</label>
              <input
                  type="number"
                  style={styles.input}
                  placeholder="e.g. 18"
                  value={form.no_of_thaalis}
                  onChange={e => set('no_of_thaalis', e.target.value)}
              />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Vazifa per Dabba (€)</label>
              <input
                  type="number"
                  step="0.01"
                  style={styles.input}
                  placeholder="0.00"
                  value={form.vazifa_per_dabba}
                  onChange={e => set('vazifa_per_dabba', e.target.value)}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Thaali Category</label>
            <div style={styles.chipRow}>
              {CATEGORIES.map(c => (
                  <div
                      key={c}
                      style={{
                        ...styles.chip,
                        ...(form.thaali_category === c ? styles.chipActive : {}),
                      }}
                      onClick={() => set('thaali_category', form.thaali_category === c ? '' : c)}
                  >
                    {c}
                  </div>
              ))}
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Menu</label>
            <input
                style={styles.input}
                placeholder="e.g. Chicken Biryani, Naan, Kheer"
                value={form.menu}
                onChange={e => set('menu', e.target.value)}
            />
          </div>

          {/* Cost breakdown */}
          <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Cost Breakdown</p>

          <div style={styles.field}>
            <label style={styles.label}>Ingredient Cost (€)</label>
            <input
                type="number"
                step="0.01"
                style={styles.input}
                placeholder="0.00"
                value={form.ingredient_cost}
                onChange={e => set('ingredient_cost', e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Transport Cost (€)</label>
            <input
                type="number"
                step="0.01"
                style={styles.input}
                placeholder="0.00"
                value={form.transport_cost}
                onChange={e => set('transport_cost', e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Vazifa Cost (€) <span style={{ fontWeight: 400, color: '#9CA3AF' }}>= Thaalis × Vazifa/Dabba</span></label>
            <div style={{ ...styles.input, background: '#F9FAFB', color: '#6B7280' }}>
              {vazifaCost > 0 ? `€${vazifaCost.toFixed(2)}` : '—'}
            </div>
          </div>

          {/* Total cost display */}
          <div style={styles.totalCard}>
            <p style={styles.totalLabel}>Total Cost</p>
            <p style={styles.totalAmount}>€{totalCost.toFixed(2)}</p>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button
              type="submit"
              className="btn-primary"
              style={styles.submitBtn}
              disabled={saving}
          >
            {saving ? <span className="spinner" /> : isEdit ? 'Update Thaali Cost' : 'Save Thaali Cost'}
          </button>

          <div style={{ height: 100 }} />
        </form>
        <BottomNav />
      </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' },
  scroll: { flex: 1, overflowY: 'auto', padding: '0 24px', WebkitOverflowScrolling: 'touch' },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid var(--border-input)', fontSize: 14, fontFamily: 'inherit',
    color: '#1A1A1A', background: 'white', outline: 'none', boxSizing: 'border-box',
  },
  chipRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: {
    padding: '8px 16px', borderRadius: 20, border: '1px solid var(--border)',
    fontSize: 13, fontWeight: 500, color: '#6B7280', background: 'white',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  chipActive: { background: '#7C3AED', color: 'white', borderColor: '#7C3AED' },
  totalCard: {
    textAlign: 'center', padding: '16px', background: '#EDE9FE',
    borderRadius: 12, border: '1px solid #DDD6FE', marginBottom: 16,
  },
  totalLabel: { fontSize: 12, color: '#5B21B6', fontWeight: 500, marginBottom: 4 },
  totalAmount: { fontSize: 28, fontWeight: 700, color: '#7C3AED' },
  errorBox: {
    marginBottom: 12, padding: '10px 14px', borderRadius: 8,
    background: '#FEE2E2', color: '#DC2626', fontSize: 13, fontWeight: 500,
  },
  submitBtn: {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', marginTop: 8,
  },
}