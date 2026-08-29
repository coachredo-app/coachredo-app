'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { LogOut } from 'lucide-react'

interface Props {
  locale: string
}

export function LogoutButton({ locale }: Props) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push(`/${locale}/auth/login`)
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-cr-text-secondary hover:bg-surface hover:text-cr-text border border-cr-border transition-colors duration-150"
    >
      <LogOut className="w-4 h-4 flex-shrink-0" />
      Déconnexion
    </button>
  )
}
