// ============================================================
// MPD V3 — Canon — Étape 2 : Ce que tu veux changer
// ============================================================
// Source : MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md §2 (Étape 2).
//
// WHY : le questionnaire source documente "WHY" ("Pourquoi est-ce
// important pour toi ?") comme une unité SOCLE non numérotée distincte,
// juste après Q7 — explicitement nommée comme telle dans le
// questionnaire source (§3 : "Q6/Q7/WHY (restructurés en donnée
// directionnelle structurée, A7)"). Modélisée ici comme stableId
// autonome (T7.3C).

import { CANON_VERSION, type QuestionCanonique } from '../types'

export const etape2Questions: readonly QuestionCanonique[] = [
  // Q6 — Changement recherché
  {
    stableId: 'changement_recherche',
    referenceEditoriale: 'Q6',
    etape: 2,
    ordre: 8,
    versionCanonique: CANON_VERSION,
    libelle: 'Si ton Plan B commençait vraiment à fonctionner, qu’aimerais-tu qu’il change concrètement dans ta vie ?',
    aide: 'Pense à ce que tu aimerais voir réellement changer dans ta situation ou dans ta vie.',
    formeReponse: 'texte',
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'preference',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: false,
  },

  // Q7 — Priorité
  {
    stableId: 'priorite_changement',
    referenceEditoriale: 'Q7',
    etape: 2,
    ordre: 9,
    versionCanonique: CANON_VERSION,
    libelle: 'Parmi ce que tu viens de décrire, qu’est-ce qui compte le plus pour toi aujourd’hui ?',
    aide: 'aucune',
    formeReponse: 'texte',
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'preference',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: false,
  },

  // WHY — Pourquoi est-ce important, non numérotée — RESTAURÉE AUTONOME (T7.3B)
  {
    stableId: 'raison_importance_priorite',
    referenceEditoriale: 'WHY',
    etape: 2,
    ordre: 10,
    versionCanonique: CANON_VERSION,
    libelle: 'Pourquoi est-ce important pour toi ?',
    formeReponse: 'texte',
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'preference',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: false,
  },

  // Donnée structurée de direction, non numérotée — AJOUTÉE (A7, D-026)
  {
    stableId: 'direction_long_terme',
    referenceEditoriale: 'donnée structurée de direction, non numérotée',
    etape: 2,
    ordre: 11,
    versionCanonique: CANON_VERSION,
    libelle: 'Et au-delà de ce changement, y a-t-il quelque chose de plus grand vers lequel tu aimerais avancer ?',
    formeReponse: 'choix_avec_precision',
    options: [
      {
        value: 'oui',
        label: 'Oui',
        precision: { type: 'texte', label: 'À terme, vers quoi aimerais-tu que cela te mène ?' },
      },
      { value: 'non_deja_satisfait', label: 'Non, ce changement correspond déjà à ce que je recherche' },
      { value: 'je_ne_sais_pas_encore', label: 'Je ne sais pas encore' },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'preference',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q8 — Ce qu'il faut préserver
  {
    stableId: 'elements_a_preserver',
    referenceEditoriale: 'Q8',
    etape: 2,
    ordre: 12,
    versionCanonique: CANON_VERSION,
    libelle: 'Pendant que tu construis ton Plan B, qu’est-ce qui est important pour toi de garder dans ta vie actuelle ?',
    aide: 'Par exemple : du temps pour ta famille, ton revenu actuel, tes études, ta santé, une certaine stabilité ou autre chose d’important pour toi.',
    formeReponse: 'choix_avec_precision',
    options: [
      { value: 'rien_de_particulier', label: 'Rien de particulier' },
      { value: 'preserver', label: '(réponse libre)', precision: { type: 'texte' } },
    ],
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'preference',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: true,
  },

  // Q9 — Signe de progression
  {
    stableId: 'signe_de_progression',
    referenceEditoriale: 'Q9',
    etape: 2,
    ordre: 13,
    versionCanonique: CANON_VERSION,
    libelle: 'Qu’est-ce qui te montrerait concrètement que ton Plan B commence à avancer ?',
    aide: 'Pense à quelque chose que tu pourrais réellement constater.',
    formeReponse: 'texte',
    // Relance supprimée (A7, D-026).
    eligibiliteInconnu: true,
    eligibiliteRefus: false,
    natureObjet: 'preference',
    applicabilite: 'SOCLE',
    conserveLibellesChoixHistoriques: false,
  },
]
