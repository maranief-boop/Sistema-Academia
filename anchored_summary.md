## Objective
- Corrigir dois bugs críticos já resolvidos + dois ajustes novos de lógica: (1) dias da semana dos blocos de treino não persistiam ao recarregar (corrigido com estado `treinosAluno` guardando quando o load termina); (2) cards de receita em R$ 0,00 (corrigido ao adicionar `data_ultimo_pagamento`/`forma_pagamento` ao fallback select de `useAlunos`); (3) cálculo de atraso agora respeita primariamente o `status_pagamento` do cadastro; (4) card `totalReceber` agora soma apenas alunos com vencimento em aberto no mês corrente (filtrado por `data_vencimento` no formato `YYYY-MM`).

## Important Details
- Projeto: PWA React + Tailwind + Supabase em `D:\Desktop\Sistema Academia`. `npm.cmd` (PowerShell bloqueia `npm.ps1`). HashRouter, `base: './'`, Supabase URL `https://gokzwuhpvjgmrdnpmwcc.supabase.co`.
- `supabase/schema.sql` executar no SQL Editor do Supabase; `NOTIFY pgrst, 'reload schema';`. RLS desativado para `alunos`/`leads`.
- `useAlunos.js` fallback select inclui `data_ultimo_pagamento, forma_pagamento` (linha 25) — sem isso, receita = 0 e forma_pagamento sumia.
- Treinos: estado `treinosAluno` setado após `carregarTreinos` resolver; init effect gated por `treinosAluno === alunoId`. Dias A/B/C/D agora persistem no reload.
- `atraso`/vencido: agora verifica `status_pagamento !== 'em_dia'` antes de calcular dias de atraso. Alunos 'Em dia' nunca mostram "X dia(s) de atraso" independentemente da data_vencimento.
- `totalReceber`: soma dos `plano_valor` de alunos vencendo/inadimplentes cujo `data_vencimento` está no mês corrente (`data_vencimento.slice(0,7) === ${ano}-${mes}`). Ignora alunos 'em_dia'.
- Checkins: Realizado = `bg-yellow-400`, Esperado = `bg-primary-500`.
- Crm: SVG line chart, Aula Experimental card, auto-conversão Lead→Aluno.
- Build validado (`npm.cmd run build` ✓).

## Work State
### Completed
- **BUG 1 (Treinos):** init effect travava `fichaInicializada` com `treinos` vazio → dias sumiam ao recarregar. Corrigido com `treinosAluno` state após `carregarTreinos` .then, guard `treinosAluno === alunoId` na init effect. Dias dos cards A/B/C/D agora persistem.
- **BUG 2 (Financeiro R$0):** fallback select de `useAlunos` omitia `data_ultimo_pagamento`/`forma_pagamento` → quando `select('*')` falhava, receita = 0 e forma de pagamento vazia. Adicionadas ambas ao fallback (useAlunos.js:25). Cards de receita agora somam `plano_valor` corretamente.
- **BUG 3 (atraso sobrescreve status):** lógica `const atraso = aluno.data_vencimento ? diasDesde(...) : null`/`vencido` agora testa `status_pagamento !== 'em_dia'` antes. Alunos com select 'Em dia' nunca mostram atraso.
- **BUG 4 (totalReceber):** card `totalReceber` filtrado por vencimento no mês corrente (`data_vencimento` em `YYYY-MM`). Anteriormente somava todos vencendo+inadimplentes independente de mês.
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
- Testar manualmente: marcar dias em Treinos e recarregar; marcar alunos "Em dia" no Financeiro e confirmar cards de receita preenchidos; conferir se atraso só aparece em alunos fora de 'Em dia'; verificar totalReceber só soma alunos com vencimento neste mês.

## Relevant Files
- `src/hooks/useAlunos.js`: fallback select agora inclui `data_ultimo_pagamento, forma_pagamento` (linha 25).
- `src/pages/Treinos.jsx`: load effect seta `treinosAluno` após `carregarTreinos` resolver; init effect gated por `treinosAluno === alunoId`.
- `src/pages/Financeiro.jsx`: lógica `atraso`/`vencido` agora testa `status_pagamento !== 'em_dia'` (linhas ~283-284); `resumo` useMemo filtrado por mês corrente (linhas ~92-124).
- `src/hooks/useTreinos.js`: `salvarDia` (upsert com `dias_semana`), `carregarTreinos` (`select('*')`).
- `supabase/schema.sql`: `treinos` (dia_semana/dias_semana/unique index); `alunos` (data_ultimo_pagamento, forma_pagamento); disable RLS.
- `src/pages/Checkins.jsx`, `src/pages/Crm.jsx`, `src/utils/leads.js` (já concluídos em turnos anteriores).