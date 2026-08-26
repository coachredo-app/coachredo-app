'use client'

import { createClient } from '@/lib/supabase/client'
import { READER_KEY_MAP } from '@/lib/reading-chapters'
import type { LocalProgress } from './progress'

// Fetches Supabase progress and merges on top of localStorage base (Supabase wins)
export async function fetchAndMergeProgress(base: LocalProgress): Promise<LocalProgress> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return base

  const merged: LocalProgress = JSON.parse(JSON.stringify(base))

  const [{ data: exercises }, { data: chapters }, { data: readingRows }] = await Promise.all([
    supabase
      .from('exercise_responses')
      .select('exercise_id, chapter_num, response')
      .eq('user_id', user.id),
    supabase
      .from('chapter_progress')
      .select('chapter_num, is_completed')
      .eq('user_id', user.id)
      .eq('is_completed', true),
    supabase
      .from('reading_progress')
      .select('chapter_id, completed_at')
      .eq('user_id', user.id),
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

  if (readingRows) {
    const rpKeyMap = Object.fromEntries(
      Object.entries(READER_KEY_MAP).map(([key, ch]) => [ch.id, key])
    )
    for (const row of readingRows) {
      if (!row.completed_at) continue
      const key = rpKeyMap[row.chapter_id]
      if (!key) continue
      if (key === 'intro') {
        merged.introCompleted = true
        if (!merged.chapters['intro']) merged.chapters['intro'] = { completed: false, exercises: {} }
        merged.chapters['intro'].completed = true
      } else {
        if (!merged.chapters[key]) merged.chapters[key] = { completed: false, exercises: {} }
        merged.chapters[key].completed = true
      }
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

export async function upsertReadingStart(chapterKey: string): Promise<void> {
  const ch = READER_KEY_MAP[chapterKey]
  if (!ch) return
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('reading_progress').upsert(
    { user_id: user.id, chapter_id: ch.id, chapter_order: ch.order },
    { onConflict: 'user_id,chapter_id', ignoreDuplicates: true }
  )
}

export async function upsertReadingComplete(chapterKey: string): Promise<void> {
  const ch = READER_KEY_MAP[chapterKey]
  if (!ch) return
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.from('reading_progress').upsert(
    {
      user_id: user.id,
      chapter_id: ch.id,
      chapter_order: ch.order,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,chapter_id' }
  )
  if (error) console.error('[reading-progress] upsert failed:', error.message)
}
