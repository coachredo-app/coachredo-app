'use client'

import { useRouter } from 'next/navigation'
import { useReader } from '@/lib/reader/context'
import type { Exercise } from '@/lib/content/types'

interface Props {
  exercises: Exercise[]
  nextHref: string
  nextLabel: string
  isIntro?: boolean
  /** For intro: all PNL gates revealed signals completion */
  totalPnlGates?: number
  revealedPnlCount?: number
}

export default function ChapterNav({
  exercises,
  nextHref,
  nextLabel,
  isIntro,
  totalPnlGates = 0,
  revealedPnlCount = 0,
}: Props) {
  const router = useRouter()
  const { isExerciseDone, completeChapter, progress, chapterKey } = useReader()

  const obligatoire = exercises.filter(e => e.obligatoire)
  const allExercisesDone = obligatoire.every(e => isExerciseDone(e.id))

  // For intro: no exercises, just need all PNL gates revealed
  const canProceed = isIntro
    ? revealedPnlCount >= totalPnlGates
    : allExercisesDone

  const alreadyCompleted = progress.chapters[chapterKey]?.completed === true

  async function handleNext() {
    if (!canProceed) return
    if (!alreadyCompleted) completeChapter()
    router.push(nextHref)
  }

  const remaining = isIntro
    ? totalPnlGates - revealedPnlCount
    : obligatoire.filter(e => !isExerciseDone(e.id)).length

  return (
    <div className="mt-12 pb-16 px-0">
      {!canProceed && remaining > 0 && (
        <p className="text-center text-sm mb-4" style={{ color: '#6b7280' }}>
          {isIntro
            ? 'Continue la lecture pour débloquer la suite.'
            : `${remaining} exercice${remaining > 1 ? 's' : ''} obligatoire${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}.`}
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
