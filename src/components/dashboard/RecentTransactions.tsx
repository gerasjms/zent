'use client'

import { type Transaction } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { getCategoryColor } from '@/lib/utils/categorize'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const BUDGET_LABELS: Record<string, string> = {
  need: 'Necesidad',
  want: 'Ocio',
  saving: 'Ahorro',
  income: 'Ingreso',
  transfer: 'Transferencia',
}

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recent = transactions.slice(0, 8)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Últimos movimientos</CardTitle>
        <Link href="/transactions" className="text-xs text-primary hover:underline">
          Ver todos
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {recent.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm px-6">
            No hay transacciones registradas. Agrega tu primer ingreso para empezar.
          </div>
        ) : (
          <div className="divide-y">
            {recent.map(tx => {
              const isIncome = tx.type === 'income'
              const isTransfer = tx.type === 'transfer' || tx.is_internal_transfer

              return (
                <div key={tx.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    isTransfer ? 'bg-gray-100 dark:bg-gray-800' :
                    isIncome ? 'bg-blue-100 dark:bg-blue-950' : 'bg-red-100 dark:bg-red-950'
                  )}>
                    {isTransfer ? (
                      <ArrowLeftRight className="w-3.5 h-3.5 text-gray-500" />
                    ) : isIncome ? (
                      <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description || tx.category}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(tx.date), 'dd MMM', { locale: es })}
                      </span>
                      {tx.budget_category && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4"
                          style={{
                            backgroundColor: getCategoryColor(tx.budget_category) + '20',
                            color: getCategoryColor(tx.budget_category),
                          }}
                        >
                          {BUDGET_LABELS[tx.budget_category]}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className={cn(
                    'font-semibold text-sm shrink-0',
                    isIncome ? 'text-blue-600 dark:text-blue-400' :
                    isTransfer ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(tx.amount, tx.currency)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
