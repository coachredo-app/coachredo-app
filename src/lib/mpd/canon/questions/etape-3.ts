// ============================================================
// MPD V3 — Canon — Étape 3 : Ton parcours
// ============================================================
// Source : MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md §2 (Étape 3).

import { CANON_VERSION, type QuestionCanonique } from '../types'

export const etape3Questions: readonly QuestionCanonique[] = [
  // Q10 — Réussites / expériences significatives
  {
    stableId: 'reussites_significatives',
    referenceEditoriale: 'Q10',
    etape: 3,
    ordre: 14,
    versionCanonique: CANON_VERSION,
    libelle: 'Dans ton parcours, quelles sont les choses que tu es content(e) d’avoir réussi à faire ?',
    aide: 'Cela peut être quelque chose que tu as réalisé, appris, amélioré ou aidé à résoudre, dans ton travail, tes études, ta famille, une activité ou ta vie quotidienne.',
    formeReponse: 'texte',
    cardinalite: { min: 0, max: 3 },
    relance: {
      // Déclenchée si au moins une réussite a été déclarée (≠ "aucune") —
      // une seule relance, jamais une par réussite.
      condition: 'reussites_significatives != aucune',
      libelle: 'Parmi ces réussites, choisis celle qui représente le mieux ce que tu sais apporter. Qu’as-tu fait toi-même pour que cela fonctionne ?',
      formeReponse: 'texte',
    },
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'capacite',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: false,
  },

  // Q11 — Origine des apprentissages
  {
    stableId: 'origine_apprentissages',
    referenceEditoriale: 'Q11',
    etape: 3,
    ordre: 15,
    versionCanonique: CANON_VERSION,
    libelle: 'Comment as-tu appris la plupart des choses que tu sais faire aujourd’hui ?',
    formeReponse: 'items_avec_sous_reponse',
    itemsAvecSousReponse: {
      motif: 'branches_par_option',
      branches: {
        etudes: [
          { id: 'niveau', label: 'Niveau', formeReponse: 'texte' },
          { id: 'domaine', label: 'Domaine', formeReponse: 'texte' },
        ],
        formation_metier: [{ id: 'domaine', label: 'Domaine', formeReponse: 'texte' }],
        travail: [
          { id: 'domaines', label: 'Domaines (max 3)', formeReponse: 'texte', cardinalite: { min: 0, max: 3 } },
          { id: 'duree_approximative', label: 'Durée approximative', formeReponse: 'texte' },
        ],
        activite_familiale: [
          { id: 'activite', label: 'Activité', formeReponse: 'texte' },
          { id: 'role', label: 'Rôle', formeReponse: 'texte' },
        ],
        autodidacte: [{ id: 'ce_qui_a_ete_appris', label: 'Ce qui a été appris', formeReponse: 'texte' }],
        online: [{ id: 'formations_certifications', label: 'Formations / certifications importantes', formeReponse: 'texte' }],
      },
    },
    options: [
      { value: 'etudes', label: 'École / études' },
      { value: 'formation_metier', label: 'Formation professionnelle / technique, apprentissage d’un métier' },
      { value: 'travail', label: 'Travail' },
      { value: 'activite_familiale', label: 'Activité familiale' },
      { value: 'autodidacte', label: 'Autodidacte' },
      { value: 'online', label: 'Formations en ligne' },
      { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
      { value: 'je_debute', label: 'Je débute / j’ai encore peu d’expérience' },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'contexte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q12 — Reconnaissance extérieure
  {
    stableId: 'reconnaissance_exterieure',
    referenceEditoriale: 'Q12',
    etape: 3,
    ordre: 16,
    versionCanonique: CANON_VERSION,
    libelle: 'Pour quelles choses les autres viennent-ils souvent te demander de l’aide, un conseil ou un avis ?',
    aide: 'Cela peut concerner le travail, les études, une activité pratique, l’organisation, la technologie, les démarches du quotidien ou autre chose. Même si cela te paraît simple ou naturel.',
    formeReponse: 'texte',
    cardinalite: { min: 0, max: 3 },
    // Options NA présentées comme alternative au texte libre plafonné.
    options: [
      { value: 'personne_ne_me_demande', label: 'Personne ne me demande particulièrement' },
      { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
    ],
    // Relance supprimée (A7, D-026).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'capacite',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q13 — Question de récupération (CONDITIONNELLE/RÉCUPÉRATION)
  {
    stableId: 'capacite_facile_sous_estimee',
    referenceEditoriale: 'Q13',
    etape: 3,
    ordre: 17,
    versionCanonique: CANON_VERSION,
    libelle: 'Y a-t-il quelque chose que tu trouves assez facile à faire alors que d’autres personnes autour de toi trouvent cela plus difficile ?',
    aide: 'Contextuelle seulement (travail / études / pratique / quotidien), pas d’exemples de capacités.',
    formeReponse: 'choix_avec_precision',
    options: [
      { value: 'oui', label: 'Oui', precision: { type: 'texte', label: 'Quoi ?' } },
      { value: 'non', label: 'Non' },
      { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
    ],
    applicabilite: 'RECUPERATION',
    trigger: {
      operateur: 'ET',
      conditions: [
        { stableId: 'reussites_significatives', regle: 'egal_a', valeur: 'aucune' },
        {
          stableId: 'reconnaissance_exterieure',
          regle: 'valeur_parmi',
          valeurs: ['personne_ne_me_demande', 'je_ne_sais_pas'],
        },
      ],
    },
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'capacite',
    conserveLibellesChoixHistoriques: true,
  },

  // Q14 — Apprentissage issu d'une difficulté
  {
    stableId: 'apprentissage_depuis_difficulte',
    referenceEditoriale: 'Q14',
    etape: 3,
    ordre: 18,
    versionCanonique: CANON_VERSION,
    libelle: 'As-tu déjà vécu une situation difficile ou exigeante qui t’a appris quelque chose d’utile pour la suite ?',
    formeReponse: 'choix_avec_precision',
    options: [
      {
        value: 'oui',
        label: 'Oui',
        precision: {
          type: 'texte',
          label: 'Qu’est-ce que cette expérience t’a appris à faire ou à mieux gérer ?',
        },
      },
      { value: 'non', label: 'Non' },
      { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
      { value: 'je_prefere_ne_pas_repondre', label: 'Je préfère ne pas répondre' },
    ],
    // Relance supprimée (A7, D-026). Réutilisation avec Q24 : aucun
    // mécanisme (A7, D-026).
    eligibiliteInconnu: true,
    eligibiliteRefus: true,
    natureObjet: 'comportement_passe',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q15 — Stratégie d'apprentissage (SOCLE, A7)
  {
    stableId: 'strategie_apprentissage_nouveau',
    referenceEditoriale: 'Q15',
    etape: 3,
    ordre: 19,
    versionCanonique: CANON_VERSION,
    libelle: 'Pense à une fois où tu as dû apprendre quelque chose d’important que tu ne savais pas faire au départ. Comment t’y es-tu pris ?',
    formeReponse: 'texte',
    // Relance supprimée (A7, D-026).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'comportement_passe',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: false,
  },

  // Q16 — Valeur déjà apportée
  {
    stableId: 'episode_valeur_deja_apportee',
    referenceEditoriale: 'Q16',
    etape: 3,
    ordre: 20,
    versionCanonique: CANON_VERSION,
    libelle: 'As-tu déjà utilisé ce que tu sais faire pour rendre un service, aider quelqu’un à obtenir un résultat ou vendre quelque chose ?',
    aide: 'Cela peut avoir été payé ou non.',
    formeReponse: 'choix_avec_precision',
    options: [
      {
        value: 'oui',
        label: 'Oui',
        precision: {
          type: 'composite',
          champs: [
            {
              id: 'exemple',
              label: 'Donne-nous un exemple : qu’as-tu fait, pour qui, et qu’est-ce qui s’est passé ?',
              formeReponse: 'texte',
            },
            {
              // Sous-question systématique sur la branche Oui (A7, D-026).
              // Cardinalité verrouillée (T7.3C) : plusieurs traces peuvent
              // coexister (ex. payé ET recommandé) — multi_selection.
              id: 'trace_valeur',
              label:
                'Est-ce que cette personne t’a payé, donné quelque chose en échange, recommandé à quelqu’un ou demandé de recommencer ?',
              formeReponse: 'multi_selection',
              options: [
                { value: 'paye', label: 'Payé(e)' },
                { value: 'donne_en_echange', label: 'Donné quelque chose en échange' },
                { value: 'recommande', label: 'Recommandé à quelqu’un' },
                { value: 'redemande', label: 'Demandé de recommencer' },
                { value: 'aucun', label: 'Aucun de ces éléments' },
              ],
            },
          ],
        },
      },
      { value: 'non', label: 'Non' },
      { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'comportement_passe',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q17 — Ce qu'on veut réutiliser / éviter
  {
    stableId: 'capacites_a_reutiliser_eviter',
    referenceEditoriale: 'Q17',
    etape: 3,
    ordre: 21,
    versionCanonique: CANON_VERSION,
    libelle: 'Ce que tu sais déjà faire : ce que tu veux réutiliser, ce que tu préfères éviter.',
    formeReponse: 'items_avec_sous_reponse',
    itemsAvecSousReponse: {
      motif: 'champs_fixes',
      champs: [
        {
          id: 'a_reutiliser',
          label: 'Dans ce que tu sais déjà faire, qu’aimerais-tu utiliser encore dans la suite ?',
          formeReponse: 'choix_avec_precision',
          options: [
            { value: 'aucun', label: 'Aucun' },
            { value: 'reponse', label: '(réponse libre)', precision: { type: 'texte' } },
          ],
        },
        {
          id: 'a_eviter',
          label: 'Et y a-t-il des choses que tu sais faire mais que tu préférerais éviter dans la suite ?',
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
    natureObjet: 'preference',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },
]
