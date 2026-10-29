// ============================================================
// Music V0 — brief client : sections, textes, validation (LOT 3)
// ============================================================
// Le brief est un RÉSUMÉ DE LA DEMANDE du client — ce ne sont PAS les
// paroles de la chanson. Il contient :
// - la FICHE INTERNE : 10 sections structurées préparées par Coach Redouane ;
// - facultativement, le RÉCIT CLIENT (clé « recit ») : version narrative de
//   la fiche, rédigée avec un outil d'IA puis relue et validée par Coach
//   Redouane (décision QG App, 2026-10-28). Quand il existe, le client voit
//   uniquement le récit ; la fiche ne quitte jamais le serveur.
// Sections : source unique brief-sections.json ; récit : brief-recit.json
// (tous deux lus par scripts/music-v0/admin.mjs ; miroir exact dans les
// migrations 022 et 029, vérifié par les tests). Module pur, utilisable par
// la page et par le serveur.

import SECTIONS_JSON from './brief-sections.json'
import RECIT_JSON from './brief-recit.json'
import { normaliserTexte } from './questionnaire'

export interface SectionBrief {
  cle: string
  titre: string
  requis: boolean
  max: number
}
export const SECTIONS_BRIEF: readonly SectionBrief[] = SECTIONS_JSON as SectionBrief[]
export type ContenuBrief = Record<string, string>

/** Texte EXACT affiché avant validation (case obligatoire, non cochée par défaut). */
export const TEXTE_VALIDATION_BRIEF =
  'Je confirme que ce résumé correspond à ma demande et que les prénoms, souvenirs, informations et préférences indiqués sont corrects. J’autorise CoachRedo Music à commencer la création de ma chanson.'
/** Version de ce texte, enregistrée avec la validation (validation_consent_version). */
export const VALIDATION_BRIEF_VERSION = 'brief-v0-2026-10'

export const MAX_CORRECTION = 2000

export type EtatBrief = 'en_preparation' | 'a_valider' | 'correction_demandee' | 'valide'
export const ETATS_BRIEF: readonly EtatBrief[] = ['en_preparation', 'a_valider', 'correction_demandee', 'valide']

/**
 * Contenu tel que stocké (validé par la base) → sections affichables, dans
 * l'ordre officiel, uniquement les clés connues et textuelles. Renvoie null
 * si une section obligatoire manque (contenu inattendu : jamais affiché).
 */
export function sectionsAffichables(contenu: unknown): { cle: string; titre: string; texte: string }[] | null {
  if (typeof contenu !== 'object' || contenu === null || Array.isArray(contenu)) return null
  const c = contenu as Record<string, unknown>
  const out: { cle: string; titre: string; texte: string }[] = []
  for (const s of SECTIONS_BRIEF) {
    const v = c[s.cle]
    if (typeof v !== 'string' || v.trim() === '') {
      if (s.requis) return null
      continue
    }
    out.push({ cle: s.cle, titre: s.titre, texte: v.slice(0, s.max) })
  }
  return out
}

/** Récit client facultatif (clé, titre, longueur maximale) : source unique brief-recit.json. */
export const RECIT_BRIEF: Readonly<SectionBrief> = RECIT_JSON as SectionBrief

/**
 * Récit client affichable, ou null s'il est absent ou vide (le client voit
 * alors les sections). Jamais plus long que la limite officielle.
 */
export function recitAffichable(contenu: unknown): string | null {
  if (typeof contenu !== 'object' || contenu === null || Array.isArray(contenu)) return null
  const v = (contenu as Record<string, unknown>)[RECIT_BRIEF.cle]
  if (typeof v !== 'string' || v.trim() === '') return null
  return v.trim().slice(0, RECIT_BRIEF.max)
}

/** Demande de correction du client : texte libre normalisé, 1 à 2000 caractères. */
export function validerCorrection(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = normaliserTexte(v)
  return t.length >= 1 && t.length <= MAX_CORRECTION ? t : null
}
