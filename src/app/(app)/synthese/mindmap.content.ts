export type Phase = 'voir' | 'recentrer' | 'agir'

export interface ChapterContent {
  id: number
  phase: Phase
  text: string
}

export const NUCLEUS = {
  planB: 'PLAN B',
  rentable: 'RENTABLE',
  title: 'La carte de ton parcours',
}

export const PHASE_LABELS: Record<Phase, string> = {
  voir: 'VOIR',
  recentrer: 'RECENTRER',
  agir: 'AGIR',
}

export const CHAPTERS: ChapterContent[] = [
  { id: 1, phase: 'voir',      text: "Ce n’est pas la motivation qui manque. C’est la clarté." },
  { id: 2, phase: 'voir',      text: "La sécurité habituelle est réelle. Mais elle repose sur un cadre qu’on n’a pas construit soi-même." },
  { id: 3, phase: 'voir',      text: "Les vrais obstacles sont intérieurs. Et ils portent des déguisements très convaincants." },
  { id: 4, phase: 'recentrer', text: "Ce qui vient naturellement ne ressemble pas à un talent. C’est souvent là que se cachent les ressources les plus solides." },
  { id: 5, phase: 'recentrer', text: "Une opportunité est souvent un problème que quelqu’un a décidé de prendre au sérieux." },
  { id: 6, phase: 'agir',      text: "La confiance ne précède pas l’action. Elle en est le résultat." },
  { id: 7, phase: 'agir',      text: "Ce qui se construit est rarement ce qu’on avait prévu. Imparfait, non linéaire — et réel." },
]

export const HINGES = [
  { id: 1, text: "Qu’est-ce que j’ai déjà ?" },
  { id: 2, text: "Ce moment — où voir devient faire — est rarement celui qu’on avait prévu." },
]

export const CONCLUSION =
  "Un déplacement discret dans la façon de se voir — c’est souvent de là que quelque chose commence."

export const CHROME = {
  home: '⌂ Mon espace',
  print: '↓ Imprimer / Enregistrer en PDF',
  cta: {
    in_progress: 'Reprendre le Bilan →',
    completed:   'Revoir mon Bilan →',
    default:     'Accéder au Bilan de clarté →',
  },
  rotateInvitation: 'Tourne ton téléphone pour voir la carte complète',
}
