// =====================================================================
// CRM — Pipeline de Leads (Kanban + métricas + gráficos + CSV)
// Dados vêm do Supabase (tabela "leads") via src/hooks/useLeads.js
// =====================================================================
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Download,
  MessageCircle,
  Pencil,
  Trash2,
  ArrowRight,
  Inbox,
  UserPlus,
  Headset,
  CheckCircle2,
  CalendarDays
} from 'lucide-react'
import { useLeads } from '../hooks/useLeads'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import {
  Button,
  Input,
  Label,
  Select,
  Card,
  EstadoVazio,
  Spinner
} from '../components/ui'
import {
  STAGES,
  STAGES_ORDER,
  getPeriodStart,
  formatarCaptura,
  construirSerie,
  construirDoughnut,
  baixarCSV
} from '../utils/leads'
import { linkWhatsApp } from '../utils/whatsapp'

const PERIODOS = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'semana', rotulo: 'Semana' },
  { valor: 'mes', rotulo: 'Mês' },
  { valor: 'ano', rotulo: 'Ano' }
]

const CARD = 'bg-zinc-900'

function CardMetrica({ rotulo, valor, cor, icone: Icone, sufixo }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {rotulo}
          </p>
          <p className={`mt-1 text-2xl font-extrabold ${cor}`}>
            {valor}
            {sufixo && (
              <span className="ml-1 text-sm font-semibold text-zinc-500">
                {sufixo}
              </span>
            )}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-100 p-2.5 dark:bg-zinc-800">
          <Icone className={`h-5 w-5 ${cor}`} />
        </div>
      </div>
    </Card>
  )
}

