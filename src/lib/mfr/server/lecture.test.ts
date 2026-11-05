// ============================================================
// Tests OFFLINE — lireVersionPublieeMfr (T-MFR.5B-3)
// ============================================================
// Même discipline que redaction/validator.test.ts : script plain, zéro
// réseau, zéro Supabase réel — un client fictif n'exposant que `.rpc()`
// avec une réponse fixée. Données entièrement fictives (aucun cycle,
// aucune version, aucun utilisateur réel). Démontre les 3 états
// TypeScript qui pilotent les états page C/D/E de
// `/plan-b/feuille-de-route` — les états A/B (MPD incomplet/complet non
// consommé) sont inchangés par ce chantier, non concernés ici.

import { lireVersionPublieeMfr } from './lecture'

let total = 0
let echecs = 0
function verifier(nom: string, condition: boolean, detail?: string): void {
  total += 1
  if (condition) {
    console.log(`PASS  ${nom}`)
  } else {
    echecs += 1
    console.log(`FAIL  ${nom}${detail ? ` — ${detail}` : ''}`)
  }
}

function clientFictif(reponse: { data: unknown; error: unknown }) {
  return {
    rpc: async () => reponse,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

async function main(): Promise<void> {
  // 0. RPC pas encore déployée en base (PostgREST « fonction introuvable »,
  // ex. PGRST202) — exactement la forme d'erreur réellement renvoyée par
  // Supabase tant que la migration candidate n'est pas appliquée. Doit
  // tomber dans ERREUR, JAMAIS dans AUCUNE_PUBLICATION — ce sont deux
  // situations radicalement différentes (absence de mécanisme vs cycle
  // réel sans publication) que la page ne doit jamais confondre.
  {
    const r = await lireVersionPublieeMfr(
      clientFictif({
        data: null,
        error: { code: 'PGRST202', message: 'Could not find the function public.mfr_lire_version_publiee(p_cycle_id) in the schema cache' },
      }),
      'fictif'
    )
    verifier('RPC non déployée (PGRST202) => ERREUR, jamais AUCUNE_PUBLICATION', r.statut === 'ERREUR')
  }

  // 1. Erreur réseau/RPC — jamais confondue avec un état métier.
  {
    const r = await lireVersionPublieeMfr(clientFictif({ data: null, error: { message: 'réseau' } }), 'fictif')
    verifier('Erreur réseau => ERREUR générique', r.statut === 'ERREUR')
  }

  // 2. Données absentes sans erreur explicite — même traitement défensif.
  {
    const r = await lireVersionPublieeMfr(clientFictif({ data: null, error: null }), 'fictif')
    verifier('data null sans erreur => ERREUR générique', r.statut === 'ERREUR')
  }

  // 3. aucune_publication — état attendu et fréquent, jamais une erreur.
  {
    const r = await lireVersionPublieeMfr(clientFictif({ data: { error: 'aucune_publication' }, error: null }), 'fictif')
    verifier('aucune_publication => AUCUNE_PUBLICATION (pas ERREUR)', r.statut === 'AUCUNE_PUBLICATION')
  }

  // 3bis. acces_restreint (GO QG APP 2026-11-05) — état attendu et
  // fréquent pendant la fermeture par défaut, jamais une erreur,
  // jamais confondu avec AUCUNE_PUBLICATION.
  {
    const r = await lireVersionPublieeMfr(clientFictif({ data: { error: 'acces_restreint' }, error: null }), 'fictif')
    verifier('acces_restreint => ACCES_RESTREINT (pas ERREUR, pas AUCUNE_PUBLICATION)', r.statut === 'ACCES_RESTREINT')
  }

  // 4. Toute autre erreur métier (cas structurellement inattendus en usage
  // normal — cycle_introuvable/acces_refuse/non_authentifie/incoherence) —
  // remontée fidèlement, jamais masquée.
  for (const code of ['cycle_introuvable', 'acces_refuse', 'non_authentifie', 'incoherence_version_publication']) {
    const r = await lireVersionPublieeMfr(clientFictif({ data: { error: code }, error: null }), 'fictif')
    verifier(`${code} => ERREUR avec code fidèle`, r.statut === 'ERREUR' && 'erreur' in r && r.erreur === code)
  }

  // 5. Succès — contenu, numéro de version et date transmis sans altération.
  {
    const contenuFictif = {
      cycleId: 'fictif-cycle',
      analyseId: 'fictif-analyse',
      curationId: 'fictif-curation',
      recommandationConfirmee: true,
      directions: [
        {
          position: 1,
          titre: 'Direction fictive',
          pourquoi: { texte: 'x', sources: ['SRC_1'] },
          forces: { texte: 'x', sources: [] },
          limites: { texte: 'x', sources: [] },
          planAction: { texte: 'x', sources: [] },
          hypotheseId: 'fictif-hyp',
          estRecommandee: true,
        },
      ],
      aucuneDirectionMessage: null,
    }
    const r = await lireVersionPublieeMfr(
      clientFictif({ data: { numeroVersion: 3, contenu: contenuFictif, publieLe: '2026-11-03T00:00:00Z' }, error: null }),
      'fictif'
    )
    verifier(
      'Succès => PUBLIEE, numeroVersion/contenu/publieLe transmis fidèlement',
      r.statut === 'PUBLIEE' && r.numeroVersion === 3 && r.publieLe === '2026-11-03T00:00:00Z' && r.contenu === contenuFictif
    )
  }

  console.log(`\n${total - echecs}/${total} vérifications passées.`)
  if (echecs > 0) {
    console.log(`${echecs} ÉCHEC(S).`)
    process.exitCode = 1
  } else {
    console.log('Toutes les vérifications sont passées.')
  }
}

main()
