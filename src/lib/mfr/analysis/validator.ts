// ============================================================
// MFR V1 — Validation déterministe + résolution ENGINE — T-MFR.3C
// ============================================================
// Garde-fou déterministe, jamais une seconde IA (D-054 §E) : rejette,
// résout des références, canonicalise ce qui est réellement déterministe,
// calcule les dérivations système verrouillées (D-025) — n'invente
// jamais un jugement sémantique de remplacement. Toute violation
// bloquante (STRUCTURAL/REFERENTIAL/BUSINESS/EPISTEMIC) → échec de
// TOUTE l'analyse, jamais de réparation silencieuse, jamais de graphe
// partiel (D-054 §F). Les quatre catégories sont vérifiées dans cet
// ordre et s'arrêtent à la première catégorie en échec — chaque
// catégorie suivante présuppose la précédente satisfaite (D-052 §N).
//
// Aucune dépendance npm, aucun framework de validation — même
// discipline que src/lib/mpd/engine/validation.ts.

import { randomUUID } from 'crypto'
import type { SourceBindings } from '../context/types'
import type {
  AnalyseGrapheResolu,
  AncrageResolu,
  EvaluationD025Resolue,
  FamilleAncrage,
  HypotheseAncrageResolue,
  HypotheseResolue,
  NatureObjetPA,
  PisteResolue,
  PropositionAnalytiqueResolue,
  PropositionAncrageResolue,
  PropositionReferentResolue,
  ReferentResolu,
  ReferentSourceResolue,
  SortieD025,
  StatutEpistemique,
  StatutHypothese,
  ActionnabiliteResultat,
} from '../server/types'
import type {
  AncrageBrut,
  AnalyseSortieBrute,
  Diagnostic,
  EvaluationD025Brute,
  ExtraitSrcBrut,
  HypotheseAncrageBrut,
  HypotheseBrute,
  MecanismeAssocieBrut,
  MecanismeCatalogue,
  PisteBrute,
  PropositionAnalytiqueBrute,
  ReferentBrut,
  RoleMecanisme,
  TransformationControlee,
  ValidationResultat,
} from './types'

// ────────────────────────────────────────────────────────────
// Catalogues fermés (BUSINESS — D-048 §Q, §M ; D-025/D-052 §J)
// ────────────────────────────────────────────────────────────

const NATURES_OBJET_PA: readonly NatureObjetPA[] = [
  'ressource',
  'contrainte',
  'preference',
  'capacite',
  'comportement_passe',
  'observation_probleme',
  'contexte',
]
const STATUTS_EPISTEMIQUES: readonly StatutEpistemique[] = ['DECLARE', 'ETAYE', 'INFERE', 'CONTRADICTOIRE', 'INCONNU']
const FAMILLES_ANCRAGE: readonly FamilleAncrage[] = [
  'CAPACITE',
  'COMPORTEMENT_PASSE',
  'EXPERIENCE_EXPOSITION',
  'RESSOURCE',
  'ACCES_RELATION',
  'PROBLEME_OBSERVE',
]
const STATUTS_HYPOTHESE: readonly StatutHypothese[] = ['DIRECTION_CANDIDATE', 'REJETEE']
const ACTIONNABILITE_RESULTATS: readonly ActionnabiliteResultat[] = [
  'ACTIONNABLE_MAINTENANT',
  'CONSTRUCTIBLE_MAIS_PREMATUREE',
  'SANS_ROUTE_RAISONNABLE',
]
// Catalogue CoachRedo V1 — fermé, aucun M7 (D-048 §Q).
const MECANISMES_CATALOGUE: readonly MecanismeCatalogue[] = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6']
const ROLES_MECANISME: readonly RoleMecanisme[] = ['principal', 'secondaire', 'co_principal', 'operationnel']
const TRANSFORMATIONS_CONTROLEES: readonly TransformationControlee[] = ['CONTINUER', 'TRANSFERER', 'COMBINER', 'SIMPLIFIER']

// ────────────────────────────────────────────────────────────
// Closed-world — clés exactement autorisées par objet (arbitrage QG,
// correction finale avant commit : détecter le drift du contrat
// provider, pas seulement interdire `sortie`). Chaque liste est typée
// `keyof <InterfaceBrute>` : un nom erroné ou retiré de l'interface
// sans être retiré ici est signalé par tsc. Centralisé ici — jamais
// recalculé/dupliqué ailleurs dans ce fichier. `sortie` n'apparaît dans
// AUCUNE de ces listes : son interdiction (D-025/D-054 §H) est désormais
// un cas particulier de cette règle générale, jamais un mécanisme séparé.
// ────────────────────────────────────────────────────────────

const CLES_RACINE: readonly (keyof AnalyseSortieBrute)[] = [
  'referents',
  'propositionsAnalytiques',
  'ancrages',
  'hypotheses',
  'pistes',
  'evaluationsD025',
]
const CLES_REFERENT: readonly (keyof ReferentBrut)[] = ['idLocal', 'sources', 'extraits']
const CLES_PROPOSITION: readonly (keyof PropositionAnalytiqueBrute)[] = [
  'idLocal',
  'enonce',
  'natureObjet',
  'statutEpistemique',
  'referents',
]
const CLES_ANCRAGE: readonly (keyof AncrageBrut)[] = ['idLocal', 'famille', 'enonce', 'propositions']
const CLES_HYPOTHESE: readonly (keyof HypotheseBrute)[] = [
  'idLocal',
  'statut',
  'formulation',
  'mecanismes',
  'transformations',
  'acteursFlux',
  'modalitesProposees',
  'exigences',
  'etatExigences',
  'inconnuesCritiques',
  'ancrages',
]
const CLES_MECANISME_ASSOCIE: readonly (keyof MecanismeAssocieBrut)[] = ['mecanisme', 'role']
const CLES_HYPOTHESE_ANCRAGE: readonly (keyof HypotheseAncrageBrut)[] = ['ancrageIdLocal', 'constitutif']
const CLES_PISTE: readonly (keyof PisteBrute)[] = ['idLocal', 'incertitudeConstitutive', 'actionReduction', 'variablesTest']
const CLES_EVALUATION_D025: readonly (keyof EvaluationD025Brute)[] = [
  'hypotheseIdLocal',
  'coherenceOk',
  'compatibiliteOk',
  'actionnabiliteResultat',
  'disponibiliteOk',
  'recommandeeAujourdhui',
  'justification',
]
const CLES_EXTRAIT_SRC: readonly (keyof ExtraitSrcBrut)[] = ['src', 'extrait']
// `transformations[]`, `modalitesProposees[]`, `exigences[]`,
// `etatExigences[]`, `inconnuesCritiques[]`, `variablesTest[]` sont des
// tableaux de chaînes, pas des objets — aucune clé à fermer (fermé par
// nature).

