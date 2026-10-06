// ============================================================
// MPD V3 — Wrapper attestation canonique (ECRITURE_REPONSE) — T7.4B
// ============================================================
// Server-only. Responsabilité exclusive : préparer/retrouver/déposer
// l'attestation ECRITURE_REPONSE nécessaire à un appel de
// mpd_ecrire_reponse (D-031). `service_role` n'est utilisé ICI que pour
// mpd_attestations_canoniques — jamais pour mpd_dossiers,
// mpd_reponses_courantes, ni aucune autre donnée utilisateur.
//
// Ne modifie pas createServiceClient() (src/lib/supabase/server.ts) —
// réutilise la capacité backend existante, limitée par construction à
// cette unique table via les appels ci-dessous.
//
// Retry (arbitrage QG T7.4B §2) : une attestation non consommée dont le
// contenu est EXACTEMENT identique à la tentative en cours est réutilisée
// telle quelle — jamais UPDATE, jamais DELETE, jamais remplacée. Si son
// contenu diffère, erreur contrôlée demandant un rechargement. Aucune
// logique d'invalidation/suppression d'attestation dans ce chantier.

import { createServiceClient } from '@/lib/supabase/server'
import type { ChampFixe, ItemsAvecSousReponse, Option, PrecisionOption, QuestionCanonique } from '../canon'
import type { StatutReponse } from '../types-runtime'
import type { ReponsesParId } from '../engine/applicabilite'

export interface AttestationEcritureParams {
  readonly userId: string
  readonly dossierId: string
  readonly revision: number
  readonly questionId: string
  readonly statutAttendu: StatutReponse
  readonly payloadAttendu: unknown
  readonly versionDefinition: string
  readonly questionsADesactiver: readonly string[]
}

export type AttestationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: 'attestation_deja_consommee' | 'attestation_conflit' | 'attestation_erreur' }

interface LigneAttestation {
  readonly statut_attendu: string | null
  readonly payload_attendu: unknown
  readonly version_definition: string
  readonly questions_a_desactiver: readonly string[] | null
  readonly consommee_le: string | null
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  const ao = a as Record<string, unknown>
  const bo = b as Record<string, unknown>
  const aKeys = Object.keys(ao).sort()
  const bKeys = Object.keys(bo).sort()
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((k, i) => k === bKeys[i] && deepEqual(ao[k], bo[k]))
}

function memeEnsemble(a: readonly string[], b: readonly string[] | null): boolean {
  const arrB = b ?? []
  if (a.length !== arrB.length) return false
  const sa = [...a].sort()
  const sb = [...arrB].sort()
  return sa.every((v, i) => v === sb[i])
}

function correspond(ligne: LigneAttestation, params: AttestationEcritureParams): boolean {
  return (
    ligne.statut_attendu === params.statutAttendu &&
    deepEqual(ligne.payload_attendu, params.payloadAttendu) &&
    ligne.version_definition === params.versionDefinition &&
    memeEnsemble(params.questionsADesactiver, ligne.questions_a_desactiver)
  )
}

async function relireAttestation(
  service: ReturnType<typeof createServiceClient>,
  params: AttestationEcritureParams
): Promise<LigneAttestation | null> {
  const { data } = await service
    .from('mpd_attestations_canoniques')
    .select('statut_attendu, payload_attendu, version_definition, questions_a_desactiver, consommee_le')
    .eq('user_id', params.userId)
    .eq('dossier_id', params.dossierId)
    .eq('revision', params.revision)
    .eq('operation_type', 'ECRITURE_REPONSE')
    .eq('question_id', params.questionId)
    .maybeSingle()

  return (data as LigneAttestation | null) ?? null
}

