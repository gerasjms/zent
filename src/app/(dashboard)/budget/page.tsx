import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { calculateBudgetSummary, getMonthlyTrend } from '@/lib/budget/engine'
import { type Transaction, type BudgetConfig } from '@/types'
import { BudgetSettings } from '@/components/budget/BudgetSettings'
import { BudgetDetailChart } from '@/components/budget/BudgetDetailChart'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'

export default async function BudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [transactionsRes, budgetRes] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(500),
    supabase.from('budget_config').select('*').eq('user_id', user.id).single(),
  ])

  const transactions: Transaction[] = transactionsRes.data || []
  const defaultBudget: BudgetConfig = {
    id: '', user_id: user.id, needs_pct: 50, wants_pct: 30, savings_pct: 20,
    currency: 'MXN', period: 'monthly', created_at: '', updated_at: '',
  }
  const budgetConfig: BudgetConfig = budgetRes.data || defaultBudget
  const summary = calculateBudgetSummary(transactions, budgetConfig)
  const trend = getMonthlyTrend(transactions, 6)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Mi presupuesto</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura cómo distribuir tu ingreso y ve tu progreso en tiempo real
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BudgetOverview summary={summary} />
          <BudgetDetailChart trend={trend} />
        </div>
        <div>
          <BudgetSettings config={budgetConfig} userId={user.id} />
        </div>
      </div>
    </div>
  )
}
