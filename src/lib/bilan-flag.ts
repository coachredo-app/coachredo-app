// Interrupteur unique — fermeture temporaire du Bilan de clarté (phase testeurs livre).
// BILAN_OPEN=false : aucune nouvelle production de données Bilan (création, reprise/saisie, upgrade).
// La consultation d'un Bilan V2 déjà completed reste toujours autorisée.
export const BILAN_OPEN = process.env.BILAN_OPEN !== 'false'
