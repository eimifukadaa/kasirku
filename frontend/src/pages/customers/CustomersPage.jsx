import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStoreStore } from '../../store'
import { customersAPI } from '../../services/api'
import { Plus, Search, User, Phone, Mail, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CustomersPage() {
    const queryClient = useQueryClient()
    const { currentStore } = useStoreStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
    })

    const { data: customersData, isLoading } = useQuery({
        queryKey: ['customers', currentStore?.id, searchQuery],
        queryFn: async () => {
            const response = await customersAPI.list(currentStore.id, {
                search: searchQuery,
                per_page: 100,
            })
            return response.data.data
        },
        enabled: !!currentStore?.id,
    })

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (editingCustomer) {
                return customersAPI.update(currentStore.id, editingCustomer.id, data)
            }
            return customersAPI.create(currentStore.id, data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['customers'])
            toast.success(editingCustomer ? 'Customer diperbarui' : 'Customer ditambahkan')
            closeForm()
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Gagal menyimpan')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => customersAPI.delete(currentStore.id, id),
        onSuccess: () => {
            queryClient.invalidateQueries(['customers'])
            toast.success('Customer dihapus')
        },
        onError: () => {
            toast.error('Gagal menghapus')
        },
    })

    const customers = customersData?.data || []

    const openForm = (customer = null) => {
        if (customer) {
            setEditingCustomer(customer)
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
                notes: customer.notes || '',
            })
        } else {
            setEditingCustomer(null)
            setFormData({ name: '', phone: '', email: '', address: '', notes: '' })
        }
        setShowForm(true)
    }

    const closeForm = () => {
        setShowForm(false)
        setEditingCustomer(null)
        setFormData({ name: '', phone: '', email: '', address: '', notes: '' })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.error('Nama harus diisi')
            return
        }
        saveMutation.mutate(formData)
    }

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('id-ID').format(amount || 0)
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold">Customer</h1>
                <button onClick={() => openForm()} className="btn-primary">
                    <Plus className="w-5 h-5 mr-1" />
                    Tambah
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    className="input pl-12"
                    placeholder="Cari customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Customer List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
            ) : customers.length === 0 ? (
                <div className="text-center py-20">
                    <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">Belum ada customer</p>
                    <button onClick={() => openForm()} className="btn-primary">
                        <Plus className="w-5 h-5 mr-1" />
                        Tambah Customer
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {customers.map((customer) => (
                        <div key={customer.id} className="card p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <User className="w-6 h-6 text-primary-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-slate-900">{customer.name}</h3>
                                    {customer.phone && (
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {customer.phone}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                        <span>{customer.total_transactions} transaksi</span>
                                        <span>Rp {formatMoney(customer.total_spent)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openForm(customer)}
                                        className="p-2 hover:bg-slate-100 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4 text-slate-500" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Hapus customer ini?')) {
                                                deleteMutation.mutate(customer.id)
                                            }
                                        }}
                                        className="p-2 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-auto">
                        <h2 className="text-xl font-bold mb-4">
                            {editingCustomer ? 'Edit Customer' : 'Tambah Customer'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nama *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Nama customer"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">No. WhatsApp</label>
                                <input
                                    type="tel"
                                    className="input"
                                    placeholder="08123456789"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="email@contoh.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Alamat</label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    placeholder="Alamat lengkap"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Catatan</label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    placeholder="Catatan tambahan"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="btn-secondary flex-1"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="btn-primary flex-1"
                                >
                                    {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
