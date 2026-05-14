'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ArrowLeftRight, CreditCard, Target, Receipt } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Movimientos' },
  { href: '/accounts', icon: CreditCard, label: 'Cuentas' },
  { href: '/budget', icon: Target, label: 'Presupuesto' },
  { href: '/taxes', icon: Receipt, label: 'Impuestos' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-card z-50">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors min-w-0 flex-1',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'scale-110 transition-transform')} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
