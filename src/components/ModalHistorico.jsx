// =====================================================================
// Histórico detalhado do aluno — abre quando o treinador toca no nome do
// aluno. Reúne:
//   · KPIs rápidos (check-ins no ano, treinos concluídos, média de PSE)
//   · Gráfico de frequência de check-ins individual (Semanal/Mensal/Anual)
//   · Evolução do PSE (últimos 14 treinos concluídos)
//   · Histórico de treinos concluídos (PSE, duração e observações)
// =====================================================================
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  Gauge,
  Timer,
  MessageSquare,
  TrendingUp,
  BarChart3,
  History,
  HeartPulse
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Modal } from './Modal'
import { Card, EstadoVazio, Spinner } from './ui'
import { StatusBadge } from './StatusBadge'
import { GraficoBarras, GraficoLinhaPse, GraficoLinhaBpm, SeletorPeriodo } from './Graficos'
import {
  ORDEM_DIAS,
  ROTULOS_DIAS,
  MESES_ROTULO,
  agregarSemanal,
  agregarMensal,
  agregarAnual
} from '../utils/frequencia'
import { formatarDataHora, formatarMoeda, iniciais } from '../utils/format'

// Cor e rótulo do PSE para leitura rápida do treinador
const pseEstilo = (valor) => {
  if (valor <= 2)
    return { cor: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300', rotulo: 'Muito leve' }
  if (valor <= 4)
    return { cor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', rotulo: 'Leve' }
  if (valor <= 6)
    return { cor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', rotulo: 'Moderado' }
  if (valor <= 8)
    return { cor: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', rotulo: 'Intenso' }
  return { cor: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', rotulo: 'Máximo' }
}

// Formata segundos como "1h 23min" / "45min 10s" / "10s"
const formatarDuracao = (segundos) => {
  if (segundos == null) return '—'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

export default function ModalHistorico({ aluno, onFechar }) {
  const [checkins, setCheckins] = useState([])
  const [historicos, setHistoricos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [periodo, setPeriodo] = useState('semanal')
  const [periodoBpm, setPeriodoBpm] = useState('semanal')

  // Busca os dados do aluno ao abrir o modal
  useEffect(() => {
    if (!aluno) return
    let ativo = true
    setCarregando(true)
    setPeriodo('semanal')
    setCheckins([])
    setHistoricos([])
    const inicioAno = new Date()
    inicioAno.setMonth(0, 1)
    inicioAno.setHours(0, 0, 0, 0)
    const pCheckins = supabase
      .from('checkins')
      .select('id, data_hora')
      .eq('aluno_id', aluno.id)
      .gte('data_hora', inicioAno.toISOString())
      .order('data_hora', { ascending: true })
    const pHistoricos = supabase
      .from('historico_treinos')
      .select('*')
      .eq('aluno_id', aluno.id)
      .order('data', { ascending: true })
    Promise.all([pCheckins, pHistoricos])
      .then(([r1, r2]) => {
        if (!ativo) return
        setCheckins(r1.error ? [] : (r1.data || []))
        setHistoricos(r2.error ? [] : (r2.data || []))
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aluno?.id])

  // ----- Frequência de check-ins (Semanal / Mensal / Anual) -----
  const frequencia = useMemo(
    () => ({
      semanal: agregarSemanal(checkins, (c) => c.data_hora),
      mensal: agregarMensal(checkins, (c) => c.data_hora),
      anual: agregarAnual(checkins, (c) => c.data_hora)
    }),
    [checkins]
  )

  const itensFrequencia = useMemo(() => {
    if (periodo === 'semanal') {
      return ORDEM_DIAS.map((diaIdx, i) => ({
        rotulo: ROTULOS_DIAS[i],
        valor: frequencia.semanal.valores[diaIdx],
        cor: diaIdx === new Date().getDay() ? 'bg-primary-600' : 'bg-primary-500'
      }))
    }
    if (periodo === 'mensal') {
      return frequencia.mensal.valores.map((v, i) => ({
        rotulo: `Sem ${i + 1}`,
        valor: v,
        cor: 'bg-emerald-500'
      }))
    }
    return frequencia.anual.valores.map((v, i) => ({
      rotulo: MESES_ROTULO[i],
      valor: v,
      cor: 'bg-primary-500'
    }))
  }, [periodo, frequencia])

  const totalPeriodo = itensFrequencia.reduce((s, i) => s + i.valor, 0)

  // ----- Evolução do PSE (últimos 14 treinos com nota) -----
  const pseSerie = useMemo(() => {
    const pontos = historicos.filter((h) => h.pse != null).slice(-14)
    if (pontos.length === 0) return null
    const media = pontos.reduce((s, h) => s + Number(h.pse), 0) / pontos.length
    return { pontos, media }
  }, [historicos])

  const mediaPseGeral = useMemo(() => {
    const comPse = historicos.filter((h) => h.pse != null)
    if (comPse.length === 0) return null
    return comPse.reduce((s, h) => s + Number(h.pse), 0) / comPse.length
  }, [historicos])

  // ----- Evolução da FC média (BPM) por período -----
  const bpmSerie = useMemo(() => {
    const agora = new Date()
    const inicio = (() => {
      if (periodoBpm === 'semanal') {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        const dia = (d.getDay() + 6) % 7 // segunda = 0
        d.setDate(d.getDate() - dia)
        return d
      }
      if (periodoBpm === 'mensal') return new Date(agora.getFullYear(), agora.getMonth(), 1)
      return new Date(agora.getFullYear(), 0, 1)
    })()

    const pontos = historicos.filter(
      (h) => h.bpm_medio != null && new Date(h.data) >= inicio
    )
    if (pontos.length === 0) return null
    const media = Math.round(
      pontos.reduce((s, h) => s + Number(h.bpm_medio), 0) / pontos.length
    )
    const ultimo = Number(pontos[pontos.length - 1].bpm_medio)
    return {
      pontos: pontos.map((p) => ({ data: p.data, bpm: Number(p.bpm_medio) })),
      media,
      ultimo
    }
  }, [historicos, periodoBpm])

  return (
    <Modal
      aberto={!!aluno}
      titulo={aluno ? `Histórico · ${aluno.nome}` : ''}
      onFechar={onFechar}
      largura="max-w-3xl"
    >
      {aluno && (
        <div className="space-y-4">
          {/* Cabeçalho do aluno */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              {iniciais(aluno.nome)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-zinc-900 dark:text-zinc-100">
                {aluno.nome}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {aluno.telefone || 'Sem telefone'}
                <span className="mx-1">·</span>
                {formatarMoeda(aluno.plano_valor)}
              </p>
            </div>
            <StatusBadge status={aluno.status_pagamento} compacto />
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <CalendarCheck className="mx-auto h-4 w-4 text-sky-500" />
              <p className="mt-1 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {carregando ? '—' : frequencia.anual.total}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                check-ins no ano
              </p>
            </Card>
            <Card className="p-3 text-center">
              <History className="mx-auto h-4 w-4 text-primary-500" />
              <p className="mt-1 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {carregando ? '—' : historicos.length}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                treinos concluídos
              </p>
            </Card>
            <Card className="p-3 text-center">
              <Gauge className="mx-auto h-4 w-4 text-amber-500" />
              <p className="mt-1 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {carregando || mediaPseGeral === null ? '—' : mediaPseGeral.toFixed(1)}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                média de PSE
              </p>
            </Card>
          </div>

          {/* Frequência individual de check-ins */}
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary-600" />
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                  Frequência de check-ins
                </h3>
              </div>
              <SeletorPeriodo valor={periodo} onChange={setPeriodo} />
            </div>
            <p className="mb-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {totalPeriodo} check-in(s) no período selecionado
            </p>
            {carregando ? (
              <Spinner />
            ) : totalPeriodo === 0 ? (
              <EstadoVazio
                icone={CalendarCheck}
                titulo="Nenhum check-in no período"
                descricao="Os registros de presença deste aluno aparecerão aqui."
              />
            ) : (
              <GraficoBarras itens={itensFrequencia} />
            )}
          </Card>

          {/* Evolução do PSE */}
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-600" />
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                Evolução do PSE
              </h3>
            </div>
            {carregando ? (
              <Spinner />
            ) : pseSerie ? (
              <div>
                <div className="mb-3 flex items-center justify-center gap-6 text-center">
                  <div>
                    <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                      {pseSerie.media.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Média de esforço
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                      {pseSerie.pontos[pseSerie.pontos.length - 1].pse}/10
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Último treino
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                      {pseSerie.pontos.length}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Treinos na série
                    </p>
                  </div>
                </div>
                <GraficoLinhaPse pontos={pseSerie.pontos} />
              </div>
            ) : (
              <EstadoVazio
                icone={TrendingUp}
                titulo="Sem evolução de PSE ainda"
                descricao="Quando o aluno concluir treinos no Portal do Aluno, a evolução do esforço aparecerá aqui."
              />
            )}
          </Card>

          {/* Evolução da Frequência Cardíaca */}
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-rose-500" />
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                  Evolução da Frequência Cardíaca
                </h3>
              </div>
              <SeletorPeriodo valor={periodoBpm} onChange={setPeriodoBpm} />
            </div>
            {carregando ? (
              <Spinner />
            ) : bpmSerie ? (
              <div>
                <div className="mb-3 flex items-center justify-center gap-6 text-center">
                  <div>
                    <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                      {bpmSerie.media} bpm
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Média no período
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-rose-500 dark:text-rose-400">
                      {bpmSerie.ultimo} bpm
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Último treino
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                      {bpmSerie.pontos.length}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Treinos c/ medição
                    </p>
                  </div>
                </div>
                <GraficoLinhaBpm pontos={bpmSerie.pontos} />
              </div>
            ) : (
              <EstadoVazio
                icone={HeartPulse}
                titulo="Sem medições de FC"
                descricao="Quando o aluno treinar com o frequencímetro conectado ao Portal do Aluno, a FC média de cada treino aparecerá aqui."
              />
            )}
          </Card>

          {/* Histórico de treinos concluídos */}
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-primary-600" />
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                Histórico de treinos
              </h3>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {historicos.length}
              </span>
            </div>
            {carregando ? (
              <Spinner />
            ) : historicos.length === 0 ? (
              <EstadoVazio
                icone={Gauge}
                titulo="Nenhum treino concluído"
                descricao="Os treinos finalizados com o cronômetro do Portal do Aluno aparecerão aqui."
              />
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {historicos
                  .slice()
                  .reverse()
                  .map((h) => {
                    const estiloPse = pseEstilo(h.pse)
                    return (
                      <li
                        key={h.id}
                        className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {formatarDataHora(h.data)}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {h.tempo_segundos != null ? (
                              <span className="inline-flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {formatarDuracao(h.tempo_segundos)}
                              </span>
                            ) : (
                              '—'
                            )}
                            {h.bpm_medio != null && (
                              <span className="ml-2 inline-flex items-center gap-1">
                                <HeartPulse className="h-3 w-3 text-rose-500" />
                                {h.bpm_medio} bpm
                                {h.bpm_max != null && (
                                  <span className="text-zinc-400 dark:text-zinc-500">
                                    ({h.bpm_min}–{h.bpm_max})
                                  </span>
                                )}
                              </span>
                            )}
                          </p>
                        </div>
                        {h.pse != null && (
                          <span
                            className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-extrabold ${estiloPse.cor}`}
                            title={estiloPse.rotulo}
                          >
                            PSE {h.pse}/10 · {estiloPse.rotulo}
                          </span>
                        )}
                        {h.observacoes && (
                          <div className="w-full rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 sm:max-w-xs dark:bg-zinc-800/60 dark:text-zinc-300">
                            <MessageSquare className="mr-1 inline h-3.5 w-3.5 text-zinc-400" />
                            {h.observacoes}
                          </div>
                        )}
                      </li>
                    )
                  })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </Modal>
  )
}