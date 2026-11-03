import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function requireAdminService() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Accès admin requis')
  }
  return createServiceClient()
}

/**
 * Additive, ne remplace jamais `requireAdminService()` ci-dessus. Renvoie en
 * plus `adminUserId` — toujours `user.id` de la session Supabase vérifiée
 * ici même, jamais un identifiant transmis par le navigateur. Destinée aux
 * gestes qui doivent attribuer une action à un opérateur précis (ex. RPC
 * `p_operateur_id` de la migration 027) — réutilisable par tout module
 * admin (MFR, Music, ...), pas spécifique à l'un d'eux.
 */
export async function requireAdminServiceWithUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Accès admin requis')
  }
  return { service: createServiceClient(), adminUserId: user.id }
}
