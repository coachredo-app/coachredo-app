// ============================================================
// MPD V3 — Rendu lecture seule d'une réponse — T7.8E, corrigé T7.8F
// ============================================================
// Formate une réponse ACTIVE (DECLARE/INCONNU/REFUS) en texte lisible,
// en résolvant systématiquement les codes techniques (options,
// précisions, sous-champs) via le canon — aucun JSON brut, aucun code
// interne visible à l'utilisateur (GO QG T7.8F §4/§18). Couvre les 6
// formes D-029. T7.12 traitera la présentation des réponses
// DEVENUE_INACTIVE, hors périmètre ici : ce composant ne reçoit et
// n'affiche jamais que des réponses ACTIVES.
//
// T7.8F — correctif de projection (PAS un redesign esthétique, §3) :
// deux règles génériques, dérivées de conventions DÉJÀ présentes dans
// le canon, jamais d'un mapping par stableId (§16) :
//
//   1. Un libellé d'option entièrement entre parenthèses (ex.
//      « (réponse libre) », « (pays/territoire sélectionnable) ») est
//      un MARQUEUR STRUCTUREL générique du canon (8 occurrences dans 4
//      fichiers d'étape, toujours couplé à une précision) — jamais un
//      contenu utilisateur réel. Dès qu'une précision est disponible,
//      le marqueur est tu et seule la précision (le texte réellement
//      saisi) est affichée.
//
//   2. Le libellé d'un ChampFixe n'est affiché comme préfixe que s'il
//      est COURT et non phrasé en question complète (ne se termine pas
//      par « ? », longueur raisonnable) — ex. Q11 : "Niveau", "Ce qui
//      a été appris" (libellés déjà courts, authored comme tels dans
//      le canon). Quand le libellé est la phrase complète du
//      formulaire d'origine (Q16 "exemple"/"trace_valeur", Q17
//      "a_reutiliser"/"a_eviter", branche Q1, micro-donnée Étape 4),
//      il est tu — seule la valeur réellement déclarée est affichée,
//      sur sa propre ligne. Aucune donnée perdue ; aucun sous-prompt
//      interne réaffiché ; aucun libellé inventé au cas par cas.
//
// Limite connue, non contournée ici (cf. rapport T7.8F §K/§L) : le
// canon ne porte aujourd'hui qu'UN SEUL libellé par ChampFixe (celui
// du formulaire d'édition) — aucun second champ "libellé court
// d'affichage" n'existe. Reproduire exactement des intitulés courts
// inventés (« Exemple », « Résultat », « À réutiliser », « À
// éviter ») nécessiterait soit un nouveau champ canonique, soit un
// mapping par question — les deux sont explicitement hors périmètre
// de cette tranche (§16) sans nouveau GO QG.

import type { ChampFixe, ItemsAvecSousReponse, Option, PrecisionOption, QuestionCanonique } from '@/lib/mpd/canon'
import type { ReponseCourante } from '@/lib/mpd/types-runtime'
import {
  champsFixesComposites,
  extraireChampsFixesOrphelins,
  normaliserChampsFixesLegacy,
} from '@/lib/mpd/engine/compatibilite'

/** Marqueur structurel générique du canon (§1 ci-dessus) — jamais un
 * contenu utilisateur réel, toujours remplaçable par sa précision. */
function estLibellePlaceholder(label: string): boolean {
  const t = label.trim()
  return t.startsWith('(') && t.endsWith(')')
}

/** Un libellé de ChampFixe n'est un bon préfixe d'affichage que s'il a
 * été rédigé COURT par le canon — jamais une phrase complète du
 * formulaire d'origine (§2 ci-dessus). Règle purement structurelle
 * (forme du texte déjà présent), aucune liste de questions. */
function estLibelleCourtAffichable(label: string): boolean {
  const t = label.trim()
  return !t.endsWith('?') && t.length <= 45
}

function libelleOption(options: readonly Option[] | undefined, value: string): string {
  return options?.find(o => o.value === value)?.label ?? value
}

/** Précision scalaire (texte/nombre) — au plus une ligne. */
function formaterPrecisionScalaire(precision: PrecisionOption, value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (precision.type === 'texte') return typeof value === 'string' && value.length > 0 ? value : null
  if (precision.type === 'nombre_devise') {
    // Lot B (anomalie 8) : ancienne forme (nombre nu) ET nouvelle forme
    // ({ montant, devise }) — la devise n'est jamais inventée quand
    // absente (ancienne réponse, ou nouvelle réponse sans devise).
    if (typeof value === 'number') return String(value)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj = value as { montant?: unknown; devise?: unknown }
      if (typeof obj.montant !== 'number') return null
      return typeof obj.devise === 'string' && obj.devise.trim().length > 0
        ? `${obj.montant} ${obj.devise}`
        : String(obj.montant)
    }
    return null
  }
  return null
}

