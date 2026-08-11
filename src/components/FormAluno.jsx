// =====================================================================
// Formulário de cadastro/edição de aluno (usado em Alunos e Financeiro)
// =====================================================================
import { useState } from 'react'
import { Button, Input, Label, Select } from './ui'
import { paraInputDate } from '../utils/format'

const ALUNO_VAZIO = {
  nome: '',
  telefone: '',
  cpf: '',
  plano_valor: '',
  data_vencimento: '',
  status_pagamento: 'em_dia'
}

export default function FormAluno({ inicial = null, salvando, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial
      ? {
          ...ALUNO_VAZIO,
          ...inicial,
          plano_valor: inicial.plano_valor != null ? String(inicial.plano_valor) : '',
          data_vencimento: paraInputDate(inicial.data_vencimento)
        }
      : ALUNO_VAZIO
  )
  const [erros, setErros] = useState({})

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const validar = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Informe o nome do aluno'
    if (form.plano_valor === '' || Number(form.plano_valor) < 0)
      e.plano_valor = 'Valor inválido'
    setErros(e)
    return Object.keys(e).length === 0
  }

  const enviar = (ev) => {
    ev.preventDefault()
    if (!validar()) return
    onSalvar({
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      cpf: form.cpf.trim(),
      plano_valor: Number(form.plano_valor || 0),
      data_vencimento: form.data_vencimento || null,
      status_pagamento: form.status_pagamento
    })
  }

  const campoErro = (nome) =>
    erros[nome] ? (
      <p className="mt-1 text-xs font-medium text-red-600">{erros[nome]}</p>
    ) : null

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <Label>Nome completo *</Label>
        <Input
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Ex.: João da Silva"
          autoFocus
        />
        {campoErro('nome')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Telefone / WhatsApp</Label>
          <Input
            value={form.telefone}
            onChange={(e) => set('telefone', e.target.value)}
            placeholder="(11) 99999-9999"
            inputMode="tel"
          />
        </div>
        <div>
          <Label>CPF (acesso do aluno)</Label>
          <Input
            value={form.cpf}
            onChange={(e) => set('cpf', e.target.value)}
            placeholder="123.456.789-00"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Valor da mensalidade (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.plano_valor}
            onChange={(e) => set('plano_valor', e.target.value)}
            placeholder="0,00"
          />
          {campoErro('plano_valor')}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Data de vencimento</Label>
          <Input
            type="date"
            value={form.data_vencimento}
            onChange={(e) => set('data_vencimento', e.target.value)}
          />
        </div>
        <div>
          <Label>Status de pagamento</Label>
          <Select
            value={form.status_pagamento}
            onChange={(e) => set('status_pagamento', e.target.value)}
          >
            <option value="em_dia">Em dia</option>
            <option value="vencendo">Vencendo</option>
            <option value="inadimplente">Inadimplente</option>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variante="secundario" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" carregando={salvando}>
          {inicial ? 'Salvar alterações' : 'Cadastrar aluno'}
        </Button>
      </div>
    </form>
  )
}