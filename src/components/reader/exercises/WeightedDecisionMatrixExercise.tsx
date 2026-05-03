'use client'

import { useState } from 'react'
import { useReader } from '@/lib/reader/context'
import ExerciseShell, { SaveButton } from './ExerciseShell'
import type { WeightedDecisionMatrixExercise as T } from '@/lib/content/types'

interface WDMResponse {
  alternatives: string[]
  scores: Record<string, Record<string, number>> // alt → criterion → score
  winner: string
  winnerScore: number
}

function computeWinner(
  alternatives: string[],
  scores: Record<string, Record<string, number>>,
  criteria: T['criteria']
): { winner: string; totals: Record<string, number> } {
  const totals: Record<string, number> = {}
  for (const alt of alternatives) {
    totals[alt] = criteria.reduce((sum, c) => {
      return sum + (scores[alt]?.[c.id] ?? 0) * c.weight
    }, 0)
  }
  const winner = alternatives.reduce((best, alt) =>
    totals[alt] > totals[best] ? alt : best
  , alternatives[0] ?? '')
  return { winner, totals }
}

export default function WeightedDecisionMatrixExercise({ exercise }: { exercise: T }) {
  const { responses, saveResponse } = useReader()
  const saved = responses[exercise.id] as WDMResponse | undefined

  // Get alternatives from source exercise (a selection exercise)
  const sourceResponse = responses[exercise.source] as
    | { selected: string[] }
    | string[]
    | undefined

  const alternatives: string[] = Array.isArray(sourceResponse)
    ? sourceResponse
    : sourceResponse?.selected ?? []

  const [scores, setScores] = useState<Record<string, Record<string, number>>>(
    saved?.scores ?? {}
  )
  const [editing, setEditing] = useState(!saved)

  function setScore(alt: string, criterionId: string, score: number) {
    setScores(prev => ({
      ...prev,
      [alt]: { ...(prev[alt] ?? {}), [criterionId]: score },
    }))
  }

  function allFilled(): boolean {
    return alternatives.every(alt =>
      exercise.criteria.every(c => (scores[alt]?.[c.id] ?? 0) > 0)
    )
  }

  function handleSave() {
    if (!allFilled()) return
    const { winner, totals } = computeWinner(alternatives, scores, exercise.criteria)
    const response: WDMResponse = {
      alternatives,
      scores,
      winner,
      winnerScore: totals[winner],
    }
    saveResponse(exercise.id, response)
    setEditing(false)
  }

  const isSaved = !!saved && !editing

  if (alternatives.length === 0) {
    return (
      <ExerciseShell
        question={exercise.question}
        aide={exercise.aide}
        obligatoire={exercise.obligatoire}
        saved={false}
        successMessage={exercise.success_message}
      >
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Complète l'exercice précédent pour voir les alternatives à évaluer.
        </p>
      </ExerciseShell>
    )
  }

  if (isSaved) {
    const { totals } = computeWinner(alternatives, saved!.scores, exercise.criteria)
    return (
      <ExerciseShell
        question={exercise.question}
        aide={exercise.aide}
        obligatoire={exercise.obligatoire}
        saved={true}
        successMessage={exercise.success_message}
        onEdit={() => setEditing(true)}
      >
        <div
          className="rounded-lg px-4 py-4 mb-3"
          style={{ backgroundColor: 'rgba(201,168,76,0.08)', border: '1px solid #c9a84c' }}
        >
          <p className="text-xs font-semibold uppercase mb-1" style={{ color: '#c9a84c' }}>
            Recommandé
          </p>
          <p className="text-lg font-bold" style={{ color: '#f9fafb' }}>
            {saved!.winner}
          </p>
          <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
            Score : {saved!.winnerScore} pts
          </p>
        </div>
        <div className="space-y-1">
          {alternatives.map(alt => (
            <div key={alt} className="flex justify-between text-sm px-1">
              <span style={{ color: alt === saved!.winner ? '#c9a84c' : '#6b7280' }}>
                {alt === saved!.winner ? '★ ' : '  '}{alt}
              </span>
              <span style={{ color: '#9ca3af' }}>{totals[alt]} pts</span>
            </div>
          ))}
        </div>
      </ExerciseShell>
    )
  }

  return (
    <ExerciseShell
      question={exercise.question}
      aide={exercise.aide}
      obligatoire={exercise.obligatoire}
      saved={false}
      successMessage={exercise.success_message}
      saveButton={<SaveButton onClick={handleSave} disabled={!allFilled()} />}
    >
      <div className="space-y-6">
        {alternatives.map(alt => {
          const altScores = scores[alt] ?? {}
          const total = exercise.criteria.reduce(
            (sum, c) => sum + (altScores[c.id] ?? 0) * c.weight,
            0
          )
          const maxTotal = exercise.criteria.reduce((sum, c) => sum + 5 * c.weight, 0)

          return (
            <div key={alt}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
                  {alt}
                </p>
                <span className="text-xs" style={{ color: '#6b7280' }}>
                  {total}/{maxTotal} pts
                </span>
              </div>

              <div className="space-y-3">
                {exercise.criteria.map(criterion => {
                  const currentScore = altScores[criterion.id] ?? 0
                  return (
                    <div key={criterion.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs" style={{ color: '#9ca3af' }}>
                          {criterion.label}
                          <span className="ml-1" style={{ color: '#4b5563' }}>
                            (×{criterion.weight})
                          </span>
                        </p>
                        {criterion.helper && (
                          <p className="text-xs" style={{ color: '#4b5563' }}>
                            {criterion.scale_low_label ?? '1'} → {criterion.scale_high_label ?? '5'}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            onClick={() => setScore(alt, criterion.id, n)}
                            className="flex-1 py-2 rounded text-sm font-semibold transition-all"
                            style={{
                              backgroundColor:
                                currentScore === n ? '#c9a84c' : '#0a0d1a',
                              color: currentScore === n ? '#0a0d1a' : '#6b7280',
                              border: `1px solid ${currentScore === n ? '#c9a84c' : '#374151'}`,
                            }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </ExerciseShell>
  )
}