export async function prepareAttestationEcriture(
  params: AttestationEcritureParams
): Promise<AttestationResult> {
  const service = createServiceClient()
  const desactiver = params.questionsADesactiver.length > 0 ? [...params.questionsADesactiver] : null

  const existante = await relireAttestation(service, params)

  if (existante) {
    if (existante.consommee_le) return { ok: false, error: 'attestation_deja_consommee' }
    return correspond(existante, params) ? { ok: true } : { ok: false, error: 'attestation_conflit' }
  }

  const { error: erreurInsert } = await service.from('mpd_attestations_canoniques').insert({
    user_id: params.userId,
    dossier_id: params.dossierId,
    revision: params.revision,
    operation_type: 'ECRITURE_REPONSE',
    question_id: params.questionId,
    statut_attendu: params.statutAttendu,
    payload_attendu: params.payloadAttendu,
    version_definition: params.versionDefinition,
    questions_a_desactiver: desactiver,
  })

  if (!erreurInsert) return { ok: true }

  // Course concurrente — une autre requête vient de déposer la même
  // attestation (clé naturelle unique) : relire et comparer, jamais
  // réinsérer en force.
  if (erreurInsert.code === '23505') {
    const course = await relireAttestation(service, params)
    if (!course) return { ok: false, error: 'attestation_erreur' }
    if (course.consommee_le) return { ok: false, error: 'attestation_deja_consommee' }
    return correspond(course, params) ? { ok: true } : { ok: false, error: 'attestation_conflit' }
  }

  return { ok: false, error: 'attestation_erreur' }
}

// ============================================================
// Libellés historiques de choix structurés — T7.11C
// ============================================================
// GO QG T7.11C : les libellés historiques d'une question marquée
// `conserveLibellesChoixHistoriques` font partie de l'intégrité
// attendue du snapshot (mpd_etat_logique_reponses), pas une donnée
// facultative — une extraction impossible pour une telle question est
// une anomalie réelle (canon/validation désynchronisés, ne devrait
// jamais se produire si validateMpdAnswer a accepté la réponse) et
// doit faire échouer PROPREMENT la préparation de l'attestation,
// jamais produire un snapshot historique dégradé en silence. Les
// questions qui n'ont rien à historiciser (conserveLibellesChoixHistoriques
// faux, texte libre, statut non DECLARE) ne déclenchent jamais d'échec.
//
// Marche structurelle générique sur le canon (mêmes structures que
// ReponseLectureSeule.tsx, T7.8F) — aucun mapping par stableId/Q1…Q36 :
// seule la FORME (formeReponse/options/itemsAvecSousReponse) pilote la
// résolution, jamais l'identité de la question.

function libelleOption(options: readonly Option[] | undefined, valeur: string): string | null {
  return options?.find(o => o.value === valeur)?.label ?? null
}

function fusionnerLibelles(
  ...parties: readonly (Record<string, string> | null)[]
): Record<string, string> | null {
  const resultat: Record<string, string> = {}
  for (const partie of parties) {
    if (partie === null) return null
    Object.assign(resultat, partie)
  }
  return resultat
}

function libellesPrecision(precision: PrecisionOption, valeur: unknown): Record<string, string> | null {
  if (precision.type === 'texte' || precision.type === 'nombre_devise') return {}
  const obj = typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur) ? (valeur as Record<string, unknown>) : {}
  return fusionnerLibelles(...precision.champs.map(champ => libellesChampFixe(champ, obj[champ.id])))
}

function libellesSelection(options: readonly Option[] | undefined, valeur: unknown): Record<string, string> | null {
  if (valeur === undefined || valeur === null) return {}
  const selection =
    typeof valeur === 'object' && !Array.isArray(valeur) ? (valeur as { value?: string; precision?: unknown }) : undefined
  if (!selection?.value) return {}
  const label = libelleOption(options, selection.value)
  if (label === null) return null
  const option = options?.find(o => o.value === selection.value)
  const labelsPrecision = option?.precision ? libellesPrecision(option.precision, selection.precision) : {}
  if (labelsPrecision === null) return null
  return { [selection.value]: label, ...labelsPrecision }
}

function libellesMultiSelection(options: readonly Option[] | undefined, valeur: unknown): Record<string, string> | null {
  if (!Array.isArray(valeur)) return {}
  return fusionnerLibelles(...valeur.map(item => libellesSelection(options, item)))
}

/**
 * 'texte' peut porter un marqueur structuré alternatif — exactement la
 * même convention déjà appliquée par TexteField (champs/core.tsx,
 * `const alt = options?.[0]`) et par ReponseLectureSeule.tsx (T7.8F) :
 * seule la PREMIÈRE option, si présente, est un marqueur réel (ex.
 * « Aucune », « Aucun ne me vient à l'esprit ») — le payload l'égale
 * littéralement (chaîne brute, jamais un objet {value}) quand elle est
 * sélectionnée. Tout autre payload (chaîne libre ou tableau de chaînes
 * libres, selon cardinalite) est du texte réel — rien à historiciser.
 */
