'use client'

import { useState } from 'react'
import { type Account, type AccountType, ACCOUNT_CONFIG } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { RefreshCw, Plus, Trash2 } from 'lucide-react'
import { revalidateAll } from '@/lib/hooks/use-finance-data'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CSVImportModal } from './CSVImportModal'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'


interface AccountsManagerProps {
  accounts: Account[]
}

function AddAccountModal({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('other')
  const supabase = createClient()

  async function handleAdd() {
    if (!name.trim()) return toast.error('Ingresa un nombre')
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const config = ACCOUNT_CONFIG[type]
      const { error } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: name.trim() || config.name,
        slug: `${type}-${Date.now()}`,
        type,
        currency: config.defaultCurrency,
        color: config.color,
        icon: config.icon,
        is_api_connected: false,
        balance: 0,
      })
      if (error) throw error
      toast.success('Cuenta agregada')
      setOpen(false)
      setName('')
      onSuccess()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Agregar cuenta
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva cuenta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Tipo de cuenta</Label>
            <Select value={type} onValueChange={v => { if (v) { setType(v as AccountType); setName(ACCOUNT_CONFIG[v as AccountType].name) } }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ACCOUNT_CONFIG) as [AccountType, typeof ACCOUNT_CONFIG[AccountType]][]).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.icon} {cfg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nombre de la cuenta</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={ACCOUNT_CONFIG[type].name}
            />
          </div>
          <Button onClick={handleAdd} className="w-full" disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
            Agregar
          </Button>
        </div>
      </DialogContent>
      </Dialog>
    </>
  )
}

export function AccountsManager({ accounts }: AccountsManagerProps) {
  const [adding, setAdding] = useState<string | null>(null)
  const supabase = createClient()

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta cuenta? Se eliminarán también sus transacciones.')) return
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Cuenta eliminada'); revalidateAll() }
  }

  async function handleAddAccount(type: typeof accounts[number]['type']) {
    setAdding(type)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const config = ACCOUNT_CONFIG[type as keyof typeof ACCOUNT_CONFIG]
      const { error } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: config.name,
        slug: `${type}-${Date.now()}`,
        type,
        currency: config.defaultCurrency,
        color: config.color,
        icon: config.icon,
        is_api_connected: false,
        balance: 0,
      })
      if (error) throw error
      toast.success(`${config.name} agregada`)
      revalidateAll()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}</p>
        <AddAccountModal onSuccess={() => revalidateAll()} />
      </div>

      {/* All accounts */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Mis cuentas
        </h2>

        {(['bbva', 'mercadopago', 'arq', 'edenred', 'cash'] as const).map(type => {
          const config = ACCOUNT_CONFIG[type]
          const userAccount = accounts.find(a => a.type === type)

          const subtitle: Record<string, string> = {
            bbva: 'Importa el CSV desde BBVA en línea → Movimientos → Descargar',
            mercadopago: 'Importa el CSV desde la app MP → Actividad → Exportar',
            arq: 'Importa el CSV desde la app ARQ → Historial → Exportar',
            edenred: 'Importa el CSV desde el portal Edenred Wallet → Mis movimientos',
            cash: 'Registro manual de efectivo',
          }

          return (
            <Card key={type} className="border">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: config.color + '15', border: `2px solid ${config.color}30` }}
                  >
                    {config.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{config.name}</p>
                      {type === 'edenred' && (
                        <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100">Despensa</Badge>
                      )}
                      {type === 'arq' && (
                        <Badge className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100">USD</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{subtitle[type]}</p>
                    {userAccount && (
                      <p className="text-sm font-medium mt-1">{formatCurrency(userAccount.balance || 0, config.defaultCurrency)}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {userAccount ? (
                      <>
                        <CSVImportModal account={userAccount} onSuccess={() => revalidateAll()} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(userAccount.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={adding === type}
                        onClick={() => handleAddAccount(type)}
                      >
                        {adding === type
                          ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                          : <Plus className="w-3.5 h-3.5 mr-1" />
                        }
                        Agregar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Other accounts */}
      {accounts.filter(a => !['bbva', 'mercadopago', 'arq', 'edenred', 'cash'].includes(a.type)).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Otras cuentas</h2>
          {accounts
            .filter(a => !['bbva', 'mercadopago', 'arq', 'edenred', 'cash'].includes(a.type))
            .map(account => (
              <Card key={account.id} className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-2xl">{account.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm">{formatCurrency(account.balance || 0, account.currency)}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(account.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
