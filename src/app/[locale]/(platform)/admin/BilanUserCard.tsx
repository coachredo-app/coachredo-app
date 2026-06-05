'use client'

import { useState } from 'react'

const TOTAL_QUESTIONS = 13

const FAMILLE_ORDER = ['Reconnaissance', 'Blocages', 'Ressources', 'Observation', 'Mouvement']

interface BilanResponse {
  question_id: string
  famille: string
  response: string
  updated_at: string
}

interface Props {
  email: string
  responses: BilanResponse[]
  completedAt: string | null
}

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function BilanUserCard({ email, responses, completedAt }: Props) {
  const [open, setOpen] = useState(false)

  const byFamille = FAMILLE_ORDER.reduce<Record<string, BilanResponse[]>>((acc, f) => {
    acc[f] = responses.filter(r => r.famille === f)
    return acc
  }, {})

  const answeredCount = responses.length

  return (
    <div className="border border-cr-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-background transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-cr-text truncate">{email}</span>
          {completedAt && (
            <span className="text-xs text-success font-medium whitespace-nowrap">✓ Complété</span>
          )}
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <span className="text-sm tabular-nums text-cr-text-secondary">
            {answeredCount} / {TOTAL_QUESTIONS}
          </span>
          {completedAt && (
            <span className="text-xs text-cr-text-muted whitespace-nowrap">{fmt(completedAt)}</span>
          )}
          <span className="text-cr-text-muted text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-cr-border divide-y divide-cr-border bg-background">
          {FAMILLE_ORDER.map(famille => {
            const items = byFamille[famille]
            if (!items || items.length === 0) return null
            return (
              <div key={famille} className="px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-3">
                  {famille}
                </p>
                <div className="space-y-4">
                  {items.map(r => (
                    <div key={r.question_id}>
                      <p className="text-xs text-cr-text-muted mb-1 font-mono">{r.question_id}</p>
                      <p className="text-sm text-cr-text leading-relaxed whitespace-pre-wrap">
                        {r.response}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {answeredCount === 0 && (
            <p className="px-5 py-4 text-sm text-cr-text-muted">Aucune réponse enregistrée.</p>
          )}
        </div>
      )}
    </div>
  )
}
