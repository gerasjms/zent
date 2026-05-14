// BBVA API Market México
// Docs: https://www.bbvaapimarket.com/en/banking-apis/
// Registrar app en: https://www.bbvaapimarket.com/en/register/

const BBVA_BASE_URL = 'https://apis.bbva.com'
const BBVA_AUTH_URL = 'https://connect.bbva.com/oauth2/authorization'
const BBVA_TOKEN_URL = 'https://connect.bbva.com/oauth2/token'

export function getBBVAAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.BBVA_CLIENT_ID!,
    redirect_uri: process.env.BBVA_REDIRECT_URI!,
    scope: 'accounts balances transactions',
    state,
  })
  return `${BBVA_AUTH_URL}?${params.toString()}`
}

export async function exchangeBBVACode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch(BBVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.BBVA_CLIENT_ID}:${process.env.BBVA_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.BBVA_REDIRECT_URI!,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`BBVA token exchange failed: ${err}`)
  }

  return res.json()
}

export async function refreshBBVAToken(refreshToken: string) {
  const res = await fetch(BBVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.BBVA_CLIENT_ID}:${process.env.BBVA_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) throw new Error('BBVA token refresh failed')
  return res.json()
}

export async function getBBVAAccounts(accessToken: string) {
  const res = await fetch(`${BBVA_BASE_URL}/v1/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('BBVA accounts fetch failed')
  return res.json()
}

export async function getBBVATransactions(
  accessToken: string,
  accountId: string,
  fromDate: string,
  toDate: string
) {
  const params = new URLSearchParams({ fromDate, toDate })
  const res = await fetch(`${BBVA_BASE_URL}/v1/accounts/${accountId}/transactions?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('BBVA transactions fetch failed')
  return res.json()
}

export interface BBVATransaction {
  transactionId: string
  bookingDate: string
  valueDate: string
  amount: { amount: number; currency: string }
  creditorAccount?: { iban: string; name: string }
  debtorAccount?: { iban: string; name: string }
  remittanceInformationUnstructured: string
  proprietaryBankTransactionCode: string
}

export function normalizeBBVATransaction(tx: BBVATransaction, accountId: string, userId: string) {
  const isCredit = tx.amount.amount > 0
  return {
    user_id: userId,
    account_id: accountId,
    type: isCredit ? 'income' : 'expense',
    amount: Math.abs(tx.amount.amount),
    currency: tx.amount.currency || 'MXN',
    amount_mxn: Math.abs(tx.amount.amount),
    exchange_rate: 1,
    category: 'Sin categoría',
    description: tx.remittanceInformationUnstructured || tx.proprietaryBankTransactionCode || '',
    merchant: tx.creditorAccount?.name || tx.debtorAccount?.name,
    date: tx.bookingDate,
    source: 'bbva_api' as const,
    external_id: tx.transactionId,
    is_salary: false,
    is_internal_transfer: false,
  }
}