/** Précision composite — une ligne par champ, préfixée uniquement si
 * son libellé est court et affichable (§2). */
function formaterPrecisionCompositeLignes(
  champs: readonly ChampFixe[],
  value: unknown
): readonly string[] {
  const obj = typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  return champs
    .map(champ => {
      const ligne = formaterChampFixeLigne(champ, obj[champ.id])
      if (!ligne) return null
      return estLibelleCourtAffichable(champ.label) ? `${champ.label} : ${ligne}` : ligne
    })
    .filter((v): v is string => v !== null)
}

/** Une sélection (choix_unique/choix_avec_precision), condensée sur
 * UNE ligne — utilisée au niveau d'un ChampFixe ou d'un item
 * multi_selection, jamais directement au niveau d'une question
 * (voir formaterSelectionLignes pour le rendu multi-lignes). */
function formaterSelectionLigne(options: readonly Option[] | undefined, value: unknown): string | null {
  const selection =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as { value?: string; precision?: unknown })
      : undefined
  if (!selection?.value) return null
  const option = options?.find(o => o.value === selection.value)
  const label = libelleOption(options, selection.value)
  const placeholder = estLibellePlaceholder(label)

  if (!option?.precision) return placeholder ? null : label

  const precisionTexte =
    option.precision.type === 'composite'
      ? formaterPrecisionCompositeLignes(option.precision.champs, selection.precision).join(' · ') || null
      : formaterPrecisionScalaire(option.precision, selection.precision)

  if (placeholder) return precisionTexte ?? null
  return precisionTexte ? `${label} (${precisionTexte})` : label
}

/** Une sélection au niveau d'une QUESTION — peut produire PLUSIEURS
 * lignes quand sa précision est composite (§ en-tête du fichier) :
 * le libellé de l'option (sauf s'il est lui-même un placeholder) puis
 * une ligne par détail de précision. */
function formaterSelectionLignes(options: readonly Option[] | undefined, value: unknown): readonly string[] {
  const selection =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as { value?: string; precision?: unknown })
      : undefined
  if (!selection?.value) return []
  const option = options?.find(o => o.value === selection.value)
  const label = libelleOption(options, selection.value)
  const placeholder = estLibellePlaceholder(label)

  if (!option?.precision) return placeholder ? [] : [label]

  if (option.precision.type === 'composite') {
    const details = formaterPrecisionCompositeLignes(option.precision.champs, selection.precision)
    if (placeholder) return details.length > 0 ? details : []
    return details.length > 0 ? [label, ...details] : [label]
  }

  const precisionTexte = formaterPrecisionScalaire(option.precision, selection.precision)
  if (placeholder) return precisionTexte ? [precisionTexte] : []
  return precisionTexte ? [`${label} (${precisionTexte})`] : [label]
}

function formaterMultiSelectionLigne(options: readonly Option[] | undefined, value: unknown): string | null {
  const selections = Array.isArray(value) ? (value as Array<{ value?: string; precision?: unknown }>) : []
  const libelles = selections
    .map(s => formaterSelectionLigne(options, s))
    .filter((v): v is string => v !== null)
  return libelles.length > 0 ? libelles.join(', ') : null
}

function formaterChampFixeLigne(champ: ChampFixe, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  switch (champ.formeReponse) {
    case 'texte':
      return typeof value === 'string' ? value : null
    case 'choix_unique':
    case 'choix_avec_precision':
      return formaterSelectionLigne(champ.options, value)
    case 'multi_selection':
      return formaterMultiSelectionLigne(champ.options, value)
    default:
      return null
  }
}

