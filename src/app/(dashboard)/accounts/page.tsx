'use client'

import { AccountsManager } from '@/components/accounts/AccountsManager'
import { useAccounts } from '@/lib/hooks/use-finance-data'
import { CardsSkeleton } from '@/components/layout/loading-states'

export default function AccountsPage() {
  // balance ya viene precalculado en la columna accounts.balance
  const { data: accounts = [], isLoading } = useAccounts()

  if (isLoading) return <CardsSkeleton />

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis cuentas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conecta tus cuentas bancarias para sincronización automática o agrégalas manualmente
        </p>
      </div>
      <AccountsManager accounts={accounts} />
    </div>
  )
}
