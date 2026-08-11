// =====================================================================
// Hook de dados do CRM — usa a MESMA instância do Supabase do sistema
// (src/lib/supabase.js). Substituto do Firestore usado no site/CRM antigo.
// =====================================================================
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useLeads() {
  const [leads, setLeads] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('data_captura', { ascending: false })
    if (error) {
      setErro(error.message)
    } else {
      setLeads(data || [])
      setErro(null)
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const criar = useCallback(
    async (dados) => {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          nome: dados.nome,
          telefone: dados.telefone || null,
          origem: dados.origem || 'Site Institucional',
          stage: dados.stage || 'novo',
          notas: dados.notas || null,
          data_preferida: dados.data_preferida || null,
          horario_preferido: dados.horario_preferido || null
        })
        .select()
        .single()
      if (error) return { erro: error.message }
      setLeads((prev) => [data, ...prev])
      return { dados: data }
    },
    []
  )

  const atualizar = useCallback(async (id, mudancas) => {
    const { data, error } = await supabase
      .from('leads')
      .update(mudancas)
      .eq('id', id)
      .select()
      .single()
    if (error) return { erro: error.message }
    setLeads((prev) => prev.map((l) => (l.id === id ? data : l)))
    return { dados: data }
  }, [])

  const remover = useCallback(async (id) => {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) return { erro: error.message }
    setLeads((prev) => prev.filter((l) => l.id !== id))
    return {}
  }, [])

  return { leads, carregando, erro, carregar, criar, atualizar, remover }
}
