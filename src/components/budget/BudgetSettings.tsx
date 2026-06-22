'use client'

import { useState } from 'react'
import { type BudgetConfig, type BudgetPeriod } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { revalidateAll } from '@/lib/hooks/use-finance-data'

interface BudgetSettingsProps {
  config: BudgetConfig
  userId: string
}

export function BudgetSettings({ config, userId }: BudgetSettingsProps) {
  const [needs, setNeeds] = useState(config.needs_pct)
  const [wants, setWants] = useState(config.wants_pct)
  const [savings, setSavings] = useState(config.savings_pct)
  const [period, setPeriod] = useState<BudgetPeriod>(config.period)
  const [refIncome, setRefIncome] = useState(config.reference_income?.toString() || '')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const total = needs + wants + savings
  const isValid = total === 100

  async function handleSave() {
    if (!isValid) return toast.error('Los porcentajes deben sumar 100%')
    setLoading(true)
    try {
      const payload = {
        user_id: userId,
        needs_pct: needs,
        wants_pct: wants,
        savings_pct: savings,
        period,
        reference_income: refIncome ? parseFloat(refIncome) : null,
        updated_at: new Date().toISOString(),
      }

      const { error } = config.id
        ? await supabase.from('budget_config').update(payload).eq('id', config.id)
        : await supabase.from('budget_config').insert({ ...payload, currency: 'MXN' })

      if (error) throw error
      toast.success('Configuración guardada')
      revalidateAll()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configurar distribución</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Período</Label>
          <Select value={period} onValueChange={v => setPeriod(v as BudgetPeriod)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="biweekly">Quincenal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Ingreso de referencia (opcional)</Label>
          <Input
            type="number"
            placeholder="Deja vacío para usar el ingreso real"
            value={refIncome}
            onChange={e => setRefIncome(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Si lo dejas vacío, usa el ingreso detectado del período</p>
        </div>

        <div className="space-y-3">
          <Label>Distribución (debe sumar 100%)</Label>

          {[
            { label: '🛒 Necesidades', value: needs, setter: setNeeds, color: 'text-amber-600' },
            { label: '✨ Ocio y estilo de vida', value: wants, setter: setWants, color: 'text-violet-600' },
            { label: '🐷 Ahorro e inversión', value: savings, setter: setSavings, color: 'text-emerald-600' },
          ].map(({ label, value, setter, color }) => (
            <div key={label} className="flex items-center gap-3">
              <Label className={`${color} font-medium w-44 text-sm shrink-0`}>{label}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={value}
                onChange={e => setter(Number(e.target.value))}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}

          <div className={`flex items-center justify-between text-sm font-medium ${isValid ? 'text-emerald-600' : 'text-destructive'}`}>
            <span>Total</span>
            <span>{total}%{isValid ? ' ✓' : ' — debe ser 100%'}</span>
          </div>
        </div>

        <Button onClick={handleSave} disabled={!isValid || loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar configuración
        </Button>

        {/* Presets */}
        <div className="pt-2 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Presets populares</p>
          {[
            { label: '50/30/20 (clásico)', n: 50, w: 30, s: 20 },
            { label: '60/20/20 (conservador)', n: 60, w: 20, s: 20 },
            { label: '40/20/40 (ahorro agresivo)', n: 40, w: 20, s: 40 },
          ].map(preset => (
            <button
              key={preset.label}
              className="w-full text-left text-xs px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
              onClick={() => { setNeeds(preset.n); setWants(preset.w); setSavings(preset.s) }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
