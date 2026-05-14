import { type BudgetCategory } from '@/types'

const CATEGORY_RULES: Record<BudgetCategory, string[]> = {
  need: [
    'renta', 'hipoteca', 'supermercado', 'walmart', 'soriana', 'chedraui', 'bodega aurrera',
    'costco', 'sams', 'la comer', 'electricidad', 'cfe', 'agua', 'gas', 'telmex', 'telcel',
    'at&t', 'movistar', 'transporte', 'uber', 'metro', 'metrobus', 'gasolina', 'pemex', 'bp',
    'hospital', 'farmacia', 'salud', 'doctor', 'medicina', 'escuela', 'colegiatura', 'seguro',
    'despensa', 'edenred',
  ],
  want: [
    'restaurante', 'starbucks', 'mcdonalds', 'burger king', 'dominos', 'netflix', 'spotify',
    'amazon prime', 'disney', 'hbo', 'apple tv', 'cine', 'cinepolis', 'cinemex', 'ropa',
    'zara', 'h&m', 'liverpool', 'palacio', 'amazon', 'mercadolibre', 'gym', 'smart fit',
    'bar', 'antro', 'viaje', 'hotel', 'airbnb', 'uber eats', 'rappi', 'didi food',
    'peluqueria', 'estetica', 'spa', 'ocio', 'hobby',
  ],
  saving: ['inversión', 'ahorro', 'gbm', 'fondo', 'cetes', 'bitso', 'kuspit', 'actinver'],
  income: ['nómina', 'sueldo', 'salario', 'pago', 'depósito', 'transferencia recibida'],
  transfer: ['transferencia', 'traspaso', 'spei', 'entre cuentas'],
}

export function autoCategorize(description: string, merchant?: string): BudgetCategory | undefined {
  const text = `${description} ${merchant || ''}`.toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_RULES) as [BudgetCategory, string[]][]) {
    if (keywords.some(k => text.includes(k))) {
      return category
    }
  }

  return undefined
}

export function getCategoryLabel(category: BudgetCategory): string {
  const labels: Record<BudgetCategory, string> = {
    need: 'Necesidad',
    want: 'Ocio',
    saving: 'Ahorro',
    income: 'Ingreso',
    transfer: 'Transferencia',
  }
  return labels[category] || category
}

export function getCategoryColor(category?: BudgetCategory): string {
  const colors: Record<string, string> = {
    need: '#f59e0b',
    want: '#8b5cf6',
    saving: '#10b981',
    income: '#3b82f6',
    transfer: '#6b7280',
  }
  return colors[category || ''] || '#6b7280'
}
