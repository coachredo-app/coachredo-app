// ============================================================
// MFR V1 — Construction de MfrAnalysisContext — T-MFR.3B (GO CODE)
// ============================================================
// Server-only. Client authentifié (RLS) réutilisé depuis l'appelant —
// jamais service_role, jamais de nouvelle RPC (arbitrage QG final
// T-MFR.3B §E) : mpd_etats_logiques/mpd_etat_logique_reponses portent
// déjà une policy SELECT authenticated (013) ; RLS est elle-même la
// frontière d'ownership — un etatLogiqueId inaccessible/inexistant ne
// renvoie simplement aucune ligne, jamais une erreur distincte.
//
// Ne lit jamais mpd_dossiers (mutable) — exclusivement le snapshot
// figé. Aucune métadonnée hors MPD (nom/email/user_id/pays de
// résidence/langue/abonnement/historique d'autres utilisateurs/données
// CoachRedo hors MPD) — D-048 §C.
//
// Rendu lisible : logique ÉQUIVALENTE à celle déjà en production dans
// ReponseLectureSeule.tsx (T7.8F) — mêmes règles de résolution
// (sélection/précision/items_avec_sous_reponse/texte_avec_provenance),
// même traitement des deux cas legacy réels (Q4 tableau brut, Q29
// choix principal orphelin), réutilisant les PRIMITIVES déjà
// partagées (engine/compatibilite.ts). Réécrite ici plutôt
// qu'extraite de ReponseLectureSeule.tsx — ce fichier n'était pas dans
// le périmètre autorisé de cette passe (seul attestation.ts l'était).
// Une consolidation éventuelle des deux renderers reste une dette
// explicite, pas une tâche de cette tranche (voir compte rendu).

import { createHash } from 'crypto'
import type { createClient } from '@/lib/supabase/server'
import {
  CANON_VERSION,
  MPD_CANON_V1,
  type ChampFixe,
  type ItemsAvecSousReponse,
  type Option,
  type PrecisionOption,
  type QuestionCanonique,
} from '@/lib/mpd/canon'
import { getApplicableQuestions, type ReponsesParId } from '@/lib/mpd/engine/applicabilite'
import {
  champsFixesComposites,
  extraireChampsFixesOrphelins,
  normaliserChampsFixesLegacy,
} from '@/lib/mpd/engine/compatibilite'
import { validateMpdAnswer } from '@/lib/mpd/engine/validation'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'
import {
  MFR_ANALYSIS_CONTEXT_VERSION,
  type ConstructionResultat,
  type MfrAnalysisContext,
  type MfrAnalysisSource,
} from './types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

interface LigneSnapshot {
  readonly question_id: string
  readonly statut: StatutReponse
  readonly payload: unknown
}

function canonPourVersion(version: number): readonly QuestionCanonique[] | null {
  return version === CANON_VERSION ? MPD_CANON_V1 : null
}

// ────────────────────────────────────────────────────────────
// Rendu lisible — primitives (équivalentes à ReponseLectureSeule.tsx)
// ────────────────────────────────────────────────────────────

function libelleOptionOuBrut(options: readonly Option[] | undefined, value: string): string {
  return options?.find(o => o.value === value)?.label ?? value
}

/** Marqueur structurel générique du canon — jamais un contenu
 * utilisateur réel, toujours remplaçable par sa précision (même
 * convention que ReponseLectureSeule.tsx). */
function estPlaceholder(label: string): boolean {
  const t = label.trim()
  return t.startsWith('(') && t.endsWith(')')
}

function estLibelleCourt(label: string): boolean {
  const t = label.trim()
  return !t.endsWith('?') && t.length <= 45
}

function rendrePrecisionScalaire(precision: PrecisionOption, valeur: unknown): string | null {
  if (valeur === undefined || valeur === null) return null
  if (precision.type === 'texte') return typeof valeur === 'string' && valeur.length > 0 ? valeur : null
  if (precision.type === 'nombre_devise') {
    // Q28 — ancienne forme (nombre nu) ET nouvelle forme
    // ({ montant, devise }) — la devise n'est jamais inventée quand
    // absente.
    if (typeof valeur === 'number') return String(valeur)
    if (typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)) {
      const obj = valeur as { montant?: unknown; devise?: unknown }
      if (typeof obj.montant !== 'number') return null
      return typeof obj.devise === 'string' && obj.devise.trim().length > 0
        ? `${obj.montant} ${obj.devise}`
        : String(obj.montant)
    }
    return null
  }
  return null
}

