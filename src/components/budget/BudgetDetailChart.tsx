'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { formatCompact } from '@/lib/utils/currency'

interface BudgetDetailChartProps {
  trend: { month: string; income: number; needs: number; wants: number; savings: number }[]
}

export function BudgetDetailChart({ trend }: BudgetDetailChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribución mensual</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v, name) => [
                `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
                ({ income: 'Ingresos', needs: 'Necesidades', wants: 'Ocio', savings: 'Ahorro' } as Record<string, string>)[String(name)] || String(name),
              ]}
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: 12 }}
            />
            <Legend formatter={v => ({ income: 'Ingresos', needs: 'Necesidades', wants: 'Ocio', savings: 'Ahorro' } as Record<string, string>)[v] || v} />
            <Bar dataKey="income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="needs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="wants" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="savings" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
