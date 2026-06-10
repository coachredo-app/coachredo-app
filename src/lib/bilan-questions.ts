export interface BilanQuestion {
  id: string
  famille: string
  text: string
}

export const BILAN_QUESTIONS: BilanQuestion[] = [
  {
    famille: 'Reconnaissance',
    id: 'reconnaissance_1',
    text: "Qu'est-ce que tu te dis depuis longtemps que tu vas faire — bientôt ?",
  },
  {
    famille: 'Reconnaissance',
    id: 'reconnaissance_2',
    text: "Si tu observes ta semaine telle qu'elle s'est vraiment passée — pas comme tu aurais voulu qu'elle se passe — qu'est-ce qui t'a retenu le plus ?",
  },
  {
    famille: 'Reconnaissance',
    id: 'reconnaissance_3',
    text: "Si ton revenu actuel s'arrêtait dans trois mois, qu'est-ce qui changerait dans ta façon de voir ta situation aujourd'hui ?",
  },
  {
    famille: 'Blocages',
    id: 'blocages_1',
    text: "Qu'est-ce que tu gardes pour toi depuis longtemps, en attendant que ça ait une forme suffisante pour être montré ?",
  },
  {
    famille: 'Blocages',
    id: 'blocages_2',
    text: 'De qui, précisément, aurais-tu le plus peur de décevoir les attentes ?',
  },
  {
    famille: 'Blocages',
    id: 'blocages_3',
    text: "Quelle est la « bonne raison » que tu te donnes le plus souvent pour ne pas encore commencer ?",
  },
  {
    famille: 'Ressources',
    id: 'ressources_1',
    text: "Pour quel type de problème est-ce qu'on vient te voir quand les autres ne savent pas quoi faire ?",
  },
  {
    famille: 'Ressources',
    id: 'ressources_2',
    text: "Qu'est-ce que tu fais naturellement, si bien que tu ne le vois même plus comme une compétence ?",
  },
  {
    famille: 'Ressources',
    id: 'ressources_3',
    text: "Qu'est-ce que tu as traversé — une période difficile, une responsabilité prise tôt, une situation gérée sous pression — que tu n'as jamais vraiment compté comme une ressource ?",
  },
  {
    famille: 'Observation',
    id: 'observation_1',
    text: "Quel problème vois-tu régulièrement autour de toi, que personne n'a encore vraiment résolu ?",
  },
  {
    famille: 'Observation',
    id: 'observation_2',
    text: "Qu'est-ce que les gens font de manière compliquée dans ta vie de tous les jours — alors qu'une façon plus simple devrait exister ?",
  },
  {
    famille: 'Mouvement',
    id: 'mouvement_1',
    text: "Si tu devais commencer quelque chose cette semaine — pas le projet entier, juste une première chose concrète — quelle serait cette chose ?",
  },
  {
    famille: 'Mouvement',
    id: 'mouvement_2',
    text: "Dans six mois, à quoi reconnaîtrais-tu que quelque chose a légèrement changé dans ta façon de voir ta situation ?",
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
