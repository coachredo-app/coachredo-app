'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { loadBilan, saveBilanResponse, markBilanCompleted } from '@/lib/reader/bilan-storage'

const GOLD = '#c9a84c'

// ── Types ────────────────────────────────────────────────────

type Step =
  | { kind: 'intro'; text: string }
  | { kind: 'question'; famille: string; id: string; text: string }
  | { kind: 'done' }

// ── Contenu ──────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    kind: 'intro',
    text: 'Ces questions ne testent rien.',
  },
  {
    kind: 'intro',
    text: "Elles prolongent ce que tu as commencé à regarder en lisant ce livre. Certaines te parleront tout de suite. D'autres resteront ouvertes — c'est prévu, pas un oubli. Il y a des questions qu'on porte avec soi un moment avant de pouvoir leur répondre vraiment.",
  },
  {
    kind: 'intro',
    text: "Tu peux les traverser dans l'ordre ou pas. Revenir à certaines plus tard. Laisser les autres de côté. Ce qui compte, c'est le regard que tu poses — pas la liste complétée.",
  },
  {
    kind: 'question',
    famille: 'Reconnaissance',
    id: 'reconnaissance_1',
    text: "Qu'est-ce que tu te dis depuis longtemps que tu vas faire — bientôt ?",
  },
  {
    kind: 'question',
    famille: 'Reconnaissance',
    id: 'reconnaissance_2',
    text: "Si tu observes ta semaine telle qu'elle s'est vraiment passée — pas comme tu aurais voulu qu'elle se passe — qu'est-ce qui t'a retenu le plus ?",
  },
  {
    kind: 'question',
    famille: 'Reconnaissance',
    id: 'reconnaissance_3',
    text: "Si ton revenu actuel s'arrêtait dans trois mois, qu'est-ce qui changerait dans ta façon de voir ta situation aujourd'hui ?",
  },
  {
    kind: 'question',
    famille: 'Blocages',
    id: 'blocages_1',
    text: "Qu'est-ce que tu gardes pour toi depuis longtemps, en attendant que ça ait une forme suffisante pour être montré ?",
  },
  {
    kind: 'question',
    famille: 'Blocages',
    id: 'blocages_2',
    text: 'De qui, précisément, aurais-tu le plus peur de décevoir les attentes ?',
  },
  {
    kind: 'question',
    famille: 'Blocages',
    id: 'blocages_3',
    text: "Quelle est la « bonne raison » que tu te donnes le plus souvent pour ne pas encore commencer ?",
  },
  {
    kind: 'question',
    famille: 'Ressources',
    id: 'ressources_1',
    text: "Pour quel type de problème est-ce qu'on vient te voir quand les autres ne savent pas quoi faire ?",
  },
  {
    kind: 'question',
    famille: 'Ressources',
    id: 'ressources_2',
    text: "Qu'est-ce que tu fais naturellement, si bien que tu ne le vois même plus comme une compétence ?",
  },
  {
    kind: 'question',
    famille: 'Ressources',
    id: 'ressources_3',
    text: "Qu'est-ce que tu as traversé — une période difficile, une responsabilité prise tôt, une situation gérée sous pression — que tu n'as jamais vraiment compté comme une ressource ?",
  },
  {
    kind: 'question',
    famille: 'Observation',
    id: 'observation_1',
    text: "Quel problème vois-tu régulièrement autour de toi, que personne n'a encore vraiment résolu ?",
  },
  {
    kind: 'question',
    famille: 'Observation',
    id: 'observation_2',
    text: "Qu'est-ce que les gens font de manière compliquée dans ta vie de tous les jours — alors qu'une façon plus simple devrait exister ?",
  },
  {
    kind: 'question',
    famille: 'Mouvement',
    id: 'mouvement_1',
    text: "Si tu devais commencer quelque chose cette semaine — pas le projet entier, juste une première chose concrète — quelle serait cette chose ?",
  },
  {
    kind: 'question',
    famille: 'Mouvement',
    id: 'mouvement_2',
    text: "Dans six mois, à quoi reconnaîtrais-tu que quelque chose a légèrement changé dans ta façon de voir ta situation ?",
  },
  {
    kind: 'done',
  },
]

