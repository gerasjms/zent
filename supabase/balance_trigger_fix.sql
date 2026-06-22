-- ============================================================
-- FIX: alinear el trigger de balance con la lógica del frontend
-- ============================================================
-- Antes, recalculate_account_balance usaba `is_internal_transfer` para las
-- transferencias, pero el cálculo del frontend (calcAccountBalances) usa
-- `is_transfer_credit`. Eso hacía que accounts.balance no coincidiera con lo
-- que veía el usuario. Esta migración alinea la BD con el frontend:
--   income   -> + amount_mxn
--   expense  -> - amount_mxn
--   transfer -> + amount_mxn si is_transfer_credit, si no - amount_mxn
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

create or replace function recalculate_account_balance(p_account_id uuid)
returns decimal as $$
declare
  v_balance decimal(12,2);
begin
  select
    coalesce(
      sum(case
        when type = 'income'  then coalesce(amount_mxn, 0)
        when type = 'expense' then -coalesce(amount_mxn, 0)
        when type = 'transfer' and is_transfer_credit then coalesce(amount_mxn, 0)
        when type = 'transfer' then -coalesce(amount_mxn, 0)
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

-- Recalcular TODOS los balances existentes con la lógica corregida.
update public.accounts a
set balance = coalesce((
  select sum(case
    when t.type = 'income'  then coalesce(t.amount_mxn, 0)
    when t.type = 'expense' then -coalesce(t.amount_mxn, 0)
    when t.type = 'transfer' and t.is_transfer_credit then coalesce(t.amount_mxn, 0)
    when t.type = 'transfer' then -coalesce(t.amount_mxn, 0)
    else 0
  end)
  from public.transactions t
  where t.account_id = a.id
), 0),
updated_at = now();
