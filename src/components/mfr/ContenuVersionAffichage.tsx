// ============================================================
// MFR — Rendu partagé du contenu d'une version (admin + client)
// ============================================================
// Extrait sans changement de `admin/app/mfr/[cycleId]/page.tsx`
// (T-MFR.5B-2c-1) — même JSX, mêmes classNames, aucune régression
// visuelle attendue sur l'admin. Réutilisé par la page client
// `/plan-b/feuille-de-route` (T-MFR.5B-3) : un seul rendu, jamais deux
// implémentations divergentes de la même donnée.
//
// Toutes les directions publiées sont affichées, triées uniquement par
// `position` — une éventuelle recommandation reste une mention visuelle
// (badge), jamais un tri, un score ou un masquage des autres directions
// (D-048 §AE, inchangé). La personne choisit, ce composant n'impose rien.

import type { AffirmationSourcee, ContenuVersion } from '@/lib/mfr/contenu'

export function Sources({ sources }: { sources: readonly string[] }) {
  if (sources.length === 0) {
    return <span className="text-cr-text-muted text-xs italic">Aucune source citée</span>
  }
  return (
    <span className="text-cr-text-muted text-xs">
      Sources : {sources.join(', ')}
    </span>
  )
}

export function BlocAffirmation({ titre, affirmation }: { titre: string; affirmation: AffirmationSourcee }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-cr-text">{titre}</h4>
      <p className="text-sm text-cr-text-secondary mt-1 whitespace-pre-wrap">{affirmation.texte}</p>
      <div className="mt-1">
        <Sources sources={affirmation.sources} />
      </div>
    </div>
  )
}

/**
 * Rendu du contenu d'une version MFR — soit le message "aucune direction
 * retenue" (D-048 §AF, sortie valide), soit la liste complète des
 * directions. Ne décide jamais si une version doit être affichée (ex.
 * brouillon vs publiée) — appartient exclusivement à l'appelant.
 */
export function ContenuVersionAffichage({ contenu }: { contenu: ContenuVersion }) {
  if (contenu.directions.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-cr-border p-6">
        <h2 className="font-semibold text-cr-text mb-2">Aucune direction retenue</h2>
        {contenu.aucuneDirectionMessage ? (
          <BlocAffirmation titre="Message" affirmation={contenu.aucuneDirectionMessage} />
        ) : (
          <p className="text-sm text-cr-text-muted">Aucun message associé.</p>
        )}
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {[...contenu.directions].sort((a, b) => a.position - b.position).map(direction => (
        <div key={direction.position} className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-cr-text text-lg">
              {direction.position}. {direction.titre}
            </h2>
            {direction.estRecommandee && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                Recommandée
              </span>
            )}
          </div>
          <BlocAffirmation titre="Pourquoi (diagnostic)" affirmation={direction.pourquoi} />
          <BlocAffirmation titre="Forces" affirmation={direction.forces} />
          <BlocAffirmation titre="Limites" affirmation={direction.limites} />
          <BlocAffirmation titre="Plan d'action" affirmation={direction.planAction} />
        </div>
      ))}
    </div>
  )
}
