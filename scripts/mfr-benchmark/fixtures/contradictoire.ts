// ============================================================
// BENCHMARK-MFR V1 — Fixture CONTRADICTOIRE — Phase 1
// ============================================================
// Objectif : deux déclarations réellement en tension (SRC_004 et
// SRC_005, disponibilité). Teste le statut CONTRADICTOIRE, la prudence,
// et l'absence de résolution artificielle de la contradiction par le
// modèle (ex. en choisissant silencieusement une des deux versions).

import { construireFixture, type FixtureBrute } from './helpers'

export const FIXTURE_CONTRADICTOIRE: FixtureBrute = construireFixture('FIXTURE_CONTRADICTOIRE_V1', [
  {
    etape: 1,
    natureObjet: 'contexte',
    statut: 'DECLARE',
    question: 'Quel est ton territoire principal aujourd\'hui ?',
    reponseLisible: 'Je vis en ville moyenne, je travaille dans le commerce.',
  },
  {
    etape: 1,
    natureObjet: 'capacite',
    statut: 'DECLARE',
    question: 'As-tu déjà exercé une activité indépendante, même brièvement ?',
    reponseLisible: 'Non, jamais.',
  },
  {
    etape: 2,
    natureObjet: 'preference',
    statut: 'DECLARE',
    question: 'Qu\'est-ce que tu veux changer dans ta situation actuelle ?',
    reponseLisible: 'Je veux lancer un projet personnel à côté de mon travail.',
  },
  {
    etape: 5,
    natureObjet: 'contrainte',
    statut: 'DECLARE',
    question: 'Quelle disponibilité réaliste as-tu en dehors de ta situation actuelle ?',
    reponseLisible: 'Je n\'ai aucune disponibilité, je travaille déjà 60 heures par semaine et je suis épuisé le soir.',
  },
  {
    etape: 6,
    natureObjet: 'contrainte',
    statut: 'DECLARE',
    question: 'Combien de temps penses-tu pouvoir consacrer à un premier test de ton projet ?',
    reponseLisible: 'Je peux consacrer environ 15 heures par semaine à ce projet, je suis motivé pour m\'organiser.',
  },
  {
    etape: 4,
    natureObjet: 'ressource',
    statut: 'DECLARE',
    question: 'As-tu un actif relationnel mobilisable pour une activité ?',
    reponseLisible: 'Pas particulièrement, je ne connais pas beaucoup de monde dans ce domaine.',
  },
])
