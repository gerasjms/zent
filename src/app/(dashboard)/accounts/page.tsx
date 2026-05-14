import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type Account } from '@/types'
import { AccountsManager } from '@/components/accounts/AccountsManager'
import { calcAccountBalances } from '@/lib/utils/balance'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [accountsRes, txRes] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('transactions')
      .select('account_id, type, amount_mxn, is_transfer_credit')
      .eq('user_id', user.id),
  ])

  const accounts: Account[] = accountsRes.data || []
  const balanceMap = calcAccountBalances(txRes.data || [])
  const accountsWithBalance = accounts.map(a => ({ ...a, balance: balanceMap[a.id] ?? 0 }))

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis cuentas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conecta tus cuentas bancarias para sincronización automática o agrégalas manualmente
        </p>
      </div>
      <AccountsManager accounts={accountsWithBalance} />
    </div>
  )
}
