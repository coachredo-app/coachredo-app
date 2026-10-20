// ============================================================
// Music V0 — brief client : sections, textes, validation (LOT 3)
// ============================================================
// Le brief est un RÉSUMÉ DE LA DEMANDE du client, rédigé manuellement par
// Coach Redouane (aucune IA) — ce ne sont PAS les paroles de la chanson.
// Sections : source unique brief-sections.json (aussi lue par
// scripts/music-v0/admin.mjs ; miroir exact dans la migration 022, vérifié
// par les tests). Module pur, utilisable par la page et par le serveur.

import SECTIONS_JSON from './brief-sections.json'
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

/** Demande de correction du client : texte libre normalisé, 1 à 2000 caractères. */
export function validerCorrection(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = normaliserTexte(v)
  return t.length >= 1 && t.length <= MAX_CORRECTION ? t : null
}
