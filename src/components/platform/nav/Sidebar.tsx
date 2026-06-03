'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { LayoutDashboard, BookOpen, User, LogOut, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  locale: string
  isAdmin?: boolean
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function Sidebar({ locale, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems: NavItem[] = [
    {
      href: `/${locale}/dashboard`,
      label: 'Tableau de bord',
      icon: LayoutDashboard,
    },
    {
      href: '/resume',
      label: 'Plan B Rentable',
      icon: BookOpen,
    },
    ...(isAdmin ? [{
      href: `/${locale}/admin`,
      label: 'Administration',
      icon: ShieldCheck,
    }] : []),
  ]

  const bottomItems: NavItem[] = [
    {
      href: `/${locale}/account`,
      label: 'Mon compte',
      icon: User,
    },
  ]

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push(`/${locale}/auth/login`)
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col',
        'fixed inset-y-0 left-0 z-40',
        'w-60 bg-surface border-r border-cr-border'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-cr-border flex-shrink-0">
        <Link href={`/${locale}/dashboard`}>
          <span
            className="text-2xl text-cr-accent"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            CoachRedo
          </span>
        </Link>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                'transition-colors duration-150',
                isActive
                  ? 'bg-cr-accent-subtle text-cr-accent'
                  : 'text-cr-text-secondary hover:bg-background hover:text-cr-text'
              )}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-cr-border space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                'transition-colors duration-150',
                isActive
                  ? 'bg-cr-accent-subtle text-cr-accent'
                  : 'text-cr-text-secondary hover:bg-background hover:text-cr-text'
              )}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
            'text-cr-text-secondary hover:bg-background hover:text-cr-text',
            'transition-colors duration-150'
          )}
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
