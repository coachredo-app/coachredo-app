// ============================================================
// MFR V1 — JSON Schema strict (Structured Outputs) — T-MFR.3D
// ============================================================
// Artefact PROVIDER dérivé du contrat `AnalyseSortieBrute`
// (analysis/types.ts) — ne remplace jamais `validerEtResoudreSortieBrute`
// (analysis/validator.ts), qui reste l'autorité STRUCTURAL/REFERENTIAL/
// BUSINESS/EPISTEMIC souveraine (conception T-MFR.3D, arbitrage QG).
//
// Mirroir volontairement INDÉPENDANT des listes de clés fermées de
// validator.ts (CLES_RACINE/CLES_REFERENT/etc.) — deux garde-fous
// distincts (garantie structurelle du provider + ENGINE déterministe),
// jamais une seule source de vérité partagée entre les deux couches.
// Toute évolution du contrat doit mettre à jour CE fichier ET
// validator.ts séparément — coût de maintenance assumé, pas un bug.
//
// Règles du mode strict (vérifiées contre la doc officielle + le SDK
// `openai` installé, T-MFR.3D) : `additionalProperties:false` sur
// chaque objet ; toute propriété listée doit apparaître dans `required`
// (l'optionalité s'exprime par nullabilité `type:[T,"null"]`, jamais par
// omission de clé) ; dictionnaires dynamiques (`patternProperties`) non
// supportés — c'est pourquoi `extraits` est un tableau de paires
// {src, extrait}, jamais un objet à clés arbitraires (D-054/analysis/
// types.ts, ExtraitSrcBrut). Aucune normalisation de casse : les enums
// sont des chaînes exactes, le validator reste strict indépendamment.

/** Nom du schéma transmis à `text.format.name` (Responses API) — doit
 * matcher `^[a-zA-Z0-9_-]+$`, 64 caractères max. */
export const NOM_SCHEMA_ANALYSE_SORTIE_BRUTE = 'analyse_sortie_brute_mfr_v1'

const DEF_EXTRAIT_SRC = {
  type: 'object',
  additionalProperties: false,
  required: ['src', 'extrait'],
  properties: {
    src: { type: 'string' },
    extrait: { type: 'string' },
  },
} as const

const DEF_REFERENT = {
  type: 'object',
  additionalProperties: false,
  required: ['idLocal', 'sources', 'extraits'],
  properties: {
    idLocal: { type: 'string' },
    sources: { type: 'array', items: { type: 'string' }, minItems: 1 },
    extraits: { type: 'array', items: { $ref: '#/$defs/ExtraitSrc' } },
  },
} as const

const DEF_PROPOSITION_ANALYTIQUE = {
  type: 'object',
  additionalProperties: false,
  required: ['idLocal', 'enonce', 'natureObjet', 'statutEpistemique', 'referents'],
  properties: {
    idLocal: { type: 'string' },
    enonce: { type: 'string' },
    // Même catalogue que NATURES_OBJET_PA (validator.ts) et NatureObjet
    // (canon MPD) — mirroir indépendant, voir en-tête de fichier.
    natureObjet: { enum: ['ressource', 'contrainte', 'preference', 'capacite', 'comportement_passe', 'observation_probleme', 'contexte'] },
    statutEpistemique: { enum: ['DECLARE', 'ETAYE', 'INFERE', 'CONTRADICTOIRE', 'INCONNU'] },
    referents: { type: 'array', items: { type: 'string' } },
  },
} as const

const DEF_ANCRAGE = {
  type: 'object',
  additionalProperties: false,
  required: ['idLocal', 'famille', 'enonce', 'propositions'],
  properties: {
    idLocal: { type: 'string' },
    famille: { enum: ['CAPACITE', 'COMPORTEMENT_PASSE', 'EXPERIENCE_EXPOSITION', 'RESSOURCE', 'ACCES_RELATION', 'PROBLEME_OBSERVE'] },
    enonce: { type: 'string' },
    propositions: { type: 'array', items: { type: 'string' } },
  },
} as const

