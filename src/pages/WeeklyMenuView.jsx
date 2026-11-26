import { useState } from 'react'
import BackHeader from '../components/BackHeader'

/*
 * WeeklyMenuView — Read-only weekly menu for users
 * Matches prototype's "weeklyMenuView" screen.
 *
 * Layout:
 *   BackHeader "Weekly Menu"
 *   Week navigator (< Week 47 — Nov 18-22 >)
 *   Per-day dish cards with badges (Main, Side, Dessert, Fruit)
 */

const WEEK_DATA = {
  label: 'Week 47 — Nov 18-22',
  days: [
    {
      day: 'Tuesday',
      date: 'Nov 19',
      dishes: [
        { type: 'Main', name: 'Chicken Biryani', badge: 'main' },
        { type: 'Roti', name: 'Naan', badge: 'side' },
        { type: 'Dessert', name: 'Kheer', badge: 'dessert' },
        { type: 'Fruit', name: 'Banana', badge: 'fruit' },
      ],
    },
    {
      day: 'Friday',
      date: 'Nov 22',
      dishes: [
        { type: 'Main', name: 'Mutton Haleem', badge: 'main' },
        { type: 'Roti', name: 'Naan', badge: 'side' },
      ],
    },
  ],
}

const badgeColors = {
  main: { bg: '#E8F5EE', color: '#1B7A4A' },
  side: { bg: '#FEF3C7', color: '#92400E' },
  dessert: { bg: '#EDE9FE', color: '#5B21B6' },
  fruit: { bg: '#FEE2E2', color: '#DC2626' },
}

export default function WeeklyMenuView() {
  const [week] = useState(WEEK_DATA)

  return (
    <div style={styles.page}>
      <div style={styles.statusBar} />
      <BackHeader title="Weekly Menu" />

      <div style={styles.scroll}>
        {/* Week navigator */}
        <div style={styles.weekNav}>
          <div style={styles.navArrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
          <p style={styles.weekLabel}>{week.label}</p>
          <div style={styles.navArrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>

        {/* Day cards */}
        {week.days.map((day, i) => (
          <div key={i} className="field-card" style={{ marginBottom: 16 }}>
            <div style={styles.dayHeader}>
              <p style={styles.dayName}>{day.day}</p>
              <p style={styles.dayDate}>{day.date}</p>
            </div>

            {day.dishes.map((dish, j) => (
              <div key={j} style={styles.dishRow}>
                <span style={{
                  ...styles.dishBadge,
                  background: badgeColors[dish.badge].bg,
                  color: badgeColors[dish.badge].color,
                }}>{dish.type}</span>
                <p style={styles.dishName}>{dish.name}</p>
              </div>
            ))}
          </div>
        ))}

        <div style={{ height: 24 }} />
      </div>
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
  weekNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'white',
    border: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dayName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1A1A1A',
  },
  dayDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 500,
  },
  dishRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderTop: '1px solid #F3F4F6',
  },
  dishBadge: {
    padding: '3px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  },
  dishName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
  },
}
