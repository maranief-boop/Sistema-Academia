// =====================================================================
// Módulo de Treinos — ficha por aluno dividida por dias (A, B, C, D)
// • Exercícios: nome (com busca inteligente), séries, repetições, carga
//   e link de vídeo explicativo.
// • Cada card (Treino A/B/C/D) tem caixinhas dos dias da semana para o
//   treinador marcar em quais dias aquele treino será feito. O Portal do
//   Aluno mostra então o "Treino de Hoje".
// • Restrições são globais (do aluno). Macrociclo de 12 semanas opcional.
// =====================================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus,
  Pencil,
  Trash2,
  Dumbbell,
  ChevronDown,
  PlayCircle,
  CalendarDays,
  HeartPulse,
  Save,
  ListTree,
  Info,
  Timer
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAlunos } from '../hooks/useAlunos'
import { useTreinos } from '../hooks/useTreinos'
import { useMacrociclo } from '../hooks/useMacrociclo'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { Button, Input, Label, Select, Card, EstadoVazio, Spinner } from '../components/ui'

const DIAS_FICHA = ['A', 'B', 'C', 'D']

const DIAS_SEMANA = [
  { nome: 'Segunda', abreviado: 'Seg' },
  { nome: 'Terça', abreviado: 'Ter' },
  { nome: 'Quarta', abreviado: 'Qua' },
  { nome: 'Quinta', abreviado: 'Qui' },
  { nome: 'Sexta', abreviado: 'Sex' },
  { nome: 'Sábado', abreviado: 'Sáb' },
  { nome: 'Domingo', abreviado: 'Dom' }
]

const EXERCICIO_VAZIO = {
  nome: '',
  series: 3,
  repeticoes: '10',
  carga: '',
  url_video: '',
  descanso: 60
}

