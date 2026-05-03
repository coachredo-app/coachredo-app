'use client'

import { useRouter } from 'next/navigation'
import { useReader } from '@/lib/reader/context'
import type { Exercise } from '@/lib/content/types'

interface Props {
  exercises: Exercise[]
  nextHref: string
  nextLabel: string
  /** Override: force canProceed state (used by intro) */
  canProceed?: boolean
  /** Hint shown when locked (used by intro) */
  lockedHint?: string
}

export default function ChapterNav({
  exercises,
  nextHref,
  nextLabel,
  canProceed: canProceedOverride,
  lockedHint,
}: Props) {
  const router = useRouter()
  const { isExerciseDone, completeChapter, progress, chapterKey } = useReader()

  const obligatoire = exercises.filter(e => e.obligatoire)
  const allExercisesDone = obligatoire.every(e => isExerciseDone(e.id))

  const canProceed = canProceedOverride !== undefined ? canProceedOverride : allExercisesDone

  const alreadyCompleted = progress.chapters[chapterKey]?.completed === true

  async function handleNext() {
    if (!canProceed) return
    if (!alreadyCompleted) completeChapter()
    router.push(nextHref)
  }

  const remaining = obligatoire.filter(e => !isExerciseDone(e.id)).length
  const hint = lockedHint ?? (remaining > 0
    ? `${remaining} exercice${remaining > 1 ? 's' : ''} obligatoire${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}.`
    : null)

  return (
    <div className="mt-12 pb-16 px-0">
      {!canProceed && hint && (
        <p className="text-center text-sm mb-4" style={{ color: '#6b7280' }}>
          {hint}
        </p>
      )}

      <button
        onClick={handleNext}
        disabled={!canProceed}
        className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all active:scale-95"
        style={{
          backgroundColor: canProceed ? '#c9a84c' : '#1f2937',
          color: canProceed ? '#0a0d1a' : '#4b5563',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          boxShadow: canProceed ? '0 4px 20px rgba(201,168,76,0.25)' : 'none',
        }}
      >
        {nextLabel}
      </button>
    </div>
  )
}
