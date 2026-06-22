'use client'

import { type Account } from '@/types'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { revalidateAll } from '@/lib/hooks/use-finance-data'

export function DashboardActions({ accounts }: { accounts: Account[] }) {
  return (
    <AddTransactionModal accounts={accounts} onSuccess={() => revalidateAll()}>
      <Button className="gap-2 shrink-0">
        <Plus className="w-4 h-4" />
        Nueva transacción
      </Button>
    </AddTransactionModal>
  )
}