export default function Treinos() {
  const { alunos, carregando: carregandoAlunos } = useAlunos()
  const { treinos, carregarTreinos, salvarDia, salvarFicha, removerDia } =
    useTreinos()
  const { dados: macroDados, carregar: carregarMacro, salvar: salvarMacro, SEMANAS_VAZIAS } =
    useMacrociclo()
  const { toast } = useToast()

  const [parametros, setParametros] = useSearchParams()
  const alunoId = parametros.get('aluno') || ''

  // Modal de exercício
  const [modal, setModal] = useState(null) // { dia, indice?, exercicio? }

  // Restrições (globais do aluno)
  const [restricoes, setRestricoes] = useState('')
  const [salvandoFicha, setSalvandoFicha] = useState(false)

  // Dias da semana por card de treino (ex.: { A: ['Segunda','Quinta'], ... })
  const [diasPorTreino, setDiasPorTreino] = useState(
    Object.fromEntries(DIAS_FICHA.map((d) => [d, []]))
  )
  // Descanso padrão (segundos) por card de treino — aplicado a todos os
  // exercícios do dia, podendo ser sobrescrito exercício a exercício.
  const [descansoPadrao, setDescansoPadrao] = useState(
    Object.fromEntries(DIAS_FICHA.map((d) => [d, 60]))
  )
  const [fichaInicializada, setFichaInicializada] = useState('')
  // Aluno cujos treinos já terminaram de carregar (evita inicializar o
  // estado com `treinos` ainda vazio e travar a leitura dos dias salvos)
  const [treinosAluno, setTreinosAluno] = useState('')

  // Macrociclo (12 semanas)
  const [modalMacro, setModalMacro] = useState(false)
  const [semanas, setSemanas] = useState(SEMANAS_VAZIAS)
  const [salvandoMacro, setSalvandoMacro] = useState(false)
  const [macrolInicializado, setMacrolInicializado] = useState('')

  useEffect(() => {
    if (alunoId) {
      setTreinosAluno('')
      carregarTreinos(alunoId).then(() => setTreinosAluno(alunoId))
    } else {
      carregarTreinos(null)
      setTreinosAluno('')
    }
  }, [alunoId, carregarTreinos])

  // Inicializa restrições + dias por card a partir do banco (por aluno).
  // Só roda DEPOIS que os treinos do aluno terminaram de carregar, para
  // não travar `fichaInicializada` com `treinos` ainda vazio (o que fazia
  // os dias marcados somer ao recarregar a página).
  useEffect(() => {
    if (alunoId && treinosAluno === alunoId && fichaInicializada !== alunoId) {
      const mapa = {}
      const mapaDescanso = {}
      DIAS_FICHA.forEach((d) => {
        const t = treinos.find((tt) => tt.dia_semana === d)
        mapa[d] = (t?.dias_semana || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        mapaDescanso[d] =
          t?.descanso_padrao != null ? t.descanso_padrao : 60
      })
      setDiasPorTreino(mapa)
      setDescansoPadrao(mapaDescanso)
      setRestricoes(treinos[0]?.restricoes || '')
      setFichaInicializada(alunoId)
    }
  }, [alunoId, treinos, treinosAluno, fichaInicializada])

  // Carrega o macrociclo do aluno
  useEffect(() => {
    if (alunoId && macrolInicializado !== alunoId) {
      carregarMacro(alunoId).then((d) => {
        if (d?.semanas_json?.length) {
          setSemanas(
            SEMANAS_VAZIAS.map((base, i) => ({ ...base, ...(d.semanas_json[i] || {}) }))
          )
        } else {
          setSemanas(SEMANAS_VAZIAS)
        }
      })
      setMacrolInicializado(alunoId)
    }
  }, [alunoId, carregarMacro, SEMANAS_VAZIAS, macrolInicializado])

  const aluno = useMemo(
    () => alunos.find((a) => a.id === alunoId) || null,
    [alunos, alunoId]
  )

  const listaExercicios = (dia) => {
    const treino = treinos.find((t) => t.dia_semana === dia)
    return treino ? treino.exercicios_json || [] : []
  }

  // ----- Salvar restrições (global) -----
  const salvarDadosFicha = async () => {
    if (!alunoId) {
      toast('Selecione um aluno primeiro.', 'aviso')
      return
    }
    setSalvandoFicha(true)
    try {
      await salvarFicha(alunoId, {
        restricoes: restricoes.trim()
      })
      toast('Restrições salvas.')
    } catch (e) {
      toast(e.message || 'Erro ao salvar a ficha.', 'erro')
    } finally {
      setSalvandoFicha(false)
    }
  }

  // ----- Alternar dia da semana de um card de treino -----
  const alternarDiaTreino = async (dia, diaSemana) => {
    if (!alunoId) {
      toast('Selecione um aluno primeiro.', 'aviso')
      return
    }
    const atual = diasPorTreino[dia] || []
    const novos = atual.includes(diaSemana)
      ? atual.filter((d) => d !== diaSemana)
      : [...atual, diaSemana]
    setDiasPorTreino((prev) => ({ ...prev, [dia]: novos }))
    try {
      const exercicios = listaExercicios(dia)
      const treino = treinos.find((t) => t.dia_semana === dia)
      if (novos.length === 0 && exercicios.length === 0 && treino) {
        await removerDia(treino.id)
      } else {
        await salvarDia(alunoId, dia, exercicios, {
          dias_semana: novos.join(', '),
          restricoes: restricoes.trim(),
          descanso_padrao: Number(descansoPadrao[dia]) || 0
        })
      }
      toast(`Treino ${dia}: ${novos.length ? novos.join(', ') : 'sem dias marcados'}`)
    } catch (e) {
      setDiasPorTreino((prev) => ({ ...prev, [dia]: atual }))
      toast(e.message || 'Erro ao salvar os dias.', 'erro')
    }
  }

  // ----- Descanso padrão do dia (aplicado a todos os exercícios) -----
  const salvarDescansoPadrao = async (dia, valor) => {
    if (!alunoId) {
      toast('Selecione um aluno primeiro.', 'aviso')
      return
    }
    const v = Math.max(0, Number(valor) || 0)
    setDescansoPadrao((prev) => ({ ...prev, [dia]: v }))
    try {
      await salvarDia(alunoId, dia, listaExercicios(dia), {
        dias_semana: (diasPorTreino[dia] || []).join(', '),
        restricoes: restricoes.trim(),
        descanso_padrao: v
      })
      toast(`Descanso padrão do Treino ${dia}: ${v}s`)
    } catch (e) {
      toast(e.message || 'Erro ao salvar o descanso.', 'erro')
    }
  }

  // ----- Persistência de exercícios -----
  const persistir = async (dia, exercicios) => {
    if (exercicios.length === 0) {
      const treino = treinos.find((t) => t.dia_semana === dia)
      const temDias = (diasPorTreino[dia] || []).length > 0
      if (treino && !temDias) {
        await removerDia(treino.id)
      } else if (treino) {
        await salvarDia(alunoId, dia, [], {
          dias_semana: diasPorTreino[dia].join(', '),
          restricoes: restricoes.trim(),
          descanso_padrao: Number(descansoPadrao[dia]) || 0
        })
      }
    } else {
      await salvarDia(alunoId, dia, exercicios, {
        dias_semana: (diasPorTreino[dia] || []).join(', '),
        restricoes: restricoes.trim(),
        descanso_padrao: Number(descansoPadrao[dia]) || 0
      })
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

  // ----- Macrociclo -----
  const salvarMacrociclo = async () => {
    if (!alunoId) {
      toast('Selecione um aluno primeiro.', 'aviso')
      return
    }
    const preenchidas = semanas.filter(
      (s) => s.foco || s.volume || s.intensidade || s.obs
    )
    setSalvandoMacro(true)
    try {
      await salvarMacro(alunoId, preenchidas)
      toast(`Macrociclo salvo (${preenchidas.length} semana(s) preenchidas).`)
      setModalMacro(false)
    } catch (e) {
      toast(e.message || 'Erro ao salvar o macrociclo. Verifique se a tabela macrociclo existe no Supabase.', 'erro')
    } finally {
      setSalvandoMacro(false)
    }
  }

  const setSemana = (semana, campo, valor) =>
    setSemanas((prev) =>
      prev.map((s) => (s.semana === semana ? { ...s, [campo]: valor } : s))
    )

  if (carregandoAlunos) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Ficha de Treino
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Marque os dias de cada treino (A, B, C, D) e monte os exercícios.
          </p>
        </div>
        <Button
          variante="secundario"
          tamanho="sm"
          onClick={() => {
            setSemanas(
              macroDados?.semanas_json?.length
                ? SEMANAS_VAZIAS.map((base, i) => ({
                    ...base,
                    ...(macroDados.semanas_json[i] || {})
                  }))
                : SEMANAS_VAZIAS
            )
            setModalMacro(true)
          }}
          disabled={!alunoId}
        >
          <ListTree className="h-4 w-4" />
          Macrociclo 12 semanas
        </Button>
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
          {/* ---------- Restrições (globais) ---------- */}
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-primary-600" />
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
                Restrições de movimento / Cuidados
              </h2>
            </div>
            <textarea
              value={restricoes}
              onChange={(e) => setRestricoes(e.target.value)}
              rows={2}
              placeholder="Ex.: Lesão no ombro direito, evitar carga no joelho..."
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-400">
                <Info className="mr-1 inline h-3.5 w-3.5" />
                Os dias da semana são marcados em cada card de treino abaixo.
              </p>
              <Button onClick={salvarDadosFicha} carregando={salvandoFicha} tamanho="sm">
                <Save className="h-3.5 w-3.5" />
                Salvar restrições
              </Button>
            </div>
          </Card>

          {/* ---------- Cards de treino (A, B, C, D) ---------- */}
          <div className="grid gap-4 md:grid-cols-2">
            {DIAS_FICHA.map((dia) => {
              const exercicios = listaExercicios(dia)
              const dias = diasPorTreino[dia] || []
              return (
                <Card key={dia} className="flex flex-col overflow-hidden">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/60">
                    <div className="flex items-center justify-between">
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
                            {dias.length > 0 && (
                              <span className="ml-1 font-semibold text-primary-600 dark:text-primary-400">
                                · {dias.join(', ')}
                              </span>
                            )}
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

                    {/* Caixinhas dos dias da semana */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {DIAS_SEMANA.map((d) => {
                        const ativo = dias.includes(d.nome)
                        return (
                          <button
                            key={d.nome}
                            type="button"
                            onClick={() => alternarDiaTreino(dia, d.nome)}
                            title={`Marcar ${d.nome} para o Treino ${dia}`}
                            className={`flex h-7 min-w-[34px] items-center justify-center rounded-lg px-1.5 text-[10px] font-bold transition ${
                              ativo
                                ? 'bg-primary-600 text-white shadow'
                                : 'bg-white text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-700 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {d.abreviado}
                          </button>
                        )
                      })}
                    </div>

                    {/* Descanso padrão do dia */}
                    <div className="mt-3 flex items-center gap-2">
                      <Timer className="h-3.5 w-3.5 text-zinc-400" />
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Descanso padrão
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={descansoPadrao[dia]}
                        onChange={(e) => salvarDescansoPadrao(dia, e.target.value)}
                        className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-right text-xs font-semibold text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        title="Tempo de repouso padrão entre as séries deste treino"
                      />
                      <span className="text-[10px] text-zinc-400">seg</span>
                    </div>
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
                              {ex.descanso ? ` · descanso ${ex.descanso}s` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {ex.url_video && (
                              <a
                                href={ex.url_video}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg p-2 text-primary-600 transition hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950"
                                title="Ver vídeo do exercício"
                              >
                                <PlayCircle className="h-4 w-4" />
                              </a>
                            )}
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
            os dias marcados em cada card aparecem como "Treino de Hoje" no Portal do Aluno.
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
            descansoPadrao={descansoPadrao[modal.dia]}
            onSalvar={salvarExercicio}
            onCancelar={() => setModal(null)}
          />
        )}
      </Modal>

      {/* ---------- Modal do Macrociclo (12 semanas) ---------- */}
      <Modal
        aberto={modalMacro}
        titulo="Macrociclo · 12 semanas"
        onFechar={() => setModalMacro(false)}
        largura="max-w-4xl"
      >
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Preencha o planejamento de cada semana. As semanas em branco são
            ignoradas ao salvar. O aluno verá o macrociclo no Portal dele.
          </p>
          {semanas.map((s) => (
            <div
              key={s.semana}
              className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-600 text-xs font-extrabold text-white">
                  {s.semana}
                </span>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Semana {s.semana}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="!text-[10px]">Foco</Label>
                  <Input
                    value={s.foco}
                    onChange={(e) => setSemana(s.semana, 'foco', e.target.value)}
                    placeholder="Ex.: Hipertrofia"
                    className="!py-1.5 !text-xs"
                  />
                </div>
                <div>
                  <Label className="!text-[10px]">Volume</Label>
                  <Input
                    value={s.volume}
                    onChange={(e) => setSemana(s.semana, 'volume', e.target.value)}
                    placeholder="Ex.: 3x10"
                    className="!py-1.5 !text-xs"
                  />
                </div>
                <div>
                  <Label className="!text-[10px]">Intensidade</Label>
                  <Input
                    value={s.intensidade}
                    onChange={(e) => setSemana(s.semana, 'intensidade', e.target.value)}
                    placeholder="Ex.: 70-75%"
                    className="!py-1.5 !text-xs"
                  />
                </div>
                <div>
                  <Label className="!text-[10px]">Obs.</Label>
                  <Input
                    value={s.obs}
                    onChange={(e) => setSemana(s.semana, 'obs', e.target.value)}
                    placeholder="Observações"
                    className="!py-1.5 !text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variante="fantasma" onClick={() => setModalMacro(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarMacrociclo} carregando={salvandoMacro}>
              <Save className="h-4 w-4" />
              Salvar macrociclo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---------- Formulário de exercício ----------
function FormExercicio({ inicial = null, onSalvar, onCancelar, descansoPadrao = 60 }) {
  const [form, setForm] = useState(
    inicial
      ? { ...EXERCICIO_VAZIO, ...inicial }
      : { ...EXERCICIO_VAZIO, descanso: descansoPadrao }
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
      carga: form.carga,
      descanso: Number(form.descanso) || 0,
      url_video: form.url_video.trim()
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <Label>Nome do exercício *</Label>
        <ComboboxExercicio
          valor={form.nome}
          onChange={(v) => set('nome', v)}
          placeholder="Digite ou escolha da base..."
        />
        <p className="mt-1.5 text-xs text-zinc-400">
          Sugestões da base de exercícios (tabela{' '}
          <code className="font-mono">exercicios_base</code>). Pode digitar
          qualquer nome — se não existir na base, será salvo normalmente.
        </p>
        {erros.nome && (
          <p className="mt-1 text-xs font-medium text-red-600">{erros.nome}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        <div>
          <Label>Descanso (s)</Label>
          <Input
            type="number"
            min="0"
            step="5"
            value={form.descanso}
            onChange={(e) => set('descanso', e.target.value)}
          />
          <p className="mt-1.5 text-xs text-zinc-400">
            Tempo de repouso entre séries (ex.: 60s). O aluno vê o cronômetro
            e o celular vibra ao terminar. Este valor vale só para este
            exercício — deixe em branco para herdar o descanso padrão do dia.
          </p>
        </div>
      </div>

      <div>
        <Label className="flex items-center gap-1.5">
          <PlayCircle className="h-3.5 w-3.5" />
          Link do vídeo explicativo (YouTube/Vimeo)
        </Label>
        <Input
          value={form.url_video}
          onChange={(e) => set('url_video', e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          inputMode="url"
        />
        <p className="mt-1.5 text-xs text-zinc-400">
          Opcional. O aluno verá o botão "Ver Vídeo" na ficha dele.
        </p>
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

// ---------- Combobox / Autocomplete (tabela exercicios_base) ----------
function ComboboxExercicio({ valor, onChange, placeholder }) {
  const [base, setBase] = useState([])
  const [aberto, setAberto] = useState(false)
  const [erroBase, setErroBase] = useState('')
  const [carregado, setCarregado] = useState(false)

  // Carrega a base de exercícios do Supabase (Musculação, Funcional, Corrida)
  const carregarBase = useCallback(async () => {
    setCarregado(false)
    setErroBase('')
    const { data, error } = await supabase
      .from('exercicios_base')
      .select('*')
      .limit(1000)
    if (error) {
      setErroBase(error.message)
      setBase([])
      setCarregado(true)
      return
    }
    // Normaliza nomes de coluna (aceita variações de schema)
    const normalizados = (data || [])
      .map((r) => ({
        nome: r.nome || r.exercicio || r.titulo || r.nome_exercicio || '',
        categoria: r.categoria || r.tipo || r.grupo || r.modalidade || ''
      }))
      .filter((x) => x.nome)
    setBase(normalizados)
    setCarregado(true)
  }, [])

  useEffect(() => {
    carregarBase()
  }, [carregarBase])

  const termo = valor.trim().toLowerCase()
  const filtradas = termo
    ? base
        .filter((e) => e.nome.toLowerCase().includes(termo))
        .slice(0, 8)
    : []

  return (
    <div className="relative">
      <Input
        value={valor}
        onChange={(e) => {
          onChange(e.target.value)
          setAberto(true)
        }}
        onFocus={() => {
          setAberto(true)
          if (!carregado) carregarBase()
        }}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        placeholder={placeholder}
        autoFocus
      />

      {aberto && erroBase && (
        <div className="mt-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          Base de exercícios indisponível: {erroBase}
        </div>
      )}

      {aberto && !erroBase && carregado && termo && filtradas.length === 0 && (
        <div className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          Nenhum exercício encontrado na base para "{valor}".
        </div>
      )}

      {aberto && filtradas.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
          {filtradas.map((e) => (
            <li key={e.nome}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(e.nome)
                  setAberto(false)
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-800 transition hover:bg-primary-50 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                <span className="truncate font-medium">{e.nome}</span>
                {e.categoria && (
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                    {e.categoria}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
