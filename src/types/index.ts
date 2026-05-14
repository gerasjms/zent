export type AccountType = 'bbva' | 'mercadopago' | 'arq' | 'edenred' | 'cash' | 'other'
export type Currency = 'MXN' | 'USD'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type BudgetCategory = 'need' | 'want' | 'saving' | 'income' | 'transfer'
export type TransactionSource = 'bbva_api' | 'mercadopago_api' | 'csv_import' | 'manual'
export type BudgetPeriod = 'monthly' | 'biweekly'
export type AccountPurpose = 'saving' | 'needs' | 'wants' | 'all'

export interface Account {
  id: string
  user_id: string
  name: string
  slug: string
  type: AccountType
  currency: Currency
  color: string
  icon: string
  is_api_connected: boolean
  last_sync_at?: string
  balance: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  account?: Account
  type: TransactionType
  amount: number
  currency: Currency
  amount_mxn: number
  exchange_rate: number
  category: string
  budget_category?: BudgetCategory
  description: string
  merchant?: string
  notes?: string
  date: string
  source: TransactionSource
  external_id?: string
  transfer_id?: string
  is_salary: boolean
  is_internal_transfer: boolean
  created_at: string
  updated_at: string
}

export interface BudgetConfig {
  id: string
  user_id: string
  needs_pct: number
  wants_pct: number
  savings_pct: number
  reference_income?: number
  currency: Currency
  period: BudgetPeriod
  created_at: string
  updated_at: string
}

export interface AccountAssignment {
  id: string
  user_id: string
  account_id: string
  account?: Account
  purpose: AccountPurpose
  confidence: number
  is_manual: boolean
  reason?: string
  created_at: string
}

export interface BudgetBucket {
  budget: number
  spent: number
  remaining: number
  pct_used: number
}

export interface SavingsBucket {
  budget: number
  spent: number
  remaining: number
  pct_used: number
}

export interface BudgetSummary {
  income: number
  salary_income: number
  needs: BudgetBucket
  wants: BudgetBucket
  savings: SavingsBucket
  period_start: string
  period_end: string
  config: Pick<BudgetConfig, 'needs_pct' | 'wants_pct' | 'savings_pct' | 'period'>
}

export interface AccountRecommendation {
  account: Account
  purpose: AccountPurpose
  confidence: number
  reason: string
  is_manual: boolean
  stats: {
    total_transactions: number
    dominant_category: string
    avg_transaction: number
  }
}

export const ACCOUNT_CONFIG: Record<AccountType, { name: string; icon: string; color: string; defaultCurrency: Currency }> = {
  bbva: { name: 'BBVA', icon: '🏦', color: '#004f9f', defaultCurrency: 'MXN' },
  mercadopago: { name: 'Mercado Pago', icon: '💳', color: '#009ee3', defaultCurrency: 'MXN' },
  arq: { name: 'ARQ', icon: '💵', color: '#1a1a2e', defaultCurrency: 'USD' },
  edenred: { name: 'Edenred', icon: '🛒', color: '#e05206', defaultCurrency: 'MXN' },
  cash: { name: 'Efectivo', icon: '💰', color: '#10b981', defaultCurrency: 'MXN' },
  other: { name: 'Otra cuenta', icon: '🏧', color: '#6b7280', defaultCurrency: 'MXN' },
}

export const EXPENSE_CATEGORIES: Record<BudgetCategory, { label: string; items: string[] }> = {
  need: {
    label: 'Necesidades',
    items: ['Renta/Hipoteca', 'Servicios (agua, luz, gas)', 'Supermercado/Despensa', 'Transporte', 'Gasolina', 'Salud/Médico', 'Educación', 'Internet/Teléfono', 'Seguro'],
  },
  want: {
    label: 'Ocio y Estilo de vida',
    items: ['Restaurantes', 'Suscripciones (Netflix, Spotify)', 'Cine/Entretenimiento', 'Compras de ropa', 'Viajes', 'Hobbies', 'Gym/Deporte', 'Delivery/Comida rápida', 'Belleza/Estética'],
  },
  saving: {
    label: 'Ahorro e Inversión',
    items: ['Fondo de emergencia', 'Ahorro para meta', 'Inversión en acciones/ETFs', 'Criptomonedas', 'Plan de retiro'],
  },
  income: { label: 'Ingresos', items: ['Nómina/Salario', 'Freelance', 'Negocio', 'Inversiones', 'Transferencia recibida', 'Otro ingreso'] },
  transfer: { label: 'Transferencias', items: ['Entre mis cuentas'] },
}
