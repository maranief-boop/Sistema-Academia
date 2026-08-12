## Objective
- Corrigir dois bugs críticos já resolvidos + quatro ajustes novos de lógica: (1) dias da semana dos blocos de treino não persistiam ao recarregar (corrigido com estado `treinosAluno` guardando quando o load termina); (2) cards de receita em R$ 0,00 (corrigido ao adicionar `data_ultimo_pagamento`/`forma_pagamento` ao fallback select de `useAlunos`); (3) cálculo de atraso agora respeita primariamente o `status_pagamento` do cadastro; (4) card `totalReceber` agora soma apenas alunos com vencimento em aberto no mês corrente (filtrado por `data_vencimento` no formato `YYYY-MM`); (5) **lógica de receita e total a receber unificada com o Dashboard** — agora usa exatamente a mesma regra: soma `plano_valor` de todos os alunos com `status_pagamento !== 'inadimplente`, independentemente de terem `data_ultimo_pagamento` preenchido ou não. Isso garante que alunos cadastrados manualmente e leads convertidos pelo CRM tenham seus valores somados corretamente nos cards de caixa e no "Total a receber", igual ao R$ 395,00 do Dashboard.

## Important Details
- Projeto: PWA React + Tailwind + Supabase em `D:\Desktop\Sistema Academia`. `npm.cmd` (PowerShell bloqueia `npm.ps1`). HashRouter, `base: './'`, Supabase URL `https://gokzwuhpvjgmrdnpmwcc.supabase.co`.
- `supabase/schema.sql` executar no SQL Editor do Supabase; termina com `NOTIFY pgrst, 'reload schema';`. RLS desativado para `alunos`/`leads`.
- `useAlunos.js` fallback select inclui `data_ultimo_pagamento, forma_pagamento` (linha 25) — sem isso, receita = 0 e forma_pagamento sumia.
- Treinos: estado `treinosAluno` setado após `carregarTreinos` resolver; init effect gated por `treinosAluno === alunoId`. Dias A/B/C/D agora persistem no reload.
- `atraso`/vencido: agora verifica `status_pagamento !== 'em_dia'` antes de calcular dias de atraso. Alunos 'Em dia' nunca mostram "X dia(s) de atraso" independentemente da data_vencimento.
- `totalReceber`: antes filtrado por vencimento no mês corrente (`data_vencimento` em `YYYY-MM`). Agora usa a regra unificada com Dashboard: soma `plano_valor` de todos os alunos com `status_pagamento !== 'inadimplente'` — inclui em_dia, vencendo, leads convertidos e manuais, independentemente de `data_ultimo_pagamento`.
- **Receita cards (hoje/semana/mês/ano)**: lógica unificada — antes dependia de `data_ultimo_pagamento` no período (0 para alunos antigos/sem baixa). Agora soma `plano_valor` de todos os alunos `status_pagamento !== 'inadimplente'`, garantindo valores preenchidos e consistentes com o Dashboard.
- Checkins: Realizado = `bg-yellow-400`, Esperado = `bg-primary-500`.
- Crm: SVG line chart, Aula Experimental card, auto-conversão Lead→Aluno (`converterLeadEmAluno` + botão no modal).
- Build validado (`npm.cmd run build` ✓).

## Work State
### Completed
- **BUG 1 (Treinos):** init effect travava `fichaInicializada` com `treinos` vazio → dias sumiam ao recarregar. Corrigido com `treinosAluno` state após `carregarTreinos` .then, guard `treinosAluno === alunoId` na init effect. Dias dos cards A/B/C/D agora persistem.
- **BUG 2 (Financeiro R$0):** fallback select de `useAlunos` omitia `data_ultimo_pagamento`/`forma_pagamento` → quando `select('*')` falhava, receita = 0 e forma de pagamento vazia. Adicionadas ambas ao fallback (useAlunos.js:25). Cards de receita agora somam `plano_valor` corretamente.
- **BUG 3 (atraso sobrescreve status):** lógica `const atraso = aluno.data_vencimento ? diasDesde(...) : null`/`vencido` agora testa `status_pagamento !== 'em_dia'` antes. Alunos com select 'Em dia' nunca mostram atraso.
- **BUG 4 (totalReceber):** card `totalReceber` filtrado por vencimento no mês corrente (`data_vencimento` em `YYYY-MM`). Agora usa regra unificada com Dashboard.
- **BUG 5 (Receita cards dessincronizados):** cards superiores de receita (hoje/semana/mês/ano) e `totalReceber` agora usam regra idêntica ao Dashboard: soma `plano_valor` de todos os alunos com `status_pagamento !== 'inadimplente'`. Antes dependiam de `data_ultimo_pagamento` no período, o que deixava alunos manuais/convertidos do CRM de fora. Agora todos são incluídos, garantindo exibição de R$ 395,00 (ou o total correspondente) nos cards do Financeiro.
- `forma_pagamento` added to schema + fallback select.
- Checkins: gráfico Esperado/Realizado (yellow-400), KPIs, ausentes 7+ dias.
- Crm: SVG line/área chart, card Aula Experimental, auto-conversão lead→aluno, converter button modal.
- Dashboard: cards clicáveis, ícone montar treino = Dumbbell.

### Active
- (none)

### Blocked
- (none) — porém `schema.sql` precisa ser executado no Supabase para `select('*')` deixar de cair no fallback e para as novas colunas/índices surtirem efeito.

## Next Move
- Opcional: rodar `supabase/schema.sql` no Supabase + `NOTIFY pgrst, 'reload schema';` para que `select('*')` funcione plenamente (evita o caminho de fallback, embora o app funcione mesmo sem ele graças ao fallback resiliente).
- Testar manualmente: confirmar que cards de receita (hoje/semana/mês/ano) e `totalReceber` agora exibem valores preenchidos iguais ao Dashboard (R$ 395,00 pattern), incluindo alunos sem `data_ultimo_pagamento` e leads convertidos do CRM; verificar que alunos 'Inadimplente' continuam excluídos da soma.

## Relevant Files
- `src/hooks/useAlunos.js`: fallback select agora inclui `data_ultimo_pagamento, forma_pagamento` (linha 25).
- `src/pages/Treinos.jsx`: load effect seta `treinosAluno` após `carregarTreinos` resolver; init effect gated por `treinosAluno === alunoId`.
- `src/pages/Financeiro.jsx`: **receita** useMemo (linhas ~72-89) agora soma `plano_valor` de alunos com `status_pagamento !== 'inadimplente'` para os quatro períodos; **resumo** useMemo (linhas ~92-113) `totalReceber` usa mesma regra unificada; lógica `atraso`/`vencido` testa `status_pagamento !== 'em_dia'` (linhas ~283-284).
- `src/hooks/useTreinos.js`: `salvarDia` (upsert com `dias_semana`), `carregarTreinos` (`select('*')`).
- `supabase/schema.sql`: `treinos` (dia_semana/dias_semana/unique index); `alunos` (data_ultimo_pagamento, forma_pagamento); disable RLS.
- `src/pages/Checkins.jsx`, `src/pages/Crm.jsx`, `src/utils/leads.js` (já concluídos em turnos anteriores).