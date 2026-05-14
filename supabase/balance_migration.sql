-- Agrega columna para distinguir el lado crédito de una transferencia interna
-- debit (false/null) = dinero que SALE de la cuenta
-- credit (true)      = dinero que ENTRA a la cuenta
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_transfer_credit BOOLEAN DEFAULT FALSE;
