import type { PlanBContent, Chapter, Exercise, QuizQuestion, QuizCategory } from './types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PLAN_B_CONTENT: _RAW, REQUIRED_EXERCISE_IDS: _IDS } = require('@/content/content.js')

export const PLAN_B_CONTENT = _RAW as PlanBContent
export const REQUIRED_EXERCISE_IDS = _IDS as string[]

// ── HELPERS ──────────────────────────────────────────────────

/** Récupère un chapitre par numéro (1-10) */
export function getChapter(num: number): Chapter | undefined {
  return PLAN_B_CONTENT.chapters.find(ch => ch.num === num)
}

/** Récupère un exercice par son ID dans un chapitre */
export function getExercise(chapter: Chapter, exerciseId: string): Exercise | undefined {
  return chapter.exercices.find(ex => ex.id === exerciseId)
}

/** Sélection aléatoire des questions du quiz par catégorie */
export function selectQuizQuestions(): QuizQuestion[] {
  const { pool, config } = PLAN_B_CONTENT.quiz
  const selected: QuizQuestion[] = []

  for (const category of config.categories as QuizCategory[]) {
    const categoryPool = pool.filter(q => q.category === category)
    const needed = config.selection_per_category[category]
    const shuffled = [...categoryPool].sort(() => Math.random() - 0.5)
    selected.push(...shuffled.slice(0, needed))
  }

  // Mélanger l'ordre des questions sélectionnées
  return selected.sort(() => Math.random() - 0.5)
}

/** Mélange les options d'une question pour l'affichage */
export function shuffleOptions(question: QuizQuestion): string[] {
  return [...question.options].sort(() => Math.random() - 0.5)
}

/** Résolution de la réponse correcte (string, insensible à la casse) */
export function isCorrectAnswer(question: QuizQuestion, answer: string): boolean {
  return answer.trim() === question.correct.trim()
}

/** Calcule le score par catégorie */
export function calcCategoryScores(
  questions: QuizQuestion[],
  answers: Record<string, string>
): Record<QuizCategory, { correct: number; total: number }> {
  const scores: Record<string, { correct: number; total: number }> = {}

  for (const q of questions) {
    if (!scores[q.category]) scores[q.category] = { correct: 0, total: 0 }
    scores[q.category].total++
    if (isCorrectAnswer(q, answers[q.id] ?? '')) {
      scores[q.category].correct++
    }
  }

  return scores as Record<QuizCategory, { correct: number; total: number }>
}

/** Identifie les catégories faibles (score < 50%) pour le message d'échec */
export function getWeakCategories(
  categoryScores: Record<QuizCategory, { correct: number; total: number }>
): string {
  const { category_chapters } = PLAN_B_CONTENT.quiz.results
  const weak = (Object.entries(categoryScores) as [QuizCategory, { correct: number; total: number }][])
    .filter(([, s]) => s.correct / s.total < 0.5)
    .map(([cat]) => category_chapters[cat])

  return weak.length > 0 ? weak.join(', ') : 'tous les chapitres'
}
