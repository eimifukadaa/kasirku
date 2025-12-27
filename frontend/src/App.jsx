import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store'

// Layouts
import MainLayout from './components/layouts/MainLayout'
import AuthLayout from './components/layouts/AuthLayout'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Main Pages
import DashboardPage from './pages/dashboard/DashboardPage'
import POSPage from './pages/pos/POSPage'
import ProductsPage from './pages/products/ProductsPage'
import ProductFormPage from './pages/products/ProductFormPage'
import StockPage from './pages/stock/StockPage'
import CustomersPage from './pages/customers/CustomersPage'
import ReportsPage from './pages/reports/ReportsPage'
import SettingsPage from './pages/settings/SettingsPage'
import StoreSelectPage from './pages/StoreSelectPage'

// Protected Route Component
function ProtectedRoute({ children }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return children
}

// Role Protected Route Component
function RoleProtectedRoute({ children, roles }) {
    const user = useAuthStore((state) => state.user)

    if (!roles.includes(user?.role)) {
        return <Navigate to="/pos" replace />
    }

    return children
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />
    }

    return children
}

export default function App() {
    return (
        <Routes>
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <LoginPage />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <PublicRoute>
                            <RegisterPage />
                        </PublicRoute>
                    }
                />
            </Route>

            {/* Store Selection */}
            <Route
                path="/select-store"
                element={
                    <ProtectedRoute>
                        <StoreSelectPage />
                    </ProtectedRoute>
                }
            />

            {/* Main App Routes */}
            <Route
                element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                }
            >
                {/* Restricted to Owner/Admin */}
                <Route
                    path="/dashboard"
                    element={
                        <RoleProtectedRoute roles={['owner', 'admin']}>
                            <DashboardPage />
                        </RoleProtectedRoute>
                    }
                />
                <Route
                    path="/products"
                    element={
                        <RoleProtectedRoute roles={['owner', 'admin']}>
                            <ProductsPage />
                        </RoleProtectedRoute>
                    }
                />
                <Route
                    path="/products/new"
                    element={
                        <RoleProtectedRoute roles={['owner', 'admin']}>
                            <ProductFormPage />
                        </RoleProtectedRoute>
                    }
                />
                <Route
                    path="/products/:id"
                    element={
                        <RoleProtectedRoute roles={['owner', 'admin']}>
                            <ProductFormPage />
                        </RoleProtectedRoute>
                    }
                />
                <Route
                    path="/stock"
                    element={
                        <RoleProtectedRoute roles={['owner', 'admin']}>
                            <StockPage />
                        </RoleProtectedRoute>
                    }
                />
                <Route
                    path="/reports"
                    element={
                        <RoleProtectedRoute roles={['owner', 'admin']}>
                            <ReportsPage />
                        </RoleProtectedRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <RoleProtectedRoute roles={['owner', 'admin']}>
                            <SettingsPage />
                        </RoleProtectedRoute>
                    }
                />

                {/* Open to all roles (including Cashier) */}
                <Route path="/pos" element={<POSPage />} />
                <Route path="/customers" element={<CustomersPage />} />
            </Route>

            {/* Default redirect based on role */}
            <Route path="/" element={<Navigate to="/pos" replace />} />
            <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
    )
}
