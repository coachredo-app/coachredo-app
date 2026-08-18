'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBilanSession } from './actions'
import { QUESTION_STEPS } from './steps'

const GOLD = '#c9a84c'

function fmt(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface CompletedSession {
  id: string
  session_num: number
  completed_at: string | null
}

// ── BilanView — lecture seule, zéro write ─────────────────────
// Ne doit jamais importer bilan-storage ni bilan-sync.
function BilanView({
  responses,
  session,
  onBack,
}: {
  responses: Record<string, string>
  session: CompletedSession
  onBack: () => void
}) {
  const [index, setIndex] = useState(0)
  const step = QUESTION_STEPS[index]
  const isFirst = index === 0
  const isLast = index === QUESTION_STEPS.length - 1
  const progressPct = ((index + 1) / QUESTION_STEPS.length) * 100

  const prevStep = index > 0 ? QUESTION_STEPS[index - 1] : null
  const showFamilleLabel =
    !prevStep || prevStep.famille !== step.famille

  const response = responses[step.id] ?? ''

  return (
    <div className="reader-fixed" style={{ backgroundColor: '#0a0d1a' }}>

      {/* Barre de progression */}
      <div className="flex-none" style={{ height: '2px', backgroundColor: '#1f2937' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            backgroundColor: GOLD,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Top bar */}
      <div className="flex-none flex items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={isFirst ? onBack : () => setIndex(i => i - 1)}
          className="text-sm transition-opacity hover:opacity-100"
          style={{ color: '#6b7280', cursor: 'pointer' }}
        >
          ← {isFirst ? 'Options' : 'Précédent'}
        </button>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: GOLD }}>
          Bilan #{session.session_num}
        </span>
        <span className="text-xs tabular-nums" style={{ color: '#4b5563' }}>
          {index + 1} / {QUESTION_STEPS.length}
        </span>
      </div>

      {/* Contenu */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-8" style={{ touchAction: 'pan-y' }}>
        <div className="w-full max-w-lg mx-auto min-w-0">

          {showFamilleLabel && (
            <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: GOLD }}>
              {step.famille}
            </p>
          )}

          <p
            className="text-base sm:text-lg leading-relaxed font-medium mb-8"
            style={{ color: '#f3f4f6', overflowWrap: 'anywhere' }}
          >
            {step.text}
          </p>

          {response ? (
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#d1d5db' }}>
                {response}
              </p>
            </div>
          ) : (
            <p className="text-sm italic" style={{ color: '#4b5563' }}>
              Sans réponse
            </p>
          )}

        </div>
      </div>

      {/* Navigation */}
      <div
        className="flex-none px-4 sm:px-6 pt-3"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
      >
        {!isLast ? (
          <button
            onClick={() => setIndex(i => i + 1)}
            className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all active:scale-95"
            style={{
              backgroundColor: GOLD,
              color: '#0a0d1a',
              boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
            }}
          >
            Continuer →
          </button>
        ) : (
          <button
            onClick={onBack}
            className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all active:scale-95"
            style={{
              backgroundColor: '#1f2937',
              color: '#d1d5db',
              border: '1px solid #374151',
            }}
          >
            ← Retour aux options
          </button>
        )}
      </div>

    </div>
  )
}

// ── BilanGateway — écran de choix ─────────────────────────────
export function BilanGateway({
  lastSession,
  responses,
}: {
  lastSession: CompletedSession
  responses: Record<string, string>
}) {
  const router = useRouter()
  const [showView, setShowView] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (showView) {
    return (
      <BilanView
        responses={responses}
        session={lastSession}
        onBack={() => setShowView(false)}
      />
    )
  }

  async function handleNewBilan() {
    setLoading(true)
    setError(null)
    const result = await createBilanSession()
    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.push('/bilan')
  }

  return (
    <main
      className="flex items-center justify-center px-4 sm:px-6 py-16 overflow-x-hidden"
      style={{ backgroundColor: '#0a0d1a', minHeight: '100dvh' }}
    >
      <div className="w-full max-w-sm">

        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3 text-center"
          style={{ color: GOLD }}
        >
          Bilan de Clarté
        </p>

        <p className="text-xs text-center mb-10" style={{ color: '#4b5563' }}>
          Bilan #{lastSession.session_num} — complété le {fmt(lastSession.completed_at)}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setShowView(true)}
            className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-95"
            style={{
              backgroundColor: '#1f2937',
              color: '#d1d5db',
              border: '1px solid #374151',
            }}
          >
            Voir mes réponses
          </button>
          <button
            onClick={handleNewBilan}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-95 disabled:opacity-40"
            style={{
              backgroundColor: GOLD,
              color: '#0a0d1a',
              boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
            }}
          >
            {loading ? 'Création…' : 'Faire un nouveau Bilan →'}
          </button>
        </div>

        {error && (
          <p className="text-xs text-center mt-4" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/fr/dashboard"
            className="text-sm transition-opacity hover:opacity-100"
            style={{ color: '#4b5563' }}
          >
            ← Mon espace CoachRedo
          </Link>
        </div>

      </div>
    </main>
  )
}
