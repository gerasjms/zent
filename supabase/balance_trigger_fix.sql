-- ============================================================
-- Saldo NATIVO por cuenta (multimoneda)
-- ============================================================
-- El saldo de cada cuenta se calcula en SU PROPIA moneda, sumando `amount`
-- (no `amount_mxn`). Así una cuenta en USD guarda su saldo en dólares y una
-- en MXN en pesos. La conversión a pesos para totales se hace en el front
-- con el tipo de cambio del día.
--   income   -> + amount
--   expense  -> - amount
--   transfer -> + amount si is_transfer_credit, si no - amount
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

create or replace function recalculate_account_balance(p_account_id uuid)
returns decimal as $$
declare
  v_balance decimal(14,2);
begin
  select
    coalesce(
      sum(case
        when type = 'income'  then coalesce(amount, 0)
        when type = 'expense' then -coalesce(amount, 0)
        when type = 'transfer' and is_transfer_credit then coalesce(amount, 0)
        when type = 'transfer' then -coalesce(amount, 0)
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

-- Recalcular TODOS los saldos existentes en su moneda nativa.
update public.accounts a
set balance = coalesce((
  select sum(case
    when t.type = 'income'  then coalesce(t.amount, 0)
    when t.type = 'expense' then -coalesce(t.amount, 0)
    when t.type = 'transfer' and t.is_transfer_credit then coalesce(t.amount, 0)
    when t.type = 'transfer' then -coalesce(t.amount, 0)
    else 0
  end)
  from public.transactions t
  where t.account_id = a.id
), 0),
updated_at = now();
