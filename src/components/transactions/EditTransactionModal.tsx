'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type Account, type Transaction, type Currency, EXPENSE_CATEGORIES, type TransactionType, type BudgetCategory } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { fetchExchangeRate } from '@/lib/utils/currency'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Pencil } from 'lucide-react'

const schema = z.object({
  amount: z.string().min(1),
  description: z.string().min(1, 'Agrega una descripción'),
  category: z.string().optional(),
  budget_category: z.string().min(1),
  account_id: z.string().min(1),
  date: z.string().min(1),
  is_salary: z.boolean().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface EditTransactionModalProps {
  transaction: Transaction
  accounts: Account[]
  onSuccess?: () => void
}

export function EditTransactionModal({ transaction, accounts, onSuccess }: EditTransactionModalProps) {
  const [open, setOpen] = useState(false)
  const [txType, setTxType] = useState<TransactionType>(transaction.type)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: String(transaction.amount),
      description: transaction.description,
      category: transaction.category ?? '',
      budget_category: transaction.budget_category ?? 'need',
      account_id: transaction.account_id,
      date: transaction.date,
      is_salary: transaction.is_salary,
      notes: transaction.notes ?? '',
    },
  })

  const selectedAccountId = watch('account_id')
  const txCurrency: Currency = accounts.find(a => a.id === selectedAccountId)?.currency ?? transaction.currency

  const categoryItems = txType === 'expense'
    ? [...EXPENSE_CATEGORIES.need.items, ...EXPENSE_CATEGORIES.want.items, ...EXPENSE_CATEGORIES.saving.items]
    : txType === 'income'
    ? EXPENSE_CATEGORIES.income.items
    : EXPENSE_CATEGORIES.transfer.items

  function handleTxTypeChange(type: TransactionType) {
    setTxType(type)
    setValue('budget_category', type === 'income' ? 'income' : type === 'transfer' ? 'transfer' : 'need')
  }

  async function onSubmit(data: FormValues) {
    setLoading(true)
    try {
      const numAmount = parseFloat(data.amount)
      if (isNaN(numAmount) || numAmount <= 0) throw new Error('Monto inválido')

      let amountMxn = numAmount
      let exchangeRate = 1
      if (txCurrency === 'USD') {
        exchangeRate = await fetchExchangeRate()
        amountMxn = numAmount * exchangeRate
      }

      const { error } = await supabase.from('transactions').update({
        type: txType,
        amount: numAmount,
        currency: txCurrency,
        amount_mxn: amountMxn,
        exchange_rate: exchangeRate,
        category: data.category ?? '',
        budget_category: data.budget_category as BudgetCategory,
        description: data.description,
        notes: data.notes,
        date: data.date,
        is_salary: data.is_salary ?? false,
        is_internal_transfer: txType === 'transfer',
        account_id: data.account_id,
      }).eq('id', transaction.id)

      if (error) throw error

      toast.success('Transacción actualizada')
      setOpen(false)
      onSuccess?.()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        className="w-7 h-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar transacción</DialogTitle>
          </DialogHeader>

          <Tabs value={txType} onValueChange={v => handleTxTypeChange(v as TransactionType)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="expense">Gasto</TabsTrigger>
              <TabsTrigger value="income">Ingreso</TabsTrigger>
              <TabsTrigger value="transfer">Transferencia</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Monto <span className="text-muted-foreground font-normal">({txCurrency})</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="text-lg font-semibold"
                {...register('amount')}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input placeholder="¿En qué fue?" {...register('description')} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Cuenta</Label>
              <Controller
                name="account_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={v => field.onChange(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Selecciona cuenta" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.icon} {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {txType !== 'transfer' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Categoría</Label>
                  <Controller
                    name="budget_category"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={v => field.onChange(v ?? 'need')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {txType === 'expense' && (
                            <>
                              <SelectItem value="need">Necesidad</SelectItem>
                              <SelectItem value="want">Ocio</SelectItem>
                              <SelectItem value="saving">Ahorro</SelectItem>
                            </>
                          )}
                          {txType === 'income' && <SelectItem value="income">Ingreso</SelectItem>}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Subcategoría</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={v => field.onChange(v ?? '')}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {categoryItems.map(item => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            )}

            {txType === 'income' && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit_is_salary" {...register('is_salary')} className="rounded" />
                <Label htmlFor="edit_is_salary" className="cursor-pointer">Es nómina/salario</Label>
              </div>
            )}

            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input type="date" {...register('date')} />
            </div>

            <div className="space-y-1">
              <Label>Notas <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input placeholder="Notas adicionales..." {...register('notes')} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
