'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useReader } from '@/lib/reader/context'
import type {
  ContentBlock,
  Exercise,
  TextBlock as TText,
  StoryBlock as TStory,
  QuoteBlock as TQuote,
  TransitionBlock as TTransition,
  PnlPauseBlock,
  PnlActivationBlock,
} from '@/lib/content/types'
import QuoteBlock from './blocks/QuoteBlock'
import TransitionBlock from './blocks/TransitionBlock'
import PnlGateBlock from './blocks/PnlGateBlock'
import ExerciseRenderer from './ExerciseRenderer'
import { useAmbientSound } from '@/lib/reader/useAmbientSound'

const GOLD = '#c9a84c'

// ── Step model ────────────────────────────────────────────────
type Step =
  | { kind: 'text'; block: TText | TStory }
  | { kind: 'quote'; block: TQuote }
  | { kind: 'transition'; block: TTransition }
  | { kind: 'gate'; block: PnlPauseBlock | PnlActivationBlock }
  | { kind: 'exercise'; exercise: Exercise; section?: string }

function buildSteps(blocks: ContentBlock[], exercises: Exercise[]): Step[] {
  const steps: Step[] = []
  for (const block of blocks) {
    if (block.type === 'text' || block.type === 'story') {
      steps.push({ kind: 'text', block })
    } else if (block.type === 'quote') {
      steps.push({ kind: 'quote', block })
    } else if (block.type === 'transition') {
      steps.push({ kind: 'transition', block })
    } else if (block.type === 'pnl_pause' || block.type === 'pnl_activation') {
      steps.push({ kind: 'gate', block })
    } else if (block.type === 'exercise_inline') {
      const exercise = exercises.find(e => e.id === block.ref)
      if (exercise) steps.push({ kind: 'exercise', exercise, section: block.section })
    }
  }
  return steps
}

// ── Props ─────────────────────────────────────────────────────
interface Props {
  blocks: ContentBlock[]
  exercises: Exercise[]
  nextHref: string
  nextLabel: string
  backHref: string
  backLabel: string
  chapterLabel?: string
}

export default function BlockRenderer({
  blocks,
  exercises,
  nextHref,
  nextLabel,
  backHref,
  backLabel,
  chapterLabel,
}: Props) {
  const router = useRouter()
  const { currentStep, goNext, goPrev, isExerciseDone, completeChapter, progress, chapterKey } = useReader()
  const { muted, toggle: toggleSound } = useAmbientSound()

  const steps = useMemo(() => buildSteps(blocks, exercises), [blocks, exercises])
  const totalSteps = steps.length
  const stepIndex = Math.min(currentStep, totalSteps - 1)
  const step = steps[stepIndex]

  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1
  const isGate = step?.kind === 'gate'

  // "Continuer" disabled for unsaved obligatoire exercises
  let canAdvance = true
  if (step?.kind === 'exercise' && step.exercise.obligatoire) {
    canAdvance = isExerciseDone(step.exercise.id)
  }

  const alreadyCompleted = progress.chapters[chapterKey]?.completed === true

  function handleNext() {
    if (!canAdvance) return
    if (isLast) {
      if (!alreadyCompleted) completeChapter()
      router.push(nextHref)
    } else {
      goNext()
    }
  }

  function handleBack() {
    if (isFirst) {
      router.push(backHref)
    } else {
      goPrev()
    }
  }

  const progressPct = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0

  return (
    <div className="reader-fixed" style={{ backgroundColor: '#0a0d1a' }}>

      {/* Progress bar */}
      <div className="flex-none" style={{ height: '2px', backgroundColor: '#1f2937' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            backgroundColor: GOLD,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Top bar */}
      <div className="flex-none flex items-center justify-between px-4 pt-5 pb-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm shrink-0"
          style={{ color: '#6b7280' }}
        >
          ← {isFirst ? backLabel : 'Retour'}
        </button>

        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {chapterLabel && (
            <span
              className="hidden sm:inline text-xs font-semibold uppercase tracking-widest truncate max-w-[180px]"
              style={{ color: GOLD }}
            >
              {chapterLabel}
            </span>
          )}
          <span className="text-xs tabular-nums shrink-0" style={{ color: '#4b5563' }}>
            {stepIndex + 1} / {totalSteps}
          </span>
          <Link
            href="/fr/dashboard"
            title="Mon espace"
            className="text-xs shrink-0"
            style={{ color: '#4b5563' }}
          >
            ⌂
          </Link>
        </div>
      </div>

      {/* Step content — seul zone scrollable, uniquement vertical */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex items-start justify-center min-h-full px-5 sm:px-8 py-4">
          <div className="w-full max-w-lg min-w-0">

            {step?.kind === 'text' && (
              <div>
                {step.block.section && (
                  <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: GOLD }}>
                    {step.block.section}
                  </p>
                )}
                <p
                  className="reader-text text-base sm:text-lg leading-[1.8] whitespace-pre-line"
                  style={{
                    color: '#d1d5db',
                    fontStyle: step.block.type === 'story' ? 'italic' : 'normal',
                  }}
                >
                  {step.block.value}
                </p>
              </div>
            )}

            {step?.kind === 'quote' && <QuoteBlock block={step.block} />}
            {step?.kind === 'transition' && <TransitionBlock block={step.block} />}
            {step?.kind === 'gate' && (
              <PnlGateBlock block={step.block} isRevealed={false} onReveal={handleNext} />
            )}
            {step?.kind === 'exercise' && (
              <ExerciseRenderer exercise={step.exercise} section={step.section} />
            )}

          </div>
        </div>
      </div>

      {/* Bottom nav — jamais caché, safe-area-inset pour iPhone */}
      {!isGate && (
        <div
          className="flex-none px-4 sm:px-6 pt-3"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
        >
          {!canAdvance && (
            <p className="text-center text-xs mb-3" style={{ color: '#6b7280' }}>
              Complète l'exercice pour continuer
            </p>
          )}
          <button
            onClick={handleNext}
            disabled={!canAdvance}
            className="w-full py-4 rounded-2xl font-bold text-sm sm:text-base tracking-wide transition-all active:scale-95"
            style={{
              backgroundColor: canAdvance ? GOLD : '#1f2937',
              color: canAdvance ? '#0a0d1a' : '#4b5563',
              cursor: canAdvance ? 'pointer' : 'not-allowed',
              boxShadow: canAdvance ? '0 4px 20px rgba(201,168,76,0.25)' : 'none',
            }}
          >
            {isLast
              ? nextLabel
              : (step?.kind === 'text' && step.block.cta_label) ? step.block.cta_label : 'Continuer →'}
          </button>
        </div>
      )}
    </div>
  )
}
