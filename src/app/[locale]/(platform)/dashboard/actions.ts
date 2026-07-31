'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function submitMissionResponse(
  missionId: string,
  locale: string,
  response: string
): Promise<{ error?: string }> {
  const trimmed = response.trim()
  if (!trimmed) return { error: 'La réponse ne peut pas être vide.' }
  if (trimmed.length > 5000) return { error: 'Réponse trop longue (5000 caractères max).' }

  // Vérifier l'identité de l'utilisateur côté serveur
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  // Vérifier que la mission appartient bien à cet utilisateur
  // et qu'elle est en cours (on ne répond qu'à une mission active)
  const { data: mission, error: fetchError } = await supabase
    .from('user_missions')
    .select('id, user_id, statut, user_response')
    .eq('id', missionId)
    .eq('user_id', user.id)
    .eq('statut', 'en_cours')
    .is('user_response', null)
    .single()

  if (fetchError || !mission) {
    return { error: 'Mission introuvable, déjà terminée ou déjà répondue.' }
  }

  // Écriture via service_role — uniquement les deux champs autorisés
  const service = createServiceClient()
  const { error: updateError } = await service
    .from('user_missions')
    .update({
      user_response: trimmed,
      responded_at: new Date().toISOString(),
    })
    .eq('id', missionId)
    .eq('user_id', user.id)

  if (updateError) return { error: 'Erreur lors de l\'enregistrement.' }

  revalidatePath(`/${locale}/dashboard`)
  return {}
}
