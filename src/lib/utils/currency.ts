export function formatCurrency(amount: number, currency: 'MXN' | 'USD' = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}k`
  }
  return formatCurrency(amount)
}

export async function fetchExchangeRate(from: 'USD' = 'USD', to: 'MXN' = 'MXN'): Promise<number> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('Rate fetch failed')
    const data = await res.json()
    return data.rates[to] ?? 17.5
  } catch {
    return 17.5
  }
}

export function categorizeByAmount(amount: number): 'small' | 'medium' | 'large' {
  if (amount < 500) return 'small'
  if (amount < 5000) return 'medium'
  return 'large'
}
