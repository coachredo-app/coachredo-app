'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertDiagnostic } from './actions'

export interface Diagnostic {
  user_id: string
  diagnostic_status: string
  force_principale: string | null
  frein_principal: string | null
  hypothese_plan_b: string | null
  signal_prioritaire: string | null
  niveau_clarte: number | null
  niveau_mouvement: number | null
  synthese_coach: string | null
  message_utilisateur: string | null
  updated_at: string
}

const STATUS_STYLE: Record<string, string> = {
  brouillon:            'bg-gray-50 text-gray-500 border-gray-200',
  en_cours:             'bg-amber-50 text-amber-700 border-amber-200',
  validé:               'bg-green-50 text-green-700 border-green-200',
  révision_nécessaire:  'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABEL: Record<string, string> = {
  brouillon:            'Brouillon',
  en_cours:             'En cours',
  validé:               'Validé',
  révision_nécessaire:  'Révision nécessaire',
}

const STATUTS = ['brouillon', 'en_cours', 'validé', 'révision_nécessaire']

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function LevelDisplay({ value }: { value: number | null }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <div
          key={n}
          className={`w-5 h-5 rounded-full border ${
            value && n <= value
              ? 'bg-cr-accent border-cr-accent'
              : 'bg-background border-cr-border'
          }`}
        />
      ))}
      {value && <span className="text-xs text-cr-text-muted ml-1">{value}/5</span>}
    </div>
  )
}

function LevelPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-7 h-7 rounded-full border text-xs font-medium transition-colors ${
            n <= value
              ? 'bg-cr-accent border-cr-accent text-white'
              : 'bg-background border-cr-border text-cr-text-muted hover:border-cr-accent'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function Field({ label, value, badge }: { label: string; value: string | null; badge?: React.ReactNode }) {
  if (!value) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent">{label}</p>
        {badge}
      </div>
      <p className="text-sm text-cr-text leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}

interface Props {
  userId: string
  locale: string
  diagnostic: Diagnostic | null
}

export function DiagnosticBloc({ userId, locale, diagnostic }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(!diagnostic)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    diagnostic_status:   diagnostic?.diagnostic_status   ?? 'brouillon',
    force_principale:    diagnostic?.force_principale    ?? '',
    frein_principal:     diagnostic?.frein_principal     ?? '',
    hypothese_plan_b:    diagnostic?.hypothese_plan_b    ?? '',
    signal_prioritaire:  diagnostic?.signal_prioritaire  ?? '',
    niveau_clarte:       diagnostic?.niveau_clarte       ?? 3,
    niveau_mouvement:    diagnostic?.niveau_mouvement    ?? 3,
    synthese_coach:      diagnostic?.synthese_coach      ?? '',
    message_utilisateur: diagnostic?.message_utilisateur ?? '',
  })

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    try {
      await upsertDiagnostic(userId, locale, form)
      setEditing(false)
      router.refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = !diagnostic

  return (
    <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-cr-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-cr-text">Diagnostic CoachRedo</h2>
          {diagnostic && !editing && (
            <p className="text-xs text-cr-text-muted mt-0.5">Mis à jour le {fmt(diagnostic.updated_at)}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {diagnostic && !editing && (
            <span className={`text-xs font-medium border px-2.5 py-1 rounded-full ${STATUS_STYLE[diagnostic.diagnostic_status] ?? STATUS_STYLE.brouillon}`}>
              {STATUS_LABEL[diagnostic.diagnostic_status] ?? diagnostic.diagnostic_status}
            </span>
          )}
          <button
            onClick={() => { setEditing(e => !e); setError(null) }}
            className="text-xs font-medium text-cr-accent hover:opacity-80 transition-opacity"
          >
            {editing && !isEmpty ? 'Annuler' : editing ? null : '✎ Modifier'}
          </button>
        </div>
      </div>

      {/* Mode lecture */}
      {!editing && diagnostic && (
        <div className="px-5 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Force principale" value={diagnostic.force_principale} />
            <Field label="Frein principal" value={diagnostic.frein_principal} />
            <Field label="Hypothèse Plan B" value={diagnostic.hypothese_plan_b} />
            <Field label="Signal prioritaire" value={diagnostic.signal_prioritaire} />
          </div>

          <div className="grid grid-cols-2 gap-5 pt-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-2">Niveau de clarté</p>
              <LevelDisplay value={diagnostic.niveau_clarte} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-2">Niveau de mouvement</p>
              <LevelDisplay value={diagnostic.niveau_mouvement} />
            </div>
          </div>

          {diagnostic.synthese_coach && (
            <div className="pt-1 border-t border-cr-border">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent">Synthèse coach</p>
                <span className="text-xs text-cr-text-muted border border-cr-border px-1.5 py-0.5 rounded">privé</span>
              </div>
              <p className="text-sm text-cr-text leading-relaxed whitespace-pre-wrap">{diagnostic.synthese_coach}</p>
            </div>
          )}

          {diagnostic.message_utilisateur && (
            <div className="pt-1 border-t border-cr-border">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent">Message utilisateur</p>
                <span className="text-xs text-green-700 border border-green-200 bg-green-50 px-1.5 py-0.5 rounded">visible</span>
              </div>
              <p className="text-sm text-cr-text leading-relaxed whitespace-pre-wrap">{diagnostic.message_utilisateur}</p>
            </div>
          )}
        </div>
      )}

      {/* Mode vide */}
      {!editing && !diagnostic && (
        <div className="px-5 py-6 flex items-center justify-between">
          <p className="text-sm text-cr-text-muted italic">Aucun diagnostic établi.</p>
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-cr-accent text-white hover:opacity-90 transition-opacity"
          >
            + Créer le diagnostic
          </button>
        </div>
      )}

      {/* Mode édition */}
      {editing && (
        <div className="px-5 py-5 space-y-5">

          {/* Statut */}
          <div>
            <label className="text-xs text-cr-text-muted mb-2 block">Statut</label>
            <div className="flex gap-2 flex-wrap">
              {STATUTS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('diagnostic_status', s)}
                  className={`text-xs font-medium border px-2.5 py-1 rounded-full transition-colors ${
                    form.diagnostic_status === s
                      ? (STATUS_STYLE[s] ?? STATUS_STYLE.brouillon) + ' ring-1 ring-offset-1 ring-cr-accent'
                      : 'bg-background border-cr-border text-cr-text-muted hover:border-cr-accent'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* 4 champs texte courts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'force_principale',   label: 'Force principale',   placeholder: 'Ex : écoute active, résilience prouvée' },
              { key: 'frein_principal',    label: 'Frein principal',    placeholder: 'Ex : peur de l\'instabilité financière' },
              { key: 'hypothese_plan_b',   label: 'Hypothèse Plan B',   placeholder: 'Ex : activité éducative à domicile, sans local' },
              { key: 'signal_prioritaire', label: 'Signal prioritaire', placeholder: 'Ex : définir une version testable du projet' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-cr-text-muted mb-1 block">{label}</label>
                <textarea
                  value={form[key as keyof typeof form] as string}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent resize-none"
                />
              </div>
            ))}
          </div>

          {/* Niveaux */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-cr-text-muted mb-2 block">Niveau de clarté (1–5)</label>
              <LevelPicker value={form.niveau_clarte} onChange={v => set('niveau_clarte', v)} />
            </div>
            <div>
              <label className="text-xs text-cr-text-muted mb-2 block">Niveau de mouvement (1–5)</label>
              <LevelPicker value={form.niveau_mouvement} onChange={v => set('niveau_mouvement', v)} />
            </div>
          </div>

          {/* Synthèse coach */}
          <div className="border-t border-cr-border pt-4">
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs text-cr-text-muted block">Synthèse coach</label>
              <span className="text-xs text-cr-text-muted border border-cr-border px-1.5 py-0.5 rounded">privé — jamais montré à l&apos;utilisateur</span>
            </div>
            <textarea
              value={form.synthese_coach}
              onChange={e => set('synthese_coach', e.target.value)}
              placeholder="Ta lecture globale du profil : ce que tu vois, ce que tu presens, ce qui te guide"
              rows={3}
              className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent resize-none"
            />
          </div>

          {/* Message utilisateur */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs text-cr-text-muted block">Message utilisateur</label>
              <span className="text-xs text-green-700 border border-green-200 bg-green-50 px-1.5 py-0.5 rounded">visible si statut = validé</span>
            </div>
            <textarea
              value={form.message_utilisateur}
              onChange={e => set('message_utilisateur', e.target.value)}
              placeholder="Ce que tu choisis de lui partager — formulé pour elle, pas pour toi"
              rows={3}
              className="w-full text-sm rounded-lg border border-cr-border bg-surface px-3 py-2 text-cr-text focus:outline-none focus:ring-1 focus:ring-cr-accent resize-none"
            />
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-cr-accent text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer le diagnostic'}
          </button>
        </div>
      )}
    </div>
  )
}
