'use client'

import { useState } from 'react'
import { useReader } from '@/lib/reader/context'
import ExerciseShell, { SaveButton } from './ExerciseShell'
import type { CommitmentExercise as T } from '@/lib/content/types'

export default function CommitmentExercise({ exercise }: { exercise: T }) {
  const { responses, saveResponse } = useReader()
  const saved = responses[exercise.id] as boolean | undefined
  const [checked, setChecked] = useState(saved ?? false)
  const [editing, setEditing] = useState(!saved)

  function handleSave() {
    if (!checked) return
    saveResponse(exercise.id, true)
    setEditing(false)
  }

  const isSaved = saved === true && !editing

  return (
    <ExerciseShell
      question={exercise.question}
      aide={exercise.aide}
      obligatoire={exercise.obligatoire}
      saved={isSaved}
      successMessage={exercise.success_message}
      onEdit={() => setEditing(true)}
      saveButton={<SaveButton onClick={handleSave} disabled={!checked} />}
    >
      {isSaved ? (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <span style={{ color: '#22c55e', fontSize: '1.25rem' }}>✓</span>
          <span className="text-sm" style={{ color: '#86efac' }}>
            {exercise.confirmation_text ?? exercise.label}
          </span>
        </div>
      ) : (
        <label
          className="flex items-start gap-4 px-4 py-4 rounded-lg cursor-pointer transition-all"
          style={{
            backgroundColor: checked ? 'rgba(201,168,76,0.08)' : '#0a0d1a',
            border: `1.5px solid ${checked ? '#c9a84c' : '#374151'}`,
          }}
        >
          <div
            className="mt-0.5 w-5 h-5 rounded shrink-0 flex items-center justify-center"
            style={{
              border: `2px solid ${checked ? '#c9a84c' : '#4b5563'}`,
              backgroundColor: checked ? '#c9a84c' : 'transparent',
            }}
          >
            {checked && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#0a0d1a" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <span className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
            {exercise.label}
          </span>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="sr-only"
          />
        </label>
      )}
    </ExerciseShell>
  )
}