// ────────────────────────────────────────────────────────────
// Guards génériques
// ────────────────────────────────────────────────────────────

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function estTableau(v: unknown): v is readonly unknown[] {
  return Array.isArray(v)
}

function estChaineNonVide(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function estBooleen(v: unknown): v is boolean {
  return typeof v === 'boolean'
}

function estBooleenOuNul(v: unknown): v is boolean | null | undefined {
  return v === null || v === undefined || typeof v === 'boolean'
}

function longueurEntre(v: string, min: number, max: number): boolean {
  return v.length >= min && v.length <= max
}

/** Mirroir des CHECK `octet_length(...) < limite` de 016 — bornes
 * compatibles DB (D-052 §N), jamais une revalidation sémantique. */
function tailleJsonSousLimite(v: unknown, limiteOctets: number): boolean {
  if (v === undefined || v === null) return true
  return Buffer.byteLength(JSON.stringify(v), 'utf8') < limiteOctets
}

function diag(categorie: Diagnostic['categorie'], code: string, message: string, chemin?: string): Diagnostic {
  return { categorie, code, message, chemin }
}

/**
 * STRICT CLOSED-WORLD (arbitrage QG, correction finale avant commit) :
 * toute clé présente sur `objet` hors de `clesAutorisees` est un drift
 * du contrat provider — STRUCTURAL bloquant, jamais corrigée ni
 * supprimée silencieusement. Couvre notamment `sortie` (D-025, jamais
 * dans aucune liste CLES_*), sans mécanisme séparé pour ce seul champ.
 */
function verifierClesFermees(
  objet: Record<string, unknown>,
  clesAutorisees: readonly string[],
  chemin: string,
  diagnostics: Diagnostic[]
): boolean {
  let trouve = false
  for (const cle of Object.keys(objet)) {
    if (!clesAutorisees.includes(cle)) {
      diagnostics.push(diag('STRUCTURAL', 'propriete_inattendue', `Propriété inattendue hors du contrat (drift provider) : \`${cle}\`.`, chemin))
      trouve = true
    }
  }
  return trouve
}

// ────────────────────────────────────────────────────────────
// STRUCTURAL — parsing + forme du contrat (D-054 §G)
// ────────────────────────────────────────────────────────────

function parserReferents(raw: unknown, diagnostics: Diagnostic[]): readonly ReferentBrut[] {
  if (!estTableau(raw)) {
    diagnostics.push(diag('STRUCTURAL', 'referents_absent_ou_invalide', '`referents` doit être un tableau.'))
    return []
  }
  const resultat: ReferentBrut[] = []
  raw.forEach((entree, index) => {
    const chemin = `referents[${index}]`
    if (!estObjet(entree)) {
      diagnostics.push(diag('STRUCTURAL', 'referent_invalide', 'Entrée de `referents` non objet.', chemin))
      return
    }
    if (verifierClesFermees(entree, CLES_REFERENT, chemin, diagnostics)) return
    const { idLocal, sources, extraits } = entree
    if (!estChaineNonVide(idLocal)) {
      diagnostics.push(diag('STRUCTURAL', 'referent_idlocal_invalide', '`idLocal` doit être une chaîne non vide.', chemin))
      return
    }
    if (!estTableau(sources) || sources.length < 1 || !sources.every(s => estChaineNonVide(s))) {
      diagnostics.push(
        diag('STRUCTURAL', 'referent_sources_invalide', '`sources` doit être un tableau non vide de SRC_xxx.', chemin)
      )
      return
    }
    // `extraits` absent et `[]` ont la même sémantique (aucune véritable
    // absence de clé possible en mode strict provider) — toujours
    // normalisé en tableau concret ici. L'appartenance de `extrait.src`
    // aux `sources` ci-dessus est une question d'existence de référence,
    // jamais de forme — vérifiée REFERENTIAL (validerReferentiel),
    // jamais ici (arbitrage QG, T-MFR.3D).
    const extraitsRaw = extraits === undefined ? [] : extraits
    if (!estTableau(extraitsRaw)) {
      diagnostics.push(diag('STRUCTURAL', 'referent_extraits_invalide', '`extraits` doit être un tableau de {src, extrait}.', chemin))
      return
    }
    const extraitsValides: ExtraitSrcBrut[] = []
    const srcExtraitsVus = new Set<string>()
    for (const [i, e] of extraitsRaw.entries()) {
      const cheminExtrait = `${chemin}.extraits[${i}]`
      if (!estObjet(e)) {
        diagnostics.push(diag('STRUCTURAL', 'referent_extrait_invalide', 'Entrée de `extraits` doit être un objet {src, extrait}.', cheminExtrait))
        return
      }
      if (verifierClesFermees(e, CLES_EXTRAIT_SRC, cheminExtrait, diagnostics)) return
      const { src, extrait } = e
      if (!estChaineNonVide(src)) {
        diagnostics.push(diag('STRUCTURAL', 'referent_extrait_src_invalide', '`src` doit être une chaîne non vide.', cheminExtrait))
        return
      }
      if (srcExtraitsVus.has(src)) {
        diagnostics.push(diag('STRUCTURAL', 'referent_extrait_src_duplique', `SRC_xxx dupliqué dans \`extraits\` : ${src}.`, chemin))
        return
      }
      srcExtraitsVus.add(src)
      if (!estChaineNonVide(extrait) || !longueurEntre(extrait, 1, 4999)) {
        diagnostics.push(diag('STRUCTURAL', 'referent_extrait_texte_invalide', '`extrait` doit être une chaîne non vide de moins de 5000 caractères.', cheminExtrait))
        return
      }
      extraitsValides.push({ src, extrait })
    }
    resultat.push({ idLocal, sources: sources as readonly string[], extraits: extraitsValides })
  })
  return resultat
}

function parserPropositionsAnalytiques(raw: unknown, diagnostics: Diagnostic[]): readonly PropositionAnalytiqueBrute[] {
  if (!estTableau(raw)) {
    diagnostics.push(diag('STRUCTURAL', 'propositions_absent_ou_invalide', '`propositionsAnalytiques` doit être un tableau.'))
    return []
  }
  const resultat: PropositionAnalytiqueBrute[] = []
  raw.forEach((entree, index) => {
    const chemin = `propositionsAnalytiques[${index}]`
    if (!estObjet(entree)) {
      diagnostics.push(diag('STRUCTURAL', 'proposition_invalide', 'Entrée non objet.', chemin))
      return
    }
    if (verifierClesFermees(entree, CLES_PROPOSITION, chemin, diagnostics)) return
    const { idLocal, enonce, natureObjet, statutEpistemique, referents } = entree
    if (!estChaineNonVide(idLocal)) {
      diagnostics.push(diag('STRUCTURAL', 'proposition_idlocal_invalide', '`idLocal` doit être une chaîne non vide.', chemin))
      return
    }
    if (typeof enonce !== 'string' || !longueurEntre(enonce, 1, 20000)) {
      diagnostics.push(diag('STRUCTURAL', 'proposition_enonce_invalide', '`enonce` doit être une chaîne de 1 à 20000 caractères.', chemin))
      return
    }
    if (!NATURES_OBJET_PA.includes(natureObjet as NatureObjetPA)) {
      diagnostics.push(diag('STRUCTURAL', 'proposition_nature_objet_invalide', '`natureObjet` hors énumération fermée.', chemin))
      return
    }
    if (!STATUTS_EPISTEMIQUES.includes(statutEpistemique as StatutEpistemique)) {
      diagnostics.push(diag('STRUCTURAL', 'proposition_statut_epistemique_invalide', '`statutEpistemique` hors énumération fermée.', chemin))
      return
    }
    if (!estTableau(referents) || !referents.every(r => estChaineNonVide(r))) {
      diagnostics.push(diag('STRUCTURAL', 'proposition_referents_invalide', '`referents` doit être un tableau d\'idLocal.', chemin))
      return
    }
    resultat.push({
      idLocal,
      enonce,
      natureObjet: natureObjet as NatureObjetPA,
      statutEpistemique: statutEpistemique as StatutEpistemique,
      referents: referents as readonly string[],
    })
  })
  return resultat
}

function parserAncrages(raw: unknown, diagnostics: Diagnostic[]): readonly AncrageBrut[] {
  if (!estTableau(raw)) {
    diagnostics.push(diag('STRUCTURAL', 'ancrages_absent_ou_invalide', '`ancrages` doit être un tableau.'))
    return []
  }
  const resultat: AncrageBrut[] = []
  raw.forEach((entree, index) => {
    const chemin = `ancrages[${index}]`
    if (!estObjet(entree)) {
      diagnostics.push(diag('STRUCTURAL', 'ancrage_invalide', 'Entrée non objet.', chemin))
      return
    }
    if (verifierClesFermees(entree, CLES_ANCRAGE, chemin, diagnostics)) return
    const { idLocal, famille, enonce, propositions } = entree
    if (!estChaineNonVide(idLocal)) {
      diagnostics.push(diag('STRUCTURAL', 'ancrage_idlocal_invalide', '`idLocal` doit être une chaîne non vide.', chemin))
      return
    }
    if (!FAMILLES_ANCRAGE.includes(famille as FamilleAncrage)) {
      diagnostics.push(diag('STRUCTURAL', 'ancrage_famille_invalide', '`famille` hors énumération fermée.', chemin))
      return
    }
    if (typeof enonce !== 'string' || !longueurEntre(enonce, 1, 20000)) {
      diagnostics.push(diag('STRUCTURAL', 'ancrage_enonce_invalide', '`enonce` doit être une chaîne de 1 à 20000 caractères.', chemin))
      return
    }
    if (!estTableau(propositions) || !propositions.every(p => estChaineNonVide(p))) {
      diagnostics.push(diag('STRUCTURAL', 'ancrage_propositions_invalide', '`propositions` doit être un tableau d\'idLocal.', chemin))
      return
    }
    resultat.push({
      idLocal,
      famille: famille as FamilleAncrage,
      enonce,
      propositions: propositions as readonly string[],
    })
  })
  return resultat
}

function parserHypotheses(raw: unknown, diagnostics: Diagnostic[]): readonly HypotheseBrute[] {
  if (!estTableau(raw)) {
    diagnostics.push(diag('STRUCTURAL', 'hypotheses_absent_ou_invalide', '`hypotheses` doit être un tableau.'))
    return []
  }
  const resultat: HypotheseBrute[] = []
  raw.forEach((entree, index) => {
    const chemin = `hypotheses[${index}]`
    if (!estObjet(entree)) {
      diagnostics.push(diag('STRUCTURAL', 'hypothese_invalide', 'Entrée non objet.', chemin))
      return
    }
    if (verifierClesFermees(entree, CLES_HYPOTHESE, chemin, diagnostics)) return
    const { idLocal, statut, formulation, mecanismes, transformations, acteursFlux, modalitesProposees, exigences, etatExigences, inconnuesCritiques, ancrages } =
      entree
    if (!estChaineNonVide(idLocal)) {
      diagnostics.push(diag('STRUCTURAL', 'hypothese_idlocal_invalide', '`idLocal` doit être une chaîne non vide.', chemin))
      return
    }
    if (!STATUTS_HYPOTHESE.includes(statut as StatutHypothese)) {
      diagnostics.push(diag('STRUCTURAL', 'hypothese_statut_invalide', '`statut` hors énumération fermée (DIRECTION_CANDIDATE/REJETEE).', chemin))
      return
    }
    if (typeof formulation !== 'string' || !longueurEntre(formulation, 1, 20000)) {
      diagnostics.push(diag('STRUCTURAL', 'hypothese_formulation_invalide', '`formulation` doit être une chaîne de 1 à 20000 caractères.', chemin))
      return
    }
    if (mecanismes !== undefined) {
      if (!estTableau(mecanismes) || !tailleJsonSousLimite(mecanismes, 100000)) {
        diagnostics.push(diag('STRUCTURAL', 'hypothese_mecanismes_invalide', '`mecanismes` doit être un tableau de {mecanisme, role}.', chemin))
        return
      }
      for (const [i, m] of mecanismes.entries()) {
        const cheminMecanisme = `${chemin}.mecanismes[${i}]`
        if (!estObjet(m) || typeof m.mecanisme !== 'string' || typeof m.role !== 'string') {
          diagnostics.push(diag('STRUCTURAL', 'hypothese_mecanisme_invalide', 'Entrée de `mecanismes` doit être {mecanisme, role}.', cheminMecanisme))
          return
        }
        if (verifierClesFermees(m, CLES_MECANISME_ASSOCIE, cheminMecanisme, diagnostics)) return
      }
    }
    if (transformations !== undefined) {
      if (!estTableau(transformations) || !transformations.every(t => typeof t === 'string') || !tailleJsonSousLimite(transformations, 100000)) {
        diagnostics.push(diag('STRUCTURAL', 'hypothese_transformations_invalide', '`transformations` doit être un tableau de chaînes.', chemin))
        return
      }
    }
    if (acteursFlux !== null && (typeof acteursFlux !== 'string' || !longueurEntre(acteursFlux, 1, 20000))) {
      diagnostics.push(diag('STRUCTURAL', 'hypothese_acteurs_flux_invalide', '`acteursFlux` doit être une chaîne non vide ou `null`.', chemin))
      return
    }
    for (const [champ, valeur] of [
      ['modalitesProposees', modalitesProposees],
      ['exigences', exigences],
      ['etatExigences', etatExigences],
      ['inconnuesCritiques', inconnuesCritiques],
    ] as const) {
      if (!estTableau(valeur) || !valeur.every(v => estChaineNonVide(v)) || !tailleJsonSousLimite(valeur, 100000)) {
        diagnostics.push(diag('STRUCTURAL', 'hypothese_champ_liste_invalide', `\`${champ}\` doit être un tableau de chaînes non vides.`, chemin))
        return
      }
    }
    if (!estTableau(ancrages)) {
      diagnostics.push(diag('STRUCTURAL', 'hypothese_ancrages_invalide', '`ancrages` doit être un tableau de {ancrageIdLocal, constitutif}.', chemin))
      return
    }
    const ancragesTypes: { ancrageIdLocal: string; constitutif: boolean }[] = []
    const ancrageIdLocalVus = new Set<string>()
    for (const [i, lien] of ancrages.entries()) {
      const cheminLien = `${chemin}.ancrages[${i}]`
      if (!estObjet(lien)) {
        diagnostics.push(diag('STRUCTURAL', 'hypothese_ancrage_invalide', 'Entrée de `ancrages` doit être un objet {ancrageIdLocal, constitutif}.', cheminLien))
        return
      }
      if (verifierClesFermees(lien, CLES_HYPOTHESE_ANCRAGE, cheminLien, diagnostics)) return
      const { ancrageIdLocal, constitutif } = lien
      if (!estChaineNonVide(ancrageIdLocal) || !estBooleen(constitutif)) {
        diagnostics.push(diag('STRUCTURAL', 'hypothese_ancrage_invalide', '`ancrageIdLocal`/`constitutif` invalides.', cheminLien))
        return
      }
      if (ancrageIdLocalVus.has(ancrageIdLocal)) {
        diagnostics.push(diag('STRUCTURAL', 'hypothese_ancrage_duplique', `Ancrage référencé plusieurs fois pour la même hypothèse : ${ancrageIdLocal}.`, chemin))
        return
      }
      ancrageIdLocalVus.add(ancrageIdLocal)
      ancragesTypes.push({ ancrageIdLocal, constitutif })
    }
    resultat.push({
      idLocal,
      statut: statut as StatutHypothese,
      formulation,
      mecanismes: mecanismes as HypotheseBrute['mecanismes'],
      transformations: transformations as HypotheseBrute['transformations'],
      acteursFlux: acteursFlux as HypotheseBrute['acteursFlux'],
      modalitesProposees: modalitesProposees as HypotheseBrute['modalitesProposees'],
      exigences: exigences as HypotheseBrute['exigences'],
      etatExigences: etatExigences as HypotheseBrute['etatExigences'],
      inconnuesCritiques: inconnuesCritiques as HypotheseBrute['inconnuesCritiques'],
      ancrages: ancragesTypes,
    })
  })
  return resultat
}

function parserPistes(raw: unknown, diagnostics: Diagnostic[]): readonly PisteBrute[] {
  if (!estTableau(raw)) {
    diagnostics.push(diag('STRUCTURAL', 'pistes_absent_ou_invalide', '`pistes` doit être un tableau.'))
    return []
  }
  const resultat: PisteBrute[] = []
  raw.forEach((entree, index) => {
    const chemin = `pistes[${index}]`
    if (!estObjet(entree)) {
      diagnostics.push(diag('STRUCTURAL', 'piste_invalide', 'Entrée non objet.', chemin))
      return
    }
    if (verifierClesFermees(entree, CLES_PISTE, chemin, diagnostics)) return
    const { idLocal, incertitudeConstitutive, actionReduction, variablesTest } = entree
    if (!estChaineNonVide(idLocal)) {
      diagnostics.push(diag('STRUCTURAL', 'piste_idlocal_invalide', '`idLocal` doit être une chaîne non vide.', chemin))
      return
    }
    if (typeof incertitudeConstitutive !== 'string' || !longueurEntre(incertitudeConstitutive, 1, 20000)) {
      diagnostics.push(diag('STRUCTURAL', 'piste_incertitude_invalide', '`incertitudeConstitutive` doit être une chaîne de 1 à 20000 caractères.', chemin))
      return
    }
    if (typeof actionReduction !== 'string' || !longueurEntre(actionReduction, 1, 20000)) {
      diagnostics.push(diag('STRUCTURAL', 'piste_action_invalide', '`actionReduction` doit être une chaîne de 1 à 20000 caractères.', chemin))
      return
    }
    if (!estTableau(variablesTest) || !variablesTest.every(v => estChaineNonVide(v)) || !tailleJsonSousLimite(variablesTest, 100000)) {
      diagnostics.push(diag('STRUCTURAL', 'piste_variables_test_invalide', '`variablesTest` doit être un tableau de chaînes non vides.', chemin))
      return
    }
    resultat.push({ idLocal, incertitudeConstitutive, actionReduction, variablesTest: variablesTest as PisteBrute['variablesTest'] })
  })
  return resultat
}

function parserEvaluationsD025(raw: unknown, diagnostics: Diagnostic[]): readonly EvaluationD025Brute[] {
  if (!estTableau(raw)) {
    diagnostics.push(diag('STRUCTURAL', 'evaluations_absent_ou_invalide', '`evaluationsD025` doit être un tableau.'))
    return []
  }
  const resultat: EvaluationD025Brute[] = []
  const hypotheseIdLocalVus = new Set<string>()
  raw.forEach((entree, index) => {
    const chemin = `evaluationsD025[${index}]`
    if (!estObjet(entree)) {
      diagnostics.push(diag('STRUCTURAL', 'evaluation_invalide', 'Entrée non objet.', chemin))
      return
    }
    // Emplacement le plus direct où l'IA tenterait de fournir `sortie`
    // (D-025) — interdit structurellement, désormais via la fermeture
    // générale de clés (arbitrage QG, correction finale avant commit).
    if (verifierClesFermees(entree, CLES_EVALUATION_D025, chemin, diagnostics)) return
    const { hypotheseIdLocal, coherenceOk, compatibiliteOk, actionnabiliteResultat, disponibiliteOk, recommandeeAujourdhui, justification } = entree
    if (!estChaineNonVide(hypotheseIdLocal)) {
      diagnostics.push(diag('STRUCTURAL', 'evaluation_hypothese_idlocal_invalide', '`hypotheseIdLocal` doit être une chaîne non vide.', chemin))
      return
    }
    if (hypotheseIdLocalVus.has(hypotheseIdLocal)) {
      diagnostics.push(
        diag('STRUCTURAL', 'evaluation_dupliquee_pour_hypothese', `Plusieurs évaluations D-025 pour la même hypothèse : ${hypotheseIdLocal}.`, chemin)
      )
      return
    }
    hypotheseIdLocalVus.add(hypotheseIdLocal)
    if (!estBooleen(coherenceOk)) {
      diagnostics.push(diag('STRUCTURAL', 'evaluation_coherence_invalide', '`coherenceOk` doit être un booléen.', chemin))
      return
    }
    if (!estBooleenOuNul(compatibiliteOk)) {
      diagnostics.push(diag('STRUCTURAL', 'evaluation_compatibilite_invalide', '`compatibiliteOk` doit être un booléen ou null.', chemin))
      return
    }
    if (actionnabiliteResultat !== null && actionnabiliteResultat !== undefined && typeof actionnabiliteResultat !== 'string') {
      diagnostics.push(diag('STRUCTURAL', 'evaluation_actionnabilite_invalide', '`actionnabiliteResultat` doit être une chaîne ou null.', chemin))
      return
    }
    if (!estBooleenOuNul(disponibiliteOk)) {
      diagnostics.push(diag('STRUCTURAL', 'evaluation_disponibilite_invalide', '`disponibiliteOk` doit être un booléen ou null.', chemin))
      return
    }
    if (recommandeeAujourdhui !== undefined && !estBooleen(recommandeeAujourdhui)) {
      diagnostics.push(diag('STRUCTURAL', 'evaluation_recommandee_invalide', '`recommandeeAujourdhui` doit être un booléen.', chemin))
      return
    }
    if (justification !== null && (typeof justification !== 'string' || !longueurEntre(justification, 1, 20000))) {
      diagnostics.push(diag('STRUCTURAL', 'evaluation_justification_invalide', '`justification` doit être une chaîne non vide ou `null`.', chemin))
      return
    }
    resultat.push({
      hypotheseIdLocal,
      coherenceOk,
      compatibiliteOk: compatibiliteOk as boolean | null | undefined,
      actionnabiliteResultat: actionnabiliteResultat as ActionnabiliteResultat | null | undefined,
      disponibiliteOk: disponibiliteOk as boolean | null | undefined,
      recommandeeAujourdhui,
      justification: justification as EvaluationD025Brute['justification'],
    })
  })
  return resultat
}

/** Unicité globale des idLocal — tous types confondus (D-052 §C/§N :
 * « idLocal uniques »), défense contre toute ambiguïté de référence
 * croisée entre collections. */
function verifierIdLocalUniques(
  referents: readonly ReferentBrut[],
  propositions: readonly PropositionAnalytiqueBrute[],
  ancrages: readonly AncrageBrut[],
  hypotheses: readonly HypotheseBrute[],
  pistes: readonly PisteBrute[],
  diagnostics: Diagnostic[]
): void {
  const vus = new Set<string>()
  const tous: readonly { readonly idLocal: string }[] = [...referents, ...propositions, ...ancrages, ...hypotheses, ...pistes]
  for (const item of tous) {
    if (vus.has(item.idLocal)) {
      diagnostics.push(diag('STRUCTURAL', 'idlocal_duplique', `idLocal utilisé plusieurs fois (toutes collections) : ${item.idLocal}.`))
    }
    vus.add(item.idLocal)
  }
}

function validerStructurel(raw: unknown): { readonly ok: true; readonly sortie: AnalyseSortieBrute } | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] } {
  const diagnostics: Diagnostic[] = []
  if (!estObjet(raw)) {
    return { ok: false, diagnostics: [diag('STRUCTURAL', 'sortie_racine_invalide', 'La sortie IA doit être un objet JSON.')] }
  }
  // Fermeture de clés au niveau racine, en plus de chaque sous-objet
  // (arbitrage QG, correction finale avant commit : STRICT CLOSED-WORLD).
  verifierClesFermees(raw, CLES_RACINE, '$', diagnostics)

  const referents = parserReferents(raw.referents, diagnostics)
  const propositionsAnalytiques = parserPropositionsAnalytiques(raw.propositionsAnalytiques, diagnostics)
  const ancrages = parserAncrages(raw.ancrages, diagnostics)
  const hypotheses = parserHypotheses(raw.hypotheses, diagnostics)
  const pistes = parserPistes(raw.pistes, diagnostics)
  const evaluationsD025 = parserEvaluationsD025(raw.evaluationsD025, diagnostics)
  verifierIdLocalUniques(referents, propositionsAnalytiques, ancrages, hypotheses, pistes, diagnostics)

  if (diagnostics.length > 0) return { ok: false, diagnostics }

  return {
    ok: true,
    sortie: { referents, propositionsAnalytiques, ancrages, hypotheses, pistes, evaluationsD025 },
  }
}

