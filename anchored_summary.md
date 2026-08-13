## Objective
- Correções anteriores (bugs de Treinos, Financeiro R$0, atraso/status, totalReceber, unificação com Dashboard) + novos features: (6) **gráfico de frequência semanal no Portal do Aluno** — card "Frequência" redimensionado para abas Semanal/Mensal/Anual filtrando `historico_treinos`; (7) **Cronômetro + Feedback pós-treino (PSE)** — tabela `historico_treinos`, cronômetro, modal de feedback (PSE + observações) no Portal e seção admin no Checkins.jsx; (8) **Evolução do PSE** — gráfico de linha (SVG) dos últimos 14 treinos concluídos no Portal do Aluno, com média de esforço e rótulos de data.

## Important Details
- Projeto: PWA React + Tailwind + Supabase em `D:\Desktop\Sistema Academia`. `npm.cmd` (PowerShell bloqueia `npm.ps1`). HashRouter, `base: './'`, Supabase URL `https://gokzwuhpvjgmrdnpmwcc.supabase.co`.
- `supabase/schema.sql` executar no SQL Editor do Supabase; termina com `NOTIFY pgrst, 'reload schema';`. RLS desativado para `alunos`/`leads`/`historico_treinos`.
- **Nova tabela `historico_treinos`** (schema.sql): `id uuid PK default gen_random_uuid()`, `aluno_id uuid references alunos(id) on delete cascade`, `data timestamptz default now()`, `tempo_segundos integer`, `pse integer check (pse between 0 and 10)`, `observacoes text`, `created_at`; índice `historico_treinos_aluno_idx (aluno_id, data desc)`; `disable row level security`.
- **Portal do Aluno** (`src/pages/PortalAluno.tsx`): carrega `historico_treinos` do aluno logado (ordenado por data asc) via `carregarHistorico`; **card Frequência** com abas Semanal/Mensal/Anual (estado `periodoFrequencia`): Semanal = 7 barras Seg-Dom (esperado do plano + realizado), Mensal = 5 barras (semanas do mês), Anual = 12 barras (meses), com totais por período; **card Evolução do PSE** com gráfico de linha SVG (`GraficoPse`), média de esforço, último treino e contagem, usa os últimos 14 treinos com PSE; refresh do histórico após `salvarFeedback`.
- **Admin (Checkins.jsx)**: seção "Feedback dos Treinos (PSE)" busca `historico_treinos`, filtro por aluno, badges coloridas de PSE, duração formatada, observações.
- `useAlunos.js` fallback select inclui `data_ultimo_pagamento, forma_pagamento` (linha 25).
- Treinos: estado `treinosAluno` gated por `treinosAluno === alunoId` na init effect. Dias A/B/C/D persistem no reload.
- `atraso`/vencido: verifica `status_pagamento !== 'em_dia'`.
- Receita e totalReceber: regra unificada com Dashboard — soma `plano_valor` de alunos `status_pagamento !== 'inadimplente'`.
- Build validado (`npm.cmd run build` ✓).

## Work State
### Completed
- **BUG 1 (Treinos):** init effect travava `fichaInicializada` com `treinos` vazio → dias sumiam. Corrigido com `treinosAluno` state.
- **BUG 2 (Financeiro R$0):** fallback select de `useAlunos` adicionado `data_ultimo_pagamento`/`forma_pagamento`.
- **BUG 3 (atraso sobrescreve status):** `atraso`/`vencido` testam `status_pagamento !== 'em_dia'`.
- **BUG 4/5 (totalReceber + receita cards):** regra unificada com Dashboard.
- **FEATURE (Cronômetro + Feedback/PSE):** tabela `historico_treinos` no schema; cronômetro + "Concluir Treino" + modal PSE/observações no Portal; seção admin "Feedback dos Treinos (PSE)" no Checkins.jsx.
- **FEATURE (Frequência por período):** card Frequência com abas Semanal/Mensal/Anual filtrando `historico_treinos` (estado `periodoFrequencia`), com totais e barras por período.
- **FEATURE (Evolução do PSE):** card com gráfico de linha SVG (`GraficoPse`) dos últimos 14 treinos, média e rótulos de data; refresh automático após concluir treino.
- `forma_pagamento` adicionada ao schema + fallback select.
- Crm: SVG line/área chart, card Aula Experimental, auto-conversão lead→aluno.
- Dashboard: cards clicáveis.

### Active
- (none)

### Blocked
- (none) — porém `schema.sql` precisa ser executado no Supabase (inclui a nova tabela `historico_treinos`) + `NOTIFY pgrst, 'reload schema';`.

## Next Move
- Opcional: rodar `supabase/schema.sql` no Supabase + `NOTIFY pgrst, 'reload schema';` (essencial para a nova tabela `historico_treinos`).
- Testar manualmente: no Portal do Aluno, concluir treinos com PSE diferentes e ver o gráfico de Evolução do PSE atualizar; alternar abas Semanal/Mensal/Anual e conferir frequência por período; conferir "Feedback dos Treinos (PSE)" no painel admin (Check-ins).

## Relevant Files
- `supabase/schema.sql`: **tabela `historico_treinos`** + índice + disable RLS; NOTIFY reload.
- `src/pages/PortalAluno.tsx`: **card Frequência com abas Semanal/Mensal/Anual** (`frequenciaPeriodo` useMemo, `periodoFrequencia`), **card Evolução do PSE** (`pseSerie` useMemo + `GraficoPse` SVG), `carregarHistorico`, refresh pós-`salvarFeedback`; cronômetro + modal de feedback; ícones `TrendingUp`.
- `src/pages/Checkins.jsx`: seção "Feedback dos Treinos (PSE)" — fetch `historico_treinos`, filtro por aluno, badges PSE, `formatarDuracao`.
- `src/hooks/useAlunos.js`: fallback select com `data_ultimo_pagamento, forma_pagamento` (linha 25).
- `src/pages/Treinos.jsx`: `treinosAluno` gated init effect.
- `src/pages/Financeiro.jsx`: receita/totalReceber unificados com Dashboard; `atraso`/`vencido` por status.
- `src/pages/Crm.jsx`, `src/utils/leads.js` — concluídos em turnos anteriores.