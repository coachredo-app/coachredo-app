// ============================================================
// Music V0 — traitement de POST /api/music/questionnaire (LOT 2, D-058)
// ============================================================
// Logique pure, dépendances injectées (testable sans réseau ni base).
// Corps : { action: 'charger' | 'brouillon' | 'envoyer', jeton, reponses?, consentement? }
//
// Le jeton (lu par la page dans le fragment #t=) n'arrive QUE dans le corps
// JSON ; il n'est jamais journalisé, jamais renvoyé, jamais placé dans une
// erreur. Le serveur vérifie son format, calcule son empreinte SHA-256 et
// ne transmet que celle-ci à la base. Toute erreur de lien (mal formé,
// inconnu, expiré, révoqué, commande non payée ou annulée) produit la même
// réponse, qui ne révèle ni l'existence d'une commande ni aucune donnée.

import { empreinteJeton, jetonBienForme } from './jeton'
import { CONSENT_VERSION, reponsesVides, validerReponses, type Reponses } from './questionnaire'

export const TAILLE_MAX_CORPS_QUESTIONNAIRE = 40_000

/**
 * Seules origines acceptées pour la route du questionnaire : la page est
 * servie par l'app elle-même (même origine). Liste FIXE — jamais dérivée de
 * la requête (Origin, Host, URL) ni de l'environnement. Comparaison exacte :
 * une origine arbitraire, ressemblante, « null » ou absente est refusée.
 * Conséquence assumée : les déploiements de préversion (*.vercel.app) et le
 * développement local ne peuvent pas appeler cette route.
 */
export const ORIGINES_QUESTIONNAIRE: readonly string[] = Object.freeze(['https://coachredo.app', 'https://www.coachredo.app'])

export type ResultatRpc = { data: Record<string, unknown> } | { erreur: string }

export interface DependancesQuestionnaire {
  /** Origines acceptées — en production : ORIGINES_QUESTIONNAIRE. */
  originesAutorisees: readonly string[]
  charger: (empreinte: string) => Promise<ResultatRpc>
  brouillon: (empreinte: string, reponses: Reponses) => Promise<ResultatRpc>
  envoyer: (empreinte: string, reponses: Reponses, consentVersion: string) => Promise<ResultatRpc>
  journaliser: (code: string) => void
}

export interface RequeteQuestionnaire {
  methode: string
  origine: string | null
  typeContenu: string | null
  corps: string
}

export interface ReponseQuestionnaire {
  statut: number
  corps: Record<string, unknown>
}

const LIEN_INVALIDE = { statut: 404, corps: { error: 'LIEN_INVALIDE' } }
const DONNEES_INVALIDES = { statut: 400, corps: { error: 'DONNEES_INVALIDES' } }
const ERREUR_SERVEUR = { statut: 500, corps: { error: 'ERREUR_SERVEUR' } }

const estObjet = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const texteOuNull = (v: unknown) => (typeof v === 'string' ? v : null)

export async function traiterQuestionnaire(req: RequeteQuestionnaire, deps: DependancesQuestionnaire): Promise<ReponseQuestionnaire> {
  const log = (code: string) => deps.journaliser('music.questionnaire.' + code)

  if (req.methode !== 'POST') return { statut: 405, corps: { error: 'METHODE_NON_AUTORISEE' } }
  if (!req.origine || !deps.originesAutorisees.includes(req.origine)) {
    log('origine_refusee')
    return { statut: 403, corps: { error: 'ORIGINE_NON_AUTORISEE' } }
  }
  if (!req.typeContenu || !req.typeContenu.toLowerCase().startsWith('application/json')) {
    return { statut: 415, corps: { error: 'TYPE_CONTENU_INVALIDE' } }
  }
  if (Buffer.byteLength(req.corps, 'utf8') > TAILLE_MAX_CORPS_QUESTIONNAIRE) {
    log('corps_trop_volumineux')
    return { statut: 413, corps: { error: 'CORPS_TROP_VOLUMINEUX' } }
  }

  let json: unknown
  try {
    json = JSON.parse(req.corps)
  } catch {
    return DONNEES_INVALIDES
  }
  if (!estObjet(json)) return DONNEES_INVALIDES
  const { action, jeton } = json
  if (action !== 'charger' && action !== 'brouillon' && action !== 'envoyer') return DONNEES_INVALIDES
  const autorisees = action === 'charger' ? ['action', 'jeton'] : action === 'brouillon' ? ['action', 'jeton', 'reponses'] : ['action', 'jeton', 'reponses', 'consentement']
  if (Object.keys(json).some((k) => !autorisees.includes(k))) return DONNEES_INVALIDES

  if (!jetonBienForme(jeton)) {
    log('lien_invalide')
    return LIEN_INVALIDE
  }
  const empreinte = empreinteJeton(jeton)

  let res: ResultatRpc
  try {
    if (action === 'charger') {
      res = await deps.charger(empreinte)
    } else {
      const v = validerReponses(json.reponses, action === 'envoyer' ? 'envoi' : 'brouillon')
      if (!v.ok) {
        log('donnees_invalides')
        // Codes de champ uniquement (ex. « etape2.souvenir_principal:requis ») — jamais de valeur.
        return { statut: 400, corps: { error: 'DONNEES_INVALIDES', champs: v.erreurs.slice(0, 20) } }
      }
      if (action === 'envoyer' && json.consentement !== true) {
        log('consentement_requis')
        return { statut: 400, corps: { error: 'CONSENTEMENT_REQUIS' } }
      }
      res = action === 'brouillon'
        ? await deps.brouillon(empreinte, v.reponses)
        : await deps.envoyer(empreinte, v.reponses, CONSENT_VERSION)
    }
  } catch {
    log('exception')
    return ERREUR_SERVEUR
  }

  if ('erreur' in res) {
    switch (res.erreur) {
      case 'LIEN_INVALIDE': log('lien_invalide'); return LIEN_INVALIDE
      case 'DEJA_ENVOYE': log('deja_envoye'); return { statut: 409, corps: { error: 'DEJA_ENVOYE' } }
      case 'CONSENTEMENT_REQUIS': return { statut: 400, corps: { error: 'CONSENTEMENT_REQUIS' } }
      case 'DONNEES_INVALIDES': return DONNEES_INVALIDES
      default: log('erreur_rpc'); return ERREUR_SERVEUR
    }
  }

  const d = res.data
  if (action === 'charger') {
    if (typeof d.beneficiaire_prenom !== 'string' || typeof d.reference !== 'string') { log('reponse_inattendue'); return ERREUR_SERVEUR }
    // Les réponses stockées sont relues via le même validateur (défense).
    const stockees = validerReponses(d.responses ?? {}, 'brouillon')
    return {
      statut: 200,
      corps: {
        reference: d.reference,
        commande: {
          beneficiaire_prenom: d.beneficiaire_prenom,
          relation: texteOuNull(d.relation),
          relation_autre: texteOuNull(d.relation_autre),
          occasion: texteOuNull(d.occasion),
        },
        reponses: stockees.ok ? stockees.reponses : reponsesVides(),
        brouillon_le: texteOuNull(d.brouillon_le),
        envoye_le: texteOuNull(d.envoye_le),
      },
    }
  }
  if (action === 'brouillon') return { statut: 200, corps: { brouillon_le: texteOuNull(d.brouillon_le) } }
  return { statut: 200, corps: { envoye_le: texteOuNull(d.envoye_le) } }
}
