// ============================================================
// MFR V1 — Types du socle d'orchestration (T-MFR.3A)
// ============================================================
// Forme exacte attendue par mfr_finir_analyse_succes (017). Tous les
// identifiants sont déjà de vrais UUID, résolus par l'orchestrateur en
// amont — aucun id_local à résoudre côté serveur. Ce fichier ne décide
// rien de la validité métier (T-MFR.3C, futur) — il décrit seulement la
// forme transactionnelle déjà verrouillée par D-052/T-MFR.3A.

export type NatureObjetPA =
  | 'ressource'
  | 'contrainte'
  | 'preference'
  | 'capacite'
  | 'comportement_passe'
  | 'observation_probleme'
  | 'contexte'

export type StatutEpistemique = 'DECLARE' | 'ETAYE' | 'INFERE' | 'CONTRADICTOIRE' | 'INCONNU'

export type FamilleAncrage =
  | 'CAPACITE'
  | 'COMPORTEMENT_PASSE'
  | 'EXPERIENCE_EXPOSITION'
  | 'RESSOURCE'
  | 'ACCES_RELATION'
  | 'PROBLEME_OBSERVE'

export type StatutHypothese = 'DIRECTION_CANDIDATE' | 'REJETEE'

export type ActionnabiliteResultat =
  | 'ACTIONNABLE_MAINTENANT'
  | 'CONSTRUCTIBLE_MAIS_PREMATUREE'
  | 'SANS_ROUTE_RAISONNABLE'

export type SortieD025 = 'PRESENTER_MAINTENANT' | 'DIRECTION_A_GARDER_EN_VUE' | 'NE_PAS_PRESENTER'

export interface AnalyseMetadata {
  readonly provider: string
  readonly model: string
  readonly promptVersion: string
  readonly schemaVersion: string
  readonly catalogueVersion: string
}

export interface PropositionAnalytiqueResolue {
  readonly id: string
  readonly enonce: string
  readonly nature_objet: NatureObjetPA
  readonly statut_epistemique: StatutEpistemique
}

export interface ReferentResolu {
  readonly id: string
}

export interface ReferentSourceResolue {
  readonly id: string
  readonly referent_id: string
  readonly etat_logique_reponse_id: string
  readonly extrait?: string | null
}

export interface PropositionReferentResolue {
  readonly id: string
  readonly proposition_id: string
  readonly referent_id: string
}

export interface AncrageResolu {
  readonly id: string
  readonly famille: FamilleAncrage
  readonly enonce: string
}

export interface PropositionAncrageResolue {
  readonly id: string
  readonly proposition_id: string
  readonly ancrage_id: string
}

export interface HypotheseResolue {
  readonly id: string
  readonly statut: StatutHypothese
  readonly formulation: string
  readonly mecanismes?: unknown
  readonly transformations?: unknown
  readonly acteurs_flux: string | null
  readonly modalites_proposees: readonly string[]
  readonly exigences: readonly string[]
  readonly etat_exigences: readonly string[]
  readonly inconnues_critiques: readonly string[]
}

export interface PisteResolue {
  readonly id: string
  readonly incertitude_constitutive: string
  readonly action_reduction: string
  readonly variables_test: readonly string[]
}

export interface HypotheseAncrageResolue {
  readonly id: string
  readonly hypothese_id: string
  readonly ancrage_id: string
  readonly constitutif: boolean
}

export interface EvaluationD025Resolue {
  readonly id: string
  readonly hypothese_id: string
  readonly coherence_ok: boolean
  readonly compatibilite_ok?: boolean | null
  readonly actionnabilite_resultat?: ActionnabiliteResultat | null
  readonly disponibilite_ok?: boolean | null
  readonly sortie: SortieD025
  readonly recommandee_aujourdhui: boolean
  readonly justification: string | null
}

/** Forme exacte du paramètre p_graphe de mfr_finir_analyse_succes. */
export interface AnalyseGrapheResolu {
  readonly propositions_analytiques?: readonly PropositionAnalytiqueResolue[]
  readonly referents?: readonly ReferentResolu[]
  readonly referent_sources?: readonly ReferentSourceResolue[]
  readonly proposition_referents?: readonly PropositionReferentResolue[]
  readonly ancrages?: readonly AncrageResolu[]
  readonly proposition_ancrages?: readonly PropositionAncrageResolue[]
  readonly hypotheses?: readonly HypotheseResolue[]
  readonly pistes?: readonly PisteResolue[]
  readonly hypothese_ancrages?: readonly HypotheseAncrageResolue[]
  readonly evaluations_d025?: readonly EvaluationD025Resolue[]
}
