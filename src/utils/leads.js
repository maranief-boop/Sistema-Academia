// =====================================================================
// Utilidades do CRM — pipeline de leads
// Estágios: novo -> atendimento -> agendamento -> convertido
// =====================================================================

export const STAGES = {
  novo: {
    rotulo: 'Novos Leads',
    curto: 'Novo',
    cor: '#3b82f6',
    dot: 'bg-blue-500',
    chip: 'bg-blue-500/20 text-blue-400',
    labelChip: 'bg-blue-500/10 text-blue-400'
  },
  atendimento: {
    rotulo: 'Em Atendimento',
    curto: 'Atendimento',
    cor: '#eab308',
    dot: 'bg-yellow-500',
    chip: 'bg-yellow-500/20 text-yellow-400',
    labelChip: 'bg-yellow-500/10 text-yellow-400'
  },
  agendamento: {
    rotulo: 'Aula Experimental',
    curto: 'Experimental',
    cor: '#f97316',
    dot: 'bg-orange-500',
    chip: 'bg-orange-500/20 text-orange-400',
    labelChip: 'bg-orange-500/10 text-orange-400'
  },
  convertido: {
    rotulo: 'Matriculados',
    curto: 'Matriculado',
    cor: '#22c55e',
    dot: 'bg-green-500',
    chip: 'bg-green-500/20 text-green-400',
    labelChip: 'bg-green-500/10 text-green-400'
  }
}

export const STAGES_ORDER = ['novo', 'atendimento', 'agendamento', 'convertido']

export const STAGE_LABELS = STAGES_ORDER.reduce((acc, s) => {
  acc[s] = STAGES[s].curto
  return acc
}, {})

// Data de referência de um lead para agrupar no tempo: prioriza data_captura,
// mas cai para created_at quando a coluna data_captura não existe/está vazia.
// Garante que o gráfico desenhe mesmo para leads antigos sem data_captura.
export function dataReferenciaLead(l) {
  return l && (l.data_captura || l.created_at)
}

// Retorna a data/hora de início do período de filtro (ou null = todos)
export function getPeriodStart(period) {
  const agora = new Date()
  const hoje0 = new Date()
  hoje0.setHours(0, 0, 0, 0)

  if (period === 'hoje') return hoje0
  if (period === 'semana') {
    const diff = (hoje0.getDay() + 6) % 7 // segunda-feira como início
    const segunda = new Date(hoje0)
    segunda.setDate(hoje0.getDate() - diff)
    return segunda
  }
  if (period === 'mes') return new Date(agora.getFullYear(), agora.getMonth(), 1)
  if (period === 'ano') return new Date(agora.getFullYear(), 0, 1)
  return null
}

// Formata a data de captura de um lead (ISO) para exibição
export function formatarCaptura(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Série de captações para o gráfico "Leads ao longo do tempo"
export function construirSerie(leads, periodo) {
  const agora = new Date()
  const buckets = []

  if (periodo === 'ano') {
    for (let m = 0; m < 12; m++) {
      const inicio = new Date(agora.getFullYear(), m, 1)
      const fim = new Date(agora.getFullYear(), m + 1, 1)
      buckets.push({
        rotulo: inicio.toLocaleDateString('pt-BR', { month: 'short' }),
        inicio,
        fim
      })
    }
  } else {
    const inicio = getPeriodStart(periodo) || new Date()
    const dias = Math.min(
      Math.floor((Date.now() - inicio.getTime()) / 86400000) + 1,
      45
    )
    const hoje0 = new Date()
    hoje0.setHours(0, 0, 0, 0)
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoje0)
      d.setDate(hoje0.getDate() - i)
      const fim = new Date(d)
      fim.setDate(d.getDate() + 1)
      buckets.push({
        rotulo: d.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        }),
        inicio: d,
        fim
      })
    }
  }

  return buckets.map((b) => ({
    rotulo: b.rotulo,
    total: leads.filter((l) => {
      const ref = dataReferenciaLead(l)
      if (!ref) return false
      const t = new Date(ref)
      return t >= b.inicio && t < b.fim
    }).length
  }))
}

// Monta o "gradient" conic-gradient para o gráfico de rosca (sem libs externas)
export function construirDoughnut(contagens) {
  const total = contagens.reduce((a, b) => a + b, 0)
  if (!total) return null
  let acumulado = 0
  const partes = contagens.map((c, i) => {
    const de = (acumulado / total) * 100
    acumulado += c
    const ate = (acumulado / total) * 100
    return `${STAGES[STAGES_ORDER[i]].cor} ${de}% ${ate}%`
  })
  return `conic-gradient(${partes.join(', ')})`
}

// Gera e baixa um CSV com os leads filtrados
export function baixarCSV(leads) {
  const cabecalho = [
    'Nome',
    'Telefone',
    'Origem',
    'Estágio',
    'Data preferida',
    'Horário',
    'Notas',
    'Capturado em'
  ]
  const linhas = leads.filter(Boolean).map((l) =>
    [
      l?.nome || '',
      l?.telefone || '',
      l?.origem || '',
      STAGE_LABELS[l?.stage] || l?.stage || '',
      l?.data_preferida || '',
      l?.horario_preferido || '',
      l?.notas || '',
      l?.data_captura || ''
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(';')
  )
  const csv = '\ufeff' + [cabecalho.join(';'), ...linhas].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
