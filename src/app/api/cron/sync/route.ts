import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Vercel Cron Job — runs every 4 hours
// Config in vercel.json
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Get all connected accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*, user:user_id(*)')
    .eq('is_api_connected', true)
    .in('type', ['bbva', 'mercadopago'])

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No connected accounts' })
  }

  const results = await Promise.allSettled(
    accounts.map(account =>
      fetch(`${request.nextUrl.origin}/api/${account.type}/sync`, {
        method: 'POST',
        headers: { Cookie: `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token=` },
      })
    )
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({
    message: `Synced ${succeeded}/${accounts.length} accounts`,
    timestamp: new Date().toISOString(),
  })
}
