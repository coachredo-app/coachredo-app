#!/usr/bin/env node
// ============================================================
// Music V0 — commande d'administration locale (LOT 1, D-058)
// ============================================================
// Usage (depuis la racine de coachredo-app, .env.local présent) :
//   node scripts/music-v0/admin.mjs confirmer CRM-00005 <référence Wave>
//   node scripts/music-v0/admin.mjs regenerer CRM-00005
//   node scripts/music-v0/admin.mjs revoquer  CRM-00005
//   node scripts/music-v0/admin.mjs annuler   CRM-00005 [motif]
//
// « confirmer » : à lancer UNIQUEMENT après avoir vérifié la réception du
// paiement dans Wave. Le jeton du lien privé est généré ici par
// crypto.randomBytes(32) (256 bits, base64url), seule son empreinte SHA-256
// est envoyée à la base, et le lien complet est affiché UNE SEULE FOIS.
// Rien n'est écrit dans un fichier ni journalisé.
//
// Variables lues dans l'environnement ou .env.local (jamais affichées) :
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Base du lien : https://www.coachredo.app (MUSIC_BASE_URL pour une autre base).

import { randomBytes, createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

export const OCTETS_JETON = 32
export const BASE_PAR_DEFAUT = 'https://www.coachredo.app'
const RE_REFERENCE = /^CRM-\d{5}$/

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

/**
 * Exécute une commande. `rpc(nom, params)` renvoie `{ data, error }` (client
 * Supabase service_role). `afficher` reçoit la sortie destinée à l'opérateur.
 */
export async function executer(args, { rpc, afficher, source = randomBytes, base = BASE_PAR_DEFAUT }) {
  const [commande, reference, ...reste] = args
  if (!['confirmer', 'regenerer', 'revoquer', 'annuler'].includes(commande) || !RE_REFERENCE.test(reference ?? '')) {
    afficher('Usage : node scripts/music-v0/admin.mjs <confirmer|regenerer|revoquer|annuler> CRM-XXXXX [référence Wave | motif]')
    return 2
  }

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
  const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const env = { ...process.env }
  const fichier = resolve(racine, '.env.local')
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
