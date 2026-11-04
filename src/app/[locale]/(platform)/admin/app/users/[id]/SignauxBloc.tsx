'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addSignal, deleteSignal } from './actions'

export interface Signal {
  id: string
  categorie: string
  signal: string
  intensite: string
  coach_note: string | null
  created_at: string
}

const CATEGORIES = ['Clarté', 'Blocage', 'Ressource', 'Observation', 'Mouvement', 'Sécurité', 'Action']
const INTENSITES = ['faible', 'moyenne', 'forte']

const INTENSITE_STYLE: Record<string, string> = {
  forte:   'bg-red-50 text-red-700 border-red-200',
  moyenne: 'bg-amber-50 text-amber-700 border-amber-200',
  faible:  'bg-gray-50 text-gray-500 border-gray-200',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  userId: string
  locale: string
  signals: Signal[]
}

const DEFAULT_FORM = { categorie: 'Blocage', signal: '', intensite: 'moyenne', coach_note: '' }

export function SignauxBloc({ userId, locale, signals }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce signal ?')) return
    setDeletingId(id)
    try {
      await deleteSignal(id, userId, locale)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSubmit() {
    if (!form.signal.trim()) return
    setLoading(true)
    setError(null)
    try {
      await addSignal(userId, locale, form)
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
          <h2 className="font-semibold text-cr-text">Signaux</h2>
          <p className="text-xs text-cr-text-muted mt-0.5">Observations coach — saisie manuelle</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-cr-text-muted mb-1 block">Catégorie</label>
              <select
                value={form.categorie}
                onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-cr-text-muted mb-1 block">Intensité</label>
              <select
                value={form.intensite}
                onChange={e => setForm(f => ({ ...f, intensite: e.target.value }))}
                className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent"
              >
                {INTENSITES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-cr-text-muted mb-1 block">Signal</label>
            <textarea
              value={form.signal}
              onChange={e => setForm(f => ({ ...f, signal: e.target.value }))}
              placeholder="Ex : peur de déstabiliser sa sécurité familiale"
              rows={2}
              className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-cr-text-muted mb-1 block">Note coach (optionnel)</label>
            <textarea
              value={form.coach_note}
              onChange={e => setForm(f => ({ ...f, coach_note: e.target.value }))}
              placeholder="Contexte ou observation complémentaire"
              rows={2}
              className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent resize-none"
            />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading || !form.signal.trim()}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-cr-accent text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {signals.length === 0 && !open ? (
        <p className="px-5 py-5 text-sm text-cr-text-muted italic">Aucun signal enregistré.</p>
      ) : (
        <div className="divide-y divide-cr-border">
          {signals.map(s => (
            <div key={s.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-cr-accent bg-cr-accent-subtle border border-cr-border px-2 py-0.5 rounded">
                    {s.categorie}
                  </span>
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded ${INTENSITE_STYLE[s.intensite] ?? INTENSITE_STYLE.faible}`}>
                    {s.intensite}
                  </span>
                  <span className="text-xs text-cr-text-muted whitespace-nowrap">{fmtDate(s.created_at)}</span>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="text-xs text-cr-text-muted hover:text-error transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-cr-text leading-relaxed">{s.signal}</p>
              {s.coach_note && (
                <p className="text-xs text-cr-text-secondary mt-1 italic">{s.coach_note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
