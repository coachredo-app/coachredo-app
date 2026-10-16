// ============================================================
// MFR V1 — MfrAnalysisContext — T-MFR.3B
// ============================================================
// Contrat verrouillé par le QG (D-051/D-052, micro-arbitrages T-MFR.3B).
// Construit exclusivement depuis le MPD figé (mpd_etats_logiques +
// mpd_etat_logique_reponses) — jamais un accès libre à la base pour le
// futur moteur d'analyse IA (D-052 : « AI = constrained reasoning
// engine, never authority on facts or system rules »).
//
// Aucune métadonnée non-MPD (nom, email, user_id, pays de résidence,
// langue, abonnement, historique d'autres utilisateurs, données
// CoachRedo hors MPD) — arbitrage explicite, voir le compte rendu
// T-MFR.3B. `territoire_principal` (micro-donnée canon) reste la seule
// donnée territoriale pertinente, jamais remplacée par
// `profiles.country`.

import type { NatureObjet } from '@/lib/mpd/canon'

export const MFR_ANALYSIS_CONTEXT_VERSION = 1 as const

export type StatutEpistemiqueSource = 'DECLARE' | 'INCONNU' | 'REFUS'

/**
 * Une unité source du snapshot, identifiée par un jeton opaque
 * déterministe (SRC_xxx) — jamais le stableId/referenceEditoriale
 * interne du canon (D-043/D-052 §4). 1 SRC = 1 réponse réellement
 * présente dans le snapshot figé — jamais une question non applicable.
 */
export interface MfrAnalysisSource {
  readonly src: string
  readonly etape: 1 | 2 | 3 | 4 | 5 | 6 | 7
  /** Taxonomie déjà fermée D-024/D-028, réutilisée directement depuis
   * le canon MPD — jamais une nouvelle classification. */
  readonly natureObjet: NatureObjet
  readonly statut: StatutEpistemiqueSource
  /** Libellé de la question (`QuestionCanonique.libelle`) — jamais
   * `stableId`/`referenceEditoriale`. */
  readonly question: string
  /** Rendu humain déterministe — projection textuelle dérivée, jamais
   * la source de vérité. Peut être `null` même pour `statut ===
   * 'DECLARE'` lorsque le payload est structurellement valide (canon
   * actuel, ou compatibilité legacy explicitement reconnue) et
   * légitimement vide (ex. liste à cardinalité minimale nulle,
   * réellement vide) — sa nullité ne signifie alors jamais INCONNU.
   * Un payload DECLARE structurellement invalide ou non interprétable
   * n'atteint jamais ce champ : il produit une anomalie
   * `reponse_ininterpretable` avant la construction de toute
   * MfrAnalysisSource. */
  readonly reponseLisible: string | null
  /** Payload structuré normalisé — null uniquement si
   * `statut !== 'DECLARE'`. Jamais une valeur inventée pour un champ
   * legacy orphelin non résolu (ex. Q29 choix principal manquant). */
  readonly valeurStructuree: unknown | null
  /** true si une règle de compatibilité legacy (engine/compatibilite.ts)
   * a dû être appliquée pour produire reponseLisible/valeurStructuree —
   * signal d'audit, jamais une dégradation silencieuse. */
  readonly legacy: boolean
}

/**
 * Contexte canonique, déterministe, transmis en amont du raisonnement
 * IA. `etatLogiqueId` reste l'ancre de provenance mais est EXCLU du
 * `contextHash` (arbitrage QG final T-MFR.3B §8) — le hash est un pur
 * fingerprint de contenu, jamais une preuve d'identité à lui seul.
 */
export interface MfrAnalysisContext {
  readonly contextVersion: typeof MFR_ANALYSIS_CONTEXT_VERSION
  readonly etatLogiqueId: string
  /** Doit être strictement égal à mpd_etats_logiques.version_canonique
   * du snapshot — jamais substitué silencieusement par la version
   * courante du canon si elles diffèrent un jour. */
  readonly canonVersion: number
  /** Ordonné par SRC_xxx croissant = ordre canonique croissant. */
  readonly sources: readonly MfrAnalysisSource[]
  /** hash(canonicalJSON({contextVersion, canonVersion, sources})) —
   * exclut etatLogiqueId, cycleId, et toute métadonnée d'engine
   * (provider/model/promptVersion/schemaVersion/catalogueVersion),
   * jamais de timestamp. */
  readonly contextHash: string
}

/**
 * Anomalie bloquante de construction — jamais un contexte partiel.
 * N'appartient jamais au contenu du MfrAnalysisContext lui-même.
 */
export type ConstructionAnomalie =
  | { readonly type: 'etat_logique_introuvable' }
  | { readonly type: 'canon_version_inconnue'; readonly canonVersion: number }
  | { readonly type: 'question_applicable_sans_reponse'; readonly stableId: string }
  /** Réponse DECLARE présente dans le snapshot, mais dont le builder ne
   * peut produire honnêtement aucune représentation structurée — ni
   * depuis le canon actuel, ni depuis une compatibilité legacy
   * explicitement reconnue (Q4/Q29). Jamais de source produite pour
   * cette réponse, jamais un payload brut transmis en repli, jamais
   * `legacy: true` artificiel — construction interrompue (arbitrage
   * QG, micro-correction T-MFR.3B). */
  | { readonly type: 'reponse_ininterpretable'; readonly stableId: string }

/**
 * Correspondance privée serveur SRC_xxx → mpd_etat_logique_reponses.id —
 * T-MFR.3C (D-054 §C). JAMAIS transmise au provider, JAMAIS incluse dans
 * MfrAnalysisContext ni dans contextHash — structure serveur strictement
 * séparée du contexte public/déterministe ci-dessus. Produite par la
 * même passe que `sources` (jamais une re-dérivation indépendante, pour
 * exclure tout risque de divergence — arbitrage D-054 §C).
 */
export type SourceBindings = ReadonlyMap<string, string>

export type ConstructionResultat =
  | { readonly ok: true; readonly context: MfrAnalysisContext; readonly sourceBindings: SourceBindings }
  | { readonly ok: false; readonly anomalie: ConstructionAnomalie }
