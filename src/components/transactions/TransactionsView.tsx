'use client'

import { useState, useMemo } from 'react'
import { type Transaction, type Account, type BudgetCategory } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { getCategoryColor, getCategoryLabel } from '@/lib/utils/categorize'
import { createClient } from '@/lib/supabase/client'
import { AddTransactionModal } from './AddTransactionModal'
import { EditTransactionModal } from './EditTransactionModal'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Search, Trash2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus, CheckSquare, Square, X } from 'lucide-react'
import { revalidateAll } from '@/lib/hooks/use-finance-data'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface TransactionsViewProps {
  transactions: Transaction[]
  accounts: Account[]
}

export function TransactionsView({ transactions, accounts }: TransactionsViewProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase()) &&
          !tx.category.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      if (categoryFilter !== 'all' && tx.budget_category !== categoryFilter) return false
      if (accountFilter !== 'all' && tx.account_id !== accountFilter) return false
      if (dateFrom && tx.date < dateFrom) return false
      if (dateTo && tx.date > dateTo) return false
      return true
    })
  }, [transactions, search, typeFilter, categoryFilter, accountFilter, dateFrom, dateTo])

  const totals = useMemo(() => ({
    income: filtered.filter(t => t.type === 'income' && !t.is_internal_transfer).reduce((s, t) => s + t.amount_mxn, 0),
    expense: filtered.filter(t => t.type === 'expense' && !t.is_internal_transfer).reduce((s, t) => s + t.amount_mxn, 0),
  }), [filtered])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta transacción?')) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Transacción eliminada'); revalidateAll() }
  }

  async function handleBulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} transacciones?`)) return
    const ids = Array.from(selected)
    const { error } = await supabase.from('transactions').delete().in('id', ids)
    if (error) toast.error(error.message)
    else {
      toast.success(`${ids.length} transacciones eliminadas`)
      setSelected(new Set())
      revalidateAll()
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(t => t.id)))
    }
  }

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    for (const tx of filtered) {
      const key = tx.date
      if (!groups[key]) groups[key] = []
      groups[key].push(tx)
    }
    return groups
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">+{formatCurrency(totals.income)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">-{formatCurrency(totals.expense)}</p>
          </CardContent>
        </Card>
        <Card className={`border-0 ${totals.income - totals.expense >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className={`text-lg font-bold ${totals.income - totals.expense >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(totals.income - totals.expense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transacciones..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={v => setTypeFilter(v ?? 'all')}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Ingresos</SelectItem>
                <SelectItem value="expense">Gastos</SelectItem>
                <SelectItem value="transfer">Transferencias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v ?? 'all')}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Categorías</SelectItem>
                <SelectItem value="need">Necesidades</SelectItem>
                <SelectItem value="want">Ocio</SelectItem>
                <SelectItem value="saving">Ahorro</SelectItem>
                <SelectItem value="income">Ingresos</SelectItem>
                <SelectItem value="transfer">Transferencias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={accountFilter} onValueChange={v => setAccountFilter(v ?? 'all')}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Cuenta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cuentas</SelectItem>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.icon} {acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" className="w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <Input type="date" className="w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <AddTransactionModal accounts={accounts} onSuccess={() => revalidateAll()}>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Nueva</Button>
            </AddTransactionModal>
          </div>
        </CardContent>
      </Card>

      {/* Bulk selection toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-lg">
          <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-sm font-medium text-primary">
            {selected.size === filtered.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {selected.size} seleccionadas
          </button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelected(new Set())}>
            <X className="w-3.5 h-3.5 mr-1" /> Cancelar
          </Button>
          <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5" onClick={handleBulkDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Eliminar {selected.size}
          </Button>
        </div>
      )}

      {/* Transaction list grouped by date */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No se encontraron transacciones</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByDate)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, dayTxs]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-sm font-semibold capitalize">
                    {format(new Date(date + 'T00:00:00'), 'EEEE, d MMMM', { locale: es })}
                  </p>
                  <div className="flex-1 h-px bg-border" />
                  <p className="text-xs text-muted-foreground">
                    {dayTxs.filter(t => !t.is_internal_transfer).length} movimientos
                  </p>
                </div>
                <Card className="border overflow-hidden">
                  <div className="divide-y">
                    {dayTxs.map(tx => {
                      const acc = accounts.find(a => a.id === tx.account_id)
                      const isIncome = tx.type === 'income'
                      const isTransfer = tx.is_internal_transfer
                      const isSelected = selected.has(tx.id)
                      return (
                        <div key={tx.id} className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/30 group transition-colors', isSelected && 'bg-primary/5')}>
                          <button onClick={() => toggleSelect(tx.id)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 opacity-0 group-hover:opacity-100" />}
                          </button>
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                            isTransfer ? 'bg-gray-100 dark:bg-gray-800' :
                            isIncome ? 'bg-blue-100 dark:bg-blue-950' : 'bg-red-50 dark:bg-red-950'
                          )}>
                            {isTransfer ? (
                              <ArrowLeftRight className="w-3.5 h-3.5 text-gray-500" />
                            ) : isIncome ? (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{tx.description || tx.category}</p>
                              {tx.is_salary && <Badge className="text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700">Nómina</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {acc && <span className="text-xs text-muted-foreground">{acc.icon} {acc.name}</span>}
                              {tx.budget_category && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1.5"
                                  style={{ borderColor: getCategoryColor(tx.budget_category as BudgetCategory) + '50', color: getCategoryColor(tx.budget_category as BudgetCategory) }}
                                >
                                  {getCategoryLabel(tx.budget_category as BudgetCategory)}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {tx.source === 'manual' ? 'Manual' : tx.source === 'csv_import' ? 'CSV' : 'API'}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <p className={cn(
                              'font-semibold text-sm mr-2',
                              isIncome ? 'text-blue-600 dark:text-blue-400' :
                              isTransfer ? 'text-muted-foreground' : ''
                            )}>
                              {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(tx.amount_mxn)}
                            </p>
                            <EditTransactionModal
                              transaction={tx}
                              accounts={accounts}
                              onSuccess={() => revalidateAll()}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-7 h-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(tx.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
