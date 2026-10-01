// ============================================================
// MPD V3 — Grammaire canonique — Types structurels
// ============================================================
// Source de vérité métier : docs/project-memory/MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md
// Décisions verrouillées : D-029 à D-035, T7.2, T7.2B, T7.3.
//
// Ce module ne duplique jamais la définition métier en DB (D-029 §F) —
// il est la seule source de vérité canonique, consommée exclusivement
// par la Server Action qui dépose l'attestation canonique (D-031) avant
// chaque appel RPC MPD sous JWT utilisateur.
//
// Volontairement absent : un champ obligatoire/facultatif générique —
// le questionnaire métier ne définit cette notion nulle part (T7.2 §B).

export const CANON_VERSION = 1 as const

export type Etape = 1 | 2 | 3 | 4 | 5 | 6 | 7

// ── Formes de payload — ensemble fermé D-029, jamais une 7e ──────────────

export type FormeReponse =
  | 'texte'
  | 'choix_unique'
  | 'choix_avec_precision'
  | 'multi_selection'
  | 'items_avec_sous_reponse'
  | 'texte_avec_provenance'

export const FORMES_REPONSE: readonly FormeReponse[] = [
  'texte',
  'choix_unique',
  'choix_avec_precision',
  'multi_selection',
  'items_avec_sous_reponse',
  'texte_avec_provenance',
] as const

// ── Nature métier — taxonomie fermée D-024/D-028 ──────────────────────────
// Seules 'capacite' et 'comportement_passe' sont éligibles à une future
// convergence D→E, sous les conditions déjà verrouillées ailleurs —
// aucun moteur D→E n'est codé dans ce module (T7.3, hors périmètre).

export type NatureObjet =
  | 'ressource'
  | 'contrainte'
  | 'preference'
  | 'capacite'
  | 'comportement_passe'
  | 'observation_probleme'
  | 'contexte'

export const NATURES_OBJET: readonly NatureObjet[] = [
  'ressource',
  'contrainte',
  'preference',
  'capacite',
  'comportement_passe',
  'observation_probleme',
  'contexte',
] as const

// ── Applicabilité — D-022, trois états exclusifs ──────────────────────────

export type Applicabilite = 'SOCLE' | 'CONDITIONNELLE' | 'RECUPERATION'

export interface Cardinalite {
  readonly min: number
  readonly max: number
}

// ── Options et précision ──────────────────────────────────────────────────

/**
 * Sous-champ ouvert par une option sélectionnée. 'composite' reste à
 * l'intérieur de la forme choix_avec_precision (pas une 7e forme) : il
 * couvre les cas réels où une branche "Oui" déverrouille plusieurs
 * champs nommés distincts (ex. branche activité existante de Q1, Q16).
 */
export type PrecisionOption =
  | { readonly type: 'texte'; readonly label?: string }
  | { readonly type: 'nombre_devise'; readonly label?: string }
  | { readonly type: 'composite'; readonly champs: readonly ChampFixe[] }

export interface Option {
  readonly value: string
  readonly label: string
  readonly precision?: PrecisionOption
}

/**
 * Champ nommé rattaché à une question canonique — jamais un stableId
 * autonome, jamais une instance mpd_reponses_courantes séparée (T7.3
 * §1 : relances et sous-champs enrichissent le payload de la question
 * parente).
 */
export interface ChampFixe {
  readonly id: string
  readonly label: string
  readonly aide?: string
  readonly formeReponse: FormeReponse
  readonly options?: readonly Option[]
  readonly cardinalite?: Cardinalite
}

/**
 * items_avec_sous_reponse couvre trois motifs réellement observés dans
 * le questionnaire (T7.2B), jamais ajoutés par commodité :
 * - champs_fixes : ensemble fixe et nommé de sous-champs, toujours
 *   présent (Q17, Q24, Q26, Q27).
 * - liste_declaree : une sous-réponse identique appliquée à chaque
 *   élément d'une liste plafonnée déjà déclarée (Q18, Q21).
 * - branches_par_option : chaque option sélectionnée porte sa propre
 *   sous-structure distincte (Q11 uniquement).
 */
