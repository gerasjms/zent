import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeBBVACode } from '@/lib/bbva/client'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/accounts?error=bbva_auth_failed`)
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${origin}/login`)

    const tokens = await exchangeBBVACode(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Upsert BBVA account
    const { error: upsertError } = await supabase
      .from('accounts')
      .upsert({
        user_id: user.id,
        name: 'BBVA',
        slug: 'bbva',
        type: 'bbva',
        currency: 'MXN',
        color: '#004f9f',
        icon: '🏦',
        is_api_connected: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        last_sync_at: new Date().toISOString(),
      }, { onConflict: 'user_id,slug' })

    if (upsertError) throw upsertError

    return NextResponse.redirect(`${origin}/accounts?success=bbva_connected`)
  } catch (err) {
    console.error('BBVA callback error:', err)
    return NextResponse.redirect(`${origin}/accounts?error=bbva_connection_failed`)
  }
}
