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
  plano_valor       numeric(10,2) not null default 0,
  status_pagamento  text not null default 'em_dia',
  data_vencimento   date,
  created_at        timestamptz not null default now(),
  constraint alunos_status_check check (status_pagamento in ('em_dia', 'vencendo', 'inadimplente'))
);

create index if not exists alunos_status_idx on public.alunos (status_pagamento);
create index if not exists alunos_vencimento_idx on public.alunos (data_vencimento);

-- ---------------------------------------------------------------------
-- Tabela: treinos (ficha por aluno, dividida por dia_semana: A, B, C...)
-- exercicios_json segue o formato:
--   [ { "nome": "Supino", "series": 4, "repeticoes": "12", "carga": "30kg" }, ... ]
-- ---------------------------------------------------------------------
create table if not exists public.treinos (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null references public.alunos(id) on delete cascade,
  dia_semana      text not null,
  exercicios_json jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

-- Garante um único treino por (aluno, dia)
create unique index if not exists treinos_aluno_dia_key on public.treinos (aluno_id, dia_semana);

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