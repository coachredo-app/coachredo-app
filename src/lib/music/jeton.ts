// ============================================================
// Music V0 — empreinte des jetons de lien privé (D-058)
// ============================================================
// Les jetons sont générés UNIQUEMENT côté serveur Node par
// `crypto.randomBytes(32)` (256 bits), encodés en base64url (43 caractères),
// par la commande d'administration scripts/music-v0/admin.mjs. Le jeton en
// clair n'est jamais stocké : seule son empreinte SHA-256 (hexadécimal)
// l'est. La future route du questionnaire (LOT 2) calcule l'empreinte ici,
// puis appelle `music_resoudre_jeton_questionnaire`.

import { createHash } from 'node:crypto'

/** 32 octets en base64url sans remplissage = 43 caractères. */
const RE_JETON = /^[A-Za-z0-9_-]{43}$/

export function jetonBienForme(jeton: unknown): jeton is string {
  return typeof jeton === 'string' && RE_JETON.test(jeton)
}

export function empreinteJeton(jeton: string): string {
  return createHash('sha256').update(jeton, 'utf8').digest('hex')
}
