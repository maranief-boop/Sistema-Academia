// =====================================================================
// Layout responsivo: sidebar no desktop, bottom-nav no mobile
// Inclui marca (white-label), alternância de tema e navegação
// =====================================================================
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Wallet,
  Dumbbell,
  CalendarCheck,
  Settings,
  Monitor,
  Sun,
  Moon,
  Loader2,
  User,
  Filter,
  Globe
} from 'lucide-react'
import { useApp } from '../context/AppContext'

const ITENS_NAV = [
  { to: '/', label: 'Início', icone: LayoutDashboard },
  { to: '/alunos', label: 'Alunos', icone: Users },
  { to: '/financeiro', label: 'Financeiro', icone: Wallet },
  { to: '/treinos', label: 'Treinos', icone: Dumbbell },
  { to: '/checkins', label: 'Check-in', icone: CalendarCheck },
  { to: '/crm', label: 'CRM', icone: Filter }
]

const TEMAS = {
  auto: { label: 'Sistema', icone: Monitor },
  light: { label: 'Claro', icone: Sun },
  dark: { label: 'Escuro', icone: Moon }
}

function Logo({ tamanho = 'h-9 w-9' }) {
  const { config } = useApp()
  if (config.logo_url) {
    return (
      <img
        src={config.logo_url}
        alt={config.nome_academia}
        className={`${tamanho} rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700`}
      />
    )
  }
  return (
    <div
      className={`${tamanho} flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 font-extrabold text-white shadow`}
    >
      {(config.nome_academia || 'A')[0].toUpperCase()}
    </div>
  )
}

export default function Layout() {
  const { config, carregando, tema, setTema } = useApp()
  const [tituloPagina, setTituloPagina] = useState('Início')
  const localizacao = useLocation()

  useEffect(() => {
    const atual = ITENS_NAV.find((i) =>
      i.to === '/' ? localizacao.pathname === '/' : localizacao.pathname.startsWith(i.to)
    )
    if (localizacao.pathname.startsWith('/site')) {
      setTituloPagina('Site Institucional')
    } else if (localizacao.pathname.startsWith('/crm/agenda')) {
      setTituloPagina('Agenda')
    } else {
      setTituloPagina(atual?.label || 'Início')
    }
    document.title = `${tituloPagina} · ${config.nome_academia}`
  }, [localizacao, config.nome_academia, tituloPagina])

  // Tela inicial enquanto a configuração carrega
  if (carregando) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-100 dark:bg-zinc-950">
        <Logo tamanho="h-14 w-14" />
        <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
      </div>
    )
  }

  const ciclarTema = () => {
    const ordem = ['auto', 'light', 'dark']
    setTema(ordem[(ordem.indexOf(tema) + 1) % ordem.length])
  }
  const TemaAtual = TEMAS[tema] || TEMAS.auto
  const TemaIcone = TemaAtual.icone

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* ---------- Sidebar (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-200 bg-white md:flex dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo />
          <div className="min-w-0">
            <p className="truncate font-bold text-zinc-900 dark:text-zinc-100">
              {config.nome_academia}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Gestão</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {ITENS_NAV.map(({ to, label, icone: Icone }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary-600 text-white shadow'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`
              }
            >
              <Icone className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <a
            href="#/aluno"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Abrir o Portal do Aluno em nova aba"
          >
            <User className="h-5 w-5" />
            Portal do Aluno
          </a>
            <NavLink
              to="/site"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary-600 text-white shadow'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`
              }
              title="Visualizar o Site Institucional"
            >
              <Globe className="h-5 w-5" />
              Site Institucional
            </NavLink>
            <button
              onClick={ciclarTema}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title={`Tema: ${TemaAtual.label}`}
            >
            <TemaIcone className="h-5 w-5" />
            Tema: {TemaAtual.label}
          </button>
          <NavLink
            to="/configuracoes"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`
            }
          >
            <Settings className="h-5 w-5" />
            Configurações
          </NavLink>
        </div>
      </aside>

      {/* ---------- Conteúdo ---------- */}
      <div className="md:pl-64">
        {/* Header (mobile) */}
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Logo tamanho="h-8 w-8" />
              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                {config.nome_academia}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <a
                href="#/aluno"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Portal do Aluno"
              >
                <User className="h-5 w-5" />
              </a>
              <NavLink
                to="/site"
                className="rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Site Institucional"
              >
                <Globe className="h-5 w-5" />
              </NavLink>
              <button
                onClick={ciclarTema}
                className="rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title={`Tema: ${TemaAtual.label}`}
              >
                <TemaIcone className="h-5 w-5" />
              </button>
              <NavLink
                to="/configuracoes"
                className="rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Configurações"
              >
                <Settings className="h-5 w-5" />
              </NavLink>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>

      {/* ---------- Bottom nav (mobile) ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="grid grid-cols-6">
          {ITENS_NAV.map(({ to, label, icone: Icone }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`
              }
            >
              <Icone className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}