// ============================================================
// Music V0 LOT 2 — tests OFFLINE du questionnaire (validation + API)
// ============================================================
// Script plain (aucun framework, aucun réseau, aucune base). Exécution :
//   npx tsc -p scripts/music-v0/tsconfig.json --outDir <dossier temporaire>
//   node <dossier temporaire>/scripts/music-v0/questionnaire.test.js
// La base est testée séparément : scripts/music-v0/run-db-test.sh.

import { createHash, randomBytes } from 'node:crypto'
import {
  CONSENT_VERSION, LIMITES, reponsesVides, validerReponses, lienInspirationValide, etapesIncompletes, normaliserTexte,
  type Reponses,
} from '../../src/lib/music/questionnaire'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ORIGINES_QUESTIONNAIRE, traiterQuestionnaire, type DependancesQuestionnaire, type ResultatRpc } from '../../src/lib/music/questionnaireApi'

let passes = 0
let echecs = 0
function ok(nom: string, cond: boolean, detail = '') {
  if (cond) { passes++; console.log('PASS  ' + nom) } else { echecs++; console.log('ÉCHEC ' + nom + (detail ? '  ' + detail : '')) }
}

/** Réponses complètes et valides pour un envoi. */
function completes(): Reponses {
  const r = reponsesVides()
  r.etape_courante = 8
  r.etape1 = { de_la_part: 'Moi uniquement', de_la_part_qui: '' }
  r.etape2 = { souvenir_principal: 'Les dimanches au marché de Sandaga.', souvenirs_supplementaires: [] }
  r.etape4 = { message: 'Merci pour tout.', emotions: ['Se sentir aimé(e)'], emotion_principale: 'Se sentir aimé(e)', emotion_autre: '' }
  r.etape5 = { ambiance: 'Douce et émouvante', style: '', style_autre: '', voix: 'Je laisse CoachRedo Music choisir' }
  return r
}
const avec = (f: (r: Reponses) => void): Reponses => { const r = completes(); f(r); return r }
const erreurs = (v: ReturnType<typeof validerReponses>) => (v.ok ? [] : v.erreurs)

/* ── Validation : structure, types, choix ── */
{
  ok('réponses complètes : envoi accepté', validerReponses(completes(), 'envoi').ok)
  ok('brouillon vide accepté (champs obligatoires pas encore exigés)', validerReponses({}, 'brouillon').ok)
  ok('envoi vide refusé', !validerReponses({}, 'envoi').ok)
  for (const [nom, v] of [['null', null], ['tableau', []], ['texte', 'x'], ['nombre', 3]] as const) {
    ok(`structure refusée : ${nom}`, !validerReponses(v, 'brouillon').ok)
  }
  ok('clé inconnue à la racine refusée', erreurs(validerReponses({ ...completes(), pirate: 1 }, 'brouillon')).includes('reponses.pirate:inconnu'))
  ok('clé inconnue dans une étape refusée', !validerReponses({ ...completes(), etape3: { surnom: 'Mama', script: 'x' } }, 'brouillon').ok)
  ok('étape non-objet refusée', !validerReponses({ etape2: 'souvenir' }, 'brouillon').ok)
  ok('type invalide (nombre au lieu de texte) refusé', !validerReponses({ etape2: { souvenir_principal: 42 } }, 'brouillon').ok)
  ok('choix hors liste refusé (de la part de)', !validerReponses({ etape1: { de_la_part: 'Mon chat' } }, 'brouillon').ok)
  ok('choix hors liste refusé (ambiance)', !validerReponses({ etape5: { ambiance: 'Métal' } }, 'brouillon').ok)
  ok('choix hors liste refusé (voix)', !validerReponses({ etape5: { voix: 'Robot' } }, 'brouillon').ok)
  ok('choix hors liste refusé (style)', !validerReponses({ etape5: { style: '<script>' } }, 'brouillon').ok)
  ok('émotion hors liste refusée', !validerReponses({ etape4: { emotions: ['Colère'] } }, 'brouillon').ok)
  ok('émotion en double refusée', !validerReponses({ etape4: { emotions: ['Sourire', 'Sourire'] } }, 'brouillon').ok)
  ok('aspect d’inspiration hors liste refusé', !validerReponses({ etape6: { a_inspiration: 'Oui', aspects: ['Le clip'] } }, 'brouillon').ok)
  ok('étape courante hors bornes refusée', !validerReponses({ etape_courante: 9 }, 'brouillon').ok && !validerReponses({ etape_courante: 1.5 }, 'brouillon').ok)
  const norm = validerReponses({ etape2: { souvenir_principal: '  Ligne 1\r\n\r\n\r\n\r\nLigne\u0000 2‮  ' } }, 'brouillon')
  ok('normalisation : retours unifiés, caractères de contrôle et de direction retirés', norm.ok && norm.reponses.etape2.souvenir_principal === 'Ligne 1\n\nLigne 2')
  ok('normaliserTexte : espaces multiples réduits', normaliserTexte('a \t  b') === 'a b')
}

