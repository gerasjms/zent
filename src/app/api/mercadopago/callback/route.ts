import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeMPCode } from '@/lib/mercadopago/client'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/accounts?error=mp_auth_failed`)
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${origin}/login`)

    const tokens = await exchangeMPCode(code)
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 180 days

    await supabase.from('accounts').upsert({
      user_id: user.id,
      name: 'Mercado Pago',
      slug: 'mercadopago',
      type: 'mercadopago',
      currency: 'MXN',
      color: '#009ee3',
      icon: '💳',
      is_api_connected: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      last_sync_at: new Date().toISOString(),
    }, { onConflict: 'user_id,slug' })

    return NextResponse.redirect(`${origin}/accounts?success=mp_connected`)
  } catch (err) {
    console.error('MP callback error:', err)
    return NextResponse.redirect(`${origin}/accounts?error=mp_connection_failed`)
  }
}
