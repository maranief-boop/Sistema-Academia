// =====================================================================
// Hook de check-ins — frequência em tempo real (tabela `checkins`)
// =====================================================================
import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useCheckins() {
  const [checkins, setCheckins] = useState([])
  const [carregando, setCarregando] = useState(false)

  // SELECT — últimos 500 registros (suficiente para métricas)
  const carregarCheckins = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('checkins')
      .select('id, aluno_id, data_hora')
      .order('data_hora', { ascending: false })
      .limit(500)
    if (!error) setCheckins(data || [])
    setCarregando(false)
    return data || []
  }, [])

  // INSERT — registra presença do aluno agora
  const registrarCheckin = useCallback(async (alunoId) => {
    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('checkins')
      .insert({ aluno_id: alunoId, data_hora: agora })
      .select()
      .single()
    if (error) throw error
    setCheckins((prev) => [data, ...prev])
    return data
  }, [])

  // Verifica se o aluno já fez check-in hoje
  const fezCheckinHoje = useCallback(
    (alunoId) => {
      const hoje = new Date().toDateString()
      return checkins.some((c) => {
        if (c.aluno_id !== alunoId) return false
        return new Date(c.data_hora).toDateString() === hoje
      })
    },
    [checkins]
  )

  return { checkins, carregando, carregarCheckins, registrarCheckin, fezCheckinHoje }
}