import { type Account, type Transaction, type AccountRecommendation, type AccountPurpose } from '@/types'

interface AccountStats {
  account: Account
  totalIncome: number
  totalExpenses: number
  needsExpenses: number
  wantsExpenses: number
  savingsMovements: number
  transactionCount: number
  avgTransaction: number
  dominantCategory: string
  categories: Record<string, number>
}

function buildAccountStats(account: Account, transactions: Transaction[]): AccountStats {
  const accountTxs = transactions.filter(tx => tx.account_id === account.id && !tx.is_internal_transfer)

  const totalIncome = accountTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_mxn, 0)
  const totalExpenses = accountTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_mxn, 0)
  const needsExpenses = accountTxs.filter(t => t.budget_category === 'need').reduce((s, t) => s + t.amount_mxn, 0)
  const wantsExpenses = accountTxs.filter(t => t.budget_category === 'want').reduce((s, t) => s + t.amount_mxn, 0)
  const savingsMovements = accountTxs.filter(t => t.budget_category === 'saving').reduce((s, t) => s + t.amount_mxn, 0)

  const categories: Record<string, number> = {}
  accountTxs.forEach(tx => {
    categories[tx.budget_category || 'unknown'] = (categories[tx.budget_category || 'unknown'] || 0) + tx.amount_mxn
  })

  const dominantCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
  const avgTransaction = accountTxs.length > 0 ? (totalIncome + totalExpenses) / accountTxs.length : 0

  return {
    account,
    totalIncome,
    totalExpenses,
    needsExpenses,
    wantsExpenses,
    savingsMovements,
    transactionCount: accountTxs.length,
    avgTransaction,
    dominantCategory,
    categories,
  }
}

export function generateAccountRecommendations(
  accounts: Account[],
  transactions: Transaction[]
): AccountRecommendation[] {
  if (accounts.length === 0) return []

  const stats = accounts.map(a => buildAccountStats(a, transactions))
  const totalTransactions = stats.reduce((s, st) => s + st.transactionCount, 0)
  const recommendations: AccountRecommendation[] = []

  for (const stat of stats) {
    const purposes: { purpose: AccountPurpose; confidence: number; reason: string }[] = []

    if (totalTransactions === 0) {
      // Sin datos: usar heurísticas por tipo de cuenta
      if (stat.account.type === 'bbva') {
        purposes.push({ purpose: 'saving', confidence: 0.7, reason: 'BBVA ofrece rendimientos y es ideal para mantener ahorros de largo plazo.' })
      } else if (stat.account.type === 'mercadopago') {
        purposes.push({ purpose: 'wants', confidence: 0.65, reason: 'Mercado Pago facilita pagos de entretenimiento y compras en línea.' })
        purposes.push({ purpose: 'needs', confidence: 0.55, reason: 'Mercado Pago acepta pagos de servicios básicos.' })
      } else if (stat.account.type === 'arq') {
        purposes.push({ purpose: 'saving', confidence: 0.75, reason: 'ARQ permite mantener ahorros en USD, protegiendo de la devaluación del peso.' })
      } else if (stat.account.type === 'edenred') {
        purposes.push({ purpose: 'needs', confidence: 0.9, reason: 'Edenred es exclusiva para despensa y necesidades básicas.' })
      } else if (stat.account.type === 'cash') {
        purposes.push({ purpose: 'wants', confidence: 0.6, reason: 'El efectivo es útil para gastos de ocio sin dejar rastro digital.' })
      }
    } else {
      // Con datos: recomendar basado en patrones reales
      const total = stat.totalIncome + stat.totalExpenses
      if (total === 0) continue

      const needsPct = stat.needsExpenses / (total || 1)
      const wantsPct = stat.wantsExpenses / (total || 1)
      const savingsPct = stat.savingsMovements / (total || 1)

      if (needsPct > 0.4) {
        purposes.push({
          purpose: 'needs',
          confidence: Math.min(0.95, 0.5 + needsPct),
          reason: `El ${Math.round(needsPct * 100)}% de tus movimientos en esta cuenta son necesidades básicas.`,
        })
      }
      if (wantsPct > 0.3) {
        purposes.push({
          purpose: 'wants',
          confidence: Math.min(0.95, 0.5 + wantsPct),
          reason: `El ${Math.round(wantsPct * 100)}% de tus movimientos son ocio y entretenimiento.`,
        })
      }
      if (savingsPct > 0.2 || stat.totalExpenses === 0) {
        purposes.push({
          purpose: 'saving',
          confidence: Math.min(0.95, 0.5 + savingsPct),
          reason: stat.totalExpenses === 0
            ? 'No registras gastos en esta cuenta, ideal para ahorro.'
            : `El ${Math.round(savingsPct * 100)}% de tus movimientos son ahorro.`,
        })
      }

      if (purposes.length === 0) {
        purposes.push({
          purpose: 'all',
          confidence: 0.4,
          reason: 'Esta cuenta tiene uso mixto. Considera separarla por propósito.',
        })
      }
    }

    for (const { purpose, confidence, reason } of purposes) {
      recommendations.push({
        account: stat.account,
        purpose,
        confidence,
        reason,
        is_manual: false,
        stats: {
          total_transactions: stat.transactionCount,
          dominant_category: stat.dominantCategory,
          avg_transaction: stat.avgTransaction,
        },
      })
    }
  }

  return recommendations.sort((a, b) => b.confidence - a.confidence)
}

export function getBestAccountForPurpose(
  recommendations: AccountRecommendation[],
  purpose: AccountPurpose
): AccountRecommendation | null {
  const matching = recommendations
    .filter(r => r.purpose === purpose || r.purpose === 'all')
    .sort((a, b) => b.confidence - a.confidence)

  return matching[0] || null
}
