export const metadata = {
  title: 'Plan B Rentable — Carte du parcours',
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getReadingProgress } from '@/lib/reading-chapters'
import { BILAN_OPEN } from '@/lib/bilan-flag'
import { MindMap } from './MindMap'

export default async function SynthesePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/fr/auth/login')

  const [readingResult, sessionResult] = await Promise.all([
    supabase
      .from('reading_progress')
      .select('chapter_id, completed_at')
      .eq('user_id', user.id),
    supabase
      .from('bilan_sessions')
      .select('statut, bilan_version')
      .eq('user_id', user.id)
      .order('session_num', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const { fullyDone } = getReadingProgress(readingResult.data ?? [])
  if (!fullyDone) redirect('/fr/dashboard')

  const bilanStatut = sessionResult.data?.statut ?? null
  // Consultation toujours autorisée pour un Bilan V2 déjà completed, même Bilan fermé
  const bilanConsultable = bilanStatut === 'completed' && sessionResult.data?.bilan_version === 2
  const bilanOpen = BILAN_OPEN || bilanConsultable

  return <MindMap bilanStatut={bilanStatut} bilanOpen={bilanOpen} />
}
