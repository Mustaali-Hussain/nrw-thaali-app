import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

/*
 * BudgetDash — Budget dashboard with tabs
 * Fetches real data from budget_income, budget_expenses, budget_thaali_costs
 */

export default function BudgetDash() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('income')
  const [income, setIncome] = useState([])
  const [expenses, setExpenses] = useState([])
  const [thaaliCosts, setThaaliCosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [incRes, expRes, thRes] = await Promise.all([
      supabase.from('budget_income').select('*').order('date', { ascending: false }),
      supabase.from('budget_expenses').select('*').order('date', { ascending: false }),
      supabase.from('budget_thaali_costs').select('*').order('date', { ascending: false }),
    ])
    setIncome(incRes.data || [])
    setExpenses(expRes.data || [])
    setThaaliCosts(thRes.data || [])
    setLoading(false)
  }

  const totalIncome = income.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const totalExpense = expenses.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const totalThaali = thaaliCosts.reduce((s, r) => s + parseFloat(r.total_cost || 0), 0)
  const inHand = totalIncome - totalExpense - totalThaali

  const fmtDate = d => {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  async function handleDelete(table, id) {
    if (!confirm('Delete this entry?')) return
    await supabase.from(table).delete().eq('id', id)
    fetchAll()
  }

  const tabs = [
    { id: 'income', label: 'Income' },
    { id: 'expense', label: 'Expenses' },
    { id: 'thaali', label: 'Thaali Cost' },
  ]

  return (
      <div style={styles.page}>
        <div style={styles.statusBar} />

        <div style={styles.header}>
          <div>
            <p style={styles.adminLabel}>Admin Panel</p>
            <h1 style={styles.pageTitle}>Budget</h1>
          </div>
          <div style={styles.exportBtn} onClick={() => navigate('/budget/export')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
        </div>

        <div style={styles.scroll}>
          {/* Stat cards */}
          <div style={styles.statsRow}>
            <div style={{ ...styles.statCard, borderLeft: '3px solid #86EFAC' }}>
              <p style={styles.statLabel}>Total Income</p>
              <p style={{ ...styles.statNumber, color: 'var(--primary)' }}>
                {loading ? '...' : `€${totalIncome.toFixed(2)}`}
              </p>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '3px solid #FCA5A5' }}>
              <p style={styles.statLabel}>Total Expense</p>
              <p style={{ ...styles.statNumber, color: '#DC2626' }}>
                {loading ? '...' : `€${(totalExpense + totalThaali).toFixed(2)}`}
              </p>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '3px solid #93C5FD' }}>
              <p style={styles.statLabel}>In Hand</p>
              <p style={{ ...styles.statNumber, color: '#2563EB' }}>
                {loading ? '...' : `€${inHand.toFixed(2)}`}
              </p>
            </div>
          </div>

          {/* Quick action buttons */}
          <div style={styles.actionsRow}>
            <button style={{ ...styles.actionBtn, background: '#E8F5EE', color: 'var(--primary)' }} onClick={() => navigate('/budget/add-income')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Income
            </button>
            <button style={{ ...styles.actionBtn, background: '#FEE2E2', color: '#DC2626' }} onClick={() => navigate('/budget/add-expense')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Expense
            </button>
            <button style={{ ...styles.actionBtn, background: '#EDE9FE', color: '#7C3AED' }} onClick={() => navigate('/budget/add-thaali-cost')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Thaali Cost
            </button>
          </div>

          {/* Tabs */}
          <div style={styles.tabBar}>
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    style={{
                      ...styles.tab,
                      ...(activeTab === tab.id ? styles.tabActive : styles.tabInactive),
                    }}
                    onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </div>
            ))}
          </div>

          {/* Tab content */}
          {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                <span className="spinner" />
              </div>
          ) : (
              <>
                {activeTab === 'income' && (
                    <div className="field-card" style={{ padding: 0, overflow: 'hidden' }}>
                      {income.length === 0 ? (
                          <p style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No income recorded yet</p>
                      ) : income.map((row, i) => (
                          <div key={row.id} style={{ ...styles.entryRow, background: i % 2 === 1 ? '#FAFAF7' : 'white' }}>
                            <div style={{ flex: 1 }}>
                              <p style={styles.entryTitle}>{row.received_by || row.description || 'Income'}</p>
                              <p style={styles.entryDetail}>{fmtDate(row.date)}{row.description && row.received_by ? ` · ${row.description}` : ''}</p>
                            </div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>€{parseFloat(row.amount).toFixed(2)}</p>
                            <div style={styles.editIcons}>
                              <svg onClick={() => navigate(`/budget/edit-income/${row.id}`)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'pointer' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              <svg onClick={() => handleDelete('budget_income', row.id)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2" style={{ cursor: 'pointer' }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </div>
                          </div>
                      ))}
                    </div>
                )}

                {activeTab === 'expense' && (
                    <div className="field-card" style={{ padding: 0, overflow: 'hidden' }}>
                      {expenses.length === 0 ? (
                          <p style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No expenses recorded yet</p>
                      ) : expenses.map((row, i) => (
                          <div key={row.id} style={{ ...styles.entryRow, background: i % 2 === 1 ? '#FAFAF7' : 'white' }}>
                            <div style={{ flex: 1 }}>
                              <p style={styles.entryTitle}>{row.paid_for || row.paid_to || 'Expense'}</p>
                              <p style={styles.entryDetail}>{fmtDate(row.date)}{row.paid_by ? ` · Paid by ${row.paid_by}` : ''}{row.comments ? ` · ${row.comments}` : ''}</p>
                            </div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>€{parseFloat(row.amount).toFixed(2)}</p>
                            <div style={styles.editIcons}>
                              <svg onClick={() => navigate(`/budget/edit-expense/${row.id}`)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'pointer' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              <svg onClick={() => handleDelete('budget_expenses', row.id)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2" style={{ cursor: 'pointer' }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </div>
                          </div>
                      ))}
                    </div>
                )}

                {activeTab === 'thaali' && (
                    <div className="field-card" style={{ padding: 0, overflow: 'hidden' }}>
                      {thaaliCosts.length === 0 ? (
                          <p style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No thaali costs recorded yet</p>
                      ) : thaaliCosts.map((row, i) => {
                        const perThaali = row.no_of_thaalis ? (parseFloat(row.total_cost) / row.no_of_thaalis).toFixed(2) : null
                        return (
                            <div key={row.id} style={{ ...styles.entryRow, background: i % 2 === 1 ? '#FAFAF7' : 'white' }}>
                              <div style={{ flex: 1 }}>
                                <p style={styles.entryTitle}>{row.menu || row.mauze || 'Thaali'}</p>
                                <p style={styles.entryDetail}>
                                  {fmtDate(row.date)}
                                  {row.no_of_thaalis ? ` · ${row.no_of_thaalis} thaalis` : ''}
                                  {perThaali ? ` · €${perThaali}/each` : ''}
                                  {row.khidmatguzaar ? ` · ${row.khidmatguzaar}` : ''}
                                </p>
                              </div>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED' }}>€{parseFloat(row.total_cost).toFixed(2)}</p>
                              <div style={styles.editIcons}>
                                <svg onClick={() => navigate(`/budget/edit-thaali-cost/${row.id}`)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'pointer' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                <svg onClick={() => handleDelete('budget_thaali_costs', row.id)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2" style={{ cursor: 'pointer' }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </div>
                            </div>
                        )
                      })}
                    </div>
                )}
              </>
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
  header: {
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    marginBottom: 16,
  },
  adminLabel: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: 600,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1A1A1A',
    marginTop: 4,
  },
  exportBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#FEE2E2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px',
    WebkitOverflowScrolling: 'touch',
  },
  statsRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    background: 'var(--surface)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    padding: '12px 10px',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: 500,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
  },
  actionsRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    padding: '10px 8px',
    borderRadius: 10,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabBar: {
    display: 'flex',
    background: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    textAlign: 'center',
    padding: '8px 4px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'white',
    color: '#374151',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  tabInactive: {
    background: 'transparent',
    color: '#6B7280',
  },
  entryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderTop: '1px solid #F3F4F6',
  },
  entryTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  entryDetail: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  editIcons: {
    display: 'flex',
    gap: 10,
    flexShrink: 0,
    marginLeft: 8,
  },
}