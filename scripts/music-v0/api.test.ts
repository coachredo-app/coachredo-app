// ============================================================
// Music V0 LOT 1 — tests OFFLINE de la création de commande
// ============================================================
// Script plain (aucun framework, aucune dépendance, aucun réseau, aucune
// base) — même discipline que scripts/mfr-benchmark. Exécution :
//   npx tsc -p scripts/music-v0/tsconfig.json && node <outDir>/scripts/music-v0/api.test.js
// La base est testée séparément : scripts/music-v0/run-db-test.sh.

import { randomBytes } from 'node:crypto'
import { validerCommande, RELATIONS, OCCASIONS } from '../../src/lib/music/commande'
import { originesAutorisees, origineAutorisee, ORIGINE_PAR_DEFAUT } from '../../src/lib/music/cors'
import { empreinteJeton, jetonBienForme } from '../../src/lib/music/jeton'
import { traiterCreationCommande, type DependancesCreation, type ResultatRpcCreation } from '../../src/lib/music/creationCommande'
import type { CommandeValidee } from '../../src/lib/music/commande'

let passes = 0
let echecs = 0
function ok(nom: string, cond: boolean) {
  if (cond) { passes++; console.log('PASS  ' + nom) } else { echecs++; console.log('ÉCHEC ' + nom) }
}

const MAINTENANT = new Date('2026-10-20T10:00:00Z')
const valide = {
  cle_idempotence: '3f2a1c9e-8b4d-4e6f-9a1b-2c3d4e5f6a7b',
  prenom: '  Awa  ',
  email: 'Awa@Exemple.SN',
  whatsapp_indicatif: '+221',
  whatsapp_numero: '77 123 45 67',
  relation: 'Mon père',
  relation_autre: '',
  beneficiaire_prenom: 'Moussa',
  occasion: 'Fête des pères',
  date_souhaitee: '2026-10-23',
  site_web: '',
}
const avec = (m: Record<string, unknown>) => ({ ...valide, ...m });

/* ── Validation ── */
{
  const r = validerCommande(valide, MAINTENANT)
  ok('commande valide acceptée et normalisée', r.ok && r.commande.prenom === 'Awa' && r.commande.email === 'awa@exemple.sn'
    && r.commande.whatsapp === '+221771234567' && r.commande.relationAutre === null && r.commande.dateSouhaitee === '2026-10-23')
  const sansDate = validerCommande(avec({ date_souhaitee: null }), MAINTENANT)
  ok('date souhaitée nullable (Pas de date précise)', sansDate.ok && sansDate.commande.dateSouhaitee === null)
  const autre = validerCommande(avec({ relation: 'Autre', relation_autre: 'Ma marraine' }), MAINTENANT)
  ok('relation Autre + précision acceptée', autre.ok && autre.commande.relationAutre === 'Ma marraine')
  const casInvalides: [string, Record<string, unknown>][] = [
    ['clé d’idempotence absente', { cle_idempotence: undefined }],
    ['clé d’idempotence mal formée', { cle_idempotence: 'abc' }],
    ['prénom vide', { prenom: '   ' }],
    ['prénom trop long', { prenom: 'x'.repeat(61) }],
    ['email invalide', { email: 'awa@' }],
    ['email trop long', { email: 'a'.repeat(250) + '@b.sn' }],
    ['indicatif invalide', { whatsapp_indicatif: '221' }],
    ['numéro trop court', { whatsapp_numero: '123' }],
    ['numéro non numérique', { whatsapp_numero: '77abc4567' }],
    ['relation hors liste', { relation: 'Mon voisin' }],
    ['Autre sans précision', { relation: 'Autre', relation_autre: '' }],
    ['précision trop longue', { relation: 'Autre', relation_autre: 'x'.repeat(81) }],
    ['bénéficiaire vide', { beneficiaire_prenom: '' }],
    ['bénéficiaire trop long', { beneficiaire_prenom: 'x'.repeat(61) }],
    ['occasion hors liste', { occasion: 'Bar-mitsva' }],
    ['date passée', { date_souhaitee: '2026-10-10' }],
    ['date impossible', { date_souhaitee: '2026-02-30' }],
    ['date mal formée', { date_souhaitee: '23/10/2026' }],
    ['date trop lointaine', { date_souhaitee: '2031-01-01' }],
    ['prénom non textuel', { prenom: 42 }],
  ]
  for (const [nom, m] of casInvalides) {
    const r2 = validerCommande(avec(m), MAINTENANT)
    ok('refus : ' + nom, !r2.ok && r2.raison === 'DONNEES_INVALIDES')
  }
  ok('refus : corps non objet', !validerCommande('x', MAINTENANT).ok && !validerCommande([valide], MAINTENANT).ok && !validerCommande(null, MAINTENANT).ok)
  const pot = validerCommande(avec({ site_web: 'http://spam.example' }), MAINTENANT)
  ok('honeypot rempli → refusé (raison HONEYPOT)', !pot.ok && pot.raison === 'HONEYPOT')
  ok('listes : 13 relations et 13 occasions (identiques à la landing)', RELATIONS.length === 13 && OCCASIONS.length === 13)
}

