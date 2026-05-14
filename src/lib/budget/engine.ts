import { type Transaction, type BudgetConfig, type BudgetSummary } from '@/types'
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format, subDays } from 'date-fns'

export function calculateBudgetSummary(
  transactions: Transaction[],
  config: BudgetConfig,
  referenceDate: Date = new Date()
): BudgetSummary {
  let periodStart: Date
  let periodEnd: Date

  if (config.period === 'monthly') {
    periodStart = startOfMonth(referenceDate)
    periodEnd = endOfMonth(referenceDate)
  } else {
    // Quincenal: 1-15 o 16-fin de mes
    const day = referenceDate.getDate()
    if (day <= 15) {
      periodStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
      periodEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 15)
    } else {
      periodStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 16)
      periodEnd = endOfMonth(referenceDate)
    }
  }

  const periodTxs = transactions.filter(tx => {
    const txDate = new Date(tx.date)
    return txDate >= startOfDay(periodStart) && txDate <= endOfDay(periodEnd)
  })

  const income = periodTxs
    .filter(tx => tx.type === 'income' && !tx.is_internal_transfer)
    .reduce((sum, tx) => sum + tx.amount_mxn, 0)

  const salaryIncome = periodTxs
    .filter(tx => tx.type === 'income' && tx.is_salary && !tx.is_internal_transfer)
    .reduce((sum, tx) => sum + tx.amount_mxn, 0)

  const referenceIncome = config.reference_income || income || 0

  const needsBudget = referenceIncome * (config.needs_pct / 100)
  const wantsBudget = referenceIncome * (config.wants_pct / 100)
  const savingsBudget = referenceIncome * (config.savings_pct / 100)

  const needsSpent = periodTxs
    .filter(tx => tx.type === 'expense' && tx.budget_category === 'need' && !tx.is_internal_transfer)
    .reduce((sum, tx) => sum + tx.amount_mxn, 0)

  const wantsSpent = periodTxs
    .filter(tx => tx.type === 'expense' && tx.budget_category === 'want' && !tx.is_internal_transfer)
    .reduce((sum, tx) => sum + tx.amount_mxn, 0)

  const savedAmount = periodTxs
    .filter(tx => tx.budget_category === 'saving' && !tx.is_internal_transfer)
    .reduce((sum, tx) => {
      if (tx.type === 'income') return sum + tx.amount_mxn
      if (tx.type === 'expense') return sum - tx.amount_mxn
      return sum
    }, 0)

  return {
    income,
    salary_income: salaryIncome,
    needs: {
      budget: needsBudget,
      spent: needsSpent,
      remaining: needsBudget - needsSpent,
      pct_used: needsBudget > 0 ? (needsSpent / needsBudget) * 100 : 0,
    },
    wants: {
      budget: wantsBudget,
      spent: wantsSpent,
      remaining: wantsBudget - wantsSpent,
      pct_used: wantsBudget > 0 ? (wantsSpent / wantsBudget) * 100 : 0,
    },
    savings: {
      budget: savingsBudget,
      spent: savedAmount,
      remaining: savingsBudget - savedAmount,
      pct_used: savingsBudget > 0 ? (savedAmount / savingsBudget) * 100 : 0,
    },
    period_start: format(periodStart, 'yyyy-MM-dd'),
    period_end: format(periodEnd, 'yyyy-MM-dd'),
    config: {
      needs_pct: config.needs_pct,
      wants_pct: config.wants_pct,
      savings_pct: config.savings_pct,
      period: config.period,
    },
  }
}

export function getMonthlyTrend(transactions: Transaction[], months = 6) {
  const result = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = startOfMonth(date)
    const end = endOfMonth(date)

    const monthTxs = transactions.filter(tx => {
      const d = new Date(tx.date)
      return d >= start && d <= end && !tx.is_internal_transfer
    })

    const income = monthTxs
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount_mxn, 0)

    const needs = monthTxs
      .filter(t => t.type === 'expense' && t.budget_category === 'need')
      .reduce((s, t) => s + t.amount_mxn, 0)

    const wants = monthTxs
      .filter(t => t.type === 'expense' && t.budget_category === 'want')
      .reduce((s, t) => s + t.amount_mxn, 0)

    const savings = monthTxs
      .filter(t => t.budget_category === 'saving')
      .reduce((s, t) => s + (t.type === 'income' ? t.amount_mxn : -t.amount_mxn), 0)

    result.push({
      month: format(date, 'MMM yyyy'),
      income,
      needs,
      wants,
      savings,
    })
  }

  return result
}

export function getDailySpending(transactions: Transaction[], days = 30) {
  const result = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i)
    const dateStr = format(date, 'yyyy-MM-dd')

    const dayTxs = transactions.filter(tx =>
      tx.date === dateStr && tx.type === 'expense' && !tx.is_internal_transfer
    )

    result.push({
      date: format(date, 'dd/MM'),
      spent: dayTxs.reduce((s, t) => s + t.amount_mxn, 0),
    })
  }

  return result
}
