import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useStoreStore, useAuthStore } from '../../store'
import { storesAPI, subscriptionAPI } from '../../services/api'
import {
    Store,
    User,
    CreditCard,
    Bell,
    Moon,
    LogOut,
    ChevronRight,
    Check,
    Crown,
    MessageCircle,
    Database,
    Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { currentStore, setCurrentStore } = useStoreStore()
    const { user, logout, subscription } = useAuthStore()
    const [showStoreEdit, setShowStoreEdit] = useState(false)
    const [showPlans, setShowPlans] = useState(false)
    const [showResetModal, setShowResetModal] = useState(false)
    const [storeForm, setStoreForm] = useState({
        name: currentStore?.name || '',
        address: currentStore?.address || '',
        phone: currentStore?.phone || '',
        whatsapp_api_key: currentStore?.whatsapp_api_key || '',
        whatsapp_provider: currentStore?.whatsapp_provider || 'fonnte',
    })

    // Fetch subscription
    const { data: subData } = useQuery({
        queryKey: ['subscription'],
        queryFn: async () => {
            const response = await subscriptionAPI.get()
            return response.data.data
        },
    })

    // Fetch plans
    const { data: plans } = useQuery({
        queryKey: ['plans'],
        queryFn: async () => {
            const response = await subscriptionAPI.getPlans()
            return response.data.data
        },
        enabled: showPlans,
    })

    // Update store mutation
    const updateStoreMutation = useMutation({
        mutationFn: (data) => storesAPI.update(currentStore.id, data),
        onSuccess: (response) => {
            setCurrentStore(response.data.data)
            queryClient.invalidateQueries(['stores'])
            toast.success('Pengaturan toko diperbarui')
            setShowStoreEdit(false)
        },
        onError: () => {
            toast.error('Gagal menyimpan')
        },
    })

    // Upgrade mutation
    const upgradeMutation = useMutation({
        mutationFn: (plan) => subscriptionAPI.upgrade({ plan }),
        onSuccess: () => {
            queryClient.invalidateQueries(['subscription'])
            toast.success('Berhasil upgrade!')
            setShowPlans(false)
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Gagal upgrade')
        },
    })

    // Reset database mutation
    const resetDatabaseMutation = useMutation({
        mutationFn: () => storesAPI.resetDatabase(currentStore.id),
        onSuccess: () => {
            queryClient.invalidateQueries() // Invalidate everything
            toast.success('Database berhasil direset')
            setShowResetModal(false)
            navigate('/') // Go back to dashboard
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Gagal reset database')
        },
    })

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('id-ID').format(amount || 0)
    }

    const currentPlan = subData?.subscription?.plan || 'free'

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold">Pengaturan</h1>

            {/* Store Settings */}
            <div className="card">
                <div className="p-4 border-b flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium">{currentStore?.name}</h3>
                        <p className="text-sm text-slate-500">Pengaturan Toko</p>
                    </div>
                    <button
                        onClick={() => setShowStoreEdit(true)}
                        className="text-primary-600"
                    >
                        Edit
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Alamat</span>
                        <span className="text-right">{currentStore?.address || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Telepon</span>
                        <span>{currentStore?.phone || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">WhatsApp Gateway</span>
                        <span className="capitalize">{currentStore?.whatsapp_provider || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Subscription */}
            <div className="card">
                <div className="p-4 border-b flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Crown className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium flex items-center gap-2">
                            Paket {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                            {currentPlan !== 'free' && (
                                <span className="badge-success text-xs">Aktif</span>
                            )}
                        </h3>
                        <p className="text-sm text-slate-500">Kelola langganan Anda</p>
                    </div>
                </div>
                <div className="p-4 space-y-3">
                    {currentPlan === 'free' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                            <p className="text-sm text-yellow-800">
                                Anda menggunakan paket gratis dengan batas 50 transaksi/bulan.
                                <br />
                                <span className="font-medium">
                                    Terpakai: {subData?.usage?.transactions_used || 0}/50
                                </span>
                            </p>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Outlet</span>
                        <span>
                            {subData?.usage?.stores_used || 1} /{' '}
                            {subData?.usage?.stores_limit === -1 ? '∞' : subData?.usage?.stores_limit}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Staff</span>
                        <span>
                            {subData?.usage?.staff_used || 1} /{' '}
                            {subData?.usage?.staff_limit === -1 ? '∞' : subData?.usage?.staff_limit}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowPlans(true)}
                        className="btn-primary w-full mt-2"
                    >
                        {currentPlan === 'free' ? 'Upgrade Sekarang' : 'Lihat Paket Lain'}
                    </button>
                </div>
            </div>

            {/* Account */}
            <div className="card">
                <div className="p-4 border-b flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium">{user?.full_name}</h3>
                        <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>
                </div>
                <div className="divide-y">
                    <button
                        onClick={handleLogout}
                        className="w-full p-4 flex items-center justify-between text-red-600"
                    >
                        <span className="flex items-center gap-3">
                            <LogOut className="w-5 h-5" />
                            Keluar
                        </span>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Reset Database */}
            <div className="card border-red-100 bg-red-50/30">
                <div className="p-4 border-b border-red-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                        <Database className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium text-red-600">Reset Database</h3>
                        <p className="text-sm text-red-500">Hapus semua produk dan laporan</p>
                    </div>
                </div>
                <div className="p-4">
                    <p className="text-sm text-slate-600 mb-4">
                        Tindakan ini akan menghapus semua produk, kategori, transaksi, dan data pelanggan secara permanen. Toko Anda akan kembali ke keadaan awal.
                    </p>
                    <button
                        onClick={() => setShowResetModal(true)}
                        className="btn-secondary border-red-200 text-red-600 hover:bg-red-50 w-full"
                    >
                        Reset Sekarang
                    </button>
                </div>
            </div>

            {/* Store Edit Modal */}
            {showStoreEdit && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-auto">
                        <h2 className="text-xl font-bold mb-4">Edit Toko</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nama Toko</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={storeForm.name}
                                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Alamat</label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    value={storeForm.address}
                                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Telepon</label>
                                <input
                                    type="tel"
                                    className="input"
                                    value={storeForm.phone}
                                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">WhatsApp Provider</label>
                                <select
                                    className="input"
                                    value={storeForm.whatsapp_provider}
                                    onChange={(e) =>
                                        setStoreForm({ ...storeForm, whatsapp_provider: e.target.value })
                                    }
                                >
                                    <option value="fonnte">Fonnte</option>
                                    <option value="wablas">Wablas</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">WhatsApp API Key</label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Masukkan API key..."
                                    value={storeForm.whatsapp_api_key}
                                    onChange={(e) =>
                                        setStoreForm({ ...storeForm, whatsapp_api_key: e.target.value })
                                    }
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Dapatkan API key dari fonnte.com atau wablas.com
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowStoreEdit(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => updateStoreMutation.mutate(storeForm)}
                                    disabled={updateStoreMutation.isPending}
                                    className="btn-primary flex-1"
                                >
                                    {updateStoreMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Plans Modal */}
            {showPlans && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-auto">
                        <h2 className="text-xl font-bold mb-4">Pilih Paket</h2>

                        <div className="space-y-3">
                            {plans?.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`card p-4 border-2 ${plan.id === currentPlan
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-lg">{plan.name}</h3>
                                        {plan.id === currentPlan && (
                                            <span className="badge-success">Aktif</span>
                                        )}
                                    </div>
                                    <p className="text-2xl font-bold text-primary-600 mb-3">
                                        {plan.price_idr === 0 ? 'Gratis' : `Rp ${formatMoney(plan.price_idr)}`}
                                        {plan.price_idr > 0 && (
                                            <span className="text-sm text-slate-500 font-normal">/bulan</span>
                                        )}
                                    </p>
                                    <ul className="space-y-1 mb-4">
                                        {plan.features?.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm">
                                                <Check className="w-4 h-4 text-green-500" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    {plan.id !== currentPlan && plan.id !== 'free' && (
                                        <button
                                            onClick={() => upgradeMutation.mutate(plan.id)}
                                            disabled={upgradeMutation.isPending}
                                            className="btn-primary w-full"
                                        >
                                            {upgradeMutation.isPending ? 'Memproses...' : 'Pilih Paket Ini'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowPlans(false)}
                            className="btn-secondary w-full mt-4"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden animate-zoom-in">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Hapus Database?</h3>
                            <p className="text-slate-500 text-sm">
                                Are you sure you want to delete the database completely?
                            </p>
                        </div>
                        <div className="flex border-t">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="flex-1 p-4 font-medium text-slate-600 hover:bg-slate-50 border-r bg-white"
                            >
                                No
                            </button>
                            <button
                                onClick={() => resetDatabaseMutation.mutate()}
                                disabled={resetDatabaseMutation.isPending}
                                className="flex-1 p-4 font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                            >
                                {resetDatabaseMutation.isPending ? 'Deleting...' : 'Yes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
