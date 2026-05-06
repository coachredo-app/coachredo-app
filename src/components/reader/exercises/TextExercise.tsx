'use client'

import { useState } from 'react'
import { useReader } from '@/lib/reader/context'
import ExerciseShell, { SaveButton } from './ExerciseShell'
import type { TextExercise as T } from '@/lib/content/types'

export default function TextExercise({ exercise }: { exercise: T }) {
  const { responses, saveResponse } = useReader()
  // Normalize: old localStorage may have array/object from previous exercise types
  const raw = responses[exercise.id]
  const saved = typeof raw === 'string' ? raw : undefined
  const [value, setValue] = useState(saved ?? '')
  const [editing, setEditing] = useState(!saved)

  function handleSave() {
    const trimmed = value.trim()
    if (!trimmed) return
    saveResponse(exercise.id, trimmed)
    setEditing(false)
  }

  const isSaved = !!saved && !editing

  return (
    <ExerciseShell
      question={exercise.question}
      aide={exercise.aide}
      obligatoire={exercise.obligatoire}
      saved={isSaved}
      successMessage={exercise.success_message}
      onEdit={() => setEditing(true)}
      saveButton={
        <SaveButton onClick={handleSave} disabled={!value.trim()} />
      }
    >
      {isSaved ? (
        <div
          className="rounded-lg px-3 py-3 text-sm leading-relaxed whitespace-pre-line"
          style={{ backgroundColor: '#0a0d1a', color: '#d1d5db' }}
        >
          {saved}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={exercise.placeholder}
          rows={4}
          className="w-full rounded-lg px-3 py-3 text-sm resize-none outline-none focus:ring-1"
          style={{
            backgroundColor: '#0a0d1a',
            color: '#f9fafb',
            border: '1px solid #374151',
            caretColor: '#c9a84c',
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onFocus={(e: any) => (e.target.style.borderColor = '#c9a84c')}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onBlur={(e: any) => (e.target.style.borderColor = '#374151')}
        />
      )}
    </ExerciseShell>
  )
}
