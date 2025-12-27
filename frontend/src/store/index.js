import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Auth Store
export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            subscription: null,
            isAuthenticated: false,

            setAuth: (user, token, subscription = null) => {
                localStorage.setItem('token', token)
                set({
                    user,
                    token,
                    subscription,
                    isAuthenticated: true,
                })
            },

            updateUser: (userData) => {
                set((state) => ({
                    user: { ...state.user, ...userData },
                }))
            },

            updateSubscription: (subscription) => {
                set({ subscription })
            },

            logout: () => {
                localStorage.removeItem('token')
                set({
                    user: null,
                    token: null,
                    subscription: null,
                    isAuthenticated: false,
                })
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                subscription: state.subscription,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)

// Store (outlet) selection
export const useStoreStore = create(
    persist(
        (set) => ({
            currentStore: null,
            stores: [],

            setCurrentStore: (store) => set({ currentStore: store }),
            setStores: (stores) => set({ stores }),

            clearStore: () => set({ currentStore: null, stores: [] }),
        }),
        {
            name: 'store-storage',
        }
    )
)

// POS Cart Store
export const useCartStore = create((set, get) => ({
    items: [],
    customer: null,
    discount: { type: 'fixed', value: 0 },
    paymentType: 'cash',
    paymentAmount: 0,
    notes: '',

    addItem: (product) => {
        const items = get().items
        const existingIndex = items.findIndex((item) => item.product.id === product.id)

        if (existingIndex >= 0) {
            const newItems = [...items]
            newItems[existingIndex].quantity += 1
            set({ items: newItems })
        } else {
            set({
                items: [...items, { product, quantity: 1, discount: 0 }],
            })
        }
    },

    updateItemQuantity: (productId, quantity) => {
        if (quantity <= 0) {
            get().removeItem(productId)
            return
        }
        set({
            items: get().items.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
            ),
        })
    },

    updateItemDiscount: (productId, discount) => {
        set({
            items: get().items.map((item) =>
                item.product.id === productId ? { ...item, discount } : item
            ),
        })
    },

    removeItem: (productId) => {
        set({
            items: get().items.filter((item) => item.product.id !== productId),
        })
    },

    setCustomer: (customer) => set({ customer }),
    setDiscount: (discount) => set({ discount }),
    setPaymentType: (paymentType) => set({ paymentType }),
    setPaymentAmount: (paymentAmount) => set({ paymentAmount }),
    setNotes: (notes) => set({ notes }),

    getSubtotal: () => {
        return get().items.reduce((total, item) => {
            const itemTotal = item.product.price * item.quantity - item.discount
            return total + itemTotal
        }, 0)
    },

    getDiscountAmount: () => {
        const subtotal = get().getSubtotal()
        const discount = get().discount
        if (discount.type === 'percent') {
            return subtotal * (discount.value / 100)
        }
        return discount.value
    },

    getTotal: () => {
        return get().getSubtotal() - get().getDiscountAmount()
    },

    getChange: () => {
        return Math.max(0, get().paymentAmount - get().getTotal())
    },

    clear: () =>
        set({
            items: [],
            customer: null,
            discount: { type: 'fixed', value: 0 },
            paymentType: 'cash',
            paymentAmount: 0,
            notes: '',
        }),
}))

// UI Store
export const useUIStore = create((set) => ({
    isSidebarOpen: false,
    isLoading: false,
    darkMode: false,

    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    closeSidebar: () => set({ isSidebarOpen: false }),
    setLoading: (isLoading) => set({ isLoading }),
    toggleDarkMode: () => {
        set((state) => {
            const newMode = !state.darkMode
            if (newMode) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
            return { darkMode: newMode }
        })
    },
}))
