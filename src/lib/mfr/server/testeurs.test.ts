// ============================================================
// Tests OFFLINE — gestion des testeurs MFR (GO QG APP 2026-11-05)
// ============================================================
// Même discipline que retenue.test.ts/curation.test.ts : script plain,
// zéro réseau, zéro Supabase réel — clients fictifs n'exposant que les
// méthodes utilisées. Ce fichier couvre UNIQUEMENT la traduction
// TypeScript (validation UUID, forme du retour, calcul du statut
// courant par parcours ordonné) — jamais la logique SQL des RPC
// elles-mêmes (couverte par `034_mfr_testeurs.test.sql` et par les
// T9-T15 de `migrations_candidates/mfr_lire_version_publiee.test.sql`,
// non exécutés dans cette passe).

import { autoriserTesteur, retirerTesteur, listerStatutsTesteurs } from './testeurs'

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

const USER_ID = 'dd539d5c-5103-45b1-8e7e-579bff5b2f10'
const ADMIN_ID = '67310029-a367-4816-95f7-35d0ae4d359c'

function fakeServiceClientRpc(reponse: { data?: unknown; error?: unknown }) {
  let appels = 0
  const params: unknown[] = []
  return {
    client: {
      rpc: async (nom: string, p: unknown) => {
        appels += 1
        params.push({ nom, p })
        return reponse
      },
    } as unknown as Parameters<typeof autoriserTesteur>[0],
    appels: () => appels,
    dernierAppel: () => params[params.length - 1],
  }
}

function fakeServiceClientListe(reponse: { data?: unknown; error?: unknown }) {
  return {
    from: () => ({
      select: () => ({
        order: async () => reponse,
      }),
    }),
  } as unknown as Parameters<typeof listerStatutsTesteurs>[0]
}

