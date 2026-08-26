'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  loadBilan,
  saveBilanSession,
  saveBilanStep,
  saveBilanResponse,
  markBilanCompleted,
} from '@/lib/reader/bilan-storage'
import { syncBilanResponse, updateCurrentStep } from '@/lib/reader/bilan-sync'
import { completeBilanSession } from './actions'
import { STEPS } from './steps'
import { REQUIRED_QUESTION_IDS } from '@/lib/bilan-questions'

const GOLD = '#c9a84c'

export interface BilanSession {
  id: string
  session_num: number
  current_step: number
  statut: string
}

export function BilanReader({
  session,
  initialResponses,
}: {
  session: BilanSession
  initialResponses: Record<string, string>
}) {
  const router = useRouter()
  const [index, setIndex] = useState(session.current_step)
  const [responses, setResponses] = useState<Record<string, string>>(initialResponses)
  const [fieldOpen, setFieldOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [completionError, setCompletionError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fusionner les réponses offline puis synchroniser localStorage avec Supabase
  useEffect(() => {
    // Lire localStorage AVANT d'écraser session_id — sinon le check sessionId === session.id
    // serait toujours vrai, et les réponses d'une session précédente contamineraient la nouvelle.
    const local = loadBilan()
    saveBilanSession(session.id)
    saveBilanStep(session.current_step)

    if (local.sessionId === session.id && Object.keys(local.responses).length > 0) {
      // Supabase (initialResponses) a la priorité ; le local complète ce qui manque
      setResponses(prev => ({ ...local.responses, ...prev }))
      // Remonter vers Supabase les réponses locales non encore synchronisées
      Object.entries(local.responses).forEach(([qId, value]) => {
        if (!initialResponses[qId] && value) {
          const step = STEPS.find(s => s.kind === 'question' && s.id === qId)
          if (step?.kind === 'question') {
            syncBilanResponse(session.id, qId, step.famille, value)
          }
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fermer le champ à chaque changement de step
  useEffect(() => {
    setFieldOpen(false)
    setDraft('')
  }, [index])

  // Auto-focus du textarea à l'ouverture
  useEffect(() => {
    if (fieldOpen) textareaRef.current?.focus()
  }, [fieldOpen])

  function navigateTo(newIndex: number) {
    setIndex(newIndex)
    saveBilanStep(newIndex)
    updateCurrentStep(session.id, newIndex)
  }

  const step = STEPS[index]
  const isFirst = index === 0
  const isLast = index === STEPS.length - 1
  const progressPct = ((index + 1) / STEPS.length) * 100

  const missingRequiredIds = isLast
    ? [...REQUIRED_QUESTION_IDS].filter(id => !responses[id]?.trim())
    : []
  const missingRequiredScreens = missingRequiredIds
    .map(id => STEPS.findIndex(s => s.kind === 'question' && s.id === id) + 1)
    .sort((a, b) => a - b)

  const prevStep = index > 0 ? STEPS[index - 1] : null
  const showFamilleLabel =
    step.kind === 'question' &&
    (prevStep?.kind !== 'question' || prevStep.famille !== step.famille)

  const savedResponse = step.kind === 'question' ? (responses[step.id] ?? '') : ''
  const hasResponse = savedResponse.length > 0

  function handleOpenField() {
    if (step.kind !== 'question') return
    setDraft(responses[step.id] ?? '')
    setFieldOpen(true)
  }

  function handleBlur() {
    if (step.kind !== 'question') return
    const trimmed = draft.trim()
    saveBilanResponse(step.id, trimmed)
    setResponses(prev => {
      if (trimmed) return { ...prev, [step.id]: trimmed }
      const next = { ...prev }
      delete next[step.id]
      return next
    })
    syncBilanResponse(session.id, step.id, step.famille, trimmed)
  }

  async function handleNext() {
    if (isLast) {
      if (missingRequiredIds.length > 0) return
      markBilanCompleted()
      const result = await completeBilanSession(session.id)
      if (result.error) {
        setCompletionError(result.error)
        return
      }
      router.push('/bilan/confirmation')
    } else {
      navigateTo(index + 1)
    }
  }

  function handleBack() {
    if (isFirst) {
      router.push('/fr/dashboard')
    } else {
      navigateTo(index - 1)
    }
  }

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
          onClick={handleBack}
          className="text-sm transition-opacity hover:opacity-100"
          style={{ color: '#6b7280', cursor: 'pointer' }}
        >
          ← {isFirst ? 'Mon espace CoachRedo' : 'Précédent'}
        </button>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: GOLD }}>
          Bilan de clarté
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums" style={{ color: '#4b5563' }}>
            {index + 1} / {STEPS.length}
          </span>
          <Link
            href="/fr/dashboard"
            className="text-xs flex items-center gap-1"
            style={{ color: '#6b7280' }}
          >
            <span>⌂</span>
            <span className="hidden sm:inline">Mon espace</span>
          </Link>
        </div>
      </div>

      {/* Contenu — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-8" style={{ touchAction: 'pan-y' }}>
        <div className="w-full max-w-lg mx-auto min-w-0">

          {step.kind === 'intro' && (
            <p className="text-base leading-relaxed" style={{ color: '#9ca3af', fontStyle: 'italic' }}>
              {step.text}
            </p>
          )}

          {step.kind === 'question' && (
            <div>
              {showFamilleLabel && (
                <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: GOLD }}>
                  {step.famille}
                </p>
              )}
              <p
                className="text-base sm:text-lg leading-relaxed font-medium mb-10"
                style={{ color: '#f3f4f6', overflowWrap: 'anywhere' }}
              >
                {step.text}
              </p>
              {!fieldOpen ? (
                <button
                  onClick={handleOpenField}
                  className="text-sm transition-opacity"
                  style={{
                    color: hasResponse ? GOLD : '#4b5563',
                    opacity: hasResponse ? 0.75 : 0.55,
                    cursor: 'pointer',
                  }}
                >
                  {hasResponse
                    ? '✓ Modifier ma réflexion'
                    : REQUIRED_QUESTION_IDS.has(step.id)
                      ? '✎ Réponse essentielle'
                      : '✎ Répondre (optionnel)'}
                </button>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Ce qui te vient spontanément..."
                  rows={4}
                  className="w-full text-sm leading-relaxed resize-none outline-none rounded-lg p-3"
                  style={{
                    backgroundColor: '#111827',
                    color: '#d1d5db',
                    border: '1px solid #1f2937',
                    fontFamily: 'inherit',
                  }}
                />
              )}
            </div>
          )}

          {step.kind === 'done' && (
            <div className="text-center pt-8">
              <p className="text-xs font-semibold uppercase tracking-widest mb-8" style={{ color: GOLD }}>
                Plan B Rentable
              </p>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#d1d5db' }}>
                Tu as traversé les questions.
              </p>
              <p className="text-base leading-relaxed" style={{ color: '#6b7280' }}>
                Ce que tu as vu — même partiellement, même sans réponse encore — c&apos;est déjà quelque chose.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Bouton Continuer */}
      <div
        className="flex-none px-4 sm:px-6 pt-3"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
      >
        {isLast && missingRequiredIds.length > 0 && (
          <p className="text-xs text-center mb-3" style={{ color: '#ef4444' }}>
            Réponse{missingRequiredIds.length > 1 ? 's' : ''} essentielle{missingRequiredIds.length > 1 ? 's' : ''} manquante{missingRequiredIds.length > 1 ? 's' : ''} — question{missingRequiredIds.length > 1 ? 's' : ''} {missingRequiredScreens.join(', ')} — utilise ← Précédent.
          </p>
        )}
        {completionError && (
          <p className="text-xs text-center mb-3" style={{ color: '#ef4444' }}>
            {completionError}
          </p>
        )}
        <button
          onClick={handleNext}
          disabled={isLast && missingRequiredIds.length > 0}
          className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all active:scale-95 disabled:opacity-40"
          style={{
            backgroundColor: GOLD,
            color: '#0a0d1a',
            boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
          }}
        >
          {isLast ? 'Terminer →' : 'Continuer →'}
        </button>
      </div>

    </div>
  )
}
