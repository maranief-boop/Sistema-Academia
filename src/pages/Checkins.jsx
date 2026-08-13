// =====================================================================
// Módulo de Check-in e Frequência (retenção + inteligência de frequência)
// - Registra presença em tempo real no Supabase
// - Cruza os dias de treino (treinos.dias_semana) com os check-ins para
//   comparar "Alunos Esperados" vs "Check-ins Realizados" por dia da semana
// - Indicadores de adesão geral e destaque para alunos ausentes há dias
// =====================================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserX,
  ChevronRight,
  BarChart3,
  Target,
  TrendingUp,
  Activity,
  Gauge,
  Timer,
  MessageSquare
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAlunos } from '../hooks/useAlunos'
import { useCheckins } from '../hooks/useCheckins'
import { useTreinos } from '../hooks/useTreinos'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { Card, Input, EstadoVazio, Spinner, Button, Select } from '../components/ui'
import {
  formatarDataHora,
  formatarData,
  diasDesde,
  iniciais
} from '../utils/format'
import { mapaUltimoCheckin } from '../utils/metrics'

const LIMITE = 7

// Ordem de exibição (Segunda → Domingo) e rótulos curtos
const ORDEM = [1, 2, 3, 4, 5, 6, 0]
const ROTULOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// Mapeia nomes de dias (com/sem acento, abreviados) para índice JS (0=Dom)
const DIAS_NORMA = {
  dom: 0, domingo: 0,
  seg: 1, segunda: 1,
  ter: 2, 'terça': 2, terca: 2,
  qua: 3, quarta: 3,
  qui: 4, quinta: 4,
  sex: 5, sexta: 5,
  sab: 6, sábado: 6, sabado: 6
}

const normalizar = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

function parseDiasSemana(valor) {
  if (!valor) return []
  return valor
    .split(',')
    .map((p) => normalizar(p))
    .map((t) => {
      if (!t) return -1
      for (const k of Object.keys(DIAS_NORMA)) {
        if (t === k || t.startsWith(k)) return DIAS_NORMA[k]
      }
      return -1
    })
    .filter((d) => d >= 0)
}

