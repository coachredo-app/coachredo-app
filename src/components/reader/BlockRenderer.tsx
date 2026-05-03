'use client'

import { useReader } from '@/lib/reader/context'
import type { ContentBlock, Exercise } from '@/lib/content/types'
import TextBlock from './blocks/TextBlock'
import QuoteBlock from './blocks/QuoteBlock'
import TransitionBlock from './blocks/TransitionBlock'
import PnlGateBlock from './blocks/PnlGateBlock'
import ExerciseRenderer from './ExerciseRenderer'

interface Props {
  blocks: ContentBlock[]
  exercises: Exercise[]
}

export default function BlockRenderer({ blocks, exercises }: Props) {
  const { isPnlRevealed } = useReader()

  // Render blocks in order, stopping at first unrevealed PNL gate
  const visible: ContentBlock[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    visible.push(block)
    if (
      (block.type === 'pnl_pause' || block.type === 'pnl_activation') &&
      !isPnlRevealed(`pnl-${i}`)
    ) {
      break
    }
  }

  return (
    <div>
      {visible.map((block, i) => {
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
          return <PnlGateBlock key={i} block={block} pnlKey={`pnl-${i}`} />
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
    </div>
  )
}
