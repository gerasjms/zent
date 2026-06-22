import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { SWRProvider } from '@/components/providers/swr-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Finanzas — Control total de tu dinero',
  description: 'Monitorea tus gastos, ingresos y ahorros en BBVA, Mercado Pago, ARQ y Edenred desde un solo lugar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        <SWRProvider>{children}</SWRProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
