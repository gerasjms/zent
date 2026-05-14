import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { calculateTaxSummary, type TaxRegime } from '@/lib/taxes/engine'
import { TaxDashboard } from '@/components/taxes/TaxDashboard'
import { type Transaction } from '@/types'

export default async function TaxesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01`

  const [{ data: transactions }, { data: taxConfig }, { data: taxPayments }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .gte('date', startOfYear)
      .order('date', { ascending: false }),
    supabase
      .from('tax_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('tax_payments')
      .select('*')
      .eq('user_id', user.id)
      .order('period', { ascending: false }),
  ])

  const regime: TaxRegime = (taxConfig?.regime as TaxRegime) ?? 'general'
  const summary = calculateTaxSummary((transactions ?? []) as Transaction[], regime)

  return (
    <TaxDashboard
      summary={summary}
      taxPayments={taxPayments ?? []}
      userId={user.id}
    />
  )
}