// ────────────────────────────────────────────────────────────
// REFERENTIAL (D-054 §G) — chaque SRC_xxx/idLocal cité doit exister ;
// aucune évaluation ne peut cibler une hypothèse REJETEE.
// ────────────────────────────────────────────────────────────

function validerReferentiel(sortie: AnalyseSortieBrute, sourceBindings: SourceBindings): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const idReferents = new Set(sortie.referents.map(r => r.idLocal))
  const idPropositions = new Set(sortie.propositionsAnalytiques.map(p => p.idLocal))
  const idAncrages = new Set(sortie.ancrages.map(a => a.idLocal))
  const hypothesesParId = new Map(sortie.hypotheses.map(h => [h.idLocal, h]))

  for (const r of sortie.referents) {
    for (const src of r.sources) {
      if (!sourceBindings.has(src)) {
        diagnostics.push(diag('REFERENTIAL', 'src_inconnu', `SRC_xxx inexistant dans le contexte : ${src}.`, r.idLocal))
      }
    }
    // extrait.src ∈ sources du MÊME référent — question d'existence de
    // référence (REFERENTIAL), jamais de forme (arbitrage QG, T-MFR.3D) :
    // même principe que « chaque SRC_xxx cité existe » (D-052 §N).
    const sourcesDisponibles = new Set(r.sources)
    for (const e of r.extraits ?? []) {
      if (!sourcesDisponibles.has(e.src)) {
        diagnostics.push(
          diag('REFERENTIAL', 'extrait_src_hors_sources', `\`extrait.src\` (${e.src}) doit appartenir aux sources du même référent.`, r.idLocal)
        )
      }
    }
  }

  for (const p of sortie.propositionsAnalytiques) {
    for (const refIdLocal of p.referents) {
      if (!idReferents.has(refIdLocal)) {
        diagnostics.push(diag('REFERENTIAL', 'referent_local_inconnu', `Référent inconnu : ${refIdLocal}.`, p.idLocal))
      }
    }
  }

  for (const a of sortie.ancrages) {
    for (const propIdLocal of a.propositions) {
      if (!idPropositions.has(propIdLocal)) {
        diagnostics.push(diag('REFERENTIAL', 'proposition_locale_inconnue', `Proposition analytique inconnue : ${propIdLocal}.`, a.idLocal))
      }
    }
  }

  for (const h of sortie.hypotheses) {
    for (const lien of h.ancrages) {
      if (!idAncrages.has(lien.ancrageIdLocal)) {
        diagnostics.push(diag('REFERENTIAL', 'ancrage_local_inconnu', `Ancrage inconnu : ${lien.ancrageIdLocal}.`, h.idLocal))
      }
    }
  }

  for (const evaluation of sortie.evaluationsD025) {
    const hypothese = hypothesesParId.get(evaluation.hypotheseIdLocal)
    if (!hypothese) {
      diagnostics.push(
        diag('REFERENTIAL', 'hypothese_locale_inconnue', `Hypothèse inconnue : ${evaluation.hypotheseIdLocal}.`, evaluation.hypotheseIdLocal)
      )
      continue
    }
    // D-054 §G, point ajouté en contre-vérification QG.
    if (hypothese.statut === 'REJETEE') {
      diagnostics.push(
        diag(
          'REFERENTIAL',
          'evaluation_cible_hypothese_rejetee',
          `Une évaluation D-025 ne peut jamais cibler une hypothèse REJETEE : ${evaluation.hypotheseIdLocal}.`,
          evaluation.hypotheseIdLocal
        )
      )
    }
  }

  return diagnostics
}

