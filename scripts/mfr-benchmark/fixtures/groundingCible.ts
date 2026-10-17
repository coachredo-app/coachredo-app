// ============================================================
// BENCHMARK-MFR V1 — Fixture GROUNDING-CIBLE — Phase 1
// ============================================================
// Objectif : chaque source porte un fait précis et distinctif (chiffre,
// détail unique) pour qu'un auditeur humain puisse vérifier à l'œil,
// sans ambiguïté, si une citation SRC_xxx est fidèle ou inventée/
// mal rattachée. Jamais conçu pour « piéger » un modèle par un détail
// trompeur — uniquement pour rendre le grounding mesurable précisément.

import { construireFixture, type FixtureBrute } from './helpers'

export const FIXTURE_GROUNDING_CIBLE: FixtureBrute = construireFixture('FIXTURE_GROUNDING_CIBLE_V1', [
  {
    etape: 1,
    natureObjet: 'contexte',
    statut: 'DECLARE',
    question: 'Quel est ton territoire principal aujourd\'hui ?',
    reponseLisible: 'Je vis à Nantes depuis exactement 4 ans.',
  },
  {
    etape: 1,
    natureObjet: 'capacite',
    statut: 'DECLARE',
    question: 'As-tu déjà exercé une activité indépendante, même brièvement ?',
    reponseLisible: 'Oui, j\'ai donné des cours de guitare en indépendant pendant 18 mois, à 7 élèves réguliers.',
  },
  {
    etape: 3,
    natureObjet: 'comportement_passe',
    statut: 'DECLARE',
    question: 'Peux-tu décrire une fois où tu as aidé quelqu\'un dans ce domaine, en dehors de ton emploi ?',
    reponseLisible: 'J\'ai préparé un élève pour un concours régional de guitare, il est arrivé 2ème sur 30 participants.',
  },
  {
    etape: 4,
    natureObjet: 'ressource',
    statut: 'DECLARE',
    question: 'As-tu un actif relationnel mobilisable pour une activité ?',
    reponseLisible: 'Je connais le gérant d\'un conservatoire associatif de musique, nous avons travaillé ensemble en 2024.',
  },
  {
    etape: 4,
    natureObjet: 'capacite',
    statut: 'DECLARE',
    question: 'Comment évalues-tu ton autonomie avec les outils numériques du quotidien ?',
    reponseLisible: 'Je sais filmer et monter de courtes vidéos pédagogiques, j\'en ai publié une dizaine en ligne.',
  },
  {
    etape: 5,
    natureObjet: 'contrainte',
    statut: 'DECLARE',
    question: 'Quelle disponibilité réaliste as-tu en dehors de ta situation actuelle ?',
    reponseLisible: 'Exactement 6 heures par semaine, réparties sur deux soirées fixes.',
  },
  {
    etape: 6,
    natureObjet: 'observation_probleme',
    statut: 'DECLARE',
    question: 'As-tu observé un problème qui revient souvent chez les gens autour de toi ?',
    reponseLisible: 'Trois de mes anciens élèves m\'ont dit avoir arrêté la guitare faute de cours disponibles le soir en semaine.',
  },
])
