// =====================================================================
// PORTAL DO ALUNO — acesso público e independente do painel do gestor
// Mobile-first: login por CPF/telefone, check-in do dia, ficha de treino
// e macrociclo. Visual glassmorphism sobre foto de academia.
// =====================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import {
  Activity,
  AlertCircle,
  Bluetooth,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Heart,
  ListTree,
  Loader2,
  LogOut,
  Phone,
  PlayCircle,
  Pause,
  User,
  HeartPulse,
  CalendarDays,
  Timer,
  TrendingUp,
  X
} from 'lucide-react'
import fundoAcademia from '../assets/fundo.png'

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

// Slogan exibido abaixo do nome da academia
const SLOGAN = 'Transforme sua rotina, conquiste resultados'

// ---------- Web Bluetooth (frequencímetro / BPM) ----------
// Disponível apenas em contexto seguro (HTTPS) + Chrome/Edge/Android.
const bluetoothDisponivel =
  typeof navigator !== 'undefined' && 'bluetooth' in navigator

// Traduz a notificação da característica de medição cardíaca (0x2a37) em BPM.
// Byte 0 = flags; bit 0 indica se o valor vem em 16 bits (caso contrário 8 bits).
function extrairBpm(valor: DataView): number {
  const flags = valor.getUint8(0)
  const em16Bits = Boolean(flags & 0x1)
  return em16Bits ? valor.getUint16(1, true) : valor.getUint8(1)
}

// Estilo "vidro fosco" premium usado nos cards principais
const VIDRO =
  'rounded-3xl border border-white/[0.08] bg-zinc-900/80 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/[0.06] backdrop-blur-xl'

// Cabeçalho padrão dos cards: ícone em pílula + título
function CardHeader({
  icon: Icone,
  titulo,
  children
}: {
  icon: any
  titulo: string
  children?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300 ring-1 ring-inset ring-primary-500/25">
          <Icone className="h-4 w-4" />
        </span>
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-white/90">
          {titulo}
        </h2>
      </div>
      {children}
    </div>
  )
}

// Fundo da academia + sobreposição escura em gradiente
function FundoAcademia() {
  return (
    <>
      <div
        className="fixed inset-0 -scale-105 bg-cover bg-center bg-no-repeat blur-[3px]"
        style={{ backgroundImage: `url(${fundoAcademia})` }}
        aria-hidden
      />
      <div
        className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90"
        aria-hidden
      />
    </>
  )
}

// Logo da academia em círculo com brilho e pulso
function LogoPulsante({ tamanho = 'h-24 w-24' }) {
  const { config } = useApp()
  return (
    <div
      className={`${tamanho} mx-auto flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-primary-700 shadow-[0_0_45px_-5px_rgba(16,185,129,0.6)] ring-2 ring-white/40 animate-pulse`}
    >
      {config.logo_url ? (
        <img
          src={config.logo_url}
          alt={config.nome_academia}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-4xl font-extrabold text-white drop-shadow-md">
          {(config.nome_academia || 'A')[0].toUpperCase()}
        </span>
      )}
    </div>
  )
}

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

