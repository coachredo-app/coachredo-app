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
  saveRevealedCount,
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
  revealedBlockCount: number
  revealNextBlock: () => void
  saveResponse: (exerciseId: string, value: unknown) => void
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
  const [revealedBlockCount, setRevealedBlockCount] = useState(1)
  const [mounted, setMounted] = useState(false)

  const chapterNum = parseInt(chapterKey, 10)

  useEffect(() => {
    const local = loadProgress()
    setProgress(local)
    setRevealedBlockCount(local.chapters[chapterKey]?.revealedCount ?? 1)
    setMounted(true)
    fetchAndMergeProgress(local).then(merged => setProgress(merged))
  }, [chapterKey])

  const responses = progress.chapters[chapterKey]?.exercises ?? {}

  const revealNextBlock = useCallback(() => {
    setRevealedBlockCount(prev => {
      const next = prev + 1
      saveRevealedCount(chapterKey, next)
      return next
    })
  }, [chapterKey])

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
        revealedBlockCount,
        revealNextBlock,
        saveResponse,
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
