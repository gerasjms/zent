'use client'

import { type Account } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface AccountCardsProps {
  accounts: Account[]
  onSyncAccount?: (accountId: string) => void
  syncing?: string | null
}

export function AccountCards({ accounts, onSyncAccount, syncing }: AccountCardsProps) {
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Mis cuentas</h3>
        <span className="text-sm font-semibold">{formatCurrency(totalBalance)} total</span>
      </div>

      <div className="space-y-2">
        {accounts.map(account => (
          <Card key={account.id} className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: account.color + '20', border: `2px solid ${account.color}30` }}
                >
                  {account.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{account.name}</p>
                    {account.is_api_connected ? (
                      <Wifi className="w-3 h-3 text-emerald-500 shrink-0" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  {account.last_sync_at && (
                    <p className="text-xs text-muted-foreground">
                      Sync {formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true, locale: es })}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold">{formatCurrency(account.balance || 0, account.currency)}</p>
                  {account.is_api_connected && onSyncAccount && (
                    <button
                      onClick={() => onSyncAccount(account.id)}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5 ml-auto"
                    >
                      <RefreshCw className={cn('w-3 h-3', syncing === account.id && 'animate-spin')} />
                      Sync
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {accounts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No tienes cuentas configuradas</p>
            <p className="text-xs mt-1">Ve a la sección de Cuentas para agregar las tuyas</p>
          </div>
        )}
      </div>
    </div>
  )
}
