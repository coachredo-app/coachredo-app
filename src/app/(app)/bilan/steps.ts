export type Step =
  | { kind: 'intro'; text: string }
  | { kind: 'question'; famille: string; id: string; text: string }
  | { kind: 'done' }

export const STEPS: Step[] = [
  {
    kind: 'intro',
    text: 'Ces questions ne testent rien.',
  },
  {
    kind: 'intro',
    text: "Elles prolongent ce que tu as commencé à regarder en lisant ce livre. Certaines te parleront tout de suite. D'autres resteront ouvertes — c'est prévu, pas un oubli. Il y a des questions qu'on porte avec soi un moment avant de pouvoir leur répondre vraiment.",
  },
  {
    kind: 'intro',
    text: "Tu peux les traverser dans l'ordre ou pas. Revenir à certaines plus tard. Laisser les autres de côté. Ce qui compte, c'est le regard que tu poses — pas la liste complétée.",
  },
  {
    kind: 'question',
    famille: 'Reconnaissance',
    id: 'reconnaissance_1',
    text: "Qu'est-ce que tu te dis depuis longtemps que tu vas faire — bientôt ?",
  },
  {
    kind: 'question',
    famille: 'Reconnaissance',
    id: 'reconnaissance_2',
    text: "Si tu observes ta semaine telle qu'elle s'est vraiment passée — pas comme tu aurais voulu qu'elle se passe — qu'est-ce qui t'a retenu le plus ?",
  },
  {
    kind: 'question',
    famille: 'Reconnaissance',
    id: 'reconnaissance_3',
    text: "Si ton revenu actuel s'arrêtait dans trois mois, qu'est-ce qui changerait dans ta façon de voir ta situation aujourd'hui ?",
  },
  {
    kind: 'question',
    famille: 'Blocages',
    id: 'blocages_1',
    text: "Qu'est-ce que tu gardes pour toi depuis longtemps, en attendant que ça ait une forme suffisante pour être montré ?",
  },
  {
    kind: 'question',
    famille: 'Blocages',
    id: 'blocages_2',
    text: 'De qui, précisément, aurais-tu le plus peur de décevoir les attentes ?',
  },
  {
    kind: 'question',
    famille: 'Blocages',
    id: 'blocages_3',
    text: "Quelle est la « bonne raison » que tu te donnes le plus souvent pour ne pas encore commencer ?",
  },
  {
    kind: 'question',
    famille: 'Ressources',
    id: 'ressources_1',
    text: "Pour quel type de problème est-ce qu'on vient te voir quand les autres ne savent pas quoi faire ?",
  },
  {
    kind: 'question',
    famille: 'Ressources',
    id: 'ressources_2',
    text: "Qu'est-ce que tu fais naturellement, si bien que tu ne le vois même plus comme une compétence ?",
  },
  {
    kind: 'question',
    famille: 'Ressources',
    id: 'ressources_3',
    text: "Qu'est-ce que tu as traversé — une période difficile, une responsabilité prise tôt, une situation gérée sous pression — que tu n'as jamais vraiment compté comme une ressource ?",
  },
  {
    kind: 'question',
    famille: 'Observation',
    id: 'observation_1',
    text: "Quel problème vois-tu régulièrement autour de toi, que personne n'a encore vraiment résolu ?",
  },
  {
    kind: 'question',
    famille: 'Observation',
    id: 'observation_2',
    text: "Qu'est-ce que les gens font de manière compliquée dans ta vie de tous les jours — alors qu'une façon plus simple devrait exister ?",
  },
  {
    kind: 'question',
    famille: 'Mouvement',
    id: 'mouvement_1',
    text: "Si tu devais commencer quelque chose cette semaine — pas le projet entier, juste une première chose concrète — quelle serait cette chose ?",
  },
  {
    kind: 'question',
    famille: 'Mouvement',
    id: 'mouvement_2',
    text: "Dans six mois, à quoi reconnaîtrais-tu que quelque chose a légèrement changé dans ta façon de voir ta situation ?",
  },
  {
    kind: 'done',
  },
]

export const QUESTION_STEPS = STEPS.filter((s): s is Extract<Step, { kind: 'question' }> =>
  s.kind === 'question'
)
