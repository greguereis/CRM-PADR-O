import { Menu, Moon, Sun, LogOut, User, Bell, Settings, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()

  return (
    <header className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-3 fixed top-0 left-0 right-0 z-20">
      {/* Lado Esquerdo */}
      <div className="flex items-center gap-2">
        {/* Botão Menu Hambúrguer - visível apenas no mobile */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        {/* Logo mobile */}
        <span className="lg:hidden text-sm font-bold text-[var(--text-primary)]">
          <span className="text-[#D2B68A]">PAR</span>HUB
        </span>

        {/* Saudação - esconde no mobile para economizar espaço */}
        <div className="hidden lg:block">
          <h2 className="text-xs text-[var(--text-secondary)]">
            Bem-vindo de volta
          </h2>
          <p className="text-sm text-[var(--text-primary)] font-medium leading-tight truncate max-w-[200px]">
            {user?.nome || 'Usuário'}
          </p>
        </div>
      </div>

      {/* Lado Direito */}
      <div className="flex items-center gap-1.5">
        {/* Nome do usuário - versão compacta no mobile */}
        <span className="text-xs font-medium text-[var(--text-primary)] hidden sm:block truncate max-w-[100px]">
          {user?.nome?.split(' ')[0] || 'Usuário'}
        </span>

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Avatar */}
        {user?.foto ? (
          <img
            src={user.foto}
            alt={user.nome}
            className="w-7 h-7 rounded-full border border-[var(--border-color)] object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#D2B68A] flex items-center justify-center text-white text-xs font-bold">
            {user?.nome?.charAt(0) || 'U'}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-[var(--text-secondary)] hover:text-red-500"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}