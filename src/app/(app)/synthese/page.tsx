export const metadata = {
  title: 'Plan B Rentable — Carte du parcours',
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getReadingProgress } from '@/lib/reading-chapters'
import { MindMap } from './MindMap'

export default async function SynthesePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/fr/auth/login')

  const { data: readingRows } = await supabase
    .from('reading_progress')
    .select('chapter_id, completed_at')
    .eq('user_id', user.id)

  const { fullyDone } = getReadingProgress(readingRows ?? [])
  if (!fullyDone) redirect('/fr/dashboard')

  return <MindMap />
}
