// ============================================================
// MPD V3 — Primitives de rendu lisible — extraction T-MFR.3B
// ============================================================
// Extraction STRICTEMENT comportementale depuis
// src/lib/mpd/server/attestation.ts (T7.11C) — zéro changement de
// logique. Fonctions pures : aucune dépendance DB, aucun paramètre
// spécifique à l'attestation (dossierId/revision/statutAttendu) —
// seules des définitions canon et une valeur de payload en entrée.
//
// Marche structurelle générique sur le canon (mêmes structures que
// ReponseLectureSeule.tsx, T7.8F) — aucun mapping par stableId/Q1…Q36 :
// seule la FORME (formeReponse/options/itemsAvecSousReponse) pilote la
// résolution, jamais l'identité de la question.
//
// Réutilisée par :
// - attestation.ts (extraireLibellesChoixHistoriques, comportement
//   inchangé après extraction) ;
// - le futur builder MfrAnalysisContext (T-MFR.3B), qui compose
//   au-dessus de ces primitives sans dupliquer leur logique.

import type { ChampFixe, ItemsAvecSousReponse, Option, PrecisionOption, QuestionCanonique } from '../canon'
import { normaliserChampsFixesLegacy } from './compatibilite'

export function libelleOption(options: readonly Option[] | undefined, valeur: string): string | null {
  return options?.find(o => o.value === valeur)?.label ?? null
}

export function fusionnerLibelles(
  ...parties: readonly (Record<string, string> | null)[]
): Record<string, string> | null {
  const resultat: Record<string, string> = {}
  for (const partie of parties) {
    if (partie === null) return null
    Object.assign(resultat, partie)
  }
  return resultat
}

export function libellesPrecision(precision: PrecisionOption, valeur: unknown): Record<string, string> | null {
  if (precision.type === 'texte' || precision.type === 'nombre_devise') return {}
  const obj = typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur) ? (valeur as Record<string, unknown>) : {}
  return fusionnerLibelles(...precision.champs.map(champ => libellesChampFixe(champ, obj[champ.id])))
}

export function libellesSelection(options: readonly Option[] | undefined, valeur: unknown): Record<string, string> | null {
  if (valeur === undefined || valeur === null) return {}
  const selection =
    typeof valeur === 'object' && !Array.isArray(valeur) ? (valeur as { value?: string; precision?: unknown }) : undefined
  if (!selection?.value) return {}
  const label = libelleOption(options, selection.value)
  if (label === null) return null
  const option = options?.find(o => o.value === selection.value)
  const labelsPrecision = option?.precision ? libellesPrecision(option.precision, selection.precision) : {}
  if (labelsPrecision === null) return null
  return { [selection.value]: label, ...labelsPrecision }
}

export function libellesMultiSelection(options: readonly Option[] | undefined, valeur: unknown): Record<string, string> | null {
  if (!Array.isArray(valeur)) return {}
  return fusionnerLibelles(...valeur.map(item => libellesSelection(options, item)))
}

/**
 * 'texte' peut porter un marqueur structuré alternatif — exactement la
 * même convention déjà appliquée par TexteField (champs/core.tsx,
 * `const alt = options?.[0]`) et par ReponseLectureSeule.tsx (T7.8F) :
 * seule la PREMIÈRE option, si présente, est un marqueur réel (ex.
 * « Aucune », « Aucun ne me vient à l'esprit ») — le payload l'égale
 * littéralement (chaîne brute, jamais un objet {value}) quand elle est
 * sélectionnée. Tout autre payload (chaîne libre ou tableau de chaînes
 * libres, selon cardinalite) est du texte réel — rien à historiciser.
 */
export function libellesTexte(options: readonly Option[] | undefined, valeur: unknown): Record<string, string> | null {
  const alt = options?.[0]
  if (alt && valeur === alt.value) return { [alt.value]: alt.label }
  return {}
}

export function libellesChampFixe(champ: ChampFixe, valeur: unknown): Record<string, string> | null {
  if (valeur === undefined || valeur === null || valeur === '') return {}
  switch (champ.formeReponse) {
    case 'texte':
      return libellesTexte(champ.options, valeur)
    case 'choix_unique':
    case 'choix_avec_precision':
      return libellesSelection(champ.options, valeur)
    case 'multi_selection':
      return libellesMultiSelection(champ.options, valeur)
    default:
      return {}
  }
}

export function libellesItemsAvecSousReponse(
  structure: ItemsAvecSousReponse,
  options: readonly Option[] | undefined,
  valeur: unknown
): Record<string, string> | null {
  if (structure.motif === 'champs_fixes') {
    // Lot B (anomalie 7, Q4) : une ancienne réponse (tableau brut)
    // reste résoluble en libellés historiques — jamais une valeur
    // inventée pour le(s) champ(s) manquant(s) (ex. semaine_habituelle).
    const normalise = normaliserChampsFixesLegacy(structure.champs, valeur)
    const obj =
      typeof normalise === 'object' && normalise !== null && !Array.isArray(normalise)
        ? (normalise as Record<string, unknown>)
        : {}
    return fusionnerLibelles(...structure.champs.map(champ => libellesChampFixe(champ, obj[champ.id])))
  }

  if (structure.motif === 'liste_declaree') {
    const alt = options?.[0]
    if (alt && valeur === alt.value) return { [alt.value]: alt.label }
    const entrees = Array.isArray(valeur) ? (valeur as Array<{ sousReponse?: unknown }>) : []
    return fusionnerLibelles(...entrees.map(e => libellesChampFixe(structure.sousReponse, e?.sousReponse)))
  }

  // branches_par_option
  const obj =
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
      ? (valeur as { value?: string; champs?: Record<string, unknown> })
      : undefined
  if (!obj?.value) return {}
  const label = libelleOption(options, obj.value)
  if (label === null) return null
  const branche = structure.branches[obj.value]
  if (!branche) return { [obj.value]: label }
  const labelsBranche = fusionnerLibelles(...branche.map(champ => libellesChampFixe(champ, obj.champs?.[champ.id])))
  if (labelsBranche === null) return null
  return { [obj.value]: label, ...labelsBranche }
}

export function libellesPourQuestion(question: QuestionCanonique, payload: unknown): Record<string, string> | null {
  switch (question.formeReponse) {
    case 'texte':
      return libellesTexte(question.options, payload)
    case 'choix_unique':
    case 'choix_avec_precision':
      return libellesSelection(question.options, payload)
    case 'multi_selection':
      return libellesMultiSelection(question.options, payload)
    case 'items_avec_sous_reponse':
      return question.itemsAvecSousReponse
        ? libellesItemsAvecSousReponse(question.itemsAvecSousReponse, question.options, payload)
        : {}
    case 'texte_avec_provenance': {
      const alt = question.options?.[0]
      if (alt && payload === alt.value) return { [alt.value]: alt.label }
      const obj =
        typeof payload === 'object' && payload !== null && !Array.isArray(payload)
          ? (payload as { provenance?: string })
          : undefined
      if (!obj?.provenance) return {}
      if (!question.texteAvecProvenance) return {}
      const label = libelleOption(question.texteAvecProvenance.provenanceOptions, obj.provenance)
      return label === null ? null : { [obj.provenance]: label }
    }
  }
}
