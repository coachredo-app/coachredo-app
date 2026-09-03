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
import { STEPS_REQUIRED_IDS, BILAN_QUESTIONS } from '@/lib/bilan-questions'

const GOLD = '#c9a84c'

const SITUATION_OPTIONS = [
  'Salarié(e)',
  'Étudiant(e)',
  'Entrepreneur · indépendant',
  'Sans activité actuellement',
  'Autre',
]

const TEMPS_OPTIONS = [
  'Moins de 5 h',
  '5 à 10 h',
  '10 à 20 h',
  'Plus de 20 h',
]

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

  // Écran contexte affiché APRÈS les intros.
  // Pour une session neuve (current_step < 3) : déclenché par handleNext quand on quitte la dernière intro.
  // Pour une session V1 reprise (current_step >= 3) sans C1/C2 : affiché immédiatement.
  const [showContext, setShowContext] = useState(
    session.current_step >= 3 &&
    (!initialResponses['contexte_situation'] || !initialResponses['contexte_temps'])
  )
  const [ctxSituation, setCtxSituation] = useState(initialResponses['contexte_situation'] ?? '')
  const [ctxTemps, setCtxTemps] = useState(initialResponses['contexte_temps'] ?? '')
  const [ctxLoading, setCtxLoading] = useState(false)

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
    ? [...STEPS_REQUIRED_IDS].filter(id => !responses[id]?.trim())
    : []

  // Séparer les questions réflexives manquantes (1-13) de E1
  const missingReflectiveNums = missingRequiredIds
    .filter(id => id !== 'contexte_experience')
    .map(id => BILAN_QUESTIONS.findIndex(q => q.id === id) + 1)
    .sort((a, b) => a - b)
  const missingE1 = missingRequiredIds.includes('contexte_experience')

  // Message affiché sur la done screen
  let missingMessage = ''
  if (isLast && missingRequiredIds.length > 0) {
    const reflPart = missingReflectiveNums.length === 0 ? ''
      : missingReflectiveNums.length === 1
      ? `la question ${missingReflectiveNums[0]}`
      : `les questions ${missingReflectiveNums.slice(0, -1).join(', ')} et ${missingReflectiveNums[missingReflectiveNums.length - 1]}`
    if (reflPart && missingE1) {
      missingMessage = `Il te reste à compléter ${reflPart}, ainsi que « Ton expérience jusqu'ici ».`
    } else if (reflPart) {
      missingMessage = `Il te reste à compléter ${reflPart}.`
    } else {
      missingMessage = `Il te reste à compléter « Ton expérience jusqu'ici ».`
    }
  }

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
      // Intercepter la transition intro→question si C1/C2 non encore renseignés
      if (
        step.kind === 'intro' &&
        STEPS[index + 1]?.kind === 'question' &&
        (!responses['contexte_situation'] || !responses['contexte_temps'])
      ) {
        setShowContext(true)
        return
      }
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

  async function handleContextSubmit() {
    if (!ctxSituation || !ctxTemps || ctxLoading) return
    setCtxLoading(true)
    saveBilanResponse('contexte_situation', ctxSituation)
    saveBilanResponse('contexte_temps', ctxTemps)
    await Promise.all([
      syncBilanResponse(session.id, 'contexte_situation', 'Contexte', ctxSituation),
      syncBilanResponse(session.id, 'contexte_temps', 'Contexte', ctxTemps),
    ])
    setResponses(prev => ({
      ...prev,
      contexte_situation: ctxSituation,
      contexte_temps: ctxTemps,
    }))
    setCtxLoading(false)
    setShowContext(false)
    // Avancer automatiquement à la Q1 si on venait de la transition intro→question
    if (step.kind === 'intro' && STEPS[index + 1]?.kind === 'question') {
      navigateTo(index + 1)
    }
  }

  if (showContext) {
    return (
      <div className="reader-fixed" style={{ backgroundColor: '#0a0d1a' }}>
        <div className="flex-none flex items-center justify-between px-5 pt-5 pb-3">
          <button
            onClick={() => router.push('/fr/dashboard')}
            className="text-sm transition-opacity hover:opacity-100"
            style={{ color: '#6b7280', cursor: 'pointer' }}
          >
            ← Mon espace CoachRedo
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: GOLD }}>
            Bilan de clarté
          </span>
          <div />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-8" style={{ touchAction: 'pan-y' }}>
          <div className="w-full max-w-lg mx-auto min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: GOLD }}>
              Un peu de contexte avant de commencer.
            </p>
            <p className="text-sm leading-relaxed mb-10" style={{ color: '#6b7280' }}>
              Ces deux informations permettent d&apos;adapter l&apos;analyse à ta situation réelle.
            </p>

            <div className="mb-8">
              <p className="text-base font-medium mb-4" style={{ color: '#f3f4f6' }}>
                Ta situation actuelle
              </p>
              <div className="space-y-2">
                {SITUATION_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setCtxSituation(opt)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                    style={{
                      backgroundColor: ctxSituation === opt ? 'rgba(201,168,76,0.12)' : '#111827',
                      border: ctxSituation === opt ? '1px solid rgba(201,168,76,0.45)' : '1px solid #1f2937',
                      color: ctxSituation === opt ? GOLD : '#9ca3af',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <p className="text-base font-medium mb-4" style={{ color: '#f3f4f6' }}>
                Temps disponible par semaine
              </p>
              <div className="space-y-2">
                {TEMPS_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setCtxTemps(opt)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                    style={{
                      backgroundColor: ctxTemps === opt ? 'rgba(201,168,76,0.12)' : '#111827',
                      border: ctxTemps === opt ? '1px solid rgba(201,168,76,0.45)' : '1px solid #1f2937',
                      color: ctxTemps === opt ? GOLD : '#9ca3af',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex-none px-4 sm:px-6 pt-3"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
        >
          <button
            onClick={handleContextSubmit}
            disabled={!ctxSituation || !ctxTemps || ctxLoading}
            className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all active:scale-95 disabled:opacity-40"
            style={{
              backgroundColor: GOLD,
              color: '#0a0d1a',
              boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
            }}
          >
            Continuer →
          </button>
        </div>
      </div>
    )
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
          {step.kind === 'question' && step.id !== 'contexte_experience' && (
            <span className="text-xs tabular-nums" style={{ color: '#4b5563' }}>
              {BILAN_QUESTIONS.findIndex(q => q.id === step.id) + 1} / 13
            </span>
          )}
          {step.kind === 'question' && step.id === 'contexte_experience' && (
            <span className="text-xs" style={{ color: '#4b5563' }}>
              Ton expérience jusqu&apos;ici
            </span>
          )}
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
                <>
                  <button
                    onClick={handleOpenField}
                    className="text-sm transition-opacity"
                    style={{
                      color: hasResponse ? GOLD : '#4b5563',
                      opacity: hasResponse ? 0.75 : 0.55,
                      cursor: 'pointer',
                    }}
                  >
                    {hasResponse ? '✓ Modifier ma réflexion' : '✎ Répondre à cette question'}
                  </button>
                  {!hasResponse && (
                    <p className="text-xs mt-3" style={{ color: '#6b7280' }}>
                      Pas de réponse évidente ? « Je ne sais pas encore » est une réponse valide.
                    </p>
                  )}
                </>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onBlur={handleBlur}
                  placeholder={
                    step.id === 'contexte_experience'
                      ? "Si oui : qu'as-tu essayé et qu'en as-tu retenu ? Si non : indique simplement que tu n'as encore rien tenté."
                      : 'Ce qui te vient spontanément...'
                  }
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
                Tu as répondu aux questions.
              </p>
              <p className="text-base leading-relaxed" style={{ color: '#6b7280' }}>
                Ce que tu viens de partager — même quand c&apos;était difficile à formuler — constitue la matière de ton Rapport.
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
            {missingMessage}
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
          {isLast ? 'Valider mon Bilan de clarté →' : 'Continuer →'}
        </button>
      </div>

    </div>
  )
}
