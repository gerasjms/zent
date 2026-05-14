// Mercado Pago API
// Docs: https://www.mercadopago.com.mx/developers
// Crear app: https://www.mercadopago.com.mx/developers/panel/app

const MP_AUTH_URL = 'https://auth.mercadopago.com/authorization'
const MP_TOKEN_URL = 'https://api.mercadopago.com/oauth/token'
const MP_API_BASE = 'https://api.mercadopago.com'

export function getMPAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.MP_CLIENT_ID!,
    redirect_uri: process.env.MP_REDIRECT_URI!,
    state,
  })
  return `${MP_AUTH_URL}?${params.toString()}`
}

export async function exchangeMPCode(code: string) {
  const res = await fetch(MP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.MP_REDIRECT_URI,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MP token exchange failed: ${err}`)
  }
  return res.json()
}

export async function refreshMPToken(refreshToken: string) {
  const res = await fetch(MP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) throw new Error('MP token refresh failed')
  return res.json()
}

export async function getMPBalance(accessToken: string) {
  const res = await fetch(`${MP_API_BASE}/v1/account/balance`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('MP balance fetch failed')
  return res.json()
}

export async function getMPMovements(
  accessToken: string,
  options: { begin_date?: string; end_date?: string; limit?: number; offset?: number } = {}
) {
  const params = new URLSearchParams({
    begin_date: options.begin_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: options.end_date || new Date().toISOString(),
    limit: String(options.limit || 50),
    offset: String(options.offset || 0),
  })

  const res = await fetch(`${MP_API_BASE}/v1/account/settlement-report/list?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('MP movements fetch failed')
  return res.json()
}

export async function getMPPayments(
  accessToken: string,
  options: { begin_date?: string; end_date?: string } = {}
) {
  const params = new URLSearchParams({
    begin_date: options.begin_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: options.end_date || new Date().toISOString(),
    sort: 'date_created',
    criteria: 'desc',
  })

  const res = await fetch(`${MP_API_BASE}/v1/payments/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('MP payments fetch failed')
  return res.json()
}

export interface MPPayment {
  id: number
  date_created: string
  date_approved: string
  status: string
  status_detail: string
  transaction_amount: number
  currency_id: string
  description: string
  payment_type_id: string
  payer?: { email: string }
  metadata?: Record<string, unknown>
}

export function normalizeMPPayment(payment: MPPayment, accountId: string, userId: string) {
  const isIncoming = ['approved', 'in_process'].includes(payment.status)
  return {
    user_id: userId,
    account_id: accountId,
    type: isIncoming ? 'income' : 'expense',
    amount: Math.abs(payment.transaction_amount),
    currency: (payment.currency_id || 'MXN') as 'MXN' | 'USD',
    amount_mxn: Math.abs(payment.transaction_amount),
    exchange_rate: 1,
    category: 'Sin categoría',
    description: payment.description || payment.payment_type_id || '',
    merchant: payment.payer?.email,
    date: payment.date_created?.split('T')[0],
    source: 'mercadopago_api' as const,
    external_id: String(payment.id),
    is_salary: false,
    is_internal_transfer: false,
  }
}
