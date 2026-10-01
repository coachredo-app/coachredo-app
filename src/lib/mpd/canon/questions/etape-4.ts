// ============================================================
// MPD V3 — Canon — Étape 4 : Ce que tu as déjà en main
// ============================================================
// Source : MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md §2 (Étape 4).

import { CANON_VERSION, type QuestionCanonique } from '../types'

export const etape4Questions: readonly QuestionCanonique[] = [
  // Q18 — Capacités actuelles
  {
    stableId: 'capacites_mobilisables_actuelles',
    referenceEditoriale: 'Q18',
    etape: 4,
    ordre: 22,
    versionCanonique: CANON_VERSION,
    libelle: 'Aujourd’hui, qu’est-ce que tu sais réellement faire par toi-même ?',
    aide: 'Pense à ce que tu sais faire au travail, dans tes études, dans une activité, un métier ou dans la vie quotidienne. Pas besoin d’être expert(e).',
    formeReponse: 'items_avec_sous_reponse',
    cardinalite: { min: 0, max: 5 },
    itemsAvecSousReponse: {
      motif: 'liste_declaree',
      cardinalite: { min: 0, max: 5 },
      sousReponse: {
        id: 'mobilisabilite',
        label: 'Aujourd’hui, tu pourrais encore le faire :',
        formeReponse: 'choix_unique',
        options: [
          { value: 'oui_facilement', label: 'Oui facilement' },
          { value: 'oui_remise_a_niveau', label: 'Oui avec une petite remise à niveau' },
          { value: 'non_beaucoup_reapprendre', label: 'Non, je devrais beaucoup réapprendre' },
          { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
        ],
      },
    },
    options: [{ value: 'aucune', label: 'Aucune' }],
    // Doctrine verrouillée : Q18 mesure la mobilisabilité actuelle,
    // jamais la preuve d'existence de la capacité — ne participe jamais
    // à la convergence D→E (voir natureObjet=ressource, T7.2B/T7.3 §5/§6).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'ressource',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q19 — Moyens matériels
  {
    stableId: 'moyens_materiels_disponibles',
    referenceEditoriale: 'Q19',
    etape: 4,
    ordre: 23,
    versionCanonique: CANON_VERSION,
    libelle: 'Parmi ces moyens, lesquels pourrais-tu réellement utiliser pour construire ton Plan B ?',
    formeReponse: 'multi_selection',
    options: [
      { value: 'smartphone', label: 'Smartphone' },
      { value: 'ordinateur', label: 'Ordinateur' },
      { value: 'connexion_internet', label: 'Connexion Internet suffisamment fiable' },
      { value: 'transport', label: 'Transport' },
      { value: 'endroit_pour_travailler', label: 'Endroit pour travailler' },
      { value: 'espace_recevoir', label: 'Espace permettant de recevoir des personnes si nécessaire' },
      {
        value: 'materiel_activite',
        label: 'Matériel lié à une activité / métier',
        precision: { type: 'texte', label: 'Préciser lequel' },
      },
      { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
      { value: 'aucun', label: 'Aucun' },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'ressource',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q20 — Autonomie numérique
  {
    stableId: 'autonomie_numerique_fonctionnelle',
    referenceEditoriale: 'Q20',
    etape: 4,
    ordre: 24,
    versionCanonique: CANON_VERSION,
    libelle: 'Avec un smartphone ou un ordinateur, qu’est-ce que tu sais faire seul(e) aujourd’hui ?',
    aide: 'Choisis seulement ce que tu peux faire sans avoir besoin qu’on te guide à chaque étape.',
    formeReponse: 'multi_selection',
    options: [
      { value: 'rechercher_internet', label: 'Rechercher sur Internet' },
      { value: 'messages_photos_documents', label: 'Messages / photos / documents' },
      { value: 'email', label: 'E-mail' },
      { value: 'formulaires_demarches', label: 'Formulaires / démarches en ligne' },
      { value: 'documents_simples', label: 'Documents simples' },
      { value: 'tableur_basique', label: 'Tableur basique' },
      { value: 'visuel_presentation', label: 'Visuel / présentation' },
      { value: 'publication_reseaux_sociaux', label: 'Publication réseaux sociaux' },
      { value: 'compte_social_professionnel', label: 'Gestion d’un compte social professionnel' },
      { value: 'appel_video', label: 'Appel vidéo' },
      { value: 'achat_vente_commande_en_ligne', label: 'Acheter / vendre / recevoir une commande en ligne' },
      { value: 'paiement_numerique', label: 'Paiement numérique' },
      { value: 'outils_ia', label: 'Outils IA pour rechercher / écrire / créer / travailler' },
      { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
      { value: 'peu_de_choses_seul', label: 'Peu de choses seul(e)' },
    ],
    // Doctrine verrouillée (micro-arbitrage post-D-026, D-027) : jamais
    // une classification numérique globale, jamais un sous-moteur propre
    // à Q20 — ne participe jamais à la convergence D→E (natureObjet=ressource).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'ressource',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q21 — Langues fonctionnelles
  {
    stableId: 'langues_fonctionnelles',
    referenceEditoriale: 'Q21',
    etape: 4,
    ordre: 25,
    versionCanonique: CANON_VERSION,
    libelle: 'Quelles langues peux-tu utiliser aujourd’hui, même si tu ne les maîtrises pas parfaitement ?',
    formeReponse: 'items_avec_sous_reponse',
    itemsAvecSousReponse: {
      motif: 'liste_declaree',
      cardinalite: { min: 0, max: 10 },
      sousReponse: {
        id: 'usages',
        label: 'Avec cette langue, qu’est-ce que tu peux réellement faire ?',
        formeReponse: 'multi_selection',
        options: [
          { value: 'converser', label: 'Converser' },
          { value: 'echanger_professionnel', label: 'Échanger avec client / fournisseur / partenaire' },
          { value: 'lire_documents', label: 'Lire informations / documents utiles' },
          { value: 'ecrire_messages_pro', label: 'Écrire des messages / textes professionnels' },
        ],
      },
    },
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'ressource',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q22 — Réseau d'aide
  {
    stableId: 'reseau_aide_mobilisable',
    referenceEditoriale: 'Q22',
    etape: 4,
    ordre: 26,
    versionCanonique: CANON_VERSION,
    libelle: 'Si tu avais besoin d’aide pour avancer, y a-t-il des personnes que tu pourrais réellement contacter ?',
    aide: 'Pas besoin de donner leurs noms. Indique simplement le type d’aide que tu pourrais leur demander.',
    formeReponse: 'multi_selection',
    options: [
      { value: 'conseil_experience', label: 'Conseil / expérience' },
      {
        value: 'information_secteur_metier',
        label: 'Information secteur / métier',
        precision: { type: 'texte', label: 'Préciser le domaine / l’activité' },
      },
      { value: 'aide_competence_manquante', label: 'Aide sur compétence manquante' },
      {
        value: 'introduction_mise_en_relation',
        label: 'Introduction / mise en relation',
        precision: { type: 'texte', label: 'Préciser le domaine / l’activité' },
      },
      { value: 'aide_pratique_administrative', label: 'Aide pratique / administrative' },
      { value: 'encouragement_action', label: 'Encouragement / aide à passer à l’action' },
      { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
      { value: 'personne', label: 'Personne' },
      { value: 'je_ne_sais_pas', label: 'Je ne sais pas' },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'ressource',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Micro-donnée « actif relationnel mobilisable » — AJOUTÉE (D-022)
  {
    stableId: 'actif_relationnel_mobilisable',
    referenceEditoriale: 'micro-donnée « actif relationnel mobilisable », rattachée à l’Étape 4',
    etape: 4,
    ordre: 27,
    versionCanonique: CANON_VERSION,
    libelle: 'As-tu déjà un groupe ou un réseau de personnes que tu peux contacter directement si tu veux apprendre de leurs besoins, tester une idée ou leur proposer quelque chose ?',
    formeReponse: 'choix_avec_precision',
    options: [
      {
        value: 'oui',
        label: 'Oui',
        precision: {
          type: 'composite',
          champs: [
            {
              id: 'type_reseau',
              label: 'De quel type de groupe ou réseau s’agit-il principalement ?',
              formeReponse: 'choix_unique',
              options: [
                { value: 'reseau_professionnel', label: 'Réseau professionnel' },
                { value: 'anciens_clients_contacts', label: 'Anciens clients ou contacts' },
                { value: 'communaute_en_ligne', label: 'Communauté en ligne' },
                { value: 'groupe_association', label: 'Groupe ou association' },
                { value: 'entourage_reseau_local', label: 'Entourage ou réseau local' },
                { value: 'autre', label: 'Autre', precision: { type: 'texte' } },
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
    natureObjet: 'ressource',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },
]
