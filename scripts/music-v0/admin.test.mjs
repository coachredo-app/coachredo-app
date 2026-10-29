// Tests hors ligne de la commande d'administration Music V0 (aucun réseau,
// aucune base). Exécution : node scripts/music-v0/admin.test.mjs
import { randomBytes, createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { genererJeton, empreinte, construireLien, executer, OCTETS_JETON, afficherQuestionnaire, modeleBrief, parserBrief, cheminHorsDepot, afficherSuivi, dateLisible, SECTIONS_BRIEF, RECIT_BRIEF, afficherBrief, RACINE_DEPOT } from './admin.mjs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

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

/* ══ LOT 3 — questionnaire, brief, suivi ══ */
const Q = {
  reference: 'CRM-00005', statut: 'QUESTIONNAIRE_REÇU', client_prenom: 'Awa', beneficiaire_prenom: 'Fatou', relation: 'Ma mère', relation_autre: null, occasion: 'Anniversaire',
  envoye_le: '2026-10-20T18:30:00Z', consentement_le: '2026-10-20T18:30:00Z', consentement_version: 'v0-2026-10',
  responses: {
    etape_courante: 8,
    etape1: { de_la_part: 'Plusieurs personnes', de_la_part_qui: 'Ses enfants Awa et Moussa' },
    etape2: { souvenir_principal: 'Les dimanches au marché de Sandaga.', souvenirs_supplementaires: ['Son thiéboudienne du vendredi.'] },
    etape3: { expression: '', surnom: 'Yaay', habitude: '', lieu: 'Rufisque', chose_aimee: '', tradition: '', autre: '' },
    etape4: { message: 'Merci pour ta force.', emotions: ['Se sentir aimé(e)', 'Ressentir de la fierté'], emotion_principale: 'Se sentir aimé(e)', emotion_autre: '' },
    etape5: { ambiance: 'Douce et émouvante', style: 'Autre', style_autre: 'Mbalax doux', voix: 'Féminine' },
    etape6: { a_inspiration: 'Oui', titre_artiste: 'Titre — Artiste', lien: 'https://youtu.be/abc', aspects: ['La voix', 'Autre'], aspect_autre: 'les chœurs' },
  },
}
{
  const t = afficherQuestionnaire(Q)
  const attendus = ['CRM-00005', 'Fatou', 'Ma mère', 'Anniversaire', 'Ses enfants Awa et Moussa', 'Les dimanches au marché de Sandaga.', 'Son thiéboudienne du vendredi.', 'Surnom : Yaay', 'Lieu important : Rufisque', 'Merci pour ta force.', 'Se sentir aimé(e) (principale), Ressentir de la fierté', 'Douce et émouvante', 'Mbalax doux', 'Féminine', 'Titre — Artiste — https://youtu.be/abc (aime : La voix, les chœurs)']
  ok('questionnaire : affichage humain de tous les champs demandés', attendus.every((x) => t.includes(x)), attendus.filter((x) => !t.includes(x)).join(' | '))
  ok('questionnaire : aucun JSON brut', !/[{}[\]"]|etape\d|_qui|souvenir_principal/.test(t))
  const moi = afficherQuestionnaire({ ...Q, responses: { ...Q.responses, etape1: { de_la_part: 'Moi uniquement', de_la_part_qui: '' } } })
  ok('questionnaire : « Moi uniquement » → prénom du client', moi.includes('De la part de     : Awa (seul·e)'))
  sortie.length = 0
  const f = faux((nom) => ({ data: nom === 'music_admin_questionnaire' ? Q : null, error: null }))
  ok('commande questionnaire : appelle music_admin_questionnaire(référence) et affiche', (await executer(['questionnaire', 'CRM-00005'], { rpc: f.rpc, afficher })) === 0 && f.envois[0].nom === 'music_admin_questionnaire' && sortie.join('\n').includes('Sandaga'))
  sortie.length = 0
  const g = faux(() => ({ data: { error: 'STATUT_INCOMPATIBLE', statut: 'PAYÉE' }, error: null }))
  ok('commande questionnaire : commande incompatible refusée (code 1, message clair)', (await executer(['questionnaire', 'CRM-00006'], { rpc: g.rpc, afficher })) === 1 && sortie.some((x) => x.includes('STATUT_INCOMPATIBLE') && x.includes('PAYÉE')))
}
{
  const m = modeleBrief(Q)
  ok('modèle de brief : 10 titres « ## » exacts, avertissement « pas les paroles »', SECTIONS_BRIEF.every((x) => m.includes('\n## ' + x.titre + '\n')) && m.includes('PAS les paroles') && m.includes('Aucune génération automatique'))
  const p = parserBrief(m)
  ok('modèle prérempli relu sans modification : brief valide (aller-retour)', !!p.contenu && p.contenu.destinataire === 'Fatou' && p.contenu.de_la_part === 'Ses enfants Awa et Moussa' && p.contenu.histoire.includes('Sandaga') && p.contenu.histoire.includes('thiéboudienne') && p.contenu.direction_musicale.includes('Mbalax doux') && !('points_particuliers' in p.contenu), JSON.stringify(p.erreurs))
  ok('parser : commentaires « // » ignorés (lien https:// conservé)', !/RÉSUMÉ DE LA DEMANDE|Facultatif — laissez vide|dépôt Git/.test(JSON.stringify(p.contenu)) && p.contenu.direction_musicale.includes('https://youtu.be/abc'))
  const titres = SECTIONS_BRIEF.map((x) => '## ' + x.titre)
  const base = titres.map((t, i) => t + '\n' + (SECTIONS_BRIEF[i].requis ? 'Texte ' + i : '')).join('\n')
  ok('parser : fichier minimal valide (sections facultatives vides)', !!parserBrief(base).contenu)
  ok('parser : titre inconnu refusé', parserBrief(base + '\n## Paroles\nla la').erreurs?.some((e) => e.includes('Titre inconnu')))
  ok('parser : section en double refusée', parserBrief(base + '\n## Pour qui\nX').erreurs?.some((e) => e.includes('double')))
  ok('parser : section manquante refusée', parserBrief(base.replace('## Le message central\nTexte 6', '')).erreurs?.some((e) => e.includes('manquante')))
  ok('parser : section obligatoire vide refusée', parserBrief(base.replace('Texte 6', '   ')).erreurs?.some((e) => e.includes('obligatoire vide')))
  ok('parser : texte hors section refusé', parserBrief('Bonjour\n' + base).erreurs?.some((e) => e.includes('hors section')))
  ok('parser : longueur maximale (mêmes limites que la base)', parserBrief(base.replace('Texte 0', 'a'.repeat(121))).erreurs?.some((e) => e.includes('trop longue')) && !!parserBrief(base.replace('Texte 0', 'a'.repeat(120))).contenu)
  // Récit client (migration 029)
  ok('récit : définition partagée (brief-recit.json)', RECIT_BRIEF.cle === 'recit' && RECIT_BRIEF.titre === 'Récit client' && RECIT_BRIEF.requis === false && RECIT_BRIEF.max === 6000)
  ok('modèle : section « ## Récit client » facultative et vide, après les 10 sections', m.includes('\n## Récit client\n') && m.indexOf('## Récit client') > m.indexOf('## Points particuliers à respecter') && !('recit' in p.contenu))
  const avecRecit = base + '\n## Récit client\n// commentaire ignoré\nPremier paragraphe.\n\nSecond paragraphe.\n'
  const pr = parserBrief(avecRecit)
  ok('parser : récit lu (paragraphes conservés, commentaires ignorés), sections inchangées', pr.contenu?.recit === 'Premier paragraphe.\n\nSecond paragraphe.' && pr.contenu?.destinataire === 'Texte 0', JSON.stringify(pr.erreurs))
  ok('parser : récit absent ou vide → pas de clé recit', !('recit' in parserBrief(base).contenu) && !('recit' in parserBrief(base + '\n## Récit client\n   \n').contenu))
  ok('parser : récit à la limite accepté, au-delà refusé', parserBrief(base + '\n## Récit client\n' + 'a'.repeat(6000)).contenu?.recit.length === 6000
    && parserBrief(base + '\n## Récit client\n' + 'a'.repeat(6001)).erreurs?.some((e) => e.includes('Récit client') && e.includes('trop longue')))
  ok('parser : récit en double refusé', parserBrief(avecRecit + '\n## Récit client\nEncore').erreurs?.some((e) => e.includes('double')))
  ok('affichage console : récit signalé comme seul texte montré au client', afficherBrief(pr.contenu).includes('Récit client (seul texte montré au client)'))
}
{
  ok('chemin du brief : refusé dans le dépôt Git, accepté ailleurs', cheminHorsDepot(join(RACINE_DEPOT, 'brief.txt')) === null && cheminHorsDepot(join(RACINE_DEPOT, 'scripts', 'x.txt')) === null && cheminHorsDepot(RACINE_DEPOT) === null && cheminHorsDepot(join(tmpdir(), 'brief.txt')) !== null)
  const disque = new Map()
  const fichiers = { lire: (c) => disque.get(c), ecrire: (c, t) => { if (disque.has(c)) throw new Error('EEXIST'); disque.set(c, t) }, existe: (c) => disque.has(c) }
  const chemin = join(tmpdir(), 'brief-CRM-00005.txt')
  sortie.length = 0
  const f = faux((nom) => nom === 'music_admin_questionnaire' ? { data: Q, error: null } : nom === 'music_admin_brief_enregistrer' ? { data: { reference: 'CRM-00005', version: 1, envoye: false }, error: null } : { data: null, error: null })
  ok('brief-modele : refuse un fichier dans le dépôt (aucun appel)', (await executer(['brief-modele', 'CRM-00005', join(RACINE_DEPOT, 'brief.txt')], { rpc: f.rpc, afficher, fichiers })) === 2 && f.envois.length === 0)
  ok('brief-modele : écrit le modèle hors dépôt', (await executer(['brief-modele', 'CRM-00005', chemin], { rpc: f.rpc, afficher, fichiers })) === 0 && disque.get(chemin).includes('## Pour qui'))
  ok('brief-modele : n’écrase jamais un fichier existant', (await executer(['brief-modele', 'CRM-00005', chemin], { rpc: f.rpc, afficher, fichiers })) === 2)
  ok('brief : refuse un fichier dans le dépôt', (await executer(['brief', 'CRM-00005', join(RACINE_DEPOT, 'b.txt')], { rpc: f.rpc, afficher, fichiers })) === 2)
  sortie.length = 0
  const n0 = f.envois.length
  ok('brief : fichier valide → music_admin_brief_enregistrer(contenu), version affichée, « PAS encore envoyé »', (await executer(['brief', 'CRM-00005', chemin], { rpc: f.rpc, afficher, fichiers })) === 0 && f.envois[n0].nom === 'music_admin_brief_enregistrer' && f.envois[n0].params.p_contenu.destinataire === 'Fatou' && sortie.some((x) => x.includes('version 1') && x.includes('PAS encore envoyé')))
  disque.set(chemin, '## Pour qui\nFatou')
  const n1 = f.envois.length
  sortie.length = 0
  ok('brief : fichier invalide → rien envoyé à la base, erreurs lisibles', (await executer(['brief', 'CRM-00005', chemin], { rpc: f.rpc, afficher, fichiers })) === 1 && f.envois.length === n1 && sortie.join().includes('Section manquante'))
}
{
  sortie.length = 0
  const appelsAlea = []
  const espion2 = (n) => { appelsAlea.push(n); return randomBytes(n) }
  const f = faux(() => ({ data: { reference: 'CRM-00005', version: 2, envoye_le: '2026-10-21T08:00:00Z', expire_le: '2026-12-20T08:00:00Z', reenvoi: false }, error: null }))
  const code = await executer(['brief-envoyer', 'CRM-00005'], { rpc: f.rpc, afficher, source: espion2 })
  const lien = sortie.find((t) => t.includes('#t='))
  const jeton = lien && lien.split('#t=')[1]
  ok('brief-envoyer : randomBytes(32), seule l’empreinte envoyée à music_admin_brief_envoyer', code === 0 && appelsAlea.join() === '32' && f.envois[0].nom === 'music_admin_brief_envoyer' && f.envois[0].params.p_empreinte === createHash('sha256').update(jeton, 'utf8').digest('hex') && !JSON.stringify(f.envois).includes(jeton))
  ok('brief-envoyer : lien /fr/music/resume#t=<jeton 43 car.> affiché une seule fois, version indiquée', lien === 'https://www.coachredo.app/fr/music/resume#t=' + jeton && /^[A-Za-z0-9_-]{43}$/.test(jeton) && sortie.filter((t) => t.includes('#t=')).length === 1 && sortie.some((t) => t.includes('version 2')))
  sortie.length = 0
  const g = faux(() => ({ data: { error: 'CORRECTION_EN_ATTENTE' }, error: null }))
  ok('brief-envoyer refusé (correction en attente) : aucun lien affiché', (await executer(['brief-envoyer', 'CRM-00005'], { rpc: g.rpc, afficher })) === 1 && !sortie.some((t) => t.includes('#t=')) && sortie.some((t) => t.includes('CORRECTION_EN_ATTENTE')))
}
{
  const avant = afficherSuivi({ reference: 'CRM-00005', statut: 'BRIEF_À_VALIDER', paye_le: '2026-10-20T10:00:00Z', questionnaire_envoye_le: '2026-10-20T18:30:00Z',
    brief: { version: 1, envoye_le: '2026-10-21T08:00:00Z', correction: 'Le prénom est Fatou Binetou.', correction_le: '2026-10-21T09:00:00Z', valide_le: null, version_validee: null },
    versions: [{ version: 1, envoye_le: '2026-10-21T08:00:00Z', correction: 'Le prénom est Fatou Binetou.', correction_le: '2026-10-21T09:00:00Z', valide_le: null }] })
  ok('suivi : correction du client lisible (texte, date, version) + prochaine étape', avant.includes('Le prénom est Fatou Binetou.') && avant.includes('Correction demandée') && avant.includes('(version 1)') && avant.includes('Rédigez la version 2'))
  ok('suivi avant validation : délai de 5 jours ouvrés NON DÉMARRÉ', avant.includes('NON DÉMARRÉ') && !avant.includes('DÉBUT DU DÉLAI'))
  const apres = afficherSuivi({ reference: 'CRM-00005', statut: 'BRIEF_VALIDÉ', paye_le: '2026-10-20T10:00:00Z', questionnaire_envoye_le: '2026-10-20T18:30:00Z',
    brief: { version: 2, envoye_le: '2026-10-21T11:00:00Z', correction: null, correction_le: null, valide_le: '2026-10-21T12:15:00Z', version_validee: 2, consentement_version: 'brief-v0-2026-10' },
    versions: [{ version: 1, envoye_le: '2026-10-21T08:00:00Z', correction: 'Le prénom est Fatou Binetou.', correction_le: '2026-10-21T09:00:00Z', valide_le: null }, { version: 2, envoye_le: '2026-10-21T11:00:00Z', correction: null, correction_le: null, valide_le: '2026-10-21T12:15:00Z' }] })
  ok('suivi après validation : version validée 2 + DÉBUT DU DÉLAI = date de validation', apres.includes('Version validée         : 2') && apres.includes('DÉBUT DU DÉLAI DE 5 JOURS OUVRÉS : ' + dateLisible('2026-10-21T12:15:00Z')) && apres.includes('v1 — envoyée') && apres.includes('v2 — envoyée') && apres.includes('VALIDÉE'))
  ok('dates en heure de Dakar, lisibles', dateLisible('2026-10-21T12:15:00Z') === 'mercredi 21 octobre 2026 à 12:15 (heure de Dakar)', dateLisible('2026-10-21T12:15:00Z'))
  sortie.length = 0
  const f = faux(() => ({ data: { reference: 'CRM-00005', statut: 'QUESTIONNAIRE_REÇU', brief: null, versions: [] }, error: null }))
  ok('commande suivi : appelle music_admin_brief_suivi', (await executer(['suivi', 'CRM-00005'], { rpc: f.rpc, afficher })) === 0 && f.envois[0].nom === 'music_admin_brief_suivi' && sortie.join().includes('aucun'))
}

console.log(`\n${reussis}/${reussis + echecs} PASS`)
process.exit(echecs ? 1 : 0)
