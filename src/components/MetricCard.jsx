// =====================================================================
// Card de métrica do Dashboard
// =====================================================================
export function MetricCard({ titulo, valor, sub, icone: Icone, cor = 'primary' }) {
  const CORES = {
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
    ambar: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    vermelho: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    azul: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
  }
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-zinc-200/70 transition hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {titulo}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            {valor}
          </p>
        </div>
        <div className={`rounded-xl p-2.5 ${CORES[cor]}`}>
          <Icone className="h-5 w-5" />
        </div>
      </div>
      {sub && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
      )}
    </div>
  )
}