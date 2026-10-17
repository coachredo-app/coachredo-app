// ============================================================
// BENCHMARK-MFR V1 — Fixture RICHE — Phase 1
// ============================================================
// Objectif : matière cohérente suffisante pour plusieurs hypothèses
// différenciables, plusieurs mécanismes plausibles, et une condition
// ÉTAYÉ mécaniquement atteignable (≥2 référents distincts corroborant
// la même capacité — SRC_002 et SRC_004 ci-dessous). Entièrement
// fictif, sans ressemblance recherchée avec un dossier réel.

import { construireFixture, type FixtureBrute } from './helpers'

export const FIXTURE_RICHE: FixtureBrute = construireFixture('FIXTURE_RICHE_V1', [
  {
    etape: 1,
    natureObjet: 'contexte',
    statut: 'DECLARE',
    question: 'Quel est ton territoire principal aujourd\'hui ?',
    reponseLisible: 'Je vis en périphérie de Lyon, je travaille actuellement comme comptable à temps plein dans une PME.',
    valeurStructuree: { territoire: 'peripherie_grande_ville' },
  },
  {
    etape: 1,
    natureObjet: 'capacite',
    statut: 'DECLARE',
    question: 'As-tu déjà exercé une activité indépendante, même brièvement ?',
    reponseLisible: 'Oui, j\'ai tenu une micro-entreprise de tenue de comptabilité pour 3 artisans pendant environ 2 ans, arrêtée faute de temps.',
  },
  {
    etape: 2,
    natureObjet: 'preference',
    statut: 'DECLARE',
    question: 'Qu\'est-ce que tu veux changer dans ta situation actuelle ?',
    reponseLisible: 'Je veux retrouver plus d\'autonomie dans mon emploi du temps et pouvoir choisir mes clients.',
  },
  {
    etape: 3,
    natureObjet: 'comportement_passe',
    statut: 'DECLARE',
    question: 'Peux-tu décrire une fois où tu as aidé quelqu\'un dans ce domaine, en dehors de ton emploi ?',
    reponseLisible: 'J\'ai mis en place le suivi de trésorerie d\'un ami artisan plombier ; il m\'a payée pendant 6 mois pour ce suivi mensuel.',
  },
  {
    etape: 4,
    natureObjet: 'ressource',
    statut: 'DECLARE',
    question: 'As-tu un actif relationnel mobilisable pour une activité ?',
    reponseLisible: 'Je connais plusieurs artisans et petits commerçants dans mon réseau local, certains cherchent de l\'aide sur leur gestion.',
  },
  {
    etape: 4,
    natureObjet: 'capacite',
    statut: 'DECLARE',
    question: 'Comment évalues-tu ton autonomie avec les outils numériques du quotidien ?',
    reponseLisible: 'Je maîtrise bien les outils de comptabilité en ligne et les tableurs, je n\'ai pas besoin d\'aide sur ce point.',
  },
  {
    etape: 5,
    natureObjet: 'contrainte',
    statut: 'DECLARE',
    question: 'Quelle disponibilité réaliste as-tu en dehors de ta situation actuelle ?',
    reponseLisible: 'Je ne peux dégager que 8 à 10 heures par semaine en dehors de mon emploi actuel, les soirs et le week-end.',
  },
  {
    etape: 6,
    natureObjet: 'observation_probleme',
    statut: 'DECLARE',
    question: 'As-tu observé un problème qui revient souvent chez les gens autour de toi ?',
    reponseLisible: 'Plusieurs artisans de mon entourage se plaignent de ne jamais savoir où ils en sont financièrement en cours d\'année.',
  },
])
