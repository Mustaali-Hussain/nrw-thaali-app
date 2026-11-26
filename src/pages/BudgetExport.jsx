import { useState } from 'react'
import { supabase } from '../lib/supabase'
import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'

/*
 * BudgetExport — Export budget data as CSV with date range filter
 * Downloads: Income, Expense, Thaali Cost, or Full Summary
 */

function toCSV(headers, rows) {
  const escape = v => {
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
        ? '"' + s.replace(/"/g, '""') + '"'
        : s
  }
  const lines = [headers.map(escape).join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','))
  }
  return lines.join('\n')
}

function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const EXPORT_OPTIONS = [
  {
    id: 'income',
    title: 'Income Report',
    desc: 'All income entries for the selected period',
    icon: '📥',
    color: '#E8F5EE',
    accent: 'var(--primary)',
    table: 'budget_income',
    headers: ['date', 'received_by', 'description', 'amount'],
    filename: 'income_report',
  },
  {
    id: 'expense',
    title: 'Expense Report',
    desc: 'All expense entries with breakdowns',
    icon: '📤',
    color: '#FEE2E2',
    accent: '#DC2626',
    table: 'budget_expenses',
    headers: ['date', 'thaali_date', 'paid_by', 'paid_for', 'paid_to', 'amount', 'comments', 'receipt_reference'],
    filename: 'expense_report',
  },
  {
    id: 'thaali',
    title: 'Thaali Cost Report',
    desc: 'Per-thaali cost analysis over time',
    icon: '🍽️',
    color: '#EDE9FE',
    accent: '#7C3AED',
    table: 'budget_thaali_costs',
    headers: ['date', 'hijri_date', 'khidmatguzaar', 'mauze', 'no_of_thaalis', 'vazifa_per_dabba', 'thaali_category', 'menu', 'total_cost', 'ingredient_cost', 'transport_cost', 'vazifa_cost'],
    filename: 'thaali_cost_report',
  },
]

export default function BudgetExport() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [downloading, setDownloading] = useState('')

  async function fetchAndDownload(opt) {
    setDownloading(opt.id)

    let query = supabase.from(opt.table).select('*').order('date', { ascending: true })
    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)

    const { data, error } = await query
    if (error) {
      alert('Error fetching data: ' + error.message)
      setDownloading('')
      return
    }
    if (!data || data.length === 0) {
      alert('No data found for the selected period')
      setDownloading('')
      return
    }

    const suffix = dateFrom || dateTo
        ? `_${dateFrom || 'start'}_to_${dateTo || 'now'}`
        : ''
    const csv = toCSV(opt.headers, data)
    downloadCSV(`${opt.filename}${suffix}.csv`, csv)
    setDownloading('')
  }

  async function handleFullSummary() {
    setDownloading('full')

    const buildQuery = (table) => {
      let q = supabase.from(table).select('*').order('date', { ascending: true })
      if (dateFrom) q = q.gte('date', dateFrom)
      if (dateTo) q = q.lte('date', dateTo)
      return q
    }

    const [incRes, expRes, thRes] = await Promise.all([
      buildQuery('budget_income'),
      buildQuery('budget_expenses'),
      buildQuery('budget_thaali_costs'),
    ])

    if (incRes.error || expRes.error || thRes.error) {
      alert('Error fetching data')
      setDownloading('')
      return
    }

    const inc = incRes.data || []
    const exp = expRes.data || []
    const th = thRes.data || []

    const totalIncome = inc.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const totalExpense = exp.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const totalThaali = th.reduce((s, r) => s + parseFloat(r.total_cost || 0), 0)

    let lines = []
    lines.push('NRW Thaali — Full Budget Summary')
    lines.push(`Period: ${dateFrom || 'All'} to ${dateTo || 'Now'}`)
    lines.push('')
    lines.push(`Total Income,€${totalIncome.toFixed(2)}`)
    lines.push(`Total Expenses,€${totalExpense.toFixed(2)}`)
    lines.push(`Total Thaali Costs,€${totalThaali.toFixed(2)}`)
    lines.push(`In Hand,€${(totalIncome - totalExpense - totalThaali).toFixed(2)}`)
    lines.push('')

    // Income section
    lines.push('--- INCOME ---')
    if (inc.length > 0) {
      lines.push(toCSV(['date', 'received_by', 'description', 'amount'], inc))
    } else {
      lines.push('No income entries')
    }
    lines.push('')

    // Expense section
    lines.push('--- EXPENSES ---')
    if (exp.length > 0) {
      lines.push(toCSV(['date', 'thaali_date', 'paid_by', 'paid_for', 'paid_to', 'amount', 'comments', 'receipt_reference'], exp))
    } else {
      lines.push('No expense entries')
    }
    lines.push('')

    // Thaali cost section
    lines.push('--- THAALI COSTS ---')
    if (th.length > 0) {
      lines.push(toCSV(['date', 'hijri_date', 'khidmatguzaar', 'mauze', 'no_of_thaalis', 'vazifa_per_dabba', 'thaali_category', 'menu', 'total_cost', 'ingredient_cost', 'transport_cost', 'vazifa_cost'], th))
    } else {
      lines.push('No thaali cost entries')
    }

    const suffix = dateFrom || dateTo
        ? `_${dateFrom || 'start'}_to_${dateTo || 'now'}`
        : ''
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `full_budget_summary${suffix}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading('')
  }

  return (
      <div style={styles.page}>
        <BackHeader title="Export Data" />

        <div style={styles.scroll}>
          {/* Date range */}
          <div style={styles.dateRange}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>From</label>
              <input
                  type="date"
                  style={styles.input}
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>To</label>
              <input
                  type="date"
                  style={styles.input}
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <p style={styles.hint}>Leave empty to export all data</p>

          {/* Export options */}
          <p style={styles.sectionTitle}>Select Export Type</p>

          {EXPORT_OPTIONS.map(opt => (
              <div
                  key={opt.id}
                  style={{ ...styles.exportCard, opacity: downloading && downloading !== opt.id ? 0.5 : 1 }}
                  onClick={() => !downloading && fetchAndDownload(opt)}
              >
                <div style={{ ...styles.iconCircle, background: opt.color }}>
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={styles.cardTitle}>{opt.title}</p>
                  <p style={styles.cardDesc}>{opt.desc}</p>
                </div>
                {downloading === opt.id ? (
                    <span className="spinner" />
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={opt.accent} strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                )}
              </div>
          ))}

          {/* Full summary */}
          <div
              style={{ ...styles.exportCard, opacity: downloading && downloading !== 'full' ? 0.5 : 1 }}
              onClick={() => !downloading && handleFullSummary()}
          >
            <div style={{ ...styles.iconCircle, background: '#DBEAFE' }}>
              <span style={{ fontSize: 20 }}>📊</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={styles.cardTitle}>Full Summary</p>
              <p style={styles.cardDesc}>Complete financial overview with all categories</p>
            </div>
            {downloading === 'full' ? (
                <span className="spinner" />
            ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
            )}
          </div>

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
  dateRange: {
    display: 'flex',
    gap: 12,
    marginBottom: 8,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid var(--border-input)',
    fontSize: 13,
    fontFamily: 'inherit',
    color: '#1A1A1A',
    background: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 12,
  },
  exportCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px',
    background: 'var(--surface)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    marginBottom: 10,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
  },
  cardDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
}