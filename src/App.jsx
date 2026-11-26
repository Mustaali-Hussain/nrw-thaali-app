import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import KhidmatHome from './pages/KhidmatHome'
import Profile from './pages/Profile'
import Feedback from './pages/Feedback'
import Collection from './pages/Collection'
import DabbaUser from './pages/DabbaUser'
import CookingKhidmat from './pages/CookingKhidmat'
import WeeklyMenu from './pages/WeeklyMenu'
import ManageUsers from './pages/ManageUsers'
import CreateUser from './pages/CreateUser'
import EditUser from './pages/EditUser'
import AdminReports from './pages/AdminReports'
import AdminFeedback from './pages/AdminFeedback'
import CollectionSettings from './pages/CollectionSettings'
import BudgetDash from './pages/BudgetDash'
import AddIncome from './pages/AddIncome'
import AddExpense from './pages/AddExpense'
import AddThaaliCost from './pages/AddThaaliCost'
import BudgetExport from './pages/BudgetExport'
import DabbaAdmin from './pages/DabbaAdmin'
import ZoneStatus from './pages/ZoneStatus'

function LoadingScreen() {
    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div className="spinner" />
        </div>
    )
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <LoadingScreen />
    if (!user) return <Navigate to="/login" replace />
    return children
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <LoadingScreen />
    if (user) return <Navigate to="/" replace />
    return children
}

function HomeLanding() {
    const { isAdmin, isDev, isKhidmatguzar, loading } = useAuth()
    if (loading) return <LoadingScreen />
    if (isAdmin || isDev) return <AdminDashboard />
    if (isKhidmatguzar) return <KhidmatHome />
    return <Dashboard />
}

function AppRoutes() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

            {/* Home — role-based landing */}
            <Route path="/" element={<ProtectedRoute><HomeLanding /></ProtectedRoute>} />

            {/* User pages */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
            <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
            <Route path="/dabba" element={<ProtectedRoute><DabbaUser /></ProtectedRoute>} />

            {/* Khidmatguzar pages */}
            <Route path="/cooking" element={<ProtectedRoute><CookingKhidmat /></ProtectedRoute>} />

            {/* Admin pages */}
            <Route path="/admin/menu" element={<ProtectedRoute><WeeklyMenu /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
            <Route path="/admin/users/create" element={<ProtectedRoute><CreateUser /></ProtectedRoute>} />
            <Route path="/admin/users/edit/:id" element={<ProtectedRoute><EditUser /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/feedback" element={<ProtectedRoute><AdminFeedback /></ProtectedRoute>} />
            <Route path="/admin/collection-settings" element={<ProtectedRoute><CollectionSettings /></ProtectedRoute>} />
            <Route path="/admin/zone-status" element={<ProtectedRoute><ZoneStatus /></ProtectedRoute>} />
            <Route path="/admin/dabba" element={<ProtectedRoute><DabbaAdmin /></ProtectedRoute>} />

            {/* Budget pages */}
            <Route path="/budget" element={<ProtectedRoute><BudgetDash /></ProtectedRoute>} />
            <Route path="/budget/add-income" element={<ProtectedRoute><AddIncome /></ProtectedRoute>} />
            <Route path="/budget/edit-income/:id" element={<ProtectedRoute><AddIncome /></ProtectedRoute>} />
            <Route path="/budget/add-expense" element={<ProtectedRoute><AddExpense /></ProtectedRoute>} />
            <Route path="/budget/edit-expense/:id" element={<ProtectedRoute><AddExpense /></ProtectedRoute>} />
            <Route path="/budget/add-thaali-cost" element={<ProtectedRoute><AddThaaliCost /></ProtectedRoute>} />
            <Route path="/budget/edit-thaali-cost/:id" element={<ProtectedRoute><AddThaaliCost /></ProtectedRoute>} />
            <Route path="/budget/export" element={<ProtectedRoute><BudgetExport /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    )
}