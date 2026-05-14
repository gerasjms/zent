import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { generateAccountRecommendations, getBestAccountForPurpose } from '@/lib/recommendations/engine'
import { type Account, type Transaction } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertCircle, Lightbulb, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

export default async function RecommendationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [accountsRes, transactionsRes] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(500),
  ])

  const accounts: Account[] = accountsRes.data || []
  const transactions: Transaction[] = transactionsRes.data || []
  const recommendations = generateAccountRecommendations(accounts, transactions)

  const purposeConfig = {
    saving: { label: 'Ahorro e inversión', icon: '🐷', color: 'emerald', description: 'Donde mantener tu fondo de emergencia y metas de ahorro' },
    needs: { label: 'Necesidades básicas', icon: '🛒', color: 'amber', description: 'Donde pagar renta, supermercado, servicios, salud' },
    wants: { label: 'Ocio y estilo de vida', icon: '✨', color: 'violet', description: 'Donde pagar entretenimiento, restaurantes, suscripciones' },
  }

  const bestSaving = getBestAccountForPurpose(recommendations, 'saving')
  const bestNeeds = getBestAccountForPurpose(recommendations, 'needs')
  const bestWants = getBestAccountForPurpose(recommendations, 'wants')

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Recomendaciones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Análisis inteligente de cómo usar cada cuenta para maximizar tu bienestar financiero
        </p>
      </div>

      {/* Top recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {([['saving', bestSaving], ['needs', bestNeeds], ['wants', bestWants]] as const).map(([purpose, rec]) => {
          const cfg = purposeConfig[purpose]
          return (
            <Card key={purpose} className="border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{cfg.icon}</span>
                  {rec ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="text-sm">{cfg.label}</CardTitle>
                <p className="text-xs text-muted-foreground">{cfg.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                {rec ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{rec.account.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{rec.account.name}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(rec.confidence * 100)}% confianza</p>
                      </div>
                    </div>
                    <Progress value={rec.confidence * 100} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Agrega más transacciones para generar recomendaciones
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* All recommendations */}
      <div className="space-y-3">
        <h2 className="font-semibold">Análisis por cuenta</h2>
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm">Agrega tus cuentas primero para ver recomendaciones</p>
            </CardContent>
          </Card>
        ) : (
          accounts.map(account => {
            const accountRecs = recommendations.filter(r => r.account.id === account.id)
            const accountTxs = transactions.filter(t => t.account_id === account.id && !t.is_internal_transfer)
            const totalSpent = accountTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_mxn, 0)
            const totalIncome = accountTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_mxn, 0)

            return (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: account.color + '15', border: `2px solid ${account.color}30` }}
                    >
                      {account.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{account.name}</p>
                        {accountRecs.map(rec => (
                          <Badge
                            key={rec.purpose}
                            className="text-xs"
                            style={{
                              backgroundColor: rec.confidence >= 0.7 ? '#10b98120' : '#6b728020',
                              color: rec.confidence >= 0.7 ? '#059669' : '#374151',
                            }}
                          >
                            {rec.purpose === 'saving' ? '🐷 Ahorro' : rec.purpose === 'needs' ? '🛒 Necesidades' : rec.purpose === 'wants' ? '✨ Ocio' : '⭐ Todo'}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className="font-medium">{formatCurrency(account.balance || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Ingresos</p>
                          <p className="font-medium text-blue-600">+{formatCurrency(totalIncome)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Gastos</p>
                          <p className="font-medium text-red-500">-{formatCurrency(totalSpent)}</p>
                        </div>
                      </div>

                      {accountRecs.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {accountRecs.map(rec => (
                            <div key={rec.purpose} className="flex items-start gap-2">
                              <TrendingUp className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                              <p className="text-xs text-muted-foreground">{rec.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
