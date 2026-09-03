import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { REQUIRED_QUESTION_IDS } from '@/lib/bilan-questions'
import { CopyCodeButton } from './codes/CopyCodeButton'
import { DeleteUserButton } from './DeleteUserButton'
import { cn } from '@/lib/utils'

const RELANCE_SEUIL_JOURS = 3
const RELANCE_SEUIL_MS    = RELANCE_SEUIL_JOURS * 24 * 60 * 60 * 1000

interface AdminPageProps {
  params: Promise<{ locale: string }>
}

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

type ActionCat = 'A' | 'B' | 'C'
interface ActionItem {
  userId:    string
  email:     string
  cat:       ActionCat
  dateLabel: string
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect(`/${locale}/dashboard`)
  }

  const service = createServiceClient()

  const [usersResult, codesResult, accessResult, bilanResult, sessionsResult, missionsResult] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 1000 }),
    service
      .from('access_codes')
      .select('code, used_by, used_at, created_at')
      .eq('access_type', 'book')
      .order('created_at', { ascending: true }),
    service
      .from('book_access')
      .select('user_id, has_access, access_granted_at'),
    service
      .from('bilan_responses')
      .select('user_id, session_id, question_id')
      .order('updated_at', { ascending: true }),
    // Toutes les sessions pour déterminer la plus récente par utilisateur
    service
      .from('bilan_sessions')
      .select('id, user_id, session_num, statut')
      .order('session_num', { ascending: false }),
    // Missions actives uniquement — pour la section Action requise
    service
      .from('user_missions')
      .select('id, user_id, user_response, assigned_at, responded_at')
      .eq('statut', 'en_cours')
      .order('assigned_at', { ascending: true }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUsers: any[] = (usersResult.data as any)?.users ?? []
  const codes = codesResult.data ?? []
  const accessRows = accessResult.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bilanRows: any[] = bilanResult.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSessions: any[] = sessionsResult.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeMissionsAll: any[] = missionsResult.data ?? []

  const accessByUser = Object.fromEntries(accessRows.map(r => [r.user_id, r]))
  const codeByUser = Object.fromEntries(
    codes.filter(c => c.used_by).map(c => [c.used_by, c])
  )

  // Session la plus récente par utilisateur (sessions déjà ordonnées par session_num desc)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestSessionByUser = allSessions.reduce<Record<string, any>>((acc, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = s  // premier = le plus récent (ORDER BY session_num desc)
    return acc
  }, {})

  // Compteur Bilan par utilisateur — réponses de la session la plus récente uniquement
  const bilanCountByUser = bilanRows.reduce<Record<string, number>>((acc, r) => {
    const latest = latestSessionByUser[r.user_id]
    if (latest && r.session_id === latest.id && REQUIRED_QUESTION_IDS.has(r.question_id)) {
      acc[r.user_id] = (acc[r.user_id] ?? 0) + 1
    }
    return acc
  }, {})

  const completedByUser = Object.fromEntries(
    Object.entries(latestSessionByUser)
      .filter(([, s]) => s.statut === 'completed')
      .map(([userId]) => [userId, true])
  )

  // ── Action requise ───────────────────────────────────────────
  const emailByUser = Object.fromEntries(authUsers.map(u => [u.id as string, (u.email ?? '—') as string]))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeMissionsByUser = activeMissionsAll.reduce<Record<string, any[]>>((acc, m) => {
    if (!acc[m.user_id]) acc[m.user_id] = []
    acc[m.user_id].push(m)
    return acc
  }, {})

  const relevantUserIds = new Set([
    ...Object.keys(completedByUser),
    ...Object.keys(activeMissionsByUser),
  ])

  // eslint-disable-next-line react-hooks/purity -- Server Component: Date.now() runs once per request, no re-render
  const now = Date.now()
  const actionItems: ActionItem[] = []

  for (const userId of relevantUserIds) {
    const email    = emailByUser[userId] ?? '—'
    const active   = activeMissionsByUser[userId] ?? []
    const bilanDone = !!completedByUser[userId]

    if (active.length === 0) {
      if (bilanDone) actionItems.push({ userId, email, cat: 'A', dateLabel: '' })
      continue
    }

    // B — au moins une mission active avec réponse
    const withResponse = active.filter((m: { user_response: string | null }) => m.user_response !== null)
    if (withResponse.length > 0) {
      const displayed = [...withResponse].sort(
        (a: { responded_at: string }, b: { responded_at: string }) =>
          new Date(b.responded_at).getTime() - new Date(a.responded_at).getTime()
      )[0]
      actionItems.push({ userId, email, cat: 'B', dateLabel: fmt(displayed.responded_at) })
      continue
    }

    // C — aucune réponse, au moins une mission en retard
    const overdue = active.filter(
      (m: { user_response: string | null; assigned_at: string }) =>
        m.user_response === null && now - new Date(m.assigned_at).getTime() > RELANCE_SEUIL_MS
    )
    if (overdue.length > 0) {
      // La plus ancienne en retard (déjà triée ascending par assigned_at)
      actionItems.push({ userId, email, cat: 'C', dateLabel: fmt(overdue[0].assigned_at) })
      continue
    }
    // Sinon : attente normale, rien à signaler
  }

  // Ordre d'affichage : B (urgence max) → C → A
  const CAT_ORDER: Record<ActionCat, number> = { B: 0, C: 1, A: 2 }
  actionItems.sort((a, b) => CAT_ORDER[a.cat] - CAT_ORDER[b.cat])

  const availableCodes = codes.filter(c => !c.used_by)
  const usedCodes = codes.filter(c => c.used_by)
  const activeUsers = accessRows.filter(r => r.has_access).length
  const nextCode = availableCodes[0]?.code ?? null

  const userRows = [...authUsers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(u => ({
      id: u.id,
      email: u.email ?? '—',
      createdAt: u.created_at,
      hasAccess: accessByUser[u.id]?.has_access ?? false,
      accessGrantedAt: accessByUser[u.id]?.access_granted_at ?? null,
      code: codeByUser[u.id]?.code ?? null,
    }))

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-cr-text">Administration</h1>
        <p className="text-cr-text-secondary mt-1 text-sm">Plan B Rentable — vue globale</p>
      </div>

      {/* Action requise */}
      {actionItems.length > 0 && (
        <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
          <div className="px-5 py-4 border-b border-cr-border">
            <h2 className="font-semibold text-cr-text">Action requise</h2>
            <p className="text-xs text-cr-text-muted mt-0.5">{actionItems.length} client{actionItems.length > 1 ? 's' : ''} en attente d&apos;une action</p>
          </div>
          <div className="divide-y divide-cr-border">
            {actionItems.map(item => (
              <Link
                key={item.userId}
                href={`/${locale}/admin/users/${item.userId}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-background transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.cat === 'A' && (
                    <span className="inline-flex flex-shrink-0 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      À accompagner
                    </span>
                  )}
                  {item.cat === 'B' && (
                    <span className="inline-flex flex-shrink-0 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      Réponse reçue
                    </span>
                  )}
                  {item.cat === 'C' && (
                    <span className="inline-flex flex-shrink-0 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      À relancer
                    </span>
                  )}
                  <span className="text-sm font-medium text-cr-text truncate">{item.email}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {item.dateLabel && (
                    <span className="text-xs text-cr-text-muted whitespace-nowrap">
                      {item.cat === 'B' ? `le ${item.dateLabel}` : `depuis le ${item.dateLabel}`}
                    </span>
                  )}
                  <span className="text-cr-text-muted text-xs">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-cr-border p-5">
          <p className="text-3xl font-bold text-cr-text">{authUsers.length}</p>
          <p className="text-cr-text-secondary text-sm mt-1">inscrits</p>
        </div>
        <div className="bg-surface rounded-xl border border-cr-border p-5">
          <p className="text-3xl font-bold text-cr-accent">{activeUsers}</p>
          <p className="text-cr-text-secondary text-sm mt-1">accès actifs</p>
        </div>
        <div className="bg-surface rounded-xl border border-cr-border p-5">
          <p className="text-3xl font-bold text-success">{availableCodes.length}</p>
          <p className="text-cr-text-secondary text-sm mt-1">codes dispo</p>
        </div>
        <div className="bg-surface rounded-xl border border-cr-border p-5">
          <p className="text-3xl font-bold text-cr-text-secondary">{usedCodes.length}</p>
          <p className="text-cr-text-secondary text-sm mt-1">codes utilisés</p>
        </div>
      </div>

      {/* Prochain code à envoyer */}
      <div className="bg-surface rounded-xl border border-cr-border shadow-sm p-6">
        <p className="text-sm font-medium text-cr-text-secondary mb-3">
          Prochain code à envoyer au client
        </p>
        {nextCode ? (
          <div className="flex items-center gap-4 flex-wrap">
            <code className="text-2xl font-mono font-bold text-cr-text tracking-widest bg-cr-accent-subtle px-4 py-2 rounded-lg">
              {nextCode}
            </code>
            <CopyCodeButton code={nextCode} />
          </div>
        ) : (
          <p className="text-error font-medium text-sm">
            Stock épuisé — ajouter des codes dans Supabase SQL Editor.
          </p>
        )}
      </div>

      {/* Utilisateurs */}
      <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
        <div className="px-5 py-4 border-b border-cr-border flex items-center justify-between">
          <h2 className="font-semibold text-cr-text">
            Utilisateurs ({authUsers.length})
          </h2>
        </div>

        {userRows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-cr-text-muted">Aucun utilisateur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cr-border">
                  <th className="text-left px-5 py-3 text-cr-text-secondary font-medium">Email</th>
                  <th className="text-left px-5 py-3 text-cr-text-secondary font-medium whitespace-nowrap">Inscrit le</th>
                  <th className="text-left px-5 py-3 text-cr-text-secondary font-medium">Accès</th>
                  <th className="text-left px-5 py-3 text-cr-text-secondary font-medium">Code</th>
                  <th className="text-left px-5 py-3 text-cr-text-secondary font-medium whitespace-nowrap">Activé le</th>
                  <th className="text-left px-5 py-3 text-cr-text-secondary font-medium">Bilan</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cr-border">
                {userRows.map(u => (
                  <tr key={u.id} className="hover:bg-background transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/${locale}/admin/users/${u.id}`}
                        className="font-medium text-cr-text hover:text-cr-accent transition-colors"
                      >
                        {u.email}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-cr-text-secondary whitespace-nowrap">{fmt(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      {u.hasAccess ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          ✓ Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cr-accent-subtle text-cr-text-muted border border-cr-border">
                          En attente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {u.code ? (
                        <code className="text-xs font-mono text-cr-text-secondary bg-background px-1.5 py-0.5 rounded">
                          {u.code}
                        </code>
                      ) : (
                        <span className="text-cr-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-cr-text-secondary whitespace-nowrap">
                      {fmt(u.accessGrantedAt)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {(() => {
                        const count = bilanCountByUser[u.id] ?? 0
                        const done = !!completedByUser[u.id]
                        if (count === 0 && !done) return <span className="text-cr-text-muted">—</span>
                        return (
                          <span className={done ? 'text-success font-medium' : 'text-cr-text-secondary'}>
                            {count}/13{done ? ' ✓' : ''}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DeleteUserButton userId={u.id} email={u.email} locale={locale} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Codes disponibles */}
      {availableCodes.length > 0 && (
        <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
          <div className="px-5 py-4 border-b border-cr-border">
            <h2 className="font-semibold text-cr-text">
              Codes disponibles ({availableCodes.length})
            </h2>
          </div>
          <div className="divide-y divide-cr-border max-h-60 overflow-y-auto">
            {availableCodes.map((c, i) => (
              <div
                key={c.code}
                className={cn(
                  'flex items-center justify-between px-5 py-3',
                  i === 0 && 'bg-cr-accent-subtle'
                )}
              >
                <code className="font-mono text-sm text-cr-text tracking-wider">
                  {c.code}
                </code>
                {i === 0 && (
                  <span className="text-xs text-cr-accent font-medium">suivant</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Codes récemment utilisés */}
      {usedCodes.length > 0 && (
        <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
          <div className="px-5 py-4 border-b border-cr-border">
            <h2 className="font-semibold text-cr-text">
              Codes utilisés ({usedCodes.length})
            </h2>
          </div>
          <div className="divide-y divide-cr-border max-h-60 overflow-y-auto">
            {[...usedCodes]
              .sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime())
              .map(c => (
                <div key={c.code} className="flex items-center justify-between px-5 py-3">
                  <code className="font-mono text-sm text-cr-text-secondary tracking-wider line-through">
                    {c.code}
                  </code>
                  <span className="text-xs text-cr-text-muted whitespace-nowrap">
                    {fmt(c.used_at)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  )
}