// ────────────────────────────────────────────────────────────
// BUSINESS (D-054 §G) — catalogue/transformations fermés, conditions
// mécaniques minimales de CANDIDATE, séquentialité D-025 (complète,
// bidirectionnelle — ferme le gap volontaire du CHECK DB, D-052 §J),
// contraintes de recommandation.
// ────────────────────────────────────────────────────────────

/** Séquentialité D-025 complète : chaque filtre atteint doit être
 * définitivement répondu, chaque filtre non atteint doit rester absent
 * (D-048 §B.1/§Z — quatre filtres séquentiels, aucune compensation).
 * Strictement plus stricte que le CHECK DB (016), jamais en
 * contradiction avec lui. */
function verifierSequentialiteD025(evaluation: EvaluationD025Brute, chemin: string): Diagnostic | null {
  const compatibiliteDefinie = evaluation.compatibiliteOk !== null && evaluation.compatibiliteOk !== undefined
  if (evaluation.coherenceOk !== compatibiliteDefinie) {
    return diag(
      'BUSINESS',
      'sequentialite_compatibilite_incoherente',
      'compatibiliteOk doit être renseigné si et seulement si coherenceOk est vrai.',
      chemin
    )
  }

  const actionnabiliteDefinie = evaluation.actionnabiliteResultat !== null && evaluation.actionnabiliteResultat !== undefined
  const compatibiliteOk = evaluation.compatibiliteOk === true
  if (compatibiliteOk !== actionnabiliteDefinie) {
    return diag(
      'BUSINESS',
      'sequentialite_actionnabilite_incoherente',
      'actionnabiliteResultat doit être renseigné si et seulement si compatibiliteOk est vrai.',
      chemin
    )
  }

  const disponibiliteDefinie = evaluation.disponibiliteOk !== null && evaluation.disponibiliteOk !== undefined
  const actionnableMaintenant = evaluation.actionnabiliteResultat === 'ACTIONNABLE_MAINTENANT'
  if (actionnableMaintenant !== disponibiliteDefinie) {
    return diag(
      'BUSINESS',
      'sequentialite_disponibilite_incoherente',
      'disponibiliteOk doit être renseigné si et seulement si actionnabiliteResultat = ACTIONNABLE_MAINTENANT.',
      chemin
    )
  }

  return null
}

