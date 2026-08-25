'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminService } from '@/lib/admin'

export async function deleteUser(userId: string, locale: string) {
  const service = await requireAdminService()

  // Libérer le code d'accès lié (évite la contrainte FK)
  await service
    .from('access_codes')
    .update({ used_by: null, used_at: null })
    .eq('used_by', userId)

  // Supprimer les tables liées
  await service.from('book_access').delete().eq('user_id', userId)
  await service.from('profiles').delete().eq('id', userId)

  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  revalidatePath(`/${locale}/admin`)
}
