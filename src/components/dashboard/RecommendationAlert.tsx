'use client'

import { type AccountRecommendation } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Lightbulb, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getBestAccountForPurpose } from '@/lib/recommendations/engine'

interface RecommendationAlertProps {
  recommendations: AccountRecommendation[]
}

export function RecommendationAlert({ recommendations }: RecommendationAlertProps) {
  if (recommendations.length === 0) return null

  const savingRec = getBestAccountForPurpose(recommendations, 'saving')
  const needsRec = getBestAccountForPurpose(recommendations, 'needs')
  const wantsRec = getBestAccountForPurpose(recommendations, 'wants')

  const seen = new Set<string>()
  const highlights = [savingRec, needsRec, wantsRec]
    .filter(Boolean)
    .filter(rec => {
      const k = `${rec!.account.id}-${rec!.purpose}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    }) as AccountRecommendation[]
  if (highlights.length === 0) return null

  const purposeLabel: Record<string, string> = {
    saving: 'Ahorro',
    needs: 'Necesidades',
    wants: 'Ocio',
    all: 'Todo',
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Recomendaciones de cuentas
            </p>
            <div className="mt-2 space-y-1.5">
              {highlights.map((rec, i) => (
                <div key={`${i}-${rec.account.id}-${rec.purpose}`} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <span className="text-base">{rec.account.icon}</span>
                  <span>
                    Usa <strong>{rec.account.name}</strong> para {purposeLabel[rec.purpose]}
                    {rec.confidence >= 0.8 && ' ✓'}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/recommendations"
              className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium mt-3 hover:underline"
            >
              Ver análisis completo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
