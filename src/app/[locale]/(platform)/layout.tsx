import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/platform/nav/Sidebar'
import { BottomNav } from '@/components/platform/nav/BottomNav'

interface PlatformLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function PlatformLayout({
  children,
  params,
}: PlatformLayoutProps) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const isAdmin = user.email === process.env.ADMIN_EMAIL

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop — masquée sur mobile */}
      <Sidebar locale={locale} isAdmin={isAdmin} />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col lg:ml-60">
        <main className="flex-1 p-6 pb-24 lg:pb-6">
          <div className="max-w-[1200px] mx-auto w-full">{children}</div>
        </main>
      </div>

      {/* Bottom nav mobile — masquée sur desktop */}
      <BottomNav locale={locale} isAdmin={isAdmin} />
    </div>
  )
}
