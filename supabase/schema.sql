-- =====================================================================
-- SISTEMA ACADEMIA — Schema PostgreSQL para Supabase
-- Execute este script no SQL Editor do seu projeto Supabase.
-- OBS: tabelas criadas via SQL vêm com Row Level Security DESATIVADO,
-- o que permite o app funcionar imediatamente com a chave anon.
-- Em produção, habilite RLS + Supabase Auth. 
-- =====================================================================

-- Habilita a função gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tabela: alunos
-- ---------------------------------------------------------------------
create table if not exists public.alunos (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  telefone          text,
  cpf               text,
  plano_valor       numeric(10,2) not null default 0,
  status_pagamento  text not null default 'em_dia',
  data_vencimento   date,
  data_ultimo_pagamento date,  -- novo campo para rastreamento de recibos
  forma_pagamento   text,       -- Dinheiro, Pix, Cartão, Boleto, Transferência...
  created_at        timestamptz not null default now(),
  constraint alunos_status_check check (status_pagamento in ('em_dia', 'vencendo', 'inadimplente'))
);

-- Para bancos já existentes: adiciona as colunas sem quebrar os dados
alter table public.alunos add column if not exists data_ultimo_pagamento date;
alter table public.alunos add column if not exists forma_pagamento text;

create index if not exists alunos_status_idx on public.alunos (status_pagamento);
create index if not exists alunos_vencimento_idx on public.alunos (data_vencimento);
create index if not exists alunos_ultimo_pagamento_idx on public.alunos (data_ultimo_pagamento);

-- ---------------------------------------------------------------------
-- Tabela: treinos (ficha por aluno, dividida por dia_semana: A, B, C...)
-- exercicios_json segue o formato:
--   [ { "nome": "Supino", "series": 4, "repeticoes": "12",
--       "carga": "30kg", "url_video": "https://youtu.be/..." }, ... ]
-- dias_semana: ex.: "Segunda, Quarta, Sexta"
-- restricoes:  texto livre (lesões / cuidados)
-- ---------------------------------------------------------------------
create table if not exists public.treinos (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null references public.alunos(id) on delete cascade,
  dia_semana      text not null,
  exercicios_json jsonb not null default '[]'::jsonb,
  dias_semana     text,
  restricoes      text,
  created_at      timestamptz not null default now()
);

-- Para bancos já existentes: adiciona/garante as colunas sem quebrar os dados
alter table public.treinos add column if not exists id uuid default gen_random_uuid();
alter table public.treinos add column if not exists aluno_id uuid;
alter table public.treinos add column if not exists dia_semana text;
alter table public.treinos add column if not exists exercicios_json jsonb not null default '[]'::jsonb;
alter table public.treinos add column if not exists dias_semana text;
alter table public.treinos add column if not exists restricoes text;
alter table public.treinos add column if not exists descanso_padrao integer default 60;

-- Garante um único treino por (aluno, dia)
create unique index if not exists treinos_aluno_dia_key on public.treinos (aluno_id, dia_semana);

-- ---------------------------------------------------------------------
-- Tabela: exercicios_base (busca inteligente no cadastro de exercícios)
-- Categorias de exemplo: Musculação, Funcional, Corrida
-- ---------------------------------------------------------------------
create table if not exists public.exercicios_base (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  categoria   text not null default 'musculação',
  created_at  timestamptz not null default now()
);

-- Garante a coluna categoria em tabelas já existentes
alter table public.exercicios_base add column if not exists categoria text not null default 'musculação';

create index if not exists exercicios_base_nome_idx on public.exercicios_base (lower(nome));

-- Seed inicial (só insere o que ainda não existe — seguro para bancos já usados;
-- se a sua base já está populada, este bloco simplesmente não duplica nada)
insert into public.exercicios_base (nome, categoria)
select s.nome, s.categoria
from (values
  ('Supino reto', 'musculação'),
  ('Supino inclinado', 'musculação'),
  ('Agachamento', 'musculação'),
  ('Agachamento búlgaro', 'musculação'),
  ('Leg press 45', 'musculação'),
  ('Cadeira extensora', 'musculação'),
  ('Cadeira flexora', 'musculação'),
  ('Remada curvada', 'musculação'),
  ('Puxada frontal', 'musculação'),
  ('Desenvolvimento militar', 'musculação'),
  ('Elevação lateral', 'musculação'),
  ('Rosca direta', 'musculação'),
  ('Rosca martelo', 'musculação'),
  ('Tríceps corda', 'musculação'),
  ('Tríceps testa', 'musculação'),
  ('Abdominal supra', 'musculação'),
  ('Prancha abdominal', 'musculação'),
  ('Burpee', 'funcional'),
  ('Polichinelo', 'funcional'),
  ('Mountain climber', 'funcional'),
  ('Afundo', 'funcional'),
  ('Agachamento com salto', 'funcional'),
  ('Flexão de braço', 'funcional'),
  ('Ponte de glúteo', 'funcional'),
  ('Kettlebell swing', 'funcional'),
  ('Pular corda', 'funcional'),
  ('Corrida leve (trote)', 'corrida'),
  ('Corrida moderada', 'corrida'),
  ('Sprint intervalado', 'corrida'),
  ('Corrida com elevação de joelhos', 'corrida'),
  ('Escada alta', 'corrida')
) as s(nome, categoria)
where not exists (
  select 1 from public.exercicios_base b where lower(b.nome) = lower(s.nome)
);

