import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { useStoreStore, useAuthStore } from '../../store'
import {
    Home,
    ShoppingCart,
    Package,
    Users,
    BarChart3,
    Settings,
    Store,
    LogOut,
    Bell,
    Menu,
} from 'lucide-react'
import { useState } from 'react'

// List of all possible navigation items
const allNavItems = [
    { path: '/dashboard', icon: Home, label: 'Home', roles: ['owner', 'admin'] },
    { path: '/pos', icon: ShoppingCart, label: 'Kasir', roles: ['owner', 'admin', 'staff'] },
    { path: '/products', icon: Package, label: 'Produk', roles: ['owner', 'admin'] },
    { path: '/customers', icon: Users, label: 'Customer', roles: ['owner', 'admin', 'staff'] },
    { path: '/settings', icon: Settings, label: 'Setting', roles: ['owner', 'admin'] },
]

export default function MainLayout() {
    const navigate = useNavigate()
    const { currentStore } = useStoreStore()
    const { user, logout } = useAuthStore()
    const [showMenu, setShowMenu] = useState(false)

    // Redirect to store selection if no store selected
    if (!currentStore) {
        return <Navigate to="/select-store" replace />
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    // Filter items based on user role
    const navItems = allNavItems.filter(item =>
        !item.roles || item.roles.includes(user?.role)
    )

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 safe-top">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="font-bold text-slate-900 dark:text-white">
                                {currentStore.name}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {user?.full_name} ({user?.role})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                        <button
                            onClick={() => navigate('/select-store')}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                        >
                            <Store className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Slide Menu */}
            {showMenu && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setShowMenu(false)}
                    />
                    <div className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-800 z-50 animate-slide-in shadow-2xl">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg">KASIRKU.APP</h2>
                                    <p className="text-sm text-slate-500">{user?.email}</p>
                                </div>
                            </div>
                        </div>

                        <nav className="p-4">
                            {/* Role-based sidebar items */}
                            {(user?.role === 'owner' || user?.role === 'admin') && (
                                <>
                                    <NavLink
                                        to="/reports"
                                        onClick={() => setShowMenu(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3 rounded-xl mb-2 ${isActive
                                                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`
                                        }
                                    >
                                        <BarChart3 className="w-5 h-5" />
                                        <span>Laporan</span>
                                    </NavLink>
                                    <NavLink
                                        to="/stock"
                                        onClick={() => setShowMenu(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3 rounded-xl mb-2 ${isActive
                                                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`
                                        }
                                    >
                                        <Package className="w-5 h-5" />
                                        <span>Stok Barang</span>
                                    </NavLink>
                                </>
                            )}

                            {/* POS is visible to all, but let's put it here just in case sidebar is used for more */}
                            <NavLink
                                to="/pos"
                                onClick={() => setShowMenu(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl mb-2 ${isActive
                                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`
                                }
                            >
                                <ShoppingCart className="w-5 h-5" />
                                <span>Kasir</span>
                            </NavLink>
                        </nav>

                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 w-full"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Keluar</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Main Content */}
            <main className="p-4">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <div className="flex justify-around items-center py-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`
                            }
                        >
                            <item.icon className="w-6 h-6" />
                            <span className="text-xs mt-1">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    )
}
