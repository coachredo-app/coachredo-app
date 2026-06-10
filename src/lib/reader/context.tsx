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
  saveCurrentStep,
  type LocalProgress,
} from './progress'
import {
  fetchAndMergeProgress,
  upsertExerciseResponse,
  upsertChapterProgress,
  upsertReadingStart,
  upsertReadingComplete,
} from './supabase-sync'

function empty(): LocalProgress {
  return { introCompleted: false, chapters: {} }
}

interface ReaderContextValue {
  chapterKey: string
  responses: Record<string, unknown>
  currentStep: number
  goNext: () => void
  goPrev: () => void
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
  const [currentStep, setCurrentStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  const chapterNum = parseInt(chapterKey, 10)

  useEffect(() => {
    const local = loadProgress()
    setProgress(local)
    setCurrentStep(local.chapters[chapterKey]?.currentStep ?? 0)
    setMounted(true)
    fetchAndMergeProgress(local).then(merged => setProgress(merged))
    upsertReadingStart(chapterKey)
  }, [chapterKey])

  const responses = progress.chapters[chapterKey]?.exercises ?? {}

  const goNext = useCallback(() => {
    setCurrentStep(prev => {
      const next = prev + 1
      saveCurrentStep(chapterKey, next)
      return next
    })
  }, [chapterKey])

  const goPrev = useCallback(() => {
    setCurrentStep(prev => {
      const next = Math.max(0, prev - 1)
      saveCurrentStep(chapterKey, next)
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
    upsertReadingComplete(chapterKey)
  }, [chapterKey, chapterNum])

  return (
    <ReaderContext.Provider
      value={{
        chapterKey,
        responses,
        currentStep,
        goNext,
        goPrev,
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
