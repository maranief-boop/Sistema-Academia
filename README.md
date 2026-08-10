# 🏋️ Sistema Academia — PWA de Gestão

Aplicativo **PWA mobile-first** para academias de bairro e estúdios de personal trainer,
com integração real ao **Supabase** (PostgreSQL). Gestão de **Alunos, Financeiro com
cobrança via WhatsApp, Fichas de Treino e Check-ins de frequência**, com identidade
visual **white-label** (nome, logo e cor aplicados em tempo real) e tema **claro/escuro nativo**.

## 🚀 Como rodar

1. **Crie um projeto no [Supabase](https://supabase.com)** (grátis).
2. Abra o **SQL Editor** do projeto e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Copie `.env.example` para `.env` e preencha com os dados do seu projeto
   (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` — em *Project Settings > API*).
4. Instale e rode:

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Para produção:

```bash
npm run build
npm run preview
```

## 🧱 Stack

- React 18 + Vite 5
- Tailwind CSS 3 (dark mode por classe, palette `primary` dinâmica)
- Supabase JS (CRUD real: `alunos`, `treinos`, `checkins`, `configuracoes`)
- React Router (HashRouter — compatível com hospedagem estática/offline)
- Lucide React (ícones) · PWA (manifest + service worker)

## 🗂️ Estrutura

```
src/
├── lib/supabase.js          # Cliente Supabase
├── utils/                   # formatação, cores, WhatsApp, métricas
├── hooks/                   # useAlunos, useTreinos, useCheckins
├── context/AppContext.jsx   # white-label + tema
├── components/              # Layout, Toast, Modal, UI, StatusBadge...
└── pages/                   # Dashboard, Alunos, Financeiro, Treinos, Check-ins, Configurações
```

## 💬 Cobrança via WhatsApp

No módulo Financeiro, o botão verde gera o link `wa.me` com mensagem personalizada
(nome do aluno, valor, data de vencimento e nome da academia).

## 📱 PWA

O app é instalável (adicionar à tela inicial). Os ícones em SVG funcionam em navegadores
modernos; para máxima compatibilidade (iOS/dashboard), gere PNGs de 192px e 512px a partir
de `public/icon.svg` e adicione ao [`manifest.webmanifest`](public/manifest.webmanifest).

> ⚠️ **Segurança**: este projeto usa a chave **anon** com RLS desativado (tabelas criadas
> via SQL). Para produção, ative **Supabase Auth** e políticas de RLS no schema.