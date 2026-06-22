'use client'

import { type Account, type AccountPurpose } from '@/types'
import { type AccountAssignmentRow, setAssignment } from '@/lib/hooks/use-finance-data'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const BUCKETS: { key: Exclude<AccountPurpose, 'all'>; label: string; icon: string; color: string }[] = [
  { key: 'needs', label: 'Necesidades', icon: '🛒', color: '#f59e0b' },
  { key: 'wants', label: 'Ocio', icon: '✨', color: '#8b5cf6' },
  { key: 'saving', label: 'Ahorro', icon: '🐷', color: '#10b981' },
]

interface StrategyAllocationProps {
  accounts: Account[]
  assignments: AccountAssignmentRow[]
  userId: string
}

export function StrategyAllocation({ accounts, assignments, userId }: StrategyAllocationProps) {
  const amountFor = (accountId: string, purpose: AccountPurpose) =>
    Number(assignments.find(a => a.account_id === accountId && a.purpose === purpose)?.allocated_amount ?? 0)

  const bucketTotal = (purpose: AccountPurpose) =>
    assignments.filter(a => a.purpose === purpose).reduce((s, a) => s + Number(a.allocated_amount), 0)

  const assignedForAccount = (accountId: string) =>
    BUCKETS.reduce((s, b) => s + amountFor(accountId, b.key), 0)

  async function handleSave(accountId: string, purpose: AccountPurpose, raw: string) {
    const amount = Math.max(0, parseFloat(raw) || 0)
    if (amount === amountFor(accountId, purpose)) return
    try {
      await setAssignment(userId, accountId, purpose, amount)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Agrega cuentas primero para asignarlas a tu estrategia.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tus cuentas por estrategia</CardTitle>
        <p className="text-sm text-muted-foreground">
          Reparte el saldo de cada cuenta entre tus buckets. Te dice cuánto tienes destinado a cada cosa.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Totales por bucket */}
        <div className="grid grid-cols-3 gap-3">
          {BUCKETS.map(b => (
            <div
              key={b.key}
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: b.color + '12', border: `1px solid ${b.color}30` }}
            >
              <p className="text-xs text-muted-foreground">{b.icon} {b.label}</p>
              <p className="text-lg font-bold" style={{ color: b.color }}>
                {formatCurrency(bucketTotal(b.key))}
              </p>
            </div>
          ))}
        </div>

        {/* Matriz cuenta × bucket */}
        <div className="space-y-3">
          {accounts.map(account => {
            const assigned = assignedForAccount(account.id)
            const balance = Number(account.balance || 0)
            const unassigned = balance - assigned
            const overAssigned = assigned > balance + 0.01
            return (
              <div key={account.id} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{account.icon}</span>
                    <span className="font-medium truncate">{account.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className="font-semibold text-sm">{formatCurrency(balance, account.currency)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {BUCKETS.map(b => (
                    <div key={b.key} className="space-y-1">
                      <label className="text-xs text-muted-foreground">{b.icon} {b.label}</label>
                      <Input
                        key={`${account.id}-${b.key}-${amountFor(account.id, b.key)}`}
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={amountFor(account.id, b.key) || ''}
                        placeholder="0"
                        className="h-9"
                        onBlur={e => handleSave(account.id, b.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <p className={`text-xs ${overAssigned ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {overAssigned
                    ? `⚠️ Asignaste ${formatCurrency(assigned)} pero el saldo es ${formatCurrency(balance)}`
                    : `Sin asignar: ${formatCurrency(unassigned)}`}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
