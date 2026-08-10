// =====================================================================
// Módulo de Check-in e Frequência (retenção)
// - Registra presença em tempo real no Supabase
// - Alerta visual de quem não treina há mais de 7 dias
// =====================================================================
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserX,
  ChevronRight
} from 'lucide-react'
import { useAlunos } from '../hooks/useAlunos'
import { useCheckins } from '../hooks/useCheckins'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { Card, Input, EstadoVazio, Spinner, Button } from '../components/ui'
import {
  formatarDataHora,
  formatarData,
  diasDesde,
  iniciais
} from '../utils/format'
import { mapaUltimoCheckin } from '../utils/metrics'

const LIMITE = 7

export default function Checkins() {
  const { alunos, carregando: carregandoAlunos } = useAlunos()
  const {
    checkins,
    carregando: carregandoCheckins,
    carregarCheckins,
    registrarCheckin,
    fezCheckinHoje
  } = useCheckins()
  const { toast } = useToast()

  const [modalAberto, setModalAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [registrando, setRegistrando] = useState(null)

  useEffect(() => {
    carregarCheckins()
  }, [carregarCheckins])

  // ----- Alunos que não treinam há 7+ dias -----
  const ausentes = useMemo(() => {
    const ultimo = mapaUltimoCheckin(checkins)
    return alunos.filter((a) => {
      const ultimoCheck = ultimo[a.id]
      if (!ultimoCheck) return diasDesde(a.created_at) >= LIMITE
      return diasDesde(ultimoCheck) >= LIMITE
    })
  }, [alunos, checkins])

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
            Registre a presença dos alunos em tempo real.
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

      {/* ---------- Alerta de evasão ---------- */}
      {ausentes.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                {ausentes.length} aluno(s) não treinam há mais de {LIMITE} dias
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Chame esses alunos no WhatsApp para evitar a evasão.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ausentes.slice(0, 6).map((a) => (
                  <Link
                    key={a.id}
                    to={`/financeiro`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-amber-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-amber-950"
                  >
                    <UserX className="h-3 w-3 text-amber-500" />
                    {a.nome}
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

        {/* ---------- Frequência geral ---------- */}
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
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${
                      risco
                        ? 'bg-red-50 dark:bg-red-950/40'
                        : hoje
                          ? 'bg-emerald-50 dark:bg-emerald-950/40'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
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