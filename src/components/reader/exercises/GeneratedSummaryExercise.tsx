'use client'

import { useState, useMemo } from 'react'
import { useReader } from '@/lib/reader/context'
import ExerciseShell, { SaveButton } from './ExerciseShell'
import type { GeneratedSummaryExercise as T } from '@/lib/content/types'

function interpolate(
  template: string,
  variables_map: T['variables_map'],
  responses: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const mapping = variables_map[key]
    if (!mapping) return `[${key}]`
    const resp = responses[mapping.exercise]
    if (!resp) return `[${key}]`
    if (typeof resp === 'string') return resp
    if (typeof resp === 'object' && resp !== null && mapping.field in (resp as object)) {
      return String((resp as Record<string, unknown>)[mapping.field]) || `[${key}]`
    }
    return `[${key}]`
  })
}

export default function GeneratedSummaryExercise({ exercise }: { exercise: T }) {
  const { responses, saveResponse } = useReader()
  const saved = responses[exercise.id] as string | undefined

  const generated = useMemo(
    () => interpolate(exercise.template, exercise.variables_map, responses),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercise.template, exercise.variables_map, JSON.stringify(responses)]
  )

  const [value, setValue] = useState(saved ?? generated)
  const [editing, setEditing] = useState(!saved)

  // Sync generated text when dependencies change (if not already saved)
  useMemo(() => {
    if (!saved) setValue(generated)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, saved])

  function handleSave() {
    const trimmed = value.trim()
    if (!trimmed) return
    saveResponse(exercise.id, trimmed)
    setEditing(false)
  }

  const isSaved = !!saved && !editing
  const hasPlaceholders = value.includes('[')

  return (
    <ExerciseShell
      question={exercise.question}
      aide={exercise.aide}
      obligatoire={exercise.obligatoire}
      saved={isSaved}
      successMessage={exercise.success_message}
      onEdit={() => setEditing(true)}
      saveButton={
        <SaveButton onClick={handleSave} disabled={!value.trim() || hasPlaceholders} />
      }
    >
      {isSaved ? (
        <div
          className="rounded-lg px-4 py-4 text-sm leading-relaxed italic"
          style={{
            backgroundColor: 'rgba(201,168,76,0.06)',
            border: '1px solid rgba(201,168,76,0.3)',
            color: '#e5e7eb',
          }}
        >
          "{saved}"
        </div>
      ) : (
        <div>
          {hasPlaceholders && (
            <p className="text-xs mb-2" style={{ color: '#f59e0b' }}>
              ⚠ Complète les exercices précédents pour générer ta phrase.
            </p>
          )}
          {exercise.editable ? (
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              rows={3}
              className="w-full rounded-lg px-3 py-3 text-sm resize-none outline-none"
              style={{
                backgroundColor: '#0a0d1a',
                color: '#f9fafb',
                border: '1px solid #374151',
                fontStyle: 'italic',
              }}
            />
          ) : (
            <div
              className="rounded-lg px-3 py-3 text-sm italic"
              style={{ backgroundColor: '#0a0d1a', color: '#d1d5db', border: '1px solid #374151' }}
            >
              {value}
            </div>
          )}
          {exercise.result_preview && !hasPlaceholders && (
            <div
              className="mt-2 px-3 py-2 rounded text-xs"
              style={{ backgroundColor: 'rgba(201,168,76,0.06)', color: '#c9a84c' }}
            >
              Aperçu : {value}
            </div>
          )}
        </div>
      )}
    </ExerciseShell>
  )
}
