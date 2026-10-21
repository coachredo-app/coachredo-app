// ============================================================
// MFR V1 — Test OFFLINE du wrapper SELECT RETAINED — T-MFR.4A
// ============================================================
// Script plain (aucun framework de test), même discipline que
// `lancerAnalyseMfr.test.ts`. Zéro Supabase réel : `serviceClient.rpc`
// est entièrement fake, injecté directement — ce fichier ne couvre QUE
// la traduction TypeScript (validation UUID + forme du retour), jamais
// la logique SQL de `mfr_retenir_analyse` elle-même (couverte par
// `023_mfr_retenir_analyse.test.sql`, non exécuté dans cette passe).

import { retenirAnalyseSucces } from './retenue'

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

const CYCLE_ID = '67310029-a367-4816-95f7-35d0ae4d359c'
const ANALYSE_ID = 'b61a8f43-d4e4-48e0-8976-64f8ef9146b2'

function fakeServiceClient(reponse: { data?: unknown; error?: unknown }) {
  let appels = 0
  const params: unknown[] = []
  return {
    client: {
      rpc: async (nom: string, p: unknown) => {
        appels += 1
        params.push({ nom, p })
        return reponse
      },
    } as unknown as Parameters<typeof retenirAnalyseSucces>[0],
    appels: () => appels,
    dernierAppel: () => params[params.length - 1],
  }
}

async function main() {
  // 1. UUID cycle invalide → refus avant tout appel RPC.
  {
    const fake = fakeServiceClient({ data: { success: true } })
    const resultat = await retenirAnalyseSucces(fake.client, 'pas-un-uuid', ANALYSE_ID)
    verifier('1. cycleId invalide → error identifiant_invalide', 'error' in resultat && resultat.error === 'identifiant_invalide')
    verifier('1. cycleId invalide → rpc jamais appelé', fake.appels() === 0)
  }

  // 2. UUID analyse invalide → refus avant tout appel RPC.
  {
    const fake = fakeServiceClient({ data: { success: true } })
    const resultat = await retenirAnalyseSucces(fake.client, CYCLE_ID, 'pas-un-uuid')
    verifier('2. analyseId invalide → error identifiant_invalide', 'error' in resultat && resultat.error === 'identifiant_invalide')
    verifier('2. analyseId invalide → rpc jamais appelé', fake.appels() === 0)
  }

  // 3. RPC retourne un succès → traduction correcte, un seul appel, bons paramètres transmis.
  {
    const fake = fakeServiceClient({ data: { success: true, cycle_id: CYCLE_ID, analyse_retenue_id: ANALYSE_ID } })
    const resultat = await retenirAnalyseSucces(fake.client, CYCLE_ID, ANALYSE_ID)
    verifier('3. succès → ok=true', 'ok' in resultat && resultat.ok === true)
    verifier('3. succès → cycleId correct', 'ok' in resultat && resultat.cycleId === CYCLE_ID)
    verifier('3. succès → analyseRetenueId correct', 'ok' in resultat && resultat.analyseRetenueId === ANALYSE_ID)
    verifier('3. rpc appelé exactement une fois', fake.appels() === 1)
    const appel = fake.dernierAppel() as { nom: string; p: { p_cycle_id: string; p_analyse_id: string } }
    verifier('3. rpc appelé avec le bon nom', appel.nom === 'mfr_retenir_analyse')
    verifier('3. rpc appelé avec les bons paramètres', appel.p.p_cycle_id === CYCLE_ID && appel.p.p_analyse_id === ANALYSE_ID)
  }

  // 4. RPC retourne une erreur applicative (ex. cycle_publie) → propagée telle quelle.
  {
    const fake = fakeServiceClient({ data: { error: 'cycle_publie' } })
    const resultat = await retenirAnalyseSucces(fake.client, CYCLE_ID, ANALYSE_ID)
    verifier('4. erreur applicative propagée telle quelle', 'error' in resultat && resultat.error === 'cycle_publie')
  }

  // 5. Erreur réseau/transport (champ `error` au niveau supabase-js, pas `data.error`) → message générique, jamais le détail brut.
  {
    const fake = fakeServiceClient({ error: { message: 'connection reset' } })
    const resultat = await retenirAnalyseSucces(fake.client, CYCLE_ID, ANALYSE_ID)
    verifier('5. erreur transport → message générique', 'error' in resultat && resultat.error.includes('Erreur lors du verrouillage'))
  }

  // 6. data absent/null → erreur stable `reponse_rpc_invalide`, jamais un crash, jamais un succès.
  {
    const fake = fakeServiceClient({ data: null })
    const resultat = await retenirAnalyseSucces(fake.client, CYCLE_ID, ANALYSE_ID)
    verifier('6. data null → reponse_rpc_invalide', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // ════════════════════════════════════════════════════════════
  // Jamais de faux succès (arbitrage QG §J.1) : un payload absent,
  // malformé ou incomplet doit toujours être une erreur, jamais une
  // tentative de l'interpréter au mieux. Chaque cas ci-dessous est une
  // forme qui aurait été acceptée comme succès AVANT la correction.
  // ════════════════════════════════════════════════════════════

  // 7. Objet vide — aucun `error`, aucun `success` — ne doit jamais devenir un succès.
  {
    const fake = fakeServiceClient({ data: {} })
    const resultat = await retenirAnalyseSucces(fake.client, CYCLE_ID, ANALYSE_ID)
    verifier('7. {} → reponse_rpc_invalide, jamais ok:true', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 8. success:false sans error — ne doit jamais devenir un succès.
  {
    const fake = fakeServiceClient({ data: { success: false } })
    const resultat = await retenirAnalyseSucces(fake.client, CYCLE_ID, ANALYSE_ID)
    verifier('8. success:false sans error → reponse_rpc_invalide', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 9. success:true mais champs attendus absents — ne doit jamais devenir un succès.
  {
    const fake = fakeServiceClient({ data: { success: true } })
    const resultat = await retenirAnalyseSucces(fake.client, CYCLE_ID, ANALYSE_ID)
    verifier('9. success:true sans cycle_id/analyse_retenue_id → reponse_rpc_invalide', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 10. success:true avec champs présents mais UUID invalide — ne doit jamais devenir un succès.
  {
    const fake = fakeServiceClient({ data: { success: true, cycle_id: 'pas-un-uuid', analyse_retenue_id: ANALYSE_ID } })
    const resultat = await retenirAnalyseSucces(fake.client, CYCLE_ID, ANALYSE_ID)
    verifier('10. cycle_id non-UUID → reponse_rpc_invalide, jamais ok:true', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 11. Payload non objet (ex. une chaîne brute renvoyée par erreur) — ne doit jamais devenir un succès.
  {
    const fake = fakeServiceClient({ data: 'succes' })
    const resultat = await retenirAnalyseSucces(fake.client, CYCLE_ID, ANALYSE_ID)
    verifier('11. payload non-objet → reponse_rpc_invalide, jamais ok:true', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
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
