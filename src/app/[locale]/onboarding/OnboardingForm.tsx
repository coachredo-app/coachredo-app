'use client'

import { useState, useTransition } from 'react'
import { listePaysTriee } from '@/lib/profile/pays'
import { enregistrerPays } from './actions'

export function OnboardingForm({ locale }: { readonly locale: string }) {
  const pays = listePaysTriee(locale)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code) return
    setError(null)
    startTransition(async () => {
      const resultat = await enregistrerPays(locale, code)
      if (resultat?.error) setError('Une erreur est survenue. Réessaie.')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <select
        value={code}
        onChange={e => setCode(e.target.value)}
        required
        className="w-full px-3.5 py-2.5 rounded-lg border border-cr-border text-cr-text bg-surface text-sm focus:outline-none focus:border-cr-accent"
      >
        <option value="" disabled>
          Choisis ton pays
        </option>
        {pays.map(p => (
          <option key={p.code} value={p.code}>
            {p.libelle}
          </option>
        ))}
      </select>

      {error && <p className="text-sm text-error bg-cr-accent-subtle rounded-lg px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !code}
        className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-cr-accent text-cr-text-inverse hover:bg-cr-accent-hover transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Enregistrement…' : 'Continuer'}
      </button>
    </form>
  )
}
