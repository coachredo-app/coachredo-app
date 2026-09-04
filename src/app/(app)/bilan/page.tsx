import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getReadingProgress } from '@/lib/reading-chapters'
import { BilanReader } from './BilanReader'
import { BilanGateway } from './BilanGateway'

export default async function BilanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/fr/auth/login')

  const { data: readingRows } = await createServiceClient()
    .from('reading_progress')
    .select('chapter_id, completed_at')
    .eq('user_id', user.id)

  const { fullyDone } = getReadingProgress(readingRows ?? [])
  if (!fullyDone) redirect('/fr/dashboard')

  // Charger toutes les sessions de l'utilisateur (plus récentes en premier)
  const { data: sessions } = await supabase
    .from('bilan_sessions')
    .select('id, session_num, statut, current_step, started_at, completed_at, bilan_version, session_type')
    .eq('user_id', user.id)
    .order('session_num', { ascending: false })
    .limit(20)

  const rawActive = sessions?.find(s => s.statut === 'in_progress') ?? null

  const isLegacyStandardActive =
    rawActive?.bilan_version == null && rawActive?.session_type === 'standard'

  const hasV1History = (sessions ?? []).some(s =>
    (s.statut === 'completed' || s.statut === 'superseded') &&
    s.bilan_version === null &&
    s.session_type === 'standard'
  )

  // Cas A : legacy standard in_progress + historique V1 → ne pas servir cette session,
  //          laisser Cas B détecter le legacy et rediriger vers /bilan/upgrade.
  // Cas B local : legacy standard in_progress sans historique V1 → session active normale.
  const activeSession = (isLegacyStandardActive && hasV1History) ? null : rawActive

  // Cas A : session in_progress → lecteur Bilan
  if (activeSession) {
    const isUpgrade = activeSession.session_type === 'upgrade'

    const { data: rows } = await supabase
      .from('bilan_responses')
      .select('question_id, response, updated_at')
      .eq('session_id', activeSession.id)

    const initialResponses = Object.fromEntries(
      (rows ?? []).map(r => [r.question_id as string, r.response as string])
    )
    const responseDates = isUpgrade
      ? Object.fromEntries(
          (rows ?? []).map(r => [r.question_id as string, r.updated_at as string])
        )
      : undefined

    return (
      <BilanReader
        session={activeSession}
        initialResponses={initialResponses}
        upgradeMode={isUpgrade}
        responseDates={responseDates}
      />
    )
  }

  const completedSessions = sessions?.filter(s => s.statut === 'completed') ?? []

  // Cas B : sessions terminées, aucune in_progress
  if (completedSessions.length > 0) {
    // V1 legacy : toutes les sessions completed ont bilan_version NULL
    // → aucun V2 complété, l'utilisateur doit passer par la mise à niveau
    const isLegacyV1 = completedSessions.every(s => s.bilan_version === null)
    if (isLegacyV1) redirect('/bilan/upgrade')

    // V2 complété (ou mixte) → liste historique
    const { data: allRows } = await supabase
      .from('bilan_responses')
      .select('session_id, question_id, response')
      .in('session_id', completedSessions.map(s => s.id))

    const allResponses: Record<string, Record<string, string>> = {}
    for (const row of (allRows ?? [])) {
      if (!allResponses[row.session_id as string]) allResponses[row.session_id as string] = {}
      allResponses[row.session_id as string][row.question_id as string] = row.response as string
    }

    return <BilanGateway completedSessions={completedSessions} allResponses={allResponses} />
  }

  // Cas C : aucune session → créer la première via service_role
  // bilan_version = 2 obligatoire : différencie les nouveaux utilisateurs des legacy V1
  const service = createServiceClient()
  const { data: newSession, error } = await service
    .from('bilan_sessions')
    .insert({
      user_id: user.id,
      session_num: 1,
      statut: 'in_progress',
      current_step: 0,
      bilan_version: 2,
    })
    .select('id, session_num, statut, current_step, started_at, completed_at, bilan_version, session_type')
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('bilan_sessions')
        .select('id, session_num, statut, current_step, started_at, completed_at, bilan_version, session_type')
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
