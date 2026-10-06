'use client'

// ============================================================
// MPD V3 — CTA de clôture — T7.11C
// ============================================================
// Mince wrapper client : déclenche la Server Action, désactive le
// bouton pendant la requête (évite les doubles appels inutiles — le
// double-clic reste de toute façon sans danger, l'idempotence réelle
// est déjà portée par la RPC/l'attestation, D-031/D-032). Ne détient
// aucune logique de décision — le résultat (redirection ou erreur)
// vient entièrement de la Server Action.

import { useState, useTransition } from 'react'
import { preparerMaFeuilleDeRoute } from './actions'

interface ClotureRendererProps {
  readonly locale: string
  readonly dossierId: string
  readonly revision: number
}

export function ClotureRenderer({ locale, dossierId, revision }: ClotureRendererProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const resultat = await preparerMaFeuilleDeRoute(locale, dossierId, revision)
      if (resultat?.error) setError(resultat.error)
    })
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-5 py-2.5 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isPending ? 'Préparation…' : 'Préparer ma Feuille de Route'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
