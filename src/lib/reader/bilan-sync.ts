import { createBrowserClient } from '@supabase/ssr'

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function loadBilanFromSupabase(): Promise<Record<string, string>> {
  try {
    const supabase = getClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}

    const { data } = await supabase
      .from('bilan_responses')
      .select('question_id, response')
      .eq('user_id', user.id)

    if (!data) return {}
    return Object.fromEntries(data.map(r => [r.question_id as string, r.response as string]))
  } catch {
    return {}
  }
}

export async function syncBilanResponse(questionId: string, famille: string, value: string): Promise<void> {
  try {
    const supabase = getClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (value.trim()) {
      await supabase.from('bilan_responses').upsert(
        {
          user_id: user.id,
          question_id: questionId,
          famille,
          response: value.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,question_id' }
      )
    } else {
      await supabase
        .from('bilan_responses')
        .delete()
        .eq('user_id', user.id)
        .eq('question_id', questionId)
    }
  } catch {
    // localStorage already saved — silently ignore
  }
}

export async function markBilanCompletedInSupabase(): Promise<void> {
  try {
    const supabase = getClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ bilan_completed_at: new Date().toISOString() })
      .eq('id', user.id)
  } catch {
    // silently ignore
  }
}
