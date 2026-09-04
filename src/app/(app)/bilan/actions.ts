'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getReadingProgress } from '@/lib/reading-chapters'
import { COMPLETION_REQUIRED_IDS } from '@/lib/bilan-questions'

// ── Server Actions ──────────────────────────────────────────────────────────

export async function createBilanSession(): Promise<
  { sessionId: string; sessionNum: number } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: readingRows } = await createServiceClient()
    .from('reading_progress')
    .select('chapter_id, completed_at')
    .eq('user_id', user.id)

  const { fullyDone } = getReadingProgress(readingRows ?? [])
  if (!fullyDone) return { error: 'Le livre doit être terminé pour accéder au Bilan.' }

  // Idempotence : retourner la session in_progress existante si elle existe déjà
  const { data: existing } = await supabase
    .from('bilan_sessions')
    .select('id, session_num')
    .eq('user_id', user.id)
    .eq('statut', 'in_progress')
    .maybeSingle()

  if (existing) return { sessionId: existing.id, sessionNum: existing.session_num }

  const { data: lastDone } = await supabase
    .from('bilan_sessions')
    .select('completed_at')
    .eq('user_id', user.id)
    .eq('statut', 'completed')
    .order('session_num', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastDone?.completed_at) {
    return { error: 'Ton Bilan de clarté est déjà complété. Ton Rapport CoachRedo est en cours de préparation.' }
  }

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
      bilan_version: 2,
    })
    .select('id, session_num')
    .single()

  if (error) {
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

export async function createUpgradeSession(): Promise<
  { sessionId: string } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Idempotence applicative : retourner la session upgrade in_progress si elle existe
  const { data: existing } = await supabase
    .from('bilan_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('session_type', 'upgrade')
    .eq('statut', 'in_progress')
    .maybeSingle()

  if (existing) return { sessionId: existing.id }

  // Appel RPC transactionnel via client authentifié (auth.uid() actif dans le RPC).
  // La sélection de la source canonique V1 est effectuée dans le RPC sous verrou.
  const { data, error } = await supabase.rpc('create_upgrade_bilan_session')

  if (error) return { error: 'Erreur lors de la création de la mise à niveau.' }
  if (data?.error) return { error: data.error as string }

  return { sessionId: data.session_id as string }
}

export async function completeBilanSession(
  sessionId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: session, error: fetchError } = await supabase
    .from('bilan_sessions')
    .select('id, statut')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('statut', 'in_progress')
    .single()

  if (fetchError || !session) return { error: 'Session introuvable ou déjà terminée.' }

  const { data: requiredRows } = await supabase
    .from('bilan_responses')
    .select('question_id, response')
    .eq('session_id', sessionId)
    .in('question_id', [...COMPLETION_REQUIRED_IDS])

  const answeredRequired = new Set(
    (requiredRows ?? [])
      .filter(r => (r.response as string)?.trim())
      .map(r => r.question_id as string)
  )
  if (answeredRequired.size < COMPLETION_REQUIRED_IDS.size) {
    return { error: 'Veuillez compléter toutes les questions avant de terminer.' }
  }

  const service = createServiceClient()
  const now = new Date().toISOString()

  const { error: sessionError } = await service
    .from('bilan_sessions')
    .update({ statut: 'completed', completed_at: now })
    .eq('id', sessionId)

  if (sessionError) return { error: 'Erreur lors de la complétion du Bilan.' }

  await service
    .from('profiles')
    .update({ bilan_completed_at: now })
    .eq('id', user.id)

  revalidatePath('/fr/dashboard')
  return {}
}
