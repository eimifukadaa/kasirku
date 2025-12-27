import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storesAPI } from '../services/api'
import { useStoreStore, useAuthStore } from '../store'
import { Plus, Store, ChevronRight, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StoreSelectPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { setCurrentStore, setStores } = useStoreStore()
    const { user, logout } = useAuthStore()
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newStoreName, setNewStoreName] = useState('')

    const { data: storesData, isLoading } = useQuery({
        queryKey: ['stores'],
        queryFn: async () => {
            const response = await storesAPI.list()
            return response.data.data || []
        },
        onSuccess: (stores) => {
            setStores(stores)
        },
    })

    const createStoreMutation = useMutation({
        mutationFn: (data) => storesAPI.create(data),
        onSuccess: (response) => {
            const newStore = response.data.data
            queryClient.invalidateQueries(['stores'])
            setCurrentStore(newStore)
            toast.success('Toko berhasil dibuat!')
            navigate('/dashboard')
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Gagal membuat toko')
        },
    })

    const handleSelectStore = (store) => {
        setCurrentStore(store)
        navigate('/dashboard')
    }

    const handleCreateStore = (e) => {
        e.preventDefault()
        if (!newStoreName.trim()) {
            toast.error('Nama toko harus diisi')
            return
        }
        createStoreMutation.mutate({ name: newStoreName })
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const stores = storesData || []

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pt-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pilih Toko</h1>
                    <p className="text-slate-500">Hai, {user?.full_name}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Store List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
            ) : stores.length === 0 && !showCreateForm ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Store className="w-10 h-10 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">
                        Belum ada toko
                    </h2>
                    <p className="text-slate-500 mb-6">
                        Buat toko pertama Anda untuk mulai berjualan
                    </p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="btn-primary"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Buat Toko Baru
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {stores.map((store) => (
                        <button
                            key={store.id}
                            onClick={() => handleSelectStore(store)}
                            className="w-full card p-4 flex items-center gap-4 hover:border-primary-300 transition-colors text-left"
                        >
                            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                <Store className="w-6 h-6 text-primary-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900">{store.name}</h3>
                                <p className="text-sm text-slate-500">
                                    {store.address || 'Alamat belum diatur'}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </button>
                    ))}

                    {/* Create new store button */}
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="w-full card p-4 flex items-center gap-4 border-2 border-dashed border-slate-200 hover:border-primary-300 transition-colors"
                    >
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                            <Plus className="w-6 h-6 text-slate-400" />
                        </div>
                        <span className="font-medium text-slate-600">Tambah Toko Baru</span>
                    </button>
                </div>
            )}

            {/* Create Store Form Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
                    <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-slide-up">
                        <h2 className="text-xl font-bold mb-4">Buat Toko Baru</h2>
                        <form onSubmit={handleCreateStore}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nama Toko
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Contoh: Toko Maju Jaya"
                                    value={newStoreName}
                                    onChange={(e) => setNewStoreName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false)
                                        setNewStoreName('')
                                    }}
                                    className="btn-secondary flex-1"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={createStoreMutation.isPending}
                                    className="btn-primary flex-1"
                                >
                                    {createStoreMutation.isPending ? 'Menyimpan...' : 'Buat Toko'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
