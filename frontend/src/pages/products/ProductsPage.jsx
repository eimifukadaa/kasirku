import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStoreStore } from '../../store'
import { productsAPI, categoriesAPI } from '../../services/api'
import { Plus, Search, Package, Edit2, Trash2, MoreVertical } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductsPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { currentStore } = useStoreStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')

    const { data: productsData, isLoading } = useQuery({
        queryKey: ['products', currentStore?.id, searchQuery, selectedCategory],
        queryFn: async () => {
            const response = await productsAPI.list(currentStore.id, {
                search: searchQuery,
                category_id: selectedCategory || undefined,
                per_page: 100,
            })
            return response.data.data
        },
        enabled: !!currentStore?.id,
    })

    const { data: categories } = useQuery({
        queryKey: ['categories', currentStore?.id],
        queryFn: async () => {
            const response = await categoriesAPI.list(currentStore.id)
            return response.data.data || []
        },
        enabled: !!currentStore?.id,
    })

    const deleteMutation = useMutation({
        mutationFn: (productId) => productsAPI.delete(currentStore.id, productId),
        onSuccess: () => {
            queryClient.invalidateQueries(['products'])
            toast.success('Produk dihapus')
        },
        onError: () => {
            toast.error('Gagal menghapus produk')
        },
    })

    const products = productsData?.data || []

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('id-ID').format(amount || 0)
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold">Produk</h1>
                <button
                    onClick={() => navigate('/products/new')}
                    className="btn-primary"
                >
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
                    placeholder="Cari produk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
                <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-4 py-2 rounded-full whitespace-nowrap ${!selectedCategory
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                >
                    Semua
                </button>
                {categories?.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === cat.id
                                ? 'bg-primary-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Products List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">Belum ada produk</p>
                    <button
                        onClick={() => navigate('/products/new')}
                        className="btn-primary"
                    >
                        <Plus className="w-5 h-5 mr-1" />
                        Tambah Produk
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {products.map((product) => (
                        <div key={product.id} className="card p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    📦
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-slate-900 truncate">
                                        {product.name}
                                    </h3>
                                    <p className="text-sm text-primary-600 font-bold">
                                        Rp {formatMoney(product.price)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded ${product.stock <= product.min_stock
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-green-100 text-green-700'
                                                }`}
                                        >
                                            Stok: {product.stock} {product.unit}
                                        </span>
                                        {product.barcode && (
                                            <span className="text-xs text-slate-400">
                                                {product.barcode}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => navigate(`/products/${product.id}`)}
                                        className="p-2 hover:bg-slate-100 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4 text-slate-500" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Hapus produk ini?')) {
                                                deleteMutation.mutate(product.id)
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
        </div>
    )
}
