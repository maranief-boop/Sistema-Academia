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

-- Para bancos já existentes: adiciona as colunas novas sem quebrar os dados
alter table public.treinos add column if not exists dias_semana text;
alter table public.treinos add column if not exists restricoes text;

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

create index if not exists checkins_data_idx on public.checkins (data_hora desc);
create index if not exists checkins_aluno_idx on public.checkins (aluno_id, data_hora desc);

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

-- IMPORTANTE: recarrega o cache de schema do PostgREST para que as colunas
-- e tabelas novas (treinos.dias_semana, treinos.restricoes, exercicios_base,
-- leads, macrociclo) fiquem disponíveis IMEDIATAMENTE via API.
-- (Sem isso, as chamadas REST podem responder 400 "column does not exist".)
notify pgrst, 'reload schema';