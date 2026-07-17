import { Routes, Route, Navigate } from 'react-router-dom'
// import { useAuth } from './contexts/AuthContext'  // COMENTADO PARA TESTE
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Agenda from './pages/Agenda'
import Propostas from './pages/Propostas'
import ContratosFechados from './pages/ContratosFechados'
import Equipe from './pages/Equipe'

// ===== PRIVATE ROUTE COMENTADO PARA TESTE =====
// function PrivateRoute({ children }) {
//   const { user, loading } = useAuth()
//   
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
//         <div className="text-[#D2B68A] text-lg font-medium">Carregando...</div>
//       </div>
//     )
//   }
//   
//   return user ? children : <Navigate to="/login" />
// }

// ===== NOVO PRIVATE ROUTE SEM AUTENTICAÇÃO (MODO TESTE) =====
function PrivateRoute({ children }) {
  // SEMPRE RETORNA O CHILDREN - NÃO BLOQUEIA ACESSO
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="propostas" element={<Propostas />} />
        <Route path="contratos" element={<ContratosFechados />} />
        <Route path="equipe" element={<Equipe />} />
      </Route>
    </Routes>
  )
}