function rendrePrecisionCompositeLignes(champs: readonly ChampFixe[], valeur: unknown): readonly string[] {
  const obj =
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur) ? (valeur as Record<string, unknown>) : {}
  return champs
    .map(champ => {
      const ligne = rendreChampFixeLigne(champ, obj[champ.id])
      if (!ligne) return null
      return estLibelleCourt(champ.label) ? `${champ.label} : ${ligne}` : ligne
    })
    .filter((v): v is string => v !== null)
}

function rendreSelectionLignes(options: readonly Option[] | undefined, valeur: unknown): readonly string[] {
  const selection =
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
      ? (valeur as { value?: string; precision?: unknown })
      : undefined
  if (!selection?.value) return []
  const option = options?.find(o => o.value === selection.value)
  const label = libelleOptionOuBrut(options, selection.value)
  const placeholder = estPlaceholder(label)

  if (!option?.precision) return placeholder ? [] : [label]

  if (option.precision.type === 'composite') {
    const details = rendrePrecisionCompositeLignes(option.precision.champs, selection.precision)
    if (placeholder) return details.length > 0 ? details : []
    return details.length > 0 ? [label, ...details] : [label]
  }

  const precisionTexte = rendrePrecisionScalaire(option.precision, selection.precision)
  if (placeholder) return precisionTexte ? [precisionTexte] : []
  return precisionTexte ? [`${label} (${precisionTexte})`] : [label]
}

function rendreMultiSelectionLigne(options: readonly Option[] | undefined, valeur: unknown): string | null {
  const selections = Array.isArray(valeur) ? (valeur as unknown[]) : []
  const libelles = selections.map(s => rendreSelectionLignes(options, s).join(' · ')).filter(v => v.length > 0)
  return libelles.length > 0 ? libelles.join(', ') : null
}

function rendreChampFixeLigne(champ: ChampFixe, valeur: unknown): string | null {
  if (valeur === undefined || valeur === null || valeur === '') return null
  switch (champ.formeReponse) {
    case 'texte':
      return typeof valeur === 'string' ? valeur : null
    case 'choix_unique':
    case 'choix_avec_precision':
      return rendreSelectionLignes(champ.options, valeur).join(' · ') || null
    case 'multi_selection':
      return rendreMultiSelectionLigne(champ.options, valeur)
    default:
      return null
  }
}

interface RenduItemsAvecSousReponse {
  readonly lignes: readonly string[]
  readonly legacy: boolean
  readonly valeurNormalisee: unknown
}

function rendreItemsAvecSousReponse(
  structure: ItemsAvecSousReponse,
  options: readonly Option[] | undefined,
  valeur: unknown
): RenduItemsAvecSousReponse {
  if (structure.motif === 'champs_fixes') {
    // Q4 (Lot B, anomalie 7) : ancienne réponse (tableau brut) —
    // jamais une valeur inventée pour le(s) champ(s) manquant(s).
    const normalise = normaliserChampsFixesLegacy(structure.champs, valeur)
    const legacy = normalise !== valeur
    return { lignes: rendrePrecisionCompositeLignes(structure.champs, normalise), legacy, valeurNormalisee: normalise }
  }

  if (structure.motif === 'liste_declaree') {
    const alt = options?.[0]
    if (alt && valeur === alt.value) return { lignes: [alt.label], legacy: false, valeurNormalisee: valeur }
    const entrees = Array.isArray(valeur) ? (valeur as Array<{ item?: string; sousReponse?: unknown }>) : []
    const parties = entrees
      .map(e => {
        if (!e?.item) return null
        const sousTexte = rendreChampFixeLigne(structure.sousReponse, e.sousReponse)
        return sousTexte ? `${e.item} (${sousTexte})` : e.item
      })
      .filter((v): v is string => v !== null)
    return { lignes: parties.length > 0 ? [parties.join(' ; ')] : [], legacy: false, valeurNormalisee: valeur }
  }

  // branches_par_option
  const obj =
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
      ? (valeur as { value?: string; champs?: Record<string, unknown> })
      : undefined
  if (!obj?.value) return { lignes: [], legacy: false, valeurNormalisee: valeur }
  const label = libelleOptionOuBrut(options, obj.value)
  const branche = structure.branches[obj.value]
  if (!branche) return { lignes: [label], legacy: false, valeurNormalisee: valeur }
  const parties = rendrePrecisionCompositeLignes(branche, obj.champs ?? {})
  return {
    lignes: parties.length > 0 ? [`${label} — ${parties.join(' · ')}`] : [label],
    legacy: false,
    valeurNormalisee: valeur,
  }
}

