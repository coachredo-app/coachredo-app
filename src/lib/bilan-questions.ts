export interface BilanQuestion {
  id: string
  famille: string
  text: string
  required?: boolean
}

export const BILAN_QUESTIONS: BilanQuestion[] = [
  {
    famille: 'Reconnaissance',
    id: 'reconnaissance_1',
    text: "Qu'est-ce que tu te dis depuis longtemps que tu vas faire — bientôt ?",
    required: true,
  },
  {
    famille: 'Reconnaissance',
    id: 'reconnaissance_2',
    text: "Si tu observes ta semaine telle qu'elle s'est vraiment passée — pas comme tu aurais voulu qu'elle se passe — qu'est-ce qui t'a retenu le plus ?",
    required: true,
  },
  {
    famille: 'Reconnaissance',
    id: 'reconnaissance_3',
    text: "Si ton revenu actuel s'arrêtait dans trois mois, qu'est-ce qui changerait dans ta façon de voir ta situation aujourd'hui ?",
    required: true,
  },
  {
    famille: 'Blocages',
    id: 'blocages_1',
    text: "Qu'est-ce que tu gardes pour toi depuis longtemps, en attendant que ça ait une forme suffisante pour être montré ?",
    required: true,
  },
  {
    famille: 'Blocages',
    id: 'blocages_2',
    text: 'De qui, précisément, aurais-tu le plus peur de décevoir les attentes ?',
    required: true,
  },
  {
    famille: 'Blocages',
    id: 'blocages_3',
    text: "Quelle est la « bonne raison » que tu te donnes le plus souvent pour ne pas encore commencer ?",
    required: true,
  },
  {
    famille: 'Ressources',
    id: 'ressources_1',
    text: "Pour quel type de problème est-ce qu'on vient te voir quand les autres ne savent pas quoi faire ?",
    required: true,
  },
  {
    famille: 'Ressources',
    id: 'ressources_2',
    text: "Qu'est-ce que tu fais naturellement, si bien que tu ne le vois même plus comme une compétence ?",
    required: true,
  },
  {
    famille: 'Ressources',
    id: 'ressources_3',
    text: "Qu'est-ce que tu as traversé — une période difficile, une responsabilité prise tôt, une situation gérée sous pression — que tu n'as jamais vraiment compté comme une ressource ?",
    required: true,
  },
  {
    famille: 'Observation',
    id: 'observation_1',
    text: "Quel problème vois-tu régulièrement autour de toi, que personne n'a encore vraiment résolu ?",
    required: true,
  },
  {
    famille: 'Observation',
    id: 'observation_2',
    text: "Qu'est-ce que les gens font de manière compliquée dans ta vie de tous les jours — alors qu'une façon plus simple devrait exister ?",
    required: true,
  },
  {
    famille: 'Mouvement',
    id: 'mouvement_1',
    text: "Si tu devais commencer quelque chose cette semaine — pas le projet entier, juste une première chose concrète — quelle serait cette chose ?",
    required: true,
  },
  {
    famille: 'Mouvement',
    id: 'mouvement_2',
    text: "Dans six mois, à quoi reconnaîtrais-tu que quelque chose a légèrement changé dans ta façon de voir ta situation ?",
    required: true,
  },
]

export const FAMILLE_ORDER = [
  'Reconnaissance',
  'Blocages',
  'Ressources',
  'Observation',
  'Mouvement',
] as const

export const QUESTION_MAP = Object.fromEntries(
  BILAN_QUESTIONS.map(q => [q.id, q.text])
)

export const FAMILLE_TOTAL = BILAN_QUESTIONS.reduce<Record<string, number>>(
  (acc, q) => {
    acc[q.famille] = (acc[q.famille] ?? 0) + 1
    return acc
  },
  {}
)

// Les 13 questions réflexives obligatoires — compteur client + labels
export const REQUIRED_QUESTION_IDS = new Set(
  BILAN_QUESTIONS.filter(q => q.required).map(q => q.id)
)

// ── Questions contextuelles (contexte de départ + historique) ──────────────

export const CONTEXT_QUESTIONS: BilanQuestion[] = [
  {
    famille: 'Contexte',
    id: 'contexte_situation',
    text: 'Ta situation actuelle',
    required: true,
  },
  {
    famille: 'Contexte',
    id: 'contexte_temps',
    text: 'Temps disponible par semaine',
    required: true,
  },
  {
    famille: 'Historique',
    id: 'contexte_experience',
    text: "As-tu déjà lancé ou tenté quelque chose pour créer une activité ou générer un revenu en dehors de ton activité principale ?",
    required: true,
  },
]

export const CONTEXT_QUESTION_IDS = new Set(
  CONTEXT_QUESTIONS.map(q => q.id)
)

// Questions dans STEPS signalées comme manquantes : 13 réflexives + E1
export const STEPS_REQUIRED_IDS = new Set([
  ...REQUIRED_QUESTION_IDS,
  'contexte_experience',
])

// Validation métier complète : 13 réflexives + C1 + C2 + E1
export const COMPLETION_REQUIRED_IDS = new Set([
  ...REQUIRED_QUESTION_IDS,
  ...CONTEXT_QUESTION_IDS,
])