async function main() {
  // ════════════════════════════════════════════════════════════
  // autoriserTesteur / retirerTesteur
  // ════════════════════════════════════════════════════════════

  // 1. userId invalide → refus avant tout appel RPC.
  {
    const fake = fakeServiceClientRpc({ data: { success: true } })
    const resultat = await autoriserTesteur(fake.client, 'pas-un-uuid', ADMIN_ID, null)
    verifier('1. userId invalide → identifiant_invalide', 'error' in resultat && resultat.error === 'identifiant_invalide')
    verifier('1. rpc jamais appelé', fake.appels() === 0)
  }

  // 2. operateurId invalide → refus avant tout appel RPC.
  {
    const fake = fakeServiceClientRpc({ data: { success: true } })
    const resultat = await retirerTesteur(fake.client, USER_ID, 'pas-un-uuid', null)
    verifier('2. operateurId invalide → identifiant_invalide', 'error' in resultat && resultat.error === 'identifiant_invalide')
    verifier('2. rpc jamais appelé', fake.appels() === 0)
  }

  // 3. autoriserTesteur succès → bon nom de RPC, bons paramètres, ok=true.
  {
    const fake = fakeServiceClientRpc({ data: { success: true, evenementId: 42 } })
    const resultat = await autoriserTesteur(fake.client, USER_ID, ADMIN_ID, 'commentaire test')
    verifier('3. succès → ok=true', 'ok' in resultat && resultat.ok === true)
    verifier('3. succès → evenementId correct', 'ok' in resultat && resultat.evenementId === 42)
    const appel = fake.dernierAppel() as { nom: string; p: { p_user_id: string; p_operateur_id: string; p_commentaire: string | null } }
    verifier('3. rpc appelé avec le bon nom', appel.nom === 'mfr_autoriser_testeur')
    verifier(
      '3. rpc appelé avec les bons paramètres',
      appel.p.p_user_id === USER_ID && appel.p.p_operateur_id === ADMIN_ID && appel.p.p_commentaire === 'commentaire test'
    )
    verifier('3. rpc appelé exactement une fois', fake.appels() === 1)
  }

  // 4. retirerTesteur succès → bon nom de RPC distinct.
  {
    const fake = fakeServiceClientRpc({ data: { success: true, evenementId: 43 } })
    await retirerTesteur(fake.client, USER_ID, ADMIN_ID, null)
    const appel = fake.dernierAppel() as { nom: string }
    verifier('4. retirerTesteur appelle mfr_retirer_testeur (jamais mfr_autoriser_testeur)', appel.nom === 'mfr_retirer_testeur')
  }

  // 5. Erreur applicative (ex. utilisateur_introuvable) → propagée telle quelle.
  {
    const fake = fakeServiceClientRpc({ data: { error: 'utilisateur_introuvable' } })
    const resultat = await autoriserTesteur(fake.client, USER_ID, ADMIN_ID, null)
    verifier('5. erreur applicative propagée telle quelle', 'error' in resultat && resultat.error === 'utilisateur_introuvable')
  }

  // 6. Erreur transport → message générique, jamais le détail brut.
  {
    const fake = fakeServiceClientRpc({ error: { message: 'connection reset' } })
    const resultat = await autoriserTesteur(fake.client, USER_ID, ADMIN_ID, null)
    verifier('6. erreur transport → message générique', 'error' in resultat && resultat.error.includes('Erreur lors de la mise à jour'))
  }

  // 7. data null → reponse_rpc_invalide, jamais un crash, jamais un succès.
  {
    const fake = fakeServiceClientRpc({ data: null })
    const resultat = await autoriserTesteur(fake.client, USER_ID, ADMIN_ID, null)
    verifier('7. data null → reponse_rpc_invalide', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 8. Objet vide — jamais un faux succès.
  {
    const fake = fakeServiceClientRpc({ data: {} })
    const resultat = await autoriserTesteur(fake.client, USER_ID, ADMIN_ID, null)
    verifier('8. {} → reponse_rpc_invalide, jamais ok:true', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 9. success:true sans evenementId — jamais un faux succès.
  {
    const fake = fakeServiceClientRpc({ data: { success: true } })
    const resultat = await autoriserTesteur(fake.client, USER_ID, ADMIN_ID, null)
    verifier('9. success:true sans evenementId → reponse_rpc_invalide', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 10. Payload non objet — jamais un faux succès.
  {
    const fake = fakeServiceClientRpc({ data: 'succes' })
    const resultat = await autoriserTesteur(fake.client, USER_ID, ADMIN_ID, null)
    verifier('10. payload non-objet → reponse_rpc_invalide', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // ════════════════════════════════════════════════════════════
  // listerStatutsTesteurs — calcul du statut courant par parcours ordonné
  // ════════════════════════════════════════════════════════════

  // 11. Historique mixte : A autorisé puis retiré (absent du résultat final) ;
  // B autorisé seul (présent) ; C jamais mentionné (absent).
  {
    const fake = fakeServiceClientListe({
      data: [
        { user_id: 'A', action: 'AUTORISE', cree_le: '2026-11-01T00:00:00Z', acteur_admin_id: ADMIN_ID, commentaire: 'a1' },
        { user_id: 'B', action: 'AUTORISE', cree_le: '2026-11-02T00:00:00Z', acteur_admin_id: ADMIN_ID, commentaire: null },
        { user_id: 'A', action: 'RETIRE', cree_le: '2026-11-03T00:00:00Z', acteur_admin_id: ADMIN_ID, commentaire: 'a2' },
      ],
      error: null,
    })
    const resultat = await listerStatutsTesteurs(fake)
    verifier('11. A retiré → absent du résultat final', !resultat.some(r => r.userId === 'A'))
    verifier('11. B autorisé → présent', resultat.some(r => r.userId === 'B' && r.autorise === true))
    verifier('11. exactement 1 testeur courant', resultat.length === 1)
  }

  // 12. Réautorisation après retrait → présent à nouveau, dernier événement correct.
  {
    const fake = fakeServiceClientListe({
      data: [
        { user_id: 'A', action: 'AUTORISE', cree_le: '2026-11-01T00:00:00Z', acteur_admin_id: ADMIN_ID, commentaire: null },
        { user_id: 'A', action: 'RETIRE', cree_le: '2026-11-02T00:00:00Z', acteur_admin_id: ADMIN_ID, commentaire: null },
        { user_id: 'A', action: 'AUTORISE', cree_le: '2026-11-03T00:00:00Z', acteur_admin_id: ADMIN_ID, commentaire: 'réautorisé' },
      ],
      error: null,
    })
    const resultat = await listerStatutsTesteurs(fake)
    verifier('12. réautorisation → présent à nouveau', resultat.length === 1 && resultat[0].userId === 'A')
    verifier('12. commentaire du dernier événement transmis', resultat[0].commentaire === 'réautorisé')
    verifier('12. date du dernier événement transmise', resultat[0].dernierEvenementLe === '2026-11-03T00:00:00Z')
  }

  // 13. Erreur ou données absentes → liste vide, jamais un crash.
  {
    const fake = fakeServiceClientListe({ data: null, error: { message: 'erreur' } })
    const resultat = await listerStatutsTesteurs(fake)
    verifier('13. erreur → liste vide, jamais un crash', resultat.length === 0)
  }

  // 14. Table vide → liste vide.
  {
    const fake = fakeServiceClientListe({ data: [], error: null })
    const resultat = await listerStatutsTesteurs(fake)
    verifier('14. table vide → liste vide', resultat.length === 0)
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
