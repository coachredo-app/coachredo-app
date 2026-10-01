// ============================================================
// MPD V3 — Canon — Étape 5 : Ta façon d'avancer
// ============================================================
// Source : MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md §2 (Étape 5).
// Ordre interne VALIDÉ DÉFINITIVEMENT (D-022) : Q23 → Q27 → Q24 → Q26 → Q25.

import { CANON_VERSION, type QuestionCanonique } from '../types'

export const etape5Questions: readonly QuestionCanonique[] = [
  // Q23 — Démarrage / retard à agir
  {
    stableId: 'episode_retard_demarrage',
    referenceEditoriale: 'Q23',
    etape: 5,
    ordre: 28,
    versionCanonique: CANON_VERSION,
    libelle: 'Ces derniers mois, t’est-il arrivé de décider de faire quelque chose d’important, puis de beaucoup tarder à commencer ou de ne pas commencer ?',
    formeReponse: 'choix_avec_precision',
    options: [
      {
        value: 'oui',
        label: 'Oui',
        precision: {
          type: 'texte',
          label: 'Pense à un exemple récent. Qu’avais-tu décidé de faire, et qu’est-ce qui t’a empêché de commencer plus tôt ?',
        },
      },
      { value: 'non', label: 'Non' },
      { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
    ],
    // Relance supprimée (A7, D-026).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'comportement_passe',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q27 — Continuité
  {
    stableId: 'episode_continuite_effort',
    referenceEditoriale: 'Q27',
    etape: 5,
    ordre: 29,
    versionCanonique: CANON_VERSION,
    libelle: 'Pense à quelque chose que tu as réussi à continuer pendant un certain temps.',
    aide: 'Travail, études, projet, activité personnelle, habitude du quotidien.',
    formeReponse: 'items_avec_sous_reponse',
    itemsAvecSousReponse: {
      motif: 'champs_fixes',
      champs: [
        { id: 'quoi', label: 'Qu’est-ce que tu as réussi à continuer ?', formeReponse: 'texte' },
        {
          id: 'ce_qui_a_aide',
          label: 'Qu’est-ce qui t’a aidé à continuer ?',
          formeReponse: 'choix_avec_precision',
          options: [
            { value: 'aucun', label: 'Aucun' },
            { value: 'reponse', label: '(réponse libre)', precision: { type: 'texte' } },
          ],
        },
      ],
    },
    // Relance supprimée (A7, D-026).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'comportement_passe',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q24 — Obstacle / adaptation
  {
    stableId: 'episode_obstacle_adaptation',
    referenceEditoriale: 'Q24',
    etape: 5,
    ordre: 30,
    versionCanonique: CANON_VERSION,
    libelle: 'Pense à une situation récente où tu avais commencé quelque chose, puis rencontré un obstacle ou obtenu un résultat moins bon que prévu.',
    formeReponse: 'items_avec_sous_reponse',
    itemsAvecSousReponse: {
      motif: 'champs_fixes',
      champs: [
        { id: 'ce_qui_sest_passe', label: 'Qu’est-ce qui s’est passé ?', formeReponse: 'texte' },
        {
          id: 'ce_que_tu_as_fait',
          label: 'Et qu’as-tu fait ensuite ?',
          formeReponse: 'choix_avec_precision',
          options: [
            { value: 'aucun', label: 'Aucun' },
            { value: 'reponse', label: '(réponse libre)', precision: { type: 'texte' } },
          ],
        },
      ],
    },
    // Relance supprimée (A7, D-026). Réutilisation avec Q14 : aucun
    // mécanisme (A7, D-026).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'comportement_passe',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q26 — Exposition au retour extérieur
  {
    stableId: 'episode_exposition_retour_exterieur',
    referenceEditoriale: 'Q26',
    etape: 5,
    ordre: 31,
    versionCanonique: CANON_VERSION,
    libelle: 'Pense à une situation récente où tu as montré ton travail, proposé une idée ou demandé quelque chose à quelqu’un.',
    formeReponse: 'items_avec_sous_reponse',
    itemsAvecSousReponse: {
      motif: 'champs_fixes',
      champs: [
        { id: 'quoi', label: 'Qu’as-tu fait ?', formeReponse: 'texte' },
        {
          id: 'apres_reponse',
          label: 'Quand la personne t’a répondu, qu’as-tu fait ensuite ?',
          formeReponse: 'choix_avec_precision',
          options: [
            { value: 'aucun', label: 'Aucun' },
            { value: 'reponse', label: '(réponse libre)', precision: { type: 'texte' } },
          ],
        },
      ],
    },
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'comportement_passe',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q25 — Décision dans l'incertitude (SOCLE, A7)
  {
    stableId: 'episode_decision_incertitude',
    referenceEditoriale: 'Q25',
    etape: 5,
    ordre: 32,
    versionCanonique: CANON_VERSION,
    libelle: 'Pense à une situation récente où tu devais avancer ou décider sans avoir toutes les informations que tu voulais. Qu’as-tu fait ?',
    formeReponse: 'choix_avec_precision',
    options: [
      { value: 'aucun', label: 'Aucun' },
      { value: 'reponse', label: '(réponse libre)', precision: { type: 'texte' } },
    ],
    // Relance supprimée (A7, D-026).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'comportement_passe',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },
]
