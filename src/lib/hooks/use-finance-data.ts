'use client'

import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Account, Transaction, BudgetConfig, AccountPurpose } from '@/types'

const supabase = createClient()

/**
 * Invalida TODA la caché de datos tras una mutación (insert/update/delete).
 * SWR revalida todos los hooks activos, así la UI se actualiza al instante
 * y los datos quedan frescos. Reemplaza al viejo router.refresh().
 */
export function revalidateAll() {
  return mutate(() => true)
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
  allocated_amount: number
  is_manual: boolean
}

/** Asignaciones manuales de cuentas a buckets de estrategia (needs/wants/saving). */
export function useAssignments() {
  return useSWR('account_assignments', async () => {
    const { data, error } = await supabase.from('account_assignments').select('*')
    if (error) throw error
    return (data ?? []) as AccountAssignmentRow[]
  })
}

/**
 * Crea/actualiza cuánto del saldo de una cuenta va a un propósito.
 * Si el monto es 0 o menor, elimina la asignación. Revalida la caché al final.
 */
export async function setAssignment(
  userId: string,
  accountId: string,
  purpose: AccountPurpose,
  amount: number,
) {
  if (amount > 0) {
    const { error } = await supabase
      .from('account_assignments')
      .upsert(
        { user_id: userId, account_id: accountId, purpose, allocated_amount: amount, is_manual: true },
        { onConflict: 'user_id,account_id,purpose' },
      )
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('account_assignments')
      .delete()
      .eq('account_id', accountId)
      .eq('purpose', purpose)
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
