// ============================================================
// Music V0 — traitement de POST /api/music/resume (LOT 3, D-058)
// ============================================================
// Logique pure, dépendances injectées (testable sans réseau ni base).
// Corps : { action: 'charger' | 'corriger' | 'valider', jeton, version?, correction?, consentement? }
//
// Même capacité que le questionnaire : lien privé de la commande (#t=),
// jeton reçu UNIQUEMENT dans le corps, format vérifié, empreinte SHA-256
// seule transmise à la base, jamais journalisé ni renvoyé. Toute erreur de
// lien → même réponse 404 LIEN_INVALIDE. Origines fixes (lot 2).

import { empreinteJeton, jetonBienForme } from './jeton'
import { ETATS_BRIEF, VALIDATION_BRIEF_VERSION, sectionsAffichables, validerCorrection, type EtatBrief } from './brief'
import { ORIGINES_QUESTIONNAIRE, TAILLE_MAX_CORPS_QUESTIONNAIRE, type ResultatRpc } from './questionnaireApi'

/** Origines acceptées : exactement celles du questionnaire (liste fixe, jamais dérivée de la requête). */
export const ORIGINES_RESUME = ORIGINES_QUESTIONNAIRE

export interface DependancesBrief {
  originesAutorisees: readonly string[]
  charger: (empreinte: string) => Promise<ResultatRpc>
  corriger: (empreinte: string, version: number, correction: string) => Promise<ResultatRpc>
  valider: (empreinte: string, version: number, consentVersion: string) => Promise<ResultatRpc>
  journaliser: (code: string) => void
}

export interface RequeteBrief {
  methode: string
  origine: string | null
  typeContenu: string | null
  corps: string
}

export interface ReponseBrief {
  statut: number
  corps: Record<string, unknown>
}

const LIEN_INVALIDE = { statut: 404, corps: { error: 'LIEN_INVALIDE' } }
const DONNEES_INVALIDES = { statut: 400, corps: { error: 'DONNEES_INVALIDES' } }
const ERREUR_SERVEUR = { statut: 500, corps: { error: 'ERREUR_SERVEUR' } }

const estObjet = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const texteOuNull = (v: unknown) => (typeof v === 'string' ? v : null)
const versionValide = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 1000

export async function traiterBrief(req: RequeteBrief, deps: DependancesBrief): Promise<ReponseBrief> {
  const log = (code: string) => deps.journaliser('music.resume.' + code)

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
  if (action !== 'charger' && action !== 'corriger' && action !== 'valider') return DONNEES_INVALIDES
  const autorisees = action === 'charger' ? ['action', 'jeton'] : action === 'corriger' ? ['action', 'jeton', 'version', 'correction'] : ['action', 'jeton', 'version', 'consentement']
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
      if (!versionValide(json.version)) return DONNEES_INVALIDES
      if (action === 'corriger') {
        const correction = validerCorrection(json.correction)
        if (correction === null) { log('donnees_invalides'); return DONNEES_INVALIDES }
        res = await deps.corriger(empreinte, json.version, correction)
      } else {
        if (json.consentement !== true) { log('consentement_requis'); return { statut: 400, corps: { error: 'CONSENTEMENT_REQUIS' } } }
        res = await deps.valider(empreinte, json.version, VALIDATION_BRIEF_VERSION)
      }
    }
  } catch {
    log('exception')
    return ERREUR_SERVEUR
  }

  if ('erreur' in res) {
    switch (res.erreur) {
      case 'LIEN_INVALIDE': log('lien_invalide'); return LIEN_INVALIDE
      case 'DEJA_VALIDE': log('deja_valide'); return { statut: 409, corps: { error: 'DEJA_VALIDE' } }
      case 'VERSION_PERIMEE': log('version_perimee'); return { statut: 409, corps: { error: 'VERSION_PERIMEE' } }
      case 'CORRECTION_DEJA_DEMANDEE': log('correction_deja_demandee'); return { statut: 409, corps: { error: 'CORRECTION_DEJA_DEMANDEE' } }
      case 'CONSENTEMENT_REQUIS': return { statut: 400, corps: { error: 'CONSENTEMENT_REQUIS' } }
      case 'DONNEES_INVALIDES': return DONNEES_INVALIDES
      default: log('erreur_rpc'); return ERREUR_SERVEUR
    }
  }

  const d = res.data
  if (action === 'charger') {
    const etat = d.etat as EtatBrief
    if (!ETATS_BRIEF.includes(etat)) { log('reponse_inattendue'); return ERREUR_SERVEUR }
    if (etat === 'en_preparation') return { statut: 200, corps: { etat } }
    const sections = sectionsAffichables(d.contenu)
    if (!sections || !versionValide(d.version)) { log('reponse_inattendue'); return ERREUR_SERVEUR }
    return {
      statut: 200,
      corps: {
        etat,
        version: d.version,
        sections,
        correction: etat === 'correction_demandee' ? texteOuNull(d.correction) : null,
        correction_le: etat === 'correction_demandee' ? texteOuNull(d.correction_le) : null,
        valide_le: etat === 'valide' ? texteOuNull(d.valide_le) : null,
      },
    }
  }
  if (action === 'corriger') return { statut: 200, corps: { correction_le: texteOuNull(d.correction_le) } }
  return { statut: 200, corps: { valide_le: texteOuNull(d.valide_le) } }
}
