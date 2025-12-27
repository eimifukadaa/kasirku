import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data),
}

// Stores API
export const storesAPI = {
    list: () => api.get('/stores'),
    create: (data) => api.post('/stores', data),
    get: (id) => api.get(`/stores/${id}`),
    update: (id, data) => api.put(`/stores/${id}`, data),
    delete: (id) => api.delete(`/stores/${id}`),
    resetDatabase: (storeId) => api.post(`/stores/${storeId}/reset-database`),
}

// Products API
export const productsAPI = {
    list: (storeId, params) => api.get(`/stores/${storeId}/products`, { params }),
    get: (storeId, id) => api.get(`/stores/${storeId}/products/${id}`),
    create: (storeId, data) => api.post(`/stores/${storeId}/products`, data),
    update: (storeId, id, data) => api.put(`/stores/${storeId}/products/${id}`, data),
    delete: (storeId, id) => api.delete(`/stores/${storeId}/products/${id}`),
    getByBarcode: (storeId, barcode) => api.get(`/stores/${storeId}/products/barcode/${barcode}`),
    generateBarcode: (storeId) => api.post(`/stores/${storeId}/products/generate-barcode`),
}

// Categories API
export const categoriesAPI = {
    list: (storeId) => api.get(`/stores/${storeId}/categories`),
    create: (storeId, data) => api.post(`/stores/${storeId}/categories`, data),
}

// Stock API
export const stockAPI = {
    list: (storeId, params) => api.get(`/stores/${storeId}/stock`, { params }),
    stockIn: (storeId, data) => api.post(`/stores/${storeId}/stock/in`, data),
    stockOut: (storeId, data) => api.post(`/stores/${storeId}/stock/out`, data),
    getLowStock: (storeId) => api.get(`/stores/${storeId}/stock/low`),
}

// Transactions API
export const transactionsAPI = {
    list: (storeId, params) => api.get(`/stores/${storeId}/transactions`, { params }),
    get: (storeId, id) => api.get(`/stores/${storeId}/transactions/${id}`),
    create: (storeId, data) => api.post(`/stores/${storeId}/transactions`, data),
    sendReceipt: (storeId, data) => api.post(`/stores/${storeId}/whatsapp/send-receipt`, data),
}

// Customers API
export const customersAPI = {
    list: (storeId, params) => api.get(`/stores/${storeId}/customers`, { params }),
    get: (storeId, id) => api.get(`/stores/${storeId}/customers/${id}`),
    create: (storeId, data) => api.post(`/stores/${storeId}/customers`, data),
    update: (storeId, id, data) => api.put(`/stores/${storeId}/customers/${id}`, data),
    delete: (storeId, id) => api.delete(`/stores/${storeId}/customers/${id}`),
    findOrCreate: (storeId, data) => api.post(`/stores/${storeId}/customers/find-or-create`, data),
}

// Reports API
export const reportsAPI = {
    getDashboard: (storeId, params) => api.get(`/stores/${storeId}/reports/dashboard`, { params }),
    getDaily: (storeId, params) => api.get(`/stores/${storeId}/reports/daily`, { params }),
    getWeekly: (storeId, params) => api.get(`/stores/${storeId}/reports/weekly`, { params }),
    getMonthly: (storeId, params) => api.get(`/stores/${storeId}/reports/monthly`, { params }),
    getProducts: (storeId, params) => api.get(`/stores/${storeId}/reports/products`, { params }),
    getProfitLoss: (storeId, params) => api.get(`/stores/${storeId}/reports/profit-loss`, { params }),
    exportCSV: (storeId, params) => api.get(`/stores/${storeId}/reports/export`, { params, responseType: 'blob' }),
}

// WhatsApp API
export const whatsappAPI = {
    sendReceipt: (storeId, data) => api.post(`/stores/${storeId}/whatsapp/send-receipt`, data),
    sendStockAlert: (storeId, data) => api.post(`/stores/${storeId}/whatsapp/send-stock-alert`, data),
    broadcast: (storeId, data) => api.post(`/stores/${storeId}/whatsapp/broadcast`, data),
    getLogs: (storeId) => api.get(`/stores/${storeId}/whatsapp/logs`),
}

// Subscription API
export const subscriptionAPI = {
    get: () => api.get('/subscription'),
    getPlans: () => api.get('/subscription/plans'),
    upgrade: (data) => api.post('/subscription/upgrade', data),
    checkLimit: (params) => api.get('/subscription/check-limit', { params }),
}

export default api
