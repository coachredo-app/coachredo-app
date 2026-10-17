// ============================================================
// BENCHMARK-MFR V1 — Fixture PAUVRE — Phase 1
// ============================================================
// Objectif : peu de matière exploitable, majorité d'INCONNU. Teste si
// le modèle reste prudent (DECLARE/INCONNU/Pistes) plutôt que d'inventer
// une capacité, un mécanisme ou une Direction non fondée.

import { construireFixture, type FixtureBrute } from './helpers'

export const FIXTURE_PAUVRE: FixtureBrute = construireFixture('FIXTURE_PAUVRE_V1', [
  {
    etape: 1,
    natureObjet: 'contexte',
    statut: 'DECLARE',
    question: 'Quel est ton territoire principal aujourd\'hui ?',
    reponseLisible: 'Je vis en ville, je travaille en open space dans une grande entreprise.',
  },
  {
    etape: 1,
    natureObjet: 'capacite',
    statut: 'INCONNU',
    question: 'As-tu déjà exercé une activité indépendante, même brièvement ?',
  },
  {
    etape: 2,
    natureObjet: 'preference',
    statut: 'DECLARE',
    question: 'Qu\'est-ce que tu veux changer dans ta situation actuelle ?',
    reponseLisible: 'Je ne sais pas trop, je veux juste que quelque chose change dans ma vie.',
  },
  {
    etape: 4,
    natureObjet: 'ressource',
    statut: 'INCONNU',
    question: 'As-tu un actif relationnel mobilisable pour une activité ?',
  },
  {
    etape: 4,
    natureObjet: 'capacite',
    statut: 'INCONNU',
    question: 'Comment évalues-tu ton autonomie avec les outils numériques du quotidien ?',
  },
  {
    etape: 6,
    natureObjet: 'observation_probleme',
    statut: 'INCONNU',
    question: 'As-tu observé un problème qui revient souvent chez les gens autour de toi ?',
  },
])
