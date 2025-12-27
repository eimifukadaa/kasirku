import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../store'
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
    const navigate = useNavigate()
    const { setAuth } = useAuthStore()
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        password: '',
    })

    const registerMutation = useMutation({
        mutationFn: authAPI.register,
        onSuccess: (response) => {
            const { access_token, user } = response.data.data
            setAuth(user, access_token)
            toast.success('Registrasi berhasil!')
            navigate('/select-store')
        },
        onError: (error) => {
            const message = error.response?.data?.error || 'Registrasi gagal'
            toast.error(message)
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        if (formData.password.length < 8) {
            toast.error('Password minimal 8 karakter')
            return
        }
        registerMutation.mutate(formData)
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Daftar</h2>
            <p className="text-slate-500 mb-6">Buat akun gratis sekarang</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nama Lengkap
                    </label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            className="input pl-12"
                            placeholder="Nama Anda"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="email"
                            className="input pl-12"
                            placeholder="email@contoh.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        No. WhatsApp
                    </label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="tel"
                            className="input pl-12"
                            placeholder="08123456789"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="input pl-12 pr-12"
                            placeholder="Minimal 8 karakter"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={8}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="btn-primary w-full"
                >
                    {registerMutation.isPending ? (
                        <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Memproses...
                        </span>
                    ) : (
                        'Daftar Sekarang'
                    )}
                </button>
            </form>

            <div className="mt-4 text-center text-xs text-slate-500">
                Dengan mendaftar, Anda menyetujui Syarat & Ketentuan kami
            </div>

            <div className="mt-6 text-center">
                <p className="text-slate-500">
                    Sudah punya akun?{' '}
                    <Link to="/login" className="text-primary-600 font-medium hover:underline">
                        Masuk
                    </Link>
                </p>
            </div>
        </div>
    )
}
