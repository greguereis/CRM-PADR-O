import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  UserPlus,
  FileText,
  CheckCircle,
  TrendingUp,
  X
} from 'lucide-react'

const links = [
  { to: '/overview', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/propostas', icon: FileText, label: 'Propostas' },
  { to: '/contratos', icon: CheckCircle, label: 'Contratos' },
  { to: '/equipe', icon: UserPlus, label: 'Equipe' },
]

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        w-64 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-color)] 
        flex flex-col fixed left-0 top-0 z-50
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              <span className="text-[#D2B68A]">PAR</span>HUB
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Agências de Carros</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] lg:hidden text-[var(--text-secondary)]"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-[#D2B68A]/10 text-[#D2B68A]' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--border-color)]">
          <div className="text-[10px] text-[var(--text-secondary)] text-center">
            v2.0.0 • Agências de Carros
          </div>
        </div>
      </aside>
    </>
  )
}