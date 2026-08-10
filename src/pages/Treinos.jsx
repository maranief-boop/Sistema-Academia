// =====================================================================
// Módulo de Treinos — ficha por aluno dividida por dias (A, B, C, D)
// Exercícios: nome, séries, repetições e carga (persistidos no Supabase)
// =====================================================================
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Dumbbell, ChevronDown } from 'lucide-react'
import { useAlunos } from '../hooks/useAlunos'
import { useTreinos } from '../hooks/useTreinos'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { Button, Input, Label, Select, Card, EstadoVazio, Spinner } from '../components/ui'

const DIAS_FICHA = ['A', 'B', 'C', 'D']

const EXERCICIO_VAZIO = { nome: '', series: 3, repeticoes: '10', carga: '' }

export default function Treinos() {
  const { alunos, carregando: carregandoAlunos } = useAlunos()
  const { treinos, carregarTreinos, salvarDia, removerDia } = useTreinos()
  const { toast } = useToast()

  const [parametros, setParametros] = useSearchParams()
  const alunoId = parametros.get('aluno') || ''

  // Modal de exercício
  const [modal, setModal] = useState(null) // { dia, indice?, exercicio? }

  useEffect(() => {
    if (alunoId) carregarTreinos(alunoId)
    else carregarTreinos(null)
  }, [alunoId, carregarTreinos])

  const aluno = useMemo(
    () => alunos.find((a) => a.id === alunoId) || null,
    [alunos, alunoId]
  )

  const listaExercicios = (dia) => {
    const treino = treinos.find((t) => t.dia_semana === dia)
    return treino ? treino.exercicios_json || [] : []
  }

  // ----- Persistência de exercícios -----
  const persistir = async (dia, exercicios) => {
    if (exercicios.length === 0) {
      const treino = treinos.find((t) => t.dia_semana === dia)
      if (treino) await removerDia(treino.id)
    } else {
      await salvarDia(alunoId, dia, exercicios)
    }
  }

  const salvarExercicio = async (dados) => {
    if (!alunoId) {
      toast('Selecione um aluno primeiro.', 'aviso')
      return
    }
    try {
      const atual = [...listaExercicios(modal.dia)]
      if (modal.indice == null) atual.push(dados)
      else atual[modal.indice] = dados
      await persistir(modal.dia, atual)
      toast(
        modal.indice == null ? 'Exercício adicionado!' : 'Exercício atualizado.'
      )
      setModal(null)
    } catch (e) {
      toast(e.message || 'Erro ao salvar exercício.', 'erro')
    }
  }

  const excluirExercicio = async (dia, indice) => {
    try {
      const atual = listaExercicios(dia).filter((_, i) => i !== indice)
      await persistir(dia, atual)
      toast('Exercício removido.')
    } catch (e) {
      toast(e.message || 'Erro ao remover exercício.', 'erro')
    }
  }

  if (carregandoAlunos) return <Spinner />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Ficha de Treino
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Monstre os treinos do aluno por dia da semana (A, B, C...).
        </p>
      </div>

      {/* ---------- Seleção de aluno ---------- */}
      <div className="relative">
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Select
          value={alunoId}
          onChange={(e) => {
            const valor = e.target.value
            if (valor) setParametros({ aluno: valor }, { replace: true })
            else setParametros({}, { replace: true })
          }}
          className="appearance-none pr-9"
        >
          <option value="">Selecione um aluno...</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </Select>
      </div>

      {!aluno ? (
        <Card>
          <EstadoVazio
            icone={Dumbbell}
            titulo="Selecione um aluno"
            descricao="Escolha o aluno acima para montar ou visualizar a ficha de treino."
          />
        </Card>
      ) : (
        <>
          {/* ---------- Dias da ficha ---------- */}
          <div className="grid gap-4 md:grid-cols-2">
            {DIAS_FICHA.map((dia) => {
              const exercicios = listaExercicios(dia)
              return (
                <Card key={dia} className="flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/60">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-sm font-extrabold text-white shadow">
                        {dia}
                      </span>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          Treino {dia}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {exercicios.length} exercício(s)
                        </p>
                      </div>
                    </div>
                    <Button
                      variante="secundario"
                      tamanho="sm"
                      onClick={() => setModal({ dia, indice: null })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Exercício
                    </Button>
                  </div>

                  {exercicios.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                      Nenhum exercício ainda. Adicione o primeiro.
                    </p>
                  ) : (
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {exercicios.map((ex, indice) => (
                        <li key={indice} className="flex items-center gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                              {ex.nome}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {ex.series} séries · {ex.repeticoes} reps
                              {ex.carga ? ` · ${ex.carga}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() =>
                                setModal({ dia, indice, exercicio: ex })
                              }
                              className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => excluirExercicio(dia, indice)}
                              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950"
                              title="Remover"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )
            })}
          </div>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
            Ficha de treino de <span className="font-semibold">{aluno.nome}</span> —
            salva automaticamente no Supabase.
          </p>
        </>
      )}

      {/* ---------- Modal de exercício ---------- */}
      <Modal
        aberto={modal !== null}
        titulo={modal?.indice == null ? `Novo exercício · Treino ${modal?.dia}` : `Editar exercício · Treino ${modal?.dia}`}
        onFechar={() => setModal(null)}
      >
        {modal && (
          <FormExercicio
            inicial={modal.exercicio}
            onSalvar={salvarExercicio}
            onCancelar={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  )
}

// ---------- Formulário de exercício ----------
function FormExercicio({ inicial = null, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial ? { ...EXERCICIO_VAZIO, ...inicial } : EXERCICIO_VAZIO
  )
  const [erros, setErros] = useState({})

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const enviar = (ev) => {
    ev.preventDefault()
    if (!form.nome.trim()) {
      setErros({ nome: 'Informe o nome do exercício' })
      return
    }
    onSalvar({
      ...form,
      nome: form.nome.trim(),
      series: Number(form.series) || 0,
      repeticoes: form.repeticoes,
      carga: form.carga
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <Label>Nome do exercício *</Label>
        <Input
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Ex.: Supino reto com barra"
          autoFocus
        />
        {erros.nome && (
          <p className="mt-1 text-xs font-medium text-red-600">{erros.nome}</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Séries</Label>
          <Input
            type="number"
            min="1"
            value={form.series}
            onChange={(e) => set('series', e.target.value)}
          />
        </div>
        <div>
          <Label>Repetições</Label>
          <Input
            value={form.repeticoes}
            onChange={(e) => set('repeticoes', e.target.value)}
            placeholder="Ex.: 10 / 8-12"
          />
        </div>
        <div>
          <Label>Carga</Label>
          <Input
            value={form.carga}
            onChange={(e) => set('carga', e.target.value)}
            placeholder="Ex.: 30kg"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variante="secundario" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit">Salvar exercício</Button>
      </div>
    </form>
  )
}