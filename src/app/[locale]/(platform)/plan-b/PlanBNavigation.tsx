// ============================================================
// MPD / MFR — Navigation principale Plan B — T7.7E
// ============================================================
// Purement présentationnel : aucune logique métier, aucun accès
// serveur/DB. Mon Point de Départ et Ma Feuille de Route sont les deux
// grandes parties du parcours Plan B — jamais une famille, jamais une
// étape du questionnaire. Partagée entre /plan-b et
// /plan-b/feuille-de-route pour éviter toute duplication de markup.

import Link from 'next/link'

interface PlanBNavigationProps {
  readonly locale: string
  readonly actif: 'mpd' | 'mfr'
}

const ONGLETS = [
  { id: 'mpd' as const, label: 'Mon Point de Départ', chemin: 'plan-b' },
  { id: 'mfr' as const, label: 'Ma Feuille de Route', chemin: 'plan-b/feuille-de-route' },
]

export function PlanBNavigation({ locale, actif }: PlanBNavigationProps) {
  return (
    <nav className="flex border-b border-cr-border" aria-label="Navigation Plan B">
      {ONGLETS.map(onglet => {
        const estActif = onglet.id === actif
        return (
          <Link
            key={onglet.id}
            href={`/${locale}/${onglet.chemin}`}
            aria-current={estActif ? 'page' : undefined}
            className={`flex-1 text-center px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
              estActif
                ? 'border-cr-accent text-cr-accent'
                : 'border-transparent text-cr-text-secondary hover:text-cr-text'
            }`}
          >
            {onglet.label}
          </Link>
        )
      })}
    </nav>
  )
}
