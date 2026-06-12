import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkTradingAccess } from '@/lib/trading-access'

interface TradingLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function TradingLayout({ children, params }: TradingLayoutProps) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/auth/login`)

  const hasAccess = await checkTradingAccess(user.id)
  if (!hasAccess) redirect(`/${locale}/dashboard`)

  return <>{children}</>
}
