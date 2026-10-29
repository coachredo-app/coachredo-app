// ============================================================
// Music V0 LOT 3 — tests OFFLINE du brief client (API /api/music/resume)
// ============================================================
// Script plain (aucun framework, aucun réseau, aucune base). Exécution
// depuis la racine du dépôt :
//   npx tsc -p scripts/music-v0/tsconfig.json --outDir <dossier temporaire>
//   node <dossier temporaire>/scripts/music-v0/brief.test.js
// La base est testée séparément : scripts/music-v0/run-db-test.sh.

import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { RECIT_BRIEF, SECTIONS_BRIEF, TEXTE_VALIDATION_BRIEF, VALIDATION_BRIEF_VERSION, recitAffichable, sectionsAffichables, validerCorrection } from '../../src/lib/music/brief'
import { ORIGINES_RESUME, traiterBrief, type DependancesBrief } from '../../src/lib/music/briefApi'
import type { ResultatRpc } from '../../src/lib/music/questionnaireApi'

let passes = 0
let echecs = 0
function ok(nom: string, cond: boolean, detail = '') {
  if (cond) { passes++; console.log('PASS  ' + nom) } else { echecs++; console.log('ÉCHEC ' + nom + (detail ? '  ' + detail : '')) }
}

const CONTENU = {
  destinataire: 'Fatou', relation: 'Ma mère', occasion: 'Anniversaire', de_la_part: 'Ses enfants',
  histoire: 'Les dimanches au marché.', details: 'Surnom : Yaay', message: 'Merci.', emotions: 'Se sentir aimée',
  direction_musicale: 'Douce, voix féminine.', points_particuliers: '',
}

/* ── Sections, textes, correction ── */
{
  const json = JSON.parse(readFileSync(join(process.cwd(), 'src/lib/music/brief-sections.json'), 'utf8')) as { cle: string }[]
  ok('10 sections, ordre et clés de brief-sections.json', SECTIONS_BRIEF.length === 10 && JSON.stringify(SECTIONS_BRIEF.map((s) => s.cle)) === JSON.stringify(json.map((s) => s.cle)))
  ok('sections minimales du GO présentes', ['destinataire', 'relation', 'occasion', 'de_la_part', 'histoire', 'details', 'message', 'emotions', 'direction_musicale', 'points_particuliers'].every((k) => SECTIONS_BRIEF.some((s) => s.cle === k)))
  const migration = readFileSync(join(process.cwd(), 'supabase/migrations/022_music_v0_brief.sql'), 'utf8')
  ok('migration 022 : miroir exact des sections (clé, obligatoire, max)', SECTIONS_BRIEF.every((s) => migration.includes(`{"cle": "${s.cle}", "requis": ${s.requis}, "max": ${s.max}}`)))
  ok('texte de validation EXACT', TEXTE_VALIDATION_BRIEF === 'Je confirme que ce résumé correspond à ma demande et que les prénoms, souvenirs, informations et préférences indiqués sont corrects. J’autorise CoachRedo Music à commencer la création de ma chanson.')
  const aff = sectionsAffichables(CONTENU)
  ok('sections affichables : ordre officiel, sections vides omises, titres humains', !!aff && aff.length === 9 && aff[0].titre === 'Pour qui' && !aff.some((x) => x.cle === 'points_particuliers'))
  ok('sections affichables : clé inconnue jamais affichée', !JSON.stringify(sectionsAffichables({ ...CONTENU, paroles: 'secret' })).includes('secret'))
  ok('sections affichables : section obligatoire manquante → rien affiché', sectionsAffichables({ ...CONTENU, message: '' }) === null && sectionsAffichables('x') === null)
  // Récit client (migration 029)
  const recitJson = JSON.parse(readFileSync(join(process.cwd(), 'src/lib/music/brief-recit.json'), 'utf8')) as { cle: string; requis: boolean; max: number }
  ok('récit : brief-recit.json = RECIT_BRIEF (clé recit, facultatif, 6000)', RECIT_BRIEF.cle === 'recit' && RECIT_BRIEF.requis === false && RECIT_BRIEF.max === 6000 && JSON.stringify(recitJson) === JSON.stringify(RECIT_BRIEF))
  const m029 = readFileSync(join(process.cwd(), 'supabase/migrations/029_music_brief_recit_narratif.sql'), 'utf8')
  ok('migration 029 : miroir exact des 10 sections + récit', [...SECTIONS_BRIEF, RECIT_BRIEF].every((x) => m029.includes(`{"cle": "${x.cle}", "requis": ${x.requis}, "max": ${x.max}}`)) && (m029.match(/"cle":/g) ?? []).length === 11)
  ok('récit : absent, vide, non textuel → null (sections affichées)', recitAffichable(CONTENU) === null && recitAffichable({ ...CONTENU, recit: '   ' }) === null && recitAffichable({ ...CONTENU, recit: 42 }) === null && recitAffichable('x') === null && recitAffichable(null) === null)
  ok('récit : texte rogné, jamais plus long que la limite', recitAffichable({ ...CONTENU, recit: '  Il était une fois.  ' }) === 'Il était une fois.' && recitAffichable({ ...CONTENU, recit: 'a'.repeat(7000) })?.length === 6000)
  ok('sections affichables : le récit n’est jamais une section', !sectionsAffichables({ ...CONTENU, recit: 'Récit' })!.some((x) => x.cle === 'recit') && sectionsAffichables({ ...CONTENU, recit: 'Récit' })!.length === 9)
  ok('correction : texte normalisé 1–2000 caractères', validerCorrection('  Le prénom est Fatou Binetou.  ') === 'Le prénom est Fatou Binetou.' && validerCorrection('   ') === null && validerCorrection('a'.repeat(2001)) === null && validerCorrection(42) === null)
}

