// ============================================================
// MFR V1 — AnalyseSortieBrute — T-MFR.3C (GO CODE)
// ============================================================
// Contrat de la sortie IA AVANT validation déterministe (D-054 §A/§B,
// D-052). L'IA ne manipule jamais d'UUID DB — uniquement des idLocal
// opaques (uniques dans la sortie d'une tentative) et des SRC_xxx issus
// de MfrAnalysisContext. `AnalyseGrapheResolu` (server/types.ts,
// T-MFR.3A) reste l'unique contrat validé C — jamais dupliqué ici.
//
// `sortie` (D-025) n'appartient structurellement JAMAIS à ce contrat
// (D-025/D-054 §H — « sortie n'appartient pas au contrat IA », arbitrage
// QG GO CODE confirmant qu'une présence de ce champ dans le JSON brut
// reçu du provider est une violation STRUCTURAL bloquante, jamais une
// omission silencieuse) — voir validator.ts, verifierChampSortieInterdit.

import type {
  ActionnabiliteResultat,
  AnalyseGrapheResolu,
  FamilleAncrage,
  NatureObjetPA,
  StatutEpistemique,
  StatutHypothese,
} from '../server/types'

export type MecanismeCatalogue = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6'
export type RoleMecanisme = 'principal' | 'secondaire' | 'co_principal' | 'operationnel'
export type TransformationControlee = 'CONTINUER' | 'TRANSFERER' | 'COMBINER' | 'SIMPLIFIER'

export interface MecanismeAssocieBrut {
  readonly mecanisme: MecanismeCatalogue
  readonly role: RoleMecanisme
}

/**
 * Un regroupement de sources proposé par l'IA. L'identité canonique
 * (fusion déterministe par ensemble exact de SRC_xxx trié/unique)
 * appartient exclusivement au moteur (validator.ts) — jamais à l'IA.
 */
export interface ReferentBrut {
  readonly idLocal: string
  readonly sources: readonly string[]
  /** Extraits optionnels par SRC_xxx cité — jamais inventés, jamais
   * requis. Chaque clé doit être un élément de `sources` ci-dessus. */
  readonly extraits?: Readonly<Record<string, string>>
}

export interface PropositionAnalytiqueBrute {
  readonly idLocal: string
  readonly enonce: string
  readonly natureObjet: NatureObjetPA
  readonly statutEpistemique: StatutEpistemique
  /** idLocal de ReferentBrut corroborant cette proposition. */
  readonly referents: readonly string[]
}

export interface AncrageBrut {
  readonly idLocal: string
  readonly famille: FamilleAncrage
  readonly enonce: string
  /** idLocal de PropositionAnalytiqueBrute dont cet Ancrage dérive. */
  readonly propositions: readonly string[]
}

export interface HypotheseAncrageBrut {
  readonly ancrageIdLocal: string
  readonly constitutif: boolean
}

export interface HypotheseBrute {
  readonly idLocal: string
  readonly statut: StatutHypothese
  readonly formulation: string
  readonly mecanismes?: readonly MecanismeAssocieBrut[]
  readonly transformations?: readonly TransformationControlee[]
  readonly acteursFlux?: unknown
  readonly modalitesProposees?: unknown
  readonly exigences?: unknown
  readonly etatExigences?: unknown
  readonly inconnuesCritiques?: unknown
  readonly ancrages: readonly HypotheseAncrageBrut[]
}

export interface PisteBrute {
  readonly idLocal: string
  readonly incertitudeConstitutive: string
  readonly actionReduction: string
  readonly variablesTest?: unknown
}

/**
 * Jugements qualitatifs D-025 pour une Direction Candidate — jamais
 * `sortie` (calculée exclusivement par le moteur, voir en-tête de
 * fichier). Une seule entrée par `hypotheseIdLocal` (vérifié STRUCTURAL).
 */
export interface EvaluationD025Brute {
  readonly hypotheseIdLocal: string
  readonly coherenceOk: boolean
  readonly compatibiliteOk?: boolean | null
  readonly actionnabiliteResultat?: ActionnabiliteResultat | null
  readonly disponibiliteOk?: boolean | null
  readonly recommandeeAujourdhui?: boolean
  readonly justification?: unknown
}

export interface AnalyseSortieBrute {
  readonly referents: readonly ReferentBrut[]
  readonly propositionsAnalytiques: readonly PropositionAnalytiqueBrute[]
  readonly ancrages: readonly AncrageBrut[]
  readonly hypotheses: readonly HypotheseBrute[]
  readonly pistes: readonly PisteBrute[]
  readonly evaluationsD025: readonly EvaluationD025Brute[]
}

export type CategorieDiagnostic = 'STRUCTURAL' | 'REFERENTIAL' | 'BUSINESS' | 'EPISTEMIC'

export interface Diagnostic {
  readonly categorie: CategorieDiagnostic
  readonly code: string
  readonly message: string
  /** Pointeur approximatif vers l'objet fautif (idLocal ou chemin) —
   * aide au diagnostic, jamais une autorité de correction. */
  readonly chemin?: string
}

export type ValidationResultat =
  | { readonly ok: true; readonly graphe: AnalyseGrapheResolu }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] }
