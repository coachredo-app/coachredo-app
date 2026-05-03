'use client'

import { useState } from 'react'

interface ExerciseShellProps {
  question: string
  aide: string
  obligatoire: boolean
  saved: boolean
  successMessage: string
  onEdit?: () => void
  children: React.ReactNode
  saveButton?: React.ReactNode
}

export default function ExerciseShell({
  question,
  aide,
  obligatoire,
  saved,
  successMessage,
  onEdit,
  children,
  saveButton,
}: ExerciseShellProps) {
  const [showAide, setShowAide] = useState(false)

  return (
    <div
      className="rounded-xl overflow-hidden mb-6"
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderTop: `3px solid ${saved ? '#22c55e' : '#c9a84c'}`,
      }}
    >
      <div className="px-4 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-start gap-2 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {obligatoire && !saved && (
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#c9a84c' }}
                >
                  Obligatoire
                </span>
              )}
              {saved && (
                <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>
                  ✓ Validé
                </span>
              )}
            </div>
            <p className="text-base font-semibold leading-snug" style={{ color: '#f9fafb' }}>
              {question}
            </p>
          </div>
        </div>

        {/* Content */}
        {children}

        {/* Aide */}
        {!saved && (
          <div className="mt-3">
            {showAide ? (
              <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                💡 {aide}
              </p>
            ) : (
              <button
                onClick={() => setShowAide(true)}
                className="text-xs underline underline-offset-2"
                style={{ color: '#6b7280' }}
              >
                ? Aide
              </button>
            )}
          </div>
        )}

        {/* Save button */}
        {!saved && saveButton && <div className="mt-4">{saveButton}</div>}

        {/* Success + edit */}
        {saved && (
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm" style={{ color: '#4ade80' }}>
              {successMessage}
            </p>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-xs underline shrink-0"
                style={{ color: '#6b7280' }}
              >
                Modifier
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function SaveButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-lg font-semibold text-sm transition-all active:scale-95"
      style={{
        backgroundColor: disabled ? '#1f2937' : '#c9a84c',
        color: disabled ? '#4b5563' : '#0a0d1a',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      Valider
    </button>
  )
}
