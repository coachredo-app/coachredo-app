'use client'

import Link from 'next/link'
import { useReader } from '@/lib/reader/context'
import BlockRenderer from '@/components/reader/BlockRenderer'
import ChapterSkeleton from '@/components/reader/ChapterSkeleton'
import type { Chapter } from '@/lib/content/types'
import { isChapterUnlocked } from '@/lib/reader/progress'

const GOLD = '#c9a84c'

export default function ChapterReader({ chapter }: { chapter: Chapter }) {
  const { progress, mounted } = useReader()

  // Skeleton while localStorage hydrates (chapters > 1 only)
  if (!mounted && chapter.num !== 1) {
    return <ChapterSkeleton />
  }

  // Lock screen after hydration
  if (mounted && chapter.num !== 1 && !isChapterUnlocked(chapter.num, progress)) {
    return (
      <main className="h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0d1a' }}>
        <div className="text-center max-w-xs">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#f9fafb' }}>
            Chapitre verrouillé
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
            Complète le chapitre précédent pour continuer.
          </p>
          <Link
            href={`/chapter/${chapter.num - 1}`}
            className="inline-block px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: GOLD, color: '#0a0d1a' }}
          >
            ← Retour au chapitre {chapter.num - 1}
          </Link>
        </div>
      </main>
    )
  }

  const nextHref = chapter.num < 7 ? `/chapter/${chapter.num + 1}` : '/transition'
  const nextLabel = chapter.num < 7 ? `Chapitre ${chapter.num + 1} →` : 'Continuer →'
  const backHref = chapter.num === 1 ? '/intro' : `/chapter/${chapter.num - 1}`
  const backLabel = chapter.num === 1 ? 'Intro' : `Chapitre ${chapter.num - 1}`

  return (
    <BlockRenderer
      blocks={chapter.contenu}
      exercises={chapter.exercices}
      nextHref={nextHref}
      nextLabel={nextLabel}
      backHref={backHref}
      backLabel={backLabel}
      chapterLabel={`Chapitre ${chapter.num} — ${chapter.titre}`}
    />
  )
}
