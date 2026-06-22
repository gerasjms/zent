'use client'

import { TransactionsView } from '@/components/transactions/TransactionsView'
import { useTransactions, useAccounts } from '@/lib/hooks/use-finance-data'
import { ListSkeleton } from '@/components/layout/loading-states'

export default function TransactionsPage() {
  const { data: transactions = [], isLoading: loadingTx } = useTransactions(500)
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts()

  if (loadingTx || loadingAccounts) return <ListSkeleton />

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Historial de transacciones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Todos tus movimientos con filtros avanzados
        </p>
      </div>
      <TransactionsView transactions={transactions} accounts={accounts} />
    </div>
  )
}
