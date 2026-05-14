'use client'

import { type Transaction } from '@/types'
import { getMonthlyTrend } from '@/lib/budget/engine'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCompact } from '@/lib/utils/currency'

interface SpendingChartProps {
  transactions: Transaction[]
}

export function SpendingChart({ transactions }: SpendingChartProps) {
  const data = getMonthlyTrend(transactions, 6)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tendencia de 6 meses</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorNeeds" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorWants" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <Tooltip
              formatter={(value, name) => [
                `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
                ({ income: 'Ingresos', needs: 'Necesidades', wants: 'Ocio', savings: 'Ahorro' } as Record<string, string>)[String(name)] || String(name),
              ]}
              labelClassName="font-medium"
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: 12 }}
            />
            <Legend
              formatter={v => ({ income: 'Ingresos', needs: 'Necesidades', wants: 'Ocio', savings: 'Ahorro' } as Record<string, string>)[v] || v}
            />
            <Area type="monotone" dataKey="income" stroke="#3b82f6" fill="url(#colorIncome)" strokeWidth={2} />
            <Area type="monotone" dataKey="needs" stroke="#f59e0b" fill="url(#colorNeeds)" strokeWidth={2} />
            <Area type="monotone" dataKey="wants" stroke="#8b5cf6" fill="url(#colorWants)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