function validerBusinessCatalogueEtConditions(sortie: AnalyseSortieBrute): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  for (const h of sortie.hypotheses) {
    for (const [i, m] of (h.mecanismes ?? []).entries()) {
      if (!MECANISMES_CATALOGUE.includes(m.mecanisme)) {
        diagnostics.push(diag('BUSINESS', 'mecanisme_hors_catalogue', `Mécanisme hors Catalogue CoachRedo V1 (M1-M6) : ${m.mecanisme}.`, `${h.idLocal}.mecanismes[${i}]`))
      }
      if (!ROLES_MECANISME.includes(m.role)) {
        diagnostics.push(diag('BUSINESS', 'role_mecanisme_invalide', `Rôle de mécanisme hors énumération fermée : ${m.role}.`, `${h.idLocal}.mecanismes[${i}]`))
      }
    }
    for (const [i, t] of (h.transformations ?? []).entries()) {
      if (!TRANSFORMATIONS_CONTROLEES.includes(t)) {
        diagnostics.push(diag('BUSINESS', 'transformation_hors_catalogue', `Transformation hors catalogue fermé : ${t}.`, `${h.idLocal}.transformations[${i}]`))
      }
    }

    // Conditions mécaniques minimales de CANDIDATE (D-048 §I/§T pt.4) —
    // un échec ici n'implique JAMAIS CANDIDATE→REJETEE/PISTE : ECHEC de
    // toute l'analyse (D-054 §E).
    if (h.statut === 'DIRECTION_CANDIDATE') {
      const auMoinsUnAncrageConstitutif = h.ancrages.some(a => a.constitutif === true)
      if (!auMoinsUnAncrageConstitutif) {
        diagnostics.push(diag('BUSINESS', 'candidate_sans_ancrage_constitutif', 'Direction Candidate sans au moins un Ancrage constitutif (D-048 §I).', h.idLocal))
      }
      if ((h.mecanismes?.length ?? 0) < 1) {
        diagnostics.push(diag('BUSINESS', 'candidate_sans_mecanisme', 'Direction Candidate sans au moins un mécanisme M1-M6 (D-048 §T pt.4).', h.idLocal))
      }
    }
  }

  for (const [i, evaluation] of sortie.evaluationsD025.entries()) {
    const chemin = `evaluationsD025[${i}]`
    const violationSequentialite = verifierSequentialiteD025(evaluation, chemin)
    if (violationSequentialite) diagnostics.push(violationSequentialite)
    if (
      evaluation.actionnabiliteResultat !== null &&
      evaluation.actionnabiliteResultat !== undefined &&
      !ACTIONNABILITE_RESULTATS.includes(evaluation.actionnabiliteResultat)
    ) {
      diagnostics.push(diag('BUSINESS', 'actionnabilite_resultat_hors_enumeration', `actionnabiliteResultat hors énumération fermée : ${evaluation.actionnabiliteResultat}.`, chemin))
    }
  }

  // D-048 §AD/§AE : zéro ou une seule recommandation, jamais plus.
  const nbRecommandees = sortie.evaluationsD025.filter(e => e.recommandeeAujourdhui === true).length
  if (nbRecommandees > 1) {
    diagnostics.push(diag('BUSINESS', 'recommandation_multiple', `Au plus une Direction recommandée aujourd'hui est autorisée (reçu : ${nbRecommandees}).`))
  }

  return diagnostics
}