// Gráfico de linha simples (SVG) para a evolução do PSE (0-10)
function GraficoPse({ pontos }: { pontos: { data: string; pse: number }[] }) {
  if (pontos.length === 0) return null
  const LARGURA = 320
  const ALTURA = 130
  const PAD = 10
  const n = pontos.length
  const valores = pontos.map((p) => Number(p.pse))

  const aux = (i: number, v: number) => {
    const x = PAD + (i * (LARGURA - 2 * PAD)) / Math.max(1, n - 1)
    const y = ALTURA - PAD - (v / 10) * (ALTURA - 2 * PAD)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }
  const linha = valores.map((v, i) => `L${aux(i, v)}`).join(' ').replace('L', 'M')
  const area = `${linha} L${aux(n - 1, 0).split(',')[0]},${ALTURA - PAD} L${aux(0, 0).split(',')[0]},${ALTURA - PAD} Z`

  const dataRotulo = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full">
      {/* Linhas de referência (0, 2.5, 5, 7.5, 10) */}
      {[0, 2.5, 5, 7.5, 10].map((v) => {
        const y = ALTURA - PAD - (v / 10) * (ALTURA - 2 * PAD)
        return (
          <line
            key={v}
            x1={PAD}
            x2={LARGURA - PAD}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        )
      })}
      {/* Área preenchida */}
      <path
        d={area}
        fill="rgba(16,185,129,0.18)"
        stroke="none"
      />
      {/* Linha principal */}
      <path
        d={linha}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pontos */}
      {valores.map((v, i) => (
        <circle
          key={i}
          cx={aux(i, v).split(',')[0]}
          cy={aux(i, v).split(',')[1]}
          r="3"
          fill="#161616"
          stroke="#10b981"
          strokeWidth="2"
        />
      ))}
      {/* Rótulos: primeiro, meio e último */}
      {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
        <text
          key={i}
          x={aux(i, valores[i]).split(',')[0]}
          y={ALTURA - 3}
          textAnchor="middle"
          fontSize="8"
          fill="rgba(255,255,255,0.45)"
        >
          {dataRotulo(pontos[i].data)}
        </text>
      ))}
    </svg>
  )
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

  // ---------- Cronômetro de Treino + Feedback (historico_treinos) ----------
  const [cronometroAtivo, setCronometroAtivo] = useState(false)
  const [tempoDecorrido, setTempoDecorrido] = useState(0)
  const [modalFeedback, setModalFeedback] = useState(false)
  const [pse, setPse] = useState(5)
  const [observacoes, setObservacoes] = useState('')
  const [salvandoFeedback, setSalvandoFeedback] = useState(false)

  // ---------- Histórico de treinos (PSE + frequência por período) ----------
  const [historicoTreinos, setHistoricoTreinos] = useState<any[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [periodoFrequencia, setPeriodoFrequencia] = useState<'semanal' | 'mensal' | 'anual'>('semanal')
  const [periodoPse, setPeriodoPse] = useState<'semanal' | 'mensal' | 'anual'>('semanal')

  // ---------- Frequencímetro (Web Bluetooth / BPM em tempo real) ----------
  const [bpm, setBpm] = useState<number | null>(null)
  const [bpmConectado, setBpmConectado] = useState(false)
  const [bpmConectando, setBpmConectando] = useState(false)
  const [bpmErro, setBpmErro] = useState('')
  const bpmDeviceRef = useRef<any>(null)
  const bpmCharRef = useRef<any>(null)

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
    setCronometroAtivo(false)
    setTempoDecorrido(0)
    setModalFeedback(false)
    setTreinos([])
    if (bpmDeviceRef.current || bpmCharRef.current) {
      try {
        bpmCharRef.current?.stopNotifications?.()
        bpmDeviceRef.current?.gatt?.disconnect()
      } catch {
        // ignora falhas de desconexão no logout
      }
    }
    bpmDeviceRef.current = null
    bpmCharRef.current = null
    setBpm(null)
    setBpmConectado(false)
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

  // Carrega o histórico de treinos concluídos (PSE + frequência) do aluno
  const carregarHistorico = useCallback(async () => {
    if (!aluno) {
      setHistoricoTreinos([])
      return
    }
    setCarregandoHistorico(true)
    try {
      const { data, error } = await supabase
        .from('historico_treinos')
        .select('*')
        .eq('aluno_id', aluno.id)
        .order('data', { ascending: true })
      if (!error) setHistoricoTreinos((data as any[]) || [])
    } catch {
      // sem ação: gráficos ficam vazios
    } finally {
      setCarregandoHistorico(false)
    }
  }, [aluno])

  useEffect(() => {
    if (aluno) {
      verificarCheckinHoje()
      carregarFicha()
      carregarMacrociclo()
      carregarHistorico()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aluno?.id])

  const ORDEM = [1, 2, 3, 4, 5, 6, 0] // Seg/Segunda → Dom/Sábado
  const ROTULOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const MESES_ROTULO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

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

  // Mapeia nomes curtos/extensos para índice JS (0=Dom, 1=Seg, ..., 6=Sáb)
  const DIAS_NORMA = {
    dom: 0, domingo: 0,
    seg: 1, segunda: 1,
    ter: 2, 'terça': 2, terca: 2,
    qua: 3, quarta: 3,
    qui: 4, quinta: 4,
    sex: 5, sexta: 5,
    sab: 6, sábado: 6, sabado: 6
  }

  // ----- Frequência por período (Semanal / Mensal / Anual) a partir do historico_treinos -----
  const frequenciaPeriodo = useMemo(() => {
    const inicioDaSemana = (() => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      const dia = (d.getDay() + 6) % 7 // segunda = 0
      d.setDate(d.getDate() - dia)
      return d
    })()
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()

    // ---- Semanal: 7 barras (Seg-Dom), esperado do plano + realizado do histórico ----
    const esperadosPorDia = Array(7).fill(0)
    treinos.forEach((t) => {
      parseDiasSemana(t.dias_semana).forEach((d) => (esperadosPorDia[d] += 1))
    })
    const realizadosPorDia = Array(7).fill(0)

    // ---- Mensal: barras por semana do mês corrente (até 5) ----
    const realizadosPorSemana = [0, 0, 0, 0, 0]
    // ---- Anual: 12 barras (Jan-Dez) ----
    const realizadosPorMes = Array(12).fill(0)

    historicoTreinos.forEach((h) => {
      const d = new Date(h.data)
      if (d.getFullYear() === ano) realizadosPorMes[d.getMonth()] += 1
      if (d.getFullYear() === ano && d.getMonth() === mes) {
        const semana = Math.min(4, Math.floor((d.getDate() - 1) / 7))
        realizadosPorSemana[semana] += 1
      }
      if (d >= inicioDaSemana) realizadosPorDia[d.getDay()] += 1
    })

    const totalSemanal = realizadosPorDia.reduce((s, v) => s + v, 0)
    const totalMensal = realizadosPorSemana.reduce((s, v) => s + v, 0)
    const totalAnual = realizadosPorMes.reduce((s, v) => s + v, 0)

    const maximoSemana = Math.max(1, ...esperadosPorDia, ...realizadosPorDia)
    const maximoMes = Math.max(1, ...realizadosPorSemana)
    const maximoAno = Math.max(1, ...realizadosPorMes)

    return {
      semanal: { esperadosPorDia, realizadosPorDia, maximo: maximoSemana, total: totalSemanal },
      mensal: { realizadosPorSemana, maximo: maximoMes, total: totalMensal },
      anual: { realizadosPorMes, maximo: maximoAno, total: totalAnual }
    }
  }, [treinos, historicoTreinos])

  // ----- Evolução do PSE por período (Semanal / Mensal / Anual) -----
  const pseSerie = useMemo(() => {
    const agora = new Date()
    const inicio = (() => {
      if (periodoPse === 'semanal') {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        const dia = (d.getDay() + 6) % 7 // segunda = 0
        d.setDate(d.getDate() - dia)
        return d
      }
      if (periodoPse === 'mensal') return new Date(agora.getFullYear(), agora.getMonth(), 1)
      return new Date(agora.getFullYear(), 0, 1)
    })()

    const pontos = historicoTreinos.filter(
      (h) => h.pse != null && new Date(h.data) >= inicio
    )
    if (pontos.length === 0) return null
    const media = pontos.reduce((s, h) => s + Number(h.pse), 0) / pontos.length
    const ultimo = pontos[pontos.length - 1].pse
    return { pontos, media, ultimo }
  }, [historicoTreinos, periodoPse])

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

    // ----- Cronômetro: incrementa 1s por segundo enquanto ativo -----
  useEffect(() => {
    if (!cronometroAtivo) return
    const timer = setInterval(() => {
      setTempoDecorrido((t) => t + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cronometroAtivo])

  // Formata segundos como HH:MM:SS (ou MM:SS abaixo de 1h)
  const formatarTempo = (total: number) => {
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const dois = (n: number) => String(n).padStart(2, '0')
    return h > 0 ? `${dois(h)}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`
  }

  // Abre o modal de feedback ao clicar em "Concluir Treino"
  const abrirFeedback = () => {
    setPse(5)
    setObservacoes('')
    setModalFeedback(true)
  }

  // Salva o feedback na tabela historico_treinos e encerra o cronômetro
  const salvarFeedback = async () => {
    if (!aluno) return
    setSalvandoFeedback(true)
    try {
      const { error } = await supabase
        .from('historico_treinos')
        .insert({
          aluno_id: aluno.id,
          data: new Date().toISOString(),
          tempo_segundos: tempoDecorrido,
          pse,
          observacoes: observacoes.trim() || null
        })
      if (error) throw error
      toast('Treino concluído com sucesso! 💪')
      setCronometroAtivo(false)
      setTempoDecorrido(0)
      setModalFeedback(false)
      carregarHistorico()
    } catch (e: any) {
      toast(e?.message || 'Erro ao salvar o treino.', 'erro')
    } finally {
      setSalvandoFeedback(false)
    }
  }

  // Alterna o cronômetro (iniciar/pausar)
  const alternarCronometro = () => {
    if (!aluno) return
    setCronometroAtivo((a) => !a)
  }

  // ===================================================================
  // FREQUENCÍMETRO — Web Bluetooth (GATT Heart Rate: 0x180d / 0x2a37)
  // ===================================================================
  const aoLerBpm = (e: any) => {
    const valor: DataView | undefined = e.target?.value
    if (!valor) return
    setBpm(extrairBpm(valor))
  }

  const conectarFrequencimetro = async () => {
    const bt = (navigator as any)?.bluetooth
    if (!bt) {
      setBpmErro(
        'Bluetooth não disponível neste navegador. Use Chrome/Edge (Android) com HTTPS.'
      )
      return
    }
    setBpmConectando(true)
    setBpmErro('')
    try {
      const device = await bt.requestDevice({
        filters: [{ services: ['heart_rate'] }] // serviço padrão de frequência cardíaca
      })
      device.addEventListener('gattserverdisconnected', () => {
        setBpm(null)
        setBpmConectado(false)
        toast('Frequencímetro desconectado.', 'aviso')
      })
      const server = await device.gatt.connect()
      const service = await server.getPrimaryService('heart_rate') // 0x180d
      const characteristic = await service.getCharacteristic(
        'heart_rate_measurement' // 0x2a37
      )
      await characteristic.startNotifications()
      characteristic.addEventListener('characteristicvaluechanged', aoLerBpm)
      bpmDeviceRef.current = device
      bpmCharRef.current = characteristic
      setBpmConectado(true)
      toast('Frequencímetro conectado! ❤️')
    } catch (e: any) {
      // NotFoundError = usuário cancelou a seleção do dispositivo
      if (e?.name !== 'NotFoundError') {
        setBpmErro(e?.message || 'Falha ao conectar o frequencímetro.')
      }
    } finally {
      setBpmConectando(false)
    }
  }

  const desconectarFrequencimetro = async () => {
    try {
      await bpmCharRef.current?.stopNotifications?.()
      bpmDeviceRef.current?.gatt?.disconnect()
    } catch {
      // ignora falhas ao desconectar
    }
    bpmDeviceRef.current = null
    bpmCharRef.current = null
    setBpm(null)
    setBpmConectado(false)
    toast('Frequencímetro desconectado.', 'aviso')
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
      <div className="relative min-h-screen bg-black/60 text-white">
        <FundoAcademia />
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
          {/* Marca / logo pulsante */}
          <div className="mb-8 text-center">
            <div className="mb-5">
              <LogoPulsante />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight drop-shadow-md">
              {config.nome_academia}
            </h1>
            <p className="mt-1 text-sm font-medium text-white/60">{SLOGAN}</p>
          </div>

          {/* Formulário (vidro) */}
          <form onSubmit={entrar} className="space-y-4">
            <div className={`${VIDRO} p-5`}>
              <label
                htmlFor="identificador"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/60"
              >
                CPF ou Telefone
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  id="identificador"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Ex.: 11999999999"
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition backdrop-blur placeholder:text-white/40 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30"
                />
              </div>

              {erro && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/20 px-3 py-2.5 text-sm text-red-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={buscando}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/50 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
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

          <p className="mt-4 text-center text-xs text-white/40">
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
    <div className="relative min-h-screen bg-black/60 pb-10 text-white">
      <FundoAcademia />

      <div className="relative z-10">
        {/* ---------- Topo: boas-vindas + logo pulsante ---------- */}
        <header className="mx-auto w-full max-w-md px-5 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-extrabold ring-1 ring-white/30">
                {iniciais(aluno.nome)}
              </span>
              <div>
                <p className="text-xs text-white/60">Bem-vindo(a),</p>
                <p className="text-base font-extrabold leading-tight">
                  {aluno.nome.split(' ')[0]}
                </p>
              </div>
            </div>
            <button
              onClick={sair}
              className="rounded-xl border border-white/15 bg-white/10 p-2.5 transition hover:bg-white/20"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-7 text-center">
            <div className="mb-4">
              <LogoPulsante />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight drop-shadow-md">
              {config.nome_academia}
            </h1>
            <p className="mt-1 text-sm font-medium text-white/60">{SLOGAN}</p>
          </div>
        </header>

        <main className="mx-auto mt-6 w-full max-w-md space-y-4 px-4">
          {/* ---------- Card de Check-in ---------- */}
          <section className={`${VIDRO} p-6 text-center`}>
            <CardHeader icon={CalendarCheck} titulo="Check-in do Dia" />
            <p className="text-xs font-medium capitalize text-white/60">
              {dataHoje}
            </p>

            {jaCheckinHoje || checkinSucesso ? (
              // Feedback visual de sucesso + botão desabilitado (sempre visível)
              <div className="py-2">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="mt-3 font-bold text-white">
                  Check-in realizado com sucesso!
                </p>
                <p className="mt-0.5 text-sm text-white/60">
                  Você já treinou hoje. Nos vemos amanhã! 💪
                </p>
                <button
                  disabled
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-base font-extrabold text-white/35"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Check-in já realizado hoje
                </button>
              </div>
            ) : (
              <button
                onClick={fazerCheckin}
                disabled={registrando || verificandoCheckin}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-700 py-4 text-base font-extrabold text-white shadow-lg shadow-primary-500/30 ring-1 ring-inset ring-white/20 transition-all duration-300 hover:brightness-110 hover:shadow-primary-500/40 active:scale-[0.97] disabled:opacity-60"
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

          {/* ---------- Cronômetro de Treino ---------- */}
          <section className={`${VIDRO} p-6 text-center`}>
            <CardHeader icon={Timer} titulo="Cronômetro de Treino" />
            <div className="mx-auto inline-flex rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-4 shadow-inner ring-1 ring-inset ring-white/5">
              <p
                className={`text-5xl font-extrabold tabular-nums transition-colors ${
                  cronometroAtivo ? 'text-primary-300' : 'text-white'
                }`}
              >
                {formatarTempo(tempoDecorrido)}
              </p>
            </div>
            <p className="mt-3 text-xs font-medium text-white/50">
              {cronometroAtivo
                ? 'Treinando... keep it up! 🔥'
                : tempoDecorrido > 0
                  ? 'Pausado — continue quando quiser'
                  : 'Inicie quando começar a treinar'}
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={alternarCronometro}
                className={`group flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-extrabold text-white transition-all duration-300 active:scale-[0.97] ${
                  cronometroAtivo
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30 ring-1 ring-inset ring-white/20 hover:brightness-110 hover:shadow-amber-500/40'
                    : 'bg-gradient-to-r from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30 ring-1 ring-inset ring-white/20 hover:brightness-110 hover:shadow-primary-500/40'
                }`}
              >
                {cronometroAtivo ? (
                  <>
                    <Pause className="h-4 w-4" /> Pausar
                  </>
                ) : tempoDecorrido > 0 ? (
                  <>
                    <PlayCircle className="h-4 w-4" /> Continuar
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" /> Iniciar
                  </>
                )}
              </button>
              <button
                onClick={abrirFeedback}
                disabled={tempoDecorrido === 0 || salvandoFeedback}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/30 ring-1 ring-inset ring-white/20 transition-all duration-300 hover:brightness-110 hover:shadow-emerald-500/40 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
              >
                <CheckCircle2 className="h-4 w-4" />
                Concluir Treino
              </button>
            </div>
          </section>

          {/* ---------- Frequencímetro (Web Bluetooth / BPM em tempo real) ---------- */}
          <section className={`${VIDRO} p-6`}>
            <CardHeader icon={Activity} titulo="Frequência Cardíaca">
              {bpm != null && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Ao vivo
                </span>
              )}
            </CardHeader>

            {bpm != null ? (
              /* -------- Conectado: BPM ao vivo + pulso -------- */
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 ring-1 ring-inset ring-white/5">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-14 w-14 shrink-0 animate-pulse items-center justify-center rounded-full bg-rose-500/15 ring-1 ring-inset ring-rose-500/30">
                    <Heart className="h-7 w-7 fill-rose-400 text-rose-400" />
                  </span>
                  <div>
                    <p className="text-3xl font-extrabold tabular-nums leading-none text-white">
                      {bpm}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                      batimentos por minuto
                    </p>
                  </div>
                </div>
                <button
                  onClick={desconectarFrequencimetro}
                  className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              /* -------- Desconectado / Conectando / Pareado aguardando sinal -------- */
              <div className="text-center">
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                    bpmConectando
                      ? 'bg-amber-500/15 ring-1 ring-inset ring-amber-500/30'
                      : bpmConectado
                        ? 'animate-pulse bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30'
                        : 'bg-white/5 ring-1 ring-inset ring-white/10'
                  }`}
                >
                  {bpmConectando ? (
                    <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
                  ) : bpmConectado ? (
                    <Heart className="h-6 w-6 fill-emerald-400 text-emerald-400" />
                  ) : (
                    <Bluetooth className="h-6 w-6 text-white/50" />
                  )}
                </div>

                <p className="mt-3 text-sm font-bold text-white/90">
                  {bpmConectando
                    ? 'Conectando...'
                    : bpmConectado
                      ? 'Pareado · aguardando sinal'
                      : 'Desconectado'}
                </p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-white/50">
                  Use uma cinta cardíaca ou smartwatch compatível com Bluetooth
                  Low Energy para acompanhar seus batimentos em tempo real
                  durante o treino.
                </p>

                {bpmErro && !bpmConectado && (
                  <p className="mt-2 text-[11px] font-medium text-red-300">
                    {bpmErro}
                  </p>
                )}

                {bpmConectado ? (
                  <button
                    onClick={desconectarFrequencimetro}
                    className="mt-4 w-full rounded-2xl border border-white/15 bg-white/5 py-3.5 text-sm font-bold text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-[0.97]"
                  >
                    Desconectar
                  </button>
                ) : (
                  <button
                    onClick={conectarFrequencimetro}
                    disabled={bpmConectando || !bluetoothDisponivel}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-rose-500/30 ring-1 ring-inset ring-white/20 transition-all duration-300 hover:brightness-110 hover:shadow-rose-500/40 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bpmConectando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bluetooth className="h-4 w-4" />
                    )}
                    {bpmConectando
                      ? 'Conectando...'
                      : bluetoothDisponivel
                        ? 'Conectar Frequencímetro'
                        : 'Bluetooth não suportado'}
                  </button>
                )}

                {!bluetoothDisponivel && (
                  <p className="mt-2 text-[11px] text-white/40">
                    Requer HTTPS e navegador Chrome/Edge (Android ou Windows).
                    iOS Safari não suporta Web Bluetooth.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ---------- Frequência por período (Semanal/Mensal/Anual) ---------- */}
          <section className={`${VIDRO} p-6`}>
            <CardHeader icon={CalendarDays} titulo="Frequência">
              <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-[11px] font-bold">
                {(
                  [
                    ['semanal', 'Semanal'],
                    ['mensal', 'Mensal'],
                    ['anual', 'Anual']
                  ] as const
                ).map(([chave, rotulo]) => (
                  <button
                    key={chave}
                    onClick={() => setPeriodoFrequencia(chave)}
                    className={`rounded-full px-3 py-1 transition-all duration-300 ${
                      periodoFrequencia === chave
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-900/40'
                        : 'text-white/55 hover:text-white'
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </CardHeader>

            {carregandoHistorico ? (
              <div className="flex justify-center py-10 text-primary-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-center gap-1.5 text-xs font-bold text-white/80">
                  <span className="rounded-full bg-primary-500/15 px-2.5 py-1 text-primary-200 ring-1 ring-inset ring-primary-500/25">
                    {periodoFrequencia === 'semanal' &&
                      `${frequenciaPeriodo.semanal.total} treino(s) nesta semana`}
                    {periodoFrequencia === 'mensal' &&
                      `${frequenciaPeriodo.mensal.total} treino(s) neste mês`}
                    {periodoFrequencia === 'anual' &&
                      `${frequenciaPeriodo.anual.total} treino(s) neste ano`}
                  </span>
                </div>

                {/* ---------- Semanal ---------- */}
                {periodoFrequencia === 'semanal' && (
                  <div className="flex h-44 items-end gap-1.5">
                    {ORDEM.map((diaIdx) => {
                      const esp = frequenciaPeriodo.semanal.esperadosPorDia[diaIdx]
                      const real = frequenciaPeriodo.semanal.realizadosPorDia[diaIdx]
                      const isHoje = diaIdx === new Date().getDay()
                      return (
                        <div
                          key={diaIdx}
                          className={`flex flex-1 flex-col items-center gap-1 ${
                            isHoje
                              ? 'rounded-2xl bg-primary-500/15 px-1 py-1.5 ring-1 ring-inset ring-primary-500/25'
                              : ''
                          }`}
                        >
                          <div className="flex h-full w-full items-end justify-center gap-1.5">
                            <div className="flex w-3.5 flex-col items-center justify-end">
                              <span className="mb-1 text-[10px] font-extrabold text-primary-300">
                                {esp || ''}
                              </span>
                              <div
                                className="w-full rounded-full bg-gradient-to-t from-primary-600 to-primary-300 transition-all duration-500"
                                style={{
                                  height: `${(esp / frequenciaPeriodo.semanal.maximo) * 100}%`,
                                  minHeight: esp ? 4 : 0
                                }}
                                title={`Esperado (${ROTULOS[ORDEM.indexOf(diaIdx)]}): ${esp}`}
                              />
                            </div>
                            <div className="flex w-3.5 flex-col items-center justify-end">
                              <span className="mb-1 text-[10px] font-extrabold text-emerald-300">
                                {real || ''}
                              </span>
                              <div
                                className="w-full rounded-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500"
                                style={{
                                  height: `${(real / frequenciaPeriodo.semanal.maximo) * 100}%`,
                                  minHeight: real ? 4 : 0
                                }}
                                title={`Realizado (${ROTULOS[ORDEM.indexOf(diaIdx)]}): ${real}`}
                              />
                            </div>
                          </div>
                          <span
                            className={`text-[10px] ${
                              isHoje
                                ? 'font-bold text-primary-300'
                                : 'text-white/50'
                            }`}
                          >
                            {ROTULOS[ORDEM.indexOf(diaIdx)]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ---------- Mensal ---------- */}
                {periodoFrequencia === 'mensal' && (
                  <div className="flex h-44 items-end gap-2">
                    {frequenciaPeriodo.mensal.realizadosPorSemana.map((v, i) => (
                      <div
                        key={i}
                        className="flex flex-1 flex-col items-center gap-1"
                      >
                        <div className="flex w-full flex-1 items-end justify-center">
                          <div className="flex w-10 flex-col items-center justify-end">
                            <span className="mb-1 text-[10px] font-extrabold text-emerald-300">
                              {v || ''}
                            </span>
                            <div
                              className="w-full rounded-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500"
                              style={{
                                height: `${(v / frequenciaPeriodo.mensal.maximo) * 100}%`,
                                minHeight: v ? 4 : 0
                              }}
                              title={`Semana ${i + 1}: ${v} treino(s)`}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-white/50">
                          Sem {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ---------- Anual ---------- */}
                {periodoFrequencia === 'anual' && (
                  <div className="flex h-44 items-end gap-1">
                    {frequenciaPeriodo.anual.realizadosPorMes.map((v, i) => (
                      <div
                        key={i}
                        className="flex flex-1 flex-col items-center gap-1"
                      >
                        <div className="flex w-full flex-1 items-end justify-center">
                          <div
                            className="w-full max-w-4 rounded-full bg-gradient-to-t from-primary-600 to-primary-300 transition-all duration-500"
                            style={{
                              height: `${(v / frequenciaPeriodo.anual.maximo) * 100}%`,
                              minHeight: v ? 3 : 0
                            }}
                            title={`${MESES_ROTULO[i]}: ${v} treino(s)`}
                          />
                        </div>
                        <span className="text-[9px] text-white/50">
                          {MESES_ROTULO[i]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="mt-4 rounded-2xl border border-primary-500/25 bg-primary-500/10 px-3.5 py-2.5 text-center text-[11px] leading-snug text-primary-200">
              Consistência é o segredo: cada treino concluído conta para a sua
              evolução. Continue assim! 💪
            </p>
          </section>

          {/* ---------- Evolução do PSE ---------- */}
          <section className={`${VIDRO} p-6`}>
            <CardHeader icon={TrendingUp} titulo="Evolução do PSE">
              <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-[11px] font-bold">
                {(
                  [
                    ['semanal', 'Sem'],
                    ['mensal', 'Mês'],
                    ['anual', 'Ano']
                  ] as const
                ).map(([chave, rotulo]) => (
                  <button
                    key={chave}
                    onClick={() => setPeriodoPse(chave)}
                    className={`rounded-full px-3 py-1 transition-all duration-300 ${
                      periodoPse === chave
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-900/40'
                        : 'text-white/55 hover:text-white'
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </CardHeader>
            {pseSerie ? (
              <div>
                <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center shadow-inner ring-1 ring-inset ring-white/5">
                  <div>
                    <p className="text-xl font-extrabold text-white">
                      {pseSerie.media.toFixed(1)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                      Média de esforço
                    </p>
                  </div>
                  <div className="border-x border-white/10">
                    <p className="text-xl font-extrabold text-primary-300">
                      {pseSerie.ultimo}/10
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                      Último treino
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-white">
                      {pseSerie.pontos.length}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                      Treinos no período
                    </p>
                  </div>
                </div>

                {/* Gráfico de linha SVG (últimos 14 do período) */}
                <GraficoPse pontos={pseSerie.pontos.slice(-14)} />
              </div>
            ) : (
              <div className="py-10 text-center text-white/60">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-inset ring-white/10">
                  <TrendingUp className="h-7 w-7 text-primary-400" />
                </div>
                <p className="text-sm font-semibold text-white/80">
                  Nenhum treino concluído no período
                </p>
                <p className="mt-1 text-xs text-white/50">
                  Ao finalizar um treino com o cronômetro, sua nota de esforço
                  (PSE) aparecerá aqui.
                </p>
              </div>
            )}
          </section>

          {/* ---------- Ficha de Treino ---------- */}
          <section className={`${VIDRO} p-6`}>
            <CardHeader icon={Dumbbell} titulo="Minha Ficha de Treino" />

            {carregandoTreinos ? (
              <div className="flex justify-center py-8 text-primary-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : treinos.length === 0 ? (
              // Tratamento: aluno sem ficha cadastrada
              <div className="py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <p className="mt-3 font-semibold text-white/90">
                  Nenhuma ficha cadastrada ainda
                </p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-white/50">
                  Seu treinador ainda não liberou seus treinos. Fale com a
                  recepção! 😉
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* -------- Treino de HOJE (destacado) -------- */}
                <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/25 ring-1 ring-inset ring-white/20">
                  <div className="px-5 pt-4">
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
                          <span className="ml-2 align-middle rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">
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
                        <li key={i} className="rounded-2xl bg-white/10 px-3.5 py-2.5 backdrop-blur-sm">
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
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary-700 shadow-sm transition-all duration-300 hover:bg-zinc-100 active:scale-95"
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
                    <p className="px-5 pb-4 text-xs opacity-80">
                      Nenhum exercício cadastrado para este treino ainda.
                    </p>
                  ) : null}
                </div>

                {/* -------- Restrições / cuidados (alto contraste) -------- */}
                {treinos[0]?.restricoes && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-400 to-amber-300 px-4 py-3 shadow-lg shadow-amber-500/20">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-950/10">
                      <HeartPulse className="h-4 w-4 text-amber-950" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-950">
                        Restrições / Cuidados
                      </p>
                      <p className="text-sm font-semibold leading-snug text-amber-950">
                        {treinos[0].restricoes}
                      </p>
                    </div>
                  </div>
                )}

                {/* -------- Ficha da semana toda -------- */}
                <p className="pt-1 text-[11px] font-bold uppercase tracking-wider text-white/50">
                  Ficha da semana toda
                </p>

                {treinos.map((treino) => (
                  <div
                    key={treino.id}
                    className={`overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.07] to-white/[0.02] transition-all duration-300 hover:border-white/20 ${
                      treinoHoje?.id === treino.id
                        ? 'border-primary-500/40 ring-1 ring-inset ring-primary-500/30'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-lg ${
                            treinoHoje?.id === treino.id
                              ? 'bg-gradient-to-br from-primary-400 to-primary-600 shadow-primary-500/40 ring-2 ring-white/20'
                              : 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-900/40 ring-2 ring-white/10'
                          }`}
                        >
                          {treino.dia_semana}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-white">
                            Treino {treino.dia_semana}
                          </p>
                          {treino.dias_semana && (
                            <p className="text-[11px] text-white/50">
                              {treino.dias_semana}
                            </p>
                          )}
                        </div>
                      </div>
                      {treinoHoje?.id === treino.id && (
                        <span className="rounded-full bg-primary-500/20 px-2.5 py-1 text-[10px] font-bold text-primary-200 ring-1 ring-inset ring-primary-500/40">
                          Hoje
                        </span>
                      )}
                    </div>
                    <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                      {(treino.exercicios_json || []).map((ex, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {ex.nome}
                            </p>
                            <p className="text-xs text-white/50">
                              {ex.series} séries · {ex.repeticoes} reps
                              {ex.carga ? ` · ${ex.carga}` : ''}
                            </p>
                          </div>
                          {ex.url_video && (
                            <a
                              href={ex.url_video}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-500/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-primary-900/40 transition-all duration-300 hover:bg-primary-400 active:scale-95"
                              title="Assistir vídeo explicativo"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              Ver Vídeo
                            </a>
                          )}
                        </li>
                      ))}
                      {(treino.exercicios_json || []).length === 0 && (
                        <li className="px-4 py-3 text-center text-xs text-white/40">
                          Nenhum exercício cadastrado.
                        </li>
                      )}
                    </ul>
                  </div>
                ))}

                {/* -------- Macrociclo (12 semanas) -------- */}
                {macrociclo.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02]">
                    <button
                      onClick={() => setVerMacrociclo((v) => !v)}
                      className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300 ring-1 ring-inset ring-primary-500/25">
                          <ListTree className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-bold text-white">
                          Macrociclo (12 semanas)
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-white/50 transition-transform duration-300 ${
                          verMacrociclo ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {verMacrociclo && (
                      <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                        {macrociclo.map((s) => (
                          <div key={s.semana} className="px-4 py-3">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-primary-400">
                              Semana {s.semana}
                            </p>
                            <div className="mt-1 space-y-0.5 text-sm text-white/85">
                              {s.foco && (
                                <p>
                                  <span className="text-white/50">Foco:</span>{' '}
                                  {s.foco}
                                </p>
                              )}
                              {s.volume && (
                                <p>
                                  <span className="text-white/50">Volume:</span>{' '}
                                  {s.volume}
                                </p>
                              )}
                              {s.intensidade && (
                                <p>
                                  <span className="text-white/50">
                                    Intensidade:
                                  </span>{' '}
                                  {s.intensidade}
                                </p>
                              )}
                              {s.obs && (
                                <p>
                                  <span className="text-white/50">Obs.:</span> {s.obs}
                                </p>
                              )}
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
        </main>

        {/* ---------- Modal de Feedback (Concluir Treino) ---------- */}
        {modalFeedback && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => setModalFeedback(false)}
          >
            <div
              className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#161616] shadow-[0_24px_64px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.06] backdrop-blur-2xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300 ring-1 ring-inset ring-primary-500/25">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <h2 className="text-base font-bold text-white">Concluir Treino</h2>
                </div>
                <button
                  onClick={() => setModalFeedback(false)}
                  className="rounded-full p-2 text-white/50 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-90"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto px-6 pb-6 pt-2">
                {/* Tempo total da sessão */}
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 ring-1 ring-inset ring-white/5">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white/80">
                    <Timer className="h-4 w-4 text-primary-400" />
                    Tempo da sessão
                  </span>
                  <span className="text-lg font-extrabold tabular-nums text-white">
                    {formatarTempo(tempoDecorrido)}
                  </span>
                </div>

                {/* PSE (0-10) */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-bold text-white">
                      Esforço da sessão (PSE)
                    </label>
                    <span className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-3.5 py-1 text-sm font-extrabold text-white shadow-md shadow-primary-900/40">
                      {pse}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={pse}
                    onChange={(e) => setPse(Number(e.target.value))}
                    className="w-full accent-primary-500"
                  />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">
                    {pse <= 2
                      ? 'Muito leve — aquecimento ou descanso.'
                      : pse <= 4
                        ? 'Leve — respiração controlada, conversa tranquila.'
                        : pse <= 6
                          ? 'Moderado — esforço perceptível, conversa difícil.'
                          : pse <= 8
                            ? 'Intenso — respiração ofegante, poucas palavras.'
                            : 'Máximo — esforço total, quase sem fôlego.'}
                  </p>
                </div>

                {/* Observações */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-white">
                    Observações / Comentários
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={3}
                    placeholder="Como foi o treino de hoje? Algum exercício difícil, dor, ou algo que queira contar ao seu treinador..."
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => setModalFeedback(false)}
                    className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3.5 text-sm font-bold text-white/70 transition-all duration-300 hover:bg-white/10 active:scale-[0.97]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarFeedback}
                    disabled={salvandoFeedback}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/30 ring-1 ring-inset ring-white/20 transition-all duration-300 hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
                  >
                    {salvandoFeedback ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {salvandoFeedback ? 'Salvando...' : 'Salvar e concluir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------- Rodapé dinâmico ---------- */}
        <footer className="mx-auto w-full max-w-md px-4 pb-8 pt-6 text-center">
          <p className="text-xs font-medium text-white/60">
            © {new Date().getFullYear()} {config.nome_academia} · Portal do Aluno
          </p>
        </footer>
      </div>
    </div>
  )
}