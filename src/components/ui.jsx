// =====================================================================
// Componentes básicos de UI reutilizáveis (Button, Input, Select, ...)
// =====================================================================
import { Loader2 } from 'lucide-react'

// ---------- Botão ----------
const VARIANTES = {
  primario:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-500',
  secundario:
    'bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700',
  perigo:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
  fantasma: 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800'
}

const TAMANHOS = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-3.5 py-2 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2'
}

export function Button({
  variante = 'primario',
  tamanho = 'md',
  carregando = false,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`}
      disabled={disabled || carregando}
      {...props}
    >
      {carregando && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

// ---------- Rótulo ----------
export function Label({ children, className = '' }) {
  return (
    <label
      className={`mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 ${className}`}
    >
      {children}
    </label>
  )
}

// ---------- Campo de texto / número ----------
const CAMPO_BASE =
  'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500'

export function Input({ className = '', ...props }) {
  return <input className={`${CAMPO_BASE} ${className}`} {...props} />
}

// ---------- Select ----------
export function Select({ className = '', children, ...props }) {
  return (
    <select className={`${CAMPO_BASE} ${className}`} {...props}>
      {children}
    </select>
  )
}

// ---------- Card ----------
export function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-card ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-zinc-800 ${className}`}
    >
      {children}
    </div>
  )
}

// ---------- Estado vazio ----------
export function EstadoVazio({ icone: Icone, titulo, descricao, acao }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="rounded-2xl bg-zinc-100 p-4 text-zinc-400 dark:bg-zinc-800">
        {Icone && <Icone className="h-8 w-8" />}
      </div>
      <p className="font-semibold text-zinc-700 dark:text-zinc-200">{titulo}</p>
      {descricao && (
        <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
          {descricao}
        </p>
      )}
      {acao}
    </div>
  )
}

// ---------- Indicador de carregamento ----------
export function Spinner({ className = '' }) {
  return (
    <div className={`flex justify-center py-10 text-primary-600 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )
}