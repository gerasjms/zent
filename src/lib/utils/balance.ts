interface BalanceTx {
  account_id: string
  type: string
  amount_mxn: number
  is_transfer_credit?: boolean | null
}

export function calcAccountBalances(transactions: BalanceTx[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const tx of transactions) {
    const prev = map[tx.account_id] ?? 0
    if (tx.type === 'income') {
      map[tx.account_id] = prev + tx.amount_mxn
    } else if (tx.type === 'expense') {
      map[tx.account_id] = prev - tx.amount_mxn
    } else if (tx.type === 'transfer') {
      map[tx.account_id] = tx.is_transfer_credit ? prev + tx.amount_mxn : prev - tx.amount_mxn
    }
  }
  return map
}
