import BottomNav from '../components/BottomNav'

export default function DabbaAdmin() {
  return (
      <div style={styles.page}>
        <div style={styles.statusBar} />
        <div style={styles.header}>
          <p style={styles.adminLabel}>Admin Panel</p>
          <h1 style={styles.pageTitle}>Dabba Management</h1>
        </div>
        <div style={styles.scroll}>
          <div style={styles.placeholder}>
            <p style={styles.placeholderIcon}>📦</p>
            <p style={styles.placeholderText}>Dabba management coming soon</p>
          </div>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    textAlign: 'center',
    marginBottom: 80,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: 500,
  },
}