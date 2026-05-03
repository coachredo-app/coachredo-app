'use client'

import { useReader } from '@/lib/reader/context'
import type { ContentBlock, Exercise } from '@/lib/content/types'
import TextBlock from './blocks/TextBlock'
import QuoteBlock from './blocks/QuoteBlock'
import TransitionBlock from './blocks/TransitionBlock'
import PnlGateBlock from './blocks/PnlGateBlock'
import ExerciseRenderer from './ExerciseRenderer'

const GOLD = '#c9a84c'

interface Props {
  blocks: ContentBlock[]
  exercises: Exercise[]
}

export default function BlockRenderer({ blocks, exercises }: Props) {
  const { revealedBlockCount, revealNextBlock, isExerciseDone } = useReader()

  const visibleCount = Math.min(revealedBlockCount, blocks.length)
  const visibleBlocks = blocks.slice(0, visibleCount)
  const isFinished = revealedBlockCount >= blocks.length
  const lastBlock = visibleBlocks[visibleBlocks.length - 1]

  // Determine if "Continuer" should show and whether it's enabled
  const isPnlGate = lastBlock?.type === 'pnl_pause' || lastBlock?.type === 'pnl_activation'
  const showContinuer = !isFinished && lastBlock && !isPnlGate

  let continuerDisabled = false
  if (showContinuer && lastBlock?.type === 'exercise_inline') {
    const exercise = exercises.find(e => e.id === (lastBlock as { ref: string }).ref)
    continuerDisabled = !!exercise?.obligatoire && !isExerciseDone((lastBlock as { ref: string }).ref)
  }

  return (
    <div>
      {visibleBlocks.map((block, i) => {
        const isLastVisible = i === visibleCount - 1
        // PNL gate: revealed if it's not the frontier block
        const pnlRevealed = !isLastVisible

        if (block.type === 'text' || block.type === 'story') {
          return <TextBlock key={i} block={block} />
        }
        if (block.type === 'quote') {
          return <QuoteBlock key={i} block={block} />
        }
        if (block.type === 'transition') {
          return <TransitionBlock key={i} block={block} />
        }
        if (block.type === 'pnl_pause' || block.type === 'pnl_activation') {
          return (
            <PnlGateBlock
              key={i}
              block={block}
              isRevealed={pnlRevealed}
              onReveal={revealNextBlock}
            />
          )
        }
        if (block.type === 'exercise_inline') {
          const exercise = exercises.find(e => e.id === block.ref)
          if (!exercise) return null
          return (
            <ExerciseRenderer key={i} exercise={exercise} section={block.section} />
          )
        }
        return null
      })}

      {showContinuer && (
        <div className="mt-8 mb-4 flex justify-center">
          <button
            onClick={continuerDisabled ? undefined : revealNextBlock}
            disabled={continuerDisabled}
            className="px-8 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{
              backgroundColor: continuerDisabled ? 'transparent' : GOLD,
              color: continuerDisabled ? '#4b5563' : '#0a0d1a',
              border: `1.5px solid ${continuerDisabled ? '#1f2937' : GOLD}`,
              cursor: continuerDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {continuerDisabled ? 'Complète l\'exercice pour continuer' : 'Continuer →'}
          </button>
        </div>
      )}
    </div>
  )
}
