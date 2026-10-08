// ============================================================
// MPD V3 — Canon — Étape 7 : Ce que tu observes autour de toi
// ============================================================
// Source : MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md §2 (Étape 7).

import { CANON_VERSION, type QuestionCanonique } from '../types'

export const etape7Questions: readonly QuestionCanonique[] = [
  // Q33 — Environnements connus
  {
    stableId: 'environnements_personnes_connus',
    referenceEditoriale: 'Q33',
    etape: 7,
    ordre: 38,
    versionCanonique: CANON_VERSION,
    libelle: 'Y a-t-il des personnes ou des activités que tu connais bien dans ta vie actuelle ou grâce à ton expérience ?',
    aide: 'Par exemple : des commerçants, des étudiants, des parents, des chauffeurs, des restaurateurs, des artisans, des sportifs, des vendeurs en ligne… Cela peut venir de ton travail, de ta famille, de ton quartier ou de tes activités.',
    formeReponse: 'texte',
    cardinalite: { min: 0, max: 5 },
    options: [{ value: 'aucun_ne_me_vient', label: 'Aucun ne me vient à l’esprit' }],
    // Relance supprimée (A7, D-026). Réutilisation depuis Q11 : hypothèse
    // à confirmer uniquement (A7, D-026), jamais transférée automatiquement.
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'contexte',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q34 — Problèmes observés
  {
    stableId: 'problemes_observes_recurrents',
    referenceEditoriale: 'Q34',
    etape: 7,
    ordre: 39,
    versionCanonique: CANON_VERSION,
    libelle: 'Dans ta vie ou parmi les personnes que tu connais, quels problèmes vois-tu revenir souvent ?',
    aide: 'Pense à des choses qui te posent problème à toi aussi, ou dont les autres se plaignent, qui font perdre du temps ou de l’argent, qui sont compliquées à faire ou pour lesquelles on cherche souvent de l’aide.',
    formeReponse: 'texte',
    cardinalite: { min: 0, max: 3 },
    options: [{ value: 'aucun_pour_le_moment', label: 'Je n’en vois pas pour le moment' }],
    // Relance supprimée (A7, D-026).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'observation_probleme',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q35 — Accès aux personnes concernées (CONDITIONNELLE)
  {
    stableId: 'acces_personnes_concernees',
    referenceEditoriale: 'Q35',
    etape: 7,
    ordre: 40,
    versionCanonique: CANON_VERSION,
    libelle: 'Parmi ces personnes, y en a-t-il à qui tu pourrais facilement parler pour mieux comprendre leurs problèmes ?',
    aide: 'Par exemple : leur poser quelques questions, leur demander comment ils font aujourd’hui, ce qui leur pose le plus de difficultés ou ce qu’ils ont déjà essayé.',
    formeReponse: 'choix_avec_precision',
    options: [
      {
        value: 'oui_plusieurs',
        label: 'Oui plusieurs',
        precision: { type: 'texte', label: 'À quelles personnes pourrais-tu parler le plus facilement ?' },
      },
      {
        value: 'oui_quelques_unes',
        label: 'Oui quelques-unes',
        precision: { type: 'texte', label: 'À quelles personnes pourrais-tu parler le plus facilement ?' },
      },
      { value: 'peut_etre_pas_facile', label: 'Peut-être mais ce ne serait pas facile' },
      { value: 'non_pas_vraiment', label: 'Non pas vraiment' },
      // GO QG (finalisation INCONNU) : doublon UX avec le statut système
      // INCONNU, masqué pour les nouvelles réponses — value conservée.
      { value: 'je_ne_sais_pas', label: 'Je ne sais pas', redondantAvecInconnu: true },
    ],
    applicabilite: 'CONDITIONNELLE',
    trigger: {
      operateur: 'OU',
      conditions: [
        {
          stableId: 'environnements_personnes_connus',
          regle: 'contient_une_entree_hors',
          valeurExclue: 'aucun_ne_me_vient',
        },
        {
          stableId: 'problemes_observes_recurrents',
          regle: 'contient_une_entree_hors',
          valeurExclue: 'aucun_pour_le_moment',
        },
      ],
    },
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'ressource',
    conserveLibellesChoixHistoriques: true,
  },

  // Q36 — Comportement actuel face au problème (CONDITIONNELLE)
  {
    stableId: 'comportement_actuel_face_probleme',
    referenceEditoriale: 'Q36',
    etape: 7,
    ordre: 41,
    versionCanonique: CANON_VERSION,
    libelle: 'Quand ces personnes rencontrent ce problème, que font-elles aujourd’hui pour essayer de le résoudre ?',
    aide: 'Par exemple : elles se débrouillent seules, demandent de l’aide à quelqu’un, utilisent un outil ou un service, paient déjà pour une solution, ou ne font rien de particulier.',
    formeReponse: 'texte_avec_provenance',
    texteAvecProvenance: {
      // Formulation UX exacte non figée par le questionnaire source
      // (« Formulation UX exacte à spécifier ultérieurement ») — les
      // 4 catégories structurelles sont néanmoins déjà verrouillées.
      provenanceOptions: [
        { value: 'observee_directement', label: 'Je l’ai vu moi-même' },
        { value: 'entendue_personnes_concernees', label: 'Ces personnes m’en ont parlé' },
        { value: 'supposee_deduite', label: 'Je le suppose, mais je n’en suis pas sûr' },
        { value: 'pas_vraiment_connue', label: 'Je ne sais pas vraiment' },
      ],
      formulationFigee: false,
    },
    options: [{ value: 'je_ne_sais_pas', label: 'Je ne sais pas' }],
    // Anomalie 13 (Lot B) : cette alternative fait doublon avec le
    // statut système INCONNU (aucune fonction propre — contrairement à
    // la provenance « pas_vraiment_connue », qui qualifie une réponse
    // réellement fournie). Masquée dans le rendu des NOUVELLES
    // réponses ; la value reste lue pour les réponses DECLARE déjà
    // enregistrées.
    alternativeRedondanteAvecInconnu: true,
    // Pas de relance automatique — « je ne sais pas » devient une
    // information à vérifier sur le terrain, pas un manque à combler.
    applicabilite: 'CONDITIONNELLE',
    trigger: {
      operateur: 'ET',
      conditions: [
        {
          stableId: 'problemes_observes_recurrents',
          regle: 'contient_une_entree_hors',
          valeurExclue: 'aucun_pour_le_moment',
        },
      ],
    },
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'observation_probleme',
    conserveLibellesChoixHistoriques: true,
  },
]