export default function Checkins() {
  const { alunos, carregando: carregandoAlunos } = useAlunos()
  const {
    checkins,
    carregando: carregandoCheckins,
    carregarCheckins,
    registrarCheckin,
    fezCheckinHoje
  } = useCheckins()
  const { carregarTodos } = useTreinos()
  const { toast } = useToast()

  const [modalAberto, setModalAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [registrando, setRegistrando] = useState(null)
  const [treinosTodos, setTreinosTodos] = useState([])

  useEffect(() => {
    carregarCheckins()
    carregarTodos().then(setTreinosTodos)
  }, [carregarCheckins, carregarTodos])

  // ----- Feedback pós-treino (historico_treinos: PSE + observações) -----
  const [historicos, setHistoricos] = useState([])
  const [carregandoHistoricos, setCarregandoHistoricos] = useState(false)
  const [filtroAlunoHistorico, setFiltroAlunoHistorico] = useState('')

  const carregarHistoricos = useCallback(async () => {
    setCarregandoHistoricos(true)
    try {
      const { data, error } = await supabase
        .from('historico_treinos')
        .select('*')
        .order('data', { ascending: false })
        .limit(200)
      if (error) throw error
      setHistoricos(data || [])
    } catch (e) {
      toast(e?.message || 'Erro ao carregar o feedback dos treinos.', 'erro')
    } finally {
      setCarregandoHistoricos(false)
    }
  }, [toast])

  useEffect(() => {
    carregarHistoricos()
  }, [carregarHistoricos])

  // Formata segundos como "1h 23min" ou "45min 10s"
  const formatarDuracao = (segundos) => {
    if (segundos == null) return '—'
    const h = Math.floor(segundos / 3600)
    const m = Math.floor((segundos % 3600) / 60)
    const s = segundos % 60
    if (h > 0) return `${h}h ${m}min`
    if (m > 0) return `${m}min ${s}s`
    return `${s}s`
  }

  // Cor e rótulo do PSE para facilitar a leitura pelo treinador
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

  const historicosExibidos = useMemo(() => {
    if (!filtroAlunoHistorico) return historicos
    return historicos.filter((h) => h.aluno_id === filtroAlunoHistorico)
  }, [historicos, filtroAlunoHistorico])

  // ----- Alunos que não treinam há 7+ dias -----
  const ausentes = useMemo(() => {
    const ultimo = mapaUltimoCheckin(checkins)
    return alunos
      .map((a) => {
        const ultimoCheck = ultimo[a.id]
        const atraso = ultimoCheck ? diasDesde(ultimoCheck) : diasDesde(a.created_at)
        return { aluno: a, atraso }
      })
      .filter((x) => x.atraso >= LIMITE)
      .sort((x, y) => y.atraso - x.atraso)
  }, [alunos, checkins])

  // ----- Cruzamento: dias de treino (esperado) x check-ins (realizado) -----
  const frequencia = useMemo(() => {
    // Esperado por dia: união dos dias de treino de cada aluno
    const diasPorAluno = {}
    treinosTodos.forEach((t) => {
      const dias = parseDiasSemana(t.dias_semana)
      dias.forEach((d) => {
        ;(diasPorAluno[t.aluno_id] ||= new Set()).add(d)
      })
    })
    const esperadosPorDia = Array(7).fill(0)
    Object.values(diasPorAluno).forEach((set) =>
      set.forEach((d) => (esperadosPorDia[d] += 1))
    )

    // Realizado por dia: distribuição dos check-ins carregados
    const realizadosPorDia = Array(7).fill(0)
    checkins.forEach((c) => {
      realizadosPorDia[new Date(c.data_hora).getDay()] += 1
    })

    const hojeIdx = new Date().getDay()
    const esperadosHoje = esperadosPorDia[hojeIdx]
    const checkinsHoje = checkins.filter(
      (c) => new Date(c.data_hora).toDateString() === new Date().toDateString()
    ).length

    // Adesão geral (alunos que treinaram nos últimos 7 dias)
    const ultimo = mapaUltimoCheckin(checkins)
    const treinaram7 = alunos.filter((a) => {
      const u = ultimo[a.id]
      return u ? diasDesde(u) < LIMITE : diasDesde(a.created_at) < LIMITE
    }).length
    const adesao = alunos.length ? Math.round((treinaram7 / alunos.length) * 100) : 0

    // Meta semanal: realizados nos últimos 7 dias / esperados em uma semana típica
    const esperadosSemana = esperadosPorDia.reduce((s, v) => s + v, 0)
    const realizados7 = checkins.filter(
      (c) => diasDesde(c.data_hora) >= 0 && diasDesde(c.data_hora) < LIMITE
    ).length
    const cumprimento = esperadosSemana
      ? Math.min(100, Math.round((realizados7 / esperadosSemana) * 100))
      : 0

    return {
      esperadosPorDia,
      realizadosPorDia,
      esperadosHoje,
      checkinsHoje,
      adesao,
      esperadosSemana,
      realizados7,
      cumprimento,
      comPlano: Object.keys(diasPorAluno).length
    }
  }, [alunos, checkins, treinosTodos])

  const maximoGrafico = Math.max(
    ...frequencia.esperadosPorDia,
    ...frequencia.realizadosPorDia,
    1
  )

  const alunosBuscados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return alunos
    return alunos.filter((a) => a.nome.toLowerCase().includes(termo))
  }, [alunos, busca])

  // ----- Registro de presença -----
  const registrar = async (aluno) => {
    if (fezCheckinHoje(aluno.id)) {
      toast(`${aluno.nome} já fez check-in hoje.`, 'aviso')
      return
    }
    setRegistrando(aluno.id)
    try {
      await registrarCheckin(aluno.id)
      toast(`Check-in de ${aluno.nome} registrado! 💪`)
      setModalAberto(false)
      setBusca('')
    } catch (e) {
      toast(e.message || 'Erro ao registrar check-in.', 'erro')
    } finally {
      setRegistrando(null)
    }
  }

  if (carregandoAlunos || carregandoCheckins) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Check-in e Frequência
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Registre a presença e acompanhe a inteligência de frequência dos alunos.
          </p>
        </div>
        <Button
          onClick={() => setModalAberto(true)}
          className="!px-6 !py-3 !text-base"
        >
          <CalendarCheck className="h-5 w-5" />
          Fazer check-in
        </Button>
      </div>

      {/* ---------- KPIs de frequência geral ---------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Adesão (7 dias)
            </p>
            <Activity className="h-4 w-4 text-primary-600" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {frequencia.adesao}%
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            alunos que treinaram na semana
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Esperados hoje
            </p>
            <Target className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {frequencia.esperadosHoje}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            com treino marcado p/ hoje
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Check-ins hoje
            </p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {frequencia.checkinsHoje}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            presenças registradas
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Meta semanal
            </p>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {frequencia.cumprimento}%
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {frequencia.realizados7}/{frequencia.esperadosSemana} esperados
          </p>
        </Card>
      </div>

      {/* ---------- Gráfico: Esperado x Realizado por dia da semana ---------- */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary-600" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
              Esperado vs. Realizado por dia
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary-500" />
              Esperado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-yellow-400" />
              Realizado
            </span>
          </div>
        </div>

        {frequencia.comPlano === 0 ? (
          <EstadoVazio
            titulo="Sem dias de treino cadastrados"
            descricao="Defina os dias de treino dos alunos na ficha de Treinos para projetar os alunos esperados."
            icone={BarChart3}
          />
        ) : (
          <div className="flex h-44 items-end gap-1.5">
            {ORDEM.map((diaIdx) => {
              const esp = frequencia.esperadosPorDia[diaIdx]
              const real = frequencia.realizadosPorDia[diaIdx]
              const isHoje = diaIdx === new Date().getDay()
              return (
                <div
                  key={diaIdx}
                  className={`flex flex-1 flex-col items-center gap-1 ${
                    isHoje ? 'rounded-lg bg-primary-50 px-0.5 py-1 dark:bg-primary-950/40' : ''
                  }`}
                >
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    <div className="flex w-3 flex-col items-center justify-end">
                      <span className="mb-0.5 text-[10px] font-semibold text-primary-600">
                        {esp || ''}
                      </span>
                      <div
                        className="w-full rounded-t bg-primary-500 transition-all"
                        style={{
                          height: `${(esp / maximoGrafico) * 100}%`,
                          minHeight: esp ? 3 : 0
                        }}
                        title={`Esperado (${ROTULOS[ORDEM.indexOf(diaIdx)]}): ${esp}`}
                      />
                    </div>
                    <div className="flex w-3 flex-col items-center justify-end">
                      <span className="mb-0.5 text-[10px] font-semibold text-emerald-600">
                        {real || ''}
                      </span>
                      <div
                        className="w-full rounded-t bg-yellow-400 transition-all"
                        style={{
                          height: `${(real / maximoGrafico) * 100}%`,
                          minHeight: real ? 3 : 0
                        }}
                        title={`Realizado (${ROTULOS[ORDEM.indexOf(diaIdx)]}): ${real}`}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-[10px] ${
                      isHoje
                        ? 'font-bold text-primary-700 dark:text-primary-300'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {ROTULOS[ORDEM.indexOf(diaIdx)]}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ---------- Alerta de evasão (destaque para ausentes) ---------- */}
      {ausentes.length > 0 && (
        <Card className="border-l-4 border-l-red-500 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-red-100 p-2 text-red-700 dark:bg-red-950 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                {ausentes.length} aluno(s) ausente(s) há mais de {LIMITE} dias
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Priorize a recuperação: chame esses alunos no WhatsApp para evitar a evasão.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ausentes.slice(0, 6).map(({ aluno, atraso }) => (
                  <Link
                    key={aluno.id}
                    to={`/financeiro`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-200 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
                  >
                    <UserX className="h-3 w-3" />
                    {aluno.nome}
                    <span className="opacity-70">· {atraso}d</span>
                  </Link>
                ))}
                {ausentes.length > 6 && (
                  <span className="px-2 py-1 text-xs text-zinc-500">
                    +{ausentes.length - 6} outros
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------- Últimos check-ins ---------- */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary-600" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
              Últimos registros
            </h2>
          </div>
          {checkins.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum check-in ainda"
              descricao="Registre a primeira presença de hoje."
              icone={CalendarCheck}
            />
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {checkins.slice(0, 20).map((c) => {
                const aluno = alunos.find((a) => a.id === c.aluno_id)
                if (!aluno) return null
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                      {iniciais(aluno.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {aluno.nome}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatarDataHora(c.data_hora)}
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* ---------- Situação dos alunos (destaque de ausência) ---------- */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary-600" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
              Situação dos alunos
            </h2>
          </div>
          {alunos.length === 0 ? (
            <EstadoVazio
              titulo="Sem alunos cadastrados"
              descricao="Cadastre alunos para acompanhar a frequência."
              icone={CalendarCheck}
            />
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
              {alunos.map((a) => {
                const ultimo = mapaUltimoCheckin(checkins)[a.id]
                const atraso = ultimo ? diasDesde(ultimo) : null
                const risco = atraso !== null ? atraso >= LIMITE : diasDesde(a.created_at) >= LIMITE
                const hoje = fezCheckinHoje(a.id)
                return (
                  <li
                    key={a.id}
                    className={`flex items-center gap-3 rounded-xl border-l-4 px-2.5 py-2 ${
                      risco
                        ? 'border-l-red-500 bg-red-50 dark:bg-red-950/40'
                        : hoje
                          ? 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                      {iniciais(a.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {a.nome}
                      </p>
                      <p
                        className={`text-xs ${
                          risco
                            ? 'font-semibold text-red-600 dark:text-red-400'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {hoje
                          ? 'Treinou hoje ✅'
                          : atraso === null
                            ? 'Ainda não treinou'
                            : risco
                              ? `Sem treinar há ${atraso} dia(s)`
                              : `Último treino: ${formatarData(ultimo)}`}
                      </p>
                    </div>
                    {risco && <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* ---------- Feedback pós-treino (PSE + observações) ---------- */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary-600" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
              Feedback dos Treinos (PSE)
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filtroAlunoHistorico}
              onChange={(e) => setFiltroAlunoHistorico(e.target.value)}
              className="w-48 text-sm"
            >
              <option value="">Todos os alunos</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {carregandoHistoricos ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : historicosExibidos.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum feedback de treino ainda"
            descricao="Quando os alunos concluírem um treino no Portal do Aluno, o PSE e as observações aparecerão aqui para você acompanhar a intensidade e a satisfação."
            icone={Gauge}
          />
        ) : (
          <ul className="space-y-2.5">
            {historicosExibidos.map((h) => {
              const aluno = alunos.find((a) => a.id === h.aluno_id)
              const estiloPse = pseEstilo(h.pse)
              return (
                <li
                  key={h.id}
                  className="flex flex-col gap-2.5 rounded-xl border border-zinc-200 p-3 sm:flex-row sm:items-center dark:border-zinc-800"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                      {iniciais(aluno?.nome || '?')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                        {aluno?.nome || 'Aluno removido'}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatarDataHora(h.data)}
                        {h.tempo_segundos != null && (
                          <>
                            <span className="mx-1">·</span>
                            <Timer className="mr-0.5 inline h-3 w-3" />
                            {formatarDuracao(h.tempo_segundos)}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${estiloPse.cor}`}
                        title={estiloPse.rotulo}
                      >
                        PSE {h.pse}/10 · {estiloPse.rotulo}
                      </span>
                    </div>
                  </div>

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

      {/* ---------- Modal de seleção para check-in ---------- */}
      <Modal
        aberto={modalAberto}
        titulo="Quem está treinando agora?"
        onFechar={() => setModalAberto(false)}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar aluno..."
              className="pl-9"
              autoFocus
            />
          </div>
          {alunosBuscados.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum aluno encontrado"
              descricao="Cadastre o aluno antes de fazer o check-in."
              icone={CalendarCheck}
            />
          ) : (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {alunosBuscados.map((a) => {
                const jaFez = fezCheckinHoje(a.id)
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => registrar(a)}
                      disabled={jaFez || registrando === a.id}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        jaFez
                          ? 'cursor-not-allowed border-emerald-300 bg-emerald-50 opacity-70 dark:border-emerald-800 dark:bg-emerald-950/40'
                          : 'border-zinc-200 hover:border-primary-500 hover:bg-primary-50 dark:border-zinc-800 dark:hover:border-primary-700 dark:hover:bg-primary-950/40'
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                        {iniciais(a.nome)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                          {a.nome}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {jaFez ? 'Check-in já realizado hoje' : 'Toque para registrar'}
                        </p>
                      </div>
                      {registrando === a.id ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                      ) : jaFez ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  )
}
