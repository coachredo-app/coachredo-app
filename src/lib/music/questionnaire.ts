// ============================================================
// Music V0 — questionnaire privé client : modèle et validation (LOT 2)
// ============================================================
// Module pur (aucune dépendance Node) : utilisé par la page pour guider
// le client ET par le serveur, qui seul fait foi — le JSON envoyé par le
// navigateur n'est jamais pris tel quel : chaque réponse est revalidée,
// normalisée et reconstruite ici avant d'être enregistrée.
//
// Deux niveaux :
// - brouillon : structure, types, choix, longueurs, nombres maximaux ;
//   les champs obligatoires peuvent encore être vides ;
// - envoi : idem + champs obligatoires.
//
// Écrans (NB_ETAPES = 9) ≠ clés de données (etape1 … etape6, inchangées) :
// l'écran 5 présente etape5.ambiance, l'écran 6 etape5.style/style_autre/voix,
// l'écran 7 etape6 (inspiration), l'écran 8 le récapitulatif, l'écran 9 le
// consentement et l'envoi. Voir ecranDuChamp().

import { CGV_VERSION } from './legal'

export const FORM_VERSION = 'v0'
/**
 * Version du texte de consentement affiché à l'étape 9, enregistrée avec
 * l'envoi (consent_version, format base ^[a-z0-9.-]{1,40}$). Elle inclut la
 * version des CGV acceptées : la preuve d'acceptation est ainsi stockée et
 * horodatée avant toute production. Historique : 'v0-2026-10' (sans CGV).
 */
export const CONSENT_VERSION = 'v0.1-2026-10.' + CGV_VERSION
export const TEXTE_CONSENTEMENT =
  'J’accepte que CoachRedo Music utilise les informations de ce questionnaire, y compris les informations personnelles ou sensibles que je choisis de partager, uniquement pour créer ma chanson, dans les conditions de la politique de confidentialité. J’accepte les conditions générales de vente CoachRedo Music (version ' + CGV_VERSION + ').'

export const NB_ETAPES = 9
/** Écran du récapitulatif (relecture avant l'accord). */
export const ETAPE_RECAPITULATIF = 8
/** Écran du consentement et de l'envoi définitif. */
export const ETAPE_ENVOI = 9

/**
 * Écran (1 à 7) où se corrige un code d'erreur de champ (« etape5.voix:requis »,
 * « etape6:structure »…). Les clés de données ne changent pas : seule leur
 * présentation est répartie sur plusieurs écrans. null si le code ne vise
 * aucune étape (ex. « structure »).
 */
export function ecranDuChamp(code: string): number | null {
  const m = /^etape([1-6])(?:\.([a-z_]+))?/.exec(code)
  if (!m) return null
  const n = Number(m[1])
  if (n <= 4) return n
  if (n === 5) return m[2] === undefined || m[2] === 'ambiance' ? 5 : 6
  return 7
}
export const MAX_SOUVENIRS_SUPPLEMENTAIRES = 2

export const DE_LA_PART = ['Moi uniquement', 'Plusieurs personnes'] as const
export const EMOTIONS = [
  'Se sentir aimé(e)',
  'Être très ému(e)',
  'Sourire',
  'Ressentir de la joie',
  'Ressentir de la fierté',
  'Être encouragé(e)',
  'Souvenir / hommage',
  'Autre',
] as const
export const AMBIANCES = [
  'Douce et émouvante',
  'Joyeuse',
  'Festive et énergique',
  'Nostalgique',
  'Inspirante / pleine d’espoir',
  'Je laisse CoachRedo Music choisir',
] as const
export const STYLES = [
  'Afro / Afropop',
  'R&B / Soul',
  'Pop',
  'Rap / Urbain',
  'Gospel',
  'Acoustique',
  'Autre',
  'Je laisse CoachRedo Music choisir',
] as const
export const VOIX = ['Féminine', 'Masculine', 'Je laisse CoachRedo Music choisir'] as const
export const OUI_NON = ['Oui', 'Non'] as const
export const ASPECTS_INSPIRATION = ['L’émotion', 'La voix', 'Le rythme', 'L’ambiance', 'Autre'] as const

