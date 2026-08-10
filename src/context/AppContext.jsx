// =====================================================================
// Contexto global da aplicação
// - White-Label: nome da academia, logo e cor primária (Supabase + cache)
// - Tema claro/escuro/sistema (nativo)
// =====================================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { supabase } from '../lib/supabase'
import { aplicarPaleta } from '../utils/colors'

const AppContext = createContext(null)

const CONFIG_INICIAL = {
  id: 1,
  nome_academia: 'Minha Academia',
  logo_url: '',
  cor_primaria: '#16a34a'
}

export function AppProvider({ children }) {
  const [config, setConfig] = useState(CONFIG_INICIAL)
  const [carregando, setCarregando] = useState(true)
  const [tema, setTema] = useState(
    () => localStorage.getItem('tema_academia') || 'auto'
  )

  // ----- Aplica o tema (claro / escuro / sistema) via classe no <html> -----
  useEffect(() => {
    const root = document.documentElement
    const aplicar = () => {
      const sistemaEscuro = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
      root.classList.toggle('dark', tema === 'dark' || (tema === 'auto' && sistemaEscuro))
    }
    aplicar()
    localStorage.setItem('tema_academia', tema)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    if (tema === 'auto') media.addEventListener('change', aplicar)
    return () => media.removeEventListener('change', aplicar)
  }, [tema])

  // ----- Carrega a configuração do Supabase (fallback: localStorage) -----
  useEffect(() => {
    let ativo = true
    ;(async () => {
      let local = null
      try {
        local = JSON.parse(localStorage.getItem('config_academia'))
      } catch {
        /* ignore */
      }
      const { data } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

      if (!ativo) return
      const base = data || local || CONFIG_INICIAL
      const nova = { ...CONFIG_INICIAL, ...base }
      setConfig(nova)
      aplicarPaleta(nova.cor_primaria || CONFIG_INICIAL.cor_primaria)
      // Sincroniza theme-color do navegador com a cor primária
      const meta = document.getElementById('meta-theme')
      if (meta) meta.setAttribute('content', nova.cor_primaria)
      setCarregando(false)
    })()
    return () => {
      ativo = false
    }
  }, [])

  // ----- Salva a configuração (Upsert na linha id=1) e aplica em tempo real -----
  const atualizarConfig = useCallback(
    async (patch) => {
      const nova = {
        ...config,
        ...patch,
        updated_at: new Date().toISOString()
      }
      setConfig(nova)
      localStorage.setItem('config_academia', JSON.stringify(nova))
      if (patch.cor_primaria) {
        aplicarPaleta(patch.cor_primaria)
        const meta = document.getElementById('meta-theme')
        if (meta) meta.setAttribute('content', patch.cor_primaria)
      }
      const { error } = await supabase.from('configuracoes').upsert(nova)
      if (error) throw error
      return nova
    },
    [config]
  )

  const value = useMemo(
    () => ({ config, carregando, tema, setTema, atualizarConfig }),
    [config, carregando, tema, atualizarConfig]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>')
  return ctx
}