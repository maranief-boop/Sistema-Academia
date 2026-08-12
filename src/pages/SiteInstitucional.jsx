// =====================================================================
// Site Institucional (port para React do index.html do módulo Site/CRM)
// O formulário de captura de leads agora grava no SUPABASE (tabela
// "leads") — mesma instância do sistema — em vez do Firestore.
// =====================================================================
import { useState } from 'react'
import {
  Dumbbell,
  Flame,
  Users,
  GraduationCap,
  Snowflake,
  Settings,
  HeartPulse,
  Star,
  MapPin,
  Phone,
  Mail,
  Calculator,
  CheckCircle2,
  ArrowDown,
  Menu,
  X,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  Clapperboard,
  CalendarDays,
  Clock,
  Loader2
} from 'lucide-react'
import { useLeads } from '../hooks/useLeads'
import { useToast } from '../components/Toast'
import { useApp } from '../context/AppContext'
import { abrirWhatsApp } from '../utils/whatsapp'
import { dataParaInput } from '../utils/format'
import fundoAcademia from '../assets/fundo.png'

const HORARIOS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']

const NAV = [
  { id: 'modalidades', rotulo: 'Modalidades' },
  { id: 'estrutura', rotulo: 'Estrutura' },
  { id: 'depoimentos', rotulo: 'Depoimentos' },
  { id: 'calculadora', rotulo: 'IMC' }
]

function rolarPara(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function Estrelas() {
  return (
    <div className="mb-3 flex gap-1 text-yellow-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="h-4 w-4 fill-current" />
      ))}
    </div>
  )
}

