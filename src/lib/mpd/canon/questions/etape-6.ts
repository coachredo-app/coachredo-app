// ============================================================
// MPD V3 — Canon — Étape 6 : Ce qui est possible pour toi aujourd'hui
// ============================================================
// Source : MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md §2 (Étape 6).

import { CANON_VERSION, type QuestionCanonique } from '../types'

export const etape6Questions: readonly QuestionCanonique[] = [
  // Q28 — Budget du premier test
  {
    stableId: 'budget_premier_test',
    referenceEditoriale: 'Q28',
    etape: 6,
    ordre: 33,
    versionCanonique: CANON_VERSION,
    libelle: 'Pour faire un premier test de ton Plan B, combien pourrais-tu utiliser aujourd’hui sans mettre en difficulté tes dépenses essentielles ?',
    aide: 'Nous ne parlons pas du budget nécessaire pour lancer toute une activité. Seulement d’une petite somme que tu pourrais réellement utiliser pour vérifier une première idée.',
    formeReponse: 'choix_avec_precision',
    options: [
      { value: 'montant', label: 'Montant approximatif', precision: { type: 'nombre_devise' } },
      { value: 'sans_depenser', label: 'Je veux commencer sans dépenser' },
      { value: 'cela_depend', label: 'Cela dépend de l’idée' },
      { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
    ],
    relance: {
      // Déclenchée uniquement si l'option "cela_depend" a été choisie —
      // une seule relance, puis INCONNU accepté.
      condition: 'montant == cela_depend',
      libelle: 'Pour tester une idée qui te paraît intéressante mais qui n’a pas encore fait ses preuves, quelle somme maximum serais-tu prêt(e) à risquer ?',
      formeReponse: 'texte',
    },
    // Zéro est une réponse valide (doctrine explicite du document).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'ressource',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q29 — Urgence financière
  {
    stableId: 'urgence_financiere',
    referenceEditoriale: 'Q29',
    etape: 6,
    ordre: 34,
    versionCanonique: CANON_VERSION,
    libelle: 'As-tu besoin que ton Plan B commence à te rapporter de l’argent rapidement ?',
    formeReponse: 'items_avec_sous_reponse',
    itemsAvecSousReponse: {
      motif: 'champs_fixes',
      champs: [
        {
          // Sous-question conditionnelle (si besoin réel/urgent) — portée
          // dans le payload de Q29, jamais un stableId séparé.
          id: 'horizon',
          label: 'À partir de quand aurais-tu besoin que cela commence à t’apporter un revenu ?',
          formeReponse: 'choix_unique',
          options: [
            { value: 'moins_1_mois', label: 'Moins d’un mois' },
            { value: '1_3_mois', label: '1-3 mois' },
            { value: '3_6_mois', label: '3-6 mois' },
            { value: '6_12_mois', label: '6-12 mois' },
            { value: 'plus_1_an', label: 'Plus d’un an' },
            { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
          ],
        },
      ],
    },
    options: [
      { value: 'non_peux_prendre_temps', label: 'Non je peux prendre le temps' },
      { value: 'vite_mais_peux_attendre', label: 'J’aimerais que cela arrive assez vite mais je peux attendre' },
      { value: 'oui_besoin_prochains_mois', label: 'Oui j’ai besoin d’un revenu supplémentaire dans les prochains mois' },
      { value: 'oui_tres_urgent', label: 'Oui ma situation financière rend cela très urgent' },
      { value: 'varie_beaucoup', label: 'Ma situation varie beaucoup' },
      { value: 'je_prefere_ne_pas_repondre', label: 'Je préfère ne pas répondre' },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: true,
    natureObjet: 'contrainte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q30 — Mobilité réelle
  {
    stableId: 'mobilite_geographique_reelle',
    referenceEditoriale: 'Q30',
    etape: 6,
    ordre: 35,
    versionCanonique: CANON_VERSION,
    libelle: 'Aujourd’hui, jusqu’où peux-tu réellement te déplacer pour travailler ou développer une activité ?',
    formeReponse: 'choix_avec_precision',
    options: [
      { value: 'principalement_chez_moi', label: 'Principalement chez moi / très près' },
      { value: 'quartier', label: 'Quartier' },
      { value: 'ville_zone_vie', label: 'Ville / zone de vie' },
      { value: 'occasionnellement_plus_loin', label: 'Occasionnellement plus loin si cela vaut la peine' },
      { value: 'regulierement_autres_villes', label: 'Régulièrement vers d’autres villes / zones' },
      { value: 'cela_varie', label: 'Cela varie' },
      { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
    ],
    itemsAvecSousReponse: {
      motif: 'champs_fixes',
      champs: [
        {
          // Trigger fermé verrouillé (A7, D-026) : déclenchée uniquement
          // si principalement_chez_moi ou cela_varie — encodé via la
          // présence de ce champ, appliqué côté Server Action (pas un
          // 2e stableId, reste dans le payload de Q30).
          id: 'precision_deplacements',
          label: 'Y a-t-il quelque chose d’important que CoachRedo doit prendre en compte concernant tes déplacements ?',
          aide: 'Pas besoin de donner de détails privés. Indique seulement ce que cela change concrètement pour les activités que tu peux envisager.',
          formeReponse: 'texte',
        },
      ],
    },
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'contrainte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q31 — Condition indispensable
  {
    stableId: 'condition_indispensable_activite',
    referenceEditoriale: 'Q31',
    etape: 6,
    ordre: 36,
    versionCanonique: CANON_VERSION,
    libelle: 'Y a-t-il une condition importante que ta prochaine activité devra respecter dans ta vie actuelle ?',
    aide: 'Par exemple : certains horaires, rester près de chez toi, travailler principalement à distance, éviter certaines tâches ou respecter une responsabilité importante.',
    formeReponse: 'choix_avec_precision',
    options: [
      {
        value: 'oui',
        label: 'Oui',
        precision: {
          type: 'composite',
          champs: [
            { id: 'condition', label: 'Quelle condition doit-elle respecter ?', formeReponse: 'texte' },
            {
              // Sous-question systématique sur la branche Oui (A7, D-026).
              id: 'impact_concret',
              label: 'Concrètement, qu’est-ce que cela change dans ce que tu peux faire pour ta prochaine activité ?',
              formeReponse: 'texte',
            },
          ],
        },
      },
      { value: 'non', label: 'Non' },
      { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
      { value: 'je_prefere_ne_pas_repondre', label: 'Je préfère ne pas répondre' },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: true,
    natureObjet: 'contrainte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q32 — Voies que la personne est prête à envisager
  {
    stableId: 'ouverture_voies_envisageables',
    referenceEditoriale: 'Q32',
    etape: 6,
    ordre: 37,
    versionCanonique: CANON_VERSION,
    libelle: 'Pour avancer vers ton objectif, qu’es-tu réellement prêt(e) à envisager aujourd’hui ?',
    aide: 'Plusieurs réponses possibles ; aucune bonne ou mauvaise réponse.',
    formeReponse: 'multi_selection',
    options: [
      { value: 'construire_progressivement', label: 'Construire progressivement en gardant ma situation actuelle' },
      { value: 'tester_temps_libre', label: 'Utiliser mon temps libre pour tester une activité ou un service' },
      { value: 'apprendre_competence', label: 'Apprendre une nouvelle compétence si utile' },
      { value: 'chercher_emploi_mission', label: 'Chercher un emploi / une mission qui améliore ma situation' },
      { value: 'petite_activite', label: 'Commencer par une petite activité même si ce n’est pas l’objectif final' },
      { value: 'reduire_quitter_plus_tard', label: 'Plus tard réduire / quitter mon activité actuelle si une autre voie devient solide' },
      { value: 'changer_le_moins_possible', label: 'Changer le moins de choses possible pour le moment' },
      { value: 'je_ne_sais_pas_encore', label: 'Je ne sais pas encore' },
      { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'preference',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },
]
