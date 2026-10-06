// ============================================================
// MPD V3 — Carte famille du hub — T7.7B, révisée T7.7C/T7.7D/T7.8B/T7.8E
// ============================================================
// Purement présentationnel : reçoit statut/modifiable/consomme/locale
// DÉJÀ dérivés par getFamilyStates (progression.ts) — aucun recalcul
// de complétude/applicabilité/E_max/séquentialité/prochaine question
// ici. A_COMMENCER/EN_COURS (hors consommation) restent cliquables
// vers /plan-b/parcours. T7.8E (GO QG, socle commun T7.8/T7.9)
// remplace l'action « Modifier » conditionnelle par une action
// « Consulter » unique pour TOUTE famille TERMINEE (verrouillée OU
// modifiable, consommée ou non, §15/§17) → /plan-b/famille/[etape] —
// la modification ciblée se choisit désormais question par question,
// sur cette page, jamais depuis le hub.

import Link from 'next/link'
import { Check, Lock } from 'lucide-react'
import type { StatutFamille } from '@/lib/mpd/engine/progression'

interface FamilyCardProps {
  readonly numero: number
  readonly nom: string
  readonly description: string
  readonly statut: StatutFamille
  readonly modifiable: boolean
  readonly consomme: boolean
  readonly locale: string
}

/**
 * Indicateur d'état — T7.7D : remplace les glyphes (—/○/◐/🔒) par des
 * icônes lucide-react (déjà une dépendance de l'application) ou des
 * badges textuels, jamais une information portée par la seule couleur
 * (§7). À_COMMENCER/EN_COURS deviennent des badges texte (plus
 * explicites que l'ancien cercle abstrait) ; TERMINEE/À_VENIR restent
 * des pastilles rondes mais avec une vraie icône (Check/Lock).
 */
function StatusIndicator({ statut, estVerrouillee }: { statut: StatutFamille; estVerrouillee: boolean }) {
  if (statut === 'A_COMMENCER') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-cr-accent bg-surface text-cr-accent text-xs font-medium">
        À commencer
      </span>
    )
  }

  if (statut === 'EN_COURS') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium">
        En cours
      </span>
    )
  }

  if (statut === 'TERMINEE') {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-green-200 bg-green-50 text-green-700"
          aria-label="Terminée"
        >
          <Check className="w-4 h-4" aria-hidden="true" />
        </span>
        {estVerrouillee && <Lock className="w-4 h-4 text-cr-text-muted" aria-label="Non modifiable" />}
      </div>
    )
  }

  // A_VENIR
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-cr-border bg-background text-cr-text-muted"
      aria-label="À venir"
    >
      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
    </span>
  )
}

export function FamilyCard({ numero, nom, description, statut, modifiable, consomme, locale }: FamilyCardProps) {
  const estCliquable = (statut === 'A_COMMENCER' || statut === 'EN_COURS') && !consomme
  const estVerrouillee = statut === 'TERMINEE' && (!modifiable || consomme)
  // T7.8E §15/§17 : consultable pour TOUTE famille Terminée, y compris
  // verrouillée ou appartenant à un dossier consommé — seule la
  // présence du bouton « Modifier » (page famille) dépend de modifiable/consomme.
  const estConsultable = statut === 'TERMINEE'
  const estAVenir = statut === 'A_VENIR'

  // Famille active = point focal (T7.7C §5) : bordure et fond affirmés,
  // jamais un glow ou une animation — même registre que l'état actif
  // déjà utilisé dans la Sidebar (bg-cr-accent-subtle).
  const cadreStyle = estCliquable
    ? 'border-2 border-cr-accent bg-cr-accent-subtle'
    : estAVenir
    ? 'border border-cr-border bg-background'
    : 'border border-cr-border bg-surface'

  const contenu = (
    <div className={`rounded-xl p-5 h-full flex flex-col ${cadreStyle} ${estCliquable ? 'hover:bg-cr-accent-subtle/80 transition-colors' : ''}`}>
      {/* 1-2. Numéro de famille + indicateur d'état */}
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs font-semibold uppercase tracking-wide ${estAVenir ? 'text-cr-text-muted' : 'text-cr-text-secondary'}`}>
          Famille {numero}
        </p>
        <div className="flex-shrink-0">
          <StatusIndicator statut={statut} estVerrouillee={estVerrouillee} />
        </div>
      </div>

      {/* 3. Titre principal — davantage de présence */}
      <p className={`text-lg font-semibold mt-3 ${estAVenir ? 'text-cr-text-secondary' : 'text-cr-text'}`}>{nom}</p>

      {/* 4. Description — secondaire */}
      <p className="text-sm text-cr-text-secondary mt-1.5 flex-1">{description}</p>

      {/* 5. Zone d'état/action en bas */}
      {estCliquable && (
        <span className="mt-4 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-cr-accent text-white text-sm font-medium">
          {statut === 'A_COMMENCER' ? 'Commencer' : 'Continuer'} →
        </span>
      )}

      {/* T7.8E §2 : action secondaire explicite, jamais la carte entière
          — distincte visuellement du bouton primaire ci-dessus. Plus
          d'action « Modifier » globale de famille (T7.8B) : la
          consultation mène désormais elle-même à la modification
          ciblée, question par question. */}
      {estConsultable && (
        <Link
          href={`/${locale}/plan-b/famille/${numero}`}
          className="mt-4 inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg border border-cr-border text-cr-text text-sm font-medium hover:bg-background transition-colors"
        >
          Consulter
        </Link>
      )}
    </div>
  )

  if (!estCliquable) return contenu

  return (
    <Link href={`/${locale}/plan-b/parcours`} className="block h-full">
      {contenu}
    </Link>
  )
}