-- ---------------------------------------------------------------------
-- Tabela: checkins (frequência / presença)
-- ---------------------------------------------------------------------
create table if not exists public.checkins (
  id         uuid primary key default gen_random_uuid(),
  aluno_id   uuid not null references public.alunos(id) on delete cascade,
  data_hora  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Para bancos já existentes (tabela criada sem as colunas): garante tudo
alter table public.checkins add column if not exists id uuid default gen_random_uuid();
alter table public.checkins add column if not exists aluno_id uuid;
alter table public.checkins add column if not exists data_hora timestamptz;
alter table public.checkins add column if not exists created_at timestamptz not null default now();

create index if not exists checkins_data_idx on public.checkins (data_hora desc);
create index if not exists checkins_aluno_idx on public.checkins (aluno_id, data_hora desc);

-- ---------------------------------------------------------------------
-- Tabela: historico_treinos (feedback do aluno pós-treino)
-- Registra a duração (cronômetro), o PSE (Percepção Subjetiva de Esforço,
-- 0-10) e observações livres de cada sessão concluída pelo aluno.
-- ---------------------------------------------------------------------
create table if not exists public.historico_treinos (
  id             uuid primary key default gen_random_uuid(),
  aluno_id       uuid not null references public.alunos(id) on delete cascade,
  data           timestamptz not null default now(),
  tempo_segundos integer,
  pse            integer check (pse between 0 and 10),
  observacoes    text,
  bpm_medio      integer,   -- FC média do treino (cronômetro ativo)
  bpm_min        integer,   -- FC mínima registrada
  bpm_max        integer,   -- FC máxima registrada
  bpm_amostras   integer,   -- nº de leituras usadas no cálculo
  created_at     timestamptz not null default now()
);

-- Para bancos já existentes (tabela criada sem as colunas): garante tudo
alter table public.historico_treinos add column if not exists id uuid default gen_random_uuid();
alter table public.historico_treinos add column if not exists aluno_id uuid;
alter table public.historico_treinos add column if not exists data timestamptz;
alter table public.historico_treinos add column if not exists tempo_segundos integer;
alter table public.historico_treinos add column if not exists pse integer;
alter table public.historico_treinos add column if not exists observacoes text;
alter table public.historico_treinos add column if not exists bpm_medio integer;
alter table public.historico_treinos add column if not exists bpm_min integer;
alter table public.historico_treinos add column if not exists bpm_max integer;
alter table public.historico_treinos add column if not exists bpm_amostras integer;
alter table public.historico_treinos add column if not exists created_at timestamptz not null default now();

create index if not exists historico_treinos_aluno_idx on public.historico_treinos (aluno_id, data desc);

-- ---------------------------------------------------------------------
-- Tabela: pagamentos (recibos por competência no Portal do Aluno)
-- status: aberto | pago | atrasado   |   forma: pix | cartao
-- ---------------------------------------------------------------------
create table if not exists public.pagamentos (
  id             uuid primary key default gen_random_uuid(),
  aluno_id       uuid not null references public.alunos(id) on delete cascade,
  competencia    text not null,            -- "2026-08"
  valor          numeric(10,2) not null default 0,
  status         text not null default 'aberto',
  forma          text,
  data_pagamento timestamptz,
  created_at     timestamptz not null default now(),
  constraint pagamentos_status_check check (status in ('aberto', 'pago', 'atrasado'))
);

-- Para bancos já existentes (tabela criada sem as colunas): garante tudo
alter table public.pagamentos add column if not exists id uuid default gen_random_uuid();
alter table public.pagamentos add column if not exists aluno_id uuid;
alter table public.pagamentos add column if not exists competencia text not null default '';
alter table public.pagamentos add column if not exists valor numeric(10,2) not null default 0;
alter table public.pagamentos add column if not exists status text not null default 'aberto';
alter table public.pagamentos add column if not exists forma text;
alter table public.pagamentos add column if not exists data_pagamento timestamptz;
alter table public.pagamentos add column if not exists created_at timestamptz not null default now();

create index if not exists pagamentos_aluno_idx on public.pagamentos (aluno_id, competencia desc);

-- ---------------------------------------------------------------------
-- Tabela: avaliacoes (avaliação física do aluno)
-- medidas_json: { "Peso": "72 kg", "Altura": "1,74 m", "% Gordura": "18", ... }
-- ---------------------------------------------------------------------
create table if not exists public.avaliacoes (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.alunos(id) on delete cascade,
  data          date not null default current_date,
  medidas_json  jsonb not null default '{}'::jsonb,
  observacoes   text,
  created_at    timestamptz not null default now()
);

-- Para bancos já existentes (tabela criada sem as colunas): garante tudo
alter table public.avaliacoes add column if not exists id uuid default gen_random_uuid();
alter table public.avaliacoes add column if not exists aluno_id uuid;
alter table public.avaliacoes add column if not exists data date not null default current_date;
alter table public.avaliacoes add column if not exists medidas_json jsonb not null default '{}'::jsonb;
alter table public.avaliacoes add column if not exists observacoes text;
alter table public.avaliacoes add column if not exists created_at timestamptz not null default now();

create index if not exists avaliacoes_aluno_idx on public.avaliacoes (aluno_id, data desc);

-- ---------------------------------------------------------------------
-- CORREÇÃO: tabelas criadas pelo Table Editor podem ter FKs apontando
-- para auth.users em vez de public.alunos. O app usa public.alunos, então
-- removemos qualquer FK que aponte para "users" e recriamos corretamente.
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in (
    select con.conname as nome, rel.relname as tabela
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_class frel on frel.oid = con.confrelid
    where rel.relnamespace = 'public'::regnamespace
      and con.contype = 'f'
      and frel.relname = 'users'
      and rel.relname in ('avaliacoes', 'pagamentos')
  ) loop
    execute format('alter table public.%I drop constraint %I', r.tabela, r.nome);
  end loop;
end $$;

-- Remove registros órfãos para não quebrar a recriação da FK
delete from public.avaliacoes a
where not exists (select 1 from public.alunos al where al.id = a.aluno_id);
delete from public.pagamentos p
where not exists (select 1 from public.alunos al where al.id = p.aluno_id);

alter table public.avaliacoes drop constraint if exists avaliacoes_aluno_id_fkey;
alter table public.avaliacoes
  add constraint avaliacoes_aluno_id_fkey
  foreign key (aluno_id) references public.alunos(id) on delete cascade;

alter table public.pagamentos drop constraint if exists pagamentos_aluno_id_fkey;
alter table public.pagamentos
  add constraint pagamentos_aluno_id_fkey
  foreign key (aluno_id) references public.alunos(id) on delete cascade;

-- ---------------------------------------------------------------------
-- Tabela: configuracoes (identidade visual White-Label — linha única id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.configuracoes (
  id             integer primary key check (id = 1),
  nome_academia  text not null default 'Minha Academia',
  logo_url       text,
  cor_primaria   text not null default '#16a34a',
  updated_at     timestamptz not null default now()
);

-- Seed inicial da configuração
insert into public.configuracoes (id, nome_academia, cor_primaria)
values (1, 'Minha Academia', '#16a34a')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Tabela: leads (Site Institucional + CRM — pipeline de vendas)
-- Estágios: novo -> atendimento -> agendamento -> convertido
-- "Agendamentos" são leads com data_preferida preenchida (agenda do CRM).
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  telefone          text,
  origem            text not null default 'Site Institucional',
  stage             text not null default 'novo',
  notas             text,
  data_preferida    date,
  horario_preferido text,
  data_captura      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  constraint leads_stage_check check (stage in ('novo', 'atendimento', 'agendamento', 'convertido'))
);

-- Para bancos já existentes: garante as colunas novas sem quebrar os dados
alter table public.leads add column if not exists telefone text;
alter table public.leads add column if not exists origem text not null default 'Site Institucional';
alter table public.leads add column if not exists stage text not null default 'novo';
alter table public.leads add column if not exists notas text;
alter table public.leads add column if not exists data_preferida date;
alter table public.leads add column if not exists horario_preferido text;
alter table public.leads add column if not exists data_captura timestamptz not null default now();

create index if not exists leads_stage_idx on public.leads (stage);
create index if not exists leads_captura_idx on public.leads (data_captura desc);
create index if not exists leads_data_preferida_idx on public.leads (data_preferida);

-- ---------------------------------------------------------------------
-- Tabela: macrociclo (planejamento de 12 semanas por aluno)
-- semanas_json: [ { semana: 1, foco, volume, intensidade, obs }, ... ]
-- ---------------------------------------------------------------------
create table if not exists public.macrociclo (
  aluno_id     uuid primary key references public.alunos(id) on delete cascade,
  semanas_json jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Garante que o app (chave anon) consiga LER/GRAVAR sem precisar configurar
-- políticas de RLS. Se RLS estiver ativo sem política de SELECT para o role
-- anon, o Supabase retorna lista VAZIA silenciosamente (sem erro) — o que faz
-- os dados "sumirem" da tela. Desligar o RLS evita esse comportamento.
alter table public.alunos disable row level security;
alter table public.leads disable row level security;
alter table public.historico_treinos disable row level security;
alter table public.pagamentos disable row level security;
alter table public.avaliacoes disable row level security;

-- IMPORTANTE: recarrega o cache de schema do PostgREST para que as colunas
-- e tabelas novas (treinos.dias_semana, treinos.restricoes, exercicios_base,
-- leads, macrociclo, historico_treinos) fiquem disponíveis IMEDIATAMENTE via API.
-- (Sem isso, as chamadas REST podem responder 400 "column does not exist".)
notify pgrst, 'reload schema';