#!/usr/bin/env node
// ============================================================
// Music V0 — commande d'administration locale (LOTS 1 et 3, D-058)
// ============================================================
// Usage (depuis la racine de coachredo-app, .env.local présent) :
//
//   Paiement et lien (LOT 1)
//   node scripts/music-v0/admin.mjs confirmer CRM-00005 <référence Wave>
//   node scripts/music-v0/admin.mjs regenerer CRM-00005
//   node scripts/music-v0/admin.mjs revoquer  CRM-00005
//   node scripts/music-v0/admin.mjs annuler   CRM-00005 [motif]
//
//   Questionnaire et brief (LOT 3)
//   node scripts/music-v0/admin.mjs questionnaire CRM-00005
//   node scripts/music-v0/admin.mjs brief-modele  CRM-00005 <fichier.txt>
//   node scripts/music-v0/admin.mjs brief         CRM-00005 <fichier.txt>
//   node scripts/music-v0/admin.mjs brief-envoyer CRM-00005
//   node scripts/music-v0/admin.mjs suivi         CRM-00005
//
// « confirmer » : à lancer UNIQUEMENT après avoir vérifié la réception du
// paiement dans Wave. Le jeton du lien privé est généré ici par
// crypto.randomBytes(32) (256 bits, base64url), seule son empreinte SHA-256
// est envoyée à la base, et le lien complet est affiché UNE SEULE FOIS.
//
// Brief = RÉSUMÉ DE LA DEMANDE du client, rédigé à la main (aucune IA) —
// pas les paroles. « brief-modele » écrit un fichier texte prérempli avec les
// réponses du questionnaire ; Coach Redouane le réécrit, puis « brief »
// l'enregistre (brouillon), puis « brief-envoyer » l'envoie : nouveau lien
// privé (l'ancien ne fonctionne plus), affiché une seule fois.
// Le fichier du brief contient des données personnelles : il doit rester
// HORS de tout dépôt Git (la commande refuse un chemin dans ce dépôt).
//
// Rien n'est journalisé. Variables lues dans l'environnement ou .env.local
// (jamais affichées) : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Base du lien : https://www.coachredo.app (MUSIC_BASE_URL pour une autre base).

import { randomBytes, createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, sep } from 'node:path'

export const OCTETS_JETON = 32
export const BASE_PAR_DEFAUT = 'https://www.coachredo.app'
const RE_REFERENCE = /^CRM-\d{5}$/
export const RACINE_DEPOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
/** Sections du brief : source unique partagée avec la page et la migration 022. */
export const SECTIONS_BRIEF = JSON.parse(readFileSync(resolve(RACINE_DEPOT, 'src/lib/music/brief-sections.json'), 'utf8'))

const COMMANDES = ['confirmer', 'regenerer', 'revoquer', 'annuler', 'questionnaire', 'brief-modele', 'brief', 'brief-envoyer', 'suivi']
const USAGE = 'Usage : node scripts/music-v0/admin.mjs <' + COMMANDES.join('|') + '> CRM-XXXXX [référence Wave | motif | fichier]'

/** Jeton de lien privé : `octets` aléatoires cryptographiques, base64url. */
export function genererJeton(source = randomBytes) {
  const octets = source(OCTETS_JETON)
  if (!Buffer.isBuffer(octets) || octets.length < OCTETS_JETON) throw new Error('ALEA_INSUFFISANT')
  return octets.toString('base64url')
}

/** Empreinte SHA-256 hexadécimale — identique à src/lib/music/jeton.ts. */
export function empreinte(jeton) {
  return createHash('sha256').update(jeton, 'utf8').digest('hex')
}

export function construireLien(base, jeton) {
  return base.replace(/\/+$/, '') + '/fr/music/questionnaire#t=' + jeton
}

export function construireLienResume(base, jeton) {
  return base.replace(/\/+$/, '') + '/fr/music/resume#t=' + jeton
}

/** Date lisible (heure de Dakar = UTC). */
export function dateLisible(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Dakar' }).format(d) + ' (heure de Dakar)'
}

/* ── Questionnaire : affichage humain ── */

