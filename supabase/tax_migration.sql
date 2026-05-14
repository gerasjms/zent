-- Migración: módulo de impuestos
-- Ejecutar en Supabase Dashboard > SQL Editor

create table public.tax_config (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  regime text not null default 'general' check (regime in ('asalariado', 'resico', 'general', 'honorarios')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.tax_payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  period text not null, -- 'YYYY-MM' o 'YYYY' para anual
  type text not null check (type in ('monthly', 'annual')),
  amount decimal(12,2) not null,
  paid_at date,
  notes text,
  created_at timestamptz default now()
);

alter table public.tax_config enable row level security;
alter table public.tax_payments enable row level security;

create policy "tax_config_own" on public.tax_config for all using (auth.uid() = user_id);
create policy "tax_payments_own" on public.tax_payments for all using (auth.uid() = user_id);
