import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BilanReader } from './BilanReader'
import { BilanGateway } from './BilanGateway'

export default async function BilanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/fr/auth/login')

  // Charger toutes les sessions de l'utilisateur (plus récentes en premier)
  const { data: sessions } = await supabase
    .from('bilan_sessions')
    .select('id, session_num, statut, current_step, started_at, completed_at')
    .eq('user_id', user.id)
    .order('session_num', { ascending: false })
    .limit(20)

  const activeSession = sessions?.find(s => s.statut === 'in_progress') ?? null
  const lastCompleted = sessions?.find(s => s.statut === 'completed') ?? null

  // Cas A : session in_progress → lecteur Bilan
  if (activeSession) {
    const { data: rows } = await supabase
      .from('bilan_responses')
      .select('question_id, response')
      .eq('session_id', activeSession.id)

    const initialResponses = Object.fromEntries(
      (rows ?? []).map(r => [r.question_id as string, r.response as string])
    )
    return <BilanReader session={activeSession} initialResponses={initialResponses} />
  }

  // Cas B : au moins un Bilan terminé, aucun en cours → écran de choix
  if (lastCompleted) {
    const { data: rows } = await supabase
      .from('bilan_responses')
      .select('question_id, response')
      .eq('session_id', lastCompleted.id)

    const responses = Object.fromEntries(
      (rows ?? []).map(r => [r.question_id as string, r.response as string])
    )
    return <BilanGateway lastSession={lastCompleted} responses={responses} />
  }

  // Cas C : aucune session — créer la première via service_role
  // (INSERT bloqué en RLS pour les utilisateurs ; user_id vérifié ci-dessus)
  const service = createServiceClient()
  const { data: newSession, error } = await service
    .from('bilan_sessions')
    .insert({ user_id: user.id, session_num: 1, statut: 'in_progress', current_step: 0 })
    .select('id, session_num, statut, current_step, started_at, completed_at')
    .single()

  if (error) {
    // Concurrence : un autre onglet a créé la session au même moment
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('bilan_sessions')
        .select('id, session_num, statut, current_step, started_at, completed_at')
        .eq('user_id', user.id)
        .eq('statut', 'in_progress')
        .maybeSingle()
      if (existing) {
        return <BilanReader session={existing} initialResponses={{}} />
      }
    }
    redirect('/fr/dashboard')
  }

  return <BilanReader session={newSession!} initialResponses={{}} />
}
