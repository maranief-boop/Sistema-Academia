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
    let { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('data_captura', { ascending: false })
    // Fallback resiliente: se o cache do PostgREST ainda não conhece alguma
    // coluna nova da tabela leads, o select('*') falha. Buscamos as colunas
    // base para que os leads antigos continuem aparecendo.
    if (error) {
      const { data: d2, error: e2 } = await supabase
        .from('leads')
        .select(
          'id, nome, telefone, origem, stage, notas, data_preferida, horario_preferido, data_captura, created_at'
        )
        .order('data_captura', { ascending: false })
      if (!e2) {
        data = d2
        error = null
      }
    }
    if (error) {
      setErro(error.message)
    } else {
      setLeads((data || []).filter(Boolean))
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
      if (!data) return { erro: 'Nenhum dado retornado' }
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
    if (data) setLeads((prev) => prev.map((l) => (l.id === id ? data : l)))
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
