// ============================================================
// MPD V3 — Canon — Point d'entrée
// ============================================================
// Assemble les 7 étapes en une seule source de vérité (D-029 §F) et
// applique des garde-fous locaux (T7.3) — aucun framework de test
// externe, aucune dépendance npm supplémentaire.

import { etape1Questions } from './questions/etape-1'
import { etape2Questions } from './questions/etape-2'
import { etape3Questions } from './questions/etape-3'
import { etape4Questions } from './questions/etape-4'
import { etape5Questions } from './questions/etape-5'
import { etape6Questions } from './questions/etape-6'
import { etape7Questions } from './questions/etape-7'
import {
  CANON_VERSION,
  FORMES_REPONSE,
  NATURES_OBJET,
  type QuestionCanonique,
} from './types'

export * from './types'

export const MPD_CANON_TOTAL_ATTENDU = 41 as const

export const MPD_CANON_V1: readonly QuestionCanonique[] = [
  ...etape1Questions,
  ...etape2Questions,
  ...etape3Questions,
  ...etape4Questions,
  ...etape5Questions,
  ...etape6Questions,
  ...etape7Questions,
]

export const MPD_CANON_PAR_ID: ReadonlyMap<string, QuestionCanonique> = new Map(
  MPD_CANON_V1.map(q => [q.stableId, q])
)

export interface CanonValidationError {
  readonly code: string
  readonly message: string
}

/**
 * Garde-fous locaux au canon (T7.3) — détecte :
 * - stableId dupliqué ;
 * - ordre dupliqué ;
 * - total différent de 41 ;
 * - version canonique incohérente ;
 * - trigger visant un stableId inexistant ;
 * - natureObjet hors taxonomie fermée ;
 * - formeReponse hors des 6 formes fermées.
 * Ne remplace aucun framework de test — appelé au chargement du module
 * (voir en bas de ce fichier) pour échouer tôt en cas d'incohérence.
 */
export function validateCanon(
  questions: readonly QuestionCanonique[] = MPD_CANON_V1
): CanonValidationError[] {
  const errors: CanonValidationError[] = []
  const allStableIds = new Set(questions.map(q => q.stableId))

  if (questions.length !== MPD_CANON_TOTAL_ATTENDU) {
    errors.push({
      code: 'TOTAL_INCORRECT',
      message: `Le canon doit contenir exactement ${MPD_CANON_TOTAL_ATTENDU} questions (trouvé : ${questions.length}).`,
    })
  }

  const seenStableIds = new Set<string>()
  const seenOrdres = new Set<number>()

  for (const q of questions) {
    if (seenStableIds.has(q.stableId)) {
      errors.push({ code: 'STABLE_ID_DUPLIQUE', message: `stableId dupliqué : ${q.stableId}` })
    }
    seenStableIds.add(q.stableId)

    if (seenOrdres.has(q.ordre)) {
      errors.push({ code: 'ORDRE_DUPLIQUE', message: `ordre dupliqué : ${q.ordre} (${q.stableId})` })
    }
    seenOrdres.add(q.ordre)

    if (q.versionCanonique !== CANON_VERSION) {
      errors.push({
        code: 'VERSION_INCOHERENTE',
        message: `${q.stableId} porte la version ${q.versionCanonique}, attendu ${CANON_VERSION}.`,
      })
    }

    if (!(NATURES_OBJET as readonly string[]).includes(q.natureObjet)) {
      errors.push({
        code: 'NATURE_OBJET_INVALIDE',
        message: `${q.stableId} : natureObjet hors taxonomie fermée (${q.natureObjet}).`,
      })
    }

    if (!(FORMES_REPONSE as readonly string[]).includes(q.formeReponse)) {
      errors.push({
        code: 'FORME_REPONSE_INVALIDE',
        message: `${q.stableId} : formeReponse hors des 6 formes fermées (${q.formeReponse}).`,
      })
    }

    if (q.trigger) {
      for (const condition of q.trigger.conditions) {
        if (!allStableIds.has(condition.stableId)) {
          errors.push({
            code: 'TRIGGER_CIBLE_INEXISTANTE',
            message: `${q.stableId} : trigger référence un stableId inexistant (${condition.stableId}).`,
          })
        }
      }
    }
  }

  return errors
}

const canonErrors = validateCanon(MPD_CANON_V1)
if (canonErrors.length > 0) {
  throw new Error(
    `Canon MPD V3 invalide :\n${canonErrors.map(e => `- [${e.code}] ${e.message}`).join('\n')}`
  )
}
