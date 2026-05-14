'use client'

import { type Account } from '@/types'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DashboardActions({ accounts }: { accounts: Account[] }) {
  const router = useRouter()

  return (
    <AddTransactionModal accounts={accounts} onSuccess={() => router.refresh()}>
      <Button className="gap-2 shrink-0">
        <Plus className="w-4 h-4" />
        Nueva transacción
      </Button>
    </AddTransactionModal>
  )
}
