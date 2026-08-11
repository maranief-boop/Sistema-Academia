// =====================================================================
// Hook do Macrociclo — planejamento de 12 semanas por aluno
// Tabela "macrociclo" (uma linha por aluno, semanas_json = array)
// =====================================================================
import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

const SEMANAS_VAZIAS = Array.from({ length: 12 }, (_, i) => ({
  semana: i + 1,
  foco: '',
  volume: '',
  intensidade: '',
  obs: ''
}))

export function useMacrociclo() {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async (alunoId) => {
    if (!alunoId) {
      setDados(null)
      return null
    }
    setCarregando(true)
    const { data, error } = await supabase
      .from('macrociclo')
      .select('*')
      .eq('aluno_id', alunoId)
      .maybeSingle()
    // Tabela inexistente/sem registro não é erro grave
    setDados(error ? null : (data || null))
    setCarregando(false)
    return data || null
  }, [])

  const salvar = useCallback(async (alunoId, semanas) => {
    const { data, error } = await supabase
      .from('macrociclo')
      .upsert(
        { aluno_id: alunoId, semanas_json: semanas },
        { onConflict: 'aluno_id' }
      )
      .select()
      .single()
    if (error) throw new Error(error.message)
    setDados(data)
    return data
  }, [])

  return { dados, carregando, carregar, salvar, SEMANAS_VAZIAS }
}
