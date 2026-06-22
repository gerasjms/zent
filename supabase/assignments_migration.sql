-- ============================================================
-- Asignación de cuentas a estrategia (50/30/20)
-- ============================================================
-- Permite repartir el saldo de una cuenta entre varios propósitos
-- (needs / wants / saving). Cada fila (user_id, account_id, purpose) guarda
-- cuánto dinero de esa cuenta se destina a ese propósito.
-- El unique(user_id, account_id, purpose) ya existe en el schema base.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

alter table public.account_assignments
  add column if not exists allocated_amount decimal(12,2) not null default 0;
