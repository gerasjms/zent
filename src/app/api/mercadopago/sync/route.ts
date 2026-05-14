import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMPPayments, refreshMPToken, normalizeMPPayment, type MPPayment } from '@/lib/mercadopago/client'
import { autoCategorize } from '@/lib/utils/categorize'
import { subDays, format } from 'date-fns'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'mercadopago')
    .single()

  if (!account?.is_api_connected) {
    return NextResponse.json({ error: 'Mercado Pago account not connected' }, { status: 400 })
  }

  try {
    let accessToken = account.access_token

    // Refresh token if expired
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      const refreshed = await refreshMPToken(account.refresh_token)
      accessToken = refreshed.access_token
      await supabase.from('accounts').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || account.refresh_token,
        token_expires_at: new Date(Date.now() + (refreshed.expires_in || 15552000) * 1000).toISOString(),
      }).eq('id', account.id)
    }

    const beginDate = subDays(new Date(), 30).toISOString()
    const endDate = new Date().toISOString()

    const paymentsData = await getMPPayments(accessToken, { begin_date: beginDate, end_date: endDate })
    const payments: MPPayment[] = paymentsData.results || []

    let synced = 0
    for (const payment of payments) {
      if (!['approved', 'rejected', 'cancelled'].includes(payment.status)) continue

      const normalized = normalizeMPPayment(payment, account.id, user.id)
      const budget_category = autoCategorize(normalized.description, normalized.merchant)

      const { error } = await supabase.from('transactions').upsert({
        ...normalized,
        budget_category,
        type: payment.transaction_amount > 0 ? 'expense' : 'income',
        amount: Math.abs(payment.transaction_amount),
        amount_mxn: Math.abs(payment.transaction_amount),
      }, { onConflict: 'external_id', ignoreDuplicates: true })

      if (!error) synced++
    }

    await supabase.from('accounts').update({ last_sync_at: new Date().toISOString() }).eq('id', account.id)
    await supabase.from('sync_logs').insert({
      user_id: user.id,
      account_id: account.id,
      status: 'success',
      transactions_synced: synced,
      completed_at: new Date().toISOString(),
    })

    return NextResponse.json({ synced })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await supabase.from('sync_logs').insert({
      user_id: user.id,
      account_id: account.id,
      status: 'error',
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
