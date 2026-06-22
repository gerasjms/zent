'use client'

import { calculateBudgetSummary } from '@/lib/budget/engine'
import { generateAccountRecommendations } from '@/lib/recommendations/engine'
import { type BudgetConfig } from '@/types'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'
import { AccountCards } from '@/components/dashboard/AccountCards'
import { SpendingChart } from '@/components/dashboard/SpendingChart'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { RecommendationAlert } from '@/components/dashboard/RecommendationAlert'
import { DashboardActions } from '@/components/dashboard/DashboardActions'
import { format, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAccounts, useTransactions, useBudgetConfig } from '@/lib/hooks/use-finance-data'
import { DashboardSkeleton } from '@/components/layout/loading-states'

const DEFAULT_BUDGET: BudgetConfig = {
  id: '', user_id: '', needs_pct: 50, wants_pct: 30, savings_pct: 20,
  currency: 'MXN', period: 'monthly', created_at: '', updated_at: '',
}

export default function DashboardPage() {
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts()
  const { data: transactions = [], isLoading: loadingTx } = useTransactions(200)
  const { data: budgetConfig, isLoading: loadingBudget } = useBudgetConfig()

  // Solo skeleton en el PRIMER load. En navegaciones posteriores SWR sirve la
  // caché al instante (keepPreviousData) y revalida en segundo plano.
  if (loadingAccounts || loadingTx || loadingBudget) return <DashboardSkeleton />

  const config = budgetConfig ?? DEFAULT_BUDGET
  const budgetSummary = calculateBudgetSummary(transactions, config)
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

        {/* Account Cards (balance ya viene precalculado de la BD) */}
        <div>
          <AccountCards accounts={accounts} />
        </div>
      </div>
    </div>
  )
}
