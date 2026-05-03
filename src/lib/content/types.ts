// ============================================================
// PLAN B RENTABLE — Content Types
// ============================================================

// ── BLOCS DE CONTENU ─────────────────────────────────────────

export interface TextBlock {
  type: 'text'
  value: string
  section?: string
}

export interface QuoteBlock {
  type: 'quote'
  value: string
}

export interface StoryBlock {
  type: 'story'
  value: string
  section?: string
}

export interface PnlPauseBlock {
  type: 'pnl_pause'
  value: string
  display: 'centered'
  interaction: 'button'
  button_label: string
}

export interface PnlActivationBlock {
  type: 'pnl_activation'
  value: string
  display: 'centered'
  interaction: 'button'
  button_label: string
}

export interface ExerciseInlineBlock {
  type: 'exercise_inline'
  ref: string
  section?: string
}

export interface TransitionBlock {
  type: 'transition'
  value: string
}

export type ContentBlock =
  | TextBlock
  | QuoteBlock
  | StoryBlock
  | PnlPauseBlock
  | PnlActivationBlock
  | ExerciseInlineBlock
  | TransitionBlock

// ── EXERCICES ────────────────────────────────────────────────

interface BaseExercise {
  id: string
  question: string
  aide: string
  erreur: string
  success_message: string
  obligatoire: boolean
}

export interface TextExercise extends BaseExercise {
  type: 'text'
  placeholder: string
}

export interface ListExercise extends BaseExercise {
  type: 'list'
  min_items: number
  placeholder: string
}

export interface TextField {
  id: string
  label: string
  placeholder: string
}

export interface TextGroupExercise extends BaseExercise {
  type: 'text_group'
  fields: TextField[]
}

export interface SelectionExercise extends BaseExercise {
  type: 'selection'
  options?: string[]
  source?: string
  additional_input?: boolean
}

export interface CommitmentExercise extends BaseExercise {
  type: 'commitment'
  label: string
  confirmation_text?: string
}

export interface WDMCriterion {
  id: string
  label: string
  weight: number
  helper?: string
  scale_low_label?: string
  scale_high_label?: string
}

export interface WeightedDecisionMatrixExercise extends BaseExercise {
  type: 'weighted_decision_matrix'
  source: string
  criteria: WDMCriterion[]
  tie_breaking: 'first'
  result_rank: boolean
  result_explanation_template: string
  variables_map: Record<string, unknown>
}

export interface GeneratedSummaryExercise extends BaseExercise {
  type: 'generated_summary'
  source: string | string[]
  template: string
  variables_map: Record<string, { exercise: string; field: string }>
  editable: boolean
  result_preview: boolean
}

export type Exercise =
  | TextExercise
  | ListExercise
  | TextGroupExercise
  | SelectionExercise
  | CommitmentExercise
  | WeightedDecisionMatrixExercise
  | GeneratedSummaryExercise

// ── CHAPITRES ET INTRO ───────────────────────────────────────

export interface Chapter {
  num: number
  titre: string
  duree_estimee: string
  completion_message: string
  chapter_progress_label: string
  progression_rule: 'all_exercises'
  streak_tracking?: boolean
  streak_days?: number
  contenu: ContentBlock[]
  exercices: Exercise[]
}

export interface Intro {
  id: string
  titre: string
  type: 'intro'
  progression_rule: 'none'
  contenu: ContentBlock[]
}

// ── QUIZ ─────────────────────────────────────────────────────

export type QuizCategory = 'mindset' | 'idee' | 'action' | 'vente'

export interface QuizQuestion {
  id: string
  category: QuizCategory
  question: string
  options: string[]
  correct: string        // valeur exacte (string), jamais un index
  explanation: string
}

export interface QuizConfig {
  total_questions: number
  passing_score: number
  categories: QuizCategory[]
  selection_per_category: Record<QuizCategory, number>
  shuffle_questions: boolean
  shuffle_options: boolean
  feedback_mode: 'instant'
  points_per_question: number
  max_attempts: number
  retry_cooldown_hours: number
  max_attempts_reached_message: string
}

export interface QuizResultLevel {
  min_score?: number
  score_range?: [number, number]
  title: string
  message: string
  action: string
  cta_label: string
}

export interface QuizResults {
  success: QuizResultLevel
  near_miss: QuizResultLevel
  fail: QuizResultLevel
  category_chapters: Record<QuizCategory, string>
}

export interface QuizAdminResetField {
  field: string
  value: string | number | boolean | null
}

export interface QuizAdmin {
  reset_action: string
  fields_to_reset: QuizAdminResetField[]
  audit_fields: string[]
  confirmation_required: boolean
  reason_field: {
    label: string
    placeholder: string
    obligatoire: boolean
  }
}

// ── OBJET RACINE ─────────────────────────────────────────────

export interface PlanBContent {
  intro: Intro
  chapters: Chapter[]
  quiz: {
    config: QuizConfig
    pool: QuizQuestion[]
    results: QuizResults
    admin: QuizAdmin
  }
}
