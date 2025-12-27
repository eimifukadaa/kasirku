import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStoreStore } from '../../store'
import { stockAPI, productsAPI } from '../../services/api'
import {
    Package,
    ArrowDownCircle,
    ArrowUpCircle,
    AlertTriangle,
    Search,
    Plus,
    Minus,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function StockPage() {
    const queryClient = useQueryClient()
    const { currentStore } = useStoreStore()
    const [activeTab, setActiveTab] = useState('low')
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [adjustType, setAdjustType] = useState('in')
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [adjustQuantity, setAdjustQuantity] = useState('')
    const [adjustNotes, setAdjustNotes] = useState('')

    // Low stock products
    const { data: lowStock } = useQuery({
        queryKey: ['low-stock', currentStore?.id],
        queryFn: async () => {
            const response = await stockAPI.getLowStock(currentStore.id)
            return response.data.data || []
        },
        enabled: !!currentStore?.id,
    })

    // Stock movements
    const { data: movements } = useQuery({
        queryKey: ['stock-movements', currentStore?.id],
        queryFn: async () => {
            const response = await stockAPI.list(currentStore.id, { per_page: 50 })
            return response.data.data?.data || []
        },
        enabled: !!currentStore?.id && activeTab === 'history',
    })

    // All products
    const { data: products } = useQuery({
        queryKey: ['products-for-stock', currentStore?.id],
        queryFn: async () => {
            const response = await productsAPI.list(currentStore.id, { per_page: 100 })
            return response.data.data?.data || []
        },
        enabled: !!currentStore?.id && activeTab === 'adjust',
    })

    // Stock mutation
    const stockMutation = useMutation({
        mutationFn: async (data) => {
            if (adjustType === 'in') {
                return stockAPI.stockIn(currentStore.id, data)
            } else {
                return stockAPI.stockOut(currentStore.id, data)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['products'])
            queryClient.invalidateQueries(['low-stock'])
            queryClient.invalidateQueries(['stock-movements'])
            toast.success(`Stok berhasil ${adjustType === 'in' ? 'ditambah' : 'dikurangi'}`)
            setShowAdjustModal(false)
            setSelectedProduct(null)
            setAdjustQuantity('')
            setAdjustNotes('')
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Gagal menyimpan')
        },
    })

    const handleAdjust = (product, type) => {
        setSelectedProduct(product)
        setAdjustType(type)
        setShowAdjustModal(true)
    }

    const handleSubmitAdjust = () => {
        if (!adjustQuantity || parseInt(adjustQuantity) <= 0) {
            toast.error('Jumlah harus lebih dari 0')
            return
        }
        stockMutation.mutate({
            product_id: selectedProduct.id,
            type: adjustType,
            quantity: parseInt(adjustQuantity),
            notes: adjustNotes,
        })
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    return (
        <div>
            <h1 className="text-xl font-bold mb-4">Stok Barang</h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
                {[
                    { key: 'low', label: 'Stok Rendah', icon: AlertTriangle },
                    { key: 'adjust', label: 'Sesuaikan', icon: Package },
                    { key: 'history', label: 'Riwayat', icon: ArrowUpCircle },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap ${activeTab === tab.key
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Low Stock Tab */}
            {activeTab === 'low' && (
                <div className="space-y-3">
                    {lowStock?.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <Package className="w-12 h-12 mx-auto mb-3 text-green-500" />
                            <p>Semua stok aman 👍</p>
                        </div>
                    ) : (
                        lowStock?.map((product) => (
                            <div key={product.id} className="card p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">{product.name}</h3>
                                        <p className="text-sm text-red-600">
                                            Stok: {product.stock} {product.unit} (min: {product.min_stock})
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleAdjust(product, 'in')}
                                        className="btn-primary text-sm py-2"
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Tambah
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Adjust Tab */}
            {activeTab === 'adjust' && (
                <div className="space-y-3">
                    {products?.map((product) => (
                        <div key={product.id} className="card p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{product.name}</h3>
                                    <p className="text-sm text-slate-500">
                                        Stok: {product.stock} {product.unit}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAdjust(product, 'in')}
                                        className="p-2 bg-green-100 text-green-700 rounded-lg"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleAdjust(product, 'out')}
                                        className="p-2 bg-red-100 text-red-700 rounded-lg"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-3">
                    {movements?.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <p>Belum ada riwayat stok</p>
                        </div>
                    ) : (
                        movements?.map((movement) => (
                            <div key={movement.id} className="card p-4">
                                <div className="flex items-start gap-3">
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${movement.type === 'in'
                                            ? 'bg-green-100'
                                            : movement.type === 'out' || movement.type === 'sale'
                                                ? 'bg-red-100'
                                                : 'bg-blue-100'
                                            }`}
                                    >
                                        {movement.type === 'in' ? (
                                            <ArrowDownCircle className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <ArrowUpCircle className="w-5 h-5 text-red-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium">{movement.product_name}</h3>
                                        <p className="text-sm text-slate-500">
                                            {movement.type === 'in'
                                                ? 'Stok Masuk'
                                                : movement.type === 'sale'
                                                    ? 'Penjualan'
                                                    : 'Stok Keluar'}{' '}
                                            - {movement.quantity} unit
                                        </p>
                                        {movement.notes && (
                                            <p className="text-xs text-slate-400">{movement.notes}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span
                                            className={`text-sm font-medium ${movement.type === 'in' ? 'text-green-600' : 'text-red-600'
                                                }`}
                                        >
                                            {movement.type === 'in' ? '+' : '-'}
                                            {movement.quantity}
                                        </span>
                                        <p className="text-xs text-slate-400">
                                            {formatDate(movement.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Adjust Modal */}
            {showAdjustModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-up">
                        <h2 className="text-xl font-bold mb-4">
                            {adjustType === 'in' ? 'Tambah Stok' : 'Kurangi Stok'}
                        </h2>

                        <div className="mb-4">
                            <p className="font-medium">{selectedProduct.name}</p>
                            <p className="text-sm text-slate-500">
                                Stok saat ini: {selectedProduct.stock} {selectedProduct.unit}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Jumlah</label>
                            <input
                                type="number"
                                className="input input-lg text-center"
                                placeholder="0"
                                value={adjustQuantity}
                                onChange={(e) => setAdjustQuantity(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-1">Catatan</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Contoh: Restock dari supplier"
                                value={adjustNotes}
                                onChange={(e) => setAdjustNotes(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAdjustModal(false)}
                                className="btn-secondary flex-1"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSubmitAdjust}
                                disabled={stockMutation.isPending}
                                className={`flex-1 ${adjustType === 'in' ? 'btn-primary' : 'btn-danger'
                                    }`}
                            >
                                {stockMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
