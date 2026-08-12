// =====================================================================
// Módulo Financeiro e Cobrança — foco em zerar a inadimplência
// - Receita efetiva (Hoje / Semana / Mês / Ano) via data_ultimo_pagamento
// - Fila de pagantes com valor, data da baixa e forma de pagamento
// - Cobrança rápida via WhatsApp (mensagem personalizada)
// - Atualização de status direto no Supabase
// =====================================================================
import { useMemo, useState } from 'react'
import {
  MessageCircle,
  Pencil,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  Users,
  TrendingUp
} from 'lucide-react'
import { useAlunos } from '../hooks/useAlunos'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import FormAluno from '../components/FormAluno'
import { Card, EstadoVazio, Spinner, Select } from '../components/ui'
import { formatarMoeda, formatarData, diasDesde, iniciais, dataParaInput } from '../utils/format'
import { abrirWhatsApp, mensagemCobranca } from '../utils/whatsapp'

const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto',
  'Transferência',
  'Outro'
]

const FILTROS = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'em_dia', rotulo: 'Em dia' },
  { chave: 'vencendo', rotulo: 'Vencendo' },
  { chave: 'inadimplente', rotulo: 'Inadimplente' },
  { chave: 'pagantes', rotulo: 'Pagantes' }
]

// Limites de período em formato YYYY-MM-DD (comparação de string é segura p/ datas ISO)
function limitesPeriodo() {
  const hoje = new Date()
  const hojeStr = dataParaInput(hoje)
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const inicioMes = `${hoje.getFullYear()}-${mes}-01`
  const inicioAno = `${hoje.getFullYear()}-01-01`
  // segunda-feira desta semana
  const d = new Date(hoje)
  const diaSem = (d.getDay() + 6) % 7 // 0 = segunda
  d.setDate(d.getDate() - diaSem)
  const inicioSemana = dataParaInput(d)
  return { hojeStr, inicioSemana, inicioMes, inicioAno }
}

