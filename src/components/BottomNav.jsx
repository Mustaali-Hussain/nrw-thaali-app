import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

/*
 * BottomNav — the fixed tab bar at the bottom of every main screen
 *
 * Different roles see different tabs:
 *   User:  Home, Schedule, Dabba, Settings (4 tabs)
 *   Admin: Dash, Users, Dabba, Budget, Reports (5 tabs)
 *
 * Uses <NavLink> from React Router — it automatically adds
 * an "active" class to the current route's tab.
 *
 * Design specs from prototype:
 *   - padding: 12px 24px 28px
 *   - border-top: 1px solid var(--border-light)
 *   - icons: 22×22px SVG
 *   - labels: 10px, 500 weight, color #9CA3AF (active: var(--primary), 600 weight)
 *   - gap between icon and label: 4px
 */

// ─── SVG Icons (extracted from the prototype) ───

function HomeIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    )
}

function CalendarIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    )
}

function BoxIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
    )
}

function SettingsIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09" />
        </svg>
    )
}

function UsersIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}

function ChartIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
    )
}

function WalletIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
    )
}

// ─── User Navigation (4 tabs) ───

function MapPinIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    )
}

const userTabs = [
    { to: '/', icon: HomeIcon, label: 'Home' },
    { to: '/collection', icon: MapPinIcon, label: 'Collection' },
    { to: '/dabba', icon: BoxIcon, label: 'Dabba' },
    { to: '/profile', icon: SettingsIcon, label: 'Settings' },
]

// ─── Admin Navigation (5 tabs) ───

const adminTabs = [
    { to: '/', icon: HomeIcon, label: 'Dash' },
    { to: '/admin/users', icon: UsersIcon, label: 'Users' },
    { to: '/admin/dabba', icon: BoxIcon, label: 'Dabba' },
    { to: '/budget', icon: WalletIcon, label: 'Budget' },
    { to: '/admin/reports', icon: ChartIcon, label: 'Reports' },
]

// ─── Khidmatguzar Navigation (5 tabs — user tabs + Cooking) ───

function CookingIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2C9 2 6 4 6 7c0 2 1 3 2 4H4v2h16v-2h-4c1-1 2-2 2-4 0-3-3-5-6-5z"/>
            <rect x="5" y="15" width="14" height="2" rx="1"/>
            <path d="M6 19h12v2H6z"/>
        </svg>
    )
}

const khidmatTabs = [
    { to: '/', icon: HomeIcon, label: 'Home' },
    { to: '/cooking', icon: CookingIcon, label: 'Cooking' },
    { to: '/collection', icon: MapPinIcon, label: 'Collection' },
    { to: '/dabba', icon: BoxIcon, label: 'Dabba' },
    { to: '/profile', icon: SettingsIcon, label: 'Settings' },
]

export default function BottomNav() {
    const { isAdmin, isDev, isKhidmatguzar } = useAuth()
    const tabs = (isAdmin || isDev) ? adminTabs : isKhidmatguzar ? khidmatTabs : userTabs

    return (
        <nav className="bottom-nav">
            {tabs.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Icon />
                    <span>{label}</span>
                </NavLink>
            ))}
        </nav>
    )
}