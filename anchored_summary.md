## Objective
- Correções anteriores (bugs de Treinos, Financeiro R$0, atraso/status, totalReceber, unificação com Dashboard) + novos features: (6) **gráfico de frequência semanal no Portal do Aluno** — card "Frequência" redimensionado para abas Semanal/Mensal/Anual filtrando `historico_treinos`; (7) **Cronômetro + Feedback pós-treino (PSE)** — tabela `historico_treinos`, cronômetro, modal de feedback (PSE + observações) no Portal e seção admin no Checkins.jsx; (8) **Evolução do PSE** — gráfico de linha (SVG) dos últimos 14 treinos concluídos no Portal do Aluno, com média de esforço e rótulos de data; (9) **Gráfico de Volume de check-ins (Semanal/Mensal/Anual) no painel admin** e **Modal de Histórico do Aluno** (treinos + PSE + frequência individual com as mesmas abas).

## Important Details
- Projeto: PWA React + Tailwind + Supabase em `D:\Desktop\Sistema Academia`. `npm.cmd` (PowerShell bloqueia `npm.ps1`). HashRouter, `base: './'`, Supabase URL `https://gokzwuhpvjgmrdnpmwcc.supabase.co`.
- `supabase/schema.sql` executar no SQL Editor do Supabase; termina com `NOTIFY pgrst, 'reload schema';`. RLS desativado para `alunos`/`leads`/`historico_treinos`.
- **Nova tabela `historico_treinos`** (schema.sql): `id uuid PK default gen_random_uuid()`, `aluno_id uuid references alunos(id) on delete cascade`, `data timestamptz default now()`, `tempo_segundos integer`, `pse integer check (pse between 0 and 10)`, `observacoes text`, `created_at`; índice `historico_treinos_aluno_idx (aluno_id, data desc)`; `disable row level security`.
- **NOVO `src/utils/frequencia.js`** — utilitários compartilhados de agregação por período: `ORDEM_DIAS`/`ROTULOS_DIAS`/`MESES_ROTULO`, `inicioDaSemana()`, `agregarSemanal(itens,getData)` (7 dias Seg-Dom desta semana), `agregarMensal(itens,getData)` (5 semanas do mês), `agregarAnual(itens,getData)` (12 meses do ano). Reutilizados pelo painel admin (Checkins) e pelo ModalHistórico.
- **NOVO `src/components/Graficos.jsx`** — `GraficoBarras({ itens, altura=130, corPadrao })` (barras verticais com altura em px), `GraficoLinhaPse({ pontos })` (SVG 0–10), `SeletorPeriodo({ valor, onChange })` (pills Semanal/Mensal/Anual).
- **NOVO `src/components/ModalHistorico.jsx`** — modal do histórico detalhado do aluno: header (avatar, nome, telefone, plano, StatusBadge), KPIs (check-ins no ano, treinos concluídos, média PSE), **gráfico de frequência de check-ins individual** com abas Semanal/Mensal/Anual (fetch `checkins` + `historico_treinos` do aluno, `.gte` início do ano), **Evolução do PSE** (linha SVG últimos 14 com PSE), **Histórico de treinos** (data/hora, duração formatada, badge PSE, observações). Pode ser aberto a partir do nome clicável do aluno.
- **Portal do Aluno** (`src/pages/PortalAluno.tsx`): carrega `historico_treinos` do aluno logado (asc) via `carregarHistorico`; card Frequência com abas Semanal/Mensal/Anual (estado `periodoFrequencia`); card Evolução do PSE com `GraficoPse` (SVG inline, último 14); refresh do histórico após `salvarFeedback`.
- **Admin (Checkins.jsx)**: seção "Feedback dos Treinos (PSE)" (fetch `historico_treinos`, filtro por aluno, badges PSE); **NOVO card "Volume de check-ins"** com `SeletorPeriodo` + `GraficoBarras` sobre `volumeCheckins` (fetch dedicado com `.gte(data_hora, início do ano)`, sem limite de 500) com total por período; nomes de alunos clicáveis em "Últimos registros", "Situação dos alunos" e lista de PSE abrem o `ModalHistorico`.
- **Admin (Alunos.jsx)**: nome do aluno clicável (botão) + botão `History` nas ações abrem o mesmo `ModalHistorico`.
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
- **FEATURE (Volume de check-ins no admin):** novo card "Volume de check-ins" em Checkins.jsx com abas Semanal/Mensal/Anual (`SeletorPeriodo` + `GraficoBarras`), dados reais de `checkins` do ano corrente (fetch dedicado `carregarVolume`).
- **FEATURE (Modal Histórico do Aluno):** `ModalHistorico` (KPIs, frequência individual por período, evolução PSE, histórico de treinos) aberto ao clicar no nome do aluno em Checkins.jsx (Últimos registros, Situação dos alunos, Feedback PSE) e em Alunos.jsx (nome + botão History).
- `forma_pagamento` adicionada ao schema + fallback select.
- Crm: SVG line/área chart, card Aula Experimental, auto-conversão lead→aluno.
- Dashboard: cards clicáveis.

### Active
- (none)

### Blocked
- (none) — porém `schema.sql` precisa ser executado no Supabase (inclui a nova tabela `historico_treinos`) + `NOTIFY pgrst, 'reload schema';`.

## Next Move
- Opcional: rodar `supabase/schema.sql` no Supabase + `NOTIFY pgrst, 'reload schema';` (essencial para a nova tabela `historico_treinos`).
- Testar manualmente: (1) no painel Check-ins, alternar abas do "Volume de check-ins" e conferir barras reais; (2) clicar no nome de um aluno (Check-ins e Alunos) e validar o modal — KPIs, abas Semanal/Mensal/Anual de frequência individual, evolução do PSE e histórico de treinos; (3) no Portal do Aluno, concluir treinos com PSE diferentes e ver o gráfico atualizar.

## Relevant Files
- `src/utils/frequencia.js`: **NOVO** — agregação Semanal/Mensal/Anual compartilhada (`agregarSemanal/Mensal/Anual`, `ORDEM_DIAS`, `ROTULOS_DIAS`, `MESES_ROTULO`, `inicioDaSemana`).
- `src/components/Graficos.jsx`: **NOVO** — `GraficoBarras`, `GraficoLinhaPse`, `SeletorPeriodo`.
- `src/components/ModalHistorico.jsx`: **NOVO** — modal histórico do aluno (KPIs + frequência individual + PSE + treinos).
- `src/pages/Checkins.jsx`: card "Volume de check-ins" (`carregarVolume`, `volumePeriodo`, `volumeItens`, `totalVolumePeriodo`); nomes clicáveis abrem `ModalHistorico`.
- `src/pages/Alunos.jsx`: nome clicável + botão `History` abrem `ModalHistorico`.
- `supabase/schema.sql`: **tabela `historico_treinos`** + índice + disable RLS; NOTIFY reload.
- `src/pages/PortalAluno.tsx`: card Frequência (abas) + card Evolução do PSE (`GraficoPse`), `carregarHistorico`.
- `src/hooks/useAlunos.js`: fallback select com `data_ultimo_pagamento, forma_pagamento` (linha 25).
- `src/pages/Treinos.jsx`: `treinosAluno` gated init effect.
- `src/pages/Financeiro.jsx`: receita/totalReceber unificados com Dashboard; `atraso`/`vencido` por status.
- `src/pages/Crm.jsx`, `src/utils/leads.js` — concluídos em turnos anteriores.