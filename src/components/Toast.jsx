// =====================================================================
// Sistema de notificações (Toast) — feedback rápido para o gestor
// =====================================================================
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react'
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONES = {
  sucesso: CheckCircle2,
  erro: XCircle,
  aviso: AlertTriangle
}

const ESTILOS = {
  sucesso: 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-900 dark:bg-primary-950 dark:text-primary-200',
  erro: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
  aviso: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const remover = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const toast = useCallback(
    (mensagem, tipo = 'sucesso') => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, mensagem, tipo }])
      timers.current[id] = setTimeout(() => remover(id), 4000)
    },
    [remover]
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => {
          const Icone = ICONES[t.tipo] || CheckCircle2
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium shadow-card backdrop-blur ${ESTILOS[t.tipo]}`}
            >
              <Icone className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{t.mensagem}</span>
              <button
                onClick={() => remover(t.id)}
                className="rounded p-0.5 opacity-60 transition hover:opacity-100"
                aria-label="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}