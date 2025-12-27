import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <span className="text-3xl">💰</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">KASIRKU.APP</h1>
                    <p className="text-primary-200 mt-1">POS untuk UMKM Indonesia</p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-3xl shadow-xl p-6 animate-scale-in">
                    <Outlet />
                </div>

                {/* Footer */}
                <p className="text-center text-primary-200 text-sm mt-6">
                    © 2024 KASIRKU.APP - Semua hak dilindungi
                </p>
            </div>
        </div>
    )
}
