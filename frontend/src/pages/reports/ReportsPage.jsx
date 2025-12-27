import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStoreStore } from '../../store'
import { reportsAPI } from '../../services/api'
import toast from 'react-hot-toast'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts'
import {
    TrendingUp,
    Package,
    Calendar,
    Download,
    ShoppingBag,
    Users,
    DollarSign,
    Inbox,
    RefreshCw,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'

export default function ReportsPage() {
    const { currentStore } = useStoreStore()
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        return now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
    })
    const [activeTab, setActiveTab] = useState('daily')
    const [dateRange, setDateRange] = useState('week')

    // Daily report
    const { data: dailyData, isLoading: isLoadingDaily } = useQuery({
        queryKey: ['report-daily', currentStore?.id, selectedDate],
        queryFn: async () => {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            const response = await reportsAPI.getDaily(currentStore.id, {
                date: selectedDate,
                timezone: timezone
            })
            return response.data.data
        },
        enabled: !!currentStore?.id,
    })

    // Weekly report
    const { data: weeklyData, isLoading: isLoadingWeekly } = useQuery({
        queryKey: ['report-weekly', currentStore?.id],
        queryFn: async () => {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            const response = await reportsAPI.getWeekly(currentStore.id, {
                weeks: 8,
                timezone: timezone
            })
            return response.data.data || []
        },
        enabled: !!currentStore?.id && (activeTab === 'sales' || activeTab === 'daily'),
    })

    // Monthly report
    const { data: monthlyData } = useQuery({
        queryKey: ['report-monthly', currentStore?.id],
        queryFn: async () => {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            const response = await reportsAPI.getMonthly(currentStore.id, {
                months: 6,
                timezone: timezone
            })
            return response.data.data || []
        },
        enabled: !!currentStore?.id && activeTab === 'sales',
    })

    // Product report
    const { data: productData, isLoading: isLoadingProducts } = useQuery({
        queryKey: ['report-products', currentStore?.id, selectedDate],
        queryFn: async () => {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            const response = await reportsAPI.getProducts(currentStore.id, {
                limit: 10,
                date_to: selectedDate,
                timezone: timezone
            })
            return response.data.data || []
        },
        enabled: !!currentStore?.id,
    })

    // Profit/Loss report
    const { data: profitData, isLoading: isLoadingProfit } = useQuery({
        queryKey: ['report-profit', currentStore?.id],
        queryFn: async () => {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            const response = await reportsAPI.getProfitLoss(currentStore.id, {
                period: 'monthly',
                periods: 6,
                timezone: timezone
            })
            return response.data.data || []
        },
        enabled: !!currentStore?.id && activeTab === 'profit',
    })

    const formatMoney = (amount) => {
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}jt`
        }
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(0)}rb`
        }
        return amount?.toFixed(0) || '0'
    }

    const formatFullMoney = (amount) => {
        return new Intl.NumberFormat('id-ID').format(amount || 0)
    }

    const navigateDate = (days) => {
        const current = new Date(selectedDate);
        current.setDate(current.getDate() + days);
        setSelectedDate(current.getFullYear() + '-' +
            String(current.getMonth() + 1).padStart(2, '0') + '-' +
            String(current.getDate()).padStart(2, '0'));
    }

    const isToday = selectedDate === (new Date().getFullYear() + '-' +
        String(new Date().getMonth() + 1).padStart(2, '0') + '-' +
        String(new Date().getDate()).padStart(2, '0'));

    const formatDisplayDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    }

    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownload = async () => {
        if (!currentStore?.id) return

        setIsDownloading(true)
        const loadToast = toast.loading('Memproses laporan...')

        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            // For now, export based on the selected date (daily) 
            // but we could expand this to use the active tab's range
            const params = {
                date_from: selectedDate,
                date_to: selectedDate,
                timezone: timezone
            }

            const response = await reportsAPI.exportCSV(currentStore.id, params)

            // Create blob and download link
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `laporan_${currentStore.name.replace(/\s+/g, '_')}_${selectedDate}.csv`)
            document.body.appendChild(link)
            link.click()
            link.remove()

            toast.success('Laporan berhasil diunduh', { id: loadToast })
        } catch (error) {
            console.error('Download error:', error)
            toast.error('Gagal mengunduh laporan', { id: loadToast })
        } finally {
            setIsDownloading(false)
        }
    }

    const chartData = dateRange === 'week' ? weeklyData : monthlyData

    // Loading Skeletons
    const SummarySkeleton = () => (
        <div className="grid grid-cols-2 gap-3 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="card p-4 bg-slate-50 border-none h-24">
                    <div className="h-4 w-2/3 bg-slate-200 rounded mb-2"></div>
                    <div className="h-6 w-full bg-slate-200 rounded"></div>
                </div>
            ))}
        </div>
    )

    const ChartSkeleton = () => (
        <div className="card p-4 bg-slate-50 border-none h-64 animate-pulse">
            <div className="h-4 w-1/3 bg-slate-200 rounded mb-6"></div>
            <div className="flex items-end gap-2 h-40">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="flex-1 bg-slate-200 rounded-t" style={{ height: `${Math.random() * 100}%` }}></div>
                ))}
            </div>
        </div>
    )

    const EmptyState = ({
        message = "Belum ada transaksi hari ini",
        submessage = "Data akan muncul secara real-time saat transaksi dilakukan."
    }) => (
        <div className="card p-10 flex flex-col items-center justify-center text-center bg-slate-50 border-dashed border-2 border-slate-200">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <Inbox className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium mb-1">{message}</p>
            <p className="text-slate-400 text-sm max-w-[200px]">{submessage}</p>
        </div>
    )

    return (
        <div className="animate-fade-in max-w-4xl mx-auto pb-20 px-2 lg:px-0">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
                    <p className="text-sm text-slate-500">Kinerja toko Anda</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 mx-auto">
                    <button
                        onClick={() => navigateDate(-1)}
                        className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="px-3 py-1 text-center min-w-[120px]">
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">
                            {isToday ? 'HARI INI' : 'TANGGAL'}
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                            {formatDisplayDate(selectedDate)}
                        </p>
                    </div>

                    <button
                        onClick={() => navigateDate(1)}
                        disabled={isToday}
                        className={`p-2 rounded-lg transition-colors ${isToday ? 'text-slate-200 cursor-not-allowed' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {!isToday && (
                        <button
                            onClick={() => {
                                const now = new Date();
                                setSelectedDate(now.getFullYear() + '-' +
                                    String(now.getMonth() + 1).padStart(2, '0') + '-' +
                                    String(now.getDate()).padStart(2, '0'));
                            }}
                            className="hidden md:block px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-bold rounded-lg hover:bg-primary-100 mr-1"
                        >
                            HARI INI
                        </button>
                    )}
                </div>

                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    title="Download Laporan (CSV)"
                >
                    <Download className={`w-5 h-5 ${isDownloading ? 'animate-bounce' : ''}`} />
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-slate-100/50 p-1.5 rounded-2xl flex gap-1 mb-6">
                {[
                    { key: 'daily', label: 'Harian', icon: Calendar },
                    { key: 'sales', label: 'Tren', icon: TrendingUp },
                    { key: 'products', label: 'Produk', icon: Package },
                    { key: 'profit', label: 'Profit', icon: DollarSign },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 ${activeTab === tab.key
                            ? 'bg-white text-primary-600 shadow-sm font-semibold'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="text-sm">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Summary Cards - Always Show based on focus */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card p-4 bg-gradient-to-br from-primary-50 to-white border-primary-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="p-1.5 bg-primary-100 text-primary-600 rounded-lg">
                            <ShoppingBag className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Penjualan</span>
                    </div>
                    {isLoadingDaily ? (
                        <div className="h-6 w-24 bg-slate-100 rounded animate-pulse"></div>
                    ) : (
                        <p className="text-xl font-bold text-slate-900 truncate">
                            Rp {formatFullMoney(dailyData?.summary?.total_sales)}
                        </p>
                    )}
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <RefreshCw className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaksi</span>
                    </div>
                    {isLoadingDaily ? (
                        <div className="h-6 w-12 bg-slate-100 rounded animate-pulse"></div>
                    ) : (
                        <p className="text-xl font-bold text-slate-900">
                            {dailyData?.summary?.total_transactions || 0}
                        </p>
                    )}
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="p-1.5 bg-green-50 text-green-600 rounded-lg">
                            <DollarSign className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit</span>
                    </div>
                    {isLoadingDaily ? (
                        <div className="h-6 w-20 bg-slate-100 rounded animate-pulse"></div>
                    ) : (
                        <p className="text-xl font-bold text-green-600 truncate">
                            Rp {formatFullMoney(dailyData?.summary?.gross_profit)}
                        </p>
                    )}
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                            <Users className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rata-rata</span>
                    </div>
                    {isLoadingDaily ? (
                        <div className="h-6 w-20 bg-slate-100 rounded animate-pulse"></div>
                    ) : (
                        <p className="text-xl font-bold text-slate-900 truncate">
                            Rp {formatFullMoney(dailyData?.summary?.average_transaction)}
                        </p>
                    )}
                </div>
            </div>

            {/* Content Tabs */}
            {activeTab === 'daily' && (
                <div className="space-y-6 animate-fade-in">
                    {(!dailyData || dailyData.summary?.total_transactions === 0) ? (
                        <div className="space-y-6">
                            <EmptyState
                                message={isToday ? "Belum ada penjualan hari ini" : "Tidak ada penjualan di tanggal ini"}
                                submessage={isToday ? "Data akan muncul saat ada transaksi dilakukan." : "Silakan pilih tanggal lain."}
                            />
                            {/* Best Sellers Context */}
                            <div className="card p-5">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary-600" />
                                    Produk Paling Laris (Semua Waktu)
                                </h3>
                                {productData?.length > 0 ? (
                                    <div className="space-y-3">
                                        {productData.slice(0, 3).map((p, i) => (
                                            <div key={p.product_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-slate-400 border border-slate-200 uppercase tracking-tighter text-[10px]">TOP {i + 1}</div>
                                                    <span className="font-medium text-slate-700">{p.product_name}</span>
                                                </div>
                                                <span className="text-sm font-semibold text-primary-600">{p.total_sold} unit</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-sm italic text-center py-4">Belum ada data produk terjual</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="card p-6">
                                <h3 className="font-bold text-slate-800 mb-6 font-display">Tren Penjualan Per Jam</h3>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={dailyData.hourly_stats}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="hour" tickFormatter={(v) => `${v}:00`} tick={{ fontSize: 10 }} />
                                        <YAxis tickFormatter={formatMoney} tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(val) => [`Rp ${formatFullMoney(val)}`, 'Penjualan']}
                                        />
                                        <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-6">
                                <div className="card p-6">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Package className="w-5 h-5 text-primary-600" />
                                        Top Produk
                                    </h3>
                                    <div className="space-y-3">
                                        {productData?.slice(0, 5).map(p => (
                                            <div key={p.product_id} className="flex items-center justify-between p-2 border-b border-slate-50 last:border-0">
                                                <span className="text-sm text-slate-600 truncate max-w-[150px]">{p.product_name}</span>
                                                <span className="font-bold text-slate-900">{p.total_sold}x</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="card p-6">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                        Metode Bayar
                                    </h3>
                                    <div className="space-y-3">
                                        {dailyData.payment_methods?.map(m => (
                                            <div key={m.type} className="flex items-center justify-between">
                                                <span className="text-sm capitalize text-slate-600">{m.type}</span>
                                                <span className="font-bold text-slate-900">Rp {formatMoney(m.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'sales' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                        <button onClick={() => setDateRange('week')} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${dateRange === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Mingguan</button>
                        <button onClick={() => setDateRange('month')} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${dateRange === 'month' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Bulanan</button>
                    </div>

                    {isLoadingWeekly ? <ChartSkeleton /> : (
                        <>
                            <div className="card p-6">
                                <h3 className="font-bold text-slate-800 mb-6 font-display">Grafik Pertumbuhan</h3>
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={chartData?.slice().reverse()}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey={dateRange === 'week' ? 'week_start' : 'month'} tick={{ fontSize: 9 }} />
                                        <YAxis tickFormatter={formatMoney} tick={{ fontSize: 9 }} />
                                        <Tooltip formatter={(v) => `Rp ${formatFullMoney(v)}`} />
                                        <Area type="monotone" dataKey="total_sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="card overflow-hidden">
                                <div className="p-4 bg-slate-50 font-bold text-slate-800 border-b">Detail Penjualan</div>
                                <div className="divide-y">
                                    {chartData?.map((item, i) => (
                                        <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                            <div>
                                                <p className="font-bold text-slate-700">{dateRange === 'week' ? `Minggu ${item.week_start}` : item.month}</p>
                                                <p className="text-xs text-slate-400">{item.total_transactions} trx</p>
                                            </div>
                                            <p className="font-bold text-primary-600">Rp {formatFullMoney(item.total_sales)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'products' && (
                <div className="space-y-6 animate-fade-in">
                    {isLoadingProducts ? <SummarySkeleton /> : (
                        <div className="grid gap-3">
                            {productData?.map((p, i) => (
                                <div key={p.product_id} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-slate-400 border">{i + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{p.product_name}</p>
                                        <p className="text-xs text-slate-400">{p.total_sold} terjual • {p.transaction_count} pesanan</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-900">Rp {formatMoney(p.total_revenue)}</p>
                                        <p className="text-[10px] font-bold text-green-600">Profit Rp {formatMoney(p.total_profit)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'profit' && (
                <div className="space-y-6 animate-fade-in">
                    {isLoadingProfit ? <ChartSkeleton /> : (
                        <div className="space-y-6">
                            <div className="card p-6">
                                <h3 className="font-bold text-slate-800 mb-6 font-display">Analisis Keuntungan</h3>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={profitData?.slice().reverse()}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                                        <YAxis tickFormatter={formatMoney} tick={{ fontSize: 10 }} />
                                        <Tooltip formatter={(v) => `Rp ${formatFullMoney(v)}`} />
                                        <Bar dataKey="gross_profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-3">
                                {profitData?.map((item, i) => (
                                    <div key={i} className="card p-5 hover:border-primary-100 transition-colors">
                                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                                            <span className="font-bold text-slate-800">{item.period}</span>
                                            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-bold uppercase tracking-widest">Margin {item.margin?.toFixed(1)}%</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Omzet</p>
                                                <p className="font-bold text-slate-700 text-sm">Rp {formatMoney(item.total_revenue)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Modal</p>
                                                <p className="font-bold text-red-500 text-sm">Rp {formatMoney(item.total_cost)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Untung</p>
                                                <p className="font-bold text-primary-600 text-sm">Rp {formatMoney(item.gross_profit)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
