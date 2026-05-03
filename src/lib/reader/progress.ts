const STORAGE_KEY = 'planb_progress'

export interface ChapterProgress {
  completed: boolean
  exercises: Record<string, unknown>
  revealedCount?: number
}

export interface LocalProgress {
  introCompleted: boolean
  chapters: Record<string, ChapterProgress>
}

function empty(): LocalProgress {
  return { introCompleted: false, chapters: {} }
}

export function loadProgress(): LocalProgress {
  if (typeof window === 'undefined') return empty()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    return { ...empty(), ...JSON.parse(raw) }
  } catch {
    return empty()
  }
}

export function saveProgress(data: LocalProgress): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function saveExerciseResponse(
  chapterKey: string,
  exerciseId: string,
  value: unknown
): LocalProgress {
  const p = loadProgress()
  if (!p.chapters[chapterKey]) {
    p.chapters[chapterKey] = { completed: false, exercises: {} }
  }
  p.chapters[chapterKey].exercises[exerciseId] = value
  saveProgress(p)
  return p
}

export function markChapterComplete(chapterKey: string): LocalProgress {
  const p = loadProgress()
  if (!p.chapters[chapterKey]) {
    p.chapters[chapterKey] = { completed: false, exercises: {} }
  }
  p.chapters[chapterKey].completed = true
  if (chapterKey === 'intro') {
    p.introCompleted = true
  }
  saveProgress(p)
  return p
}

export function isChapterUnlocked(num: number, p: LocalProgress): boolean {
  if (num === 1) return p.introCompleted
  return p.chapters[String(num - 1)]?.completed === true
}

export function saveRevealedCount(chapterKey: string, count: number): void {
  const p = loadProgress()
  if (!p.chapters[chapterKey]) {
    p.chapters[chapterKey] = { completed: false, exercises: {} }
  }
  p.chapters[chapterKey].revealedCount = count
  saveProgress(p)
}

export function chapterKey(num: number | 'intro'): string {
  return num === 'intro' ? 'intro' : String(num)
}