/* ── Souvenirs : 1 principal obligatoire, max 3 au total ── */
{
  ok('souvenir principal obligatoire à l’envoi', erreurs(validerReponses(avec((r) => { r.etape2.souvenir_principal = '   ' }), 'envoi')).includes('etape2.souvenir_principal:requis'))
  ok('1 principal + 2 supplémentaires (3 au total) acceptés', validerReponses(avec((r) => { r.etape2.souvenirs_supplementaires = ['Deux', 'Trois'] }), 'envoi').ok)
  ok('3 supplémentaires (4 au total) refusés', erreurs(validerReponses(avec((r) => { r.etape2.souvenirs_supplementaires = ['a', 'b', 'c'] }), 'brouillon')).includes('etape2.souvenirs_supplementaires:nombre'))
  const v = validerReponses(avec((r) => { r.etape2.souvenirs_supplementaires = ['  ', 'Vrai souvenir'] }), 'envoi')
  ok('souvenirs supplémentaires vides ignorés (jamais obligatoires)', v.ok && v.reponses.etape2.souvenirs_supplementaires.length === 1)
  ok('souvenir supplémentaire non-texte refusé', !validerReponses({ etape2: { souvenirs_supplementaires: [{}] } }, 'brouillon').ok)
}

/* ── Champs obligatoires et conditionnels ── */
{
  ok('étape 1 : « de la part de » obligatoire', erreurs(validerReponses(avec((r) => { r.etape1.de_la_part = '' }), 'envoi')).includes('etape1.de_la_part:requis'))
  ok('étape 1 : « Plusieurs personnes » exige « de la part de qui »', erreurs(validerReponses(avec((r) => { r.etape1.de_la_part = 'Plusieurs personnes' }), 'envoi')).includes('etape1.de_la_part_qui:requis'))
  const v1 = validerReponses(avec((r) => { r.etape1.de_la_part_qui = 'Ses enfants' }), 'envoi')
  ok('étape 1 : « de la part de qui » ignoré si « Moi uniquement »', v1.ok && v1.reponses.etape1.de_la_part_qui === '')
  ok('étape 3 : tous les détails facultatifs', validerReponses(completes(), 'envoi').ok)
  ok('étape 4 : message obligatoire', erreurs(validerReponses(avec((r) => { r.etape4.message = '' }), 'envoi')).includes('etape4.message:requis'))
  ok('étape 4 : au moins une émotion', erreurs(validerReponses(avec((r) => { r.etape4.emotions = []; r.etape4.emotion_principale = '' }), 'envoi')).includes('etape4.emotions:requis'))
  ok('étape 4 : plusieurs émotions → principale obligatoire', erreurs(validerReponses(avec((r) => { r.etape4.emotions = ['Sourire', 'Ressentir de la joie']; r.etape4.emotion_principale = '' }), 'envoi')).includes('etape4.emotion_principale:requis'))
  ok('étape 4 : principale hors des émotions choisies refusée', erreurs(validerReponses(avec((r) => { r.etape4.emotion_principale = 'Sourire' }), 'envoi')).includes('etape4.emotion_principale:incoherente'))
  const v4 = validerReponses(avec((r) => { r.etape4.emotions = ['Sourire']; r.etape4.emotion_principale = '' }), 'envoi')
  ok('étape 4 : une seule émotion = principale automatiquement', v4.ok && v4.reponses.etape4.emotion_principale === 'Sourire')
  ok('étape 4 : « Autre » exige une précision', erreurs(validerReponses(avec((r) => { r.etape4.emotions = ['Autre']; r.etape4.emotion_principale = 'Autre' }), 'envoi')).includes('etape4.emotion_autre:requis'))
  ok('étape 5 : ambiance obligatoire', erreurs(validerReponses(avec((r) => { r.etape5.ambiance = '' }), 'envoi')).includes('etape5.ambiance:requis'))
  ok('étape 5 : voix obligatoire', erreurs(validerReponses(avec((r) => { r.etape5.voix = '' }), 'envoi')).includes('etape5.voix:requis'))
  ok('étape 5 : style facultatif', validerReponses(avec((r) => { r.etape5.style = '' }), 'envoi').ok)
  ok('étape 5 : style « Autre » exige une précision', erreurs(validerReponses(avec((r) => { r.etape5.style = 'Autre' }), 'envoi')).includes('etape5.style_autre:requis'))
  ok('étapes incomplètes identifiées pour guider le client', JSON.stringify(etapesIncompletes(reponsesVides())) === '[1,2,4,5]')
}