const DEF_MECANISME_ASSOCIE = {
  type: 'object',
  additionalProperties: false,
  required: ['mecanisme', 'role'],
  properties: {
    // Catalogue CoachRedo V1, fermé, aucun M7 (D-048 §Q).
    mecanisme: { enum: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'] },
    role: { enum: ['principal', 'secondaire', 'co_principal', 'operationnel'] },
  },
} as const

const DEF_HYPOTHESE_ANCRAGE = {
  type: 'object',
  additionalProperties: false,
  required: ['ancrageIdLocal', 'constitutif'],
  properties: {
    ancrageIdLocal: { type: 'string' },
    constitutif: { type: 'boolean' },
  },
} as const

const DEF_HYPOTHESE = {
  type: 'object',
  additionalProperties: false,
  required: [
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
  ],
  properties: {
    idLocal: { type: 'string' },
    statut: { enum: ['DIRECTION_CANDIDATE', 'REJETEE'] },
    formulation: { type: 'string' },
    mecanismes: { type: 'array', items: { $ref: '#/$defs/MecanismeAssocie' } },
    transformations: { type: 'array', items: { enum: ['CONTINUER', 'TRANSFERER', 'COMBINER', 'SIMPLIFIER'] } },
    acteursFlux: { type: ['string', 'null'] },
    modalitesProposees: { type: 'array', items: { type: 'string' } },
    // exigences/etatExigences : deux listes distinctes, jamais fusionnées
    // (arbitrage QG, T-MFR.3D — contrat cible minimal).
    exigences: { type: 'array', items: { type: 'string' } },
    etatExigences: { type: 'array', items: { type: 'string' } },
    inconnuesCritiques: { type: 'array', items: { type: 'string' } },
    ancrages: { type: 'array', items: { $ref: '#/$defs/HypotheseAncrage' } },
  },
} as const

const DEF_PISTE = {
  type: 'object',
  additionalProperties: false,
  required: ['idLocal', 'incertitudeConstitutive', 'actionReduction', 'variablesTest'],
  properties: {
    idLocal: { type: 'string' },
    incertitudeConstitutive: { type: 'string' },
    actionReduction: { type: 'string' },
    variablesTest: { type: 'array', items: { type: 'string' } },
  },
} as const

const DEF_EVALUATION_D025 = {
  type: 'object',
  additionalProperties: false,
  required: ['hypotheseIdLocal', 'coherenceOk', 'compatibiliteOk', 'actionnabiliteResultat', 'disponibiliteOk', 'recommandeeAujourdhui', 'justification'],
  properties: {
    hypotheseIdLocal: { type: 'string' },
    coherenceOk: { type: 'boolean' },
    compatibiliteOk: { type: ['boolean', 'null'] },
    // `sortie` D-025 n'apparaît structurellement JAMAIS ici — calculée
    // exclusivement par l'ENGINE (D-025/D-054 §H, non rouvert).
    actionnabiliteResultat: { enum: ['ACTIONNABLE_MAINTENANT', 'CONSTRUCTIBLE_MAIS_PREMATUREE', 'SANS_ROUTE_RAISONNABLE', null] },
    disponibiliteOk: { type: ['boolean', 'null'] },
    recommandeeAujourdhui: { type: 'boolean' },
    justification: { type: ['string', 'null'] },
  },
} as const

/**
 * Construit le JSON Schema strict complet correspondant à
 * `AnalyseSortieBrute`, pour `text.format.schema` (Responses API,
 * `strict: true`). Fonction pure, aucune dépendance réseau.
 */
export function construireJsonSchemaAnalyseSortieBrute(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['referents', 'propositionsAnalytiques', 'ancrages', 'hypotheses', 'pistes', 'evaluationsD025'],
    properties: {
      referents: { type: 'array', items: { $ref: '#/$defs/Referent' } },
      propositionsAnalytiques: { type: 'array', items: { $ref: '#/$defs/PropositionAnalytique' } },
      ancrages: { type: 'array', items: { $ref: '#/$defs/Ancrage' } },
      hypotheses: { type: 'array', items: { $ref: '#/$defs/Hypothese' } },
      pistes: { type: 'array', items: { $ref: '#/$defs/Piste' } },
      evaluationsD025: { type: 'array', items: { $ref: '#/$defs/EvaluationD025' } },
    },
    $defs: {
      ExtraitSrc: DEF_EXTRAIT_SRC,
      Referent: DEF_REFERENT,
      PropositionAnalytique: DEF_PROPOSITION_ANALYTIQUE,
      Ancrage: DEF_ANCRAGE,
      MecanismeAssocie: DEF_MECANISME_ASSOCIE,
      HypotheseAncrage: DEF_HYPOTHESE_ANCRAGE,
      Hypothese: DEF_HYPOTHESE,
      Piste: DEF_PISTE,
      EvaluationD025: DEF_EVALUATION_D025,
    },
  }
}
