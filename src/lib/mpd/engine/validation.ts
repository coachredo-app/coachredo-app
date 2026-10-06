// ============================================================
// MPD V3 — Validation runtime contre le canon — T7.4B
// ============================================================
// La migration 013 ne valide jamais la sémantique métier d'un payload
// (D-029 §F, en-tête de 013) — uniquement la cohérence structurelle
// générique (statut fermé, nullité selon statut, taille). Ce module est
// la seule couche qui valide qu'un payload correspond EXACTEMENT à la
// définition canonique de la question visée : forme, options fermées,
// cardinalité, sous-champs, précision conditionnelle. Aucune dépendance
// npm, aucun framework de test.

import type {
  QuestionCanonique,
  Option,
  ChampFixe,
  Cardinalite,
  PrecisionOption,
  FormeReponse,
} from '../canon/types'
import type { StatutReponse } from '../types-runtime'

export type ValidationResult = { readonly ok: true } | { readonly ok: false; readonly error: string }

const VALIDE: ValidationResult = { ok: true }
const invalide = (error: string): ValidationResult => ({ ok: false, error })

function estTexteNonVide(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function trouverOption(options: readonly Option[] | undefined, value: string): Option | undefined {
  return options?.find(o => o.value === value)
}

function validerPrecision(precisionDef: PrecisionOption, payload: unknown): ValidationResult {
  switch (precisionDef.type) {
    case 'texte':
      return estTexteNonVide(payload) ? VALIDE : invalide('precision_texte_invalide')
    case 'nombre_devise':
      return typeof payload === 'number' && Number.isFinite(payload)
        ? VALIDE
        : invalide('precision_nombre_invalide')
    case 'composite': {
      if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        return invalide('precision_composite_invalide')
      }
      const obj = payload as Record<string, unknown>
      for (const champ of precisionDef.champs) {
        const resultat = validerChamp(champ.formeReponse, champ.options, champ.cardinalite, obj[champ.id])
        if (!resultat.ok) return resultat
      }
      return VALIDE
    }
  }
}

function validerSelection(options: readonly Option[] | undefined, payload: unknown): ValidationResult {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return invalide('selection_invalide')
  }
  const obj = payload as { value?: unknown; precision?: unknown }
  if (typeof obj.value !== 'string') return invalide('selection_invalide')

  const option = trouverOption(options, obj.value)
  if (!option) return invalide('option_inconnue')

  if (option.precision) {
    if (obj.precision === undefined) return invalide('precision_manquante')
    return validerPrecision(option.precision, obj.precision)
  }
  if (obj.precision !== undefined) return invalide('precision_non_attendue')
  return VALIDE
}

function validerMultiSelection(
  options: readonly Option[] | undefined,
  cardinalite: Cardinalite | undefined,
  payload: unknown
): ValidationResult {
  if (!Array.isArray(payload)) return invalide('multi_selection_invalide')
  if (cardinalite && (payload.length < cardinalite.min || payload.length > cardinalite.max)) {
    return invalide('cardinalite_invalide')
  }
  const valeursVues = new Set<string>()
  for (const entree of payload) {
    const resultat = validerSelection(options, entree)
    if (!resultat.ok) return resultat
    const valeur = (entree as { value: string }).value
    if (valeursVues.has(valeur)) return invalide('selection_dupliquee')
    valeursVues.add(valeur)
  }
  return VALIDE
}

function validerTexte(
  options: readonly Option[] | undefined,
  cardinalite: Cardinalite | undefined,
  payload: unknown
): ValidationResult {
  // Alternative NA/JSP verrouillée (T7.2/T7.3) : une valeur scalaire
  // correspondant à une option fermée, présentée comme alternative au
  // texte libre plafonné (ex. Q12, Q33, Q34).
  if (options && typeof payload === 'string' && trouverOption(options, payload)) {
    return VALIDE
  }
  if (cardinalite) {
    if (!Array.isArray(payload)) return invalide('liste_texte_invalide')
    if (payload.length < cardinalite.min || payload.length > cardinalite.max) {
      return invalide('cardinalite_invalide')
    }
    return payload.every(estTexteNonVide) ? VALIDE : invalide('entree_texte_invalide')
  }
  return estTexteNonVide(payload) ? VALIDE : invalide('texte_invalide')
}

function validerChamp(
  formeReponse: FormeReponse,
  options: readonly Option[] | undefined,
  cardinalite: Cardinalite | undefined,
  payload: unknown
): ValidationResult {
  switch (formeReponse) {
    case 'texte':
      return validerTexte(options, cardinalite, payload)
    case 'choix_unique':
    case 'choix_avec_precision':
      return validerSelection(options, payload)
    case 'multi_selection':
      return validerMultiSelection(options, cardinalite, payload)
    case 'items_avec_sous_reponse':
    case 'texte_avec_provenance':
      // Jamais la forme d'un sous-champ (ChampFixe) dans le canon V1 —
      // garde-fou structurel, pas un cas métier atteignable (T7.4A §F).
      return invalide('forme_non_supportee_en_sous_champ')
  }
}

