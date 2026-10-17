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
// omission silencieuse) — voir validator.ts, verifierClesFermees
// (STRICT CLOSED-WORLD, correction QG — `sortie` n'apparaît dans aucune
// liste de clés autorisées, son interdiction est un cas particulier de
// la fermeture générale, jamais un mécanisme séparé).

import type {
  ActionnabiliteResultat,
  AnalyseGrapheResolu,
  FamilleAncrage,
  NatureObjetPA,
  StatutEpistemique,
  StatutHypothese,
} from '../server/types'

/** Version du contrat `AnalyseSortieBrute` lui-même (distincte de
 * `MFR_ANALYSIS_CONTEXT_VERSION`, T-MFR.3B) — alimente `schema_version`
 * au démarrage de l'analyse (`AnalyseMetadata`, server/types.ts). */
export const MFR_ANALYSE_SORTIE_BRUTE_SCHEMA_VERSION = 1 as const

export type MecanismeCatalogue = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6'
export type RoleMecanisme = 'principal' | 'secondaire' | 'co_principal' | 'operationnel'
export type TransformationControlee = 'CONTINUER' | 'TRANSFERER' | 'COMBINER' | 'SIMPLIFIER'

export interface MecanismeAssocieBrut {
  readonly mecanisme: MecanismeCatalogue
  readonly role: RoleMecanisme
}

/**
 * Un extrait d'audit pour un SRC_xxx cité par le référent qui le porte.
 * Forme fermée (tableau de paires), remplace l'ancien dictionnaire
 * dynamique `Record<string,string>` — incompatible avec le mode strict
 * des providers Structured Outputs (arbitrage QG, T-MFR.3D). `src` doit
 * appartenir aux `sources` du MÊME référent — vérifié REFERENTIAL
 * (validator.ts), jamais STRUCTURAL : ce n'est pas une question de forme,
 * mais d'existence d'une référence, au même titre qu'un SRC_xxx cité
 * (D-052 §N/D-054 §G).
 */
export interface ExtraitSrcBrut {
  readonly src: string
  readonly extrait: string
}

/**
 * Un regroupement de sources proposé par l'IA. L'identité canonique
 * (fusion déterministe par ensemble exact de SRC_xxx trié/unique)
 * appartient exclusivement au moteur (validator.ts) — jamais à l'IA.
 */
export interface ReferentBrut {
  readonly idLocal: string
  readonly sources: readonly string[]
  /** Extraits d'audit optionnels — absent et `[]` ont la même sémantique
   * (le mode strict des providers Structured Outputs n'offre aucune
   * véritable absence de clé ; un tableau vide est la représentation
   * naturelle de « aucun extrait fourni »). */
  readonly extraits?: readonly ExtraitSrcBrut[]
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
  /** Relation économique minimale intelligible (D-048 §S/§T pt.5) —
   * texte narratif, jamais une structure figée (la doctrine refuse
   * elle-même de l'imposer). `null` si rien d'identifiable. */
  readonly acteursFlux: string | null
  /** Modalités de test/exécution proposées (D-048 §D pt.4) — liste
   * ouverte, jamais un schéma de champs fixes. */
  readonly modalitesProposees: readonly string[]
  /** Exigences réelles identifiées — distinct de leur état ci-dessous
   * (D-049/016, colonnes DB déjà séparées, non rouvert). Restent deux
   * listes distinctes, jamais fusionnées, jamais alignées par un
   * mécanisme automatique (arbitrage QG, T-MFR.3D). */
  readonly exigences: readonly string[]
  /** État des exigences ci-dessus — même discipline, même arbitrage. */
  readonly etatExigences: readonly string[]
  /** Non-contamination (D-048 §T pt.7) — ce qui reste explicitement
   * `INCONNU`, jamais supposé. */
  readonly inconnuesCritiques: readonly string[]
  readonly ancrages: readonly HypotheseAncrageBrut[]
}

export interface PisteBrute {
  readonly idLocal: string
  readonly incertitudeConstitutive: string
  readonly actionReduction: string
  /** Variables de test explicites (D-048 §U pt.2) — liste de noms. */
  readonly variablesTest: readonly string[]
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
  /** Explication narrative du jugement proposé (D-052 §L) — texte
   * simple, jamais une structure. `null` si aucune justification. */
  readonly justification: string | null
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
