// ============================================================
// MFR V1 — RedactionSortieBrute — T-MFR.5A
// ============================================================
// Contrat de la sortie IA de rédaction AVANT validation déterministe.
// Le modèle ne reçoit et ne produit jamais d'UUID DB — uniquement des
// `position` (1 à 3, déjà décidées par la curation humaine, T-MFR.4B)
// et des `SRC_xxx` opaques issus de `MfrWritingContext`. Il ne choisit,
// ne filtre, ne classe et ne substitue AUCUNE direction/recommandation
// (arbitrage QG, GO T-MFR.5A) — conséquence directe et volontaire :
// ce contrat ne porte AUCUN champ `estRecommandee`. La recommandation
// est calculée exclusivement par le moteur à partir du contexte déjà
// décidé (`MfrWritingContext.recommandationPosition`), jamais lue
// depuis cette sortie — même principe que D-025 `sortie` pour
// l'analyse (jamais dans le contrat IA, jamais une omission silencieuse
// si un modèle tentait malgré tout de l'y placer : violation STRUCTURAL
// bloquante, cf. validator.ts).

// v2 (bump post-E2E#1, redaction `8e94d5f0-...`, ECHEC conservée
// intacte) : `sources` des affirmations optionnelles n'est plus
// nullable — toujours un tableau, `[]` = aucune source invoquée (voir
// redactionSchema.ts). Simplification délibérée du contrat (une union
// array/null n'aurait rien ajouté), pas une contrainte imposée par
// Structured Outputs. `position` reste un entier natif `1|2|3` — la
// correction post-E2E#1 ne porte QUE sur `aucuneDirectionMessage`
// (`anyOf`, le seul changement directement lié au 400 réel) et sur
// `sources` ci-dessus.
export const MFR_REDACTION_SORTIE_BRUTE_SCHEMA_VERSION = 2 as const

/**
 * Affirmation dont le grounding est OBLIGATOIRE — `pourquoi`/`forces`
 * (arbitrage QG point 2) : ce sont toujours des affirmations sur
 * l'utilisateur, jamais une proposition nouvelle de CoachRedo.
 */
export interface AffirmationSourceeBrute {
  readonly texte: string
  readonly sources: readonly string[]
}

/**
 * Affirmation dont le grounding est OPTIONNEL — `limites`/`planAction`
 * (arbitrage QG point 2) : une limite générique sur le mécanisme/la
 * direction, ou une proposition CoachRedo nouvelle, n'a rien à citer ;
 * si elle invoque un fait utilisateur précis, ce fait précis doit l'être.
 * `sources: []` = aucune source invoquée — toujours un tableau, jamais
 * `null` (corrigé post-E2E#1 : simplification du contrat, pas une
 * limitation prouvée de Structured Outputs — voir redactionSchema.ts).
 */
export interface AffirmationOptionnellementSourceeBrute {
  readonly texte: string
  readonly sources: readonly string[]
}

export interface DirectionRedigeeBrute {
  /** Référence à la direction déjà décidée (curation, T-MFR.4B) — même
   * valeur que `MfrWritingDirection.position`, jamais un idLocal inventé
   * par le modèle. */
  readonly position: 1 | 2 | 3
  readonly titre: string
  readonly pourquoi: AffirmationSourceeBrute
  readonly forces: AffirmationSourceeBrute
  readonly limites: AffirmationOptionnellementSourceeBrute
  readonly planAction: AffirmationOptionnellementSourceeBrute
}

/**
 * Contrat zéro direction (arbitrage QG point 3) : `directions` vide ET
 * `aucuneDirectionMessage` rempli — jamais les deux à la fois, jamais
 * aucun des deux (vérifié STRUCTURAL, validator.ts). Aucun `planAction`
 * ne peut exister dans ce cas : structurellement impossible, aucun
 * objet direction n'existe pour le porter.
 */
export interface RedactionSortieBrute {
  readonly directions: readonly DirectionRedigeeBrute[]
  readonly aucuneDirectionMessage: AffirmationOptionnellementSourceeBrute | null
}

export type CategorieDiagnosticRedaction = 'STRUCTURAL' | 'REFERENTIAL' | 'BUSINESS'

export interface DiagnosticRedaction {
  readonly categorie: CategorieDiagnosticRedaction
  readonly code: string
  readonly message: string
  readonly chemin?: string
}

/** Direction résolue — enrichie par le moteur (jamais par le modèle) :
 * `hypotheseId` (dérivé de `HypothesisBindings`, jamais lu depuis la
 * sortie IA) et `estRecommandee` (calculé depuis le contexte, jamais
 * lu depuis la sortie IA). */
export interface DirectionRedigeeResolue extends DirectionRedigeeBrute {
  readonly hypotheseId: string
  readonly estRecommandee: boolean
}

export const MFR_REDACTION_CONTENU_VERSION = 1 as const

/**
 * Forme exacte persistée dans `mfr_versions.contenu` — identité stricte
 * avec la sortie validée (arbitrage QG point 1) : aucune transformation
 * sémantique entre cette structure et son écriture en base. `cycleId`/
 * `analyseId`/`curationId` ajoutés pour traçabilité de lecture (jamais
 * pour ré-ouvrir une décision déjà prise).
 */
export interface RedactionContenuResolu {
  readonly contenuVersion: typeof MFR_REDACTION_CONTENU_VERSION
  readonly cycleId: string
  readonly analyseId: string
  readonly curationId: string
  readonly recommandationConfirmee: boolean
  readonly directions: readonly DirectionRedigeeResolue[]
  readonly aucuneDirectionMessage: AffirmationOptionnellementSourceeBrute | null
}

export type ValidationRedactionResultat =
  | { readonly ok: true; readonly contenu: RedactionContenuResolu }
  | { readonly ok: false; readonly diagnostics: readonly DiagnosticRedaction[] }
