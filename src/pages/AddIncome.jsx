import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'

/*
 * AddIncome — Add or edit income entry
 * Fields: Date, Received By, Description, Amount (€)
 */

export default function AddIncome() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    received_by: '',
    description: '',
    amount: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
        ;(async () => {
      const { data } = await supabase.from('budget_income').select('*').eq('id', id).single()
      if (data) setForm({
        date: data.date || '',
        received_by: data.received_by || '',
        description: data.description || '',
        amount: data.amount?.toString() || '',
      })
      setLoading(false)
    })()
  }, [id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.date || !form.received_by.trim() || !form.amount) {
      setError('Date, Received By and Amount are required')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      date: form.date,
      received_by: form.received_by.trim(),
      description: form.description.trim() || null,
      amount: parseFloat(form.amount),
    }

    const { error: dbErr } = isEdit
        ? await supabase.from('budget_income').update(payload).eq('id', id)
        : await supabase.from('budget_income').insert(payload)

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
        <BackHeader title="Edit Income" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>
        <BottomNav />
      </div>
  )

  return (
      <div style={styles.page}>
        <div style={{ height: 44, flexShrink: 0 }} />
        <BackHeader title={isEdit ? 'Edit Income' : 'Add Income'} />

        <form onSubmit={handleSubmit} style={styles.scroll}>
          <div style={styles.field}>
            <label style={styles.label}>Date *</label>
            <input type="date" style={styles.input} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Received By *</label>
            <input style={styles.input} placeholder="e.g. Bhai Saheb, Bank Transfer" value={form.received_by} onChange={e => set('received_by', e.target.value)} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <input style={styles.input} placeholder="e.g. Monthly Collection, Donation" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Amount (€) *</label>
            <input type="number" step="0.01" style={styles.input} placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={saving}>
            {saving ? <span className="spinner" /> : isEdit ? 'Update Income' : 'Add Income'}
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
  errorBox: {
    marginBottom: 12, padding: '10px 14px', borderRadius: 8,
    background: '#FEE2E2', color: '#DC2626', fontSize: 13, fontWeight: 500,
  },
  submitBtn: {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', marginTop: 8,
  },
}