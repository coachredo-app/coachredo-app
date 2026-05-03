'use client'

import { useState } from 'react'
import { useReader } from '@/lib/reader/context'
import ExerciseShell, { SaveButton } from './ExerciseShell'
import type { SelectionExercise as T } from '@/lib/content/types'

interface SavedValue {
  selected: string[]
  additional?: string
}

export default function SelectionExercise({ exercise }: { exercise: T }) {
  const { responses, saveResponse } = useReader()
  const saved = responses[exercise.id] as SavedValue | undefined
  const [selected, setSelected] = useState<string[]>(saved?.selected ?? [])
  const [additional, setAdditional] = useState(saved?.additional ?? '')
  const [editing, setEditing] = useState(!saved)

  // Resolve options: static list OR from source exercise (list response)
  const sourceResponse = exercise.source
    ? (responses[exercise.source] as string[] | undefined)
    : undefined

  const options: string[] =
    exercise.options ?? sourceResponse ?? []

  const maxSel: number = (exercise as T & { max_selection?: number }).max_selection ?? 1
  const isMulti = maxSel > 1

  function toggle(option: string) {
    if (isMulti) {
      if (selected.includes(option)) {
        setSelected(selected.filter(s => s !== option))
      } else if (selected.length < maxSel) {
        setSelected([...selected, option])
      }
    } else {
      setSelected([option])
    }
  }

  function handleSave() {
    if (!selected.length) return
    const value: SavedValue = { selected }
    if (exercise.additional_input) value.additional = additional.trim()
    saveResponse(exercise.id, value)
    setEditing(false)
  }

  const isSaved = !!saved && !editing
  const canSave = selected.length > 0

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
      {options.length === 0 && !isSaved && (
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Complète l'exercice précédent pour voir les options.
        </p>
      )}

      {isSaved ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {saved!.selected.map((opt, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'rgba(201,168,76,0.15)', color: '#c9a84c' }}
              >
                {opt}
              </span>
            ))}
          </div>
          {saved!.additional && (
            <p className="text-sm" style={{ color: '#d1d5db' }}>
              {saved!.additional}
            </p>
          )}
        </div>
      ) : (
        <div>
          {isMulti && (
            <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
              Sélectionne jusqu'à {maxSel} option{maxSel > 1 ? 's' : ''}
              {selected.length > 0 && ` (${selected.length}/${maxSel})`}
            </p>
          )}
          <div className="space-y-2">
            {options.map((option, i) => {
              const isSelected = selected.includes(option)
              const isDisabled = isMulti && !isSelected && selected.length >= maxSel
              return (
                <button
                  key={i}
                  onClick={() => !isDisabled && toggle(option)}
                  className="w-full text-left px-4 py-3 rounded-lg text-sm transition-all"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(201,168,76,0.15)'
                      : '#0a0d1a',
                    border: `1.5px solid ${isSelected ? '#c9a84c' : '#374151'}`,
                    color: isSelected ? '#e5e7eb' : isDisabled ? '#4b5563' : '#d1d5db',
                    cursor: isDisabled ? 'default' : 'pointer',
                  }}
                >
                  <span
                    className="mr-2 font-bold"
                    style={{ color: isSelected ? '#c9a84c' : '#4b5563' }}
                  >
                    {isSelected ? '●' : '○'}
                  </span>
                  {option}
                </button>
              )
            })}
          </div>

          {exercise.additional_input && selected.length > 0 && (
            <div className="mt-3">
              <input
                type="text"
                value={additional}
                onChange={e => setAdditional(e.target.value)}
                placeholder={
                  (exercise as T & { additional_placeholder?: string }).additional_placeholder ??
                  'Précise si nécessaire...'
                }
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: '#0a0d1a',
                  color: '#f9fafb',
                  border: '1px solid #374151',
                }}
              />
            </div>
          )}
        </div>
      )}
    </ExerciseShell>
  )
}
