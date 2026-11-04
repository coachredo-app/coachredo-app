'use client'

// ============================================================
// MFR — Actions de validation/publication (T-MFR.5B-4)
// ============================================================
// Même patron que DeleteUserButton.tsx (admin, déjà en production) :
// confirmation explicite en deux temps, état de chargement désactivant
// les deux boutons (protection contre le double-clic), erreur affichée
// fidèlement (jamais un message générique qui masquerait un code
// métier réel). La protection réelle contre une double action reste
// server-side (idempotence de 027) — ceci n'est qu'une protection UX
// de surface, jamais la seule garantie.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { validerVersion, publierVersion } from './actions'
import { LIBELLES_ERREUR_VALIDATION_PUBLICATION } from '@/lib/mfr/server/validationPublication'

interface Props {
  readonly cycleId: string
  readonly versionId: string
  readonly estValidee: boolean
  readonly estPubliee: boolean
  readonly locale: string
}

function libelleErreur(code: string): string {
  return LIBELLES_ERREUR_VALIDATION_PUBLICATION[code] ?? `Erreur inattendue (${code}).`
}

export function ValidationPublicationActions({ cycleId, versionId, estValidee, estPubliee, locale }: Props) {
  const router = useRouter()
  const [confirmation, setConfirmation] = useState<'valider' | 'publier' | null>(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  async function confirmerValidation() {
    setLoading(true)
    setErreur('')
    try {
      const resultat = await validerVersion(versionId, cycleId, locale)
      if (resultat.statut === 'ERREUR') {
        setErreur(libelleErreur(resultat.code))
      } else {
        router.refresh()
      }
    } catch {
      setErreur('Erreur technique.')
    } finally {
      setLoading(false)
      setConfirmation(null)
    }
  }

  async function confirmerPublication() {
    setLoading(true)
    setErreur('')
    try {
      const resultat = await publierVersion(versionId, cycleId, locale)
      if (resultat.statut === 'ERREUR') {
        setErreur(libelleErreur(resultat.code))
      } else {
        router.refresh()
      }
    } catch {
      setErreur('Erreur technique.')
    } finally {
      setLoading(false)
      setConfirmation(null)
    }
  }

  if (estPubliee) {
    return <p className="text-sm text-cr-text-muted">Cette version est publiée — aucune action supplémentaire possible.</p>
  }

  if (confirmation === 'valider') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {erreur && <p className="text-sm text-error w-full">{erreur}</p>}
        <span className="text-sm text-cr-text-secondary">Confirmer la validation de cette version ?</span>
        <button
          onClick={confirmerValidation}
          disabled={loading}
          className="text-sm font-semibold text-cr-accent hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Validation…' : '✓ Confirmer'}
        </button>
        <button onClick={() => setConfirmation(null)} disabled={loading} className="text-sm text-cr-text-muted hover:text-cr-text whitespace-nowrap">
          Annuler
        </button>
      </div>
    )
  }

  if (confirmation === 'publier') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {erreur && <p className="text-sm text-error w-full">{erreur}</p>}
        <span className="text-sm text-cr-text-secondary">Confirmer la publication de cette version ? Cette action est irréversible.</span>
        <button
          onClick={confirmerPublication}
          disabled={loading}
          className="text-sm font-semibold text-green-700 hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Publication…' : '✓ Confirmer'}
        </button>
        <button onClick={() => setConfirmation(null)} disabled={loading} className="text-sm text-cr-text-muted hover:text-cr-text whitespace-nowrap">
          Annuler
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {erreur && <p className="text-sm text-error">{erreur}</p>}
      {estValidee ? (
        <button
          onClick={() => setConfirmation('publier')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Publier cette version
        </button>
      ) : (
        <button
          onClick={() => setConfirmation('valider')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Valider cette version
        </button>
      )}
    </div>
  )
}
