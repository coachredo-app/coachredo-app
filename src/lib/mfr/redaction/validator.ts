// ============================================================
// MFR V1 — Validation déterministe de la rédaction — T-MFR.5A
// ============================================================
// Garde-fou déterministe, jamais une seconde IA — même doctrine que
// analysis/validator.ts (D-054 §E) : rejette, résout des références,
// calcule ce que le modèle ne doit jamais fournir lui-même
// (`hypotheseId`, `estRecommandee`). Toute violation bloquante → échec
// de TOUTE la rédaction, jamais de réparation silencieuse, jamais un
// contenu partiel. Trois catégories, vérifiées dans cet ordre,
// s'arrêtant à la première en échec : STRUCTURAL → REFERENTIAL →
// BUSINESS (chaque catégorie présuppose la précédente satisfaite).
//
// Aucune dépendance npm, aucun framework de validation.

import type { HypothesisBindings, MfrWritingContext } from '../context/writingTypes'
import type {
  AffirmationOptionnellementSourceeBrute,
  AffirmationSourceeBrute,
  CategorieDiagnosticRedaction,
  DiagnosticRedaction,
  DirectionRedigeeBrute,
  DirectionRedigeeResolue,
  RedactionContenuResolu,
  RedactionSortieBrute,
  ValidationRedactionResultat,
} from './types'
import { MFR_REDACTION_CONTENU_VERSION } from './types'

function diag(categorie: CategorieDiagnosticRedaction, code: string, message: string, chemin?: string): DiagnosticRedaction {
  return chemin ? { categorie, code, message, chemin } : { categorie, code, message }
}

