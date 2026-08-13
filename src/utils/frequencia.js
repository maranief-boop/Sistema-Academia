// =====================================================================
// Agregação de frequência por períodos (Semanal / Mensal / Anual)
// Reutilizada no painel administrativo (Check-ins), no Histórico do Aluno
// e no Portal do Aluno.
// =====================================================================

// Semana exibida de Segunda (índice 1) a Domingo (índice 0 do JS)
export const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]
export const ROTULOS_DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export const MESES_ROTULO = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

// Segunda-feira 00:00 da semana corrente (horário local)
export function inicioDaSemana() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

// Registros desta semana, um valor por dia (Segunda → Domingo)
// getData: função que extrai a data/hora (string ISO) de cada item
export function agregarSemanal(itens, getData) {
  const inicio = inicioDaSemana()
  const valores = Array(7).fill(0)
  itens.forEach((item) => {
    const d = new Date(getData(item))
    if (!Number.isNaN(d.getTime()) && d >= inicio) valores[d.getDay()] += 1
  })
  return { valores, total: valores.reduce((s, v) => s + v, 0) }
}

// Registros deste mês, agrupados por semana do mês (até 5 barras)
export function agregarMensal(itens, getData) {
  const hoje = new Date()
  const valores = [0, 0, 0, 0, 0]
  itens.forEach((item) => {
    const d = new Date(getData(item))
    if (
      !Number.isNaN(d.getTime()) &&
      d.getFullYear() === hoje.getFullYear() &&
      d.getMonth() === hoje.getMonth()
    ) {
      valores[Math.min(4, Math.floor((d.getDate() - 1) / 7))] += 1
    }
  })
  return { valores, total: valores.reduce((s, v) => s + v, 0) }
}

// Registros deste ano, um valor por mês (Jan → Dez)
export function agregarAnual(itens, getData) {
  const ano = new Date().getFullYear()
  const valores = Array(12).fill(0)
  itens.forEach((item) => {
    const d = new Date(getData(item))
    if (!Number.isNaN(d.getTime()) && d.getFullYear() === ano) valores[d.getMonth()] += 1
  })
  return { valores, total: valores.reduce((s, v) => s + v, 0) }
}