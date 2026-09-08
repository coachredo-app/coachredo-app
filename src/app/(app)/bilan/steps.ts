export type Step =
  | { kind: 'intro'; text: string }
  | { kind: 'question'; famille: string; id: string; text: string }
  | { kind: 'done' }

export const STEPS: Step[] = [
  {
    // INTRO VISIBLE 1 — À quoi sert ce Bilan ?
    kind: 'intro',
    text: "Ce Bilan est là pour t'aider à faire le point.\n\nIl n'y a ni bonne ni mauvaise réponse.\n\nL'objectif est simplement de mieux comprendre où tu en es aujourd'hui et ce que tu veux construire.",
  },
  {
    // INTRO VISIBLE 2 — Comment répondre ? (dernier écran d'intro visible,
    // le CTA "Commencer mon Bilan →" déclenche directement l'écran contexte C1/C2/C3 — cf. BilanReader)
    kind: 'intro',
    text: 'Réponds simplement et avec sincérité.\n\nSi tu ne sais pas encore quoi répondre à une question, tu peux écrire « je ne sais pas encore ». C\'est une réponse valable.\n\nTu pourras modifier tes réponses avant de valider définitivement ton Bilan.\n\nTes réponses serviront à préparer ton Rapport CoachRedo personnalisé.',
  },
  {
    // Slot technique de compatibilité (ex-3e intro) — préserve STEPS.length=18 et les index
    // Q1..Q13/E1/done pour ne pas décaler current_step déjà persisté ni la RPC upgrade (minStep=3).
    // Ne doit JAMAIS être affiché comme écran : BilanReader recale toute navigation qui l'atteindrait.
    kind: 'intro',
    text: "Prends le temps de répondre à chaque question avec sincérité. Si une question ne te parle pas encore, « je ne sais pas encore » est aussi une réponse valable. Tu pourras revenir sur tes réponses et les modifier avant de valider définitivement ton Bilan. Tes réponses constitueront la matière de ton Rapport CoachRedo personnalisé.",
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
    kind: 'question',
    famille: 'Historique',
    id: 'contexte_experience',
    text: "As-tu déjà lancé ou tenté quelque chose pour créer une activité ou générer un revenu en dehors de ton activité principale ?",
  },
  {
    kind: 'done',
  },
]

export const QUESTION_STEPS = STEPS.filter((s): s is Extract<Step, { kind: 'question' }> =>
  s.kind === 'question'
)
