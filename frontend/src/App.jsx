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
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/pos" element={<POSPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/new" element={<ProductFormPage />} />
                <Route path="/products/:id" element={<ProductFormPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}
