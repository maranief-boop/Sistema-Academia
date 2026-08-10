// =====================================================================
// Métricas de negócio calculadas a partir dos dados do Supabase
// =====================================================================
import { diasDesde } from './format'

const LIMITE_EVASAO = 7 // dias sem treinar

// Mapa: aluno_id -> data_hora do último check-in
export function mapaUltimoCheckin(checkins) {
  const mapa = {}
  ;(checkins || []).forEach((c) => {
    const atual = new Date(c.data_hora)
    const anterior = mapa[c.aluno_id] ? new Date(mapa[c.aluno_id]) : null
    if (!anterior || atual > anterior) mapa[c.aluno_id] = c.data_hora
  })
  return mapa
}

export function computarMetricas(alunos, checkins) {
  const ultimo = mapaUltimoCheckin(checkins)

  // Faturamento mensal esperado = soma dos planos dos alunos pagantes/vencendo
  const faturamento = (alunos || []).reduce((soma, a) => {
    if (a.status_pagamento === 'inadimplente') return soma
    return soma + (Number(a.plano_valor) || 0)
  }, 0)

  const total = alunos.length
  const inadimplentes = (alunos || []).filter(
    (a) => a.status_pagamento === 'inadimplente'
  )
  const taxaInadimplencia = total
    ? Math.round((inadimplentes.length / total) * 1000) / 10
    : 0

  // Risco de evasão: sem check-in há mais de 7 dias (ou nunca treinou e foi criado há 7+ dias)
  const emRisco = (alunos || []).filter((a) => {
    const ultimoCheck = ultimo[a.id]
    if (!ultimoCheck) return diasDesde(a.created_at) >= LIMITE_EVASAO
    return diasDesde(ultimoCheck) >= LIMITE_EVASAO
  })

  return {
    total,
    faturamento,
    inadimplentes: inadimplentes.length,
    taxaInadimplencia,
    emRisco
  }
}

// Conta check-ins por dia (últimos `dias` dias) — usado no gráfico do dashboard
export function checkinsPorDia(checkins, dias = 7) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const resultado = []
  for (let i = dias - 1; i >= 0; i--) {
    const dia = new Date(hoje)
    dia.setDate(hoje.getDate() - i)
    const chave = dia.toDateString()
    const total = (checkins || []).filter((c) => {
      const d = new Date(c.data_hora)
      return d.toDateString() === chave
    }).length
    resultado.push({ data: dia, total })
  }
  return resultado
}