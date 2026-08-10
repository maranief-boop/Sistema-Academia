// =====================================================================
// Hook de treinos — ficha por aluno dividida por dia_semana (A, B, C...)
// exercicios_json: [{ nome, series, repeticoes, carga }]
// =====================================================================
import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useTreinos() {
  const [treinos, setTreinos] = useState([])
  const [carregando, setCarregando] = useState(false)

  // SELECT — busca todos os treinos de um aluno
  const carregarTreinos = useCallback(async (alunoId) => {
    if (!alunoId) {
      setTreinos([])
      return []
    }
    setCarregando(true)
    const { data, error } = await supabase
      .from('treinos')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('dia_semana')
    if (!error) setTreinos(data || [])
    setCarregando(false)
    return data || []
  }, [])

  // UPSERT — salva (cria ou atualiza) a lista de exercícios de um dia
  const salvarDia = useCallback(async (alunoId, diaSemana, exercicios) => {
    const { data, error } = await supabase
      .from('treinos')
      .upsert(
        {
          aluno_id: alunoId,
          dia_semana: diaSemana,
          exercicios_json: exercicios
        },
        { onConflict: 'aluno_id,dia_semana' }
      )
      .select()
      .single()
    if (error) throw error
    setTreinos((prev) => {
      const restante = prev.filter((t) => t.dia_semana !== diaSemana)
      return [...restante, data].sort((a, b) =>
        a.dia_semana.localeCompare(b.dia_semana)
      )
    })
    return data
  }, [])

  // DELETE — remove o treino de um dia (quando fica vazio)
  const removerDia = useCallback(async (id) => {
    const { error } = await supabase.from('treinos').delete().eq('id', id)
    if (error) throw error
    setTreinos((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { treinos, carregando, carregarTreinos, salvarDia, removerDia }
}