/* ── Étape 6 facultative ── */
{
  ok('étape 6 : sans réponse → envoi accepté', validerReponses(completes(), 'envoi').ok)
  ok('étape 6 : « Non » → envoi accepté', validerReponses(avec((r) => { r.etape6.a_inspiration = 'Non' }), 'envoi').ok)
  const vNon = validerReponses(avec((r) => { r.etape6 = { a_inspiration: 'Non', titre_artiste: 'X', lien: 'https://youtu.be/a', aspects: ['La voix'], aspect_autre: '' } }), 'envoi')
  ok('étape 6 : « Non » efface les détails saisis', vNon.ok && vNon.reponses.etape6.titre_artiste === '' && vNon.reponses.etape6.lien === '' && vNon.reponses.etape6.aspects.length === 0)
  ok('étape 6 : « Oui » sans titre ni lien refusé à l’envoi', erreurs(validerReponses(avec((r) => { r.etape6.a_inspiration = 'Oui' }), 'envoi')).includes('etape6.titre_ou_lien:requis'))
  ok('étape 6 : « Oui » + titre/artiste accepté', validerReponses(avec((r) => { r.etape6.a_inspiration = 'Oui'; r.etape6.titre_artiste = 'Titre — Artiste' }), 'envoi').ok)
  ok('étape 6 : « Oui » + lien YouTube accepté', validerReponses(avec((r) => { r.etape6.a_inspiration = 'Oui'; r.etape6.lien = 'https://www.youtube.com/watch?v=abc' }), 'envoi').ok)
  ok('étape 6 : lien d’un autre site refusé à l’envoi', erreurs(validerReponses(avec((r) => { r.etape6.a_inspiration = 'Oui'; r.etape6.lien = 'https://exemple.com/x' }), 'envoi')).includes('etape6.lien:format'))
  ok('étape 6 : lien en cours de saisie n’empêche pas le brouillon', validerReponses(avec((r) => { r.etape6.a_inspiration = 'Oui'; r.etape6.lien = 'https://you' }), 'brouillon').ok)
  ok('liens acceptés : youtube.com, youtu.be, m./music.youtube.com, open.spotify.com, spotify.link',
    ['https://youtube.com/watch?v=1', 'https://youtu.be/1', 'https://m.youtube.com/watch?v=1', 'https://music.youtube.com/watch?v=1', 'https://open.spotify.com/track/1', 'https://spotify.link/x'].every(lienInspirationValide))
  ok('liens refusés : http, javascript:, identifiants, faux domaine, espaces',
    !['http://youtu.be/1', 'javascript:alert(1)', 'https://user:pw@youtu.be/1', 'https://youtube.com.evil.io/x', 'https://evilyoutube.com/x', 'https://youtu.be/a b'].some(lienInspirationValide))
}

