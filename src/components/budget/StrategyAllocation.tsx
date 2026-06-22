'use client'

import { type Account, type AccountPurpose } from '@/types'
import { type AccountAssignmentRow, setAccountPurpose } from '@/lib/hooks/use-finance-data'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface StrategyAllocationProps {
  accounts: Account[]
  assignments: AccountAssignmentRow[]
  userId: string
}

export function StrategyAllocation({ accounts, assignments, userId }: StrategyAllocationProps) {
  const purposeOf = (accountId: string): AccountPurpose | null =>
    assignments.find(a => a.account_id === accountId)?.purpose ?? null

  async function handleLink(accountId: string, value: string | null) {
    const purpose = !value || value === 'none' ? null : (value as AccountPurpose)
    try {
      await setAccountPurpose(userId, accountId, purpose)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (accounts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vincular cuentas a tu estrategia</CardTitle>
        <p className="text-sm text-muted-foreground">
          Asigna cada cuenta a un propósito. Su saldo se refleja en el campo &quot;En cuentas&quot; de las tarjetas de arriba.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {accounts.map(account => (
          <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">{account.icon}</span>
              <div className="min-w-0">
                <p className="font-medium truncate">{account.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(account.balance || 0), account.currency)}
                </p>
              </div>
            </div>
            <Select value={purposeOf(account.id) ?? 'none'} onValueChange={v => handleLink(account.id, v)}>
              <SelectTrigger className="w-44 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                <SelectItem value="needs">🛒 Necesidades</SelectItem>
                <SelectItem value="wants">✨ Ocio</SelectItem>
                <SelectItem value="saving">🐷 Ahorro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
