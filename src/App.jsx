// =====================================================================
// Raiz da aplicação — providers + rotas
// =====================================================================
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Alunos from './pages/Alunos'
import Financeiro from './pages/Financeiro'
import Treinos from './pages/Treinos'
import Checkins from './pages/Checkins'
import Configuracoes from './pages/Configuracoes'
import PortalAluno from './pages/PortalAluno'

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            {/* Rota pública — Portal do Aluno (independente do painel do gestor) */}
            <Route path="/aluno" element={<PortalAluno />} />

            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/alunos" element={<Alunos />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/treinos" element={<Treinos />} />
              <Route path="/checkins" element={<Checkins />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AppProvider>
  )
}