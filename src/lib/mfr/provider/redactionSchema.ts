// ============================================================
// MFR V1 — JSON Schema strict de rédaction (Structured Outputs) — T-MFR.5A
// ============================================================
// Artefact PROVIDER dérivé du contrat `RedactionSortieBrute`
// (redaction/types.ts) — ne remplace jamais le validateur dédié
// (redaction/validator.ts), même séparation que schema.ts/validator.ts
// pour l'analyse (deux garde-fous indépendants, jamais une seule source
// de vérité).
//
// CORRECTIF POST-E2E#1 (`400 Invalid schema`, redaction `8e94d5f0-...`,
// ECHEC conservée intacte en base) : `type:['object','null']` — utilisé
// initialement pour `aucuneDirectionMessage` — n'est PAS une forme
// supportée par Structured Outputs en mode strict pour un type
// `object` (confirmé par la documentation OpenAI : seul `anyOf` est
// supporté pour exprimer un type non-primitif nullable, et chaque
// variante `object` à l'intérieur d'un `anyOf` doit elle-même porter
// `additionalProperties:false` + `required` complet — jamais vérifié
// empiriquement avant l'E2E#1, c'est exactement ce qui a échoué). Seul
// correctif directement lié au 400 réel :
//   - `aucuneDirectionMessage` (OBJET nullable, la nullité est
//     réellement nécessaire ici — rien d'autre ne peut représenter
//     « aucun message ») → `anyOf: [{$ref:...}, {type:'null'}]`.
//
// Relecture QG (post-audit) : la documentation OpenAI officielle liste
// explicitement `minItems`/`maxItems` comme propriétés array
// supportées hors modèles fine-tunés, et `enum` comme construction
// générique non restreinte aux chaînes — confirmé par recherche externe
// (le statut « non supporté » de `minItems`/`maxItems` provenait de
// rapports communautaires antérieurs à leur correction, confirmée
// résolue par un modérateur OpenAI entre nov. 2025 et fév. 2026, donc
// avant ce chantier). En conséquence, `position` reste un entier natif
// (`enum:[1,2,3]`) et `maxItems:3` est conservé sur `directions` — la
// prudence initiale (conversion en chaîne, suppression de `maxItems`)
// n'était pas justifiée et a été annulée.
//   - `sources` des affirmations optionnelles (TABLEAU qui aurait été
//     nullable) → converti en tableau toujours présent, un tableau VIDE
//     représentant désormais « aucune source invoquée ». Ce choix est
//     conservé, mais pour une raison différente de celle initialement
//     avancée : non pas parce qu'un tableau nullable serait interdit
//     (aucune preuve de cela), mais par SIMPLIFICATION DÉLIBÉRÉE du
//     contrat — un `anyOf` array/null supplémentaire serait une union
//     inutile là où « tableau vide » porte déjà exactement le même sens
//     métier. Changement de contrat minimal mais réel — voir
//     `MFR_REDACTION_SORTIE_BRUTE_SCHEMA_VERSION` (bump 1→2).
//
// Mêmes règles de mode strict déjà vérifiées pour l'analyse (T-MFR.3D) :
// `additionalProperties:false`, toute propriété listée apparaît dans
// `required`, et desormais confirmé : `anyOf` supporté pour un type
// non-primitif nullable, jamais au niveau racine du schema (root object
// obligatoire, non `anyOf` — non concerné ici, notre racine reste un
// simple objet).
//
// Volontairement ABSENT de ce schema : tout champ `estRecommandee` —
// le modèle ne reçoit jamais la possibilité structurelle de désigner
// une direction comme recommandée (arbitrage QG, GO T-MFR.5A) ; ce
// champ n'existe que dans la sortie RÉSOLUE (redaction/types.ts,
// `DirectionRedigeeResolue`), calculée exclusivement par le moteur.

export const NOM_SCHEMA_REDACTION_SORTIE_BRUTE = 'redaction_sortie_brute_mfr_v1'

const DEF_AFFIRMATION_OBLIGATOIRE = {
  type: 'object',
  additionalProperties: false,
  required: ['texte', 'sources'],
  properties: {
    texte: { type: 'string' },
    sources: { type: 'array', items: { type: 'string' }, minItems: 1 },
  },
} as const

/** `sources` toujours un tableau (jamais `null`) — `[]` = aucune source
 * invoquée. Objet lui-même toujours présent (jamais nullable) : c'est
 * `aucuneDirectionMessage`, à la racine, qui porte la nullité réelle,
 * via `anyOf` (voir en-tête de fichier). */
const DEF_AFFIRMATION_OPTIONNELLE = {
  type: 'object',
  additionalProperties: false,
  required: ['texte', 'sources'],
  properties: {
    texte: { type: 'string' },
    sources: { type: 'array', items: { type: 'string' } },
  },
} as const

const DEF_DIRECTION_REDIGEE = {
  type: 'object',
  additionalProperties: false,
  required: ['position', 'titre', 'pourquoi', 'forces', 'limites', 'planAction'],
  properties: {
    // Entier natif, enum numérique — `enum` est une construction
    // générique de Structured Outputs, non restreinte aux chaînes
    // (documentation OpenAI). Contrat naturel : `position` est déjà
    // numérique côté ENGINE/contexte (`MfrWritingDirection.position`,
    // `1|2|3`), aucune conversion de représentation nécessaire.
    position: { type: 'integer', enum: [1, 2, 3] },
    titre: { type: 'string' },
    pourquoi: { $ref: '#/$defs/AffirmationObligatoire' },
    forces: { $ref: '#/$defs/AffirmationObligatoire' },
    limites: { $ref: '#/$defs/AffirmationOptionnelle' },
    planAction: { $ref: '#/$defs/AffirmationOptionnelle' },
  },
} as const

export function construireJsonSchemaRedactionSortieBrute() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['directions', 'aucuneDirectionMessage'],
    properties: {
      // `maxItems` confirmé supporté par la documentation OpenAI
      // (propriété array, hors modèles fine-tunés — non applicable ici,
      // gpt-6.1-sol). Restauré pour cohérence avec le contrat 0–3
      // directions, même si le validateur (REFERENTIAL) vérifie déjà
      // indépendamment l'ensemble EXACT des positions attendues.
      directions: { type: 'array', items: { $ref: '#/$defs/DirectionRedigee' }, maxItems: 3 },
      // Nullable au niveau objet entier — forme confirmée par la
      // documentation OpenAI : `anyOf` avec une branche `$ref` (portant
      // elle-même additionalProperties:false + required complet) et une
      // branche `{type:'null'}`. Jamais `type:['object','null']`
      // (rejeté, E2E#1).
      aucuneDirectionMessage: {
        anyOf: [{ $ref: '#/$defs/AffirmationOptionnelle' }, { type: 'null' }],
      },
    },
    $defs: {
      AffirmationObligatoire: DEF_AFFIRMATION_OBLIGATOIRE,
      AffirmationOptionnelle: DEF_AFFIRMATION_OPTIONNELLE,
      DirectionRedigee: DEF_DIRECTION_REDIGEE,
    },
  } as const
}
