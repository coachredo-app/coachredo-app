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
}

export const FAMILLES_MPD: readonly FamilleEditoriale[] = [
  {
    etape: 1,
    nom: 'Ta situation aujourd’hui',
    description: 'Faisons le point sur ta situation actuelle et le temps dont tu disposes réellement.',
  },
  {
    etape: 2,
    nom: 'Ce que tu veux changer',
    description: 'Clarifions ce que tu aimerais changer, améliorer ou préserver dans ta situation.',
  },
  {
    etape: 3,
    nom: 'Ton parcours',
    description: 'Regardons ce que tes expériences t’ont déjà permis d’apprendre et de savoir faire.',
  },
  {
    etape: 4,
    nom: 'Ce que tu as déjà en main',
    description: 'Identifions les ressources, les moyens et les appuis que tu peux déjà mobiliser.',
  },
  {
    etape: 5,
    nom: 'Ta façon d’avancer',
    description: 'Regardons comment tu as déjà réagi, appris et avancé dans des situations concrètes.',
  },
  {
    etape: 6,
    nom: 'Ce qui est possible pour toi aujourd’hui',
    description: 'Prenons en compte tes possibilités et tes contraintes réelles pour construire quelque chose d’adapté à ta situation.',
  },
  {
    etape: 7,
    nom: 'Ce que tu observes autour de toi',
    description: 'Regardons les personnes, les situations et les problèmes que tu connais ou observes autour de toi.',
  },
] as const