function libellesTexte(options: readonly Option[] | undefined, valeur: unknown): Record<string, string> | null {
  const alt = options?.[0]
  if (alt && valeur === alt.value) return { [alt.value]: alt.label }
  return {}
}

function libellesChampFixe(champ: ChampFixe, valeur: unknown): Record<string, string> | null {
  if (valeur === undefined || valeur === null || valeur === '') return {}
  switch (champ.formeReponse) {
    case 'texte':
      return libellesTexte(champ.options, valeur)
    case 'choix_unique':
    case 'choix_avec_precision':
      return libellesSelection(champ.options, valeur)
    case 'multi_selection':
      return libellesMultiSelection(champ.options, valeur)
    default:
      return {}
  }
}

function libellesItemsAvecSousReponse(
  structure: ItemsAvecSousReponse,
  options: readonly Option[] | undefined,
  valeur: unknown
): Record<string, string> | null {
  if (structure.motif === 'champs_fixes') {
    const obj = typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur) ? (valeur as Record<string, unknown>) : {}
    return fusionnerLibelles(...structure.champs.map(champ => libellesChampFixe(champ, obj[champ.id])))
  }

  if (structure.motif === 'liste_declaree') {
    const alt = options?.[0]
    if (alt && valeur === alt.value) return { [alt.value]: alt.label }
    const entrees = Array.isArray(valeur) ? (valeur as Array<{ sousReponse?: unknown }>) : []
    return fusionnerLibelles(...entrees.map(e => libellesChampFixe(structure.sousReponse, e?.sousReponse)))
  }

  // branches_par_option
  const obj =
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
      ? (valeur as { value?: string; champs?: Record<string, unknown> })
      : undefined
  if (!obj?.value) return {}
  const label = libelleOption(options, obj.value)
  if (label === null) return null
  const branche = structure.branches[obj.value]
  if (!branche) return { [obj.value]: label }
  const labelsBranche = fusionnerLibelles(...branche.map(champ => libellesChampFixe(champ, obj.champs?.[champ.id])))
  if (labelsBranche === null) return null
  return { [obj.value]: label, ...labelsBranche }
}

function libellesPourQuestion(question: QuestionCanonique, payload: unknown): Record<string, string> | null {
  switch (question.formeReponse) {
    case 'texte':
      return libellesTexte(question.options, payload)
    case 'choix_unique':
    case 'choix_avec_precision':
      return libellesSelection(question.options, payload)
    case 'multi_selection':
      return libellesMultiSelection(question.options, payload)
    case 'items_avec_sous_reponse':
      return question.itemsAvecSousReponse
        ? libellesItemsAvecSousReponse(question.itemsAvecSousReponse, question.options, payload)
        : {}
    case 'texte_avec_provenance': {
      const alt = question.options?.[0]
      if (alt && payload === alt.value) return { [alt.value]: alt.label }
      const obj =
        typeof payload === 'object' && payload !== null && !Array.isArray(payload)
          ? (payload as { provenance?: string })
          : undefined
      if (!obj?.provenance) return {}
      if (!question.texteAvecProvenance) return {}
      const label = libelleOption(question.texteAvecProvenance.provenanceOptions, obj.provenance)
      return label === null ? null : { [obj.provenance]: label }
    }
  }
}

export type ResultatLibellesHistoriques =
  | { readonly ok: true; readonly libelles: Record<string, Record<string, string>> }
  | { readonly ok: false; readonly questionId: string }

/**
 * Agrège, pour l'ensemble exact des questions applicables attesté, les
 * libellés historiques des questions qui en ont réellement besoin
 * (`conserveLibellesChoixHistoriques` + statut DECLARE). Déterministe :
 * échoue explicitement (jamais une omission silencieuse) dès qu'une
 * telle question ne produit aucun libellé résoluble — GO QG T7.11C.
 */
