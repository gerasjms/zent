import { type Transaction } from '@/types'

export type TaxRegime = 'asalariado' | 'resico' | 'general' | 'honorarios'

export interface MonthlyTaxSummary {
  period: string       // 'YYYY-MM'
  income: number
  isr: number
  dueDate: string      // fecha límite de pago
}

export interface TaxSummary {
  regime: TaxRegime
  currentMonth: MonthlyTaxSummary
  yearToDate: {
    totalIncome: number
    totalISR: number
    months: MonthlyTaxSummary[]
  }
  annualProjection: number
  nextDueDate: string
  annualDeclarationDate: string
}

// Tabla ISR mensual 2024 — SAT Personas Físicas (Régimen General / Honorarios)
const ISR_MONTHLY_TABLE = [
  { lower: 0.01,      upper: 746.04,     quota: 0,          rate: 0.0192 },
  { lower: 746.05,    upper: 6332.05,    quota: 14.32,      rate: 0.0640 },
  { lower: 6332.06,   upper: 11128.01,   quota: 371.83,     rate: 0.1088 },
  { lower: 11128.02,  upper: 12935.82,   quota: 893.63,     rate: 0.1600 },
  { lower: 12935.83,  upper: 15487.71,   quota: 1182.88,    rate: 0.1792 },
  { lower: 15487.72,  upper: 31236.49,   quota: 1640.18,    rate: 0.2136 },
  { lower: 31236.50,  upper: 49233.00,   quota: 5004.12,    rate: 0.2352 },
  { lower: 49233.01,  upper: 93993.90,   quota: 9236.89,    rate: 0.3000 },
  { lower: 93993.91,  upper: 125325.20,  quota: 22665.17,   rate: 0.3200 },
  { lower: 125325.21, upper: 375975.61,  quota: 32691.18,   rate: 0.3400 },
  { lower: 375975.62, upper: Infinity,   quota: 117912.32,  rate: 0.3500 },
]

// Tasas RESICO 2024 — aplican sobre el total del ingreso mensual (no marginal)
const RESICO_TABLE = [
  { upper: 25000,    rate: 0.010 },
  { upper: 50000,    rate: 0.011 },
  { upper: 83333,    rate: 0.015 },
  { upper: 208333,   rate: 0.020 },
  { upper: Infinity, rate: 0.025 },
]

function calcISRGeneral(monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 0
  const bracket = ISR_MONTHLY_TABLE.find(b => monthlyIncome >= b.lower && monthlyIncome <= b.upper)
  if (!bracket) return 0
  return bracket.quota + (monthlyIncome - bracket.lower) * bracket.rate
}

function calcISRResico(monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 0
  const bracket = RESICO_TABLE.find(b => monthlyIncome <= b.upper)!
  return monthlyIncome * bracket.rate
}

export function calcMonthlyISR(income: number, regime: TaxRegime): number {
  if (regime === 'asalariado') return 0  // lo retiene el patrón
  if (regime === 'resico') return calcISRResico(income)
  return calcISRGeneral(income)  // general y honorarios
}

function getDueDate(year: number, month: number): string {
  // Pago provisional: día 17 del mes siguiente
  const due = new Date(year, month, 17)  // month es 0-based, entonces month = mes siguiente
  return due.toISOString().split('T')[0]
}

function getNextDueDate(): string {
  const now = new Date()
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
  const month = (now.getMonth() + 1) % 12
  return getDueDate(year, month)
}

export function calculateTaxSummary(
  transactions: Transaction[],
  regime: TaxRegime
): TaxSummary {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Agrupar ingresos por mes (excluyendo transferencias internas y nómina de asalariado)
  const incomeByMonth: Record<string, number> = {}

  for (const tx of transactions) {
    if (tx.type !== 'income') continue
    if (tx.is_internal_transfer) continue

    const date = new Date(tx.date)
    if (date.getFullYear() !== currentYear) continue

    const key = `${currentYear}-${String(date.getMonth() + 1).padStart(2, '0')}`
    incomeByMonth[key] = (incomeByMonth[key] || 0) + (tx.amount_mxn ?? tx.amount)
  }

  // Calcular ISR por mes
  const months: MonthlyTaxSummary[] = []
  for (let m = 1; m <= currentMonth; m++) {
    const key = `${currentYear}-${String(m).padStart(2, '0')}`
    const income = incomeByMonth[key] || 0
    const isr = calcMonthlyISR(income, regime)
    months.push({
      period: key,
      income,
      isr,
      dueDate: getDueDate(currentYear, m),
    })
  }

  const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  const currentMonthData = months.find(m => m.period === currentMonthKey) ?? {
    period: currentMonthKey,
    income: 0,
    isr: 0,
    dueDate: getDueDate(currentYear, currentMonth),
  }

  const totalIncome = months.reduce((s, m) => s + m.income, 0)
  const totalISR = months.reduce((s, m) => s + m.isr, 0)

  // Proyección anual: promedio mensual × 12
  const avgMonthly = months.length > 0 ? totalIncome / months.length : 0
  const projectedAnnualIncome = avgMonthly * 12
  const annualProjection = calcMonthlyISR(avgMonthly, regime) * 12

  return {
    regime,
    currentMonth: currentMonthData,
    yearToDate: { totalIncome, totalISR, months },
    annualProjection,
    nextDueDate: getNextDueDate(),
    annualDeclarationDate: `${currentYear + 1}-04-30`,
  }
}

export const REGIME_LABELS: Record<TaxRegime, string> = {
  asalariado: 'Asalariado (nómina)',
  resico: 'RESICO',
  general: 'Régimen General',
  honorarios: 'Honorarios',
}

export const REGIME_DESCRIPTIONS: Record<TaxRegime, string> = {
  asalariado: 'El ISR lo retiene tu patrón. Solo presentas declaración anual en abril.',
  resico: 'Tasa fija del 1% al 2.5% sobre ingresos mensuales. Pago provisional el día 17.',
  general: 'Tarifa progresiva del SAT. Pago provisional mensual el día 17.',
  honorarios: 'Igual que Régimen General. Tarifa progresiva, pago mensual el día 17.',
}
