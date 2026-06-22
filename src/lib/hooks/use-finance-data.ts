'use client'

import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { fetchExchangeRate } from '@/lib/utils/currency'
import type { Account, Transaction, BudgetConfig, AccountPurpose, Currency } from '@/types'

const supabase = createClient()

/**
 * Invalida TODA la caché de datos tras una mutación (insert/update/delete).
 * SWR revalida todos los hooks activos, así la UI se actualiza al instante
 * y los datos quedan frescos. Reemplaza al viejo router.refresh().
 */
export function revalidateAll() {
  return mutate(() => true)
}

/** Tipo de cambio USD→MXN del día (cacheado ~1h por SWR). */
export function useExchangeRate() {
  const { data } = useSWR('usd-mxn-rate', () => fetchExchangeRate(), {
    revalidateOnFocus: false,
    dedupingInterval: 3_600_000,
  })
  // 17.5 es el mismo fallback que usa fetchExchangeRate mientras carga.
  return data ?? 17.5
}

/** Convierte un saldo en su moneda nativa a MXN usando el tipo de cambio dado. */
export function toMxn(amount: number, currency: Currency, usdRate: number): number {
  return currency === 'USD' ? amount * usdRate : amount
}

/** Cambia la moneda de una cuenta (MXN/USD). */
export async function updateAccountCurrency(accountId: string, currency: Currency) {
  const { error } = await supabase
    .from('accounts')
    .update({ currency, updated_at: new Date().toISOString() })
    .eq('id', accountId)
  if (error) throw error
  await revalidateAll()
}

// Nota: las políticas RLS (auth.uid() = user_id) ya filtran las filas por usuario,
// así que no hace falta el .eq('user_id', ...) en cada query desde el cliente.

/** Usuario autenticado (cacheado por SWR; una sola llamada de red). */
export function useUser() {
  return useSWR(
    'auth-user',
    async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user
    },
    { revalidateOnFocus: false },
  )
}

/** Cuentas con su balance precalculado (columna accounts.balance, mantenida por trigger). */
export function useAccounts() {
  return useSWR('accounts', async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at')
    if (error) throw error
    return (data ?? []) as Account[]
  })
}

/** Transacciones recientes con la cuenta embebida (para historial/dashboard). */
export function useTransactions(limit = 500) {
  return useSWR(['transactions', limit], async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, account:accounts(id, name, icon, color, type)')
      .order('date', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as Transaction[]
  })
}

/** Configuración de presupuesto (una fila por usuario). */
export function useBudgetConfig() {
  return useSWR('budget_config', async () => {
    const { data, error } = await supabase
      .from('budget_config')
      .select('*')
      .maybeSingle()
    if (error) throw error
    return (data as BudgetConfig | null) ?? null
  })
}

export interface AccountAssignmentRow {
  id: string
  user_id: string
  account_id: string
  purpose: AccountPurpose
  is_manual: boolean
}

/** Vínculos de cuentas a un bucket de estrategia (needs/wants/saving). */
export function useAssignments() {
  return useSWR('account_assignments', async () => {
    const { data, error } = await supabase.from('account_assignments').select('*')
    if (error) throw error
    return (data ?? []) as AccountAssignmentRow[]
  })
}

/**
 * Vincula una cuenta a UN propósito (o la desvincula con null).
 * Cada cuenta tiene un solo propósito: borra los vínculos previos de la cuenta
 * y crea el nuevo. Revalida la caché al final.
 */
export async function setAccountPurpose(
  userId: string,
  accountId: string,
  purpose: AccountPurpose | null,
) {
  const del = await supabase.from('account_assignments').delete().eq('account_id', accountId)
  if (del.error) throw del.error
  if (purpose) {
    const { error } = await supabase
      .from('account_assignments')
      .insert({ user_id: userId, account_id: accountId, purpose, is_manual: true })
    if (error) throw error
  }
  await revalidateAll()
}

export interface TaxPayment {
  id: string
  period: string
  type: 'monthly' | 'annual'
  amount: number
  paid_at: string | null
  notes: string | null
}

export interface TaxData {
  incomeTransactions: Transaction[]
  regime: string | null
  taxPayments: TaxPayment[]
}

/** Datos fiscales del año en curso: ingresos, régimen y pagos. */
export function useTaxData() {
  return useSWR<TaxData>('tax-data', async () => {
    const year = new Date().getFullYear()
    const startOfYear = `${year}-01-01`

    const [incomeRes, configRes, paymentsRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('type', 'income')
        .gte('date', startOfYear)
        .order('date', { ascending: false }),
      supabase.from('tax_config').select('*').maybeSingle(),
      supabase.from('tax_payments').select('*').order('period', { ascending: false }),
    ])

    if (incomeRes.error) throw incomeRes.error
    if (configRes.error) throw configRes.error
    if (paymentsRes.error) throw paymentsRes.error

    return {
      incomeTransactions: (incomeRes.data ?? []) as Transaction[],
      regime: (configRes.data?.regime as string | undefined) ?? null,
      taxPayments: (paymentsRes.data ?? []) as TaxPayment[],
    }
  })
}
