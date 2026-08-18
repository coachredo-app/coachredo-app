'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function createBilanSession(): Promise<
  { sessionId: string; sessionNum: number } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Idempotence : retourner la session in_progress existante si elle existe déjà
  const { data: existing } = await supabase
    .from('bilan_sessions')
    .select('id, session_num')
    .eq('user_id', user.id)
    .eq('statut', 'in_progress')
    .maybeSingle()

  if (existing) return { sessionId: existing.id, sessionNum: existing.session_num }

  // Calculer le prochain session_num côté serveur
  const service = createServiceClient()
  const { data: lastSession } = await service
    .from('bilan_sessions')
    .select('session_num')
    .eq('user_id', user.id)
    .order('session_num', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sessionNum = (lastSession?.session_num ?? 0) + 1

  const { data: newSession, error } = await service
    .from('bilan_sessions')
    .insert({
      user_id: user.id,
      session_num: sessionNum,
      statut: 'in_progress',
      current_step: 0,
    })
    .select('id, session_num')
    .single()

  if (error) {
    // 23505 = violation d'unicité : une autre requête concurrente a créé la session
    if (error.code === '23505') {
      const { data: race } = await supabase
        .from('bilan_sessions')
        .select('id, session_num')
        .eq('user_id', user.id)
        .eq('statut', 'in_progress')
        .maybeSingle()
      if (race) return { sessionId: race.id, sessionNum: race.session_num }
    }
    return { error: 'Erreur lors de la création du Bilan.' }
  }

  return { sessionId: newSession.id, sessionNum: newSession.session_num }
}

export async function completeBilanSession(
  sessionId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Vérifier que la session appartient à l'utilisateur et est encore in_progress
  const { data: session, error: fetchError } = await supabase
    .from('bilan_sessions')
    .select('id, statut')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('statut', 'in_progress')
    .single()

  if (fetchError || !session) return { error: 'Session introuvable ou déjà terminée.' }

  const service = createServiceClient()
  const now = new Date().toISOString()

  const { error: sessionError } = await service
    .from('bilan_sessions')
    .update({ statut: 'completed', completed_at: now })
    .eq('id', sessionId)

  if (sessionError) return { error: 'Erreur lors de la complétion du Bilan.' }

  // Compatibilité : maintenir profiles.bilan_completed_at pour le dashboard et l'admin
  await service
    .from('profiles')
    .update({ bilan_completed_at: now })
    .eq('id', user.id)

  revalidatePath('/fr/dashboard')
  return {}
}