function formaterItemsAvecSousReponse(
  structure: ItemsAvecSousReponse,
  options: readonly Option[] | undefined,
  value: unknown
): readonly string[] {
  if (structure.motif === 'champs_fixes') {
    // Lot B (anomalie 7, Q4) : une ancienne réponse (tableau brut) reste
    // affichable — jamais une valeur inventée pour le champ manquant.
    return formaterPrecisionCompositeLignes(structure.champs, normaliserChampsFixesLegacy(structure.champs, value))
  }

  if (structure.motif === 'liste_declaree') {
    const alt = options?.[0]
    if (alt && value === alt.value) return [alt.label]
    const entrees = Array.isArray(value) ? (value as Array<{ item?: string; sousReponse?: unknown }>) : []
    const parties = entrees
      .map(e => {
        if (!e?.item) return null
        const sousTexte = formaterChampFixeLigne(structure.sousReponse, e.sousReponse)
        return sousTexte ? `${e.item} (${sousTexte})` : e.item
      })
      .filter((v): v is string => v !== null)
    return parties.length > 0 ? [parties.join(' ; ')] : []
  }

  // branches_par_option — préserve la projection déjà validée en
  // navigateur (Q11, GO QG T7.8F §12) : UNE ligne « libellé — détails ».
  const obj =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as { value?: string; precision?: unknown; champs?: Record<string, unknown> })
      : undefined
  if (!obj?.value) return []
  const label = libelleOption(options, obj.value)
  const branche = structure.branches[obj.value]
  if (!branche) return [label]
  const parties = formaterPrecisionCompositeLignes(branche, obj.champs ?? {})
  return parties.length > 0 ? [`${label} — ${parties.join(' · ')}`] : [label]
}

function formaterPayload(question: QuestionCanonique, payload: unknown): readonly string[] {
  switch (question.formeReponse) {
    case 'texte': {
      const alt = question.options?.[0]
      if (alt && payload === alt.value) return [alt.label]
      if (question.cardinalite) {
        const entrees = Array.isArray(payload) ? (payload as string[]) : []
        return entrees.length > 0 ? [entrees.join(' ; ')] : ['—']
      }
      return typeof payload === 'string' && payload.length > 0 ? [payload] : ['—']
    }
    case 'choix_unique':
    case 'choix_avec_precision': {
      const lignes = formaterSelectionLignes(question.options, payload)
      if (lignes.length > 0) return lignes
      // Lot B (anomalie 10, Q29) : une ancienne réponse enregistrée
      // avant que le choix principal ne soit réellement collecté
      // n'a pas de `value` — ses champs fixes orphelins (ex. horizon)
      // restent affichables, résolus génériquement parmi les
      // precisions composites des options actuelles. Le choix
      // principal n'est jamais inventé pour autant.
      const orphelin = extraireChampsFixesOrphelins(payload)
      if (orphelin) {
        const lignesOrphelines = champsFixesComposites(question.options)
          .map(champ => {
            const ligne = formaterChampFixeLigne(champ, orphelin[champ.id])
            return ligne ? `${champ.label} : ${ligne}` : null
          })
          .filter((v): v is string => v !== null)
        if (lignesOrphelines.length > 0) return lignesOrphelines
      }
      return ['—']
    }
    case 'multi_selection': {
      const ligne = formaterMultiSelectionLigne(question.options, payload)
      return ligne ? [ligne] : ['—']
    }
    case 'items_avec_sous_reponse': {
      if (!question.itemsAvecSousReponse) return ['—']
      const lignes = formaterItemsAvecSousReponse(question.itemsAvecSousReponse, question.options, payload)
      return lignes.length > 0 ? lignes : ['—']
    }
    case 'texte_avec_provenance': {
      const alt = question.options?.[0]
      if (alt && payload === alt.value) return [alt.label]
      const obj =
        typeof payload === 'object' && payload !== null && !Array.isArray(payload)
          ? (payload as { texte?: string; provenance?: string })
          : undefined
      if (!obj?.texte) return ['—']
      const provenance = question.texteAvecProvenance
        ? libelleOption(question.texteAvecProvenance.provenanceOptions, obj.provenance ?? '')
        : obj.provenance
      return [provenance ? `${obj.texte} (${provenance})` : obj.texte]
    }
  }
}

export function ReponseLectureSeule({
  question,
  reponse,
}: {
  readonly question: QuestionCanonique
  readonly reponse: ReponseCourante | null
}) {
  if (!reponse) return <p className="text-sm text-cr-text-muted">—</p>
  if (reponse.statut === 'INCONNU') return <p className="text-sm text-cr-text-secondary italic">Je ne sais pas</p>
  if (reponse.statut === 'REFUS') {
    return <p className="text-sm text-cr-text-secondary italic">Préfère ne pas répondre</p>
  }

  const lignes = formaterPayload(question, reponse.payload)
  return (
    <div className="space-y-0.5">
      {lignes.map((ligne, index) => (
        <p key={index} className="text-sm text-cr-text">
          {ligne}
        </p>
      ))}
    </div>
  )
}