// ── Composant ────────────────────────────────────────────────

export default function BilanPage() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [fieldOpen, setFieldOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Charger les réponses existantes au montage
  useEffect(() => {
    const data = loadBilan()
    setResponses(data.responses)
  }, [])

  // Fermer le champ à chaque changement de step
  useEffect(() => {
    setFieldOpen(false)
    setDraft('')
  }, [index])

  // Auto-focus du textarea à l'ouverture
  useEffect(() => {
    if (fieldOpen) {
      textareaRef.current?.focus()
    }
  }, [fieldOpen])

  const step = STEPS[index]
  const isFirst = index === 0
  const isLast = index === STEPS.length - 1
  const progressPct = ((index + 1) / STEPS.length) * 100

  // Afficher le label famille uniquement au premier step d'une famille
  const prevStep = index > 0 ? STEPS[index - 1] : null
  const showFamilleLabel =
    step.kind === 'question' &&
    (prevStep?.kind !== 'question' || prevStep.famille !== step.famille)

  // Réponse existante pour le step courant
  const savedResponse =
    step.kind === 'question' ? (responses[step.id] ?? '') : ''
  const hasResponse = savedResponse.length > 0

  function handleOpenField() {
    if (step.kind !== 'question') return
    setDraft(responses[step.id] ?? '')
    setFieldOpen(true)
  }

  // Sauvegarde silencieuse au blur du textarea
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
  }

  function handleNext() {
    if (isLast) {
      markBilanCompleted()
      router.push('/bilan/confirmation')
    } else {
      setIndex(i => i + 1)
    }
  }

  function handleBack() {
    if (isFirst) {
      router.push('/transition')
    } else {
      setIndex(i => i - 1)
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
          style={{ color: '#6b7280' }}
        >
          ← {isFirst ? 'Retour' : 'Précédent'}
        </button>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: GOLD }}>
          Bilan de clarté
        </span>
        <span className="text-xs tabular-nums" style={{ color: '#4b5563' }}>
          {index + 1} / {STEPS.length}
        </span>
      </div>

      {/* Contenu — scrollable si besoin */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-8" style={{ touchAction: 'pan-y' }}>
        <div className="w-full max-w-lg mx-auto min-w-0">

          {/* Intro */}
          {step.kind === 'intro' && (
            <p
              className="text-base leading-relaxed"
              style={{ color: '#9ca3af', fontStyle: 'italic' }}
            >
              {step.text}
            </p>
          )}

          {/* Question */}
          {step.kind === 'question' && (
            <div>
              {showFamilleLabel && (
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-6"
                  style={{ color: GOLD }}
                >
                  {step.famille}
                </p>
              )}

              {/* Texte de la question */}
              <p
                className="text-base sm:text-lg leading-relaxed font-medium mb-10"
                style={{ color: '#f3f4f6', overflowWrap: 'anywhere' }}
              >
                {step.text}
              </p>

              {/* Champ optionnel */}
              {!fieldOpen ? (
                <button
                  onClick={handleOpenField}
                  className="text-sm transition-opacity"
                  style={{
                    color: hasResponse ? GOLD : '#4b5563',
                    opacity: hasResponse ? 0.75 : 0.55,
                  }}
                >
                  {hasResponse ? '✓ Modifier ma réflexion' : '✎ Répondre (optionnel)'}
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

          {/* Écran final */}
          {step.kind === 'done' && (
            <div className="text-center pt-8">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-8"
                style={{ color: GOLD }}
              >
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

      {/* Bouton Continuer — toujours visible et prioritaire */}
      <div
        className="flex-none px-4 sm:px-6 pt-3"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
      >
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all active:scale-95"
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
