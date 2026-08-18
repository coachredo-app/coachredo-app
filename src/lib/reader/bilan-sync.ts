import { createBrowserClient } from '@supabase/ssr'

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}


export async function syncBilanResponse(
  sessionId: string,
  questionId: string,
  famille: string,
  value: string
): Promise<void> {
  try {
    const supabase = getClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (value.trim()) {
      await supabase.from('bilan_responses').upsert(
        {
          user_id: user.id,
          session_id: sessionId,
          question_id: questionId,
          famille,
          response: value.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,question_id' }
      )
    } else {
      await supabase
        .from('bilan_responses')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .eq('question_id', questionId)
    }
  } catch (err) {
    console.error('[bilan-sync] syncBilanResponse failed — question:', questionId, err)
  }
}

export async function updateCurrentStep(sessionId: string, step: number): Promise<void> {
  try {
    const supabase = getClient()
    await supabase
      .from('bilan_sessions')
      .update({ current_step: step })
      .eq('id', sessionId)
      .eq('statut', 'in_progress')
  } catch (err) {
    console.error('[bilan-sync] updateCurrentStep failed — step:', step, err)
  }
}
