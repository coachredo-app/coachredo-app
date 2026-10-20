// ============================================================
// Music V0 — traitement de POST /api/music/commandes (LOT 1, D-058)
// ============================================================
// Logique pure, dépendances injectées (testable sans réseau ni base).
// Ne journalise jamais de coordonnée ni de donnée personnelle : seuls des
// codes d'erreur techniques.

import { TAILLE_MAX_CORPS, validerCommande, type CommandeValidee } from './commande'
import { enTetesCors, origineAutorisee } from './cors'

export type ResultatRpcCreation =
  | { reference: string; existante: boolean }
  | { erreur: string }

export interface DependancesCreation {
  originesAutorisees: string[]
  creer: (commande: CommandeValidee) => Promise<ResultatRpcCreation>
  journaliser: (code: string) => void
  maintenant?: () => Date
}

export interface RequeteCreation {
  methode: string
  origine: string | null
  typeContenu: string | null
  corps: string
}

export interface ReponseCreation {
  statut: number
  corps: Record<string, unknown> | null
  enTetes: Record<string, string>
}

const RE_REFERENCE = /^CRM-\d{5}$/

export async function traiterCreationCommande(req: RequeteCreation, deps: DependancesCreation): Promise<ReponseCreation> {
  // Origine non autorisée (ou absente) : refus, sans aucun en-tête CORS.
  if (!origineAutorisee(req.origine, deps.originesAutorisees)) {
    return { statut: 403, corps: { error: 'ORIGINE_NON_AUTORISEE' }, enTetes: {} }
  }
  const cors = enTetesCors(req.origine as string)

  if (req.methode === 'OPTIONS') return { statut: 204, corps: null, enTetes: cors }
  if (req.methode !== 'POST') return { statut: 405, corps: { error: 'METHODE_NON_AUTORISEE' }, enTetes: { ...cors, Allow: 'POST, OPTIONS' } }

  if (!req.typeContenu || !req.typeContenu.toLowerCase().startsWith('application/json')) {
    return { statut: 415, corps: { error: 'TYPE_CONTENU_INVALIDE' }, enTetes: cors }
  }
  if (Buffer.byteLength(req.corps, 'utf8') > TAILLE_MAX_CORPS) {
    return { statut: 413, corps: { error: 'CORPS_TROP_VOLUMINEUX' }, enTetes: cors }
  }

  let json: unknown
  try {
    json = JSON.parse(req.corps)
  } catch {
    return { statut: 400, corps: { error: 'DONNEES_INVALIDES' }, enTetes: cors }
  }

  const v = validerCommande(json, deps.maintenant ? deps.maintenant() : new Date())
  if (!v.ok) {
    // Honeypot : même réponse qu'une donnée invalide (aucun signal au robot).
    if (v.raison === 'HONEYPOT') deps.journaliser('music.commande.honeypot')
    return { statut: 400, corps: { error: 'DONNEES_INVALIDES' }, enTetes: cors }
  }

  let resultat: ResultatRpcCreation
  try {
    resultat = await deps.creer(v.commande)
  } catch {
    deps.journaliser('music.commande.rpc_exception')
    return { statut: 500, corps: { error: 'ERREUR_SERVEUR' }, enTetes: cors }
  }

  if ('erreur' in resultat) {
    if (resultat.erreur === 'DONNEES_INVALIDES' || resultat.erreur === 'DATE_PASSEE') {
      return { statut: 400, corps: { error: 'DONNEES_INVALIDES' }, enTetes: cors }
    }
    deps.journaliser('music.commande.rpc_erreur.' + resultat.erreur.replace(/[^A-Z_]/g, ''))
    return { statut: 500, corps: { error: 'ERREUR_SERVEUR' }, enTetes: cors }
  }

  if (!RE_REFERENCE.test(resultat.reference)) {
    deps.journaliser('music.commande.reference_inattendue')
    return { statut: 500, corps: { error: 'ERREUR_SERVEUR' }, enTetes: cors }
  }

  // Retour minimal : uniquement la référence.
  return { statut: resultat.existante ? 200 : 201, corps: { reference: resultat.reference }, enTetes: cors }
}
