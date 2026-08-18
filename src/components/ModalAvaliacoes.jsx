// =====================================================================
// Avaliações Físicas do aluno — cadastro, edição e exclusão (Supabase)
// medidas_json: { "Peso": "72", "Altura": "1,75", "IMC": "23,5", ... }
// Campos com automatico=true são recalculados a partir de Peso,
// Altura e % Gordura quando os valores de origem mudam.
// =====================================================================
import { useEffect, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Stethoscope,
  CalendarDays,
  MessageSquare,
  Ruler,
  Save,
  X,
  Sparkles
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Modal } from './Modal'
import { Button, Card, Input, Label, Spinner, EstadoVazio } from './ui'
import { useToast } from './Toast'
import { dataParaInput } from '../utils/format'

// Campos padrão exibidos no formulário de avaliação
const CAMPOS_PADRAO = [
  { chave: 'Peso', unidade: 'kg', passo: '0.1', automatico: false },
  { chave: 'Altura', unidade: 'm', passo: '0.01', automatico: false },
  { chave: 'IMC', unidade: 'kg/m²', passo: '0.1', automatico: true },
  { chave: '% Gordura', unidade: '%', passo: '0.1', automatico: false },
  { chave: 'Massa Gorda', unidade: 'kg', passo: '0.1', automatico: true },
  { chave: 'Massa Magra', unidade: 'kg', passo: '0.1', automatico: true },
  { chave: 'Cintura', unidade: 'cm', passo: '0.1', automatico: false },
  { chave: 'Quadril', unidade: 'cm', passo: '0.1', automatico: false },
  { chave: 'Braço', unidade: 'cm', passo: '0.1', automatico: false },
  { chave: 'Coxa', unidade: 'cm', passo: '0.1', automatico: false }
]

// Converte "1,75" / "1.75" em número
const numero = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Recalcula IMC, Massa Gorda e Massa Magra a partir dos dados de origem
function calcularAutomaticas(medidas) {
  const peso = numero(medidas['Peso'])
  const altura = numero(medidas['Altura'])
  const gordura = numero(medidas['% Gordura'])
  const novas = { ...medidas }
  if (peso && altura) {
    novas['IMC'] = String((peso / (altura * altura)).toFixed(1)).replace('.', ',')
  } else {
    novas['IMC'] = ''
  }
  if (peso && gordura) {
    const mg = (peso * gordura) / 100
    novas['Massa Gorda'] = String(mg.toFixed(1)).replace('.', ',')
    novas['Massa Magra'] = String((peso - mg).toFixed(1)).replace('.', ',')
  } else {
    novas['Massa Gorda'] = ''
    novas['Massa Magra'] = ''
  }
  return novas
}

// Formata data "YYYY-MM-DD" sem deslocamento de fuso
const formatarDia = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