export function extraireLibellesChoixHistoriques(
  canon: ReadonlyMap<string, QuestionCanonique>,
  reponses: ReponsesParId,
  questionsApplicables: readonly string[]
): ResultatLibellesHistoriques {
  const resultat: Record<string, Record<string, string>> = {}

  for (const questionId of questionsApplicables) {
    const question = canon.get(questionId)
    if (!question || !question.conserveLibellesChoixHistoriques) continue

    const reponse = reponses.get(questionId)
    if (!reponse || reponse.statut !== 'DECLARE') continue

    // GO QG T7.11 (correction) : seul `null` signale une valeur
    // structurée attendue mais impossible à résoudre (cas C) — un
    // résultat vide `{}` est un succès légitime (cas A, texte libre
    // réellement saisi, ou sous-champ conditionnel non applicable à ce
    // payload) ; il ne doit jamais être requalifié en échec. `null` se
    // propage déjà sans jamais être avalé silencieusement (fusionnerLibelles).
    const libelles = libellesPourQuestion(question, reponse.payload)
    if (libelles === null) {
      return { ok: false, questionId }
    }
    if (Object.keys(libelles).length > 0) resultat[questionId] = libelles
  }

  return { ok: true, libelles: resultat }
}

// ============================================================
// Wrapper attestation canonique (CONSOMMATION) — T7.11C
// ============================================================
// Même discipline que prepareAttestationEcriture ci-dessus (retry par
// relecture/comparaison, jamais UPDATE/DELETE) — ne modifie ni
// n'affaiblit cette fonction, réutilise uniquement ses helpers
// génériques déjà existants (deepEqual, memeEnsemble).

export interface AttestationConsommationParams {
  readonly userId: string
  readonly dossierId: string
  readonly revision: number
  readonly versionCanonique: string
  readonly questionsApplicables: readonly string[]
  readonly libellesHistoriques: Record<string, Record<string, string>>
}

interface LigneAttestationConsommation {
  readonly version_canonique: string | null
  readonly questions_applicables: readonly string[] | null
  readonly libelles_historiques: unknown
  readonly consommee_le: string | null
}

function correspondConsommation(
  ligne: LigneAttestationConsommation,
  params: AttestationConsommationParams
): boolean {
  return (
    ligne.version_canonique === params.versionCanonique &&
    memeEnsemble(params.questionsApplicables, ligne.questions_applicables) &&
    deepEqual(ligne.libelles_historiques, params.libellesHistoriques)
  )
}

async function relireAttestationConsommation(
  service: ReturnType<typeof createServiceClient>,
  params: AttestationConsommationParams
): Promise<LigneAttestationConsommation | null> {
  const { data } = await service
    .from('mpd_attestations_canoniques')
    .select('version_canonique, questions_applicables, libelles_historiques, consommee_le')
    .eq('user_id', params.userId)
    .eq('dossier_id', params.dossierId)
    .eq('revision', params.revision)
    .eq('operation_type', 'CONSOMMATION')
    .maybeSingle()

  return (data as LigneAttestationConsommation | null) ?? null
}

export async function prepareAttestationConsommation(
  params: AttestationConsommationParams
): Promise<AttestationResult> {
  const service = createServiceClient()

  const existante = await relireAttestationConsommation(service, params)

  if (existante) {
    if (existante.consommee_le) return { ok: false, error: 'attestation_deja_consommee' }
    return correspondConsommation(existante, params) ? { ok: true } : { ok: false, error: 'attestation_conflit' }
  }

  // version_definition est NOT NULL au niveau de la table, indépendamment
  // d'operation_type — jamais lue par mpd_consommer_dossier pour
  // CONSOMMATION (qui ne consulte que version_canonique/
  // questions_applicables/libelles_historiques), mais doit être
  // satisfaite à l'écriture. Réutilise la même information canonique
  // déjà déposée dans version_canonique — aucune constante inventée.
  const { error: erreurInsert } = await service.from('mpd_attestations_canoniques').insert({
    user_id: params.userId,
    dossier_id: params.dossierId,
    revision: params.revision,
    operation_type: 'CONSOMMATION',
    version_definition: params.versionCanonique,
    version_canonique: params.versionCanonique,
    questions_applicables: [...params.questionsApplicables],
    libelles_historiques: params.libellesHistoriques,
  })

  if (!erreurInsert) return { ok: true }

  if (erreurInsert.code === '23505') {
    const course = await relireAttestationConsommation(service, params)
    if (!course) return { ok: false, error: 'attestation_erreur' }
    if (course.consommee_le) return { ok: false, error: 'attestation_deja_consommee' }
    return correspondConsommation(course, params) ? { ok: true } : { ok: false, error: 'attestation_conflit' }
  }

  return { ok: false, error: 'attestation_erreur' }
}
