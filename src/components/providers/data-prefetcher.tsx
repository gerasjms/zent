'use client'

import { useAccounts, useTransactions, useBudgetConfig, useUser } from '@/lib/hooks/use-finance-data'

/**
 * Calienta la caché de SWR en cuanto entras al dashboard. Como el layout
 * persiste entre navegaciones, los datos comunes (cuentas, transacciones,
 * presupuesto, usuario) se cargan UNA vez y quedan listos para todas las
 * pantallas → la navegación se siente instantánea. No renderiza nada.
 */
export function DataPrefetcher() {
  useAccounts()
  useTransactions(500)
  useBudgetConfig()
  useUser()
  return null
}