function CardLead({ lead, arrastando, onDragStart, onEdit, onDelete, onMover }) {
  if (!lead) return null
  const st = STAGES[lead?.stage] || STAGES.novo
  const wa = linkWhatsApp(
    lead?.telefone,
    `Olá, ${lead?.nome}! Aqui é da academia. Tudo bem? 😄`
  )

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', lead?.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(lead?.id)
      }}
      className={`group cursor-grab rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-800 ${
        arrastando === lead?.id ? 'opacity-50 ring-2 ring-primary-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {lead?.nome || 'Sem nome'}
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.chip}`}
        >
          {st.curto}
        </span>
      </div>

      <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
        {lead?.telefone || 'Sem telefone'}
        {lead?.data_preferida ? ` · ${lead.data_preferida.slice(0, 5)}` : ''}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          {lead?.origem && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-700/60">
              {lead.origem}
            </span>
          )}
          <span>{formatarCaptura(lead?.data_captura)}</span>
        </div>
        <div className="flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              title="Chamar no WhatsApp"
              className="rounded-md p-1.5 text-green-500 transition hover:bg-green-500/10"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={() => onEdit(lead)}
            title="Editar"
            className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(lead)}
            title="Excluir"
            className="rounded-md p-1.5 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {STAGES_ORDER.filter((s) => s !== (lead?.stage || 'novo')).map((s) => (
          <button
            key={s}
            onClick={() => onMover(lead?.id, s)}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition ${STAGES[s].chip} hover:brightness-110`}
            title={`Mover para ${STAGES[s].rotulo}`}
          >
            {STAGES[s].curto}
            <ArrowRight className="h-2.5 w-2.5" />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Crm() {
  const { leads, carregando, erro, criar, atualizar, remover } = useLeads()
  const { toast } = useToast()
  const [periodo, setPeriodo] = useState('semana')
  const [modal, setModal] = useState(null) // null | 'novo' | lead
  const [salvando, setSalvando] = useState(false)
  const [arrastando, setArrastando] = useState(null)

  const filtradas = useMemo(() => {
    const inicio = getPeriodStart(periodo)
    const validos = leads.filter(Boolean)
    if (!inicio) return validos
    return validos.filter((l) => new Date(l?.data_captura) >= inicio)
  }, [leads, periodo])

  const metricas = useMemo(() => {
    const porStage = STAGES_ORDER.reduce((acc, s) => {
      acc[s] = filtradas.filter((l) => l && (l.stage || 'novo') === s).length
      return acc
    }, {})
    return { total: filtradas.length, ...porStage }
  }, [filtradas])

  const doughnut = useMemo(
    () => construirDoughnut(STAGES_ORDER.map((s) => metricas[s])),
    [metricas]
  )
  const serie = useMemo(() => construirSerie(filtradas, periodo), [filtradas, periodo])
  const maxSerie = Math.max(1, ...serie.map((b) => b.total))

  const moverLead = async (id, stage) => {
    const r = await atualizar(id, { stage })
    if (r.erro) toast(`Erro ao mover lead: ${r.erro}`, 'erro')
    else toast(`Lead movido para "${STAGES[stage].curto}"`)
  }

  const abrirEdicao = (lead) => setModal(lead)
  const abrirNovo = () => setModal('novo')

  const excluirLead = async (lead) => {
    if (!lead) return
    if (!window.confirm(`Excluir o lead de "${lead?.nome}"?`)) return
    const r = await remover(lead.id)
    if (r.erro) toast(`Erro ao excluir: ${r.erro}`, 'erro')
    else toast('Lead excluído')
  }

  const salvar = async (evento) => {
    evento.preventDefault()
    const fd = new FormData(evento.currentTarget)
    const payload = {
      nome: fd.get('nome'),
      telefone: fd.get('telefone'),
      origem: fd.get('origem'),
      stage: fd.get('stage'),
      notas: fd.get('notas')
    }
    if (!payload.nome) return toast('Informe o nome do lead', 'aviso')

    setSalvando(true)
    const r =
      modal === 'novo'
        ? await criar(payload)
        : await atualizar(modal?.id, {
            nome: payload.nome,
            telefone: payload.telefone,
            origem: payload.origem,
            stage: payload.stage,
            notas: payload.notas
          })
    setSalvando(false)
    if (r.erro) return toast(`Erro ao salvar: ${r.erro}`, 'erro')
    setModal(null)
    toast(modal === 'novo' ? 'Lead criado' : 'Lead atualizado')
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho + ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
            CRM de Leads
          </h1>
          <p className="text-sm text-zinc-500">
            Pipeline de vendas do Site Institucional
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-zinc-200 p-1 dark:bg-zinc-800">
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                onClick={() => setPeriodo(p.valor)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  periodo === p.valor
                    ? 'bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
          <Button variante="secundario" tamanho="sm" onClick={baixarCSV.bind(null, filtradas)}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button tamanho="sm" onClick={abrirNovo}>
            <Plus className="h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Link rápido para a agenda */}
      <Link
        to="/crm/agenda"
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      >
        <CalendarDays className="h-4 w-4" />
        Abrir Agenda de Agendamentos
      </Link>

      {erro && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          Não foi possível carregar os leads. Verifique se a tabela{' '}
          <code className="font-mono">leads</code> foi criada no Supabase
          (supabase/schema.sql) e se as credenciais estão no .env.
          <p className="mt-1 break-all text-xs opacity-80">{erro}</p>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CardMetrica
          rotulo="Total"
          valor={metricas.total}
          cor="text-zinc-900 dark:text-zinc-100"
          icone={Inbox}
        />
        <CardMetrica
          rotulo="Novos Leads"
          valor={metricas.novo}
          cor="text-blue-500"
          icone={UserPlus}
        />
        <CardMetrica
          rotulo="Em Atendimento"
          valor={metricas.atendimento}
          cor="text-yellow-500"
          icone={Headset}
        />
        <CardMetrica
          rotulo="Matriculados"
          valor={metricas.convertido}
          cor="text-green-500"
          icone={CheckCircle2}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Distribuição por Estágio
          </h4>
          <p className="mb-4 text-[11px] text-zinc-500">
            Visão geral do pipeline de vendas
          </p>
          <div className="flex items-center justify-center gap-8">
            <div
              className="relative h-40 w-40 rounded-full"
              style={{ background: doughnut || '#e4e4e7' }}
            >
              <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white dark:bg-zinc-900">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  {metricas.total}
                </span>
                <span className="text-[10px] text-zinc-500">leads</span>
              </div>
            </div>
            <div className="space-y-2">
              {STAGES_ORDER.map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${STAGES[s].dot}`} />
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                    {STAGES[s].curto}
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {metricas[s]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Leads ao Longo do Tempo
          </h4>
          <p className="mb-4 text-[11px] text-zinc-500">
            Captações por dia no período
          </p>
          <div className="flex h-40 items-end gap-1">
            {serie.map((b, i) => (
              <div
                key={i}
                className="group flex flex-1 flex-col items-center gap-1"
                title={`${b.rotulo}: ${b.total} lead(s)`}
              >
                <div
                  className="w-full rounded-t bg-gradient-to-t from-primary-600 to-primary-400 transition group-hover:from-primary-500 group-hover:to-primary-300"
                  style={{ height: `${(b.total / maxSerie) * 100}%`, minHeight: b.total ? 4 : 2 }}
                />
                {i % 2 === 0 && (
                  <span className="text-[8px] text-zinc-400">{b.rotulo}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Kanban */}
      {carregando ? (
        <Spinner />
      ) : filtradas.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={Inbox}
            titulo="Nenhum lead neste período"
            descricao="Os leads captados pelo Site Institucional aparecem aqui automaticamente."
            acao={
              <Button tamanho="sm" onClick={abrirNovo}>
                <Plus className="h-4 w-4" /> Cadastrar manualmente
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-4">
          {STAGES_ORDER.map((stage) => (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain')
                if (id) moverLead(id, stage)
                setArrastando(null)
              }}
              className={`flex flex-col rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 ${CARD}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${STAGES[stage].dot}`} />
                  <h3 className="text-sm font-bold text-white">
                    {STAGES[stage].rotulo}
                  </h3>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STAGES[stage].chip}`}>
                  {filtradas.filter((l) => l && (l.stage || 'novo') === stage).length}
                </span>
              </div>
              <div className="min-h-[180px] space-y-3">
                {filtradas
                  .filter((l) => l && (l.stage || 'novo') === stage)
                  .map((lead) => (
                    <CardLead
                      key={lead.id}
                      lead={lead}
                      arrastando={arrastando}
                      onDragStart={setArrastando}
                      onEdit={abrirEdicao}
                      onDelete={excluirLead}
                      onMover={moverLead}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      <Modal
        aberto={modal !== null}
        titulo={modal === 'novo' ? 'Novo Lead' : 'Editar Lead'}
        onFechar={() => setModal(null)}
        largura="max-w-lg"
      >
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              name="nome"
              defaultValue={modal === 'novo' ? '' : modal?.nome}
              placeholder="Nome do interessado"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Telefone</Label>
              <Input
                name="telefone"
                defaultValue={modal === 'novo' ? '' : modal?.telefone}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>Origem</Label>
              <Input
                name="origem"
                defaultValue={modal === 'novo' ? '' : modal?.origem}
                placeholder="Site, WhatsApp, Indicação..."
              />
            </div>
          </div>
          <div>
            <Label>Estágio</Label>
            <Select name="stage" defaultValue={modal === 'novo' ? 'novo' : modal?.stage}>
              {STAGES_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STAGES[s].rotulo}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Notas</Label>
            <Input
              name="notas"
              defaultValue={modal === 'novo' ? '' : modal?.notas}
              placeholder="Observações do atendimento..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variante="fantasma" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button type="submit" carregando={salvando}>
              {modal === 'novo' ? 'Criar lead' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
