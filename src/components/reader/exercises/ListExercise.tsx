'use client'

import { useState } from 'react'
import { useReader } from '@/lib/reader/context'
import ExerciseShell, { SaveButton } from './ExerciseShell'
import type { ListExercise as T } from '@/lib/content/types'

// content.js list exercises use fields/fields_labels/placeholders (not min_items/placeholder)
interface ListExerciseData extends T {
  fields?: number
  fields_labels?: string[]
  placeholders?: string[]
}

export default function ListExercise({ exercise }: { exercise: T }) {
  const ex = exercise as ListExerciseData
  const { responses, saveResponse } = useReader()
  const saved = responses[exercise.id] as string[] | undefined

  // Determine number of fields and their labels/placeholders
  const fieldCount = ex.fields ?? ex.min_items ?? 3
  const labels = ex.fields_labels ?? []
  const placeholders = ex.placeholders ?? []
  const fallbackPlaceholder = ex.placeholder ?? 'Écris ici...'

  const [items, setItems] = useState<string[]>(
    saved ?? Array(fieldCount).fill('')
  )
  const [editing, setEditing] = useState(!saved)

  function updateItem(index: number, value: string) {
    const next = [...items]
    next[index] = value
    setItems(next)
  }

  function handleSave() {
    const filled = items.map(i => i.trim())
    if (filled.some(i => !i)) return
    saveResponse(exercise.id, filled)
    setEditing(false)
  }

  const isSaved = !!saved && !editing
  const canSave = items.every(i => i.trim())

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
      {isSaved ? (
        <ul className="space-y-2">
          {saved!.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              {labels[i] && (
                <span className="text-xs font-medium shrink-0 mt-0.5" style={{ color: '#c9a84c' }}>
                  {labels[i]}
                </span>
              )}
              <span className="text-sm" style={{ color: '#d1d5db' }}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i}>
              {labels[i] && (
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: '#9ca3af' }}
                >
                  {labels[i]}
                </label>
              )}
              <input
                type="text"
                value={item}
                onChange={e => updateItem(i, e.target.value)}
                placeholder={placeholders[i] ?? fallbackPlaceholder}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: '#0a0d1a',
                  color: '#f9fafb',
                  border: '1px solid #374151',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </ExerciseShell>
  )
}