/* ── CORS ── */
{
  ok('origine par défaut = https://www.coachredo.com', JSON.stringify(originesAutorisees(undefined)) === JSON.stringify([ORIGINE_PAR_DEFAUT]))
  ok('variable d’environnement : https uniquement, sans barre finale', JSON.stringify(originesAutorisees(' https://a.example/, http://b.example ,ftp://c ')) === JSON.stringify(['https://a.example']))
  const o = originesAutorisees(undefined)
  ok('origine autorisée reconnue', origineAutorisee('https://www.coachredo.com', o))
  ok('origine non autorisée refusée (apex, autre domaine, http, absente)', !origineAutorisee('https://coachredo.com', o)
    && !origineAutorisee('https://evil.example', o) && !origineAutorisee('http://www.coachredo.com', o) && !origineAutorisee(null, o))
}

/* ── Jeton ── */
{
  ok('empreinte SHA-256 hexadécimale (vecteur connu, identique à sha256() SQL)', empreinteJeton('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  const j = randomBytes(32).toString('base64url')
  ok('format jeton : 32 octets aléatoires en base64url (43 caractères)', j.length === 43 && jetonBienForme(j))
  ok('format jeton : refus référence CRM, longueur ou alphabet invalides', !jetonBienForme('CRM-00005') && !jetonBienForme('A'.repeat(42)) && !jetonBienForme('A'.repeat(44)) && !jetonBienForme('A'.repeat(42) + '+') && !jetonBienForme('A'.repeat(42) + '='))
}

/* ── Traitement de la route ── */
async function scenarios() {
  const journal: string[] = []
  const appels: CommandeValidee[] = []
  const deps = (repondre: (c: CommandeValidee) => ResultatRpcCreation | Promise<ResultatRpcCreation>): DependancesCreation => ({
    originesAutorisees: [ORIGINE_PAR_DEFAUT],
    creer: async (c) => { appels.push(c); return repondre(c) },
    journaliser: (code) => journal.push(code),
    maintenant: () => MAINTENANT,
  })
  const base = { methode: 'POST', origine: ORIGINE_PAR_DEFAUT, typeContenu: 'application/json', corps: JSON.stringify(valide) }
  const refs = new Map<string, string>()
  let n = 4
  const rpcIdempotente = (c: CommandeValidee): ResultatRpcCreation => {
    const ex = refs.get(c.cleIdempotence)
    if (ex) return { reference: ex, existante: true }
    const ref = 'CRM-' + String(++n).padStart(5, '0'); refs.set(c.cleIdempotence, ref); return { reference: ref, existante: false }
  }

  let r = await traiterCreationCommande(base, deps(rpcIdempotente))
  ok('création : 201 + référence uniquement + en-têtes CORS', r.statut === 201 && JSON.stringify(r.corps) === '{"reference":"CRM-00005"}'
    && r.enTetes['Access-Control-Allow-Origin'] === ORIGINE_PAR_DEFAUT && r.enTetes.Vary === 'Origin')
  r = await traiterCreationCommande(base, deps(rpcIdempotente))
  ok('double soumission (même clé) : 200 + même référence', r.statut === 200 && (r.corps as { reference: string }).reference === 'CRM-00005')
  ok('la commande transmise à la RPC est normalisée', appels[0].whatsapp === '+221771234567' && appels[0].email === 'awa@exemple.sn')

  const avant = appels.length
  r = await traiterCreationCommande({ ...base, origine: 'https://evil.example' }, deps(rpcIdempotente))
  ok('origine non autorisée : 403, aucun en-tête CORS, RPC non appelée', r.statut === 403 && Object.keys(r.enTetes).length === 0 && appels.length === avant)
  r = await traiterCreationCommande({ ...base, origine: null }, deps(rpcIdempotente))
  ok('origine absente : 403', r.statut === 403 && appels.length === avant)
  r = await traiterCreationCommande({ ...base, methode: 'OPTIONS', corps: '' }, deps(rpcIdempotente))
  ok('préflight OPTIONS autorisé : 204 + méthodes/en-têtes', r.statut === 204 && r.corps === null && r.enTetes['Access-Control-Allow-Methods'] === 'POST, OPTIONS' && r.enTetes['Access-Control-Allow-Headers'] === 'Content-Type')
  r = await traiterCreationCommande({ ...base, methode: 'OPTIONS', origine: 'https://evil.example', corps: '' }, deps(rpcIdempotente))
  ok('préflight OPTIONS d’une autre origine : 403', r.statut === 403)
  r = await traiterCreationCommande({ ...base, methode: 'GET' }, deps(rpcIdempotente))
  ok('méthode GET : 405', r.statut === 405)
  r = await traiterCreationCommande({ ...base, typeContenu: 'text/plain' }, deps(rpcIdempotente))
  ok('type de contenu non JSON : 415', r.statut === 415 && appels.length === avant)
  r = await traiterCreationCommande({ ...base, corps: JSON.stringify(avec({ prenom: 'x'.repeat(5000) })) }, deps(rpcIdempotente))
  ok('corps > 4 Ko : 413', r.statut === 413 && appels.length === avant)
  r = await traiterCreationCommande({ ...base, corps: '{pas du json' }, deps(rpcIdempotente))
  ok('JSON invalide : 400', r.statut === 400)
  r = await traiterCreationCommande({ ...base, corps: JSON.stringify(avec({ email: 'faux' })) }, deps(rpcIdempotente))
  ok('donnée invalide : 400 générique, RPC non appelée', r.statut === 400 && JSON.stringify(r.corps) === '{"error":"DONNEES_INVALIDES"}' && appels.length === avant)
  r = await traiterCreationCommande({ ...base, corps: JSON.stringify(avec({ site_web: 'spam' })) }, deps(rpcIdempotente))
  ok('honeypot : 400 identique à une donnée invalide, RPC non appelée', r.statut === 400 && JSON.stringify(r.corps) === '{"error":"DONNEES_INVALIDES"}' && appels.length === avant)

  r = await traiterCreationCommande({ ...base, corps: JSON.stringify(avec({ cle_idempotence: '9f2a1c9e-8b4d-4e6f-9a1b-2c3d4e5f6a7b' })) }, deps(() => ({ erreur: 'DATE_PASSEE' })))
  ok('erreur métier RPC (DATE_PASSEE) : 400 générique', r.statut === 400)
  r = await traiterCreationCommande(base, deps(() => ({ erreur: 'RPC_42501' })))
  ok('erreur technique RPC : 500 générique', r.statut === 500 && JSON.stringify(r.corps) === '{"error":"ERREUR_SERVEUR"}')
  r = await traiterCreationCommande(base, deps(() => { throw new Error('réseau awa@exemple.sn +221771234567') }))
  ok('exception RPC : 500 générique', r.statut === 500)
  r = await traiterCreationCommande(base, deps(() => ({ reference: 'CRM-5', existante: false })))
  ok('référence inattendue renvoyée par la base : 500 (jamais transmise au client)', r.statut === 500)

  const tout = journal.join(' ')
  ok('journaux : codes techniques uniquement, aucune coordonnée ni donnée personnelle',
    journal.length > 0 && !/awa|exemple|221|77 ?123|Moussa|Fête/i.test(tout) && journal.every((c) => /^music\.commande\.[a-z_.A-Z0-9]+$/.test(c)))
}

scenarios().then(() => {
  console.log(`\n${passes}/${passes + echecs} PASS`)
  if (echecs > 0) process.exit(1)
})
