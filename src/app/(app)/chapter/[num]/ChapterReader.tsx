'use client'

import Link from 'next/link'
import { useReader } from '@/lib/reader/context'
import BlockRenderer from '@/components/reader/BlockRenderer'
import ChapterNav from '@/components/reader/ChapterNav'
import ChapterSkeleton from '@/components/reader/ChapterSkeleton'
import type { Chapter } from '@/lib/content/types'
import { isChapterUnlocked } from '@/lib/reader/progress'

const GOLD = '#c9a84c'

export default function ChapterReader({ chapter }: { chapter: Chapter }) {
  const { progress, isExerciseDone, mounted } = useReader()

  // Show skeleton while localStorage hydrates — avoids blank flash and hydration mismatch
  if (!mounted && chapter.num !== 1) {
    return <ChapterSkeleton />
  }

  // Client-side lock check (only after hydration)
  if (mounted && !isChapterUnlocked(chapter.num, progress) && chapter.num !== 1) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0d1a' }}>
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

  const obligatoire = chapter.exercices.filter(e => e.obligatoire)
  const doneCount = obligatoire.filter(e => isExerciseDone(e.id)).length
  const totalObl = obligatoire.length

  const nextHref =
    chapter.num < 10 ? `/chapter/${chapter.num + 1}` : '/quiz'
  const nextLabel =
    chapter.num < 10
      ? `Chapitre ${chapter.num + 1} →`
      : 'Passer au Quiz →'

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#0a0d1a' }}>
      <div className="max-w-xl mx-auto px-4">
        {/* Header */}
        <div className="pt-10 pb-6">
          <Link
            href={chapter.num === 1 ? '/intro' : `/chapter/${chapter.num - 1}`}
            className="text-xs flex items-center gap-1 mb-5"
            style={{ color: '#4b5563' }}
          >
            ← {chapter.num === 1 ? 'Intro' : `Chapitre ${chapter.num - 1}`}
          </Link>

          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: GOLD }}
          >
            Chapitre {chapter.num}
          </p>
          <h1 className="text-2xl font-bold mb-3" style={{ color: '#f9fafb' }}>
            {chapter.titre}
          </h1>

          {/* Progress bar */}
          <div className="flex items-center gap-3 mt-4">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: '#1f2937' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: totalObl > 0 ? `${(doneCount / totalObl) * 100}%` : '0%',
                  backgroundColor: GOLD,
                }}
              />
            </div>
            <span className="text-xs shrink-0" style={{ color: '#6b7280' }}>
              {doneCount}/{totalObl}
            </span>
          </div>

          <p className="text-xs mt-2" style={{ color: '#4b5563' }}>
            {chapter.duree_estimee}
          </p>
        </div>

        {/* Content */}
        <BlockRenderer blocks={chapter.contenu} exercises={chapter.exercices} />

        {/* Nav */}
        <ChapterNav
          exercises={chapter.exercices}
          nextHref={nextHref}
          nextLabel={nextLabel}
        />
      </div>
    </main>
  )
}