type RenduReponse =
  | { readonly ok: true; readonly reponseLisible: string | null; readonly valeurStructuree: unknown; readonly legacy: boolean }
  /** Aucune représentation structurée honnête ne peut être produite —
   * ni depuis le canon actuel, ni depuis une compatibilité legacy
   * explicitement reconnue. Jamais un payload brut en repli, jamais
   * `legacy: true` artificiel — l'appelant doit interrompre la
   * construction (anomalie `reponse_ininterpretable`), jamais produire
   * de source pour cette réponse (arbitrage QG, micro-correction
   * T-MFR.3B). */
  | { readonly ok: false }

/**
 * Rendu d'une réponse DECLARE uniquement — jamais appelée pour
 * INCONNU/REFUS (geré par l'appelant). Porte-barrière unique :
 * `validateMpdAnswer` (engine/validation.ts, déjà la seule source de
 * vérité de la validité canonique à l'écriture) décide d'abord si le
 * payload est structurellement valide — jamais une revalidation
 * parallèle/divergente réécrite ici (arbitrage QG, correction finale
 * T-MFR.3B §3).
 *
 * - Payload canoniquement valide → rendu direct. `reponseLisible` peut
 *   légitimement être `null` (ex. liste à cardinalité min=0 réellement
 *   vide) — sa nullité ne signifie alors jamais INCONNU, seulement
 *   « forme valide, contenu vide ».
 * - Payload invalide → seules les compatibilités legacy EXPLICITEMENT
 *   reconnues (Q4 tableau brut, Q29 choix principal orphelin) peuvent
 *   encore produire un rendu honnête (`legacy: true`). Dans tous les
 *   autres cas : `{ ok: false }`, jamais un payload brut en repli,
 *   jamais une invention, jamais `legacy: true` artificiel.
 */
