'use client'

import { SWRConfig } from 'swr'

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Datos siempre frescos: revalida al volver a la pestaña / reconectar.
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        // Navegación instantánea: mantiene los datos previos visibles mientras revalida.
        keepPreviousData: true,
        // Evita ráfagas de la misma petición en un lapso corto.
        dedupingInterval: 5000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
