'use client'

import { useState } from 'react'
import { useReader } from '@/lib/reader/context'
import ExerciseShell, { SaveButton } from './ExerciseShell'
import type { TextGroupExercise as T } from '@/lib/content/types'

export default function TextGroupExercise({ exercise }: { exercise: T }) {
  const { responses, saveResponse } = useReader()
  const raw = responses[exercise.id]
  const saved = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, string>)
    : undefined
  const [values, setValues] = useState<Record<string, string>>(saved ?? {})
  const [editing, setEditing] = useState(!saved)

  function update(fieldId: string, value: string) {
    setValues(prev => ({ ...prev, [fieldId]: value }))
  }

  function handleSave() {
    const result: Record<string, string> = {}
    for (const field of exercise.fields) {
      const val = (values[field.id] ?? '').trim()
      if (!val) return
      result[field.id] = val
    }
    saveResponse(exercise.id, result)
    setEditing(false)
  }

  const isSaved = !!saved && !editing
  const canSave = exercise.fields.every(f => (values[f.id] ?? '').trim())

  return (
    <ExerciseShell
      question={exercise.question}
      aide={exercise.aide}
      obligatoire={exercise.obligatoire}
      saved={isSaved}
      successMessage={exercise.success_message}
      onEdit={() => setEditing(true)}
      saveButton={<SaveButton onClick={handleSave} disabled={!canSave} />}
    >
      <div className="space-y-3">
        {exercise.fields.map(field => (
          <div key={field.id}>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: '#9ca3af' }}
            >
              {field.label}
            </label>
            {isSaved ? (
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
                style={{ backgroundColor: '#0a0d1a', color: '#d1d5db' }}
              >
                {saved![field.id] || '—'}
              </div>
            ) : (
              <input
                type="text"
                value={values[field.id] ?? ''}
                onChange={e => update(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: '#0a0d1a',
                  color: '#f9fafb',
                  border: '1px solid #374151',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </ExerciseShell>
  )
}
