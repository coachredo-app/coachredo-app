'use client'

import { useState } from 'react'
import { deleteUser } from './actions'

interface Props {
  userId: string
  email: string
  locale: string
}

export function DeleteUserButton({ userId, email, locale }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteUser(userId, locale)
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-cr-text-muted hidden sm:inline truncate max-w-[120px]">
          {email}
        </span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? '...' : '✓ Confirmer'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-cr-text-muted hover:text-cr-text whitespace-nowrap"
        >
          Annuler
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-cr-text-muted hover:text-red-500 transition-colors"
    >
      Supprimer
    </button>
  )
}
