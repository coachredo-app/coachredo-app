'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitMissionResponse } from './actions'

interface Mission {
  id: string
  mission: string
  coach_note: string | null
  assigned_at: string
  user_response: string | null
  responded_at: string | null
}

function fmt(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function MissionCard({ mission, locale }: { mission: Mission; locale: string }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const hasResponded = !!mission.user_response

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const result = await submitMissionResponse(mission.id, locale, text)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setShowForm(false)
      setText('')
      router.refresh()
    }
  }

  if (hasResponded) {
    return (
      <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            ✓ Réponse envoyée
          </span>
          {mission.responded_at && (
            <span className="text-xs text-cr-text-muted">le {fmt(mission.responded_at)}</span>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-2">Ta mission</p>
          <p className="text-sm text-cr-text leading-relaxed">{mission.mission}</p>
        </div>

        <div className="border-t border-cr-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-cr-text-muted mb-2">Ta réponse</p>
          <p className="text-sm text-cr-text leading-relaxed whitespace-pre-wrap">{mission.user_response}</p>
        </div>

        <p className="text-xs text-cr-text-muted italic">
          Ton coach va analyser ta réponse et te donner la suite.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          🎯 Mission en cours
        </span>
        <span className="text-xs text-cr-text-muted">assignée le {fmt(mission.assigned_at)}</span>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-2">Ta mission</p>
        <p className="text-sm text-cr-text leading-relaxed whitespace-pre-wrap">{mission.mission}</p>
      </div>

      {mission.coach_note && (
        <div className="bg-background rounded-lg px-4 py-3 border border-cr-border">
          <p className="text-xs text-cr-text-secondary italic leading-relaxed">{mission.coach_note}</p>
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Écrire ma réponse
        </button>
      ) : (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Écris ce qui s'est passé, ce que tu as fait, ce que tu as observé…"
            rows={6}
            maxLength={5000}
            className="w-full text-sm rounded-lg border border-cr-border bg-background px-4 py-3 text-cr-text placeholder:text-cr-text-muted focus:outline-none focus:ring-1 focus:ring-cr-accent resize-none"
          />
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
              className="px-5 py-2.5 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {loading ? 'Envoi…' : 'Envoyer à mon coach'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null) }}
              disabled={loading}
              className="text-sm text-cr-text-muted hover:text-cr-text transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
