// =====================================================================
// Badge de status de pagamento
// =====================================================================
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

export const STATUS_PAGAMENTO = {
  em_dia: { rotulo: 'Em dia', cor: 'emeralda', icone: CheckCircle2 },
  vencendo: { rotulo: 'Vencendo', cor: 'ambar', icone: Clock },
  inadimplente: { rotulo: 'Inadimplente', cor: 'vermelho', icone: AlertTriangle }
}

const CORES = {
  emeralda:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  ambar:
    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  vermelho: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
}

export function StatusBadge({ status, compacto = false }) {
  const item = STATUS_PAGAMENTO[status] || STATUS_PAGAMENTO.em_dia
  const Icone = item.icone
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${CORES[item.cor]} ${compacto ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
    >
      <Icone className="h-3.5 w-3.5" />
      {item.rotulo}
    </span>
  )
}