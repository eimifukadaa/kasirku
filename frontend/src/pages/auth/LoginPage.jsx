import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../store'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
    const navigate = useNavigate()
    const { setAuth } = useAuthStore()
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })

    const loginMutation = useMutation({
        mutationFn: authAPI.login,
        onSuccess: (response) => {
            const { access_token, user } = response.data.data
            setAuth(user, access_token)
            toast.success('Login berhasil!')
            navigate('/select-store')
        },
        onError: (error) => {
            const message = error.response?.data?.error || 'Login gagal'
            toast.error(message)
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        loginMutation.mutate(formData)
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Masuk</h2>
            <p className="text-slate-500 mb-6">Selamat datang kembali!</p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                        Password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="input pl-12 pr-12"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
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
                    disabled={loginMutation.isPending}
                    className="btn-primary w-full"
                >
                    {loginMutation.isPending ? (
                        <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Memproses...
                        </span>
                    ) : (
                        'Masuk'
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-slate-500">
                    Belum punya akun?{' '}
                    <Link to="/register" className="text-primary-600 font-medium hover:underline">
                        Daftar Gratis
                    </Link>
                </p>
            </div>
        </div>
    )
}