export default function Financeiro() {
  const { config } = useApp()
  const { alunos, carregando, erro, atualizar } = useAlunos()
  const { toast } = useToast()

  const [filtro, setFiltro] = useState('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState(null)

  // ----- Receita efetiva (pagamentos já registrados) -----
  const receita = useMemo(() => {
    const { hojeStr, inicioSemana, inicioMes, inicioAno } = limitesPeriodo()
    const somar = (inicio) =>
      alunos
        .filter(
          (a) =>
            a.data_ultimo_pagamento &&
            a.data_ultimo_pagamento >= inicio &&
            a.data_ultimo_pagamento <= hojeStr
        )
        .reduce((s, a) => s + (Number(a.plano_valor) || 0), 0)
    return {
      hoje: somar(hojeStr),
      semana: somar(inicioSemana),
      mes: somar(inicioMes),
      ano: somar(inicioAno)
    }
  }, [alunos])

  // ----- Resumo por status (pipeline) -----
  const resumo = useMemo(() => {
    const pagantes = alunos.filter((a) => a.status_pagamento === 'em_dia')
    const vencendo = alunos.filter((a) => a.status_pagamento === 'vencendo')
    const inadimplentes = alunos.filter((a) => a.status_pagamento === 'inadimplente')
    const somar = (lista) => lista.reduce((s, a) => s + (Number(a.plano_valor) || 0), 0)
    return {
      pagantes,
      vencendo,
      inadimplentes,
      totalReceber: somar([...vencendo, ...inadimplentes]),
      inadimplencia: somar(inadimplentes)
    }
  }, [alunos])

  const contagem = (chave) => {
    if (chave === 'todos') return alunos.length
    if (chave === 'pagantes') return alunos.filter((a) => a.data_ultimo_pagamento).length
    return alunos.filter((a) => a.status_pagamento === chave).length
  }

  const filtrados = useMemo(() => {
    // 'todos' deve listar CADA aluno da tabela, independentemente de ter
    // data_ultimo_pagamento ou forma_pagamento preenchidos.
    if (filtro === 'todos') return alunos
    if (filtro === 'pagantes')
      return alunos
        .filter((a) => a.data_ultimo_pagamento)
        .sort((a, b) => String(b.data_ultimo_pagamento).localeCompare(String(a.data_ultimo_pagamento)))
    return alunos.filter((a) => a.status_pagamento === filtro)
  }, [alunos, filtro])

  // ----- Cobrar via WhatsApp -----
  const cobrar = (aluno) => {
    const ok = abrirWhatsApp(
      aluno.telefone,
      mensagemCobranca({
        nome: aluno.nome,
        academia: config.nome_academia,
        valor: formatarMoeda(aluno.plano_valor),
        vencimento: formatarData(aluno.data_vencimento)
      })
    )
    if (!ok) toast('Cadastre o WhatsApp do aluno para cobrar.', 'erro')
  }

  // ----- Atualizar status em tempo real (marcar "em dia" registra a baixa) -----
  const atualizarStatus = async (aluno, novoStatus) => {
    if (aluno.status_pagamento === novoStatus) return
    const payload = { status_pagamento: novoStatus }
    if (novoStatus === 'em_dia') payload.data_ultimo_pagamento = dataParaInput(new Date())
    try {
      await atualizar(aluno.id, payload)
      toast(
        `Status de ${aluno.nome} atualizado para "${
          novoStatus === 'em_dia' ? 'Em dia' : novoStatus === 'vencendo' ? 'Vencendo' : 'Inadimplente'
        }".`
      )
    } catch (e) {
      toast(e.message || 'Erro ao atualizar status.', 'erro')
    }
  }

  const atualizarForma = async (aluno, forma) => {
    try {
      await atualizar(aluno.id, { forma_pagamento: forma })
    } catch (e) {
      toast(e.message || 'Erro ao salvar forma de pagamento.', 'erro')
    }
  }

  const salvarEdicao = async (payload) => {
    try {
      await atualizar(alunoEditando.id, payload)
      toast('Dados financeiros atualizados.')
      setModalAberto(false)
    } catch (e) {
      toast(e.message || 'Erro ao atualizar.', 'erro')
    }
  }

  const CARDS_RECEITA = [
    { rotulo: 'Recebido hoje', valor: receita.hoje, cor: 'from-emerald-500 to-emerald-600' },
    { rotulo: 'Recebido na semana', valor: receita.semana, cor: 'from-teal-500 to-teal-600' },
    { rotulo: 'Recebido no mês', valor: receita.mes, cor: 'from-sky-500 to-sky-600' },
    { rotulo: 'Recebido no ano', valor: receita.ano, cor: 'from-indigo-500 to-indigo-600' }
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Financeiro
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Acompanhe a receita e cobre os alunos — o objetivo é zerar a inadimplência.
        </p>
      </div>

      {/* ---------- Aviso de falha na busca ---------- */}
      {erro && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-semibold">Não foi possível carregar os alunos.</p>
          <p className="mt-1">{erro}</p>
          <p className="mt-1 text-xs opacity-80">
            Se o erro mencionar uma coluna inexistente, rode o <code>schema.sql</code> no
            Supabase (o <code>NOTIFY pgrst</code> ao final recarrega o cache de schema).
          </p>
        </div>
      )}

      {/* ---------- Receita efetiva ---------- */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Receita recebida
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CARDS_RECEITA.map((c) => (
            <div
              key={c.rotulo}
              className={`rounded-2xl bg-gradient-to-br ${c.cor} p-4 text-white shadow-card`}
            >
              <TrendingUp className="h-5 w-5 opacity-80" />
              <p className="mt-2 truncate text-xl font-extrabold">{formatarMoeda(c.valor)}</p>
              <p className="text-xs font-medium opacity-90">{c.rotulo}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Situação (pipeline) ---------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-emerald-500 p-4 text-white shadow-card">
          <CheckCircle2 className="h-5 w-5 opacity-80" />
          <p className="mt-2 text-2xl font-extrabold">{resumo.pagantes.length}</p>
          <p className="text-xs font-medium opacity-90">Em dia</p>
        </div>
        <div className="rounded-2xl bg-amber-500 p-4 text-white shadow-card">
          <Wallet className="h-5 w-5 opacity-80" />
          <p className="mt-2 text-2xl font-extrabold">{resumo.vencendo.length}</p>
          <p className="text-xs font-medium opacity-90">Vencendo</p>
        </div>
        <div className="rounded-2xl bg-red-500 p-4 text-white shadow-card">
          <AlertTriangle className="h-5 w-5 opacity-80" />
          <p className="mt-2 text-2xl font-extrabold">{resumo.inadimplentes.length}</p>
          <p className="text-xs font-medium opacity-90">Inadimplentes</p>
        </div>
        <div className="rounded-2xl bg-zinc-900 p-4 text-white shadow-card dark:bg-zinc-800">
          <Banknote className="h-5 w-5 opacity-80" />
          <p className="mt-2 truncate text-xl font-extrabold">{formatarMoeda(resumo.totalReceber)}</p>
          <p className="text-xs font-medium opacity-90">Total a receber</p>
        </div>
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => {
          const ativo = filtro === f.chave
          return (
            <button
              key={f.chave}
              onClick={() => setFiltro(f.chave)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                ativo
                  ? 'bg-primary-600 text-white shadow'
                  : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-700'
              }`}
            >
              {f.rotulo}
              <span className={ativo ? 'ml-1 opacity-80' : 'ml-1 text-zinc-400'}>
                ({contagem(f.chave)})
              </span>
            </button>
          )
        })}
      </div>

      {/* ---------- Lista ---------- */}
      {carregando ? (
        <Spinner />
      ) : filtrados.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={Users}
            titulo="Nenhum aluno neste filtro"
            descricao="Cadastre alunos ou altere o filtro de status."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtrados.map((aluno) => {
              const atraso = aluno.data_vencimento ? diasDesde(aluno.data_vencimento) : null
              const vencido = atraso !== null && atraso > 0
              return (
                <li
                  key={aluno.id}
                  className="flex flex-col gap-3 px-4 py-3.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                      {iniciais(aluno.nome)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                        {aluno.nome}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatarMoeda(aluno.plano_valor)}
                        <span className="mx-1">·</span>
                        Vence {formatarData(aluno.data_vencimento)}
                        {vencido && (
                          <span className="ml-1 font-semibold text-red-500">
                            ({atraso} dia(s) de atraso)
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Baixa:{' '}
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {formatarData(aluno.data_ultimo_pagamento) || 'sem registro'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={aluno.status_pagamento} />
                    <Select
                      value={aluno.forma_pagamento || ''}
                      onChange={(e) => atualizarForma(aluno, e.target.value)}
                      className="w-40 px-2 py-1.5 text-xs"
                      title="Forma de pagamento"
                    >
                      <option value="">Forma de pag.</option>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={aluno.status_pagamento}
                      onChange={(e) => atualizarStatus(aluno, e.target.value)}
                      className="w-32 px-2 py-1.5 text-xs"
                      title="Alterar status"
                    >
                      <option value="em_dia">Em dia</option>
                      <option value="vencendo">Vencendo</option>
                      <option value="inadimplente">Inadimplente</option>
                    </Select>
                    <button
                      onClick={() => cobrar(aluno)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-600"
                      title="Cobrar via WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Cobrar
                    </button>
                    <button
                      onClick={() => {
                        setAlunoEditando(aluno)
                        setModalAberto(true)
                      }}
                      className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      title="Editar dados financeiros"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Modal
        aberto={modalAberto}
        titulo="Dados financeiros"
        onFechar={() => setModalAberto(false)}
      >
        <FormAluno
          inicial={alunoEditando}
          onSalvar={salvarEdicao}
          onCancelar={() => setModalAberto(false)}
          salvando={false}
        />
        <div className="mt-4 rounded-xl bg-zinc-100 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <p className="font-semibold">Dica:</p>
          Use o botão verde "Cobrar" na listagem para enviar o lembrete de pagamento
          pelo WhatsApp com um clique. Marcar o aluno como "Em dia" registra
          automaticamente a data da baixa para o controle de receita.
        </div>
      </Modal>
    </div>
  )
}