/** Petits détails de l'étape 3 (tous facultatifs). */
export const DETAILS = [
  { cle: 'expression', libelle: 'Une phrase ou une expression qu’elle/il dit souvent' },
  { cle: 'surnom', libelle: 'Un surnom' },
  { cle: 'habitude', libelle: 'Une habitude ou un geste' },
  { cle: 'lieu', libelle: 'Un lieu important' },
  { cle: 'chose_aimee', libelle: 'Un plat, une activité ou une chose qu’elle/il aime' },
  { cle: 'tradition', libelle: 'Une tradition' },
  { cle: 'autre', libelle: 'Un autre petit détail' },
] as const
export type CleDetail = (typeof DETAILS)[number]['cle']

/** Longueurs maximales (caractères, après normalisation). */
export const LIMITES = {
  court: 120,
  deLaPartQui: 200,
  souvenir: 1500,
  detail: 300,
  message: 1000,
  titreArtiste: 200,
  lien: 500,
} as const

export interface Reponses {
  etape_courante: number
  etape1: { de_la_part: string; de_la_part_qui: string }
  etape2: { souvenir_principal: string; souvenirs_supplementaires: string[] }
  etape3: Record<CleDetail, string>
  etape4: { message: string; emotions: string[]; emotion_principale: string; emotion_autre: string }
  etape5: { ambiance: string; style: string; style_autre: string; voix: string }
  etape6: { a_inspiration: string; titre_artiste: string; lien: string; aspects: string[]; aspect_autre: string }
}

export function reponsesVides(): Reponses {
  return {
    etape_courante: 1,
    etape1: { de_la_part: '', de_la_part_qui: '' },
    etape2: { souvenir_principal: '', souvenirs_supplementaires: [] },
    etape3: { expression: '', surnom: '', habitude: '', lieu: '', chose_aimee: '', tradition: '', autre: '' },
    etape4: { message: '', emotions: [], emotion_principale: '', emotion_autre: '' },
    etape5: { ambiance: '', style: '', style_autre: '', voix: '' },
    etape6: { a_inspiration: '', titre_artiste: '', lien: '', aspects: [], aspect_autre: '' },
  }
}

export type Niveau = 'brouillon' | 'envoi'
export type ResultatValidation =
  | { ok: true; reponses: Reponses }
  | { ok: false; erreurs: string[] }

/** Lien d'inspiration accepté : https vers YouTube ou Spotify. */
const HOTES_INSPIRATION = /^(?:(?:www|m|music)\.)?(?:youtube\.com|youtu\.be)$|^(?:open\.)?spotify\.com$|^spotify\.link$/

export function lienInspirationValide(lien: string): boolean {
  if (lien.length > LIMITES.lien || /\s/.test(lien)) return false
  try {
    const u = new URL(lien)
    return u.protocol === 'https:' && u.username === '' && u.password === '' && HOTES_INSPIRATION.test(u.hostname.toLowerCase())
  } catch {
    return false
  }
}