/* ── Limites de longueur ── */
{
  const l = (n: number) => 'a'.repeat(n)
  ok('souvenir : limite acceptée, dépassement refusé', validerReponses(avec((r) => { r.etape2.souvenir_principal = l(LIMITES.souvenir) }), 'envoi').ok
    && erreurs(validerReponses(avec((r) => { r.etape2.souvenir_principal = l(LIMITES.souvenir + 1) }), 'brouillon')).includes('etape2.souvenir_principal:longueur'))
  ok('message : dépassement refusé', !validerReponses(avec((r) => { r.etape4.message = l(LIMITES.message + 1) }), 'brouillon').ok)
  ok('détail : dépassement refusé', !validerReponses(avec((r) => { r.etape3.surnom = l(LIMITES.detail + 1) }), 'brouillon').ok)
  ok('souvenir supplémentaire : dépassement refusé', !validerReponses(avec((r) => { r.etape2.souvenirs_supplementaires = [l(LIMITES.souvenir + 1)] }), 'brouillon').ok)
  ok('de la part de qui : dépassement refusé', !validerReponses(avec((r) => { r.etape1.de_la_part = 'Plusieurs personnes'; r.etape1.de_la_part_qui = l(LIMITES.deLaPartQui + 1) }), 'brouillon').ok)
  ok('lien : dépassement refusé', !validerReponses(avec((r) => { r.etape6.a_inspiration = 'Oui'; r.etape6.lien = 'https://youtu.be/' + l(LIMITES.lien) }), 'brouillon').ok)
}

/* ── API : jeton, origine, actions, erreurs ── */
const ORIGINE = 'https://www.coachredo.app'
const JETON = randomBytes(32).toString('base64url')
const EMPREINTE = createHash('sha256').update(JETON, 'utf8').digest('hex')

type Appel = { fn: string; empreinte: string; reponses?: Reponses; version?: string }
function fausseBase(etat: { envoye?: boolean; reponse?: Partial<Record<'charger' | 'brouillon' | 'envoyer', ResultatRpc>>; lever?: boolean } = {}) {
  const appels: Appel[] = []
  const logs: string[] = []
  const valide = (e: string) => e === EMPREINTE
  const deps: DependancesQuestionnaire = {
    originesAutorisees: ORIGINES_QUESTIONNAIRE,
    journaliser: (c) => logs.push(c),
    charger: async (empreinte) => {
      appels.push({ fn: 'charger', empreinte })
      if (etat.lever) throw new Error('panne ' + JETON)
      if (etat.reponse?.charger) return etat.reponse.charger
      if (!valide(empreinte)) return { erreur: 'LIEN_INVALIDE' }
      return { data: { reference: 'CRM-00005', beneficiaire_prenom: 'Fatou', relation: 'Ma mère', relation_autre: null, occasion: 'Anniversaire', responses: { etape_courante: 3, etape2: { souvenir_principal: 'Sandaga' } }, brouillon_le: '2026-10-20T10:00:00Z', envoye_le: etat.envoye ? '2026-10-20T11:00:00Z' : null, email: 'fuite@exemple.sn' } }
    },
    brouillon: async (empreinte, reponses) => {
      appels.push({ fn: 'brouillon', empreinte, reponses })
      if (etat.reponse?.brouillon) return etat.reponse.brouillon
      if (!valide(empreinte)) return { erreur: 'LIEN_INVALIDE' }
      return etat.envoye ? { erreur: 'DEJA_ENVOYE' } : { data: { brouillon_le: '2026-10-20T10:05:00Z' } }
    },
    envoyer: async (empreinte, reponses, version) => {
      appels.push({ fn: 'envoyer', empreinte, reponses, version })
      if (!valide(empreinte)) return { erreur: 'LIEN_INVALIDE' }
      if (etat.envoye) return { erreur: 'DEJA_ENVOYE' }
      etat.envoye = true
      return { data: { envoye_le: '2026-10-20T11:00:00Z', statut: 'QUESTIONNAIRE_REÇU' } }
    },
  }
  return { deps, appels, logs }
}
const req = (corps: unknown, extra: Partial<{ methode: string; origine: string | null; typeContenu: string | null }> = {}) => ({
  methode: extra.methode ?? 'POST',
  origine: extra.origine === undefined ? ORIGINE : extra.origine,
  typeContenu: extra.typeContenu === undefined ? 'application/json' : extra.typeContenu,
  corps: typeof corps === 'string' ? corps : JSON.stringify(corps),
})

