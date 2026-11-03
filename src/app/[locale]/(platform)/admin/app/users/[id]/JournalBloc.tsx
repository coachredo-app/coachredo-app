'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addJournalEntry, deleteJournalEntry } from './actions'

export interface JournalEntry {
  id: string
  type: string
  contenu: string
  resultat: string | null
  created_at: string
}

const TYPES = ['WhatsApp', 'Appel', 'Note', 'Mission', 'Relance']

const TYPE_STYLE: Record<string, string> = {
  WhatsApp: 'bg-green-50 text-green-700 border-green-200',
  Appel:    'bg-blue-50 text-blue-700 border-blue-200',
  Note:     'bg-gray-50 text-gray-500 border-gray-200',
  Mission:  'bg-amber-50 text-amber-700 border-amber-200',
  Relance:  'bg-purple-50 text-purple-700 border-purple-200',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  userId: string
  locale: string
  entries: JournalEntry[]
}

const DEFAULT_FORM = { type: 'WhatsApp', contenu: '', resultat: '' }

export function JournalBloc({ userId, locale, entries }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return
    setDeletingId(id)
    try {
      await deleteJournalEntry(id, userId, locale)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSubmit() {
    if (!form.contenu.trim()) return
    setLoading(true)
    setError(null)
    try {
      await addJournalEntry(userId, locale, form)
      setForm(DEFAULT_FORM)
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
      <div className="px-5 py-4 border-b border-cr-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-cr-text">Journal de suivi</h2>
          <p className="text-xs text-cr-text-muted mt-0.5">Historique des contacts et actions</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs font-medium text-cr-accent hover:opacity-80 transition-opacity"
        >
          {open ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {/* Formulaire */}
      {open && (
        <div className="px-5 py-4 border-b border-cr-border bg-background space-y-3">
          <div>
            <label className="text-xs text-cr-text-muted mb-1 block">Type</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent"
            >
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-cr-text-muted mb-1 block">Contenu</label>
            <textarea
              value={form.contenu}
              onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
              placeholder="Ce qui a été dit, envoyé ou décidé"
              rows={3}
              className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-cr-text-muted mb-1 block">Résultat / réponse (optionnel)</label>
            <textarea
              value={form.resultat}
              onChange={e => setForm(f => ({ ...f, resultat: e.target.value }))}
              placeholder="Réaction de l'utilisateur, suite prévue"
              rows={2}
              className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent resize-none"
            />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.contenu.trim()}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-cr-accent text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* Liste */}
      {entries.length === 0 && !open ? (
        <p className="px-5 py-5 text-sm text-cr-text-muted italic">Aucune entrée dans le journal.</p>
      ) : (
        <div className="divide-y divide-cr-border">
          {entries.map(e => (
            <div key={e.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded ${TYPE_STYLE[e.type] ?? TYPE_STYLE.Note}`}>
                    {e.type}
                  </span>
                  <span className="text-xs text-cr-text-muted whitespace-nowrap">{fmtDate(e.created_at)}</span>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  disabled={deletingId === e.id}
                  className="text-xs text-cr-text-muted hover:text-error transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-cr-text leading-relaxed whitespace-pre-wrap">{e.contenu}</p>
              {e.resultat && (
                <div className="mt-2 pl-3 border-l-2 border-cr-border">
                  <p className="text-xs text-cr-text-secondary leading-relaxed">{e.resultat}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