/** D-048 §AD/016 : une recommandation n'existe que parmi les
 * `PRESENTER_MAINTENANT` — vérifié contre `sortie` CALCULÉE par le
 * moteur, jamais une affirmation de l'IA. */
function validerRecommandationCalculee(sortie: AnalyseSortieBrute, sortiesCalculees: readonly SortieD025[]): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  sortie.evaluationsD025.forEach((evaluation, index) => {
    if (evaluation.recommandeeAujourdhui === true && sortiesCalculees[index] !== 'PRESENTER_MAINTENANT') {
      diagnostics.push(
        diag(
          'BUSINESS',
          'recommandation_hors_presenter_maintenant',
          `Une recommandation ne peut cibler qu'une Direction dont la sortie calculée est PRESENTER_MAINTENANT (hypothèse ${evaluation.hypotheseIdLocal}).`,
          evaluation.hypotheseIdLocal
        )
      )
    }
  })
  return diagnostics
}

// ────────────────────────────────────────────────────────────
// Résolution ENGINE — D-025 (table 6 cas, D-052 §J)
// ────────────────────────────────────────────────────────────

/**
 * Calcule `sortie` (D-025) à partir des seuls jugements qualitatifs
 * fournis par l'IA — jamais lue depuis la sortie IA elle-même (§H,
 * arbitrage QG). Présuppose la séquentialité déjà vérifiée par
 * `verifierSequentialiteD025` (sinon le résultat n'est pas significatif,
 * mais la fonction ne lève jamais).
 */
