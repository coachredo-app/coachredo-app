import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function requireAdminService() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Accès admin requis')
  }
  return createServiceClient()
}
