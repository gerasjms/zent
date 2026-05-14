'use client'

import { type BudgetSummary } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Sparkles, PiggyBank, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BudgetOverviewProps {
  summary: BudgetSummary
}

export function BudgetOverview({ summary }: BudgetOverviewProps) {
  const buckets = [
    {
      key: 'needs',
      label: 'Necesidades',
      subtitle: `${summary.config.needs_pct}% del ingreso`,
      icon: ShoppingCart,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      progressColor: 'bg-amber-500',
      data: summary.needs,
    },
    {
      key: 'wants',
      label: 'Ocio y estilo de vida',
      subtitle: `${summary.config.wants_pct}% del ingreso`,
      icon: Sparkles,
      color: 'text-violet-500',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      progressColor: 'bg-violet-500',
      data: summary.wants,
    },
    {
      key: 'savings',
      label: 'Ahorro',
      subtitle: `${summary.config.savings_pct}% del ingreso`,
      icon: PiggyBank,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      progressColor: 'bg-emerald-500',
      data: summary.savings,
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

      {/* Budget buckets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {buckets.map(({ key, label, subtitle, icon: Icon, color, bgColor, data }) => {
          const pctUsed = Math.min(data.pct_used, 100)
          const isOver = data.pct_used > 100
          const isWarning = data.pct_used > 80 && data.pct_used <= 100

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
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Progress
                  value={pctUsed}
                  className={cn('h-2', isOver && '[&>div]:bg-destructive', isWarning && '[&>div]:bg-amber-500')}
                />
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Usado</p>
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
