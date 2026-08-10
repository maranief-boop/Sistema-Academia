// =====================================================================
// Configurações — Identidade Visual White-Label
// Nome da academia, logotipo (URL) e cor primária aplicados em tempo real
// =====================================================================
import { useState } from 'react'
import { Building2, Image as ImageIcon, Palette, Save, Rocket } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { Button, Card, Input, Label } from '../components/ui'

export default function Configuracoes() {
  const { config, atualizarConfig } = useApp()
  const { toast } = useToast()

  const [form, setForm] = useState({
    nome_academia: config.nome_academia,
    logo_url: config.logo_url || '',
    cor_primaria: config.cor_primaria
  })
  const [salvando, setSalvando] = useState(false)

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const salvar = async (ev) => {
    ev.preventDefault()
    if (!form.nome_academia.trim()) {
      toast('Informe o nome da academia.', 'aviso')
      return
    }
    setSalvando(true)
    try {
      await atualizarConfig({
        nome_academia: form.nome_academia.trim(),
        logo_url: form.logo_url.trim(),
        cor_primaria: form.cor_primaria
      })
      toast('Identidade visual atualizada!')
    } catch (e) {
      toast(e.message || 'Erro ao salvar configurações.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Configurações
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Personalize a identidade visual da sua academia (white-label).
        </p>
      </div>

      {/* ---------- Pré-visualização em tempo real ---------- */}
      <Card className="overflow-hidden">
        <div
          className="flex items-center gap-3 px-5 py-4 text-white"
          style={{ backgroundColor: form.cor_primaria }}
        >
          {form.logo_url ? (
            <img
              src={form.logo_url}
              alt="Logo"
              className="h-11 w-11 rounded-xl bg-white/20 object-cover ring-2 ring-white/40"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/25 text-xl font-extrabold ring-2 ring-white/40">
              {(form.nome_academia || 'A')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">
              {form.nome_academia || 'Nome da Academia'}
            </p>
            <p className="text-xs opacity-90">
              Pré-visualização — alterações aplicadas em tempo real
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <form onSubmit={salvar} className="space-y-5">
          <div>
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Nome da Academia
            </Label>
            <Input
              value={form.nome_academia}
              onChange={(e) => set('nome_academia', e.target.value)}
              placeholder="Ex.: Academia Fitness Center"
            />
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Logotipo (URL da imagem)
            </Label>
            <Input
              value={form.logo_url}
              onChange={(e) => set('logo_url', e.target.value)}
              placeholder="https://sua-imagem.com/logo.png"
              inputMode="url"
            />
            <p className="mt-1.5 text-xs text-zinc-400">
              Deixe em branco para usar a letra inicial como marca.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" /> Cor Primária
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.cor_primaria}
                  onChange={(e) => set('cor_primaria', e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <Input
                  value={form.cor_primaria}
                  onChange={(e) =>
                    set('cor_primaria', /^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(e.target.value) ? e.target.value : form.cor_primaria)
                  }
                  className="font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Button type="submit" carregando={salvando}>
              <Save className="h-4 w-4" />
              Salvar configurações
            </Button>
          </div>
        </form>
      </Card>

      {/* ---------- Dicas de publicação ---------- */}
      <Card className="border-dashed bg-zinc-50 p-5 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary-100 p-2 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
            <Rocket className="h-5 w-5" />
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            <p className="font-bold text-zinc-900 dark:text-zinc-100">
              Publicando sua marca
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-1">
              <li>A cor é gerada em uma paleta completa (tom + contraste) automaticamente.</li>
              <li>O tema claro/escuro segue o dispositivo ou a preferência manual (ícone no topo).</li>
              <li>As configurações são salvas no Supabase e reutilizadas em todos os dispositivos.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}