/* ── API ── */
const ORIGINE = 'https://www.coachredo.app'
const JETON = randomBytes(32).toString('base64url')
const EMPREINTE = createHash('sha256').update(JETON, 'utf8').digest('hex')

type Appel = { fn: string; empreinte: string; version?: number; texte?: string }
function fausseBase(initial: Partial<{ etat: string; version: number; correction: string | null }> = {}, opts: { lever?: boolean; reponse?: ResultatRpc; contenu?: Record<string, unknown> } = {}) {
  const e = { etat: 'a_valider', version: 2, correction: null as string | null, valide_le: null as string | null, ...initial }
  const appels: Appel[] = []
  const logs: string[] = []
  const deps: DependancesBrief = {
    originesAutorisees: ORIGINES_RESUME,
    journaliser: (c) => logs.push(c),
    charger: async (empreinte) => {
      appels.push({ fn: 'charger', empreinte })
      if (opts.lever) throw new Error('panne ' + JETON)
      if (opts.reponse) return opts.reponse
      if (empreinte !== EMPREINTE) return { erreur: 'LIEN_INVALIDE' }
      if (e.etat === 'en_preparation') return { data: { etat: 'en_preparation' } }
      return { data: { etat: e.etat, version: e.version, contenu: { ...(opts.contenu ?? CONTENU), paroles_internes: 'x' }, correction: e.correction, correction_le: e.correction ? '2026-10-21T09:00:00Z' : null, valide_le: e.valide_le, reference: 'CRM-00005', email: 'fuite@exemple.sn' } }
    },
    corriger: async (empreinte, version, texte) => {
      appels.push({ fn: 'corriger', empreinte, version, texte })
      if (empreinte !== EMPREINTE) return { erreur: 'LIEN_INVALIDE' }
      if (e.etat === 'valide') return { erreur: 'DEJA_VALIDE' }
      if (version !== e.version) return { erreur: 'VERSION_PERIMEE' }
      if (e.etat === 'correction_demandee') return { erreur: 'CORRECTION_DEJA_DEMANDEE' }
      e.etat = 'correction_demandee'; e.correction = texte
      return { data: { version, correction_le: '2026-10-21T09:00:00Z' } }
    },
    valider: async (empreinte, version, cv) => {
      appels.push({ fn: 'valider', empreinte, version, texte: cv })
      if (empreinte !== EMPREINTE) return { erreur: 'LIEN_INVALIDE' }
      if (e.etat === 'valide') return { erreur: 'DEJA_VALIDE' }
      if (version !== e.version) return { erreur: 'VERSION_PERIMEE' }
      if (e.etat === 'correction_demandee') return { erreur: 'CORRECTION_DEJA_DEMANDEE' }
      e.etat = 'valide'; e.valide_le = '2026-10-21T10:00:00Z'
      return { data: { version, valide_le: e.valide_le, statut: 'BRIEF_VALIDÉ' } }
    },
  }
  return { deps, appels, logs, e }
}
const req = (corps: unknown, extra: Partial<{ methode: string; origine: string | null; typeContenu: string | null }> = {}) => ({
  methode: extra.methode ?? 'POST',
  origine: extra.origine === undefined ? ORIGINE : extra.origine,
  typeContenu: extra.typeContenu === undefined ? 'application/json' : extra.typeContenu,
  corps: typeof corps === 'string' ? corps : JSON.stringify(corps),
})