function validerChampsFixes(champs: readonly ChampFixe[], payload: unknown): ValidationResult {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return invalide('champs_fixes_invalide')
  }
  const obj = payload as Record<string, unknown>
  for (const champ of champs) {
    const resultat = validerChamp(champ.formeReponse, champ.options, champ.cardinalite, obj[champ.id])
    if (!resultat.ok) return resultat
  }
  return VALIDE
}

function validerItemsAvecSousReponse(question: QuestionCanonique, payload: unknown): ValidationResult {
  const structure = question.itemsAvecSousReponse
  if (!structure) return invalide('structure_canon_absente')

  switch (structure.motif) {
    case 'champs_fixes':
      return validerChampsFixes(structure.champs, payload)

    case 'liste_declaree': {
      if (question.options && typeof payload === 'string' && trouverOption(question.options, payload)) {
        return VALIDE
      }
      if (!Array.isArray(payload)) return invalide('liste_declaree_invalide')
      if (payload.length < structure.cardinalite.min || payload.length > structure.cardinalite.max) {
        return invalide('cardinalite_invalide')
      }
      for (const entree of payload) {
        if (typeof entree !== 'object' || entree === null || Array.isArray(entree)) {
          return invalide('entree_liste_declaree_invalide')
        }
        const obj = entree as { item?: unknown; sousReponse?: unknown }
        if (!estTexteNonVide(obj.item)) return invalide('entree_liste_declaree_invalide')
        const resultat = validerChamp(
          structure.sousReponse.formeReponse,
          structure.sousReponse.options,
          structure.sousReponse.cardinalite,
          obj.sousReponse
        )
        if (!resultat.ok) return resultat
      }
      return VALIDE
    }

    case 'branches_par_option': {
      if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        return invalide('branche_invalide')
      }
      const obj = payload as { value?: unknown; precision?: unknown; champs?: unknown }
      if (typeof obj.value !== 'string') return invalide('branche_invalide')

      const option = trouverOption(question.options, obj.value)
      if (!option) return invalide('option_inconnue')

      if (option.precision) {
        if (obj.precision === undefined) return invalide('precision_manquante')
        const resultatPrecision = validerPrecision(option.precision, obj.precision)
        if (!resultatPrecision.ok) return resultatPrecision
      } else if (obj.precision !== undefined) {
        return invalide('precision_non_attendue')
      }

      const branche = structure.branches[obj.value]
      if (branche) {
        if (obj.champs === undefined) return invalide('branche_champs_manquants')
        return validerChampsFixes(branche, obj.champs)
      }
      if (obj.champs !== undefined) return invalide('branche_champs_non_attendus')
      return VALIDE
    }
  }
}

function validerTexteAvecProvenance(question: QuestionCanonique, payload: unknown): ValidationResult {
  const structure = question.texteAvecProvenance
  if (!structure) return invalide('structure_canon_absente')

  if (question.options && typeof payload === 'string' && trouverOption(question.options, payload)) {
    return VALIDE
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return invalide('texte_avec_provenance_invalide')
  }
  const obj = payload as { texte?: unknown; provenance?: unknown }
  if (!estTexteNonVide(obj.texte)) return invalide('texte_avec_provenance_invalide')
  if (typeof obj.provenance !== 'string' || !structure.provenanceOptions.some(o => o.value === obj.provenance)) {
    return invalide('provenance_invalide')
  }
  return VALIDE
}

/**
 * Validation serveur stricte d'une réponse proposée contre la définition
 * canonique exacte de la question (D-029 §F). Ne suppose jamais que 013
 * valide la sémantique métier — cette fonction est la seule à connaître
 * la forme exacte attendue (options fermées, cardinalité, sous-champs,
 * précision conditionnelle).
 */
export function validateMpdAnswer(
  question: QuestionCanonique,
  statut: StatutReponse,
  payload: unknown
): ValidationResult {
  if (statut !== 'DECLARE' && statut !== 'INCONNU' && statut !== 'REFUS') {
    return invalide('statut_invalide')
  }
  if (statut === 'REFUS' && !question.eligibiliteRefus) {
    return invalide('refus_non_eligible')
  }
  if (statut === 'INCONNU' && !question.eligibiliteInconnu) {
    return invalide('inconnu_non_eligible')
  }
  if (statut !== 'DECLARE') {
    return payload === null || payload === undefined ? VALIDE : invalide('payload_doit_etre_nul')
  }
  if (payload === null || payload === undefined) {
    return invalide('payload_requis')
  }

  switch (question.formeReponse) {
    case 'texte':
      return validerTexte(question.options, question.cardinalite, payload)
    case 'choix_unique':
    case 'choix_avec_precision':
      return validerSelection(question.options, payload)
    case 'multi_selection':
      return validerMultiSelection(question.options, question.cardinalite, payload)
    case 'items_avec_sous_reponse':
      return validerItemsAvecSousReponse(question, payload)
    case 'texte_avec_provenance':
      return validerTexteAvecProvenance(question, payload)
  }
}

/** Point d'entrée pratique quand seul le stableId est connu (avant
 * d'avoir résolu la question contre le canon). */
export function validateMpdAnswerById(
  canonParId: ReadonlyMap<string, QuestionCanonique>,
  stableId: string,
  statut: StatutReponse,
  payload: unknown
): ValidationResult {
  const question = canonParId.get(stableId)
  if (!question) return invalide('question_inconnue')
  return validateMpdAnswer(question, statut, payload)
}
