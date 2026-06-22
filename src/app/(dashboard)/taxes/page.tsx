'use client'

import { calculateTaxSummary, type TaxRegime } from '@/lib/taxes/engine'
import { TaxDashboard } from '@/components/taxes/TaxDashboard'
import { useTaxData, useUser } from '@/lib/hooks/use-finance-data'
import { CardsSkeleton } from '@/components/layout/loading-states'

export default function TaxesPage() {
  const { data: taxData, isLoading: loadingTax } = useTaxData()
  const { data: user, isLoading: loadingUser } = useUser()

  if (loadingTax || loadingUser || !taxData) return <CardsSkeleton maxWidth="max-w-5xl" />

  const regime: TaxRegime = (taxData.regime as TaxRegime) ?? 'general'
  const summary = calculateTaxSummary(taxData.incomeTransactions, regime)

  return (
    <TaxDashboard
      summary={summary}
      taxPayments={taxData.taxPayments}
      userId={user?.id ?? ''}
    />
  )
}
