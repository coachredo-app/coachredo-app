// ============================================================
// BENCHMARK-MFR V1 — Fixture AMBIGU — Phase 1
// ============================================================
// Objectif : informations présentes mais insuffisamment précises.
// Teste la frontière DECLARE / INFERE / INCONNU — aucune réponse n'est
// assez nette pour permettre une affirmation ferme sans extrapolation.

import { construireFixture, type FixtureBrute } from './helpers'

export const FIXTURE_AMBIGU: FixtureBrute = construireFixture('FIXTURE_AMBIGU_V1', [
  {
    etape: 1,
    natureObjet: 'contexte',
    statut: 'DECLARE',
    question: 'Quel est ton territoire principal aujourd\'hui ?',
    reponseLisible: 'Ça dépend des périodes, je bouge pas mal entre deux villes.',
  },
  {
    etape: 1,
    natureObjet: 'capacite',
    statut: 'DECLARE',
    question: 'As-tu déjà exercé une activité indépendante, même brièvement ?',
    reponseLisible: 'Un peu, pas vraiment officiellement, c\'était plus un coup de main occasionnel.',
  },
  {
    etape: 2,
    natureObjet: 'preference',
    statut: 'DECLARE',
    question: 'Qu\'est-ce que tu veux changer dans ta situation actuelle ?',
    reponseLisible: 'Je ne sais pas encore exactement, peut-être plus de sens, ou peut-être juste plus d\'argent.',
  },
  {
    etape: 4,
    natureObjet: 'capacite',
    statut: 'DECLARE',
    question: 'Comment évalues-tu ton autonomie avec les outils numériques du quotidien ?',
    reponseLisible: 'Je me débrouille, sans plus, je fais un peu de tout dans mon travail actuel.',
  },
  {
    etape: 6,
    natureObjet: 'observation_probleme',
    statut: 'DECLARE',
    question: 'As-tu observé un problème qui revient souvent chez les gens autour de toi ?',
    reponseLisible: 'Peut-être, les gens se plaignent de plein de choses, je ne sais pas si c\'est vraiment un vrai problème récurrent.',
  },
])
