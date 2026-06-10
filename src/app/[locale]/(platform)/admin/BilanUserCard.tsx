'use client'

import { useState } from 'react'
import { BILAN_QUESTIONS, FAMILLE_ORDER, FAMILLE_TOTAL } from '@/lib/bilan-questions'

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

  const responseMap = Object.fromEntries(
    responses.map(r => [r.question_id, r.response])
  )

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
          <div className="hidden sm:flex items-center gap-1.5">
            {FAMILLE_ORDER.map(famille => {
              const total = FAMILLE_TOTAL[famille] ?? 0
              const answered = BILAN_QUESTIONS
                .filter(q => q.famille === famille && responseMap[q.id])
                .length
              const full = answered === total
              return (
                <span
                  key={famille}
                  className={`text-xs px-1.5 py-0.5 rounded font-mono tabular-nums ${
                    full
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : answered > 0
                      ? 'bg-cr-accent-subtle text-cr-accent border border-cr-border'
                      : 'bg-background text-cr-text-muted border border-cr-border'
                  }`}
                >
                  {answered}/{total}
                </span>
              )
            })}
          </div>
          <span className="text-sm tabular-nums text-cr-text-secondary sm:hidden">
            {answeredCount}/13
          </span>
          {completedAt && (
            <span className="text-xs text-cr-text-muted whitespace-nowrap hidden sm:inline">
              {fmt(completedAt)}
            </span>
          )}
          <span className="text-cr-text-muted text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-cr-border bg-background">
          {FAMILLE_ORDER.map(famille => {
            const questions = BILAN_QUESTIONS.filter(q => q.famille === famille)
            const answered = questions.filter(q => responseMap[q.id])
            if (answered.length === 0) return null
            return (
              <div key={famille} className="px-5 py-4 border-b border-cr-border last:border-b-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent">
                    {famille}
                  </p>
                  <span className="text-xs tabular-nums text-cr-text-muted">
                    {answered.length}/{questions.length}
                  </span>
                </div>
                <div className="space-y-4">
                  {questions
                    .filter(q => responseMap[q.id])
                    .map(q => (
                      <div key={q.id}>
                        <p className="text-xs text-cr-text-muted mb-1 leading-relaxed">
                          {q.text}
                        </p>
                        <p className="text-sm text-cr-text leading-relaxed whitespace-pre-wrap">
                          {responseMap[q.id]}
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
