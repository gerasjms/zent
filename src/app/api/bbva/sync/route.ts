import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBBVATransactions, refreshBBVAToken, normalizeBBVATransaction, type BBVATransaction } from '@/lib/bbva/client'
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
    .eq('type', 'bbva')
    .single()

  if (!account?.is_api_connected) {
    return NextResponse.json({ error: 'BBVA account not connected' }, { status: 400 })
  }

  try {
    let accessToken = account.access_token

    // Refresh token if expired
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      const refreshed = await refreshBBVAToken(account.refresh_token)
      accessToken = refreshed.access_token
      await supabase.from('accounts').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || account.refresh_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).eq('id', account.id)
    }

    const fromDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const toDate = format(new Date(), 'yyyy-MM-dd')

    const txData = await getBBVATransactions(accessToken, account.external_account_id || account.id, fromDate, toDate)
    const bbvaTxs: BBVATransaction[] = txData.transactions || []

    let synced = 0
    for (const tx of bbvaTxs) {
      const normalized = normalizeBBVATransaction(tx, account.id, user.id)
      const budget_category = autoCategorize(normalized.description, normalized.merchant)

      const { error } = await supabase.from('transactions').upsert({
        ...normalized,
        budget_category,
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
