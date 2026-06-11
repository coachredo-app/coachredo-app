import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BILAN_QUESTIONS, FAMILLE_ORDER, FAMILLE_TOTAL } from '@/lib/bilan-questions'
import { CHAPTERS, REQUIRED_TOTAL, getReadingProgress } from '@/lib/reading-chapters'
import { DiagnosticBloc } from './DiagnosticBloc'
import { SignauxBloc } from './SignauxBloc'
import { JournalBloc } from './JournalBloc'
import { MissionsBloc } from './MissionsBloc'
import type { Diagnostic } from './DiagnosticBloc'
import type { Signal } from './SignauxBloc'
import type { JournalEntry } from './JournalBloc'
import type { Mission } from './MissionsBloc'

interface FichePageProps {
  params: Promise<{ locale: string; id: string }>
}

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function FicheUtilisateurPage({ params }: FichePageProps) {
  const { locale, id } = await params

  const supabase = await createClient()
  const { data: { user: admin } } = await supabase.auth.getUser()

  if (!admin || admin.email !== process.env.ADMIN_EMAIL) {
    redirect(`/${locale}/dashboard`)
  }

  const service = createServiceClient()

  const [
    userResult,
    accessResult,
    codeResult,
    bilanResult,
    profileResult,
    signauxResult,
    journalResult,
    missionsResult,
    readingResult,
    diagnosticResult,
  ] = await Promise.all([
    service.auth.admin.getUserById(id),
    service.from('book_access').select('has_access, access_granted_at').eq('user_id', id).maybeSingle(),
    service.from('access_codes').select('code, used_at').eq('used_by', id).maybeSingle(),
    service.from('bilan_responses').select('question_id, famille, response, updated_at').eq('user_id', id).order('updated_at', { ascending: true }),
    service.from('profiles').select('bilan_completed_at, nom, telephone, livre_completed, livre_completed_at').eq('id', id).maybeSingle(),
    service.from('user_signals').select('id, categorie, signal, intensite, coach_note, created_at').eq('user_id', id).order('created_at', { ascending: false }),
    service.from('coach_journal').select('id, type, contenu, resultat, created_at').eq('user_id', id).order('created_at', { ascending: false }),
    service.from('user_missions').select('id, mission, statut, coach_note, assigned_at, completed_at').eq('user_id', id).order('assigned_at', { ascending: false }),
    service.from('reading_progress').select('chapter_id, chapter_order, completed_at').eq('user_id', id),
    service.from('diagnostics').select('*').eq('user_id', id).maybeSingle(),
  ])

  const targetUser = userResult.data?.user
  if (!targetUser) notFound()

  const access = accessResult.data
  const code = codeResult.data
  const bilanRows = bilanResult.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileResult.data as any
  const signaux: Signal[] = (signauxResult.data ?? []) as Signal[]
  const journal: JournalEntry[] = (journalResult.data ?? []) as JournalEntry[]
  const missions: Mission[] = (missionsResult.data ?? []) as Mission[]
  const readingRows = readingResult.data ?? []
  const reading = getReadingProgress(readingRows)
  const diagnostic = diagnosticResult.data as Diagnostic | null

  const responseMap = Object.fromEntries(bilanRows.map(r => [r.question_id, r.response]))
  const answeredCount = bilanRows.length
  const bilanCompleted = !!profile?.bilan_completed_at
  const livreCompleted = reading.fullyDone || !!profile?.livre_completed

  const lastActivity = bilanRows.length > 0
    ? bilanRows.reduce((a, b) => a.updated_at > b.updated_at ? a : b).updated_at
    : targetUser.last_sign_in_at ?? null

  const activeMissions = missions.filter(m => m.statut === 'en_cours').length

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Retour */}
      <div>
        <Link
          href={`/${locale}/admin`}
          className="text-sm text-cr-text-secondary hover:text-cr-text transition-colors"
        >
          ← Administration
        </Link>
      </div>

      {/* Header utilisateur */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-cr-text break-all">
            {profile?.nom ?? targetUser.email}
          </h1>
          {profile?.nom && (
            <p className="text-sm text-cr-text-secondary break-all">{targetUser.email}</p>
          )}
          <p className="text-sm text-cr-text-muted mt-0.5">Inscrit le {fmt(targetUser.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {access?.has_access ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              ✓ Accès actif
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cr-accent-subtle text-cr-text-muted border border-cr-border">
              En attente
            </span>
          )}
        </div>
      </div>

      {/* Blocs Compte + Accès */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Bloc 1 — Compte */}
        <div className="bg-surface rounded-xl border border-cr-border p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-cr-accent">Compte</h2>
          <dl className="space-y-2.5">
            <Row label="Email" value={targetUser.email ?? '—'} />
            {profile?.nom && <Row label="Nom" value={profile.nom} />}
            {profile?.telephone && <Row label="Téléphone" value={profile.telephone} />}
            <Row label="Inscrit le" value={fmt(targetUser.created_at)} />
            <Row label="ID" value={<code className="text-xs font-mono text-cr-text-muted break-all">{targetUser.id}</code>} />
          </dl>
        </div>

        {/* Bloc 2 — Accès */}
        <div className="bg-surface rounded-xl border border-cr-border p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-cr-accent">Accès</h2>
          <dl className="space-y-2.5">
            <Row
              label="Code"
              value={
                code?.code
                  ? <code className="text-xs font-mono text-cr-text bg-background px-1.5 py-0.5 rounded">{code.code}</code>
                  : '—'
              }
            />
            <Row label="Programme" value="Plan B Rentable" />
            <Row label="Activé le" value={fmt(code?.used_at)} />
            <Row
              label="Statut"
              value={
                access?.has_access
                  ? <span className="text-success font-medium">Actif</span>
                  : <span className="text-cr-text-muted">En attente</span>
              }
            />
          </dl>
        </div>
      </div>

      {/* Bloc 3 — Parcours */}
      <div className="bg-surface rounded-xl border border-cr-border p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-cr-accent">Parcours</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <ParcourStep
            label="Livre"
            status={
              livreCompleted
                ? 'done'
                : reading.startedCount > 0
                ? 'partial'
                : 'empty'
            }
            detail={
              livreCompleted
                ? `${REQUIRED_TOTAL}/${REQUIRED_TOTAL} ✓`
                : reading.startedCount > 0
                ? `Ch. ${reading.completedCount}/${REQUIRED_TOTAL}`
                : undefined
            }
          />
          <ParcourStep
            label="Bilan"
            status={bilanCompleted ? 'done' : answeredCount > 0 ? 'partial' : 'empty'}
            detail={answeredCount > 0 ? `${answeredCount}/13` : undefined}
          />
          <ParcourStep
            label="Signaux"
            status={signaux.length > 0 ? 'done' : 'empty'}
            detail={signaux.length > 0 ? `${signaux.length} signal${signaux.length > 1 ? 'x' : ''}` : undefined}
          />
          <ParcourStep
            label="Missions"
            status={activeMissions > 0 ? 'partial' : missions.length > 0 ? 'done' : 'empty'}
            detail={missions.length > 0 ? `${activeMissions} en cours` : undefined}
          />
          <ParcourStep
            label="Dernière activité"
            status="info"
            detail={fmt(lastActivity)}
          />
        </div>
      </div>

      {/* Bloc 3b — Progression lecture */}
      {readingRows.length > 0 && (
        <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
          <div className="px-5 py-4 border-b border-cr-border flex items-center justify-between">
            <h2 className="font-semibold text-cr-text">Progression — Livre numérique</h2>
            <span className="text-sm tabular-nums text-cr-text-secondary">
              {reading.completedCount}/{REQUIRED_TOTAL} chapitres
            </span>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {CHAPTERS.filter(ch => ch.type === 'chapter').map(ch => {
              const row = readingRows.find(r => r.chapter_id === ch.id)
              const done = !!row?.completed_at
              const started = !!row && !done
              return (
                <div
                  key={ch.id}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    done    ? 'bg-green-50 border-green-200 text-green-700' :
                    started ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              'bg-background border-cr-border text-cr-text-muted'
                  }`}
                >
                  <span className="font-medium">{ch.label}</span>
                  {done    && <span className="ml-1 opacity-70">✓</span>}
                  {started && <span className="ml-1 opacity-70">…</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bloc 4 — Diagnostic */}
      <DiagnosticBloc userId={id} locale={locale} diagnostic={diagnostic} />

      {/* Bloc 5 — Bilan de Clarté */}
      <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
        <div className="px-5 py-4 border-b border-cr-border flex items-center justify-between">
          <h2 className="font-semibold text-cr-text">Bilan de Clarté</h2>
          <div className="flex items-center gap-3">
            {bilanCompleted && (
              <span className="text-xs text-success font-medium">✓ Complété le {fmt(profile?.bilan_completed_at)}</span>
            )}
            <span className="text-sm tabular-nums text-cr-text-secondary">{answeredCount}/13</span>
          </div>
        </div>

        {answeredCount === 0 ? (
          <p className="px-5 py-6 text-sm text-cr-text-muted italic">Le Bilan n&apos;a pas encore été commencé.</p>
        ) : (
          <div className="divide-y divide-cr-border">
            {FAMILLE_ORDER.map(famille => {
              const questions = BILAN_QUESTIONS.filter(q => q.famille === famille)
              const answeredInFamille = questions.filter(q => responseMap[q.id]).length
              return (
                <div key={famille} className="px-5 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent">
                      {famille}
                    </p>
                    <span className={`text-xs tabular-nums font-medium ${
                      answeredInFamille === (FAMILLE_TOTAL[famille] ?? 0)
                        ? 'text-success'
                        : answeredInFamille > 0
                        ? 'text-cr-accent'
                        : 'text-cr-text-muted'
                    }`}>
                      {answeredInFamille}/{FAMILLE_TOTAL[famille] ?? 0}
                    </span>
                  </div>
                  <div className="space-y-5">
                    {questions.map(q => (
                      <div key={q.id}>
                        <p className="text-xs text-cr-text-muted mb-1.5 leading-relaxed">{q.text}</p>
                        {responseMap[q.id] ? (
                          <p className="text-sm text-cr-text leading-relaxed whitespace-pre-wrap">
                            {responseMap[q.id]}
                          </p>
                        ) : (
                          <p className="text-sm text-cr-text-muted italic">—</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bloc 5 — Signaux */}
      <SignauxBloc userId={id} locale={locale} signals={signaux} />

      {/* Bloc 6 — Journal de suivi */}
      <JournalBloc userId={id} locale={locale} entries={journal} />

      {/* Bloc 7 — Missions */}
      <MissionsBloc userId={id} locale={locale} missions={missions} />

    </div>
  )
}

/* ── Composants internes ── */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-cr-text-muted flex-shrink-0">{label}</dt>
      <dd className="text-sm text-cr-text text-right">{value}</dd>
    </div>
  )
}

function ParcourStep({
  label,
  status,
  detail,
}: {
  label: string
  status: 'done' | 'partial' | 'empty' | 'pending' | 'info'
  detail?: string
}) {
  const styles = {
    done:    'bg-green-50 border-green-200 text-green-700',
    partial: 'bg-amber-50 border-amber-200 text-amber-700',
    empty:   'bg-background border-cr-border text-cr-text-muted',
    pending: 'bg-background border-cr-border text-cr-text-muted opacity-40',
    info:    'bg-background border-cr-border text-cr-text-secondary',
  }

  const icons = { done: '✓', partial: '◐', empty: '○', pending: '—', info: '◷' }

  return (
    <div className={`rounded-lg border p-3 text-center ${styles[status]}`}>
      <p className="text-xs font-medium mb-1">{label}</p>
      <p className="text-xs tabular-nums">{detail ?? icons[status]}</p>
    </div>
  )
}