export function calculerSortieD025(filtres: {
  readonly coherenceOk: boolean
  readonly compatibiliteOk?: boolean | null
  readonly actionnabiliteResultat?: ActionnabiliteResultat | null
  readonly disponibiliteOk?: boolean | null
}): SortieD025 {
  if (!filtres.coherenceOk) return 'NE_PAS_PRESENTER'
  if (filtres.compatibiliteOk !== true) return 'NE_PAS_PRESENTER'
  if (filtres.actionnabiliteResultat === 'SANS_ROUTE_RAISONNABLE') return 'NE_PAS_PRESENTER'
  if (filtres.actionnabiliteResultat === 'CONSTRUCTIBLE_MAIS_PREMATUREE') return 'DIRECTION_A_GARDER_EN_VUE'
  if (filtres.disponibiliteOk !== true) return 'DIRECTION_A_GARDER_EN_VUE'
  return 'PRESENTER_MAINTENANT'
}

// ────────────────────────────────────────────────────────────
// Canonicalisation des référents (identité canonique = ENGINE, jamais
// l'IA — section 7 du GO CODE / D-054 §D)
// ────────────────────────────────────────────────────────────

interface GroupeReferentCanonique {
  readonly resolvedId: string
  readonly sources: readonly string[]
  readonly bruts: readonly ReferentBrut[]
}

interface CanonicalisationReferents {
  readonly groupes: ReadonlyMap<string, GroupeReferentCanonique>
  readonly idLocalVersCle: ReadonlyMap<string, string>
}

/** Ensemble exact trié/unique des SRC = identité canonique (chevauchement
 * partiel ⇒ jamais fusionné, laissé à la relecture humaine, D-052 §F). */
function canonicalKeyDeSources(sources: readonly string[]): string {
  return Array.from(new Set(sources)).sort().join('|')
}

function canonicaliserReferents(referents: readonly ReferentBrut[]): CanonicalisationReferents {
  const bruitsParCle = new Map<string, ReferentBrut[]>()
  const idLocalVersCle = new Map<string, string>()
  for (const r of referents) {
    const cle = canonicalKeyDeSources(r.sources)
    idLocalVersCle.set(r.idLocal, cle)
    const liste = bruitsParCle.get(cle)
    if (liste) liste.push(r)
    else bruitsParCle.set(cle, [r])
  }
  const groupes = new Map<string, GroupeReferentCanonique>()
  for (const [cle, bruts] of bruitsParCle) {
    const sourcesUniques = Array.from(new Set(bruts.flatMap(b => b.sources))).sort()
    groupes.set(cle, { resolvedId: randomUUID(), sources: sourcesUniques, bruts })
  }
  return { groupes, idLocalVersCle }
}

/** Garanti existant par `validerReferentiel` avant tout appel — même
 * discipline que builder.ts (assertion non-null commentée, jamais une
 * revalidation parallèle). */
function idReferentResolu(idLocal: string, canon: CanonicalisationReferents): string {
  const cle = canon.idLocalVersCle.get(idLocal)!
  return canon.groupes.get(cle)!.resolvedId
}

function extraitPourSource(groupe: GroupeReferentCanonique, src: string): string | null {
  for (const brut of groupe.bruts) {
    const paire = brut.extraits?.find(e => e.src === src)
    if (paire) return paire.extrait
  }
  return null
}

/** Nombre de référents CANONIQUES distincts (post-fusion) par
 * proposition — c'est ce compte, jamais le compte brut proposé par
 * l'IA, qui sert la condition ÉTAYÉ ≥ 2 référents (D-024/D-048 §E). */
function compterReferentsDistinctsParProposition(
  sortie: AnalyseSortieBrute,
  canon: CanonicalisationReferents
): ReadonlyMap<string, number> {
  const resultat = new Map<string, number>()
  for (const p of sortie.propositionsAnalytiques) {
    const idsResolus = new Set(p.referents.map(idLocal => idReferentResolu(idLocal, canon)))
    resultat.set(p.idLocal, idsResolus.size)
  }
  return resultat
}

// ────────────────────────────────────────────────────────────
// EPISTEMIC (D-054 §E/§G) — seulement les conditions réellement
// mécanisables ; jamais de rétrogradation automatique ÉTAYÉ→INFÉRÉ.
// ────────────────────────────────────────────────────────────

function validerEpistemique(sortie: AnalyseSortieBrute, referentsDistinctsParProposition: ReadonlyMap<string, number>): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  for (const p of sortie.propositionsAnalytiques) {
    if (p.statutEpistemique !== 'ETAYE') continue
    if (p.natureObjet !== 'capacite' && p.natureObjet !== 'comportement_passe') {
      diagnostics.push(
        diag('EPISTEMIC', 'etaye_nature_non_autorisee', 'ÉTAYÉ exige nature_objet ∈ {capacite, comportement_passe} (D-024) — jamais de rétrogradation automatique.', p.idLocal)
      )
      continue
    }
    const distincts = referentsDistinctsParProposition.get(p.idLocal) ?? 0
    if (distincts < 2) {
      diagnostics.push(
        diag('EPISTEMIC', 'etaye_referents_insuffisants', 'ÉTAYÉ exige au moins 2 référents canoniques distincts (D-024) — jamais de rétrogradation automatique.', p.idLocal)
      )
    }
  }
  return diagnostics
}

// ────────────────────────────────────────────────────────────
// Résolution finale — forme exacte de AnalyseGrapheResolu (017)
// ────────────────────────────────────────────────────────────

