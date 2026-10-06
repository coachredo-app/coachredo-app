// ============================================================
// MPD V3 — Types runtime (hors canon) — T7.4B
// ============================================================
// Représentation applicative minimale d'une réponse persistée/proposée.
// Le canon (src/lib/mpd/canon/**) reste la seule source de vérité sur la
// définition des questions (D-029 §F) — ce fichier ne décrit jamais une
// question, uniquement la forme d'une instance de réponse en transit.

export type StatutReponse = 'DECLARE' | 'INCONNU' | 'REFUS'

export interface ReponseCourante {
  readonly questionId: string
  readonly statut: StatutReponse
  readonly payload: unknown
}
