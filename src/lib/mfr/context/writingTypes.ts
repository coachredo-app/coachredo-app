// ============================================================
// MFR V1 — MfrWritingContext — T-MFR.5A
// ============================================================
// Contrat verrouillé par le QG (GO T-MFR.5A). Construit exclusivement
// depuis la curation officielle (T-MFR.4B) et le graphe analytique déjà
// persisté — jamais un accès libre au MPD brut pour le rédacteur IA
// (même doctrine que `MfrAnalysisContext`, D-052 : « AI = constrained
// reasoning engine »).
//
// N'exposera JAMAIS au rédacteur : les hypothèses non sélectionnées
// (REJETEE, DIRECTION_A_GARDER_EN_VUE, PRESENTER_MAINTENANT non
// retenue), un autre cycle, le MPD brut au-delà des extraits déjà liés
// aux ancrages constitutifs des directions sélectionnées. Aucun UUID
// DB — `position` (1 à 3, déjà décidée par la curation humaine) et
// `SRC_xxx` opaques uniquement.
//
// `recommandationPosition` encode à lui seul tout l'état de
// recommandation : `null` = aucune recommandation confirmée, qu'une
// proposition IA ait existé et ait été retirée, ou qu'aucune n'ait
// jamais existé — le rédacteur ne doit jamais savoir laquelle de ces
// deux situations s'est produite, ni pouvoir la déduire : il connaît
// seulement le fait déjà décidé.

import type { ActionnabiliteResultat, FamilleAncrage, SortieD025 } from '../server/types'

export const MFR_WRITING_CONTEXT_VERSION = 1 as const

export interface MfrWritingSource {
  readonly src: string
  readonly extrait: string
}

export interface MfrWritingAncrage {
  readonly famille: FamilleAncrage
  readonly enonce: string
  /** Extraits réels liés à cet ancrage constitutif via le graphe déjà
   * persisté (ancrage → proposition_ancrages → proposition_referents →
   * referent_sources) — dédupliqués par source. */
  readonly sources: readonly MfrWritingSource[]
}

export interface MfrWritingEvaluationD025 {
  readonly coherenceOk: boolean
  readonly compatibiliteOk: boolean | null
  readonly actionnabiliteResultat: ActionnabiliteResultat | null
  readonly disponibiliteOk: boolean | null
  /** Résultat déjà calculé par l'ENGINE (T-MFR.3C) — à EXPLIQUER,
   * jamais à redériver ou reconsidérer. */
  readonly sortie: SortieD025
  readonly justification: string | null
}

export interface MfrWritingDirection {
  /** Identité que le rédacteur manipule — jamais l'UUID réel
   * (`HypothesisBindings`, strictement serveur). */
  readonly position: 1 | 2 | 3
  readonly formulation: string
  readonly mecanismes: unknown
  readonly evaluationD025: MfrWritingEvaluationD025
  /** Uniquement les ancrages constitutifs (`hypothese_ancrages.constitutif
   * = true`) — jamais tous les ancrages liés. */
  readonly ancragesConstitutifs: readonly MfrWritingAncrage[]
}

export interface MfrWritingContext {
  readonly contextVersion: typeof MFR_WRITING_CONTEXT_VERSION
  /** 0 à 3 entrées, triées par `position` croissante — ordre humain
   * immuable (T-MFR.4B). */
  readonly directions: readonly MfrWritingDirection[]
  /** `null` si aucune recommandation confirmée — voir note d'en-tête. */
  readonly recommandationPosition: 1 | 2 | 3 | null
}

/**
 * Correspondance privée serveur `position` → `hypothese_id` réel —
 * JAMAIS transmise au modèle, même discipline que `SourceBindings`
 * (context/types.ts, T-MFR.3C D-054 §C). Utilisée uniquement par le
 * validateur pour enrichir la sortie résolue après coup.
 */
export type HypothesisBindings = ReadonlyMap<1 | 2 | 3, string>

export type WritingConstructionAnomalie =
  | { readonly type: 'cycle_introuvable' }
  | { readonly type: 'analyse_retenue_manquante' }
  | { readonly type: 'analyse_retenue_incoherente' }
  | { readonly type: 'curation_introuvable' }
  | { readonly type: 'curation_non_officielle' }
  /** Incohérence de données déjà persistées (ex. hypothèse sélectionnée
   * sans évaluation D025, ou sans aucun ancrage constitutif) — ne
   * devrait jamais survenir si T-MFR.3C/4B ont fonctionné correctement ;
   * jamais réparée silencieusement, toujours une anomalie bloquante. */
  | { readonly type: 'incoherence_donnees'; readonly detail: string }

export type WritingConstructionResultat =
  | {
      readonly ok: true
      readonly context: MfrWritingContext
      readonly hypothesisBindings: HypothesisBindings
      readonly cycleId: string
      readonly analyseId: string
      readonly curationId: string
      readonly recommandationConfirmee: boolean
    }
  | { readonly ok: false; readonly anomalie: WritingConstructionAnomalie }
