export interface Chapter {
  id: string
  order: number
  label: string
  type: 'chapter' | 'intermede' | 'intro' | 'avant'
}

export const CHAPTERS: Chapter[] = [
  { id: 'avant-commencer', order: 0,  label: 'Avant de commencer', type: 'avant'     },
  { id: 'introduction',    order: 1,  label: 'Introduction',        type: 'intro'     },
  { id: 'ch1',             order: 2,  label: 'Chapitre 1',          type: 'chapter'   },
  { id: 'ch2',             order: 3,  label: 'Chapitre 2',          type: 'chapter'   },
  { id: 'intermede-1',     order: 4,  label: 'Intermède 1',         type: 'intermede' },
  { id: 'ch3',             order: 5,  label: 'Chapitre 3',          type: 'chapter'   },
  { id: 'ch4',             order: 6,  label: 'Chapitre 4',          type: 'chapter'   },
  { id: 'intermede-2',     order: 7,  label: 'Intermède 2',         type: 'intermede' },
  { id: 'ch5',             order: 8,  label: 'Chapitre 5',          type: 'chapter'   },
  { id: 'ch6',             order: 9,  label: 'Chapitre 6',          type: 'chapter'   },
  { id: 'ch7',             order: 10, label: 'Chapitre 7',          type: 'chapter'   },
]

export const TOTAL_CHAPTERS = CHAPTERS.length

export const CHAPTER_MAP = Object.fromEntries(CHAPTERS.map(c => [c.id, c]))

export function getReadingProgress(rows: { chapter_id: string; completed_at: string | null }[]): {
  startedCount: number
  completedCount: number
  lastChapterOrder: number | null
  fullyDone: boolean
} {
  if (rows.length === 0) {
    return { startedCount: 0, completedCount: 0, lastChapterOrder: null, fullyDone: false }
  }

  const completedCount = rows.filter(r => r.completed_at).length
  const startedCount = rows.length
  const fullyDone = completedCount === TOTAL_CHAPTERS

  const lastChapterOrder = rows.reduce<number | null>((max, r) => {
    const ch = CHAPTER_MAP[r.chapter_id]
    if (!ch) return max
    return max === null || ch.order > max ? ch.order : max
  }, null)

  return { startedCount, completedCount, lastChapterOrder, fullyDone }
}
