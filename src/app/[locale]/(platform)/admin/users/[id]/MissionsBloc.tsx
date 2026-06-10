'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addMission, updateMissionStatus, deleteMission } from './actions'

export interface Mission {
  id: string
  mission: string
  statut: string
  coach_note: string | null
  assigned_at: string
  completed_at: string | null
}

const STATUT_STYLE: Record<string, string> = {
  en_cours:   'bg-amber-50 text-amber-700 border-amber-200',
  terminée:   'bg-green-50 text-green-700 border-green-200',
  abandonnée: 'bg-gray-50 text-gray-500 border-gray-200',
}

const STATUT_LABEL: Record<string, string> = {
  en_cours:   'En cours',
  terminée:   'Terminée',
  abandonnée: 'Abandonnée',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  userId: string
  locale: string
  missions: Mission[]
}

const DEFAULT_FORM = { mission: '', coach_note: '' }

export function MissionsBloc({ userId, locale, missions }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!form.mission.trim()) return
    setLoading(true)
    setError(null)
    try {
      await addMission(userId, locale, form)
      setForm(DEFAULT_FORM)
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette mission ?')) return
    setDeletingId(id)
    try {
      await deleteMission(id, userId, locale)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleStatusChange(missionId: string, statut: 'en_cours' | 'terminée' | 'abandonnée') {
    setUpdatingId(missionId)
    try {
      await updateMissionStatus(missionId, statut, userId, locale)
      router.refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
      <div className="px-5 py-4 border-b border-cr-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-cr-text">Missions</h2>
          <p className="text-xs text-cr-text-muted mt-0.5">Actions assignées à l&apos;utilisateur</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs font-medium text-cr-accent hover:opacity-80 transition-opacity"
        >
          {open ? 'Annuler' : '+ Assigner'}
        </button>
      </div>

      {/* Formulaire */}
      {open && (
        <div className="px-5 py-4 border-b border-cr-border bg-background space-y-3">
          <div>
            <label className="text-xs text-cr-text-muted mb-1 block">Mission</label>
            <textarea
              value={form.mission}
              onChange={e => setForm(f => ({ ...f, mission: e.target.value }))}
              placeholder="Description de la mission à accomplir cette semaine"
              rows={3}
              className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-cr-text-muted mb-1 block">Note coach (optionnel)</label>
            <textarea
              value={form.coach_note}
              onChange={e => setForm(f => ({ ...f, coach_note: e.target.value }))}
              placeholder="Contexte ou intention derrière cette mission"
              rows={2}
              className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent resize-none"
            />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.mission.trim()}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-cr-accent text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? 'Enregistrement…' : 'Assigner la mission'}
          </button>
        </div>
      )}

      {/* Liste */}
      {missions.length === 0 && !open ? (
        <p className="px-5 py-5 text-sm text-cr-text-muted italic">Aucune mission assignée.</p>
      ) : (
        <div className="divide-y divide-cr-border">
          {missions.map(m => (
            <div key={m.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded flex-shrink-0 ${STATUT_STYLE[m.statut] ?? STATUT_STYLE.en_cours}`}>
                    {STATUT_LABEL[m.statut] ?? m.statut}
                  </span>
                  <span className="text-xs text-cr-text-muted whitespace-nowrap">
                    Assignée le {fmtDate(m.assigned_at)}
                    {m.completed_at && ` · Terminée le ${fmtDate(m.completed_at)}`}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={deletingId === m.id}
                  className="text-xs text-cr-text-muted hover:text-error transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-cr-text leading-relaxed whitespace-pre-wrap mb-2">{m.mission}</p>
              {m.coach_note && (
                <p className="text-xs text-cr-text-secondary italic mb-2">{m.coach_note}</p>
              )}
              {m.statut === 'en_cours' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleStatusChange(m.id, 'terminée')}
                    disabled={updatingId === m.id}
                    className="text-xs px-3 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40"
                  >
                    ✓ Terminée
                  </button>
                  <button
                    onClick={() => handleStatusChange(m.id, 'abandonnée')}
                    disabled={updatingId === m.id}
                    className="text-xs px-3 py-1 rounded border border-cr-border text-cr-text-muted hover:bg-background transition-colors disabled:opacity-40"
                  >
                    Abandonner
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
