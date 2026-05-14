-- ============================================================
-- FINANZAS APP - Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

create table public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  slug text not null,
  type text not null check (type in ('bbva', 'mercadopago', 'arq', 'edenred', 'cash', 'other')),
  currency text not null default 'MXN' check (currency in ('MXN', 'USD')),
  color text not null default '#3b82f6',
  icon text not null default '💰',
  is_api_connected boolean default false,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  balance decimal(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, slug)
);

create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references public.accounts(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount decimal(12,2) not null,
  currency text not null default 'MXN',
  amount_mxn decimal(12,2),
  exchange_rate decimal(10,4) default 1,
  category text not null default 'Sin categoría',
  budget_category text check (budget_category in ('need', 'want', 'saving', 'income', 'transfer')),
  description text not null default '',
  merchant text,
  notes text,
  date date not null,
  source text not null default 'manual' check (source in ('bbva_api', 'mercadopago_api', 'csv_import', 'manual')),
  external_id text,
  transfer_id uuid,
  is_salary boolean default false,
  is_internal_transfer boolean default false,
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.budget_config (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  needs_pct integer not null default 50 check (needs_pct between 0 and 100),
  wants_pct integer not null default 30 check (wants_pct between 0 and 100),
  savings_pct integer not null default 20 check (savings_pct between 0 and 100),
  reference_income decimal(12,2),
  currency text not null default 'MXN',
  period text not null default 'monthly' check (period in ('monthly', 'biweekly')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.account_assignments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references public.accounts(id) on delete cascade not null,
  purpose text not null check (purpose in ('saving', 'needs', 'wants', 'all')),
  confidence decimal(3,2) default 0.5,
  is_manual boolean default false,
  reason text,
  created_at timestamptz default now(),
  unique(user_id, account_id, purpose)
);

create table public.sync_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references public.accounts(id) on delete cascade not null,
  status text not null check (status in ('success', 'error', 'partial')),
  transactions_synced integer default 0,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budget_config enable row level security;
alter table public.account_assignments enable row level security;
alter table public.sync_logs enable row level security;

create policy "accounts_own" on public.accounts for all using (auth.uid() = user_id);
create policy "transactions_own" on public.transactions for all using (auth.uid() = user_id);
create policy "budget_config_own" on public.budget_config for all using (auth.uid() = user_id);
create policy "account_assignments_own" on public.account_assignments for all using (auth.uid() = user_id);
create policy "sync_logs_own" on public.sync_logs for all using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================

create index transactions_user_date_idx on public.transactions(user_id, date desc);
create index transactions_account_idx on public.transactions(account_id);
create index transactions_budget_category_idx on public.transactions(user_id, budget_category);
create index transactions_transfer_idx on public.transactions(transfer_id) where transfer_id is not null;
create index transactions_external_id_idx on public.transactions(external_id) where external_id is not null;
create index accounts_user_idx on public.accounts(user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Recalcula el balance de una cuenta
create or replace function recalculate_account_balance(p_account_id uuid)
returns decimal as $$
declare
  v_balance decimal(12,2);
begin
  select
    coalesce(
      sum(case
        when type = 'income' then amount_mxn
        when type = 'expense' then -amount_mxn
        when type = 'transfer' and is_internal_transfer = false then amount_mxn
        else 0
      end), 0)
  into v_balance
  from public.transactions
  where account_id = p_account_id;

  update public.accounts set balance = v_balance, updated_at = now()
  where id = p_account_id;

  return v_balance;
end;
$$ language plpgsql security definer;

-- Trigger para recalcular balance después de insertar/actualizar/eliminar transacción
create or replace function trigger_recalculate_balance()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    perform recalculate_account_balance(OLD.account_id);
  else
    perform recalculate_account_balance(NEW.account_id);
    if TG_OP = 'UPDATE' and OLD.account_id != NEW.account_id then
      perform recalculate_account_balance(OLD.account_id);
    end if;
  end if;
  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

create trigger transactions_balance_trigger
  after insert or update or delete on public.transactions
  for each row execute function trigger_recalculate_balance();
