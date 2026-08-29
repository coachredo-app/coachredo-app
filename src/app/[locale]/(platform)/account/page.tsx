import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from './LogoutButton'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-cr-text">Mon compte</h1>
      </div>

      <div className="bg-surface rounded-xl border border-cr-border p-6">
        <p className="text-xs text-cr-text-muted uppercase tracking-wider mb-1">Adresse email</p>
        <p className="text-cr-text font-medium">{user.email}</p>
      </div>

      <LogoutButton locale={locale} />
    </div>
  )
}