export type ItemsAvecSousReponse =
  | { readonly motif: 'champs_fixes'; readonly champs: readonly ChampFixe[] }
  | {
      readonly motif: 'liste_declaree'
      readonly cardinalite: Cardinalite
      readonly sousReponse: ChampFixe
    }
  | {
      readonly motif: 'branches_par_option'
      readonly branches: Readonly<Record<string, readonly ChampFixe[]>>
    }

/**
 * Q36 uniquement (D-029 : "texte avec provenance"). La formulation UX
 * exacte des options de provenance n'est pas figée par le questionnaire
 * source (« formulation UX exacte à spécifier ultérieurement ») —
 * formulationFigee=false le documente explicitement plutôt que
 * d'inventer un wording définitif.
 */
export interface TexteAvecProvenance {
  readonly provenanceOptions: readonly Option[]
  readonly formulationFigee: false
}

/**
 * Une relance enrichit le payload de la question parente — elle ne crée
 * jamais de nouvelle instance mpd_reponses_courantes (T7.3 §1). Règle
 * transversale verrouillée : au plus une relance par question.
 */
export interface Relance {
  readonly condition: string
  readonly libelle: string
  readonly aide?: string
  readonly formeReponse: FormeReponse
  readonly options?: readonly Option[]
}

// ── Triggers structurés — A7/D-026 : jamais une évaluation sémantique ────

export type TriggerCondition =
  | { readonly stableId: string; readonly regle: 'egal_a'; readonly valeur: string }
  | { readonly stableId: string; readonly regle: 'valeur_parmi'; readonly valeurs: readonly string[] }
  | { readonly stableId: string; readonly regle: 'contient_une_entree_hors'; readonly valeurExclue: string }

export type Trigger =
  | { readonly operateur: 'ET'; readonly conditions: readonly TriggerCondition[] }
  | { readonly operateur: 'OU'; readonly conditions: readonly TriggerCondition[] }

// ── Définition canonique d'une question ───────────────────────────────────

export interface QuestionCanonique {
  readonly stableId: string
  readonly referenceEditoriale: string
  readonly etape: Etape
  /** Position globale déterministe dans le canon (1..41). */
  readonly ordre: number
  readonly versionCanonique: number
  readonly libelle: string
  readonly aide?: string
  readonly formeReponse: FormeReponse
  readonly options?: readonly Option[]
  readonly cardinalite?: Cardinalite
  readonly itemsAvecSousReponse?: ItemsAvecSousReponse
  readonly texteAvecProvenance?: TexteAvecProvenance
  /** Éligibilité au statut système INCONNU (D-030) — distincte d'une
   * éventuelle option DÉCLARÉE "je ne sais pas", d'une option NA/aucun,
   * et du statut REFUS. Règle de défaut verrouillée (T7.3C) : INCONNU
   * est autorisé par défaut sur toute unité canonique, sauf interdiction
   * canonique explicite — aucune des 41 unités du canon V1 n'en porte. */
  readonly eligibiliteInconnu: boolean
  /** Éligibilité au statut système REFUS (D-030) — vrai uniquement là
   * où le questionnaire source porte littéralement "Je préfère ne pas
   * répondre" (3 questions exactement, T7.2). */
  readonly eligibiliteRefus: boolean
  readonly natureObjet: NatureObjet
  readonly applicabilite: Applicabilite
  /** Présent uniquement si applicabilite ∈ {CONDITIONNELLE, RECUPERATION}. */
  readonly trigger?: Trigger
  readonly relance?: Relance
  /** D-029 §F : requis dès que la forme implique un choix structuré,
   * à quelque niveau que ce soit (direct ou dans un sous-champ). */
  readonly conserveLibellesChoixHistoriques: boolean
}
