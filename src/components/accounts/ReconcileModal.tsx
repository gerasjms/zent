'use client'

import { useState } from 'react'
import { type Account } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { revalidateAll } from '@/lib/hooks/use-finance-data'
import { formatCurrency } from '@/lib/utils/currency'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Scale, Loader2 } from 'lucide-react'

export function ReconcileModal({ account }: { account: Account }) {
  const [open, setOpen] = useState(false)
  const [real, setReal] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const calculated = Number(account.balance || 0)
  const realNum = parseFloat(real)
  const hasReal = !isNaN(realNum)
  const diff = hasReal ? realNum - calculated : 0

  async function handleReconcile() {
    if (!hasReal) return toast.error('Ingresa el saldo real')
    if (Math.abs(diff) < 0.01) {
      toast.success('Tu saldo ya estaba cuadrado')
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Ajuste marcado como interno: cuadra el balance pero NO cuenta para el
      // presupuesto (el budget engine ignora is_internal_transfer).
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: account.id,
        type: diff > 0 ? 'income' : 'expense',
        amount: Math.abs(diff),
        currency: 'MXN',
        amount_mxn: Math.abs(diff),
        exchange_rate: 1,
        category: 'Ajuste de conciliación',
        description: `Ajuste de conciliación (saldo real ${formatCurrency(realNum)})`,
        date: new Date().toISOString().split('T')[0],
        source: 'manual',
        is_internal_transfer: true,
      })
      if (error) throw error

      toast.success('Cuenta conciliada')
      setOpen(false)
      setReal('')
      await revalidateAll()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setOpen(true)}>
        <Scale className="w-3.5 h-3.5" /> Conciliar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conciliar {account.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Saldo calculado</span>
              <span className="font-medium">{formatCurrency(calculated)}</span>
            </div>
            <div className="space-y-1.5">
              <Label>Saldo real (lo que dice tu banco/app)</Label>
              <Input
                type="number"
                step="0.01"
                value={real}
                onChange={e => setReal(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            {hasReal && Math.abs(diff) >= 0.01 && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                Se creará un ajuste de{' '}
                <span className="font-semibold">{formatCurrency(Math.abs(diff))}</span>{' '}
                ({diff > 0 ? 'ingreso' : 'gasto'}) para que tu saldo quede exacto.
              </div>
            )}
            <Button onClick={handleReconcile} className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Conciliar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
