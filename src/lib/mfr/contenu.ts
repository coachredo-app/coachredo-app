// ============================================================
// MFR — Forme réelle de mfr_versions.contenu (types partagés)
// ============================================================
// Extrait sans changement de `admin/app/mfr/[cycleId]/page.tsx`
// (T-MFR.5B-2c-1) — identité stricte avec la sortie validée par
// l'ENGINE (T-MFR.5A/D-066). Rien ici n'est inventé : chaque champ
// correspond à une clé réellement présente, vérifiée en lecture seule
// contre la base live avant la première écriture de ces types.
// Réutilisé par l'admin ET par la page client (T-MFR.5B-3) — un seul
// endroit, jamais deux définitions divergentes.

export interface AffirmationSourcee {
  readonly texte: string
  readonly sources: readonly string[]
}

export interface DirectionResolue {
  readonly position: number
  readonly titre: string
  readonly pourquoi: AffirmationSourcee
  readonly forces: AffirmationSourcee
  readonly limites: AffirmationSourcee
  readonly planAction: AffirmationSourcee
  readonly hypotheseId: string
  readonly estRecommandee: boolean
}

export interface ContenuVersion {
  readonly cycleId: string
  readonly analyseId: string
  readonly curationId: string
  readonly recommandationConfirmee: boolean
  readonly directions: readonly DirectionResolue[]
  readonly aucuneDirectionMessage: AffirmationSourcee | null
}
