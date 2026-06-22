'use client'

import { type Account, type AccountPurpose, type BudgetSummary } from '@/types'
import { type AccountAssignmentRow, setAccountPurpose } from '@/lib/hooks/use-finance-data'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type StrategyKey = 'needs' | 'wants' | 'saving'

const BUCKETS: { key: StrategyKey; label: string; icon: string; color: string }[] = [
  { key: 'needs', label: 'Necesidades', icon: '🛒', color: '#f59e0b' },
  { key: 'wants', label: 'Ocio', icon: '✨', color: '#8b5cf6' },
  { key: 'saving', label: 'Ahorro', icon: '🐷', color: '#10b981' },
]

interface StrategyAllocationProps {
  accounts: Account[]
  assignments: AccountAssignmentRow[]
  summary: BudgetSummary
  userId: string
}

export function StrategyAllocation({ accounts, assignments, summary, userId }: StrategyAllocationProps) {
  const purposeOf = (accountId: string): AccountPurpose | null =>
    assignments.find(a => a.account_id === accountId)?.purpose ?? null

  const accountsFor = (key: StrategyKey) => accounts.filter(a => purposeOf(a.id) === key)
  const realFor = (key: StrategyKey) => accountsFor(key).reduce((s, a) => s + Number(a.balance || 0), 0)
  const targetFor = (key: StrategyKey) =>
    key === 'needs' ? summary.needs.budget : key === 'wants' ? summary.wants.budget : summary.savings.budget

  async function handleLink(accountId: string, value: string | null) {
    const purpose = !value || value === 'none' ? null : (value as AccountPurpose)
    try {
      await setAccountPurpose(userId, accountId, purpose)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Agrega cuentas primero para vincularlas a tu estrategia.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cuentas por estrategia</CardTitle>
        <p className="text-sm text-muted-foreground">
          Vincula cada cuenta a un propósito y compara lo que tienes contra lo que tu estrategia indica.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparación real vs estrategia, por bucket */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BUCKETS.map(b => {
            const real = realFor(b.key)
            const target = targetFor(b.key)
            const diff = real - target
            const linked = accountsFor(b.key)
            return (
              <div
                key={b.key}
                className="rounded-xl p-4 space-y-2"
                style={{ backgroundColor: b.color + '10', border: `1px solid ${b.color}30` }}
              >
                <p className="text-sm font-semibold" style={{ color: b.color }}>
                  {b.icon} {b.label}
                </p>
                <div className="space-y-0.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tienes</span>
                    <span className="font-semibold">{formatCurrency(real)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estrategia</span>
                    <span>{formatCurrency(target)}</span>
                  </div>
                </div>
                <p className={`text-xs font-medium ${diff >= -0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {diff >= -0.01
                    ? `✓ Cubierto${diff > 0.01 ? ` (+${formatCurrency(diff)})` : ''}`
                    : `Faltan ${formatCurrency(-diff)} por transferir`}
                </p>
                {linked.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {linked.map(a => (
                      <span key={a.id} className="text-xs bg-background/60 rounded px-1.5 py-0.5">
                        {a.icon} {a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Vincular cada cuenta a un propósito */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Vincular cuentas
          </h3>
          {accounts.map(account => (
            <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl shrink-0">{account.icon}</span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(Number(account.balance || 0), account.currency)}</p>
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
        </div>
      </CardContent>
    </Card>
  )
}
