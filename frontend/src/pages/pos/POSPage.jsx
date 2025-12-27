import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useStoreStore, useCartStore } from '../../store'
import { productsAPI, transactionsAPI, customersAPI } from '../../services/api'
import {
    Search,
    Camera,
    Plus,
    Minus,
    Trash2,
    X,
    User,
    CreditCard,
    Banknote,
    QrCode,
    Check,
    Send,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function POSPage() {
    const { currentStore } = useStoreStore()
    const {
        items,
        customer,
        discount,
        paymentType,
        paymentAmount,
        addItem,
        updateItemQuantity,
        removeItem,
        setCustomer,
        setDiscount,
        setPaymentType,
        setPaymentAmount,
        getSubtotal,
        getDiscountAmount,
        getTotal,
        getChange,
        clear,
    } = useCartStore()

    const [searchQuery, setSearchQuery] = useState('')
    const [showScanner, setShowScanner] = useState(false)
    const [showPayment, setShowPayment] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [lastTransaction, setLastTransaction] = useState(null)
    const [showReceiptModal, setShowReceiptModal] = useState(false)
    const [receiptPhone, setReceiptPhone] = useState('')
    const scannerRef = useRef(null)

    // Fetch products
    const { data: productsData } = useQuery({
        queryKey: ['products', currentStore?.id, searchQuery],
        queryFn: async () => {
            const response = await productsAPI.list(currentStore.id, {
                search: searchQuery,
                per_page: 50,
            })
            return response.data.data?.data || []
        },
        enabled: !!currentStore?.id,
    })

    const products = productsData || []

    // Create transaction mutation
    const createTransactionMutation = useMutation({
        mutationFn: (data) => transactionsAPI.create(currentStore.id, data),
        onSuccess: (response) => {
            setLastTransaction(response.data.data)
            setShowPayment(false)
            setShowSuccess(true)
            clear()
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Gagal menyimpan transaksi')
        },
    })

    // Send receipt mutation
    const sendReceiptMutation = useMutation({
        mutationFn: (data) => transactionsAPI.sendReceipt(currentStore.id, data),
        onSuccess: () => {
            toast.success('Struk terkirim ke WhatsApp')
            setShowReceiptModal(false)
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Gagal mengirim struk')
        },
    })

    // Handle barcode scan
    useEffect(() => {
        if (showScanner && !scannerRef.current) {
            const scanner = new Html5QrcodeScanner('qr-reader', {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            })

            scanner.render(
                async (decodedText) => {
                    scanner.clear()
                    setShowScanner(false)

                    try {
                        const response = await productsAPI.getByBarcode(currentStore.id, decodedText)
                        addItem(response.data.data)
                        toast.success('Produk ditambahkan')
                    } catch (error) {
                        toast.error('Produk tidak ditemukan')
                    }
                },
                (error) => {
                    // Ignore scan errors
                }
            )

            scannerRef.current = scanner
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear()
                scannerRef.current = null
            }
        }
    }, [showScanner, currentStore?.id, addItem])

    const handleCheckout = () => {
        if (items.length === 0) {
            toast.error('Keranjang kosong')
            return
        }
        setPaymentAmount(getTotal())
        setShowPayment(true)
    }

    const handlePayment = () => {
        if (paymentAmount < getTotal()) {
            toast.error('Pembayaran kurang')
            return
        }

        const transactionData = {
            customer_id: customer?.id,
            items: items.map((item) => ({
                product_id: item.product.id,
                quantity: item.quantity,
                discount_amount: item.discount,
            })),
            discount_amount: discount.type === 'fixed' ? discount.value : 0,
            discount_percent: discount.type === 'percent' ? discount.value : 0,
            payment_amount: paymentAmount,
            payment_type: paymentType,
        }

        createTransactionMutation.mutate(transactionData)
    }

    const handleSendReceipt = () => {
        if (!lastTransaction) return
        setReceiptPhone(customer?.phone || '')
        setShowReceiptModal(true)
    }

    const confirmSendReceipt = () => {
        if (!receiptPhone) {
            toast.error('Masukkan nomor WhatsApp')
            return
        }

        sendReceiptMutation.mutate({
            transaction_id: lastTransaction.id,
            phone: receiptPhone,
        })
    }

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('id-ID').format(amount || 0)
    }

    return (
        <div className="h-[calc(100vh-180px)] flex flex-col">
            {/* Search Bar */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        className="input pl-12"
                        placeholder="Cari produk..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowScanner(true)}
                    className="btn-secondary"
                >
                    <Camera className="w-5 h-5" />
                </button>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-auto mb-4">
                <div className="grid grid-cols-3 gap-2">
                    {products.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => addItem(product)}
                            className="pos-button text-center"
                            disabled={product.stock <= 0}
                        >
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-2 mx-auto">
                                📦
                            </div>
                            <p className="text-xs font-medium text-slate-700 truncate w-full">
                                {product.name}
                            </p>
                            <p className="text-xs text-primary-600 font-bold">
                                Rp {formatMoney(product.price)}
                            </p>
                            {product.stock <= product.min_stock && (
                                <span className="text-[10px] text-orange-500">
                                    Stok: {product.stock}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cart Summary */}
            {items.length > 0 && (
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">Keranjang ({items.length})</span>
                        <button onClick={clear} className="text-red-500 text-sm">
                            Hapus Semua
                        </button>
                    </div>

                    <div className="max-h-40 overflow-auto space-y-2 mb-3">
                        {items.map((item) => (
                            <div key={item.product.id} className="flex items-center gap-3">
                                <div className="flex-1">
                                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                                    <p className="text-xs text-slate-500">
                                        Rp {formatMoney(item.product.price)} x {item.quantity}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}
                                        className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                    <button
                                        onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}
                                        className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => removeItem(item.product.id)}
                                        className="w-8 h-8 text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Subtotal</span>
                            <span>Rp {formatMoney(getSubtotal())}</span>
                        </div>
                        {getDiscountAmount() > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Diskon</span>
                                <span>-Rp {formatMoney(getDiscountAmount())}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span className="text-primary-600">Rp {formatMoney(getTotal())}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        className="btn-primary btn-lg w-full mt-4"
                    >
                        💳 Bayar Rp {formatMoney(getTotal())}
                    </button>
                </div>
            )}

            {/* Scanner Modal */}
            {showScanner && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    <div className="flex items-center justify-between p-4 text-white">
                        <h2 className="font-bold">Scan Barcode</h2>
                        <button onClick={() => setShowScanner(false)}>
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div id="qr-reader" className="flex-1" />
                </div>
            )}

            {/* Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Pembayaran</h2>
                            <button onClick={() => setShowPayment(false)}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Payment Type */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Metode Bayar</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { type: 'cash', icon: Banknote, label: 'Cash' },
                                    { type: 'qris', icon: QrCode, label: 'QRIS' },
                                    { type: 'transfer', icon: CreditCard, label: 'Transfer' },
                                ].map((method) => (
                                    <button
                                        key={method.type}
                                        onClick={() => setPaymentType(method.type)}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${paymentType === method.type
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-slate-200'
                                            }`}
                                    >
                                        <method.icon className="w-6 h-6" />
                                        <span className="text-sm">{method.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Jumlah Bayar</label>
                            <input
                                type="number"
                                className="input input-lg text-center text-xl font-bold"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                            />
                            {/* Quick amounts */}
                            <div className="grid grid-cols-4 gap-2 mt-2">
                                {[getTotal(), 50000, 100000, 200000].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setPaymentAmount(amount)}
                                        className="py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200"
                                    >
                                        {formatMoney(amount)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-slate-50 rounded-xl p-4 mb-6">
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500">Total</span>
                                <span className="font-bold">Rp {formatMoney(getTotal())}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500">Bayar</span>
                                <span>Rp {formatMoney(paymentAmount)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-primary-600">
                                <span>Kembalian</span>
                                <span>Rp {formatMoney(getChange())}</span>
                            </div>
                        </div>

                        <button
                            onClick={handlePayment}
                            disabled={createTransactionMutation.isPending || paymentAmount < getTotal()}
                            className="btn-primary btn-lg w-full"
                        >
                            {createTransactionMutation.isPending ? (
                                'Menyimpan...'
                            ) : (
                                <>
                                    <Check className="w-5 h-5 mr-2" />
                                    Selesaikan Transaksi
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center animate-scale-in shadow-2xl">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Transaksi Berhasil!</h2>
                        <p className="text-slate-500 mb-2">
                            {lastTransaction?.invoice_number}
                        </p>
                        <p className="text-2xl font-bold text-primary-600 mb-6">
                            Rp {formatMoney(lastTransaction?.total)}
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSuccess(false)}
                                className="btn-secondary flex-1"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={handleSendReceipt}
                                disabled={sendReceiptMutation.isPending}
                                className="btn-primary flex-1"
                            >
                                <Send className="w-5 h-5 mr-2" />
                                {sendReceiptMutation.isPending ? 'Mengirim...' : 'Kirim Struk'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Receipt Modal (Premium) */}
            {showReceiptModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in">
                        <div className="bg-primary-600 p-6 text-white text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <Send className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold">Kirim Struk WhatsApp</h3>
                            <p className="text-primary-100 text-sm mt-1">Masukkan nomor WhatsApp pelanggan</p>
                        </div>

                        <div className="p-6">
                            <div className="relative mb-6">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <span className="text-slate-400">📱</span>
                                </div>
                                <input
                                    type="tel"
                                    className="input pl-12"
                                    placeholder="Contoh: 08123456789"
                                    value={receiptPhone}
                                    onChange={(e) => setReceiptPhone(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowReceiptModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmSendReceipt}
                                    disabled={sendReceiptMutation.isPending}
                                    className="btn-primary flex-1"
                                >
                                    {sendReceiptMutation.isPending ? (
                                        'Mengirim...'
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5 mr-2" />
                                            Kirim
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
