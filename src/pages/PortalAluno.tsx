// =====================================================================
// PORTAL DO ALUNO — acesso público e independente do painel do gestor
// Mobile-first: login por CPF/telefone, check-in do dia e ficha de treino.
// =====================================================================
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  ListTree,
  Loader2,
  LogOut,
  Phone,
  PlayCircle,
  User,
  HeartPulse,
  CalendarDays
} from 'lucide-react'

type Aluno = {
  id: string
  nome: string
  telefone?: string | null
  cpf?: string | null
  plano_valor?: number
  status_pagamento?: string
  data_vencimento?: string | null
  created_at?: string
}

type Exercicio = {
  nome: string
  series: number
  repeticoes: string
  carga?: string
  url_video?: string
}

type Treino = {
  id: string
  aluno_id: string
  dia_semana: string
  dias_semana?: string | null
  restricoes?: string | null
  exercicios_json: Exercicio[]
}

type Sessao = {
  aluno: Aluno
  logadaEm: string
}

const CHAVE_SESSAO = 'aluno_sessao'

// Restaura a sessão salva no localStorage (se houver)
function lerSessao(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO)
    return bruto ? JSON.parse(bruto) : null
  } catch {
    return null
  }
}

// Extrai iniciais do nome (avatar)
function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

export default function PortalAluno() {
  const { config } = useApp()
  const { toast } = useToast()

  // ---------- Sessão (localStorage) ----------
  const [sessao, setSessao] = useState<Sessao | null>(lerSessao)

  // ---------- Login ----------
  const [identificador, setIdentificador] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')

  // ---------- Check-in do dia ----------
  const [verificandoCheckin, setVerificandoCheckin] = useState(false)
  const [jaCheckinHoje, setJaCheckinHoje] = useState(false)
  const [checkinSucesso, setCheckinSucesso] = useState(false)
  const [registrando, setRegistrando] = useState(false)

  // ---------- Ficha de treino ----------
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [carregandoTreinos, setCarregandoTreinos] = useState(false)

  // ---------- Macrociclo (12 semanas) ----------
  const [macrociclo, setMacrociclo] = useState<any[]>([])
  const [verMacrociclo, setVerMacrociclo] = useState(false)

  const aluno = sessao?.aluno ?? null

  // ===================================================================
  // LOGIN — valida CPF ou telefone na tabela "alunos" do Supabase
  // ===================================================================
  const entrar = async (ev: any) => {
    ev.preventDefault()
    const digitos = identificador.replace(/\D/g, '')
    if (digitos.length < 8) {
      setErro('Digite um CPF ou telefone válido.')
      return
    }
    setBuscando(true)
    setErro('')
    try {
      // Busca real no banco (a comparação usa só dígitos, aceitando
      // formatações como "(11) 99999-9999" ou "123.456.789-00")
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .order('nome')
      if (error) throw error

      const match = (data || []).find((a: Aluno) => {
        const cpf = (a.cpf || '').replace(/\D/g, '')
        const tel = (a.telefone || '').replace(/\D/g, '')
        return cpf === digitos || (tel.length >= 8 && tel === digitos)
      })

      if (!match) {
        setErro('Aluno não encontrado. Verifique o CPF ou telefone.')
        return
      }

      // Mantém a sessão ativa no localStorage
      const nova: Sessao = { aluno: match, logadaEm: new Date().toISOString() }
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify(nova))
      setSessao(nova)
      toast(`Bem-vindo(a), ${match.nome.split(' ')[0]}! 💪`)
    } catch (e: any) {
      setErro(e?.message || 'Erro ao acessar. Tente novamente.')
    } finally {
      setBuscando(false)
    }
  }

  // ===================================================================
  // LOGOUT — limpa a sessão
  // ===================================================================
  const sair = () => {
    localStorage.removeItem(CHAVE_SESSAO)
    setSessao(null)
    setIdentificador('')
    setErro('')
    setJaCheckinHoje(false)
    setCheckinSucesso(false)
    setTreinos([])
    toast('Sessão encerrada. Até logo!')
  }

  // ===================================================================
  // CHECK-IN — verifica se já treinou hoje e carrega a ficha
  // ===================================================================
  const verificarCheckinHoje = useCallback(async () => {
    if (!aluno) return
    setVerificandoCheckin(true)
    try {
      const inicio = new Date()
      inicio.setHours(0, 0, 0, 0)
      const requisicao = supabase
        .from('checkins')
        .select('id')
        .eq('aluno_id', aluno.id)
        .gte('data_hora', inicio.toISOString())
      // Timeout de segurança: nunca deixa a tela presa no carregamento
      const { data, error } = await Promise.race([
        requisicao,
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: null }), 10000)
        )
      ])
      if (!error && data && data.length > 0) setJaCheckinHoje(true)
    } catch {
      // Se a consulta falhar, segue sem marcar o aluno como feito
    } finally {
      setVerificandoCheckin(false)
    }
  }, [aluno])

  const carregarFicha = useCallback(async () => {
    if (!aluno) return
    setCarregandoTreinos(true)
    try {
      const { data, error } = await supabase
        .from('treinos')
        .select('*')
        .eq('aluno_id', aluno.id)
        .order('dia_semana')
      if (!error) setTreinos((data as Treino[]) || [])
    } catch {
      // sem ação: a seção mostra o estado vazio
    } finally {
      setCarregandoTreinos(false)
    }
  }, [aluno])

  const carregarMacrociclo = useCallback(async () => {
    if (!aluno) return
    try {
      const { data, error } = await supabase
        .from('macrociclo')
        .select('semanas_json')
        .eq('aluno_id', aluno.id)
        .maybeSingle()
      if (!error && data?.semanas_json) setMacrociclo(data.semanas_json)
    } catch {
      // macrociclo indisponível: não exibe a seção
    }
  }, [aluno])

  useEffect(() => {
    if (aluno) {
      verificarCheckinHoje()
      carregarFicha()
      carregarMacrociclo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aluno?.id])

  // Insere o check-in com data/hora atual (com bloqueio de repetição no dia)
  const fazerCheckin = async () => {
    if (!aluno) return
    if (jaCheckinHoje) {
      toast('Você já fez check-in hoje! 😉', 'aviso')
      return
    }
    setRegistrando(true)
    try {
      const { data, error } = await supabase
        .from('checkins')
        .insert({ aluno_id: aluno.id, data_hora: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      setJaCheckinHoje(true)
      setCheckinSucesso(true)
      toast('Check-in realizado com sucesso! 💪')
    } catch (e: any) {
      toast(e?.message || 'Erro ao registrar o check-in.', 'erro')
    } finally {
      setRegistrando(false)
    }
  }

  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  // Nome do dia de hoje ("Segunda", "Terça", ...) para achar o treino do dia
  const hojeDiaNome = (() => {
    const n = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
    return n.charAt(0).toUpperCase() + n.slice(1).replace('-feira', '')
  })()

  // Treino cujo card tem o dia de hoje marcado nas caixinhas do treinador
  const treinoHoje = treinos.find((t) =>
    (t.dias_semana || '').includes(hojeDiaNome)
  )

  // ===================================================================
  // TELA DE LOGIN
  // ===================================================================
  if (!aluno) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
          {/* Marca */}
          <div className="mb-8 text-center">
            {config.logo_url ? (
              <img
                src={config.logo_url}
                alt={config.nome_academia}
                className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-card ring-2 ring-white dark:ring-zinc-800"
              />
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-3xl font-extrabold text-white shadow-card">
                {(config.nome_academia || 'A')[0].toUpperCase()}
              </div>
            )}
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {config.nome_academia}
            </h1>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Portal do Aluno
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={entrar} className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-zinc-800">
              <label
                htmlFor="identificador"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                CPF ou Telefone
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  id="identificador"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Ex.: 11999999999"
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {erro && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={buscando}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-bold text-white shadow transition hover:bg-primary-700 active:bg-primary-800 disabled:opacity-60"
              >
                {buscando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                {buscando ? 'Verificando...' : 'Entrar no meu espaço'}
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Acesso exclusivo para alunos cadastrados.
          </p>
        </div>
      </div>
    )
  }

  // ===================================================================
  // TELA PRINCIPAL DO ALUNO
  // ===================================================================
  return (
    <div className="min-h-screen bg-zinc-100 pb-10 dark:bg-zinc-950">
      {/* ---------- Cabeçalho ---------- */}
      <header className="bg-gradient-to-br from-primary-600 to-primary-800 px-5 pb-14 pt-5 text-white">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-sm font-extrabold ring-2 ring-white/40">
              {iniciais(aluno.nome)}
            </span>
            <div>
              <p className="text-xs opacity-80">Bem-vindo(a),</p>
              <p className="text-lg font-extrabold leading-tight">
                {aluno.nome.split(' ')[0]}
              </p>
            </div>
          </div>
          <button
            onClick={sair}
            className="rounded-xl bg-white/15 p-2.5 transition hover:bg-white/25"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto -mt-8 w-full max-w-md space-y-4 px-4">
        {/* ---------- Card de Check-in ---------- */}
        <section className="rounded-2xl bg-white p-5 text-center shadow-card ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-xs font-medium capitalize text-zinc-500 dark:text-zinc-400">
            {dataHoje}
          </p>

          {jaCheckinHoje || checkinSucesso ? (
            // Feedback visual de sucesso + botão desabilitado (sempre visível)
            <div className="py-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-3 font-bold text-zinc-900 dark:text-zinc-100">
                Check-in realizado com sucesso!
              </p>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Você já treinou hoje. Nos vemos amanhã! 💪
              </p>
              <button
                disabled
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-200 py-4 text-base font-extrabold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
              >
                <CheckCircle2 className="h-5 w-5" />
                Check-in já realizado hoje
              </button>
            </div>
          ) : (
            <button
              onClick={fazerCheckin}
              disabled={registrando || verificandoCheckin}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-700 py-4 text-base font-extrabold text-white shadow-lg shadow-primary-600/30 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            >
              {registrando || verificandoCheckin ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CalendarCheck className="h-5 w-5" />
              )}
              {registrando
                ? 'Registrando...'
                : verificandoCheckin
                  ? 'Verificando presença...'
                  : 'Fazer Check-in Agora'}
            </button>
          )}
        </section>

        {/* ---------- Ficha de Treino ---------- */}
        <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="mb-4 flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary-600" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
              Minha Ficha de Treino
            </h2>
          </div>

          {carregandoTreinos ? (
            <div className="flex justify-center py-8 text-primary-600">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : treinos.length === 0 ? (
            // Tratamento: aluno sem ficha cadastrada
            <div className="py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                <Dumbbell className="h-6 w-6" />
              </div>
              <p className="mt-3 font-semibold text-zinc-700 dark:text-zinc-200">
                Nenhuma ficha cadastrada ainda
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                Seu treinador ainda não liberou seus treinos. Fale com a
                recepção! 😉
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* -------- Treino de HOJE (destacado) -------- */}
              <div className="overflow-hidden rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                <div className="px-4 pt-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                      Treino de hoje · {hojeDiaNome}
                    </p>
                  </div>
                  {treinoHoje ? (
                    <p className="mt-1 text-2xl font-extrabold">
                      Treino {treinoHoje.dia_semana}
                      {(treinoHoje.exercicios_json || []).length > 0 && (
                        <span className="ml-2 align-middle text-xs font-semibold opacity-80">
                          {(treinoHoje.exercicios_json || []).length} exercício(s)
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="mt-1 text-2xl font-extrabold">Dia de descanso</p>
                  )}
                </div>
                {treinoHoje && (treinoHoje.exercicios_json || []).length > 0 ? (
                  <ul className="space-y-2 p-4">
                    {(treinoHoje.exercicios_json || []).map((ex, i) => (
                      <li key={i} className="rounded-xl bg-white/10 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{ex.nome}</p>
                            <p className="text-xs opacity-85">
                              {ex.series} séries · {ex.repeticoes} reps
                              {ex.carga ? ` · ${ex.carga}` : ''}
                            </p>
                          </div>
                          {ex.url_video && (
                            <a
                              href={ex.url_video}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary-700 transition hover:bg-zinc-100"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              Ver Vídeo
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : treinoHoje ? (
                  <p className="px-4 pb-4 text-xs opacity-80">
                    Nenhum exercício cadastrado para este treino ainda.
                  </p>
                ) : null}
              </div>

              {/* -------- Restrições / cuidados em destaque -------- */}
              {treinos[0]?.restricoes && (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5 dark:bg-amber-950/60">
                  <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      Restrições / Cuidados
                    </p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {treinos[0].restricoes}
                    </p>
                  </div>
                </div>
              )}

              {/* -------- Ficha da semana toda -------- */}
              <p className="pt-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Ficha da semana toda
              </p>

              {treinos.map((treino) => (
                <div
                  key={treino.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between bg-zinc-50 px-4 py-2.5 dark:bg-zinc-800/60">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-extrabold text-white">
                        {treino.dia_semana}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Treino {treino.dia_semana}
                        </p>
                        {treino.dias_semana && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {treino.dias_semana}
                          </p>
                        )}
                      </div>
                    </div>
                    {treinoHoje?.id === treino.id && (
                      <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        Hoje
                      </span>
                    )}
                  </div>
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {(treino.exercicios_json || []).map((ex, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">
                            {ex.nome}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {ex.series} séries · {ex.repeticoes} reps
                            {ex.carga ? ` · ${ex.carga}` : ''}
                          </p>
                        </div>
                        {ex.url_video && (
                          <a
                            href={ex.url_video}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700"
                            title="Assistir vídeo explicativo"
                          >
                            <PlayCircle className="h-4 w-4" />
                            Ver Vídeo
                          </a>
                        )}
                      </li>
                    ))}
                    {(treino.exercicios_json || []).length === 0 && (
                      <li className="px-4 py-3 text-center text-xs text-zinc-400">
                        Nenhum exercício cadastrado.
                      </li>
                    )}
                  </ul>
                </div>
              ))}

              {/* -------- Macrociclo (12 semanas) -------- */}
              {macrociclo.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => setVerMacrociclo((v) => !v)}
                    className="flex w-full items-center justify-between bg-zinc-50 px-4 py-3 text-left dark:bg-zinc-800/60"
                  >
                    <span className="flex items-center gap-2">
                      <ListTree className="h-4 w-4 text-primary-600" />
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Macrociclo (12 semanas)
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-zinc-400 transition ${
                        verMacrociclo ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {verMacrociclo && (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {macrociclo.map((s) => (
                        <div key={s.semana} className="px-4 py-3">
                          <p className="text-xs font-extrabold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                            Semana {s.semana}
                          </p>
                          <div className="mt-1 space-y-0.5 text-sm text-zinc-700 dark:text-zinc-200">
                            {s.foco && <p><span className="text-zinc-500">Foco:</span> {s.foco}</p>}
                            {s.volume && <p><span className="text-zinc-500">Volume:</span> {s.volume}</p>}
                            {s.intensidade && <p><span className="text-zinc-500">Intensidade:</span> {s.intensidade}</p>}
                            {s.obs && <p><span className="text-zinc-500">Obs.:</span> {s.obs}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ---------- Rodapé ---------- */}
        <footer className="pt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
          {config.nome_academia} · Portal do Aluno
        </footer>
      </main>
    </div>
  )
}