## Objective
- Correções anteriores (bugs de Treinos, Financeiro R$0, atraso/status, totalReceber, unificação com Dashboard) + novos features: (6) **gráfico de frequência semanal no Portal do Aluno** — card "Frequência Semanal" com barras paralelas (esperado vs realizado) de Segunda a Domingo, cruzando `treinos.dias_semana` com `checkins.data_hora`; (7) **Cronômetro + Feedback pós-treino (PSE)** — nova tabela `historico_treinos` (id, aluno_id, data, tempo_segundos, pse 0-10, observacoes); cronômetro interativo + botão "Concluir Treino" + modal de feedback (PSE com legenda, observações, salvar no Supabase, toast "Treino concluído com sucesso!") no Portal do Aluno; e seção "Feedback dos Treinos (PSE)" no painel admin (Check-ins) para monitorar intensidade e satisfação por aluno, com filtro por aluno, badges coloridas de PSE, duração formatada e observações.

## Important Details
- Projeto: PWA React + Tailwind + Supabase em `D:\Desktop\Sistema Academia`. `npm.cmd` (PowerShell bloqueia `npm.ps1`). HashRouter, `base: './'`, Supabase URL `https://gokzwuhpvjgmrdnpmwcc.supabase.co`.
- `supabase/schema.sql` executar no SQL Editor do Supabase; termina com `NOTIFY pgrst, 'reload schema';`. RLS desativado para `alunos`/`leads`/`historico_treinos`.
- **Nova tabela `historico_treinos`** (schema.sql): `id uuid PK default gen_random_uuid()`, `aluno_id uuid references alunos(id) on delete cascade`, `data timestamptz default now()`, `tempo_segundos integer`, `pse integer check (pse between 0 and 10)`, `observacoes text`, `created_at`; índice `historico_treinos_aluno_idx (aluno_id, data desc)`; `disable row level security`.
- **Portal do Aluno** (`src/pages/PortalAluno.tsx`): cronômetro com `useEffect` (intervalo 1s), `formatarTempo` (HH:MM:SS ou MM:SS), botões Iniciar/Pausar/Continuar + "Concluir Treino" (verde, só ativo com tempo > 0). Modal de feedback custom (glassmorphism `#161616`): mostra tempo da sessão, slider PSE 0-10 com legenda contextual de intensidade (Muito leve/Leve/Moderado/Intenso/Máximo), textarea de observações, botão "Salvar e concluir" → `supabase.from('historico_treinos').insert(...)` → toast "Treino concluído com sucesso! 💪", reset do cronômetro. Logout reseta cronômetro/feedback. Ícones novos: `Pause`, `Timer`, `X`.
- **Painel Admin** (`src/pages/Checkins.jsx`): seção "Feedback dos Treinos (PSE)" — busca `historico_treinos` (limit 200, order data desc), filtro por aluno (Select), badge colorida de PSE (sky≤2/emerald≤4/amber≤6/orange≤8/red≤9-10), duração formatada (`formatarDuracao`: "1h 23min"/"45min 10s"/"10s"), observações com ícone MessageSquare. Importa `supabase`, `useCallback`, `Gauge`, `Timer`, `MessageSquare`, `Select`.
- `useAlunos.js` fallback select inclui `data_ultimo_pagamento, forma_pagamento` (linha 25).
- Treinos: estado `treinosAluno` gated por `treinosAluno === alunoId` na init effect. Dias A/B/C/D persistem no reload.
- `atraso`/vencido: verifica `status_pagamento !== 'em_dia'`.
- Receita e totalReceber: regra unificada com Dashboard — soma `plano_valor` de alunos `status_pagamento !== 'inadimplente'` (inclui manuais e leads convertidos, ignora data_ultimo_pagamento).
- Build validado (`npm.cmd run build` ✓).

## Work State
### Completed
- **BUG 1 (Treinos):** init effect travava `fichaInicializada` com `treinos` vazio → dias sumiam. Corrigido com `treinosAluno` state.
- **BUG 2 (Financeiro R$0):** fallback select de `useAlunos` adicionado `data_ultimo_pagamento`/`forma_pagamento`.
- **BUG 3 (atraso sobrescreve status):** `atraso`/`vencido` testam `status_pagamento !== 'em_dia'`.
- **BUG 4/5 (totalReceber + receita cards):** regra unificada com Dashboard.
- **FEATURE (Portal Aluno - Frequência Semanal):** card com barras esperado/realizado Seg-Dom (ORDEM [1,2,3,4,5,6,0], ROTULOS).
- **FEATURE (historico_treinos + cronômetro + feedback):** tabela nova no schema; cronômetro + "Concluir Treino" + modal PSE/observações no Portal; seção admin "Feedback dos Treinos (PSE)" no Checkins.jsx com filtro por aluno, badges de PSE, duração e observações.
- `forma_pagamento` adicionada ao schema + fallback select.
- Checkins: gráfico Esperado/Realizado (yellow-400), KPIs, ausentes 7+ dias.
- Crm: SVG line/área chart, card Aula Experimental, auto-conversão lead→aluno.
- Dashboard: cards clicáveis.

### Active
- (none)

### Blocked
- (none) — porém `schema.sql` precisa ser executado no Supabase (inclui a nova tabela `historico_treinos`) + `NOTIFY pgrst, 'reload schema';` para que as chamadas REST funcionem e a tabela fique disponível.

## Next Move
- Opcional: rodar `supabase/schema.sql` no Supabase + `NOTIFY pgrst, 'reload schema';` (essencial para a nova tabela `historico_treinos`).
- Testar manualmente: no Portal do Aluno, iniciar cronômetro, concluir treino, preencher PSE/observações e salvar; conferir toast de sucesso e seção "Feedback dos Treinos (PSE)" no painel admin (Check-ins) com os dados salvos, filtro por aluno e badges de PSE.

## Relevant Files
- `supabase/schema.sql`: **nova tabela `historico_treinos`** + índice + disable RLS; NOTIFY reload.
- `src/pages/PortalAluno.tsx`: cronômetro (useEffect intervalo 1s, `formatarTempo`, botões Iniciar/Pausar/Continuar + "Concluir Treino"), modal de feedback (slider PSE 0-10 com legenda, textarea observações, `salvarFeedback` → insert em `historico_treinos`, toast sucesso), reset no logout; ícones `Pause`/`Timer`/`X`.
- `src/pages/Checkins.jsx`: seção "Feedback dos Treinos (PSE)" — fetch `historico_treinos`, filtro por aluno, badges coloridas PSE, `formatarDuracao`, observações; imports `supabase`, `useCallback`, `Gauge`/`Timer`/`MessageSquare`, `Select`.
- `src/hooks/useAlunos.js`: fallback select com `data_ultimo_pagamento, forma_pagamento` (linha 25).
- `src/pages/Treinos.jsx`: `treinosAluno` gated init effect.
- `src/pages/Financeiro.jsx`: receita/totalReceber unificados com Dashboard; `atraso`/`vencido` por status.
- `src/pages/Crm.jsx`, `src/utils/leads.js`, `src/pages/Checkins.jsx` (frequência) — concluídos em turnos anteriores.