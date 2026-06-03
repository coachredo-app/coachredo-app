'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function deleteUser(userId: string, locale: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Non autorisé')
  }

  const service = createServiceClient()

  await service.from('book_access').delete().eq('user_id', userId)
  await service.auth.admin.deleteUser(userId)

  revalidatePath(`/${locale}/admin`)
}
