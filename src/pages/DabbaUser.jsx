import BackHeader from '../components/BackHeader'
import BottomNav from '../components/BottomNav'

/*
 * DabbaUser — User dabba (box) management screen
 * Matches prototype's "dabbaUser" screen.
 *
 * Layout:
 *   BackHeader "Dabba Management"
 *   Box stats (At Home / With Others)
 *   "Who has your boxes" table
 *   "Boxes you're holding" table with Return action
 */

export default function DabbaUser() {
  const myBoxes = [
    { holder: 'Ali Q.', qty: 1, since: 'Nov 12' },
    { holder: 'Taher S.', qty: 2, since: 'Nov 5' },
  ]

  const holdingBoxes = [
    { owner: 'Husain B.', qty: 1, since: 'Nov 15' },
  ]

  return (
    <div style={styles.page}>
      <div style={styles.statusBar} />

      <div style={styles.headerArea}>
        <p style={styles.pageTitle}>Dabba Management</p>
      </div>

      <div style={styles.scroll}>
        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={{ ...styles.statNumber, color: 'var(--primary)' }}>4</p>
            <p style={styles.statLabel}>At Home</p>
          </div>
          <div style={styles.statCard}>
            <p style={{ ...styles.statNumber, color: '#D97706' }}>3</p>
            <p style={styles.statLabel}>With Others</p>
          </div>
        </div>

        {/* Who has your boxes */}
        <p className="section-title">Who has your boxes</p>
        <div className="field-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={styles.tableHeader}>
            <p style={styles.th}>Person</p>
            <p style={{ ...styles.th, textAlign: 'center' }}>Qty</p>
            <p style={{ ...styles.th, textAlign: 'center' }}>Since</p>
          </div>
          {myBoxes.map((row, i) => (
            <div key={i} style={{ ...styles.tableRow, background: i % 2 === 1 ? '#FAFAF7' : 'white' }}>
              <p style={styles.td}>{row.holder}</p>
              <p style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>{row.qty}</p>
              <p style={{ ...styles.td, textAlign: 'center', color: '#9CA3AF' }}>{row.since}</p>
            </div>
          ))}
        </div>

        {/* Boxes you're holding */}
        <p className="section-title" style={{ marginTop: 16 }}>Boxes you're holding</p>
        <div className="field-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={styles.tableHeader}>
            <p style={styles.th}>Owner</p>
            <p style={{ ...styles.th, textAlign: 'center' }}>Qty</p>
            <p style={{ ...styles.th, textAlign: 'center' }}>Action</p>
          </div>
          {holdingBoxes.map((row, i) => (
            <div key={i} style={{ ...styles.tableRow, background: i % 2 === 1 ? '#FAFAF7' : 'white' }}>
              <p style={styles.td}>{row.owner}</p>
              <p style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>{row.qty}</p>
              <div style={{ textAlign: 'center' }}>
                <span style={styles.returnBtn}>Return</span>
              </div>
            </div>
          ))}
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
  statsRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    background: 'var(--surface)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    padding: '14px 12px',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 500,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 0.6fr 0.8fr',
    padding: '10px 14px',
    background: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  th: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 0.6fr 0.8fr',
    padding: '11px 14px',
    borderTop: '1px solid #F3F4F6',
    alignItems: 'center',
  },
  td: {
    fontSize: 12,
    color: '#374151',
  },
  returnBtn: {
    fontSize: 11,
    color: 'white',
    background: 'var(--primary)',
    borderRadius: 6,
    padding: '4px 10px',
    cursor: 'pointer',
    fontWeight: 500,
  },
}
