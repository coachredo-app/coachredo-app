'use client'

import BlockRenderer from '@/components/reader/BlockRenderer'
import type { Intro } from '@/lib/content/types'

export default function IntroReader({ intro }: { intro: Intro }) {
  return (
    <BlockRenderer
      blocks={intro.contenu}
      exercises={[]}
      nextHref="/chapter/1"
      nextLabel="Commencer le Chapitre 1 →"
      backHref="/intro"
      backLabel="Intro"
      chapterLabel="Plan B Rentable"
    />
  )
}