// ── Rappel CGV / confidentialité à la validation (B+C) ──
{
  ok('validation : texte et version de consentement inchangés (brief-v0-2026-10)', VALIDATION_BRIEF_VERSION === 'brief-v0-2026-10')
  const page = readFileSync(join(process.cwd(), 'src/app/[locale]/music/resume/ResumeMusic.tsx'), 'utf8')
  ok('page : rappel des conséquences de la validation avec liens CGV et confidentialité',
    page.includes('data-rappel-cgv') && page.includes('href={URL_CGV}') && page.includes('href={URL_CONFIDENTIALITE}'))
  ok('page : rappel « changement d’avis » et « nouvelle commande »', page.includes('changement d’avis') && page.includes('nouvelle commande'))
}

async function testsApi() {
  // Lecture client
  {
    const b = fausseBase()
    const r = await traiterBrief(req({ action: 'charger', jeton: JETON }), b.deps)
    const c = r.corps as { etat: string; version: number; sections: { cle: string; titre: string; texte: string }[] }
    ok('charger : 200, état à valider, version, sections humaines', r.statut === 200 && c.etat === 'a_valider' && c.version === 2 && c.sections.length === 9 && c.sections[0].texte === 'Fatou')
    ok('charger : aucune information administrative ni coordonnée relayée', !/CRM-|fuite@|paroles_internes|reference|email/.test(JSON.stringify(r.corps)))
    ok('charger : seule l’empreinte SHA-256 transmise à la base', b.appels[0].empreinte === EMPREINTE)
    const p = fausseBase({ etat: 'en_preparation' })
    const rp = await traiterBrief(req({ action: 'charger', jeton: JETON }), p.deps)
    ok('charger : brief non envoyé → « en préparation », aucun contenu', rp.statut === 200 && JSON.stringify(rp.corps) === '{"etat":"en_preparation"}')
    const inattendu = fausseBase({}, { reponse: { data: { etat: 'a_valider', version: 1, contenu: { destinataire: 'x' } } } })
    ok('charger : contenu incomplet inattendu → 500 générique, jamais affiché', (await traiterBrief(req({ action: 'charger', jeton: JETON }), inattendu.deps)).statut === 500)
  }
  // Récit client : seul le récit est envoyé, la fiche interne ne quitte pas le serveur
  {
    const RECIT = 'Il était une fois une maman.\n\nElle aimait le marché du dimanche.'
    for (const etat of ['a_valider', 'correction_demandee', 'valide']) {
      const b = fausseBase({ etat, correction: etat === 'correction_demandee' ? 'Plus court.' : null }, { contenu: { ...CONTENU, recit: RECIT } })
      const r = await traiterBrief(req({ action: 'charger', jeton: JETON }), b.deps)
      const c = r.corps as Record<string, unknown>
      const brut = JSON.stringify(r.corps)
      const fuite = Object.entries(CONTENU).filter(([, v]) => v !== '' && brut.includes(JSON.stringify(v).slice(1, -1)))
      ok(`récit (${etat}) : 200, récit seul, aucune section`, r.statut === 200 && c.recit === RECIT && !('sections' in c) && c.etat === etat && c.version === 2)
      ok(`récit (${etat}) : aucun texte de la fiche interne dans la réponse`, fuite.length === 0 && !brut.includes('paroles_internes') && !/CRM-|fuite@|email/.test(brut), JSON.stringify(fuite))
    }
    const vide = fausseBase({}, { contenu: { ...CONTENU, recit: '   ' } })
    const rv = await traiterBrief(req({ action: 'charger', jeton: JETON }), vide.deps)
    ok('récit vide → comportement historique (sections, pas de récit)', rv.statut === 200 && !('recit' in (rv.corps as object)) && ((rv.corps as { sections: unknown[] }).sections.length === 9))
    const sansFiche = fausseBase({}, { contenu: { recit: 'Récit seul' } })
    ok('récit sans fiche interne complète → 500 générique, rien affiché', (await traiterBrief(req({ action: 'charger', jeton: JETON }), sansFiche.deps)).statut === 500)
    const b = fausseBase({}, { contenu: { ...CONTENU, recit: RECIT } })
    ok('récit : correction et validation inchangées (même version)', (await traiterBrief(req({ action: 'corriger', jeton: JETON, version: 2, correction: 'Plus court.' }), b.deps)).statut === 200
      && b.appels.some((a) => a.fn === 'corriger' && a.version === 2) && (await traiterBrief(req({ action: 'valider', jeton: JETON, version: 2, consentement: true }), b.deps)).statut === 409)
  }
  // Jetons et CRM refusés
  {
    let uniformes = true; let aucunAppel = true
    for (const j of ['', 'court', 'A'.repeat(42), 'A'.repeat(44), 'A'.repeat(42) + '=', 'CRM-00005', EMPREINTE, null, 7]) {
      const b = fausseBase()
      const r = await traiterBrief(req({ action: 'charger', jeton: j }), b.deps)
      if (r.statut !== 404 || JSON.stringify(r.corps) !== '{"error":"LIEN_INVALIDE"}') uniformes = false
      if (b.appels.length) aucunAppel = false
    }
    ok('jeton mal formé / CRM seul / empreinte brute : 404 LIEN_INVALIDE uniforme, aucun appel base', uniformes && aucunAppel)
    const b = fausseBase()
    const inconnu = await traiterBrief(req({ action: 'valider', jeton: randomBytes(32).toString('base64url'), version: 2, consentement: true }), b.deps)
    ok('jeton inconnu / expiré / révoqué : 404 LIEN_INVALIDE', inconnu.statut === 404 && JSON.stringify(inconnu.corps) === '{"error":"LIEN_INVALIDE"}')
  }
  // Origine : liste fixe du lot 2
  {
    ok('origines = exactement celles du questionnaire (https://coachredo.app, https://www.coachredo.app)', JSON.stringify(ORIGINES_RESUME) === '["https://coachredo.app","https://www.coachredo.app"]')
    let refus = true
    for (const o of ['https://evil.example', 'https://coachredo.app.evil.example', 'null', '', null, 'http://www.coachredo.app', 'http://localhost:3000']) {
      const b = fausseBase()
      const r = await traiterBrief(req({ action: 'charger', jeton: JETON }, { origine: o }), b.deps)
      if (r.statut !== 403 || b.appels.length) refus = false
    }
    ok('origine arbitraire, ressemblante, null, vide, absente, http, localhost : 403 sans appel base', refus)
    const route = readFileSync(join(process.cwd(), 'src/app/api/music/resume/route.ts'), 'utf8')
    ok('route : ORIGINES_RESUME fixe, aucune origine dérivée de Host / request.url / env', /originesAutorisees: ORIGINES_RESUME,/.test(route) && !/request\.url|headers\.get\('host'\)|process\.env/.test(route))
  }
  // Correction
  {
    const b = fausseBase()
    ok('correction vide refusée (400), rien envoyé', (await traiterBrief(req({ action: 'corriger', jeton: JETON, version: 2, correction: '   ' }), b.deps)).statut === 400 && b.appels.length === 0)
    ok('correction > 2000 caractères refusée', (await traiterBrief(req({ action: 'corriger', jeton: JETON, version: 2, correction: 'a'.repeat(2001) }), b.deps)).statut === 400)
    ok('version absente / invalide refusée', (await traiterBrief(req({ action: 'corriger', jeton: JETON, correction: 'x' }), b.deps)).statut === 400
      && (await traiterBrief(req({ action: 'corriger', jeton: JETON, version: '2', correction: 'x' }), b.deps)).statut === 400
      && (await traiterBrief(req({ action: 'corriger', jeton: JETON, version: 0, correction: 'x' }), b.deps)).statut === 400 && b.appels.length === 0)
    const r = await traiterBrief(req({ action: 'corriger', jeton: JETON, version: 2, correction: '  Le prénom est Fatou Binetou. ' }), b.deps)
    ok('correction : 200, feedback normalisé transmis avec la version affichée', r.statut === 200 && b.appels[0].fn === 'corriger' && b.appels[0].version === 2 && b.appels[0].texte === 'Le prénom est Fatou Binetou.')
    const lu = await traiterBrief(req({ action: 'charger', jeton: JETON }), b.deps)
    ok('après correction : état « correction demandée », texte relu', (lu.corps as { etat: string; correction: string }).etat === 'correction_demandee' && (lu.corps as { correction: string }).correction === 'Le prénom est Fatou Binetou.')
    ok('après correction : validation refusée (409)', (await traiterBrief(req({ action: 'valider', jeton: JETON, version: 2, consentement: true }), b.deps)).statut === 409 && b.e.etat === 'correction_demandee')
    ok('deuxième correction sur la même version refusée (409)', (await traiterBrief(req({ action: 'corriger', jeton: JETON, version: 2, correction: 'encore' }), b.deps)).statut === 409)
  }
  // Validation
  {
    const b = fausseBase()
    const sans = await traiterBrief(req({ action: 'valider', jeton: JETON, version: 2 }), b.deps)
    const faux = await traiterBrief(req({ action: 'valider', jeton: JETON, version: 2, consentement: 'oui' }), b.deps)
    ok('validation sans consentement (absent ou ≠ true) : 400 CONSENTEMENT_REQUIS, rien envoyé', sans.statut === 400 && (sans.corps as { error: string }).error === 'CONSENTEMENT_REQUIS' && faux.statut === 400 && b.appels.length === 0)
    const ancienne = await traiterBrief(req({ action: 'valider', jeton: JETON, version: 1, consentement: true }), b.deps)
    ok('ancienne version (1) : 409 VERSION_PERIMEE, pas de validation', ancienne.statut === 409 && (ancienne.corps as { error: string }).error === 'VERSION_PERIMEE' && b.e.etat === 'a_valider')
    const r = await traiterBrief(req({ action: 'valider', jeton: JETON, version: 2, consentement: true }), b.deps)
    ok('validation : 200, valide_le, version et version de consentement fixées par le serveur', r.statut === 200 && (r.corps as { valide_le: string }).valide_le === '2026-10-21T10:00:00Z' && b.appels.at(-1)?.version === 2 && b.appels.at(-1)?.texte === VALIDATION_BRIEF_VERSION)
    const encore = await traiterBrief(req({ action: 'valider', jeton: JETON, version: 2, consentement: true }), b.deps)
    const corr = await traiterBrief(req({ action: 'corriger', jeton: JETON, version: 2, correction: 'nouveau souvenir' }), b.deps)
    ok('après validation : 2e validation et correction refusées (409 DEJA_VALIDE)', encore.statut === 409 && corr.statut === 409 && (corr.corps as { error: string }).error === 'DEJA_VALIDE')
    const lu = await traiterBrief(req({ action: 'charger', jeton: JETON }), b.deps)
    ok('après validation : lecture seule, date de validation (départ des 5 jours ouvrés)', (lu.corps as { etat: string; valide_le: string }).etat === 'valide' && (lu.corps as { valide_le: string }).valide_le === '2026-10-21T10:00:00Z')
    const avant = fausseBase()
    const luAvant = await traiterBrief(req({ action: 'charger', jeton: JETON }), avant.deps)
    ok('avant validation : aucune date de départ du délai renvoyée', (luAvant.corps as { valide_le: unknown }).valide_le === null)
  }
  // Protocole, erreurs, non-fuite
  {
    const b = fausseBase()
    ok('méthode ≠ POST : 405', (await traiterBrief(req({}, { methode: 'GET' }), b.deps)).statut === 405)
    ok('type non JSON : 415', (await traiterBrief(req({ action: 'charger', jeton: JETON }, { typeContenu: 'text/plain' }), b.deps)).statut === 415)
    ok('corps > 40 Ko : 413', (await traiterBrief(req({ action: 'corriger', jeton: JETON, version: 2, correction: 'a'.repeat(41000) }), b.deps)).statut === 413)
    ok('JSON invalide, action inconnue, clé inattendue : 400', (await traiterBrief(req('{x'), b.deps)).statut === 400
      && (await traiterBrief(req({ action: 'supprimer', jeton: JETON }), b.deps)).statut === 400
      && (await traiterBrief(req({ action: 'valider', jeton: JETON, version: 2, consentement: true, statut: 'BRIEF_VALIDÉ' }), b.deps)).statut === 400)
    ok('aucun appel base pour ces refus', b.appels.length === 0)
    const p = fausseBase({}, { lever: true })
    const r = await traiterBrief(req({ action: 'charger', jeton: JETON }), p.deps)
    ok('exception (message contenant le jeton) : 500 générique', r.statut === 500 && JSON.stringify(r.corps) === '{"error":"ERREUR_SERVEUR"}')
    const tous: string[] = [...b.logs, ...p.logs]
    for (const corps of [{ action: 'charger', jeton: 'x' }, { action: 'valider', jeton: JETON, version: 1, consentement: true }, { action: 'corriger', jeton: JETON, version: 2, correction: '' }, { action: 'valider', jeton: JETON, version: 2 }]) {
      const bb = fausseBase()
      await traiterBrief(req(corps), bb.deps)
      tous.push(...bb.logs)
    }
    ok('journaux : codes « music.resume.* » uniquement', tous.length > 0 && tous.every((l) => /^music\.resume\.[a-z_]+$/.test(l)), JSON.stringify(tous))
    ok('journaux et réponses : jamais le jeton ni l’empreinte', !tous.join().includes(JETON) && !tous.join().includes(EMPREINTE) && !JSON.stringify(r.corps).includes(JETON))
  }
}

testsApi().then(() => {
  console.log(`\n${passes}/${passes + echecs} PASS`)
  process.exit(echecs ? 1 : 0)
})
