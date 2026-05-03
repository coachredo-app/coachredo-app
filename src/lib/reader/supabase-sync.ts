'use client'

import { createClient } from '@/lib/supabase/client'
import type { LocalProgress } from './progress'

// Fetches Supabase progress and merges on top of localStorage base (Supabase wins)
export async function fetchAndMergeProgress(base: LocalProgress): Promise<LocalProgress> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return base

  const merged: LocalProgress = JSON.parse(JSON.stringify(base))

  const [{ data: exercises }, { data: chapters }] = await Promise.all([
    supabase
      .from('exercise_responses')
      .select('exercise_id, chapter_num, response')
      .eq('user_id', user.id),
    supabase
      .from('chapter_progress')
      .select('chapter_num, is_completed')
      .eq('user_id', user.id)
      .eq('is_completed', true),
  ])

  if (exercises) {
    for (const row of exercises) {
      const key = String(row.chapter_num)
      if (!merged.chapters[key]) merged.chapters[key] = { completed: false, exercises: {} }
      merged.chapters[key].exercises[row.exercise_id] = row.response
    }
  }

  if (chapters) {
    for (const row of chapters) {
      const key = String(row.chapter_num)
      if (!merged.chapters[key]) merged.chapters[key] = { completed: false, exercises: {} }
      merged.chapters[key].completed = true
    }
  }

  return merged
}

export async function upsertExerciseResponse(
  chapterNum: number,
  exerciseId: string,
  value: unknown
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('exercise_responses').upsert(
    { user_id: user.id, exercise_id: exerciseId, chapter_num: chapterNum, response: value },
    { onConflict: 'user_id,exercise_id' }
  )
}

export async function upsertChapterProgress(chapterNum: number): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('chapter_progress').upsert(
    {
      user_id: user.id,
      chapter_num: chapterNum,
      is_completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,chapter_num' }
  )
}