async function testsApi() {
  // Jeton valide : chargement + préremplissage, sans coordonnée
  {
    const b = fausseBase()
    const r = await traiterQuestionnaire(req({ action: 'charger', jeton: JETON }), b.deps)
    const c = r.corps as { commande: Record<string, unknown>; reponses: Reponses; reference: string; envoye_le: unknown }
    ok('charger (jeton valide) : 200, préremplissage commande', r.statut === 200 && c.commande.beneficiaire_prenom === 'Fatou' && c.commande.relation === 'Ma mère' && c.commande.occasion === 'Anniversaire' && c.reference === 'CRM-00005')
    ok('charger : brouillon repris (étape et réponses)', c.reponses.etape_courante === 3 && c.reponses.etape2.souvenir_principal === 'Sandaga' && c.envoye_le === null)
    ok('charger : seule l’empreinte SHA-256 est transmise à la base', b.appels.length === 1 && b.appels[0].empreinte === EMPREINTE && b.appels[0].empreinte !== JETON)
    ok('charger : aucune donnée imprévue relayée (email filtré)', !JSON.stringify(r.corps).includes('fuite@'))
  }
  // Jetons refusés : uniformes, sans appel à la base pour un format invalide
  {
    const formats = ['', 'court', 'A'.repeat(42), 'A'.repeat(44), 'A'.repeat(42) + '+', 'A'.repeat(42) + '=', 'CRM-00005', EMPREINTE, 12345, null]
    let tous = true
    let aucunAppel = true
    for (const j of formats) {
      const b = fausseBase()
      const r = await traiterQuestionnaire(req({ action: 'charger', jeton: j }), b.deps)
      if (r.statut !== 404 || (r.corps as { error: string }).error !== 'LIEN_INVALIDE') tous = false
      if (b.appels.length) aucunAppel = false
    }
    ok('jeton mal formé, CRM seul, empreinte brute, non-texte : 404 LIEN_INVALIDE uniforme', tous)
    ok('jeton mal formé : aucun appel à la base', aucunAppel)
    const b = fausseBase()
    const inconnu = await traiterQuestionnaire(req({ action: 'charger', jeton: randomBytes(32).toString('base64url') }), b.deps)
    ok('jeton bien formé mais inconnu/expiré/révoqué/non payé : même réponse 404 LIEN_INVALIDE', inconnu.statut === 404 && JSON.stringify(inconnu.corps) === '{"error":"LIEN_INVALIDE"}')
    const bj = fausseBase()
    const sansJeton = await traiterQuestionnaire(req({ action: 'charger' }), bj.deps)
    ok('jeton absent : 404 LIEN_INVALIDE', sansJeton.statut === 404)
  }
  // Brouillon : validation serveur, empreinte seule, réponses reconstruites
  {
    const b = fausseBase()
    const r = await traiterQuestionnaire(req({ action: 'brouillon', jeton: JETON, reponses: { etape_courante: 2, etape2: { souvenir_principal: '  Sandaga  ' } } }), b.deps)
    ok('brouillon : 200 + horodatage', r.statut === 200 && (r.corps as { brouillon_le: string }).brouillon_le === '2026-10-20T10:05:00Z')
    ok('brouillon : réponses normalisées et reconstruites avant la base', b.appels[0].reponses?.etape2.souvenir_principal === 'Sandaga' && Object.keys(b.appels[0].reponses ?? {}).length === 7)
    const b2 = fausseBase()
    const inv = await traiterQuestionnaire(req({ action: 'brouillon', jeton: JETON, reponses: { etape5: { voix: 'Robot' } } }), b2.deps)
    ok('brouillon invalide : 400 + codes de champ uniquement, rien envoyé à la base', inv.statut === 400 && (inv.corps as { champs: string[] }).champs.includes('etape5.voix:choix') && b2.appels.length === 0)
    const b3 = fausseBase()
    const champsEnTrop = await traiterQuestionnaire(req({ action: 'brouillon', jeton: JETON, reponses: {}, consentement: true, admin: 1 }), b3.deps)
    ok('clé inattendue dans le corps : 400', champsEnTrop.statut === 400 && b3.appels.length === 0)
  }
  // Envoi : consentement obligatoire, champs obligatoires, verrouillage
  {
    const b = fausseBase()
    const sans = await traiterQuestionnaire(req({ action: 'envoyer', jeton: JETON, reponses: completes() }), b.deps)
    const faux = await traiterQuestionnaire(req({ action: 'envoyer', jeton: JETON, reponses: completes(), consentement: 'oui' }), b.deps)
    ok('envoi sans consentement (absent ou ≠ true) : 400 CONSENTEMENT_REQUIS, rien envoyé', sans.statut === 400 && (sans.corps as { error: string }).error === 'CONSENTEMENT_REQUIS' && faux.statut === 400 && b.appels.length === 0)
    const incomplet = await traiterQuestionnaire(req({ action: 'envoyer', jeton: JETON, reponses: avec((r) => { r.etape2.souvenir_principal = '' }), consentement: true }), b.deps)
    ok('envoi incomplet : 400 avec le champ manquant, rien envoyé', incomplet.statut === 400 && (incomplet.corps as { champs: string[] }).champs.includes('etape2.souvenir_principal:requis') && b.appels.length === 0)
    const r = await traiterQuestionnaire(req({ action: 'envoyer', jeton: JETON, reponses: completes(), consentement: true }), b.deps)
    ok('envoi définitif : 200, version de consentement fixée par le serveur', r.statut === 200 && b.appels[0].fn === 'envoyer' && b.appels[0].version === CONSENT_VERSION)
    const encore = await traiterQuestionnaire(req({ action: 'envoyer', jeton: JETON, reponses: completes(), consentement: true }), b.deps)
    const brouillon = await traiterQuestionnaire(req({ action: 'brouillon', jeton: JETON, reponses: completes() }), b.deps)
    ok('après envoi : second envoi et brouillon refusés (409 DEJA_ENVOYE)', encore.statut === 409 && brouillon.statut === 409)
    const b2 = fausseBase({ envoye: true })
    const lecture = await traiterQuestionnaire(req({ action: 'charger', jeton: JETON }), b2.deps)
    ok('après envoi : lecture possible (envoye_le renseigné)', lecture.statut === 200 && (lecture.corps as { envoye_le: string }).envoye_le === '2026-10-20T11:00:00Z')
  }
  // Protocole
  {
    const b = fausseBase()
    ok('méthode ≠ POST : 405', (await traiterQuestionnaire(req({}, { methode: 'GET' }), b.deps)).statut === 405)
    ok('origine absente : 403', (await traiterQuestionnaire(req({ action: 'charger', jeton: JETON }, { origine: null }), b.deps)).statut === 403)
    ok('origine étrangère : 403', (await traiterQuestionnaire(req({ action: 'charger', jeton: JETON }, { origine: 'https://evil.example' }), b.deps)).statut === 403)
    ok('type de contenu non JSON : 415', (await traiterQuestionnaire(req({ action: 'charger', jeton: JETON }, { typeContenu: 'text/plain' }), b.deps)).statut === 415)
    ok('corps > 40 Ko : 413', (await traiterQuestionnaire(req({ action: 'brouillon', jeton: JETON, reponses: { x: 'a'.repeat(41000) } }), b.deps)).statut === 413)
    ok('JSON invalide : 400', (await traiterQuestionnaire(req('{pas du json'), b.deps)).statut === 400)
    ok('action inconnue : 400', (await traiterQuestionnaire(req({ action: 'supprimer', jeton: JETON }), b.deps)).statut === 400)
    ok('aucun appel base pour ces refus', b.appels.length === 0)
  }
  // Origine : liste fixe de production, comparaison exacte
  {
    ok('liste d’origines = exactement https://coachredo.app et https://www.coachredo.app (figée)',
      JSON.stringify(ORIGINES_QUESTIONNAIRE) === '["https://coachredo.app","https://www.coachredo.app"]' && Object.isFrozen(ORIGINES_QUESTIONNAIRE))
    const essai = async (origine: string | null) => {
      const b = fausseBase()
      const r = await traiterQuestionnaire(req({ action: 'charger', jeton: JETON }, { origine }), b.deps)
      return { statut: r.statut, appels: b.appels.length }
    }
    const acceptee = async (o: string) => { const x = await essai(o); return x.statut === 200 && x.appels === 1 }
    const refusee = async (o: string | null) => { const x = await essai(o); return x.statut === 403 && x.appels === 0 }
    ok('Origin https://coachredo.app → acceptée', await acceptee('https://coachredo.app'))
    ok('Origin https://www.coachredo.app → acceptée', await acceptee('https://www.coachredo.app'))
    ok('Origin arbitraire https://evil.example → refusée (403, aucun appel base)', await refusee('https://evil.example'))
    let ressemblantes = true
    for (const o of ['https://coachredo.app.evil.example', 'https://evilcoachredo.app', 'https://www.coachredo.app.evil.example', 'https://coachredo.app:443', 'https://coachredo.app/', 'http://coachredo.app', 'http://www.coachredo.app', 'https://COACHREDO.APP', 'https://api.coachredo.app', ' https://coachredo.app', 'https://coachredo.app, https://evil.example']) {
      if (!(await refusee(o))) ressemblantes = false
    }
    ok('Origins ressemblantes (suffixe, préfixe, sous-domaine, port, slash, http, casse, liste) → refusées', ressemblantes)
    ok('Origin « null » (iframe sandbox, fichier local, redirection) → refusée', await refusee('null'))
    ok('Origin absente → refusée (403)', await refusee(null))
    ok('Origin vide → refusée (403)', await refusee(''))
    let horsProd = true
    for (const o of ['http://localhost:3000', 'http://127.0.0.1:3001', 'https://coachredo-app-git-main.vercel.app']) {
      if (!(await refusee(o))) horsProd = false
    }
    ok('préversion *.vercel.app et développement local → refusés', horsProd)
    // Lancé depuis la racine du dépôt (voir l'en-tête de ce fichier).
    const route = readFileSync(join(process.cwd(), 'src/app/api/music/questionnaire/route.ts'), 'utf8')
    ok('route : utilise ORIGINES_QUESTIONNAIRE, aucune origine dérivée de la requête ou de l’environnement',
      /originesAutorisees: ORIGINES_QUESTIONNAIRE,/.test(route) && !/request\.url|headers\.get\('host'\)|process\.env/.test(route))
  }
  // Erreurs serveur et non-fuite du jeton
  {
    const b = fausseBase({ lever: true })
    const r = await traiterQuestionnaire(req({ action: 'charger', jeton: JETON }), b.deps)
    ok('exception (message contenant le jeton) : 500 générique, jeton absent de la réponse', r.statut === 500 && JSON.stringify(r.corps) === '{"error":"ERREUR_SERVEUR"}')
    const b2 = fausseBase({ reponse: { charger: { erreur: 'RPC_PGRST301' } } })
    const r2 = await traiterQuestionnaire(req({ action: 'charger', jeton: JETON }), b2.deps)
    ok('erreur RPC technique : 500 générique, aucun détail', r2.statut === 500 && JSON.stringify(r2.corps) === '{"error":"ERREUR_SERVEUR"}')
    // Tous les journaux de tous les scénarios : codes uniquement, jamais le jeton ni l'empreinte ni une réponse
    const tous: string[] = []
    for (const corps of [
      { action: 'charger', jeton: JETON }, { action: 'charger', jeton: 'mauvais' }, { action: 'brouillon', jeton: JETON, reponses: { etape5: { voix: 'Robot' } } },
      { action: 'envoyer', jeton: JETON, reponses: completes() }, { action: 'envoyer', jeton: JETON, reponses: completes(), consentement: true },
    ]) {
      const bb = fausseBase({ lever: corps.jeton === JETON && corps.action === 'charger' })
      await traiterQuestionnaire(req(corps), bb.deps)
      tous.push(...bb.logs)
    }
    tous.push(...b.logs, ...b2.logs)
    ok('journaux : codes « music.questionnaire.* » uniquement', tous.length > 0 && tous.every((l) => /^music\.questionnaire\.[a-z_]+$/.test(l)), JSON.stringify(tous))
    ok('journaux : jamais le jeton, l’empreinte ni une réponse', !tous.some((l) => l.includes(JETON) || l.includes(EMPREINTE) || l.includes('Sandaga')))
    const reponses = [r, r2]
    ok('réponses API : jamais le jeton ni l’empreinte', !reponses.some((x) => JSON.stringify(x.corps).includes(JETON) || JSON.stringify(x.corps).includes(EMPREINTE)))
  }
}

testsApi().then(() => {
  console.log(`\n${passes}/${passes + echecs} PASS`)
  process.exit(echecs ? 1 : 0)
})
