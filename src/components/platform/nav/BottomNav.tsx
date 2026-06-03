'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, User, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  locale: string
  isAdmin?: boolean
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function BottomNav({ locale, isAdmin }: BottomNavProps) {
  const pathname = usePathname()

  const items: NavItem[] = [
    {
      href: `/${locale}/dashboard`,
      label: 'Tableau de bord',
      icon: LayoutDashboard,
    },
    {
      href: `/${locale}/dashboard`,
      label: 'Plan B',
      icon: BookOpen,
    },
    {
      href: `/${locale}/account`,
      label: 'Compte',
      icon: User,
    },
    ...(isAdmin ? [{
      href: `/${locale}/admin`,
      label: 'Admin',
      icon: ShieldCheck,
    }] : []),
  ]

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 inset-x-0 z-40',
        'bg-surface border-t border-cr-border',
        'flex items-center'
      )}
    >
      {items.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 px-2',
              'text-xs font-medium transition-colors duration-150',
              isActive ? 'text-cr-accent' : 'text-cr-text-muted'
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
