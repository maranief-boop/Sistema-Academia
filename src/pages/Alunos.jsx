// =====================================================================
// Módulo de Alunos — cadastro, listagem, edição e exclusão (Supabase)
// =====================================================================
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Dumbbell, Users, Phone, History } from 'lucide-react'
import { useAlunos } from '../hooks/useAlunos'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import FormAluno from '../components/FormAluno'
import ModalHistorico from '../components/ModalHistorico'
import { Button, Input, Card, EstadoVazio, Spinner } from '../components/ui'
import { formatarMoeda, formatarData, iniciais } from '../utils/format'

export default function Alunos() {
  const { alunos, carregando, criar, atualizar, remover } = useAlunos()
  const { toast } = useToast()

  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState(null)
  const [alunoHistorico, setAlunoHistorico] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return alunos
    return alunos.filter(
      (a) =>
        a.nome.toLowerCase().includes(termo) ||
        (a.telefone || '').includes(termo)
    )
  }, [alunos, busca])

  const abrirNovo = () => {
    setAlunoEditando(null)
    setModalAberto(true)
  }

  const abrirEdicao = (aluno) => {
    setAlunoEditando(aluno)
    setModalAberto(true)
  }

  const salvar = async (payload) => {
    setSalvando(true)
    try {
      if (alunoEditando) {
        await atualizar(alunoEditando.id, payload)
        toast('Aluno atualizado com sucesso.')
      } else {
        await criar(payload)
        toast('Aluno cadastrado com sucesso!')
      }
      setModalAberto(false)
    } catch (e) {
      toast(e.message || 'Erro ao salvar aluno.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (aluno) => {
    if (!window.confirm(`Excluir o aluno "${aluno.nome}"? Essa ação não pode ser desfeita.`))
      return
    try {
      await remover(aluno.id)
      toast('Aluno excluído.')
    } catch (e) {
      toast(e.message || 'Erro ao excluir aluno.', 'erro')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Alunos
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {alunos.length} aluno(s) cadastrado(s)
          </p>
        </div>
        <Button onClick={abrirNovo} variante="primario">
          <Plus className="h-4 w-4" />
          Novo aluno
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="pl-9"
        />
      </div>

      {carregando ? (
        <Spinner />
      ) : filtrados.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={Users}
            titulo={busca ? 'Nenhum resultado' : 'Nenhum aluno cadastrado'}
            descricao={
              busca
                ? 'Tente buscar por outro nome ou telefone.'
                : 'Cadastre o primeiro aluno para começar.'
            }
            acao={
              !busca && (
                <Button onClick={abrirNovo}>
                  <Plus className="h-4 w-4" /> Cadastrar aluno
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtrados.map((aluno) => (
              <li
                key={aluno.id}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                  {iniciais(aluno.nome)}
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => setAlunoHistorico(aluno)}
                    className="block w-full truncate text-left font-semibold text-zinc-900 transition hover:text-primary-600 dark:text-zinc-100 dark:hover:text-primary-400"
                    title="Ver histórico do aluno"
                  >
                    {aluno.nome}
                  </button>
                  <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {aluno.telefone ? (
                      <>
                        <Phone className="h-3 w-3" />
                        {aluno.telefone}
                      </>
                    ) : (
                      'Sem telefone'
                    )}
                    <span className="mx-1">·</span>
                    {formatarMoeda(aluno.plano_valor)}
                    <span className="mx-1">·</span>
                    Vence {formatarData(aluno.data_vencimento)}
                  </p>
                </div>
                <StatusBadge status={aluno.status_pagamento} compacto />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setAlunoHistorico(aluno)}
                    className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    title="Histórico do aluno"
                  >
                    <History className="h-4 w-4" />
                  </button>
                  <Link
                    to={`/treinos?aluno=${aluno.id}`}
                    className="rounded-lg p-2 text-primary-600 transition hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950"
                    title="Ficha de treino"
                  >
                    <Dumbbell className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => abrirEdicao(aluno)}
                    className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => excluir(aluno)}
                    className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        aberto={modalAberto}
        titulo={alunoEditando ? 'Editar aluno' : 'Novo aluno'}
        onFechar={() => setModalAberto(false)}
      >
        <FormAluno
          inicial={alunoEditando}
          salvando={salvando}
          onSalvar={salvar}
          onCancelar={() => setModalAberto(false)}
        />
      </Modal>

      {alunoHistorico && (
        <ModalHistorico
          aluno={alunoHistorico}
          onFechar={() => setAlunoHistorico(null)}
        />
      )}
    </div>
  )
}