// =====================================================================
// Hook de treinos — ficha por aluno dividida por dia_semana (A, B, C...)
// exercicios_json: [{ nome, series, repeticoes, carga, url_video }]
// Campos de ficha: dias_semana (ex.: "Segunda, Quarta, Sexta") e restricoes
//
// NOTA DE RESILIÊNCIA: se o banco ainda não tiver as colunas novas
// (dias_semana/restricoes), o salvamento dos exercícios continua
// funcionando — apenas os campos da ficha ficam indisponíveis até o
// schema ser aplicado.
// =====================================================================
import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

// Detecta erros do PostgREST quando uma coluna não existe na tabela
function colunasInexistentes(erro) {
  const texto = `${erro?.message || ''} ${erro?.details || ''} ${erro?.hint || ''}`
  return (
    /column .* of (relation|table) .* does not exist/i.test(texto) ||
    /could not find the .* column/i.test(texto) ||
    /column .* does not exist/i.test(texto)
  )
}

function mensagemAmigavel(erro) {
  if (colunasInexistentes(erro)) {
    return 'O banco ainda não tem as colunas novas da ficha. Execute o supabase/schema.sql atualizado no SQL Editor do Supabase e rode: NOTIFY pgrst, \'reload schema\';'
  }
  return erro?.message || 'Erro ao salvar no Supabase.'
}

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

  // SELECT — busca TODOS os treinos (usado para cruzar dias de treino
  // com check-ins na página de Frequência). Retorna só o necessário.
  const carregarTodos = useCallback(async () => {
    const { data, error } = await supabase
      .from('treinos')
      .select('aluno_id, dias_semana')
    if (error) return []
    return data || []
  }, [])

  // UPSERT — salva (cria ou atualiza) a lista de exercícios de um dia
  // `ficha` (opcional) carrega dias_semana/restricoes junto no registro
  const salvarDia = useCallback(async (alunoId, diaSemana, exercicios, ficha = {}) => {
    const base = {
      aluno_id: alunoId,
      dia_semana: diaSemana,
      exercicios_json: exercicios
    }
    const payload = { ...base }
    if (ficha.dias_semana != null) payload.dias_semana = ficha.dias_semana
    if (ficha.restricoes != null) payload.restricoes = ficha.restricoes

    let resultado = await supabase
      .from('treinos')
      .upsert(payload, { onConflict: 'aluno_id,dia_semana' })
      .select()
      .single()

    // Schema antigo (sem dias_semana/restricoes): salva apenas o essencial
    if (resultado.error && colunasInexistentes(resultado.error)) {
      resultado = await supabase
        .from('treinos')
        .upsert(base, { onConflict: 'aluno_id,dia_semana' })
        .select()
        .single()
    }

    const { data, error } = resultado
    if (error) throw new Error(mensagemAmigavel(error))
    setTreinos((prev) => {
      const restante = prev.filter((t) => t.dia_semana !== diaSemana)
      return [...restante, data].sort((a, b) =>
        a.dia_semana.localeCompare(b.dia_semana)
      )
    })
    return data
  }, [])

  // UPDATE — grava as RESTRIÇÕES (globais do aluno) em TODAS as linhas.
  // Os dias da semana agora são por card (gerenciados pelo salvarDia).
  const salvarFicha = useCallback(async (alunoId, ficha) => {
    const { data, error } = await supabase
      .from('treinos')
      .update({ restricoes: ficha.restricoes })
      .eq('aluno_id', alunoId)
      .select('id, dia_semana, dias_semana, restricoes')
    if (error) throw new Error(mensagemAmigavel(error))
    setTreinos((prev) =>
      prev.map((t) =>
        t.aluno_id === alunoId
          ? { ...t, restricoes: ficha.restricoes }
          : t
      )
    )
    return data || []
  }, [])

  // DELETE — remove o treino de um dia (quando fica vazio)
  const removerDia = useCallback(async (id) => {
    const { error } = await supabase.from('treinos').delete().eq('id', id)
    if (error) throw new Error(mensagemAmigavel(error))
    setTreinos((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return {
    treinos,
    carregando,
    carregarTreinos,
    carregarTodos,
    salvarDia,
    salvarFicha,
    removerDia
  }
}
