import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getReadingProgress } from '@/lib/reading-chapters'
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
      .select('statut')
      .eq('user_id', user.id)
      .order('session_num', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const { fullyDone } = getReadingProgress(readingResult.data ?? [])
  if (!fullyDone) redirect('/fr/dashboard')

  const bilanStatut = sessionResult.data?.statut ?? null
  return <MindMap bilanStatut={bilanStatut} />
}
