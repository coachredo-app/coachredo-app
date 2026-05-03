'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react'
import {
  loadProgress,
  saveExerciseResponse,
  markChapterComplete,
  type LocalProgress,
} from './progress'
import {
  fetchAndMergeProgress,
  upsertExerciseResponse,
  upsertChapterProgress,
} from './supabase-sync'

function empty(): LocalProgress {
  return { introCompleted: false, chapters: {} }
}

interface ReaderContextValue {
  chapterKey: string
  responses: Record<string, unknown>
  pnlRevealed: Set<string>
  saveResponse: (exerciseId: string, value: unknown) => void
  revealPnl: (key: string) => void
  isPnlRevealed: (key: string) => boolean
  isExerciseDone: (exerciseId: string) => boolean
  completeChapter: () => void
  progress: LocalProgress
  mounted: boolean
}

const ReaderContext = createContext<ReaderContextValue | null>(null)

export function ReaderProvider({
  children,
  chapterKey,
}: {
  children: React.ReactNode
  chapterKey: string
}) {
  const [progress, setProgress] = useState<LocalProgress>(empty)
  const [pnlRevealed, setPnlRevealed] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  // chapterNum is NaN for "intro" — used to skip Supabase sync for non-numbered chapters
  const chapterNum = parseInt(chapterKey, 10)

  useEffect(() => {
    const local = loadProgress()
    setProgress(local)
    setMounted(true)
    // Merge Supabase data on top of localStorage (Supabase wins on conflicts)
    fetchAndMergeProgress(local).then(merged => setProgress(merged))
  }, [])

  const responses = progress.chapters[chapterKey]?.exercises ?? {}

  const saveResponse = useCallback(
    (exerciseId: string, value: unknown) => {
      const updated = saveExerciseResponse(chapterKey, exerciseId, value)
      setProgress(updated)
      if (!isNaN(chapterNum)) {
        upsertExerciseResponse(chapterNum, exerciseId, value)
      }
    },
    [chapterKey, chapterNum]
  )

  const revealPnl = useCallback((key: string) => {
    setPnlRevealed(prev => new Set([...prev, key]))
  }, [])

  const isPnlRevealed = useCallback(
    (key: string) => pnlRevealed.has(key),
    [pnlRevealed]
  )

  const isExerciseDone = useCallback(
    (exerciseId: string) => exerciseId in responses,
    [responses]
  )

  const completeChapter = useCallback(() => {
    const updated = markChapterComplete(chapterKey)
    setProgress(updated)
    if (!isNaN(chapterNum)) {
      upsertChapterProgress(chapterNum)
    }
  }, [chapterKey, chapterNum])

  return (
    <ReaderContext.Provider
      value={{
        chapterKey,
        responses,
        pnlRevealed,
        saveResponse,
        revealPnl,
        isPnlRevealed,
        isExerciseDone,
        completeChapter,
        progress,
        mounted,
      }}
    >
      {children}
    </ReaderContext.Provider>
  )
}

export function useReader(): ReaderContextValue {
  const ctx = useContext(ReaderContext)
  if (!ctx) throw new Error('useReader must be used within ReaderProvider')
  return ctx
}
