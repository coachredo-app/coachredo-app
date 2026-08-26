import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const CH_NUM: Record<string, number> = {
  ch1: 1, ch2: 2, ch3: 3, ch4: 4, ch5: 5, ch6: 6, ch7: 7,
}
const REQUIRED = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7']

export default async function ResumePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/fr/auth/login')

  const { data: rows } = await supabase
    .from('reading_progress')
    .select('chapter_id, completed_at')
    .eq('user_id', user.id)

  if (!rows || rows.length === 0) redirect('/intro')

  const completedIds = new Set(rows.filter(r => r.completed_at).map(r => r.chapter_id))

  if (!completedIds.has('introduction')) redirect('/intro')

  for (const id of REQUIRED) {
    if (!completedIds.has(id)) redirect(`/chapter/${CH_NUM[id]}`)
  }

  redirect('/transition')
}
