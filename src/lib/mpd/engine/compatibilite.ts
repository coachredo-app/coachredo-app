// ============================================================
// MPD V3 — Compatibilité de lecture des anciens payloads — Lot B
// ============================================================
// Règles strictement STRUCTURELLES (jamais un mapping par stableId) :
// permettent de continuer à lire/afficher une réponse déjà enregistrée
// sous une ancienne forme, après qu'une question a changé de
// formeReponse racine pour collecter réellement une donnée prévue par
// le canon mais jusque-là jamais rendue (Q4, Q29 — Lot B). Jamais
// utilisées en écriture : une nouvelle soumission produit toujours la
// forme actuelle, validée telle quelle par validation.ts. Jamais
// d'invention de valeur manquante — seules les données réellement
// présentes dans l'ancien payload sont réinterprétées.

import type { ChampFixe, Option } from '../canon/types'

/**
 * Un payload items_avec_sous_reponse/champs_fixes attendu comme un
 * OBJET qui arrive comme un TABLEAU brut est l'ancienne forme d'une
 * question dont le formeReponse racine vient de passer de
 * multi_selection à items_avec_sous_reponse (ex. Q4) — interprété
 * comme la valeur du SEUL champ fixe de forme multi_selection, les
 * autres champs restant simplement absents (jamais inventés). Si la
 * structure ne compte pas EXACTEMENT un tel champ, la règle ne
 * s'applique pas (retour tel quel) — jamais une heuristique ambiguë.
 */
export function normaliserChampsFixesLegacy(champs: readonly ChampFixe[], payload: unknown): unknown {
  if (!Array.isArray(payload)) return payload
  const ciblesMultiSelection = champs.filter(c => c.formeReponse === 'multi_selection')
  if (ciblesMultiSelection.length !== 1) return payload
  return { [ciblesMultiSelection[0].id]: payload }
}

/**
 * Un payload choix_avec_precision attendu comme { value, precision }
 * qui arrive comme un objet SANS `value` est l'ancienne forme d'une
 * question dont le formeReponse racine vient de passer de
 * items_avec_sous_reponse (champs_fixes) à choix_avec_precision (ex.
 * Q29) — les anciens champs fixes orphelins sont recherchés par leur
 * id parmi les precisions composites des options ACTUELLES de la
 * question ; le choix principal reste INCONNU, jamais inventé.
 * Retourne `null` quand le payload n'a pas cette forme orpheline
 * (forme actuelle valide, ou payload réellement vide).
 */
export function extraireChampsFixesOrphelins(payload: unknown): Record<string, unknown> | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null
  const obj = payload as Record<string, unknown>
  if (typeof obj.value === 'string') return null
  return Object.keys(obj).length > 0 ? obj : null
}

/** Les ChampFixe déclarés dans les precisions composites de toutes les
 * options d'une question — utilisé pour résoudre un objet orphelin
 * (extraireChampsFixesOrphelins) sans jamais connaître l'identité de
 * la question elle-même. Dédupliqué par `id` : un même ChampFixe peut
 * être partagé par plusieurs options (ex. Q29 — un seul `horizon`
 * réutilisé sur 3 options, pour éviter toute dérive entre 3 copies,
 * cf. etape-6.ts) — sans cette déduplication, un champ partagé par N
 * options serait résolu N fois pour la même valeur orpheline (bug
 * constaté : « 1-3 mois » affiché 3 fois pour une ancienne réponse
 * urgence_financiere). Le choix retenu par champ dupliqué est le
 * premier rencontré — tous partagent la même définition par construction. */
export function champsFixesComposites(options: readonly Option[] | undefined): readonly ChampFixe[] {
  const tous = (options ?? []).flatMap(o => (o.precision?.type === 'composite' ? o.precision.champs : []))
  const vus = new Set<string>()
  return tous.filter(champ => {
    if (vus.has(champ.id)) return false
    vus.add(champ.id)
    return true
  })
}
