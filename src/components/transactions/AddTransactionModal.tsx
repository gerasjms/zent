'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type Account, type Currency, EXPENSE_CATEGORIES, type TransactionType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { autoCategorize } from '@/lib/utils/categorize'
import { fetchExchangeRate } from '@/lib/utils/currency'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const schema = z.object({
  amount: z.string().min(1, 'Ingresa un monto'),
  description: z.string().min(1, 'Agrega una descripción'),
  category: z.string().optional(),
  budget_category: z.string().min(1),
  account_id: z.string().min(1, 'Selecciona una cuenta'),
  date: z.string().min(1),
  is_salary: z.boolean().optional(),
  transfer_to_account_id: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AddTransactionModalProps {
  accounts: Account[]
  onSuccess?: () => void
  children?: React.ReactNode
}

export function AddTransactionModal({ accounts, onSuccess, children }: AddTransactionModalProps) {
  const [open, setOpen] = useState(false)
  const [txType, setTxType] = useState<TransactionType>('expense')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      budget_category: 'need',
      date: format(new Date(), 'yyyy-MM-dd'),
      account_id: '',
      category: '',
      transfer_to_account_id: '',
    },
  })

  const description = watch('description')
  const selectedAccountId = watch('account_id')
  // La moneda se hereda de la cuenta seleccionada (origen, en transferencias).
  const txCurrency: Currency = accounts.find(a => a.id === selectedAccountId)?.currency ?? 'MXN'

  const categoryItems = txType === 'expense'
    ? [...EXPENSE_CATEGORIES.need.items, ...EXPENSE_CATEGORIES.want.items, ...EXPENSE_CATEGORIES.saving.items]
    : txType === 'income'
    ? EXPENSE_CATEGORIES.income.items
    : EXPENSE_CATEGORIES.transfer.items

  function handleDescriptionBlur() {
    if (!description) return
    const suggested = autoCategorize(description)
    if (suggested) setValue('budget_category', suggested)
  }

  function handleTxTypeChange(type: TransactionType) {
    setTxType(type)
    setValue('budget_category', type === 'income' ? 'income' : type === 'transfer' ? 'transfer' : 'need')
  }

  async function onSubmit(data: FormValues) {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const numAmount = parseFloat(data.amount)
      if (isNaN(numAmount) || numAmount <= 0) throw new Error('Monto inválido')
      if (txType !== 'transfer' && !data.category) throw new Error('Selecciona una categoría')
      let amountMxn = numAmount
      let exchangeRate = 1
      if (txCurrency === 'USD') {
        exchangeRate = await fetchExchangeRate()
        amountMxn = numAmount * exchangeRate
      }

      if (txType === 'transfer' && data.transfer_to_account_id && data.transfer_to_account_id !== data.account_id) {
        const transferId = crypto.randomUUID()
        const baseFields = {
          user_id: user.id,
          type: 'transfer' as const,
          amount: numAmount,
          currency: txCurrency,
          amount_mxn: amountMxn,
          exchange_rate: exchangeRate,
          category: 'Transferencia',
          budget_category: 'transfer' as const,
          description: data.description,
          date: data.date,
          source: 'manual' as const,
          is_salary: false,
          is_internal_transfer: true,
          transfer_id: transferId,
        }
        const { error } = await supabase.from('transactions').insert([
          { ...baseFields, account_id: data.account_id, is_transfer_credit: false },
          { ...baseFields, account_id: data.transfer_to_account_id, is_transfer_credit: true },
        ])
        if (error) throw error
      } else {
        const { error } = await supabase.from('transactions').insert({
          user_id: user.id,
          account_id: data.account_id,
          type: txType,
          amount: numAmount,
          currency: txCurrency,
          amount_mxn: amountMxn,
          exchange_rate: exchangeRate,
          category: data.category,
          budget_category: data.budget_category,
          description: data.description,
          notes: data.notes,
          date: data.date,
          source: 'manual',
          is_salary: data.is_salary || false,
          is_internal_transfer: false,
        })
        if (error) throw error
      }

      toast.success('Transacción registrada')
      reset()
      setOpen(false)
      onSuccess?.()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {children || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva transacción</DialogTitle>
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
                placeholder="0.00"
                className="text-lg font-semibold"
                {...register('amount')}
              />
              <p className="text-xs text-muted-foreground">
                Se registra en la moneda de la cuenta que elijas.
              </p>
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input
                placeholder="¿En qué fue?"
                {...register('description')}
                onBlur={handleDescriptionBlur}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Cuenta {txType === 'transfer' ? 'origen' : ''}</Label>
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
              {errors.account_id && <p className="text-xs text-destructive">{errors.account_id.message}</p>}
            </div>

            {txType === 'transfer' && (
              <div className="space-y-1">
                <Label>Cuenta destino</Label>
                <Controller
                  name="transfer_to_account_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={v => field.onChange(v ?? '')}>
                      <SelectTrigger><SelectValue placeholder="Selecciona cuenta destino" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.icon} {acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

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
                <input type="checkbox" id="is_salary" {...register('is_salary')} className="rounded" />
                <Label htmlFor="is_salary" className="cursor-pointer">Es nómina/salario</Label>
              </div>
            )}

            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input type="date" {...register('date')} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar transacción
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
