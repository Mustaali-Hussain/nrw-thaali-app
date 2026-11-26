/*
 * PageLoader — Full-page loading indicator
 * Shows a pulsing thaali-green spinner with optional message.
 * Usage: <PageLoader /> or <PageLoader message="Loading menus..." />
 */

export default function PageLoader({ message }) {
    return (
        <div style={styles.wrap}>
            <div style={styles.spinnerRing}>
                <div style={styles.innerDot} />
            </div>
            {message && <p style={styles.msg}>{message}</p>}
        </div>
    )
}

const styles = {
    wrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: 16,
    },
    spinnerRing: {
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '3px solid #E8F5EE',
        borderTopColor: 'var(--primary)',
        animation: 'spin 0.7s linear infinite',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    innerDot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: 'var(--primary)',
        opacity: 0.3,
        animation: 'pulse 1.2s ease-in-out infinite',
    },
    msg: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: 500,
    },
}