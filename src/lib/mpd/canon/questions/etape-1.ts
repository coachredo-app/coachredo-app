// ============================================================
// MPD V3 — Canon — Étape 1 : Ta situation aujourd'hui
// ============================================================
// Source : docs/project-memory/MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md §2
// (Étape 1). Libellés et options reproduits fidèlement, non reformulés.

import { CANON_VERSION, type QuestionCanonique } from '../types'

export const etape1Questions: readonly QuestionCanonique[] = [
  // Q1 — Situation principale
  {
    stableId: 'situation_principale',
    referenceEditoriale: 'Q1',
    etape: 1,
    ordre: 1,
    versionCanonique: CANON_VERSION,
    libelle: 'Quelle est ta situation principale aujourd’hui ?',
    formeReponse: 'choix_unique',
    options: [
      { value: 'salarie', label: 'Salarié(e)' },
      { value: 'a_mon_compte_independant', label: 'À mon compte / indépendant(e)' },
      { value: 'etudiant', label: 'Étudiant(e)' },
      { value: 'en_recherche_emploi', label: 'En recherche d’emploi' },
      { value: 'sans_activite', label: 'Sans activité professionnelle actuellement' },
      { value: 'retraite', label: 'Retraité(e)' },
      { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'contexte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Branche « activité existante », rattachée à Q1 — AJOUTÉE (D-022)
  {
    stableId: 'activite_parallele_existante',
    referenceEditoriale: 'branche « activité existante », rattachée à Q1',
    etape: 1,
    ordre: 2,
    versionCanonique: CANON_VERSION,
    libelle:
      'En parallèle de ta situation principale, as-tu déjà une activité, un service ou un petit business que tu développes ou qui te rapporte parfois de l’argent ?',
    formeReponse: 'choix_avec_precision',
    options: [
      {
        value: 'oui',
        label: 'Oui',
        precision: {
          type: 'composite',
          champs: [
            {
              id: 'description',
              label: 'En une phrase, de quoi s’agit-il ?',
              formeReponse: 'texte',
            },
            {
              id: 'stade',
              label: 'Où en est cette activité aujourd’hui ?',
              formeReponse: 'choix_unique',
              options: [
                { value: 'vient_commencer', label: 'Je viens juste de commencer' },
                { value: 'en_test', label: 'Je suis en train de la tester' },
                { value: 'fonctionne_modestement', label: 'Elle fonctionne déjà, même modestement' },
                { value: 'bien_installee', label: 'Elle est déjà bien installée' },
              ],
            },
          ],
        },
      },
      { value: 'non', label: 'Non' },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'contexte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Micro-donnée « territoire principal » — AJOUTÉE (D-022)
  {
    stableId: 'territoire_principal',
    referenceEditoriale: 'micro-donnée « territoire principal », rattachée à l’Étape 1',
    etape: 1,
    ordre: 3,
    versionCanonique: CANON_VERSION,
    libelle:
      'Depuis quel pays ou territoire envisages-tu principalement de développer ton Plan B aujourd’hui ?',
    formeReponse: 'choix_avec_precision',
    // Liste des pays/territoires volontairement non figée ici (relève
    // d'un référentiel géographique, pas d'une décision du canon) ;
    // seules les deux valeurs structurantes du questionnaire source
    // sont représentées explicitement.
    options: [
      { value: 'territoire', label: '(pays/territoire sélectionnable)', precision: { type: 'texte' } },
      { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
      { value: 'je_ne_sais_pas_encore', label: 'Je ne sais pas encore' },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'contexte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q2 — Occupations importantes
  {
    stableId: 'occupations_temps_existantes',
    referenceEditoriale: 'Q2',
    etape: 1,
    ordre: 4,
    versionCanonique: CANON_VERSION,
    libelle:
      'En dehors de ton activité principale, qu’est-ce qui prend régulièrement une partie importante de ton temps ?',
    formeReponse: 'multi_selection',
    options: [
      { value: 'enfants', label: 'Enfants' },
      { value: 'responsabilites_familiales', label: 'Responsabilités familiales' },
      { value: 'maison_taches', label: 'Maison / tâches du quotidien' },
      { value: 'etudes_formation', label: 'Études / formation' },
      { value: 'autre_travail_activite', label: 'Autre travail / activité' },
      { value: 'association_communaute', label: 'Association / communauté' },
      { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
      { value: 'rien_de_particulier', label: 'Rien de particulier' },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'contexte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q3 — Temps réellement disponible
  {
    stableId: 'temps_disponible_hebdomadaire',
    referenceEditoriale: 'Q3',
    etape: 1,
    ordre: 5,
    versionCanonique: CANON_VERSION,
    libelle: 'Dans une semaine normale, combien de temps peux-tu réellement consacrer à ton Plan B ?',
    formeReponse: 'items_avec_sous_reponse',
    itemsAvecSousReponse: {
      motif: 'champs_fixes',
      champs: [
        {
          id: 'quantite',
          label: 'Temps disponible',
          formeReponse: 'choix_unique',
          options: [
            { value: 'moins_2h', label: 'Moins de 2h' },
            { value: '2_4h', label: '2-4h' },
            { value: '5_9h', label: '5-9h' },
            { value: '10_20h', label: '10-20h' },
            { value: 'plus_20h', label: 'Plus de 20h' },
            { value: 'cela_varie', label: 'Cela varie' },
            { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
          ],
        },
        {
          id: 'structure',
          label: 'À quels moments peux-tu généralement consacrer ce temps à ton Plan B ?',
          formeReponse: 'choix_unique',
          options: [
            { value: 'un_peu_chaque_jour', label: 'Un peu chaque jour' },
            { value: 'soirs_semaine', label: 'Soirs de semaine' },
            { value: 'week_end', label: 'Week-end' },
            { value: 'blocs_longs', label: 'Blocs de temps plus longs' },
            { value: 'cela_varie', label: 'Cela varie' },
            { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
          ],
        },
      ],
    },
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'ressource',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q4 — Réalité récente du temps
  {
    stableId: 'temps_semaine_recente',
    referenceEditoriale: 'Q4',
    etape: 1,
    ordre: 6,
    versionCanonique: CANON_VERSION,
    libelle: 'Pense à la semaine dernière. Qu’est-ce qui a pris le plus de ton temps ?',
    formeReponse: 'multi_selection',
    cardinalite: { min: 0, max: 3 },
    options: [
      { value: 'travail_activite_pro', label: 'Travail / activité pro' },
      { value: 'etudes_formation', label: 'Études / formation' },
      { value: 'enfants_famille', label: 'Enfants / famille' },
      { value: 'maison_taches', label: 'Maison / tâches' },
      { value: 'deplacements', label: 'Déplacements' },
      { value: 'projet_activite_perso', label: 'Projet / activité personnelle' },
      { value: 'loisirs_sorties', label: 'Loisirs / sorties' },
      { value: 'repos', label: 'Repos' },
      { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
    ],
    itemsAvecSousReponse: {
      motif: 'champs_fixes',
      champs: [
        {
          id: 'semaine_habituelle',
          label: 'Cette semaine ressemblait-elle à une semaine habituelle pour toi ?',
          formeReponse: 'choix_unique',
          options: [
            { value: 'oui_plutot', label: 'Oui plutôt' },
            { value: 'non_exceptionnelle', label: 'Non elle était exceptionnelle' },
            { value: 'ca_varie_beaucoup', label: 'Ça varie beaucoup' },
          ],
        },
      ],
    },
    relance: {
      // Déclenchée si la réponse structurée à "semaine_habituelle" ≠
      // "oui_plutot" — jamais une comparaison sémantique du contenu.
      condition: 'semaine_habituelle != oui_plutot',
      libelle:
        'Tu as indiqué pouvoir consacrer environ [X] heures par semaine à ton Plan B. Avec ton organisation actuelle, à quels moments pourrais-tu réellement trouver ce temps ?',
      formeReponse: 'texte',
    },
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'contexte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q5 — Pourquoi maintenant
  {
    stableId: 'declencheur_plan_b',
    referenceEditoriale: 'Q5',
    etape: 1,
    ordre: 7,
    versionCanonique: CANON_VERSION,
    libelle: 'Pourquoi cherches-tu à construire un Plan B maintenant ?',
    aide:
      'Qu’est-ce qui, dans ta situation actuelle, t’a donné envie ou besoin de commencer à chercher une autre voie ?',
    formeReponse: 'texte',
    // Relance supprimée (A7, D-026) — non déterminable sans lecture
    // sémantique du texte libre.
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'contexte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: false,
  },
]
