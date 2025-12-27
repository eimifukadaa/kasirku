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
import { Html5Qrcode } from 'html5-qrcode'

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
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [customerSearch, setCustomerSearch] = useState('')
    const scannerRef = useRef(null)
    const isProcessingScan = useRef(false)

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

    // Fetch customers for selection
    const { data: customersData } = useQuery({
        queryKey: ['customers-select', currentStore?.id, customerSearch],
        queryFn: async () => {
            const response = await customersAPI.list(currentStore.id, {
                search: customerSearch,
                per_page: 5,
            })
            return response.data.data?.data || []
        },
        enabled: !!currentStore?.id && showCustomerModal,
    })

    const customers = customersData || []

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
        let html5QrCode = null;

        const startScanner = async () => {
            try {
                html5QrCode = new Html5Qrcode("qr-reader");
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 280, height: 280 },
                        aspectRatio: 1.0,
                    },
                    async (decodedText) => {
                        // 1. Anti-Spam Lock: Prevent notification spam
                        if (isProcessingScan.current) return;
                        isProcessingScan.current = true;

                        try {
                            const response = await productsAPI.getByBarcode(currentStore.id, decodedText)
                            const product = response.data.data;

                            // 2. Add product to cart
                            addItem(product)
                            toast.success(`Ditambahkan: ${product.name}`, { duration: 1500 })

                            // 3. Continuous Scanning: Release the lock after a delay
                            // This allows scanning the next item without closing the camera
                            setTimeout(() => {
                                isProcessingScan.current = false;
                            }, 1200);

                        } catch (error) {
                            console.error("Scan error:", error);
                            toast.error('Produk tidak ditemukan');

                            // Release lock so user can try again
                            setTimeout(() => {
                                isProcessingScan.current = false;
                            }, 2000);
                        }
                    },
                    (errorMessage) => {
                        // ignore noise
                    }
                );
            } catch (err) {
                console.error("Scanner error:", err);
                toast.error("Gagal membuka kamera");
                setShowScanner(false);
                isProcessingScan.current = false;
            }
        };

        const stopScanner = async () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                try {
                    await scannerRef.current.stop();
                    scannerRef.current.clear();
                } catch (err) {
                    // console.error("Scanner stop error:", err);
                }
            }
            scannerRef.current = null;
        };

        if (showScanner) {
            isProcessingScan.current = false; // Reset lock when starting
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            stopScanner();
        };
    }, [showScanner, currentStore?.id, addItem])

    const handleScannerFinish = () => {
        if (items.length === 0) {
            toast.error('Keranjang masih kosong');
            return;
        }
        setShowScanner(false);
        setPaymentAmount(getTotal());
        setShowPayment(true);
    };

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
                    className="btn px-4 bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200 flex items-center gap-2"
                >
                    <Camera className="w-5 h-5" />
                    <span className="hidden md:inline">Scan Barcode</span>
                </button>
                <button
                    onClick={() => setShowCustomerModal(true)}
                    className={`btn px-4 flex items-center gap-2 ${customer
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-white text-slate-600 border-slate-200'
                        }`}
                >
                    <User className="w-5 h-5" />
                    <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">
                        {customer ? customer.name : 'Pilih Pelanggan'}
                    </span>
                    {customer && (
                        <X
                            className="w-4 h-4 hover:text-red-500"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCustomer(null);
                            }}
                        />
                    )}
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
                <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center">
                    <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-white text-lg">Scan Barcode</h2>
                                <p className="text-white/60 text-xs">Arahkan kamera ke barcode produk</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowScanner(false)}
                            className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div id="qr-reader" className="w-full h-full" />

                    {/* Floating Viewfinder Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="relative w-72 h-72">
                            {/* Corner Borders */}
                            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary-500 rounded-tl-2xl"></div>
                            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary-500 rounded-tr-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary-500 rounded-bl-2xl"></div>
                            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary-500 rounded-br-2xl"></div>

                            {/* Scanning Line Animation */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-primary-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line"></div>
                        </div>

                        <div className="mt-8 px-6 py-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
                            <p className="text-white text-sm font-medium">Mencari barcode...</p>
                        </div>

                        {/* Scanner Footer Actions */}
                        <div className="absolute bottom-10 left-0 right-0 px-6 flex flex-col items-center gap-4 pointer-events-auto">
                            {items.length > 0 && (
                                <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center animate-scale-in">
                                    <p className="text-white/60 text-xs">Total Sementara</p>
                                    <p className="text-white font-bold text-xl">
                                        Rp {formatMoney(getTotal())}
                                    </p>
                                    <p className="text-primary-400 text-[10px] font-medium">
                                        {items.length} Barang di Keranjang
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleScannerFinish}
                                className="w-full max-w-xs btn-primary btn-lg shadow-2xl shadow-primary-500/50 flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                <Check className="w-6 h-6" />
                                <span>Selesai & Bayar</span>
                            </button>
                        </div>
                    </div>
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

            {/* Customer Selection Modal */}
            {showCustomerModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-end">
                    <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-up max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Pilih Pelanggan</h2>
                            <button onClick={() => setShowCustomerModal(false)}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                className="input pl-12"
                                placeholder="Cari nama atau no. WA..."
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-auto space-y-2 mb-6">
                            {customers.length === 0 ? (
                                <p className="text-center py-10 text-slate-500">Pelanggan tidak ditemukan</p>
                            ) : (
                                customers.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            setCustomer(c);
                                            setShowCustomerModal(false);
                                            toast.success(`Pelanggan: ${c.name}`);
                                        }}
                                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-primary-50 rounded-2xl border border-slate-100 hover:border-primary-200 transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg border group-hover:border-primary-200">
                                                👤
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{c.name}</p>
                                                <p className="text-xs text-slate-500">{c.phone}</p>
                                            </div>
                                        </div>
                                        {c.total_spent >= 1000000 && (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold border border-yellow-200">
                                                ⭐ VIP
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setShowCustomerModal(false);
                                navigate('/customers');
                            }}
                            className="btn-secondary w-full"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Tambah Pelanggan Baru
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
