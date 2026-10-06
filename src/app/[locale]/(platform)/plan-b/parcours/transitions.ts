// ============================================================
// MPD V3 — Micro-transitions entre familles — T7.10D
// ============================================================
// Contenu éditorial pur, hors canon (même précédent que familles.ts,
// T7.7B) — les 6 textes exacts validés (D-036 §I). Clé `versEtape`
// uniquement (jamais une paire depuis/vers) : la transition est
// toujours exactement N→N+1, jamais un saut (D-019 §B).

import type { Etape } from '@/lib/mpd/canon'

export interface MicroTransition {
  readonly versEtape: Etape
  readonly texte: string
}

export const TRANSITIONS_MPD: readonly MicroTransition[] = [
  {
    versEtape: 2,
    texte: 'Maintenant que ta situation est plus claire, regardons ce que tu aimerais changer.',
  },
  {
    versEtape: 3,
    texte: 'Tu sais mieux où tu veux aller. Regardons maintenant ce que ton parcours t’a déjà apporté.',
  },
  {
    versEtape: 4,
    texte:
      'Ton parcours nous donne déjà des informations utiles. Regardons maintenant ce que tu as concrètement en main aujourd’hui.',
  },
  {
    versEtape: 5,
    texte:
      'Nous savons mieux ce que tu peux mobiliser. Regardons maintenant comment tu avances face aux situations concrètes.',
  },
  {
    versEtape: 6,
    texte: 'Regardons maintenant ce qui est réellement possible pour toi aujourd’hui, avec ta situation actuelle.',
  },
  {
    versEtape: 7,
    texte: 'Dernière étape. Regardons maintenant ce que tu connais et observes autour de toi.',
  },
] as const
