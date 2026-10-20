// Tests hors ligne de la commande d'administration Music V0 (aucun réseau,
// aucune base). Exécution : node scripts/music-v0/admin.test.mjs
import { randomBytes, createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { genererJeton, empreinte, construireLien, executer, OCTETS_JETON } from './admin.mjs'

let reussis = 0, echecs = 0
const ok = (nom, cond, detail = '') => { if (cond) { reussis++; console.log('PASS ', nom) } else { echecs++; console.log('ÉCHEC', nom, detail) } }

/* ── Génération : crypto.randomBytes, au moins 32 octets ── */
const appels = []
const espion = (n) => { appels.push(n); return randomBytes(n) }
const j = genererJeton(espion)
ok('genererJeton appelle la source d’aléa (randomBytes par défaut) avec 32 octets', appels.length === 1 && appels[0] === 32 && OCTETS_JETON >= 32, JSON.stringify(appels))
ok('jeton = 32 octets encodés base64url (43 caractères, sans remplissage)', /^[A-Za-z0-9_-]{43}$/.test(j) && Buffer.from(j, 'base64url').length === 32)
const src = readFileSync(new URL('./admin.mjs', import.meta.url), 'utf8')
ok('source par défaut = crypto.randomBytes (aucun UUID, aucun Math.random)', /import \{ randomBytes, createHash \} from 'node:crypto'/.test(src) && /genererJeton\(source = randomBytes\)/.test(src) && !/randomUUID|gen_random_uuid|Math\.random/.test(src))
ok('aléa insuffisant refusé', (() => { try { genererJeton(() => Buffer.alloc(31)); return false } catch (e) { return e.message === 'ALEA_INSUFFISANT' } })())
const lot = new Set(Array.from({ length: 1000 }, () => genererJeton()))
ok('1000 jetons générés : tous distincts', lot.size === 1000)

/* ── Empreinte et lien ── */
ok('empreinte = SHA-256 hexadécimale (vecteur connu, identique à sha256() SQL et jeton.ts)', empreinte('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
ok('lien : /fr/music/questionnaire#t=<jeton>', construireLien('https://www.coachredo.app/', 'ABC') === 'https://www.coachredo.app/fr/music/questionnaire#t=ABC')

/* ── Commandes : seule l’empreinte part vers la base ── */
const faux = (reponse) => {
  const envois = []
  return { envois, rpc: async (nom, params) => { envois.push({ nom, params }); return reponse(nom, params) } }
}
const sortie = []
const afficher = (t) => sortie.push(t)
{
  const f = faux(() => ({ data: { reference: 'CRM-00005', statut: 'PAYÉE', expire_le: '2026-12-19T10:00:00Z' }, error: null }))
  const code = await executer(['confirmer', 'CRM-00005', 'WAVE-TX', '123'], { rpc: f.rpc, afficher })
  const lien = sortie.find((t) => t.includes('#t='))
  const jeton = lien && lien.split('#t=')[1]
  const envoye = JSON.stringify(f.envois)
  ok('confirmer : appelle music_confirmer_paiement(référence, réf. Wave, empreinte)', code === 0 && f.envois.length === 1 && f.envois[0].nom === 'music_confirmer_paiement' && f.envois[0].params.p_reference === 'CRM-00005' && f.envois[0].params.p_ref_wave === 'WAVE-TX 123', envoye)
  ok('confirmer : l’empreinte envoyée = SHA-256 du jeton affiché ; le jeton en clair n’est jamais envoyé', !!jeton && f.envois[0].params.p_empreinte === createHash('sha256').update(jeton, 'utf8').digest('hex') && !envoye.includes(jeton))
  ok('confirmer : lien complet affiché une seule fois', sortie.filter((t) => t.includes('#t=')).length === 1 && lien === 'https://www.coachredo.app/fr/music/questionnaire#t=' + jeton && /^[A-Za-z0-9_-]{43}$/.test(jeton))
}
{
  sortie.length = 0
  const f = faux(() => ({ data: { error: 'STATUT_INCOMPATIBLE', statut: 'PAYÉE' }, error: null }))
  const code = await executer(['confirmer', 'CRM-00005'], { rpc: f.rpc, afficher })
  ok('confirmer refusé (double confirmation) : code 1, aucun lien affiché', code === 1 && !sortie.some((t) => t.includes('#t=')) && sortie.some((t) => t.includes('STATUT_INCOMPATIBLE')))
}
{
  sortie.length = 0
  const f = faux(() => ({ data: null, error: { code: 'PGRST', message: 'détail interne' } }))
  const code = await executer(['regenerer', 'CRM-00005'], { rpc: f.rpc, afficher })
  ok('erreur technique : aucun lien affiché, pas de détail interne', code === 1 && !sortie.some((t) => t.includes('#t=') || t.includes('détail interne')))
}
{
  sortie.length = 0
  const f = faux(() => ({ data: { reference: 'CRM-00005', expire_le: 'x' }, error: null }))
  await executer(['regenerer', 'CRM-00005'], { rpc: f.rpc, afficher })
  const e1 = f.envois[0].params.p_empreinte
  await executer(['regenerer', 'CRM-00005'], { rpc: f.rpc, afficher })
  ok('regenerer : nouveau jeton à chaque fois, seule l’empreinte envoyée', f.envois.every((x) => x.nom === 'music_regenerer_lien_questionnaire' && /^[0-9a-f]{64}$/.test(x.params.p_empreinte) && Object.keys(x.params).join() === 'p_reference,p_empreinte') && e1 !== f.envois[1].params.p_empreinte)
}
{
  sortie.length = 0
  const f = faux(() => ({ data: { reference: 'CRM-00005', lien_revoque: true }, error: null }))
  const code = await executer(['revoquer', 'CRM-00005'], { rpc: f.rpc, afficher })
  ok('revoquer : appelle music_revoquer_lien_questionnaire, aucun jeton généré', code === 0 && f.envois[0].nom === 'music_revoquer_lien_questionnaire' && !sortie.some((t) => t.includes('#t=')))
}
{
  sortie.length = 0
  const f = faux(() => ({ data: {}, error: null }))
  const c1 = await executer(['confirmer', 'crm-5'], { rpc: f.rpc, afficher })
  const c2 = await executer(['supprimer', 'CRM-00005'], { rpc: f.rpc, afficher })
  ok('référence ou commande invalide : usage affiché, aucun appel à la base', c1 === 2 && c2 === 2 && f.envois.length === 0)
}

console.log(`\n${reussis}/${reussis + echecs} PASS`)
process.exit(echecs ? 1 : 0)