function estChaineNonVide(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

/** STRICT CLOSED-WORLD appliqué à CHAQUE objet imbriqué, pas seulement
 * à la racine (même discipline que D-054 §H/analysis/validator.ts) —
 * toute propriété hors contrat exact, où qu'elle apparaisse (y compris
 * une tentative du modèle de fournir lui-même `estRecommandee`), est
 * une violation STRUCTURAL bloquante. */
function verifierClesFermees(v: Record<string, unknown>, clesAutorisees: readonly string[], chemin: string | undefined, diagnostics: DiagnosticRedaction[]): void {
  const autorisees = new Set(clesAutorisees)
  for (const cle of Object.keys(v)) {
    if (!autorisees.has(cle)) {
      diagnostics.push(diag('STRUCTURAL', 'propriete_inattendue', `Propriété inattendue hors du contrat : \`${cle}\`.`, chemin))
    }
  }
}

// ────────────────────────────────────────────────────────────
// STRUCTURAL — forme du contrat (indépendant du schema provider,
// jamais une seule source de vérité — même discipline que l'analyse)
// ────────────────────────────────────────────────────────────

function validerAffirmationObligatoire(valeur: unknown, chemin: string, diagnostics: DiagnosticRedaction[]): AffirmationSourceeBrute | null {
  if (typeof valeur !== 'object' || valeur === null) {
    diagnostics.push(diag('STRUCTURAL', 'affirmation_invalide', 'Doit être un objet {texte, sources}.', chemin))
    return null
  }
  const v = valeur as Record<string, unknown>
  verifierClesFermees(v, ['texte', 'sources'], chemin, diagnostics)
  if (!estChaineNonVide(v.texte)) {
    diagnostics.push(diag('STRUCTURAL', 'affirmation_texte_invalide', '`texte` doit être une chaîne non vide.', chemin))
  }
  if (!Array.isArray(v.sources) || v.sources.length === 0 || !v.sources.every(s => estChaineNonVide(s))) {
    diagnostics.push(diag('STRUCTURAL', 'affirmation_sources_invalide', '`sources` doit être un tableau non vide de chaînes.', chemin))
    return null
  }
  if (!estChaineNonVide(v.texte)) return null
  return { texte: v.texte as string, sources: v.sources as readonly string[] }
}

function validerAffirmationOptionnelle(
  valeur: unknown,
  chemin: string,
  diagnostics: DiagnosticRedaction[]
): AffirmationOptionnellementSourceeBrute | null {
  if (typeof valeur !== 'object' || valeur === null) {
    diagnostics.push(diag('STRUCTURAL', 'affirmation_invalide', 'Doit être un objet {texte, sources}.', chemin))
    return null
  }
  const v = valeur as Record<string, unknown>
  verifierClesFermees(v, ['texte', 'sources'], chemin, diagnostics)
  let ok = true
  if (!estChaineNonVide(v.texte)) {
    diagnostics.push(diag('STRUCTURAL', 'affirmation_texte_invalide', '`texte` doit être une chaîne non vide.', chemin))
    ok = false
  }
  // `sources` toujours un tableau (jamais `null`, corrigé post-E2E#1) —
  // vide = aucune source invoquée, ce qui reste valide ici (grounding
  // optionnel).
  if (!Array.isArray(v.sources) || !v.sources.every(s => estChaineNonVide(s))) {
    diagnostics.push(diag('STRUCTURAL', 'affirmation_sources_invalide', '`sources` doit être un tableau de chaînes (vide autorisé).', chemin))
    ok = false
  }
  if (!ok) return null
  return { texte: v.texte as string, sources: v.sources as readonly string[] }
}

function validerDirectionBrute(valeur: unknown, chemin: string, diagnostics: DiagnosticRedaction[]): DirectionRedigeeBrute | null {
  if (typeof valeur !== 'object' || valeur === null) {
    diagnostics.push(diag('STRUCTURAL', 'direction_invalide', 'Entrée de `directions` non objet.', chemin))
    return null
  }
  const v = valeur as Record<string, unknown>
  verifierClesFermees(v, ['position', 'titre', 'pourquoi', 'forces', 'limites', 'planAction'], chemin, diagnostics)

  // Entier natif `1|2|3` (contrat naturel, `enum` numérique confirmé
  // supporté par Structured Outputs — voir redactionSchema.ts).
  const position = v.position === 1 || v.position === 2 || v.position === 3 ? v.position : null
  if (position === null) {
    diagnostics.push(diag('STRUCTURAL', 'direction_position_invalide', '`position` doit être le nombre 1, 2 ou 3.', chemin))
    return null
  }
  if (!estChaineNonVide(v.titre)) {
    diagnostics.push(diag('STRUCTURAL', 'direction_titre_invalide', '`titre` doit être une chaîne non vide.', chemin))
  }

  const pourquoi = validerAffirmationObligatoire(v.pourquoi, `${chemin}.pourquoi`, diagnostics)
  const forces = validerAffirmationObligatoire(v.forces, `${chemin}.forces`, diagnostics)
  const limites = validerAffirmationOptionnelle(v.limites, `${chemin}.limites`, diagnostics)
  const planAction = validerAffirmationOptionnelle(v.planAction, `${chemin}.planAction`, diagnostics)

  if (!estChaineNonVide(v.titre) || !pourquoi || !forces || !limites || !planAction) return null

  return { position, titre: v.titre, pourquoi, forces, limites, planAction }
}

function validerStructurel(raw: unknown): { readonly ok: true; readonly sortie: RedactionSortieBrute } | { readonly ok: false; readonly diagnostics: readonly DiagnosticRedaction[] } {
  const diagnostics: DiagnosticRedaction[] = []

  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, diagnostics: [diag('STRUCTURAL', 'racine_invalide', 'La sortie doit être un objet.')] }
  }
  const v = raw as Record<string, unknown>

  verifierClesFermees(v, ['directions', 'aucuneDirectionMessage'], undefined, diagnostics)

  if (!Array.isArray(v.directions)) {
    diagnostics.push(diag('STRUCTURAL', 'directions_absent_ou_invalide', '`directions` doit être un tableau.'))
    return { ok: false, diagnostics }
  }

  const directions: DirectionRedigeeBrute[] = []
  for (let i = 0; i < v.directions.length; i++) {
    const d = validerDirectionBrute(v.directions[i], `directions[${i}]`, diagnostics)
    if (d) directions.push(d)
  }
  if (directions.length !== v.directions.length) {
    return { ok: false, diagnostics }
  }

  let aucuneDirectionMessage: AffirmationOptionnellementSourceeBrute | null = null
  if (v.aucuneDirectionMessage !== null && v.aucuneDirectionMessage !== undefined) {
    const m = validerAffirmationOptionnelle(v.aucuneDirectionMessage, 'aucuneDirectionMessage', diagnostics)
    if (!m) return { ok: false, diagnostics }
    aucuneDirectionMessage = m
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics }

  return { ok: true, sortie: { directions, aucuneDirectionMessage } }
}

// ────────────────────────────────────────────────────────────
// REFERENTIAL — correspondance exacte avec le contexte déjà décidé
// ────────────────────────────────────────────────────────────

function toutesLesSourcesExistent(sources: readonly string[], srcValides: ReadonlySet<string>, chemin: string, diagnostics: DiagnosticRedaction[]): void {
  for (const src of sources) {
    if (!srcValides.has(src)) {
      diagnostics.push(diag('REFERENTIAL', 'src_inconnu', `SRC_xxx cité mais absent du contexte : ${src}.`, chemin))
    }
  }
}

// ────────────────────────────────────────────────────────────
// Point d'entrée
// ────────────────────────────────────────────────────────────

