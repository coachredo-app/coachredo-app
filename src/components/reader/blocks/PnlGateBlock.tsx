'use client'

import { useState } from 'react'
import type { PnlPauseBlock, PnlActivationBlock } from '@/lib/content/types'

interface Props {
  block: PnlPauseBlock | PnlActivationBlock
  isRevealed: boolean
  onReveal: () => void
}

export default function PnlGateBlock({ block, isRevealed, onReveal }: Props) {
  const [animating, setAnimating] = useState(false)
  const isActivation = block.type === 'pnl_activation'

  function handleClick() {
    setAnimating(true)
    setTimeout(() => {
      onReveal()
      setAnimating(false)
    }, 200)
  }

  return (
    <div
      className="my-10 mx-auto rounded-2xl px-6 py-8 text-center max-w-sm"
      style={{
        backgroundColor: isActivation ? 'rgba(201,168,76,0.08)' : '#111827',
        border: `1.5px solid ${isActivation ? '#c9a84c' : '#1f2937'}`,
      }}
    >
      <p
        className="text-base leading-relaxed whitespace-pre-line mb-6"
        style={{ color: '#e5e7eb' }}
      >
        {block.value}
      </p>

      {!isRevealed ? (
        <button
          onClick={handleClick}
          disabled={animating}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
          style={{
            backgroundColor: isActivation ? '#c9a84c' : '#1f2937',
            color: isActivation ? '#0a0d1a' : '#c9a84c',
            border: isActivation ? 'none' : '1px solid #c9a84c',
            opacity: animating ? 0.7 : 1,
          }}
        >
          {block.button_label}
        </button>
      ) : (
        <div
          className="py-2 rounded-xl text-sm font-medium"
          style={{ color: '#c9a84c' }}
        >
          ✓ {block.button_label}
        </div>
      )}
    </div>
  )
}