export default function ModalAvaliacoes({ aluno, onFechar }) {
  const { toast } = useToast()

  const [carregando, setCarregando] = useState(false)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [visao, setVisao] = useState('lista')
  const [avaliacaoEditando, setAvaliacaoEditando] = useState(null)
  const [data, setData] = useState('')
  const [medidas, setMedidas] = useState({})
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('aluno_id', aluno.id)
      .order('data', { ascending: false })
    if (error) toast(error.message || 'Erro ao carregar avaliações.', 'erro')
    if (!error) setAvaliacoes(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    if (aluno) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aluno?.id])

  const abrirNova = () => {
    setAvaliacaoEditando(null)
    setData(dataParaInput())
    setMedidas({})
    setObservacoes('')
    setVisao('formulario')
  }

  const abrirEdicao = (av) => {
    setAvaliacaoEditando(av)
    setData(av.data)
    setMedidas({ ...(av.medidas_json || {}) })
    setObservacoes(av.observacoes || '')
    setVisao('formulario')
  }

  const fecharFormulario = () => {
    setVisao('lista')
    setAvaliacaoEditando(null)
  }

  const alterarMedida = (chave, valor) => {
    setMedidas((prev) => {
      const proximas = { ...prev, [chave]: valor }
      return calcularAutomaticas(proximas)
    })
  }

  const salvar = async () => {
    if (!data) {
      toast('Informe a data da avaliação.', 'aviso')
      return
    }
    if (Object.values(medidas).filter((v) => v !== '' && v != null).length === 0) {
      toast('Informe ao menos uma medida.', 'aviso')
      return
    }
    setSalvando(true)
    try {
      const payload = {
        aluno_id: aluno.id,
        data,
        medidas_json: medidas,
        observacoes: observacoes.trim() || null
      }
      if (avaliacaoEditando) {
        const { error } = await supabase
          .from('avaliacoes')
          .update(payload)
          .eq('id', avaliacaoEditando.id)
        if (error) throw error
        toast('Avaliação atualizada com sucesso.')
      } else {
        const { error } = await supabase.from('avaliacoes').insert(payload)
        if (error) throw error
        toast('Avaliação cadastrada com sucesso!')
      }
      fecharFormulario()
      await carregar()
    } catch (e) {
      toast(e.message || 'Erro ao salvar avaliação.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (av) => {
    if (
      !window.confirm(
        `Excluir a avaliação de ${formatarDia(av.data)}? Essa ação não pode ser desfeita.`
      )
    )
      return
    const { error } = await supabase.from('avaliacoes').delete().eq('id', av.id)
    if (error) {
      toast(error.message || 'Erro ao excluir avaliação.', 'erro')
      return
    }
    toast('Avaliação excluída.')
    carregar()
  }

  return (
    <Modal
      aberto={!!aluno}
      titulo={aluno ? `Avaliação física · ${aluno.nome}` : ''}
      onFechar={onFechar}
      largura="max-w-3xl"
    >
      {aluno && (
        <div className="space-y-4">
          {visao === 'formulario' ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {avaliacaoEditando ? 'Editar avaliação' : 'Nova avaliação'}
                </h3>
                <Button variante="fantasma" tamanho="sm" onClick={fecharFormulario}>
                  <X className="h-4 w-4" /> Cancelar
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Data da avaliação</Label>
                  <Input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-primary-600" />
                  <Label className="mb-0">Medidas</Label>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {CAMPOS_PADRAO.map((campo) => {
                    const valor = medidas[campo.chave] || ''
                    return (
                      <div key={campo.chave}>
                        <Label>
                          {campo.chave}
                          {campo.automatico && (
                            <Sparkles className="ml-1 inline h-3 w-3 text-primary-500" />
                          )}
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="—"
                            value={valor}
                            disabled={campo.automatico}
                            onChange={(e) =>
                              alterarMedida(campo.chave, e.target.value)
                            }
                            className={`pr-10 ${
                              campo.automatico
                                ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500'
                                : ''
                            }`}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                            {campo.unidade}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Sparkles className="mr-1 inline h-3 w-3 text-primary-500" />
                  IMC, Massa Gorda e Massa Magra são calculados automaticamente a
                  partir de Peso, Altura e % Gordura.
                </p>
              </div>

              <div>
                <Label>Observações</Label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Evolução, restrições, recomendações..."
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variante="secundario" onClick={fecharFormulario}>
                  Cancelar
                </Button>
                <Button carregando={salvando} onClick={salvar}>
                  {!salvando && <Save className="h-4 w-4" />}
                  Salvar avaliação
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {avaliacoes.length} avaliação(ões) registrada(s)
                </p>
                <Button tamanho="sm" onClick={abrirNova}>
                  <Plus className="h-4 w-4" /> Nova avaliação
                </Button>
              </div>

              {carregando ? (
                <Spinner />
              ) : avaliacoes.length === 0 ? (
                <Card>
                  <EstadoVazio
                    icone={Stethoscope}
                    titulo="Nenhuma avaliação registrada"
                    descricao="Cadastre a primeira avaliação física deste aluno."
                    acao={
                      <Button onClick={abrirNova}>
                        <Plus className="h-4 w-4" /> Cadastrar avaliação
                      </Button>
                    }
                  />
                </Card>
              ) : (
                <ul className="space-y-3">
                  {avaliacoes.map((av) => {
                    const entradas = Object.entries(av.medidas_json || {}).filter(
                      ([, v]) => v !== '' && v != null
                    )
                    return (
                      <li
                        key={av.id}
                        className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-primary-600" />
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">
                              {formatarDia(av.data)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => abrirEdicao(av)}
                              className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              title="Editar avaliação"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => excluir(av)}
                              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950"
                              title="Excluir avaliação"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {entradas.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                            {entradas.map(([k, v]) => (
                              <div
                                key={k}
                                className="rounded-xl bg-zinc-50 px-3 py-2 text-center dark:bg-zinc-800/60"
                              >
                                <p className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                                  {String(v)}
                                </p>
                                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                  {k}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Nenhuma medida informada.
                          </p>
                        )}
                        {av.observacoes && (
                          <p className="mt-3 flex gap-1.5 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            {av.observacoes}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  )
}