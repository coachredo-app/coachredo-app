'use client'

import { useReader } from '@/lib/reader/context'
import BlockRenderer from '@/components/reader/BlockRenderer'
import ChapterNav from '@/components/reader/ChapterNav'
import type { Intro } from '@/lib/content/types'

const GOLD = '#c9a84c'

// Count PNL gates in intro
function countPnlGates(intro: Intro): number {
  return intro.contenu.filter(
    b => b.type === 'pnl_pause' || b.type === 'pnl_activation'
  ).length
}

export default function IntroReader({ intro }: { intro: Intro }) {
  const { pnlRevealed } = useReader()
  const totalPnl = countPnlGates(intro)
  const revealedCount = pnlRevealed.size

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#0a0d1a' }}>
      <div className="max-w-xl mx-auto px-4">
        {/* Header */}
        <div className="pt-10 pb-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: GOLD }}
          >
            Plan B Rentable
          </p>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f9fafb' }}>
            {intro.titre}
          </h1>
          <div className="h-0.5 w-10 rounded" style={{ backgroundColor: GOLD }} />
        </div>

        {/* Content */}
        <BlockRenderer blocks={intro.contenu} exercises={[]} />

        {/* Nav */}
        <ChapterNav
          exercises={[]}
          nextHref="/chapter/1"
          nextLabel="Commencer le Chapitre 1 →"
          isIntro
          totalPnlGates={totalPnl}
          revealedPnlCount={revealedCount}
        />
      </div>
    </main>
  )
}
