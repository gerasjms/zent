import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { calculateBudgetSummary } from '@/lib/budget/engine'
import { generateAccountRecommendations } from '@/lib/recommendations/engine'
import { type Transaction, type Account, type BudgetConfig } from '@/types'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'
import { AccountCards } from '@/components/dashboard/AccountCards'
import { SpendingChart } from '@/components/dashboard/SpendingChart'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { RecommendationAlert } from '@/components/dashboard/RecommendationAlert'
import { DashboardActions } from '@/components/dashboard/DashboardActions'
import { format, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { calcAccountBalances } from '@/lib/utils/balance'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Cargar datos en paralelo
  const [accountsRes, transactionsRes, allTxRes, budgetRes] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(200),
    supabase.from('transactions').select('account_id, type, amount_mxn, is_transfer_credit').eq('user_id', user.id),
    supabase.from('budget_config').select('*').eq('user_id', user.id).single(),
  ])

  const accounts: Account[] = accountsRes.data || []
  const transactions: Transaction[] = transactionsRes.data || []
  const balanceMap = calcAccountBalances(allTxRes.data || [])
  const accountsWithBalance = accounts.map(a => ({ ...a, balance: balanceMap[a.id] ?? 0 }))

  const defaultBudget: BudgetConfig = {
    id: '',
    user_id: user.id,
    needs_pct: 50,
    wants_pct: 30,
    savings_pct: 20,
    currency: 'MXN',
    period: 'monthly',
    created_at: '',
    updated_at: '',
  }
  const budgetConfig: BudgetConfig = budgetRes.data || defaultBudget

  const budgetSummary = calculateBudgetSummary(transactions, budgetConfig)
  const recommendations = generateAccountRecommendations(accounts, transactions)

  const monthLabel = format(startOfMonth(new Date()), 'MMMM yyyy', { locale: es })

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold capitalize">{monthLabel}</h1>
          <p className="text-muted-foreground text-sm">Resumen de tus finanzas del mes</p>
        </div>
        <DashboardActions accounts={accounts} />
      </div>

      {/* Recommendation Alert */}
      {recommendations.length > 0 && (
        <RecommendationAlert recommendations={recommendations} />
      )}

      {/* Budget Overview */}
      <BudgetOverview summary={budgetSummary} />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - takes 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <SpendingChart transactions={transactions} />
          <RecentTransactions transactions={transactions} />
        </div>

        {/* Account Cards */}
        <div>
          <AccountCards accounts={accountsWithBalance} />
        </div>
      </div>
    </div>
  )
}
