import BottomNav from '../components/BottomNav'

/*
 * DabbaAdmin — Admin dabba/box management
 * Matrix table (users × users, green=at home, amber=with someone)
 * Pending returns table with confirm action
 * "Add Member Boxes" dashed button
 * Main tab page WITH BottomNav
 */

const USERS = ['MH', 'AQ', 'TS', 'HB', 'FK', 'SJ']

// Matrix: matrix[row][col] = count or 0
// Green diagonal = at home, amber off-diagonal = with someone
const MATRIX = [
  [2, 1, 1, 0, 0, 0],
  [0, 3, 0, 1, 0, 0],
  [1, 0, 3, 0, 0, 0],
  [1, 0, 0, 2, 1, 0],
  [0, 0, 0, 0, 4, 0],
  [0, 1, 0, 0, 0, 3],
]

const PENDING = [
  { owner: 'MH', heldBy: 'Ali Q.', qty: 1 },
  { owner: 'MH', heldBy: 'Taher S.', qty: 1 },
  { owner: 'AQ', heldBy: 'Husain B.', qty: 1 },
  { owner: 'HB', heldBy: 'Fatema K.', qty: 1 },
  { owner: 'TS', heldBy: 'Mufaddal H.', qty: 1 },
]

export default function DabbaAdmin() {
  return (
    <div style={styles.page}>
      <div style={styles.statusBar} />

      <div style={styles.header}>
        <div>
          <p style={styles.adminLabel}>Admin Panel</p>
          <h1 style={styles.pageTitle}>Dabba Management</h1>
        </div>
      </div>

      <div style={styles.scroll}>
        {/* Matrix table */}
        <p style={styles.sectionTitle}>Box Distribution</p>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, position: 'sticky', left: 0, background: '#F9FAFB', zIndex: 2 }}></th>
                {USERS.map(u => (
                  <th key={u} style={styles.th}>{u}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 1 ? '#FAFAF7' : 'white' }}>
                  <td style={{
                    ...styles.tdLabel,
                    position: 'sticky',
                    left: 0,
                    background: ri % 2 === 1 ? '#FAFAF7' : 'white',
                    borderRight: '1px solid #E5E7EB',
                    zIndex: 1,
                  }}>
                    {USERS[ri]}
                  </td>
                  {row.map((val, ci) => (
                    <td key={ci} style={styles.td}>
                      {val === 0 ? (
                        <span style={{ color: '#D1D5DB' }}>·</span>
                      ) : (
                        <span style={{
                          fontWeight: ri === ci ? 700 : 600,
                          color: ri === ci ? '#1B7A4A' : '#D97706',
                        }}>
                          {val}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={styles.legend}>Green = at home · Amber = with someone else · · = none</p>

        {/* Pending Returns */}
        <p style={{ ...styles.sectionTitle, marginTop: 16 }}>Pending Returns</p>
        <div className="field-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={styles.pendingHeader}>
            <p style={{ ...styles.pendingHeaderText, flex: 1.2 }}>Owner</p>
            <p style={{ ...styles.pendingHeaderText, flex: 1.2 }}>Held by</p>
            <p style={{ ...styles.pendingHeaderText, flex: 0.6, textAlign: 'center' }}>Qty</p>
            <p style={{ ...styles.pendingHeaderText, flex: 0, width: 60, textAlign: 'center' }}>Action</p>
          </div>
          {PENDING.map((row, i) => (
            <div key={i} style={styles.pendingRow}>
              <p style={{ ...styles.pendingCell, flex: 1.2, fontWeight: 500 }}>{row.owner}</p>
              <p style={{ ...styles.pendingCell, flex: 1.2, color: '#6B7280' }}>{row.heldBy}</p>
              <p style={{ ...styles.pendingCell, flex: 0.6, textAlign: 'center', fontWeight: 600 }}>{row.qty}</p>
              <div style={{ flex: 0, width: 60, textAlign: 'center' }}>
                <div style={styles.confirmBtn}>✓</div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Member Boxes */}
        <div style={styles.addBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <p style={{ fontSize: 13, color: '#6B7280' }}>Add Member Boxes</p>
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
  statusBar: { height: 44, flexShrink: 0 },
  header: {
    padding: '0 24px',
    marginBottom: 16,
    flexShrink: 0,
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
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px',
    WebkitOverflowScrolling: 'touch',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 8,
  },
  tableWrap: {
    overflowX: 'auto',
    borderRadius: 12,
    border: '1px solid #E5E7EB',
    background: 'white',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  th: {
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    textAlign: 'center',
    background: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  tdLabel: {
    padding: '8px 10px',
    fontWeight: 600,
    color: '#374151',
    fontSize: 12,
  },
  td: {
    textAlign: 'center',
    padding: '8px 10px',
    fontSize: 12,
    borderTop: '1px solid #F3F4F6',
  },
  legend: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    margin: '8px 0 4px',
  },
  pendingHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    background: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  pendingHeaderText: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
  },
  pendingRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '11px 14px',
    borderTop: '1px solid #F3F4F6',
  },
  pendingCell: {
    fontSize: 12,
    color: '#374151',
  },
  confirmBtn: {
    fontSize: 10,
    color: 'white',
    cursor: 'pointer',
    background: '#1B7A4A',
    borderRadius: 6,
    padding: '3px 8px',
    display: 'inline-block',
  },
  addBtn: {
    marginTop: 12,
    padding: 14,
    background: 'white',
    border: '1px dashed #D1D5DB',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
  },
}
