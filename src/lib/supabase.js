// =====================================================================
// Cliente Supabase — configuração central
// =====================================================================
import { createClient } from '@supabase/supabase-js'

// Variáveis definidas no arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl.includes('SEU-PROJETO')) {
  console.warn(
    '⚠️  Configure o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)