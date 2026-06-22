'use client'

import { calculateBudgetSummary, getMonthlyTrend } from '@/lib/budget/engine'
import { type BudgetConfig } from '@/types'
import { BudgetSettings } from '@/components/budget/BudgetSettings'
import { BudgetDetailChart } from '@/components/budget/BudgetDetailChart'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'
import { StrategyAllocation } from '@/components/budget/StrategyAllocation'
import { useTransactions, useBudgetConfig, useUser, useAccounts, useAssignments } from '@/lib/hooks/use-finance-data'
import { BudgetSkeleton } from '@/components/layout/loading-states'

const DEFAULT_BUDGET: BudgetConfig = {
  id: '', user_id: '', needs_pct: 50, wants_pct: 30, savings_pct: 20,
  currency: 'MXN', period: 'monthly', created_at: '', updated_at: '',
}

export default function BudgetPage() {
  const { data: transactions = [], isLoading: loadingTx } = useTransactions(500)
  const { data: budgetConfig, isLoading: loadingBudget } = useBudgetConfig()
  const { data: user, isLoading: loadingUser } = useUser()
  const { data: accounts = [] } = useAccounts()
  const { data: assignments = [] } = useAssignments()

  if (loadingTx || loadingBudget || loadingUser) return <BudgetSkeleton />

  const config = budgetConfig ?? { ...DEFAULT_BUDGET, user_id: user?.id ?? '' }
  const summary = calculateBudgetSummary(transactions, config)
  const trend = getMonthlyTrend(transactions, 6)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Mi presupuesto</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura cómo distribuir tu ingreso y ve tu progreso en tiempo real
        </p>
      </div>

      {/* Tarjetas a ancho completo para que no se empalmen */}
      <BudgetOverview summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BudgetDetailChart trend={trend} />
        </div>
        <div>
          <BudgetSettings config={config} userId={user?.id ?? ''} />
        </div>
      </div>

      <StrategyAllocation accounts={accounts} assignments={assignments} userId={user?.id ?? ''} />
    </div>
  )
}
