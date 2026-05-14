'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type TaxSummary, type TaxRegime, REGIME_LABELS, REGIME_DESCRIPTIONS } from '@/lib/taxes/engine'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarClock, TrendingUp, Receipt, CheckCircle2, Circle, Plus, Info } from 'lucide-react'

interface TaxPayment {
  id: string
  period: string
  type: 'monthly' | 'annual'
  amount: number
  paid_at: string | null
  notes: string | null
}

interface TaxDashboardProps {
  summary: TaxSummary
  taxPayments: TaxPayment[]
  userId: string
}

function formatPeriod(period: string): string {
  if (period.length === 7) {
    const [year, month] = period.split('-')
    return format(new Date(Number(year), Number(month) - 1), 'MMMM yyyy', { locale: es })
  }
  return period
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d 'de' MMMM yyyy", { locale: es })
  } catch {
    return dateStr
  }
}

export function TaxDashboard({ summary, taxPayments, userId }: TaxDashboardProps) {
  const [regime, setRegime] = useState<TaxRegime>(summary.regime)
  const [savingRegime, setSavingRegime] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [logAmount, setLogAmount] = useState('')
  const [logPeriod, setLogPeriod] = useState(summary.currentMonth.period)
  const [logNotes, setLogNotes] = useState('')
  const [logging, setLogging] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSaveRegime(newRegime: TaxRegime) {
    setRegime(newRegime)
    setSavingRegime(true)
    try {
      const { error } = await supabase.from('tax_config').upsert({
        user_id: userId,
        regime: newRegime,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (error) throw error
      toast.success('Régimen actualizado')
      router.refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setSavingRegime(false)
    }
  }

  async function handleLogPayment() {
    const amount = parseFloat(logAmount)
    if (isNaN(amount) || amount <= 0) return toast.error('Ingresa un monto válido')
    setLogging(true)
    try {
      const { error } = await supabase.from('tax_payments').insert({
        user_id: userId,
        period: logPeriod,
        type: logPeriod.length === 7 ? 'monthly' : 'annual',
        amount,
        paid_at: new Date().toISOString().split('T')[0],
        notes: logNotes || null,
      })
      if (error) throw error
      toast.success('Pago registrado')
      setLogOpen(false)
      setLogAmount('')
      setLogNotes('')
      router.refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setLogging(false)
    }
  }

  const paidPeriods = new Set(taxPayments.filter(p => p.paid_at).map(p => p.period))
  const totalPaid = taxPayments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalOwed = summary.yearToDate.totalISR
  const balance = totalOwed - totalPaid

  const isAsalariado = regime === 'asalariado'

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Impuestos</h1>
          <p className="text-muted-foreground text-sm">ISR estimado según tus ingresos registrados</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setLogOpen(true)}>
          <Plus className="w-4 h-4" /> Registrar pago
        </Button>
      </div>

      {/* Régimen selector */}
      <Card className="border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Régimen fiscal</p>
              <p className="text-xs text-muted-foreground">{REGIME_DESCRIPTIONS[regime]}</p>
            </div>
            <Select value={regime} onValueChange={v => handleSaveRegime(v as TaxRegime)} disabled={savingRegime}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(REGIME_LABELS) as [TaxRegime, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isAsalariado ? (
        <Card className="border bg-blue-50/50">
          <CardContent className="p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">Tu patrón retiene el ISR</p>
              <p className="text-sm text-blue-700">
                Como asalariado, el ISR se descuenta automáticamente de tu nómina. Tu única obligación es presentar la <strong>declaración anual</strong> antes del <strong>30 de abril</strong> — en muchos casos el SAT te devuelve dinero.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen principal */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground">ISR este mes</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.currentMonth.isr)}</p>
                <p className="text-xs text-muted-foreground">
                  sobre {formatCurrency(summary.currentMonth.income)} de ingreso
                </p>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground">ISR acumulado {new Date().getFullYear()}</p>
                <p className="text-2xl font-bold">{formatCurrency(totalOwed)}</p>
                <p className="text-xs text-muted-foreground">
                  sobre {formatCurrency(summary.yearToDate.totalIncome)}
                </p>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Ya pagué</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                <p className="text-xs text-muted-foreground">{taxPayments.length} pagos registrados</p>
              </CardContent>
            </Card>

            <Card className={`border ${balance > 0 ? 'bg-red-50/50' : 'bg-emerald-50/50'}`}>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Pendiente por pagar</p>
                <p className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(Math.max(0, balance))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {balance <= 0 ? '¡Al corriente!' : 'ISR estimado sin pagar'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Fechas importantes */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Card className="border">
              <CardContent className="p-4 flex gap-3">
                <CalendarClock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Próximo pago provisional</p>
                  <p className="text-lg font-bold">{formatDate(summary.nextDueDate)}</p>
                  <p className="text-xs text-muted-foreground">Día 17 del mes siguiente via SAT en línea</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4 flex gap-3">
                <Receipt className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Declaración anual</p>
                  <p className="text-lg font-bold">{formatDate(summary.annualDeclarationDate)}</p>
                  <p className="text-xs text-muted-foreground">ISR proyectado anual: {formatCurrency(summary.annualProjection)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historial mensual */}
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> ISR por mes — {new Date().getFullYear()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {[...summary.yearToDate.months].reverse().map(month => {
                  const paid = paidPeriods.has(month.period)
                  const payment = taxPayments.find(p => p.period === month.period)
                  return (
                    <div key={month.period} className="flex items-center gap-3 py-3">
                      {paid
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{formatPeriod(month.period)}</p>
                        <p className="text-xs text-muted-foreground">
                          Ingreso: {formatCurrency(month.income)} · Vence: {formatDate(month.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(month.isr)}</p>
                        {paid && payment && (
                          <p className="text-xs text-emerald-600">Pagado: {formatCurrency(payment.amount)}</p>
                        )}
                        {!paid && month.isr > 0 && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Pendiente</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
                {summary.yearToDate.months.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Sin ingresos registrados este año. Agrega transacciones de tipo Ingreso.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Aviso */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 flex gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Los cálculos son estimados basados en la tarifa mensual del SAT 2024 aplicada a tus ingresos registrados en la app. Para la declaración oficial usa el portal del SAT o un contador.</p>
          </div>
        </>
      )}

      {/* Declaración anual para asalariados también */}
      {isAsalariado && (
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Declaración anual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Fecha límite</p>
                <p className="text-lg font-bold">{formatDate(summary.annualDeclarationDate)}</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">30 de abril</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Entra a <strong>sat.gob.mx</strong> con tu RFC y contraseña (o e.firma) → Declaraciones → Anual → Personas Físicas.
              El SAT precarga la información de tu patrón automáticamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal registrar pago */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pago de ISR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Periodo</Label>
              <Select value={logPeriod} onValueChange={v => setLogPeriod(v ?? summary.currentMonth.period)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {summary.yearToDate.months.map(m => (
                    <SelectItem key={m.period} value={m.period}>
                      {formatPeriod(m.period)} — {formatCurrency(m.isr)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Monto pagado</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={logAmount}
                onChange={e => setLogAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Referencia SAT, etc."
                value={logNotes}
                onChange={e => setLogNotes(e.target.value)}
              />
            </div>
            <Button onClick={handleLogPayment} disabled={logging} className="w-full">
              Guardar pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
