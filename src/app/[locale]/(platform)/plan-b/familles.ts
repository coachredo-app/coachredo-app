// ============================================================
// MPD V3 — Contenu éditorial des 7 familles — T7.7B
// ============================================================
// Noms et descriptions courtes VALIDÉS (D-036, voir
// docs/project-memory/MON_POINT_DE_DEPART_V3.md §B). Vit délibérément
// hors du canon (src/lib/mpd/canon/**) — le canon reste purement
// structurel (D-029 §F), jamais un support de contenu de présentation.

import type { Etape } from '@/lib/mpd/canon'

export interface FamilleEditoriale {
  readonly etape: Etape
  readonly nom: string
  readonly description: string
  /** GO QG (D-047) : court conseil pédagogique encourageant des
   * réponses concrètes et sincères — jamais un contrôle qualité, jamais
   * un jugement de la réponse donnée. Affiché uniquement au moment où
   * la famille devient active, jamais répété devant chaque question. */
  readonly conseil: string
}

export const FAMILLES_MPD: readonly FamilleEditoriale[] = [
  {
    etape: 1,
    nom: 'Ta situation aujourd’hui',
    description: 'Faisons le point sur ta situation actuelle et le temps dont tu disposes réellement.',
    conseil: 'Réponds selon ta situation telle qu’elle est aujourd’hui, pas telle que tu aimerais qu’elle soit.',
  },
  {
    etape: 2,
    nom: 'Ce que tu veux changer',
    description: 'Clarifions ce que tu aimerais changer, améliorer ou préserver dans ta situation.',
    conseil: 'Dis-nous ce que tu veux réellement changer et ce qui compterait concrètement comme un progrès pour toi.',
  },
  {
    etape: 3,
    nom: 'Ton parcours',
    description: 'Regardons ce que tes expériences t’ont déjà permis d’apprendre et de savoir faire.',
    conseil: 'Appuie-toi autant que possible sur ce que tu as réellement fait, vécu ou appris, même si cela te paraît ordinaire.',
  },
  {
    etape: 4,
    nom: 'Ce que tu as déjà en main',
    description: 'Identifions les ressources, les moyens et les appuis que tu peux déjà mobiliser.',
    conseil: 'Pense à ce que tu peux réellement mobiliser aujourd’hui : compétences, moyens, outils, langues ou personnes autour de toi.',
  },
  {
    etape: 5,
    nom: 'Ta façon d’avancer',
    description: 'Regardons comment tu as déjà réagi, appris et avancé dans des situations concrètes.',
    conseil: 'Réponds à partir de situations que tu as réellement vécues. Nous cherchons à comprendre ce que tu as fait, pas ce que tu penses que tu ferais idéalement.',
  },
  {
    etape: 6,
    nom: 'Ce qui est possible pour toi aujourd’hui',
    description: 'Prenons en compte tes possibilités et tes contraintes réelles pour construire quelque chose d’adapté à ta situation.',
    conseil: 'Réponds selon ce qui est réellement possible pour toi aujourd’hui, même si certaines contraintes te semblent limitantes.',
  },
  {
    etape: 7,
    nom: 'Ce que tu observes autour de toi',
    description: 'Regardons les personnes, les situations et les problèmes que tu connais ou observes autour de toi.',
    conseil: 'Distingue ce que tu sais réellement de ce que tu supposes. Si quelque chose n’est pas clair pour toi, dis-le simplement.',
  },
] as const