function resoudreGraphe(
  sortie: AnalyseSortieBrute,
  sourceBindings: SourceBindings,
  canon: CanonicalisationReferents,
  sortiesCalculees: readonly SortieD025[]
): AnalyseGrapheResolu {
  const idPropositionResolu = new Map(sortie.propositionsAnalytiques.map(p => [p.idLocal, randomUUID()] as const))
  const idAncrageResolu = new Map(sortie.ancrages.map(a => [a.idLocal, randomUUID()] as const))
  const idHypotheseResolu = new Map(sortie.hypotheses.map(h => [h.idLocal, randomUUID()] as const))
  const idPisteResolu = new Map(sortie.pistes.map(p => [p.idLocal, randomUUID()] as const))

  const referents: ReferentResolu[] = Array.from(canon.groupes.values(), g => ({ id: g.resolvedId }))

  const referent_sources: ReferentSourceResolue[] = []
  for (const groupe of canon.groupes.values()) {
    for (const src of groupe.sources) {
      referent_sources.push({
        id: randomUUID(),
        referent_id: groupe.resolvedId,
        etat_logique_reponse_id: sourceBindings.get(src)!, // REFERENTIAL déjà vérifié
        extrait: extraitPourSource(groupe, src),
      })
    }
  }

  const propositions_analytiques: PropositionAnalytiqueResolue[] = sortie.propositionsAnalytiques.map(p => ({
    id: idPropositionResolu.get(p.idLocal)!,
    enonce: p.enonce,
    nature_objet: p.natureObjet,
    statut_epistemique: p.statutEpistemique,
  }))

  const proposition_referents: PropositionReferentResolue[] = []
  for (const p of sortie.propositionsAnalytiques) {
    const referentsResolus = new Set(p.referents.map(idLocal => idReferentResolu(idLocal, canon)))
    for (const referentId of referentsResolus) {
      proposition_referents.push({ id: randomUUID(), proposition_id: idPropositionResolu.get(p.idLocal)!, referent_id: referentId })
    }
  }

  const ancrages: AncrageResolu[] = sortie.ancrages.map(a => ({
    id: idAncrageResolu.get(a.idLocal)!,
    famille: a.famille,
    enonce: a.enonce,
  }))

  const proposition_ancrages: PropositionAncrageResolue[] = []
  for (const a of sortie.ancrages) {
    const propositionsResolues = new Set(a.propositions.map(idLocal => idPropositionResolu.get(idLocal)!))
    for (const propositionId of propositionsResolues) {
      proposition_ancrages.push({ id: randomUUID(), proposition_id: propositionId, ancrage_id: idAncrageResolu.get(a.idLocal)! })
    }
  }

  const hypotheses: HypotheseResolue[] = sortie.hypotheses.map(h => ({
    id: idHypotheseResolu.get(h.idLocal)!,
    statut: h.statut,
    formulation: h.formulation,
    mecanismes: h.mecanismes,
    transformations: h.transformations,
    acteurs_flux: h.acteursFlux,
    modalites_proposees: h.modalitesProposees,
    exigences: h.exigences,
    etat_exigences: h.etatExigences,
    inconnues_critiques: h.inconnuesCritiques,
  }))

  const hypothese_ancrages: HypotheseAncrageResolue[] = []
  for (const h of sortie.hypotheses) {
    for (const lien of h.ancrages) {
      hypothese_ancrages.push({
        id: randomUUID(),
        hypothese_id: idHypotheseResolu.get(h.idLocal)!,
        ancrage_id: idAncrageResolu.get(lien.ancrageIdLocal)!,
        constitutif: lien.constitutif,
      })
    }
  }

  const pistes: PisteResolue[] = sortie.pistes.map(p => ({
    id: idPisteResolu.get(p.idLocal)!,
    incertitude_constitutive: p.incertitudeConstitutive,
    action_reduction: p.actionReduction,
    variables_test: p.variablesTest,
  }))

  const evaluations_d025: EvaluationD025Resolue[] = sortie.evaluationsD025.map((evaluation, index) => ({
    id: randomUUID(),
    hypothese_id: idHypotheseResolu.get(evaluation.hypotheseIdLocal)!,
    coherence_ok: evaluation.coherenceOk,
    compatibilite_ok: evaluation.compatibiliteOk ?? null,
    actionnabilite_resultat: evaluation.actionnabiliteResultat ?? null,
    disponibilite_ok: evaluation.disponibiliteOk ?? null,
    sortie: sortiesCalculees[index],
    recommandee_aujourdhui: evaluation.recommandeeAujourdhui === true,
    justification: evaluation.justification,
  }))

  return {
    propositions_analytiques,
    referents,
    referent_sources,
    proposition_referents,
    ancrages,
    proposition_ancrages,
    hypotheses,
    pistes,
    hypothese_ancrages,
    evaluations_d025,
  }
}

// ────────────────────────────────────────────────────────────
// Orchestrateur — all-or-nothing, 4 catégories séquentielles
// ────────────────────────────────────────────────────────────

/**
 * Point d'entrée unique du validateur T-MFR.3C. `raw` est la réponse
 * provider telle que reçue (`unknown`, jamais présupposée conforme).
 * Ne mute jamais `raw`, jamais d'I/O, jamais d'appel RPC — l'appelant
 * reste responsable de FINISH SUCCESS/FAILURE (017/018) à partir du
 * résultat retourné ici.
 */
export function validerEtResoudreSortieBrute(raw: unknown, sourceBindings: SourceBindings): ValidationResultat {
  const structurel = validerStructurel(raw)
  if (!structurel.ok) return { ok: false, diagnostics: structurel.diagnostics }

  const diagnosticsReferentiels = validerReferentiel(structurel.sortie, sourceBindings)
  if (diagnosticsReferentiels.length > 0) return { ok: false, diagnostics: diagnosticsReferentiels }

  const diagnosticsBusiness = validerBusinessCatalogueEtConditions(structurel.sortie)
  if (diagnosticsBusiness.length > 0) return { ok: false, diagnostics: diagnosticsBusiness }

  const sortiesCalculees = structurel.sortie.evaluationsD025.map(evaluation => calculerSortieD025(evaluation))

  const diagnosticsRecommandation = validerRecommandationCalculee(structurel.sortie, sortiesCalculees)
  if (diagnosticsRecommandation.length > 0) return { ok: false, diagnostics: diagnosticsRecommandation }

  const canon = canonicaliserReferents(structurel.sortie.referents)
  const referentsDistinctsParProposition = compterReferentsDistinctsParProposition(structurel.sortie, canon)

  const diagnosticsEpistemiques = validerEpistemique(structurel.sortie, referentsDistinctsParProposition)
  if (diagnosticsEpistemiques.length > 0) return { ok: false, diagnostics: diagnosticsEpistemiques }

  const graphe = resoudreGraphe(structurel.sortie, sourceBindings, canon, sortiesCalculees)
  return { ok: true, graphe }
}
