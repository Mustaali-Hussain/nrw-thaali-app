import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'

/*
 * AddExpense — Add or edit expense entry
 * Fields: Date, Thaali Date, Paid By, Paid For, Paid To, Amount (€), Comments, Receipt Reference
 */

export default function AddExpense() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    thaali_date: '',
    paid_by: '',
    paid_for: '',
    paid_to: '',
    amount: '',
    comments: '',
    receipt_reference: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
        ;(async () => {
      const { data } = await supabase.from('budget_expenses').select('*').eq('id', id).single()
      if (data) setForm({
        date: data.date || '',
        thaali_date: data.thaali_date || '',
        paid_by: data.paid_by || '',
        paid_for: data.paid_for || '',
        paid_to: data.paid_to || '',
        amount: data.amount?.toString() || '',
        comments: data.comments || '',
        receipt_reference: data.receipt_reference || '',
      })
      setLoading(false)
    })()
  }, [id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.date || !form.paid_by.trim() || !form.amount) {
      setError('Date, Paid By and Amount are required')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      date: form.date,
      thaali_date: form.thaali_date || null,
      paid_by: form.paid_by.trim(),
      paid_for: form.paid_for.trim() || null,
      paid_to: form.paid_to.trim() || null,
      amount: parseFloat(form.amount),
      comments: form.comments.trim() || null,
      receipt_reference: form.receipt_reference.trim() || null,
    }

    const { error: dbErr } = isEdit
        ? await supabase.from('budget_expenses').update(payload).eq('id', id)
        : await supabase.from('budget_expenses').insert(payload)

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
        <BackHeader title="Edit Expense" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>
        <BottomNav />
      </div>
  )

  return (
      <div style={styles.page}>
        <div style={{ height: 44, flexShrink: 0 }} />
        <BackHeader title={isEdit ? 'Edit Expense' : 'Add Expense'} />

        <form onSubmit={handleSubmit} style={styles.scroll}>
          <div style={styles.warning}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p style={styles.warningText}>Please keep all receipts for record keeping</p>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Date *</label>
            <input type="date" style={styles.input} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Thaali Date</label>
            <input type="date" style={styles.input} value={form.thaali_date} onChange={e => set('thaali_date', e.target.value)} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Paid By *</label>
            <input style={styles.input} placeholder="e.g. Bhai Saheb" value={form.paid_by} onChange={e => set('paid_by', e.target.value)} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Paid For</label>
            <input style={styles.input} placeholder="e.g. Ingredients, Transport" value={form.paid_for} onChange={e => set('paid_for', e.target.value)} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Paid To</label>
            <input style={styles.input} placeholder="e.g. REWE, Metro" value={form.paid_to} onChange={e => set('paid_to', e.target.value)} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Amount (€) *</label>
            <input type="number" step="0.01" style={styles.input} placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Comments</label>
            <textarea style={{ ...styles.input, minHeight: 70, resize: 'vertical' }} placeholder="Optional notes..." value={form.comments} onChange={e => set('comments', e.target.value)} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Receipt Reference</label>
            <input style={styles.input} placeholder="e.g. Receipt #123, Photo name" value={form.receipt_reference} onChange={e => set('receipt_reference', e.target.value)} />
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={saving}>
            {saving ? <span className="spinner" /> : isEdit ? 'Update Expense' : 'Add Expense'}
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
  warning: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
    background: '#FEF3C7', borderRadius: 10, border: '1px solid #FDE68A', marginBottom: 16,
  },
  warningText: { fontSize: 12, color: '#92400E', fontWeight: 500 },
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