function rendreReponseDeclaree(question: QuestionCanonique, payload: unknown): RenduReponse {
  const validation = validateMpdAnswer(question, 'DECLARE', payload)

  if (!validation.ok) {
    // Q4 (Lot B, anomalie 7) : tableau brut legacy, réinterprété comme
    // la valeur du seul champ multi_selection — jamais inventé pour les
    // autres champs.
    if (question.formeReponse === 'items_avec_sous_reponse' && question.itemsAvecSousReponse?.motif === 'champs_fixes') {
      const champs = question.itemsAvecSousReponse.champs
      const normalise = normaliserChampsFixesLegacy(champs, payload)
      if (normalise !== payload) {
        const lignes = rendrePrecisionCompositeLignes(champs, normalise)
        return {
          ok: true,
          reponseLisible: lignes.length > 0 ? lignes.join(' ; ') : null,
          valeurStructuree: normalise,
          legacy: true,
        }
      }
    }

    // Q29 (Lot B, anomalie 10) : choix principal legacy irrécupérable —
    // seul le(s) champ(s) orphelin(s) (ex. horizon) reste(nt) résolus,
    // jamais inventés (contrat F verrouillé).
    if (question.formeReponse === 'choix_unique' || question.formeReponse === 'choix_avec_precision') {
      const orphelin = extraireChampsFixesOrphelins(payload)
      if (orphelin) {
        const champsComposites = champsFixesComposites(question.options)
        const resolu: Record<string, unknown> = {}
        const lignesOrphelines: string[] = []
        for (const champ of champsComposites) {
          const valeurChamp = orphelin[champ.id]
          const ligne = rendreChampFixeLigne(champ, valeurChamp)
          if (ligne) {
            resolu[champ.id] = valeurChamp
            lignesOrphelines.push(`${champ.label} : ${ligne}`)
          }
        }
        return {
          ok: true,
          reponseLisible:
            lignesOrphelines.length > 0
              ? `${lignesOrphelines.join(' · ')} [choix principal non récupérable — ancien format]`
              : '[réponse ancienne non récupérable]',
          valeurStructuree: { ...resolu, choixPrincipal: null },
          legacy: true,
        }
      }
    }

    // Forme réellement inconnue — ni actuelle (validateMpdAnswer a
    // tranché), ni l'un des deux cas legacy documentés. Jamais devinée,
    // jamais transmise en brut : anomalie bloquante pour l'appelant.
    return { ok: false }
  }

  // Payload canoniquement valide (validateMpdAnswer.ok) — rendu direct,
  // jamais de coercition : les formes/tailles/options sont déjà
  // garanties par la validation ci-dessus.
  switch (question.formeReponse) {
    case 'texte': {
      const alt = question.options?.[0]
      if (alt && payload === alt.value) {
        return { ok: true, reponseLisible: alt.label, valeurStructuree: payload, legacy: false }
      }
      if (question.cardinalite) {
        const entrees = payload as string[]
        return {
          ok: true,
          reponseLisible: entrees.length > 0 ? entrees.join(' ; ') : null,
          valeurStructuree: payload,
          legacy: false,
        }
      }
      return { ok: true, reponseLisible: payload as string, valeurStructuree: payload, legacy: false }
    }

    case 'choix_unique':
    case 'choix_avec_precision': {
      const lignes = rendreSelectionLignes(question.options, payload)
      return { ok: true, reponseLisible: lignes.length > 0 ? lignes.join(' · ') : null, valeurStructuree: payload, legacy: false }
    }

    case 'multi_selection': {
      const entrees = payload as unknown[]
      const ligne = rendreMultiSelectionLigne(question.options, entrees)
      return { ok: true, reponseLisible: entrees.length > 0 ? ligne : null, valeurStructuree: payload, legacy: false }
    }

    case 'items_avec_sous_reponse': {
      // question.itemsAvecSousReponse garanti présent par
      // validateMpdAnswer (structure_canon_absente sinon invalide).
      const { lignes } = rendreItemsAvecSousReponse(question.itemsAvecSousReponse!, question.options, payload)
      return {
        ok: true,
        reponseLisible: lignes.length > 0 ? lignes.join(' ; ') : null,
        valeurStructuree: payload,
        legacy: false,
      }
    }

    case 'texte_avec_provenance': {
      const alt = question.options?.[0]
      if (alt && payload === alt.value) {
        return { ok: true, reponseLisible: alt.label, valeurStructuree: payload, legacy: false }
      }
      // obj.texte/obj.provenance garantis présents et valides par
      // validateMpdAnswer dans cette branche.
      const obj = payload as { texte: string; provenance: string }
      const provenanceLabel = libelleOptionOuBrut(question.texteAvecProvenance!.provenanceOptions, obj.provenance)
      return { ok: true, reponseLisible: `${obj.texte} (${provenanceLabel})`, valeurStructuree: payload, legacy: false }
    }
  }
}

// ────────────────────────────────────────────────────────────
// Canonicalisation + hash — contenu factuel uniquement (arbitrage
// final QG T-MFR.3B §6/§8) : contextVersion + canonVersion + sources.
// Exclut etatLogiqueId/cycleId/toute métadonnée d'engine/timestamp.
// ────────────────────────────────────────────────────────────

function trierCles(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(trierCles)
  if (valeur !== null && typeof valeur === 'object') {
    const obj = valeur as Record<string, unknown>
    const triee: Record<string, unknown> = {}
    for (const cle of Object.keys(obj).sort()) {
      triee[cle] = trierCles(obj[cle])
    }
    return triee
  }
  return valeur
}

