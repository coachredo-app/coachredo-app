import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function LocaleRootPage({ params }: PageProps) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(`/${locale}/dashboard`)
  } else {
    redirect(`/${locale}/auth/login`)
  }
}
