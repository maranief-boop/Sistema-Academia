// =====================================================================
// Dashboard do Gestor — métricas reais calculadas do Supabase
// =====================================================================
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote,
  Users,
  AlertTriangle,
  UserX,
  CalendarCheck,
  MessageCircle,
  ChevronRight,
  Dumbbell
} from 'lucide-react'
import { useAlunos } from '../hooks/useAlunos'
import { useCheckins } from '../hooks/useCheckins'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { MetricCard } from '../components/MetricCard'
import { Card, Spinner, EstadoVazio, Button } from '../components/ui'
import { computarMetricas, checkinsPorDia, mapaUltimoCheckin } from '../utils/metrics'
import { formatarMoeda, formatarData, diasDesde, iniciais } from '../utils/format'
import { abrirWhatsApp, mensagemCobranca } from '../utils/whatsapp'

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export default function Dashboard() {
  const { config } = useApp()
  const { toast } = useToast()
  const { alunos, carregando: carregandoAlunos } = useAlunos()
  const { checkins, carregarCheckins } = useCheckins()

  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    carregarCheckins().finally(() => setCarregando(false))
  }, [carregarCheckins])

  const metricas = useMemo(
    () => computarMetricas(alunos, checkins),
    [alunos, checkins]
  )

  const checkinsHoje = useMemo(
    () =>
      checkins.filter((c) => diasDesde(c.data_hora) === 0).length,
    [checkins]
  )

  const grafico = useMemo(() => checkinsPorDia(checkins, 7), [checkins])

  const ultimoCheckin = useMemo(() => mapaUltimoCheckin(checkins), [checkins])

  const maximoGrafico = Math.max(...grafico.map((g) => g.total), 1)

  const cobrarAusente = (aluno) => {
    const ok = abrirWhatsApp(
      aluno.telefone,
      mensagemCobranca({
        nome: aluno.nome,
        academia: config.nome_academia,
        valor: formatarMoeda(aluno.plano_valor),
        vencimento: formatarData(aluno.data_vencimento)
      })
    )
    if (!ok) toast('Aluno sem número de WhatsApp cadastrado.', 'erro')
  }

  if (carregando || carregandoAlunos) return <Spinner />

  return (
    <div className="space-y-6">
      {/* ---------- Boas-vindas ---------- */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Olá, gestor(a) 👋
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Visão geral de hoje em {config.nome_academia}.
        </p>
      </div>

      {/* ---------- Cards de métricas (clicáveis) ---------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          titulo="Faturamento Mensal"
          valor={formatarMoeda(metricas.faturamento)}
          sub="Ver financeiro"
          icone={Banknote}
          cor="primary"
          to="/financeiro"
        />
        <MetricCard
          titulo="Alunos Ativos"
          valor={metricas.total}
          sub={`${metricas.inadimplentes} inadimplente(s) · ver alunos`}
          icone={Users}
          cor="azul"
          to="/alunos"
        />
        <MetricCard
          titulo="Inadimplência"
          valor={`${String(metricas.taxaInadimplencia).replace('.', ',')}%`}
          sub={`${metricas.inadimplentes} atrasado(s) · cobrar`}
          icone={AlertTriangle}
          cor="vermelho"
          to="/financeiro"
        />
        <MetricCard
          titulo="Risco de Evasão"
          valor={metricas.emRisco.length}
          sub="Sem treinar há mais de 7 dias · ver alunos"
          icone={UserX}
          cor="ambar"
          to="/alunos"
        />
      </div>

      {/* ---------- Gráfico de check-ins (7 dias) + Check-ins hoje ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
                Frequência da semana
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Check-ins registrados nos últimos 7 dias
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-sm font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              <CalendarCheck className="h-4 w-4" />
              {checkinsHoje} hoje
            </div>
          </div>
          <div className="flex h-36 items-end gap-2">
            {grafico.map((g, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {g.total > 0 ? g.total : ''}
                </span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 transition-all"
                  style={{
                    height: `${g.total ? Math.max(8, Math.round((g.total / maximoGrafico) * 110)) : 4}px`
                  }}
                  title={`${formatarData(g.data)}: ${g.total} check-in(s)`}
                />
                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                  {DIAS_SEMANA[g.data.getDay()]}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* ---------- Alunos em risco ---------- */}
        <Card className="flex flex-col p-5">
          <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
            Ausentes há 7+ dias
          </h2>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Priorize a recuperação desses alunos
          </p>
          {metricas.emRisco.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum aluno em risco"
              descricao="Todos estão treinando recentemente."
              icone={CalendarCheck}
            />
          ) : (
            <ul className="max-h-56 flex-1 space-y-2 overflow-y-auto pr-1">
              {metricas.emRisco.slice(0, 8).map((aluno) => (
                <li
                  key={aluno.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                    {iniciais(aluno.nome)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {aluno.nome}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {aluno.telefone
                        ? 'Sem treinar há ' +
                          (diasDesde(ultimoCheckin[aluno.id]) ?? '—') +
                          ' dias'
                        : 'Sem contato cadastrado'}
                    </p>
                  </div>
                  {aluno.telefone && (
                    <button
                      onClick={() => cobrarAusente(aluno)}
                      className="rounded-lg bg-emerald-500 p-2 text-white transition hover:bg-emerald-600"
                      title="Chamar via WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ---------- Atalhos rápidos ---------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: '/financeiro', label: 'Cobrar alunos', icone: MessageCircle, cor: 'from-emerald-500 to-emerald-600' },
          { to: '/checkins', label: 'Fazer check-in', icone: CalendarCheck, cor: 'from-primary-500 to-primary-600' },
          { to: '/alunos', label: 'Novo aluno', icone: Users, cor: 'from-sky-500 to-sky-600' },
          { to: '/treinos', label: 'Montar treino', icone: Dumbbell, cor: 'from-amber-500 to-amber-600' }
        ].map(({ to, label, icone: Icone, cor }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-card ring-1 ring-zinc-200/70 transition hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800"
          >
            <div className="flex items-center gap-3">
              <span
                className={`rounded-xl bg-gradient-to-br ${cor} p-2.5 text-white shadow`}
              >
                <Icone className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {label}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
          </Link>
        ))}
      </div>

      {alunos.length === 0 && (
        <Card className="p-6">
          <EstadoVazio
            icone={Users}
            titulo="Nenhum aluno cadastrado ainda"
            descricao="Comece cadastrando o primeiro aluno para liberar o dashboard."
            acao={
              <Link to="/alunos">
                <Button variante="primario">Cadastrar aluno</Button>
              </Link>
            }
          />
        </Card>
      )}
    </div>
  )
}