function canonicalJSON(valeur: unknown): string {
  return JSON.stringify(trierCles(valeur))
}

function calculerContextHash(contenu: {
  readonly contextVersion: number
  readonly canonVersion: number
  readonly sources: readonly MfrAnalysisSource[]
}): string {
  return createHash('sha256').update(canonicalJSON(contenu), 'utf8').digest('hex')
}

// ────────────────────────────────────────────────────────────
// Construction
// ────────────────────────────────────────────────────────────

export async function construireMfrAnalysisContext(
  supabase: SupabaseServerClient,
  etatLogiqueId: string
): Promise<ConstructionResultat> {
  const { data: etat } = await supabase
    .from('mpd_etats_logiques')
    .select('id, version_canonique')
    .eq('id', etatLogiqueId)
    .maybeSingle()

  if (!etat) {
    return { ok: false, anomalie: { type: 'etat_logique_introuvable' } }
  }

  // mpd_etats_logiques.version_canonique est stocké en `text` (013) —
  // CANON_VERSION/QuestionCanonique.versionCanonique sont des nombres
  // côté TypeScript (cloture/actions.ts stringifie déjà à l'écriture,
  // String(CANON_VERSION)) — conversion explicite, jamais une
  // comparaison texte/nombre implicite.
  const canonVersion = Number(etat.version_canonique as string)
  const canon = canonPourVersion(canonVersion)
  if (!canon) {
    return { ok: false, anomalie: { type: 'canon_version_inconnue', canonVersion } }
  }

  const { data: lignesBrutes } = await supabase
    .from('mpd_etat_logique_reponses')
    .select('question_id, statut, payload')
    .eq('etat_logique_id', etatLogiqueId)

  const lignesParQuestion = new Map<string, LigneSnapshot>(
    ((lignesBrutes ?? []) as LigneSnapshot[]).map(l => [l.question_id, l])
  )

  const reponsesParId: ReponsesParId = new Map(
    Array.from(lignesParQuestion.values()).map(l => [
      l.question_id,
      { questionId: l.question_id, statut: l.statut, payload: l.payload } as ReponseCourante,
    ])
  )

  const applicables = getApplicableQuestions(canon, reponsesParId)

  const sources: MfrAnalysisSource[] = []
  let compteur = 0

  for (const question of applicables) {
    const ligne = lignesParQuestion.get(question.stableId)
    if (!ligne) {
      // Anomalie bloquante — ne devrait structurellement jamais
      // arriver (D-032 garanti côté DB), mais jamais supposée : un
      // contexte partiel n'est jamais produit.
      return { ok: false, anomalie: { type: 'question_applicable_sans_reponse', stableId: question.stableId } }
    }

    compteur += 1
    const src = `SRC_${String(compteur).padStart(3, '0')}`

    if (ligne.statut !== 'DECLARE') {
      sources.push({
        src,
        etape: question.etape,
        natureObjet: question.natureObjet,
        statut: ligne.statut,
        question: question.libelle,
        reponseLisible: null,
        valeurStructuree: null,
        legacy: false,
      })
      continue
    }

    const rendu = rendreReponseDeclaree(question, ligne.payload)
    if (!rendu.ok) {
      // Aucune source produite pour cette réponse, aucun payload brut
      // en repli, aucun legacy artificiel — construction interrompue
      // (arbitrage QG, micro-correction T-MFR.3B).
      return { ok: false, anomalie: { type: 'reponse_ininterpretable', stableId: question.stableId } }
    }
    sources.push({
      src,
      etape: question.etape,
      natureObjet: question.natureObjet,
      statut: 'DECLARE',
      question: question.libelle,
      reponseLisible: rendu.reponseLisible,
      valeurStructuree: rendu.valeurStructuree,
      legacy: rendu.legacy,
    })
  }

  const contextHash = calculerContextHash({
    contextVersion: MFR_ANALYSIS_CONTEXT_VERSION,
    canonVersion,
    sources,
  })

  const context: MfrAnalysisContext = {
    contextVersion: MFR_ANALYSIS_CONTEXT_VERSION,
    etatLogiqueId,
    canonVersion,
    sources,
    contextHash,
  }

  return { ok: true, context }
}