const DETAILS = [
  ['expression', 'Phrase ou expression'], ['surnom', 'Surnom'], ['habitude', 'Habitude ou geste'], ['lieu', 'Lieu important'],
  ['chose_aimee', 'Plat, activité ou chose aimée'], ['tradition', 'Tradition'], ['autre', 'Autre détail'],
]
const ou = (v, defaut = '—') => (typeof v === 'string' && v.trim() !== '' ? v : defaut)
const relationLisible = (q) => (q.relation === 'Autre' ? ou(q.relation_autre, 'Autre') : ou(q.relation))
const deLaPart = (r, q) => (r.etape1?.de_la_part === 'Plusieurs personnes' ? ou(r.etape1.de_la_part_qui) : r.etape1?.de_la_part === 'Moi uniquement' ? ou(q.client_prenom, 'Le client') + ' (seul·e)' : '—')
const autre = (v, precision) => (v === 'Autre' && precision ? precision : v)

function emotionsLisibles(e = {}) {
  const liste = (e.emotions ?? []).map((x) => autre(x, e.emotion_autre))
  if (!liste.length) return '—'
  const principale = autre(e.emotion_principale, e.emotion_autre)
  const autres = liste.filter((x) => x !== principale)
  return principale ? principale + ' (principale)' + (autres.length ? ', ' + autres.join(', ') : '') : liste.join(', ')
}

function inspirationLisible(i = {}) {
  if (i.a_inspiration !== 'Oui') return i.a_inspiration === 'Non' ? 'Aucune' : '—'
  const parts = [i.titre_artiste, i.lien].filter((x) => x && x.trim())
  const aspects = (i.aspects ?? []).map((x) => autre(x, i.aspect_autre))
  return (parts.join(' — ') || '—') + (aspects.length ? ' (aime : ' + aspects.join(', ') + ')' : '')
}

export function afficherQuestionnaire(q) {
  const r = q.responses ?? {}
  const l = []
  const titre = (t) => l.push('', '── ' + t + ' ──')
  l.push('Questionnaire ' + q.reference + ' — reçu le ' + dateLisible(q.envoye_le) + ' (statut : ' + q.statut + ')')
  titre('Pour qui')
  l.push('Bénéficiaire     : ' + ou(q.beneficiaire_prenom), 'Relation         : ' + relationLisible(q), 'Occasion         : ' + ou(q.occasion), 'De la part de     : ' + deLaPart(r, q))
  titre('Souvenirs')
  l.push('Souvenir principal :', '  ' + ou(r.etape2?.souvenir_principal).replace(/\n/g, '\n  '))
  const sup = r.etape2?.souvenirs_supplementaires ?? []
  if (sup.length) sup.forEach((s, i) => l.push('Autre souvenir ' + (i + 1) + ' :', '  ' + s.replace(/\n/g, '\n  ')))
  else l.push('Souvenirs facultatifs : aucun')
  titre('Petits détails')
  const det = DETAILS.filter(([k]) => ou(r.etape3?.[k], '') !== '')
  if (det.length) det.forEach(([k, t]) => l.push(t + ' : ' + r.etape3[k]))
  else l.push('Aucun')
  titre('Message central')
  l.push('  ' + ou(r.etape4?.message).replace(/\n/g, '\n  '), 'Émotions : ' + emotionsLisibles(r.etape4))
  titre('La chanson')
  l.push('Ambiance : ' + ou(r.etape5?.ambiance), 'Style    : ' + ou(autre(r.etape5?.style, r.etape5?.style_autre), 'non précisé'), 'Voix     : ' + ou(r.etape5?.voix))
  l.push('Référence musicale : ' + inspirationLisible(r.etape6))
  l.push('', 'Consentement questionnaire : ' + dateLisible(q.consentement_le) + ' (version ' + ou(q.consentement_version) + ')')
  return l.join('\n')
}

/* ── Brief : fichier texte ── */
// Format : une section par titre « ## <titre exact> » ; les lignes qui
// commencent par « // » sont des commentaires ignorés.

