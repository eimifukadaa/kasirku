import { useQuery } from '@tanstack/react-query'
import { useStoreStore } from '../../store'
import { reportsAPI, stockAPI } from '../../services/api'
import {
    TrendingUp,
    ShoppingCart,
    Package,
    Users,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
    const navigate = useNavigate()
    const { currentStore } = useStoreStore()

    if (!currentStore) {
        return null
    }

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard', currentStore?.id],
        queryFn: async () => {
            const now = new Date();
            const today = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0');

            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            const response = await reportsAPI.getDashboard(currentStore.id, {
                date: today,
                timezone: timezone
            })
            return response.data.data
        },
        enabled: !!currentStore?.id,
    })

    const { data: lowStock } = useQuery({
        queryKey: ['low-stock', currentStore?.id],
        queryFn: async () => {
            const response = await stockAPI.getLowStock(currentStore.id)
            return response.data.data || []
        },
        enabled: !!currentStore?.id,
    })

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount || 0)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Today's Stats */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Hari Ini</h2>
                <div className="grid grid-cols-2 gap-3">
                    <div className="card p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-sm text-slate-500">Penjualan</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900">
                            {formatMoney(stats?.today_sales)}
                        </p>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                            {stats?.today_transactions || 0} transaksi
                        </p>
                    </div>

                    <div className="card p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-sm text-slate-500">Profit</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900">
                            {formatMoney(stats?.today_profit)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Keuntungan kotor</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Aksi Cepat</h2>
                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={() => navigate('/pos')}
                        className="pos-button"
                    >
                        <ShoppingCart className="w-6 h-6 text-primary-600 mb-1" />
                        <span className="text-xs">Kasir</span>
                    </button>
                    <button
                        onClick={() => navigate('/products/new')}
                        className="pos-button"
                    >
                        <Package className="w-6 h-6 text-blue-600 mb-1" />
                        <span className="text-xs">+ Produk</span>
                    </button>
                    <button
                        onClick={() => navigate('/stock')}
                        className="pos-button"
                    >
                        <Package className="w-6 h-6 text-orange-600 mb-1" />
                        <span className="text-xs">Stok</span>
                    </button>
                    <button
                        onClick={() => navigate('/reports')}
                        className="pos-button"
                    >
                        <TrendingUp className="w-6 h-6 text-purple-600 mb-1" />
                        <span className="text-xs">Laporan</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">Minggu Ini</span>
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                        </div>
                    </div>
                    <p className="text-lg font-bold">{formatMoney(stats?.week_sales)}</p>
                    <p className="text-xs text-slate-500">{stats?.week_transactions} trx</p>
                </div>

                <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">Bulan Ini</span>
                        <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-pink-600" />
                        </div>
                    </div>
                    <p className="text-lg font-bold">{formatMoney(stats?.month_sales)}</p>
                    <p className="text-xs text-slate-500">{stats?.month_transactions} trx</p>
                </div>

                <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">Total Produk</span>
                        <Package className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-lg font-bold">{stats?.total_products || 0}</p>
                </div>

                <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">Total Customer</span>
                        <Users className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-lg font-bold">{stats?.total_customers || 0}</p>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStock && lowStock.length > 0 && (
                <div className="card border-orange-200 bg-orange-50">
                    <div className="p-4 border-b border-orange-200">
                        <div className="flex items-center gap-2 text-orange-700">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-semibold">Stok Hampir Habis</span>
                            <span className="badge bg-orange-200 text-orange-800 ml-auto">
                                {lowStock.length}
                            </span>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        {lowStock.slice(0, 5).map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                                <span className="text-sm text-slate-700">{item.name}</span>
                                <span className="text-sm font-medium text-orange-600">
                                    {item.stock} {item.unit}
                                </span>
                            </div>
                        ))}
                        {lowStock.length > 5 && (
                            <button
                                onClick={() => navigate('/stock')}
                                className="text-sm text-orange-600 font-medium"
                            >
                                Lihat semua ({lowStock.length} produk)
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