const estObjet = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Texte libre : retours à la ligne unifiés, caractères de contrôle retirés, espaces superflus nettoyés. */
export function normaliserTexte(v: string): string {
  return v
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Valide et reconstruit les réponses. Toute clé inconnue, tout type
 * inattendu, toute valeur hors liste, tout dépassement de longueur ou de
 * nombre est refusé. Le résultat ne contient que les champs connus.
 */
export function validerReponses(entree: unknown, niveau: Niveau): ResultatValidation {
  const erreurs: string[] = []
  const r = reponsesVides()
  if (!estObjet(entree)) return { ok: false, erreurs: ['structure'] }

  const clesAutorisees = (o: Record<string, unknown>, cles: readonly string[], ou: string) => {
    for (const k of Object.keys(o)) if (!cles.includes(k)) erreurs.push(ou + '.' + k + ':inconnu')
  }
  const sous = (cle: string): Record<string, unknown> => {
    const v = entree[cle]
    if (v === undefined) return {}
    if (!estObjet(v)) { erreurs.push(cle + ':structure'); return {} }
    return v
  }
  const texte = (o: Record<string, unknown>, cle: string, max: number, ou: string): string => {
    const v = o[cle]
    if (v === undefined || v === null) return ''
    if (typeof v !== 'string') { erreurs.push(ou + '.' + cle + ':type'); return '' }
    const t = normaliserTexte(v)
    if (t.length > max) { erreurs.push(ou + '.' + cle + ':longueur'); return '' }
    return t
  }
  const choix = (o: Record<string, unknown>, cle: string, liste: readonly string[], ou: string): string => {
    const v = o[cle]
    if (v === undefined || v === null || v === '') return ''
    if (typeof v !== 'string' || !liste.includes(v)) { erreurs.push(ou + '.' + cle + ':choix'); return '' }
    return v
  }
  const choixMultiples = (o: Record<string, unknown>, cle: string, liste: readonly string[], ou: string): string[] => {
    const v = o[cle]
    if (v === undefined || v === null) return []
    if (!Array.isArray(v) || v.length > liste.length) { erreurs.push(ou + '.' + cle + ':structure'); return [] }
    const vus = new Set<string>()
    for (const x of v) {
      if (typeof x !== 'string' || !liste.includes(x) || vus.has(x)) { erreurs.push(ou + '.' + cle + ':choix'); return [] }
      vus.add(x)
    }
    return liste.filter((x) => vus.has(x)) // ordre canonique
  }
  const requis = (cond: boolean, code: string) => { if (niveau === 'envoi' && !cond) erreurs.push(code + ':requis') }

  clesAutorisees(entree, ['etape_courante', 'etape1', 'etape2', 'etape3', 'etape4', 'etape5', 'etape6'], 'reponses')

  // Étape courante (reprise du brouillon)
  const ec = entree.etape_courante
  if (ec !== undefined) {
    if (typeof ec !== 'number' || !Number.isInteger(ec) || ec < 1 || ec > NB_ETAPES) erreurs.push('etape_courante:type')
    else r.etape_courante = ec
  }

  // Étape 1 — de la part de qui
  const e1 = sous('etape1')
  clesAutorisees(e1, ['de_la_part', 'de_la_part_qui'], 'etape1')
  r.etape1.de_la_part = choix(e1, 'de_la_part', DE_LA_PART, 'etape1')
  r.etape1.de_la_part_qui = r.etape1.de_la_part === 'Plusieurs personnes' ? texte(e1, 'de_la_part_qui', LIMITES.deLaPartQui, 'etape1') : ''
  requis(r.etape1.de_la_part !== '', 'etape1.de_la_part')
  if (r.etape1.de_la_part === 'Plusieurs personnes') requis(r.etape1.de_la_part_qui !== '', 'etape1.de_la_part_qui')

  // Étape 2 — souvenirs : 1 principal obligatoire, jusqu'à 2 supplémentaires facultatifs
  const e2 = sous('etape2')
  clesAutorisees(e2, ['souvenir_principal', 'souvenirs_supplementaires'], 'etape2')
  r.etape2.souvenir_principal = texte(e2, 'souvenir_principal', LIMITES.souvenir, 'etape2')
  const sup = e2.souvenirs_supplementaires
  if (sup !== undefined && sup !== null) {
    if (!Array.isArray(sup) || sup.length > MAX_SOUVENIRS_SUPPLEMENTAIRES) erreurs.push('etape2.souvenirs_supplementaires:nombre')
    else {
      for (const s of sup) {
        if (typeof s !== 'string') { erreurs.push('etape2.souvenirs_supplementaires:type'); break }
        const t = normaliserTexte(s)
        if (t.length > LIMITES.souvenir) { erreurs.push('etape2.souvenirs_supplementaires:longueur'); break }
        if (t !== '') r.etape2.souvenirs_supplementaires.push(t)
      }
    }
  }
  requis(r.etape2.souvenir_principal !== '', 'etape2.souvenir_principal')

  // Étape 3 — petits détails (tous facultatifs)
  const e3 = sous('etape3')
  clesAutorisees(e3, DETAILS.map((d) => d.cle), 'etape3')
  for (const d of DETAILS) r.etape3[d.cle] = texte(e3, d.cle, LIMITES.detail, 'etape3')

  // Étape 4 — message (obligatoire), émotions (≥ 1), émotion principale parmi elles
  const e4 = sous('etape4')
  clesAutorisees(e4, ['message', 'emotions', 'emotion_principale', 'emotion_autre'], 'etape4')
  r.etape4.message = texte(e4, 'message', LIMITES.message, 'etape4')
  r.etape4.emotions = choixMultiples(e4, 'emotions', EMOTIONS, 'etape4')
  r.etape4.emotion_principale = choix(e4, 'emotion_principale', EMOTIONS, 'etape4')
  if (r.etape4.emotion_principale && !r.etape4.emotions.includes(r.etape4.emotion_principale)) {
    if (niveau === 'envoi') erreurs.push('etape4.emotion_principale:incoherente')
    else r.etape4.emotion_principale = ''
  }
  if (!r.etape4.emotion_principale && r.etape4.emotions.length === 1) r.etape4.emotion_principale = r.etape4.emotions[0]
  r.etape4.emotion_autre = r.etape4.emotions.includes('Autre') ? texte(e4, 'emotion_autre', LIMITES.court, 'etape4') : ''
  requis(r.etape4.message !== '', 'etape4.message')
  requis(r.etape4.emotions.length > 0, 'etape4.emotions')
  requis(r.etape4.emotion_principale !== '', 'etape4.emotion_principale')
  if (r.etape4.emotions.includes('Autre')) requis(r.etape4.emotion_autre !== '', 'etape4.emotion_autre')

  // Étape 5 — ambiance et voix (avec « je laisse choisir »), style facultatif
  const e5 = sous('etape5')
  clesAutorisees(e5, ['ambiance', 'style', 'style_autre', 'voix'], 'etape5')
  r.etape5.ambiance = choix(e5, 'ambiance', AMBIANCES, 'etape5')
  r.etape5.style = choix(e5, 'style', STYLES, 'etape5')
  r.etape5.style_autre = r.etape5.style === 'Autre' ? texte(e5, 'style_autre', LIMITES.court, 'etape5') : ''
  r.etape5.voix = choix(e5, 'voix', VOIX, 'etape5')
  requis(r.etape5.ambiance !== '', 'etape5.ambiance')
  requis(r.etape5.voix !== '', 'etape5.voix')
  if (r.etape5.style === 'Autre') requis(r.etape5.style_autre !== '', 'etape5.style_autre')

  // Étape 6 — inspiration (entièrement facultative ; si « Oui » : titre/artiste OU lien)
  const e6 = sous('etape6')
  clesAutorisees(e6, ['a_inspiration', 'titre_artiste', 'lien', 'aspects', 'aspect_autre'], 'etape6')
  r.etape6.a_inspiration = choix(e6, 'a_inspiration', OUI_NON, 'etape6')
  if (r.etape6.a_inspiration === 'Oui') {
    r.etape6.titre_artiste = texte(e6, 'titre_artiste', LIMITES.titreArtiste, 'etape6')
    // Format du lien vérifié à l'envoi seulement : un lien en cours de saisie
    // ne bloque pas la sauvegarde du brouillon (il n'est jamais rendu cliquable).
    r.etape6.lien = texte(e6, 'lien', LIMITES.lien, 'etape6')
    if (niveau === 'envoi' && r.etape6.lien !== '' && !lienInspirationValide(r.etape6.lien)) erreurs.push('etape6.lien:format')
    r.etape6.aspects = choixMultiples(e6, 'aspects', ASPECTS_INSPIRATION, 'etape6')
    r.etape6.aspect_autre = r.etape6.aspects.includes('Autre') ? texte(e6, 'aspect_autre', LIMITES.court, 'etape6') : ''
    requis(r.etape6.titre_artiste !== '' || r.etape6.lien !== '', 'etape6.titre_ou_lien')
  }

  return erreurs.length ? { ok: false, erreurs } : { ok: true, reponses: r }
}

/** Écrans contenant une réponse obligatoire incomplète (pour guider le client vers l'écran à compléter). */
export function etapesIncompletes(r: Reponses): number[] {
  const v = validerReponses(r, 'envoi')
  if (v.ok) return []
  const etapes = new Set<number>()
  for (const e of v.erreurs) {
    const n = ecranDuChamp(e)
    if (n !== null) etapes.add(n)
  }
  return [...etapes].sort((a, b) => a - b)
}