export function modeleBrief(q) {
  const r = q.responses ?? {}
  const sup = (r.etape2?.souvenirs_supplementaires ?? []).filter(Boolean)
  const det = DETAILS.filter(([k]) => ou(r.etape3?.[k], '') !== '').map(([k, t]) => t + ' : ' + r.etape3[k])
  const direction = [
    'Ambiance : ' + ou(r.etape5?.ambiance),
    'Style : ' + ou(autre(r.etape5?.style, r.etape5?.style_autre), 'au choix de CoachRedo Music'),
    'Voix : ' + ou(r.etape5?.voix),
    'Référence musicale : ' + inspirationLisible(r.etape6),
  ]
  const prerempli = {
    destinataire: ou(q.beneficiaire_prenom, ''),
    relation: relationLisible(q),
    occasion: ou(q.occasion, ''),
    de_la_part: deLaPart(r, q),
    histoire: [ou(r.etape2?.souvenir_principal, ''), ...sup].filter(Boolean).join('\n\n'),
    details: det.join('\n'),
    message: ou(r.etape4?.message, ''),
    emotions: emotionsLisibles(r.etape4),
    direction_musicale: direction.join('\n'),
    points_particuliers: '',
  }
  const l = [
    '// Brief ' + q.reference + ' — RÉSUMÉ DE LA DEMANDE du client, à relire et réécrire par Coach Redouane.',
    '// Ce ne sont PAS les paroles de la chanson. Aucune génération automatique.',
    '// Prérempli mécaniquement avec les réponses du questionnaire : reformulez chaque section',
    '// avec des phrases claires que le client pourra vérifier.',
    '// Les lignes commençant par « // » sont ignorées. Ne modifiez pas les titres « ## ».',
    '// Sections obligatoires : ' + SECTIONS_BRIEF.filter((s) => s.requis).map((s) => s.titre).join(', ') + '.',
    '// Fichier personnel : ne le placez jamais dans un dépôt Git.',
  ]
  for (const s of SECTIONS_BRIEF) {
    l.push('', '## ' + s.titre)
    if (!s.requis) l.push('// Facultatif — laissez vide si rien à signaler.')
    if (prerempli[s.cle]) l.push(prerempli[s.cle])
  }
  return l.join('\n') + '\n'
}