export default function SiteInstitucional() {
  const { criar } = useLeads()
  const { toast } = useToast()
  const { config } = useApp()
  const nomeAcademia = config.nome_academia || 'IronFit Andradina'

  const [menuAberto, setMenuAberto] = useState(false)
  const [modalLead, setModalLead] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [data, setData] = useState('')
  const [horario, setHorario] = useState('')

  const [altura, setAltura] = useState(175)
  const [peso, setPeso] = useState(80)
  const [idade, setIdade] = useState(30)
  const [resultadoImc, setResultadoImc] = useState(null)

  const hoje = dataParaInput(new Date())

  const abrirLead = () => {
    setMenuAberto(false)
    setModalLead(true)
  }

  const enviarLead = async (evento) => {
    evento.preventDefault()
    if (!nome.trim()) return toast('Informe seu nome', 'aviso')
    if (!telefone.trim()) return toast('Informe seu WhatsApp', 'aviso')
    setSalvando(true)
    const r = await criar({
      nome,
      telefone,
      origem: 'Site Institucional',
      stage: data ? 'agendamento' : 'novo',
      data_preferida: data || null,
      horario_preferido: horario || null
    })
    setSalvando(false)
    if (r.erro) return toast(`Erro ao salvar lead: ${r.erro}`, 'erro')
    toast(data ? 'Aula experimental agendada!' : 'Recebemos seus dados!')
    setModalLead(false)
    setNome('')
    setTelefone('')
    setData('')
    setHorario('')
    abrirWhatsApp(
      telefone,
      `Olá! Vim pelo site do ${nomeAcademia} e quero agendar minha aula experimental${data ? ` para ${data.split('-').reverse().join('/')}${horario ? ` às ${horario}` : ''}` : ''}. 💪`
    )
  }

  const calcularImc = () => {
    const h = altura / 100
    const imc = peso / (h * h)
    let classificacao = ''
    let recomendacao = ''
    if (imc < 18.5) {
      classificacao = 'Abaixo do peso'
      recomendacao = 'Ideal para ganho de massa muscular. Nossos treinos de força e a orientação nutricional podem ajudar!'
    } else if (imc < 25) {
      classificacao = 'Peso normal'
      recomendacao = 'Perfeito! Continue mantendo o ritmo com treinos equilibrados de força e condicionamento.'
    } else if (imc < 30) {
      classificacao = 'Sobrepeso'
      recomendacao = 'O HIIT e a musculação são excelentes para acelerar a queima de gordura. Vem treinar com a gente!'
    } else {
      classificacao = 'Obesidade'
      recomendacao = 'Comece com acompanhamento personalizado. Nossos profissionais vão montar um plano sob medida para você.'
    }
    setResultadoImc({ imc: imc.toFixed(1), classificacao, recomendacao })
  }

  return (
    <div className="bg-[#0f0f0f] font-sans text-white">
      {/* ---------- Header ---------- */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-800 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight"
          >
            <Dumbbell className="h-5 w-5 text-orange-500" />
            <span className="text-white">{nomeAcademia}</span>
          </button>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => rolarPara(n.id)}
                className="text-gray-300 transition-colors hover:text-orange-400"
              >
                {n.rotulo}
              </button>
            ))}
            <button
              onClick={abrirLead}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
            >
              Agende sua Aula
            </button>
          </nav>

          <button
            onClick={() => setMenuAberto((v) => !v)}
            className="text-gray-300 md:hidden"
            aria-label="Abrir menu"
          >
            {menuAberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuAberto && (
          <div className="flex flex-col gap-3 border-t border-gray-800 bg-[#111] px-4 py-4 text-sm md:hidden">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setMenuAberto(false)
                  rolarPara(n.id)
                }}
                className="py-1 text-left text-gray-300 hover:text-orange-400"
              >
                {n.rotulo}
              </button>
            ))}
            <button
              onClick={abrirLead}
              className="mt-1 rounded-lg bg-orange-500 py-2.5 font-bold text-white transition hover:bg-orange-600"
            >
              Agende sua Aula Experimental
            </button>
          </div>
        )}
      </header>

      {/* ---------- Hero ---------- */}
      <section
        id="hero"
        className="relative flex min-h-screen items-center overflow-hidden pt-16"
        style={{ background: `url(${fundoAcademia}) center center / cover no-repeat` }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-orange-500 blur-[120px]" />
          <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-orange-600 blur-[150px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="mb-6 inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-400">
              <MapPin className="mr-1 inline h-3 w-3" /> Andradina-SP
            </span>
            <h1 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Transforme seu corpo e sua saúde
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                no coração de Andradina
              </span>
            </h1>
            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
              Metodologia comprovada para resultados reais. Equipamentos modernos,
              ambiente climatizado e profissionais qualificados prontos para te
              acompanhar do início ao fim.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={abrirLead}
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-orange-500 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-orange-500/30 transition hover:bg-orange-600 hover:shadow-orange-500/50"
              >
                <MessageCircle className="h-5 w-5" /> Agende sua Aula Experimental
              </button>
              <button
                onClick={() => rolarPara('modalidades')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-600 px-8 py-4 text-lg font-medium text-gray-300 transition hover:border-orange-400 hover:text-orange-400"
              >
                Ver Modalidades <ArrowDown className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-12 flex flex-wrap gap-6 text-sm text-gray-500">
              <span>
                <CheckCircle2 className="mr-1 inline h-4 w-4 text-orange-500" /> 12+
                anos de experiência
              </span>
              <span>
                <CheckCircle2 className="mr-1 inline h-4 w-4 text-orange-500" /> +1.200
                alunos ativos
              </span>
              <span>
                <CheckCircle2 className="mr-1 inline h-4 w-4 text-orange-500" /> Nota
                4.9 no Google
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Modalidades ---------- */}
      <section id="modalidades" className="bg-[#0f0f0f] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-orange-500">
              Nossas Modalidades
            </span>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Escolha o treino ideal para você
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-400">
              Do clássico ao moderno, temos a modalidade certa para seu objetivo.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icone: Dumbbell,
                titulo: 'Musculação e Hipertrofia',
                texto:
                  'Equipamentos modernos e acompanhamento profissional para ganho de massa muscular, definição e força.',
                itens: ['Anilhas olímpicas', 'Máquinas articuladas', 'Treino personalizado']
              },
              {
                icone: Flame,
                titulo: 'Treinamento HIIT',
                texto:
                  'Queima de gordura rápida com treinos intervalados de alta intensidade. Resultados visíveis em poucas semanas.',
                itens: ['Queima calórica acelerada', 'Treinos de 30 min', 'Metabolismo elevado']
              },
              {
                icone: Users,
                titulo: 'Aulas Coletivas',
                texto:
                  'Jump, Spinning, Ginástica Localizada e muito mais. Energia coletiva que motiva e transforma.',
                itens: ['Jump', 'Spinning', 'Localizada + Alongamento']
              }
            ].map((m) => (
              <div
                key={m.titulo}
                className="rounded-2xl border border-gray-800 bg-[#1a1a1a] p-8 text-center transition hover:-translate-y-1 hover:border-orange-500/40"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 text-3xl text-orange-500">
                  <m.icone className="h-7 w-7" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{m.titulo}</h3>
                <p className="mb-5 text-sm leading-relaxed text-gray-400">{m.texto}</p>
                <ul className="space-y-1.5 text-xs text-gray-500">
                  {m.itens.map((i) => (
                    <li key={i}>
                      <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5 text-orange-500" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Estrutura ---------- */}
      <section id="estrutura" className="bg-[#0a0a0a] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-orange-500">
              Nossa Estrutura
            </span>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Diferenciais que fazem a diferença
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { icone: GraduationCap, titulo: 'Prof. Qualificados', texto: 'Educação física especializada e acompanhamento individual' },
              { icone: Snowflake, titulo: 'Ambiente Climatizado', texto: 'Conforto térmico em todos os ambientes da academia' },
              { icone: Settings, titulo: 'Equipamentos de Ponta', texto: 'Máquinas modernas e manutenção preventiva constante' },
              { icone: HeartPulse, titulo: 'Acompanhamento Personalizado', texto: 'Plano de treino sob medida para seu objetivo' }
            ].map((e) => (
              <div
                key={e.titulo}
                className="rounded-xl border border-gray-800 bg-[#1a1a1a] p-6 text-center transition hover:-translate-y-1 hover:border-orange-500/40"
              >
                <e.icone className="mb-3 h-8 w-8 text-orange-500" />
                <h3 className="mb-1 text-sm font-bold text-white">{e.titulo}</h3>
                <p className="text-xs text-gray-500">{e.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Depoimentos ---------- */}
      <section id="depoimentos" className="bg-[#0f0f0f] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-orange-500">
              Depoimentos
            </span>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Quem treina aqui recomenda
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                texto:
                  '"Melhor academia de Andradina! Em 3 meses já vi resultados incríveis. Os professores são muito atenciosos."',
                iniciais: 'CL',
                nome: 'Carlos Lima',
                periodo: 'Aluno há 8 meses'
              },
              {
                texto:
                  '"As aulas de Jump e Spinning são demais! Ambiente climatizado e equipamentos novos fazem toda diferença."',
                iniciais: 'AM',
                nome: 'Ana Martins',
                periodo: 'Aluna há 1 ano'
              },
              {
                texto:
                  '"Treino há 5 anos e nunca vi acompanhamento tão personalizado. O HIIT mudou meu condicionamento físico!"',
                iniciais: 'RF',
                nome: 'Rafael Fernandes',
                periodo: 'Aluno há 2 anos'
              }
            ].map((d) => (
              <div
                key={d.nome}
                className="rounded-2xl border border-gray-800 bg-[#1a1a1a] p-6 transition hover:-translate-y-1 hover:border-orange-500/40"
              >
                <Estrelas />
                <p className="mb-4 text-sm leading-relaxed text-gray-300">{d.texto}</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-sm font-bold text-orange-500">
                    {d.iniciais}
                  </div>
                  <div>
                    <strong className="text-sm text-white">{d.nome}</strong>
                    <span className="block text-xs text-gray-500">{d.periodo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Calculadora de IMC ---------- */}
      <section id="calculadora" className="bg-[#0a0a0a] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-orange-500">
              Ferramenta Interativa
            </span>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Calculadora de IMC
            </h2>
            <p className="mt-3 text-gray-400">
              Descubra seu Índice de Massa Corporal e receba uma recomendação de treino.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#161616] p-8 sm:p-10">
            <div className="mb-6 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-400">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  value={altura}
                  min={100}
                  max={250}
                  onChange={(e) => setAltura(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-700 bg-[#1f2937] px-4 py-3 text-white outline-none transition focus:border-orange-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-400">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  value={peso}
                  min={30}
                  max={250}
                  onChange={(e) => setPeso(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-700 bg-[#1f2937] px-4 py-3 text-white outline-none transition focus:border-orange-500"
                />
              </div>
            </div>
            <div className="mb-8">
              <label className="mb-2 block text-sm font-medium text-gray-400">
                Idade: <span className="font-bold text-white">{idade}</span> anos
              </label>
              <input
                type="range"
                min={12}
                max={80}
                value={idade}
                onChange={(e) => setIdade(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
            <button
              onClick={calcularImc}
              className="w-full rounded-xl bg-orange-500 py-3.5 text-lg font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
            >
              <Calculator className="mr-2 inline h-5 w-5" /> Calcular IMC
            </button>
            {resultadoImc && (
              <div className="mt-6">
                <div className="rounded-xl bg-[#1f2937] p-5 text-center">
                  <p className="text-sm text-gray-400">Seu IMC é</p>
                  <p className="mt-1 text-4xl font-extrabold text-white">
                    {resultadoImc.imc}
                  </p>
                  <p className="mt-1 font-semibold text-orange-400">
                    {resultadoImc.classificacao}
                  </p>
                  <p className="mt-3 text-sm text-gray-400">
                    {resultadoImc.recomendacao}
                  </p>
                </div>
                <button
                  onClick={abrirLead}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 py-3.5 text-lg font-bold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-yellow-600"
                >
                  <MessageCircle className="h-5 w-5" /> Quero minha Aula Experimental
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Mapa ---------- */}
      <section className="bg-[#0f0f0f] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-orange-500">
              Onde Estamos
            </span>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Venha nos conhecer
            </h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-800 shadow-xl">
            <iframe
              title="Mapa - Andradina SP"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d237849.04191861405!2d-51.38965369327448!3d-20.898933685717724!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x949a3ff3966bb5a7%3A0xc3c3282dc8675713!2sAndradina%2C%20SP!5e0!3m2!1spt-BR!2sbr!4v1744416000000!5m2!1spt-BR!2sbr"
              width="100%"
              height="380"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-gray-800 bg-[#0a0a0a] pb-8 pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 grid gap-10 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2 text-lg font-extrabold tracking-tight">
                <Dumbbell className="h-5 w-5 text-orange-500" />
                <span className="text-white">{nomeAcademia}</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">
                Sua academia de referência em Andradina-SP. Transformando vidas
                através do movimento.
              </p>
              <div className="mt-5 flex gap-3">
                {[
                  { icone: Instagram, rotulo: 'Instagram' },
                  { icone: Facebook, rotulo: 'Facebook' },
                  { icone: Youtube, rotulo: 'YouTube' },
                  { icone: Clapperboard, rotulo: 'TikTok' }
                ].map((s) => (
                  <a
                    key={s.rotulo}
                    href="#"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-orange-500 hover:text-white"
                    aria-label={s.rotulo}
                  >
                    <s.icone className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-white">Modalidades</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                {['Musculação', 'HIIT', 'Jump', 'Spinning', 'Localizada'].map((m) => (
                  <li key={m}>
                    <button
                      onClick={() => rolarPara('modalidades')}
                      className="transition-colors hover:text-orange-400"
                    >
                      {m}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-white">Horários</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li>
                  <Clock className="mr-1 inline h-3.5 w-3.5 text-orange-500" />
                  <span className="text-gray-400">Seg a Sex:</span> 06h - 22h
                </li>
                <li>
                  <Clock className="mr-1 inline h-3.5 w-3.5 text-orange-500" />
                  <span className="text-gray-400">Sábado:</span> 08h - 14h
                </li>
                <li>
                  <Clock className="mr-1 inline h-3.5 w-3.5 text-orange-500" />
                  <span className="text-gray-400">Domingo:</span> Fechado
                </li>
                <li className="pt-2 text-xs text-gray-600">
                  * Feriados com horário especial
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-white">Endereço</h4>
              <address className="text-sm leading-relaxed text-gray-500 not-italic">
                <MapPin className="mr-1 inline h-3.5 w-3.5 text-orange-500" />
                Rua Ademar de Barros, 456
                <br />
                Centro, Andradina - SP
                <br />
                CEP 16900-000
              </address>
              <p className="mt-3 text-sm text-gray-500">
                <Phone className="mr-1 inline h-3.5 w-3.5 text-orange-500" /> (18)
                99999-9999
              </p>
              <p className="mt-1 text-sm text-gray-500">
                <Mail className="mr-1 inline h-3.5 w-3.5 text-orange-500" />{' '}
                contato@ironfitandradina.com.br
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
            <p>
              © {new Date().getFullYear()} {nomeAcademia}. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* ---------- WhatsApp float ---------- */}
      <button
        onClick={abrirLead}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-xl shadow-green-500/30 transition hover:scale-105 hover:bg-green-600 md:bottom-6"
        aria-label="Fale conosco pelo WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {/* ---------- Modal de lead ---------- */}
      {modalLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => !salvando && setModalLead(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-800 bg-[#111]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h3 className="text-lg font-bold text-white">
                <CalendarDays className="mr-2 inline h-5 w-5 text-orange-500" />
                Agende sua Aula Experimental
              </h3>
              <button
                onClick={() => setModalLead(false)}
                disabled={salvando}
                className="text-gray-500 transition hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={enviarLead} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Seu nome completo
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome"
                  className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-2.5 text-white outline-none transition placeholder:text-gray-600 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  WhatsApp com DDD
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-2.5 text-white outline-none transition placeholder:text-gray-600 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Data preferida (opcional)
                </label>
                <input
                  type="date"
                  value={data}
                  min={hoje}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-2.5 text-white outline-none transition [color-scheme:dark] focus:border-orange-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Melhor horário (opcional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {HORARIOS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHorario(h)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        horario === h
                          ? 'border-orange-500 bg-orange-500 text-white'
                          : 'border-gray-700 text-gray-400 hover:border-orange-500/60 hover:text-orange-400'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 disabled:opacity-60"
              >
                {salvando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <MessageCircle className="h-5 w-5" />
                )}
                Confirmar pelo WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
