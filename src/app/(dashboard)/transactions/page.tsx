import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type Transaction, type Account } from '@/types'
import { TransactionsView } from '@/components/transactions/TransactionsView'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [transactionsRes, accountsRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, account:accounts(id, name, icon, color, type)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(500),
    supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at'),
  ])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Historial de transacciones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Todos tus movimientos con filtros avanzados
        </p>
      </div>
      <TransactionsView
        transactions={(transactionsRes.data as Transaction[]) || []}
        accounts={(accountsRes.data as Account[]) || []}
      />
    </div>
  )
}