/** Fichier texte → contenu du brief, ou liste d'erreurs lisibles. */
export function parserBrief(texte) {
  const erreurs = []
  const parTitre = new Map(SECTIONS_BRIEF.map((s) => [s.titre, s]))
  const valeurs = {}
  let courante = null
  const lignes = String(texte).replace(/\r\n?/g, '\n').split('\n')
  for (const brute of lignes) {
    if (/^\s*\/\//.test(brute)) continue
    const m = /^##\s+(.+?)\s*$/.exec(brute)
    if (m) {
      const s = parTitre.get(m[1])
      if (!s) { erreurs.push('Titre inconnu : « ' + m[1] + ' »'); courante = null; continue }
      if (s.cle in valeurs) { erreurs.push('Section en double : « ' + s.titre + ' »'); courante = null; continue }
      courante = s
      valeurs[s.cle] = []
      continue
    }
    if (!courante) {
      if (brute.trim() !== '') erreurs.push('Texte hors section : « ' + brute.trim().slice(0, 40) + ' »')
      continue
    }
    valeurs[courante.cle].push(brute.replace(/\s+$/, ''))
  }
  const contenu = {}
  for (const s of SECTIONS_BRIEF) {
    const t = (valeurs[s.cle] ?? []).join('\n').replace(/\n{3,}/g, '\n\n').trim()
    if (!(s.cle in valeurs)) { erreurs.push('Section manquante : « ' + s.titre + ' »'); continue }
    if (t === '') { if (s.requis) erreurs.push('Section obligatoire vide : « ' + s.titre + ' »'); continue }
    if (t.length > s.max) { erreurs.push('Section trop longue : « ' + s.titre + ' » (' + t.length + ' / ' + s.max + ' caractères)'); continue }
    contenu[s.cle] = t
  }
  return erreurs.length ? { erreurs } : { contenu }
}

export function afficherBrief(contenu) {
  const l = []
  for (const s of SECTIONS_BRIEF) {
    if (!contenu[s.cle]) continue
    l.push('', '── ' + s.titre + ' ──', contenu[s.cle])
  }
  return l.join('\n')
}

/** Chemin d'un fichier de brief : refusé s'il est dans ce dépôt (données personnelles). */
export function cheminHorsDepot(chemin, racine = RACINE_DEPOT) {
  const abs = resolve(chemin)
  return abs === racine || abs.startsWith(racine + sep) ? null : abs
}

export function afficherSuivi(s) {
  const l = ['Suivi ' + s.reference + ' — statut : ' + s.statut]
  l.push('Paiement confirmé       : ' + dateLisible(s.paye_le))
  l.push('Questionnaire reçu      : ' + dateLisible(s.questionnaire_envoye_le))
  const b = s.brief
  if (!b) {
    l.push('Brief                   : aucun')
  } else {
    const etat = b.valide_le ? 'VALIDÉ (verrouillé)' : b.correction_le ? 'correction demandée par le client' : b.envoye_le ? 'envoyé, en attente du client' : 'brouillon interne (non envoyé)'
    l.push('Brief                   : version ' + b.version + ' — ' + etat)
    l.push('  Envoyé au client      : ' + dateLisible(b.envoye_le))
    if (b.correction_le) {
      l.push('  Correction demandée   : ' + dateLisible(b.correction_le) + ' (version ' + b.version + ')')
      l.push('  « ' + b.correction.replace(/\n/g, '\n    ') + ' »')
      l.push('  → Rédigez la version ' + (b.version + 1) + ' (brief ' + s.reference + ' <fichier>), puis brief-envoyer.')
    }
  }
  const versions = s.versions ?? []
  if (versions.length) {
    l.push('', 'Historique des versions envoyées :')
    for (const v of versions) {
      const issue = v.valide_le ? 'VALIDÉE le ' + dateLisible(v.valide_le) : v.correction_le ? 'correction demandée le ' + dateLisible(v.correction_le) + ' : « ' + v.correction.replace(/\n/g, ' ') + ' »' : 'sans réponse du client'
      l.push('  v' + v.version + ' — envoyée le ' + dateLisible(v.envoye_le) + ' — ' + issue)
    }
  }
  l.push('')
  if (b && b.valide_le) {
    l.push('Version validée         : ' + b.version_validee + ' (consentement ' + b.consentement_version + ')')
    l.push('DÉBUT DU DÉLAI DE 5 JOURS OUVRÉS : ' + dateLisible(b.valide_le))
  } else {
    l.push('Délai de 5 jours ouvrés : NON DÉMARRÉ (il démarre uniquement à la validation du brief par le client)')
  }
  return l.join('\n')
}

/**
 * Exécute une commande. `rpc(nom, params)` renvoie `{ data, error }` (client
 * Supabase service_role). `afficher` reçoit la sortie destinée à l'opérateur.
 * `fichiers` : { lire, ecrire, existe } (injectés pour les tests).
 */
export async function executer(args, {
  rpc, afficher, source = randomBytes, base = BASE_PAR_DEFAUT, racine = RACINE_DEPOT,
  fichiers = { lire: (c) => readFileSync(c, 'utf8'), ecrire: (c, t) => writeFileSync(c, t, { encoding: 'utf8', flag: 'wx', mode: 0o600 }), existe: existsSync },
}) {
  const [commande, reference, ...reste] = args
  if (!COMMANDES.includes(commande) || !RE_REFERENCE.test(reference ?? '')) {
    afficher(USAGE)
    return 2
  }

  const appeler = async (nom, params) => {
    const { data, error } = await rpc(nom, params)
    if (error) { afficher('Échec : erreur technique (' + (error.code ?? 'inconnue') + ').'); return null }
    if (data && data.error) {
      afficher('Refusé : ' + data.error + (data.statut ? ' (statut actuel : ' + data.statut + ')' : '') + (data.champ ? ' (section : ' + data.champ + ')' : ''))
      return null
    }
    return data
  }

  // ── Questionnaire et brief (LOT 3) ──
  if (commande === 'questionnaire') {
    const q = await appeler('music_admin_questionnaire', { p_reference: reference })
    if (!q) return 1
    afficher(afficherQuestionnaire(q))
    return 0
  }
  if (commande === 'brief-modele' || commande === 'brief') {
    if (!reste[0]) { afficher('Indiquez le fichier du brief : ' + commande + ' ' + reference + ' <fichier.txt>'); return 2 }
    const chemin = cheminHorsDepot(reste[0], racine)
    if (!chemin) { afficher('Refusé : le fichier du brief contient des données personnelles et doit rester hors du dépôt Git.'); return 2 }
    if (commande === 'brief-modele') {
      if (fichiers.existe(chemin)) { afficher('Refusé : le fichier existe déjà (aucun écrasement) : ' + chemin); return 2 }
      const q = await appeler('music_admin_questionnaire', { p_reference: reference })
      if (!q) return 1
      fichiers.ecrire(chemin, modeleBrief(q))
      afficher('Modèle de brief écrit : ' + chemin)
      afficher('Réécrivez-le, puis : node scripts/music-v0/admin.mjs brief ' + reference + ' "' + chemin + '"')
      return 0
    }
    if (!fichiers.existe(chemin)) { afficher('Fichier introuvable : ' + chemin); return 2 }
    const p = parserBrief(fichiers.lire(chemin))
    if (p.erreurs) { afficher('Brief non enregistré :\n- ' + p.erreurs.join('\n- ')); return 1 }
    const r = await appeler('music_admin_brief_enregistrer', { p_reference: reference, p_contenu: p.contenu })
    if (!r) return 1
    afficher('Brief enregistré — ' + reference + ', version ' + r.version + ' (brouillon interne, PAS encore envoyé au client).')
    afficher(afficherBrief(p.contenu))
    afficher('', 'Pour l\'envoyer au client : node scripts/music-v0/admin.mjs brief-envoyer ' + reference)
    return 0
  }
  if (commande === 'brief-envoyer') {
    const jeton = genererJeton(source)
    const r = await appeler('music_admin_brief_envoyer', { p_reference: reference, p_empreinte: empreinte(jeton) })
    if (!r) return 1
    afficher((r.reenvoi ? 'Brief renvoyé' : 'Brief envoyé') + ' — ' + reference + ', version ' + r.version + ' (tout lien précédent ne fonctionne plus).')
    afficher('Lien privé du résumé à envoyer au client (affiché une seule fois, valable jusqu\'au ' + dateLisible(r.expire_le) + ') :')
    afficher(construireLienResume(base, jeton))
    return 0
  }
  if (commande === 'suivi') {
    const s = await appeler('music_admin_brief_suivi', { p_reference: reference })
    if (!s) return 1
    afficher(afficherSuivi(s))
    return 0
  }

  // ── Paiement et lien (LOT 1) ──
  let jeton = null
  let nom, params
  if (commande === 'confirmer') {
    jeton = genererJeton(source)
    nom = 'music_confirmer_paiement'
    params = { p_reference: reference, p_ref_wave: reste.join(' ') || null, p_empreinte: empreinte(jeton) }
  } else if (commande === 'regenerer') {
    jeton = genererJeton(source)
    nom = 'music_regenerer_lien_questionnaire'
    params = { p_reference: reference, p_empreinte: empreinte(jeton) }
  } else if (commande === 'revoquer') {
    nom = 'music_revoquer_lien_questionnaire'
    params = { p_reference: reference }
  } else {
    nom = 'music_annuler_commande'
    params = { p_reference: reference, p_motif: reste.join(' ') || null }
  }

  const { data, error } = await rpc(nom, params)
  if (error) { afficher('Échec : erreur technique (' + (error.code ?? 'inconnue') + ').'); return 1 }
  if (data && data.error) { afficher('Refusé : ' + data.error + (data.statut ? ' (statut actuel : ' + data.statut + ')' : '')); return 1 }

  if (jeton) {
    afficher((commande === 'confirmer' ? 'Paiement confirmé — ' : 'Nouveau lien — ') + reference + ' (l\'ancien lien éventuel ne fonctionne plus).')
    afficher('Lien privé du questionnaire (affiché une seule fois, valable jusqu\'au ' + data.expire_le + ') :')
    afficher(construireLien(base, jeton))
  } else if (commande === 'revoquer') {
    afficher('Lien révoqué — ' + reference + '.')
  } else {
    afficher('Commande annulée — ' + reference + '.')
  }
  return 0
}

function lireEnv() {
  const env = { ...process.env }
  const fichier = resolve(RACINE_DEPOT, '.env.local')
  if (existsSync(fichier)) {
    for (const ligne of readFileSync(fichier, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(ligne)
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  }
  return env
}

async function principal() {
  const env = lireEnv()
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Configuration manquante : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (.env.local).')
    process.exit(2)
  }
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const code = await executer(process.argv.slice(2), {
    rpc: (nom, params) => client.rpc(nom, params),
    afficher: (texte) => console.log(texte),
    base: env.MUSIC_BASE_URL || BASE_PAR_DEFAUT,
  })
  process.exit(code)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().catch(() => { console.error('Échec : erreur inattendue.'); process.exit(1) })
}