export function validerEtResoudreRedactionSortieBrute(
  raw: unknown,
  context: MfrWritingContext,
  hypothesisBindings: HypothesisBindings,
  identite: { readonly cycleId: string; readonly analyseId: string; readonly curationId: string; readonly recommandationConfirmee: boolean }
): ValidationRedactionResultat {
  const structurel = validerStructurel(raw)
  if (!structurel.ok) return { ok: false, diagnostics: structurel.diagnostics }
  const sortie = structurel.sortie

  const diagnostics: DiagnosticRedaction[] = []

  // Contrat zéro direction (arbitrage QG point 3) — corrélation stricte,
  // jamais les deux à la fois, jamais aucun des deux.
  if (context.directions.length === 0) {
    if (sortie.directions.length !== 0) {
      diagnostics.push(diag('BUSINESS', 'directions_inattendues', 'Le contexte ne contient aucune direction mais la sortie en propose.'))
    }
    if (!sortie.aucuneDirectionMessage) {
      diagnostics.push(diag('BUSINESS', 'message_zero_direction_manquant', '`aucuneDirectionMessage` est obligatoire quand `directions` est vide.'))
    }
  } else {
    if (sortie.aucuneDirectionMessage) {
      diagnostics.push(diag('BUSINESS', 'message_zero_direction_interdit', '`aucuneDirectionMessage` doit être `null` dès qu\'au moins une direction est présente.'))
    }
  }

  // Ensemble et ordre exacts — aucune direction ajoutée/supprimée,
  // jamais réordonnée par rapport au contexte déjà décidé (curation).
  const positionsContexte = context.directions.map(d => d.position)
  const positionsSortie = sortie.directions.map(d => d.position)
  const positionsContexteTriees = [...positionsContexte].sort()
  const positionsSortieTriees = [...positionsSortie].sort()
  if (JSON.stringify(positionsContexteTriees) !== JSON.stringify(positionsSortieTriees)) {
    diagnostics.push(diag('REFERENTIAL', 'positions_non_conformes', `Positions attendues ${JSON.stringify(positionsContexteTriees)}, reçues ${JSON.stringify(positionsSortieTriees)}.`))
  }
  if (new Set(positionsSortie).size !== positionsSortie.length) {
    diagnostics.push(diag('STRUCTURAL', 'position_dupliquee', 'Une même `position` apparaît plusieurs fois dans `directions`.'))
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics }

  // Construction de l'ensemble des SRC valides pour TOUT le contexte
  // (closed-world global, pas seulement par direction — une citation
  // correcte mais au mauvais endroit reste acceptée, seule l'existence
  // compte ici).
  const srcValides = new Set<string>()
  for (const d of context.directions) {
    for (const a of d.ancragesConstitutifs) {
      for (const s of a.sources) srcValides.add(s.src)
    }
  }

  for (const direction of sortie.directions) {
    toutesLesSourcesExistent(direction.pourquoi.sources, srcValides, `direction[${direction.position}].pourquoi`, diagnostics)
    toutesLesSourcesExistent(direction.forces.sources, srcValides, `direction[${direction.position}].forces`, diagnostics)
    toutesLesSourcesExistent(direction.limites.sources, srcValides, `direction[${direction.position}].limites`, diagnostics)
    toutesLesSourcesExistent(direction.planAction.sources, srcValides, `direction[${direction.position}].planAction`, diagnostics)
  }
  if (sortie.aucuneDirectionMessage) {
    toutesLesSourcesExistent(sortie.aucuneDirectionMessage.sources, srcValides, 'aucuneDirectionMessage', diagnostics)
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics }

  // Résolution — enrichissement déterministe, jamais lu depuis la
  // sortie IA : hypotheseId (HypothesisBindings) et estRecommandee
  // (context.recommandationPosition, jamais la sortie IA).
  const directionsResolues: DirectionRedigeeResolue[] = []
  for (const direction of [...sortie.directions].sort((a, b) => a.position - b.position)) {
    const hypotheseId = hypothesisBindings.get(direction.position)
    // Ne peut normalement jamais survenir (positions déjà vérifiées
    // identiques au contexte ci-dessus) — défensif, jamais une valeur
    // devinée, jamais une exception non typée remontée à l'appelant.
    if (!hypotheseId) {
      diagnostics.push(diag('REFERENTIAL', 'hypothese_binding_introuvable', `Aucune correspondance interne pour la position ${direction.position}.`))
      continue
    }
    directionsResolues.push({
      ...direction,
      hypotheseId,
      estRecommandee: context.recommandationPosition === direction.position,
    })
  }
  if (diagnostics.length > 0) return { ok: false, diagnostics }

  const contenu: RedactionContenuResolu = {
    contenuVersion: MFR_REDACTION_CONTENU_VERSION,
    cycleId: identite.cycleId,
    analyseId: identite.analyseId,
    curationId: identite.curationId,
    recommandationConfirmee: identite.recommandationConfirmee,
    directions: directionsResolues,
    aucuneDirectionMessage: sortie.aucuneDirectionMessage,
  }

  return { ok: true, contenu }
}
