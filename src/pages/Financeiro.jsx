// =====================================================================
// Módulo Financeiro e Cobrança — foco em zerar a inadimplência
// - Status dinâmico de pagamento
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
  Users
} from 'lucide-react'
import { useAlunos } from '../hooks/useAlunos'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import FormAluno from '../components/FormAluno'
import { Card, EstadoVazio, Spinner, Select } from '../components/ui'
import { formatarMoeda, formatarData, diasDesde, iniciais } from '../utils/format'
import { abrirWhatsApp, mensagemCobranca } from '../utils/whatsapp'

const FILTROS = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'em_dia', rotulo: 'Em dia' },
  { chave: 'vencendo', rotulo: 'Vencendo' },
  { chave: 'inadimplente', rotulo: 'Inadimplente' }
]

export default function Financeiro() {
  const { config } = useApp()
  const { alunos, carregando, atualizar } = useAlunos()
  const { toast } = useToast()

  const [filtro, setFiltro] = useState('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState(null)

  // ----- Resumo financeiro -----
  const resumo = useMemo(() => {
    const pagantes = alunos.filter((a) => a.status_pagamento === 'em_dia')
    const vencendo = alunos.filter((a) => a.status_pagamento === 'vencendo')
    const inadimplentes = alunos.filter((a) => a.status_pagamento === 'inadimplente')
    const somar = (lista) =>
      lista.reduce((s, a) => s + (Number(a.plano_valor) || 0), 0)
    return {
      pagantes,
      vencendo,
      inadimplentes,
      totalReceber: somar([...vencendo, ...inadimplentes]),
      inadimplencia: somar(inadimplentes)
    }
  }, [alunos])

  const filtrados = useMemo(
    () => (filtro === 'todos' ? alunos : alunos.filter((a) => a.status_pagamento === filtro)),
    [alunos, filtro]
  )

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

  // ----- Atualizar status em tempo real -----
  const atualizarStatus = async (aluno, novoStatus) => {
    if (aluno.status_pagamento === novoStatus) return
    try {
      await atualizar(aluno.id, { status_pagamento: novoStatus })
      toast(
        `Status de ${aluno.nome} atualizado para "${
          novoStatus === 'em_dia' ? 'Em dia' : novoStatus === 'vencendo' ? 'Vencendo' : 'Inadimplente'
        }".`
      )
    } catch (e) {
      toast(e.message || 'Erro ao atualizar status.', 'erro')
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Financeiro
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Acompanhe e cobre os alunos — o objetivo é zerar a inadimplência.
        </p>
      </div>

      {/* ---------- Resumo ---------- */}
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
          <p className="mt-2 truncate text-xl font-extrabold">
            {formatarMoeda(resumo.totalReceber)}
          </p>
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
                (
                {f.chave === 'todos'
                  ? alunos.length
                  : alunos.filter((a) => a.status_pagamento === f.chave).length}
                )
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
                  className="flex flex-col gap-3 px-4 py-3.5 transition hover:bg-zinc-50 sm:flex-row sm:items-center dark:hover:bg-zinc-800/50"
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={aluno.status_pagamento} />
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
          pelo WhatsApp com um clique.
        </div>
      </Modal>
    </div>
  )
}