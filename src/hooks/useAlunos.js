// =====================================================================
// Hook de alunos — CRUD real via Supabase (tabela `alunos`)
// =====================================================================
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAlunos() {
  const [alunos, setAlunos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .order('nome')
    if (error) setErro(error.message)
    else setAlunos(data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // INSERT
  const criar = useCallback(async (payload) => {
    const { data, error } = await supabase
      .from('alunos')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    setAlunos((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    return data
  }, [])

  // UPDATE
  const atualizar = useCallback(async (id, payload) => {
    const { data, error } = await supabase
      .from('alunos')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setAlunos((prev) => prev.map((a) => (a.id === id ? data : a)))
    return data
  }, [])

  // DELETE
  const remover = useCallback(async (id) => {
    const { error } = await supabase.from('alunos').delete().eq('id', id)
    if (error) throw error
    setAlunos((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return { alunos, carregando, erro, carregar, criar, atualizar, remover }
}