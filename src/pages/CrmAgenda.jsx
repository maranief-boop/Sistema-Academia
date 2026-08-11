// =====================================================================
// CRM — Agenda de Agendamentos
// Agendamentos são leads com data_preferida preenchida (tabela "leads")
// =====================================================================
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Trash2,
  CalendarDays,
  ClipboardList
} from 'lucide-react'
import { useLeads } from '../hooks/useLeads'
import { useToast } from '../components/Toast'
import { Button, Card, EstadoVazio, Spinner } from '../components/ui'
import { STAGES } from '../utils/leads'
import { linkWhatsApp } from '../utils/whatsapp'
import { dataParaInput } from '../utils/format'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]

export default function CrmAgenda() {
  const { leads, carregando, remover } = useLeads()
  const { toast } = useToast()
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())
  const [diaSelecionado, setDiaSelecionado] = useState(dataParaInput(hoje))

  const porData = useMemo(() => {
    const mapa = {}
    leads.forEach((l) => {
      if (!l.data_preferida) return
      const chave = l.data_preferida.slice(0, 10)
      if (!mapa[chave]) mapa[chave] = []
      mapa[chave].push(l)
    })
    return mapa
  }, [leads])

  const totalAgendamentos = useMemo(
    () => Object.values(porData).reduce((a, b) => a + b.length, 0),
    [porData]
  )

  const primeiroDia = new Date(ano, mes, 1)
  const diaInicioSemana = primeiroDia.getDay()
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  const hojeStr = dataParaInput(hoje)

  const celulas = [
    ...Array(diaInicioSemana).fill(null),
    ...Array.from({ length: ultimoDia }, (_, i) => {
      const d = new Date(ano, mes, i + 1)
      const str = dataParaInput(d)
      return { dia: i + 1, str, qtd: (porData[str] || []).length }
    })
  ]

  const mudarMes = (delta) => {
    const novaData = new Date(ano, mes + delta, 1)
    setMes(novaData.getMonth())
    setAno(novaData.getFullYear())
  }

  const agendamentosDia = porData[diaSelecionado] || []
  const diaFormatado = new Date(`${diaSelecionado}T12:00:00`).toLocaleDateString(
    'pt-BR',
    { day: '2-digit', month: 'long', year: 'numeric' }
  )

  const excluir = async (lead) => {
    if (!window.confirm(`Excluir o agendamento de "${lead.nome}"?`)) return
    const r = await remover(lead.id)
    if (r.erro) toast(`Erro ao excluir: ${r.erro}`, 'erro')
    else toast('Agendamento excluído')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
            Agenda de Agendamentos
          </h1>
          <p className="text-sm text-zinc-500">
            Aulas experimentais marcadas pelo site e pelo atendimento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/crm/leads">
            <Button variante="secundario" tamanho="sm">
              <ClipboardList className="h-4 w-4" /> Voltar ao Kanban
            </Button>
          </Link>
          <span className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Total: <strong className="text-orange-500">{totalAgendamentos}</strong>{' '}
            agendamentos
          </span>
        </div>
      </div>

      {carregando ? (
        <Spinner />
      ) : (
        <>
          <Card className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => mudarMes(-1)}
                  className="rounded-lg bg-zinc-100 p-2 text-zinc-500 transition hover:text-zinc-900 dark:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {MESES[mes]} {ano}
                </h3>
                <button
                  onClick={() => mudarMes(1)}
                  className="rounded-lg bg-zinc-100 p-2 text-zinc-500 transition hover:text-zinc-900 dark:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <span className="text-xs text-zinc-500">
                {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-zinc-500">
              {DIAS_SEMANA.map((d, i) => (
                <div key={i} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {celulas.map((c, i) =>
                c === null ? (
                  <div key={i} className="min-h-14 rounded-xl" />
                ) : (
                  <button
                    key={i}
                    onClick={() => setDiaSelecionado(c.str)}
                    className={`relative flex min-h-14 flex-col items-center justify-center rounded-xl text-sm font-semibold transition ${
                      c.str === diaSelecionado
                        ? 'bg-primary-600 text-white shadow'
                        : c.str === hojeStr
                          ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {c.dia}
                    {c.qtd > 0 && (
                      <span
                        className={`mt-0.5 rounded-full px-1.5 text-[10px] font-bold ${
                          c.str === diaSelecionado
                            ? 'bg-white/25 text-white'
                            : 'bg-orange-500 text-white'
                        }`}
                      >
                        {c.qtd}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-500" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {diaFormatado}
              </h4>
              <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-bold text-orange-500">
                {agendamentosDia.length}
              </span>
            </div>

            {agendamentosDia.length === 0 ? (
              <EstadoVazio
                icone={ClipboardList}
                titulo="Nenhum agendamento neste dia"
                descricao="Selecione outro dia no calendário acima."
              />
            ) : (
              <div className="space-y-2">
                {agendamentosDia.map((lead) => {
                  const st = STAGES[lead.stage] || STAGES.novo
                  const wa = linkWhatsApp(
                    lead.telefone,
                    `Olá, ${lead.nome}! Confirmando sua aula experimental ${lead.horario_preferido ? `às ${lead.horario_preferido} ` : ''}em ${diaFormatado}. 💪`
                  )
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {lead.nome || 'Sem nome'}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.chip}`}
                          >
                            {st.curto}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {lead.telefone || 'Sem telefone'}
                          {lead.horario_preferido
                            ? ` · às ${lead.horario_preferido}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            title="Chamar no WhatsApp"
                            className="rounded-md p-2 text-green-500 transition hover:bg-green-500/10"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => excluir(lead)}
                          title="Excluir"
                          className="rounded-md p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
