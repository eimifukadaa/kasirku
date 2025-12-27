import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStoreStore } from '../../store'
import { productsAPI, categoriesAPI } from '../../services/api'
import { ArrowLeft, Camera, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductFormPage() {
    const navigate = useNavigate()
    const { id } = useParams()
    const queryClient = useQueryClient()
    const { currentStore } = useStoreStore()
    const isEdit = !!id

    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        barcode: '',
        sku: '',
        price: '',
        cost: '',
        stock: '',
        min_stock: '5',
        unit: 'pcs',
        description: '',
    })

    // Fetch product for edit
    const { data: product, isLoading: productLoading } = useQuery({
        queryKey: ['product', id],
        queryFn: async () => {
            const response = await productsAPI.get(currentStore.id, id)
            return response.data.data
        },
        enabled: !!id && !!currentStore?.id,
    })

    // Fetch categories
    const { data: categories } = useQuery({
        queryKey: ['categories', currentStore?.id],
        queryFn: async () => {
            const response = await categoriesAPI.list(currentStore.id)
            return response.data.data || []
        },
        enabled: !!currentStore?.id,
    })

    // Fill form with product data
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                category_id: product.category_id || '',
                barcode: product.barcode || '',
                sku: product.sku || '',
                price: product.price?.toString() || '',
                cost: product.cost?.toString() || '',
                stock: product.stock?.toString() || '',
                min_stock: product.min_stock?.toString() || '5',
                unit: product.unit || 'pcs',
                description: product.description || '',
            })
        }
    }, [product])

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                ...data,
                price: parseFloat(data.price) || 0,
                cost: parseFloat(data.cost) || 0,
                stock: parseInt(data.stock) || 0,
                min_stock: parseInt(data.min_stock) || 5,
                category_id: data.category_id || null,
            }

            if (isEdit) {
                return productsAPI.update(currentStore.id, id, payload)
            } else {
                return productsAPI.create(currentStore.id, payload)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['products'])
            toast.success(isEdit ? 'Produk diperbarui' : 'Produk ditambahkan')
            navigate('/products')
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Gagal menyimpan produk')
        },
    })

    // Generate barcode
    const generateBarcode = async () => {
        try {
            const response = await productsAPI.generateBarcode(currentStore.id)
            setFormData({ ...formData, barcode: response.data.data.barcode })
        } catch {
            toast.error('Gagal generate barcode')
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.error('Nama produk harus diisi')
            return
        }
        if (!formData.price) {
            toast.error('Harga harus diisi')
            return
        }
        saveMutation.mutate(formData)
    }

    if (productLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/products')}
                    className="p-2 hover:bg-slate-100 rounded-xl"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">
                    {isEdit ? 'Edit Produk' : 'Tambah Produk'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium mb-1">Nama Produk *</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Contoh: Indomie Goreng"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium mb-1">Kategori</label>
                    <select
                        className="input"
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    >
                        <option value="">Pilih Kategori</option>
                        {categories?.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Barcode */}
                <div>
                    <label className="block text-sm font-medium mb-1">Barcode</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="input flex-1"
                            placeholder="Scan atau input manual"
                            value={formData.barcode}
                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={generateBarcode}
                            className="btn-secondary"
                        >
                            Generate
                        </button>
                    </div>
                </div>

                {/* Price & Cost */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Harga Jual *</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="0"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Harga Modal</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="0"
                            value={formData.cost}
                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        />
                    </div>
                </div>

                {/* Stock & Min Stock */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Stok Awal</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="0"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Stok Minimum</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="5"
                            value={formData.min_stock}
                            onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                        />
                    </div>
                </div>

                {/* Unit */}
                <div>
                    <label className="block text-sm font-medium mb-1">Satuan</label>
                    <select
                        className="input"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                        <option value="pcs">Pcs</option>
                        <option value="kg">Kg</option>
                        <option value="liter">Liter</option>
                        <option value="lusin">Lusin</option>
                        <option value="pack">Pack</option>
                        <option value="box">Box</option>
                    </select>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium mb-1">Deskripsi</label>
                    <textarea
                        className="input"
                        rows={3}
                        placeholder="Deskripsi produk (opsional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="btn-primary btn-lg w-full"
                >
                    {saveMutation.isPending ? (
                        'Menyimpan...'
                    ) : (
                        <>
                            <Save className="w-5 h-5 mr-2" />
                            Simpan Produk
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
