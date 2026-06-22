'use client'

import { type BudgetSummary, type AccountPurpose } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Sparkles, PiggyBank, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccounts, useAssignments, useExchangeRate, toMxn } from '@/lib/hooks/use-finance-data'

interface BudgetOverviewProps {
  summary: BudgetSummary
}

export function BudgetOverview({ summary }: BudgetOverviewProps) {
  const { data: accounts = [] } = useAccounts()
  const { data: assignments = [] } = useAssignments()
  const usdRate = useExchangeRate()

  // Saldo (en MXN) de las cuentas vinculadas a cada propósito.
  const balanceForPurpose = (purpose: AccountPurpose) => {
    const ids = new Set(assignments.filter(a => a.purpose === purpose).map(a => a.account_id))
    return accounts
      .filter(a => ids.has(a.id))
      .reduce((s, a) => s + toMxn(Number(a.balance || 0), a.currency, usdRate), 0)
  }

  const buckets = [
    {
      key: 'needs', purpose: 'needs' as AccountPurpose, label: 'Necesidades',
      icon: ShoppingCart, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      data: summary.needs, pct: summary.config.needs_pct,
    },
    {
      key: 'wants', purpose: 'wants' as AccountPurpose, label: 'Ocio y estilo de vida',
      icon: Sparkles, color: 'text-violet-500', bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      data: summary.wants, pct: summary.config.wants_pct,
    },
    {
      key: 'savings', purpose: 'saving' as AccountPurpose, label: 'Ahorro',
      icon: PiggyBank, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      data: summary.savings, pct: summary.config.savings_pct,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Income summary */}
      <Card className="border-0 bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/70 text-sm font-medium">Ingreso del período</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(summary.income)}</p>
              {summary.salary_income > 0 && summary.salary_income !== summary.income && (
                <p className="text-primary-foreground/60 text-sm mt-1">
                  Nómina: {formatCurrency(summary.salary_income)}
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-primary-foreground/20 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-primary-foreground/60 text-xs">Para necesidades</p>
              <p className="font-semibold">{formatCurrency(summary.needs.budget)}</p>
            </div>
            <div>
              <p className="text-primary-foreground/60 text-xs">Para ocio</p>
              <p className="font-semibold">{formatCurrency(summary.wants.budget)}</p>
            </div>
            <div>
              <p className="text-primary-foreground/60 text-xs">Para ahorro</p>
              <p className="font-semibold">{formatCurrency(summary.savings.budget)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget buckets (combinado: objetivo + en cuentas + gastado) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {buckets.map(({ key, purpose, label, icon: Icon, color, bgColor, data, pct }) => {
          const pctUsed = Math.min(data.pct_used, 100)
          const isOver = data.pct_used > 100
          const isWarning = data.pct_used > 80 && data.pct_used <= 100
          const inAccounts = balanceForPurpose(purpose)

          return (
            <Card key={key} className="border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bgColor)}>
                    <Icon className={cn('w-4 h-4', color)} />
                  </div>
                  {isOver ? (
                    <Badge variant="destructive" className="text-xs">Excedido</Badge>
                  ) : isWarning ? (
                    <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100">Cuidado</Badge>
                  ) : null}
                </div>
                <CardTitle className="text-sm font-semibold mt-2">{label}</CardTitle>
                <p className="text-xs text-muted-foreground">{pct}% · objetivo {formatCurrency(data.budget)}</p>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Progress
                  value={pctUsed}
                  className={cn('h-2', isOver && '[&>div]:bg-destructive', isWarning && '[&>div]:bg-amber-500')}
                />
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">En cuentas</p>
                    <p className="font-semibold">{formatCurrency(inAccounts)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Gastado</p>
                    <p className={cn('font-semibold', isOver && 'text-destructive')}>
                      {formatCurrency(data.spent)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">
                      {data.remaining >= 0 ? 'Disponible' : 'Excedido'}
                    </p>
                    <p className={cn('font-semibold', data.remaining < 0 && 'text-destructive')}>
                      {formatCurrency(Math.abs(data.remaining))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
