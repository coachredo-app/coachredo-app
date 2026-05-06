const STORAGE_KEY = 'planb_progress'

export interface ChapterProgress {
  completed: boolean
  exercises: Record<string, unknown>
  currentStep?: number
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // quota exceeded (e.g. iOS private browsing) — progress not saved but no crash
  }
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
  // If the user has already started this chapter, never re-lock it
  const existing = p.chapters[String(num)]
  if (existing && ((existing.currentStep ?? 0) > 0 || Object.keys(existing.exercises).length > 0)) {
    return true
  }
  return p.chapters[String(num - 1)]?.completed === true
}

export function saveCurrentStep(chapterKey: string, step: number): void {
  const p = loadProgress()
  if (!p.chapters[chapterKey]) {
    p.chapters[chapterKey] = { completed: false, exercises: {} }
  }
  p.chapters[chapterKey].currentStep = step
  saveProgress(p)
}

export function chapterKey(num: number | 'intro'): string {
  return num === 'intro' ? 'intro' : String(num)
}
