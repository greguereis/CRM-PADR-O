import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun, Shield, Sparkles } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const { isDark, toggle } = useTheme()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await login()
    } catch (err) {
      console.error('Erro no login:', err)
      setError(err.message || 'Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      {/* Theme Toggle - Top Right */}
      <button
        onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
        aria-label="Alternar tema"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Login Card */}
      <div className="card p-6 sm:p-8 w-full max-w-md text-center space-y-6">
        {/* Logo */}
        <div className="space-y-2">
          <div className="w-16 h-16 bg-[#D2B68A] rounded-2xl flex items-center justify-center mx-auto">
            <Shield size={28} className="text-[#222D52]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            <span className="text-[#D2B68A]">PAR</span>HUB
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            CRM para Agências de Carros
          </p>
          <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-muted)]">
            <Shield size={12} className="text-[#D2B68A]" />
            <span>Segurança e confiabilidade</span>
            <Sparkles size={12} className="text-[#D2B68A] ml-1" />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-xs text-[var(--text-secondary)]">ACESSO</span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg animate-fadeIn">
            {error}
          </div>
        )}

        {/* Google Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-[var(--bg-tertiary)] hover:bg-[#D2B68A]/10 text-[var(--text-primary)] font-medium py-3 px-4 rounded-lg transition-all border border-[var(--border-color)] hover:border-[#D2B68A]/30 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-[#D2B68A] border-t-transparent rounded-full animate-spin" />
              Entrando...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Entrar com Google
            </>
          )}
        </button>

        <div className="space-y-2 text-xs text-[var(--text-secondary)]">
          <p>Faça login com sua conta Google para acessar o CRM</p>
          <p className="text-[10px] text-[var(--text-muted)]">
            🔒 Seus dados estão seguros e protegidos
          </p>
        </div>

        {/* Versão */}
        <div className="text-[9px] text-[var(--text-muted)] border-t border-[var(--border-color)] pt-3">
          v2.0.0 • Agências de Carros
        </div>
      </div>
    </div>
  )
}