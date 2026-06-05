import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { CopyCodeButton } from './codes/CopyCodeButton'
import { DeleteUserButton } from './DeleteUserButton'
import { BilanUserCard } from './BilanUserCard'
import { cn } from '@/lib/utils'

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

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect(`/${locale}/dashboard`)
  }

  const service = createServiceClient()

  const [usersResult, codesResult, accessResult, bilanResult, profilesResult] = await Promise.all([
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
      .select('user_id, question_id, famille, response, updated_at')
      .order('updated_at', { ascending: true }),
    service
      .from('profiles')
      .select('id, bilan_completed_at'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUsers: any[] = (usersResult.data as any)?.users ?? []
  const codes = codesResult.data ?? []
  const accessRows = accessResult.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bilanRows: any[] = bilanResult.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles: any[] = profilesResult.data ?? []

  const accessByUser = Object.fromEntries(accessRows.map(r => [r.user_id, r]))
  const codeByUser = Object.fromEntries(
    codes.filter(c => c.used_by).map(c => [c.used_by, c])
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bilanByUser = bilanRows.reduce<Record<string, any[]>>((acc, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = []
    acc[r.user_id].push(r)
    return acc
  }, {})

  const completedAtByUser = Object.fromEntries(
    profiles.filter(p => p.bilan_completed_at).map(p => [p.id, p.bilan_completed_at])
  )

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
                    <td className="px-5 py-3 text-cr-text font-medium">{u.email}</td>
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
                        const count = bilanByUser[u.id]?.length ?? 0
                        const done = !!completedAtByUser[u.id]
                        if (count === 0) return <span className="text-cr-text-muted">—</span>
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

      {/* Bilans de Clarté */}
      {Object.keys(bilanByUser).length > 0 && (
        <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
          <div className="px-5 py-4 border-b border-cr-border">
            <h2 className="font-semibold text-cr-text">
              Bilans de Clarté ({Object.keys(bilanByUser).length})
            </h2>
            <p className="text-xs text-cr-text-muted mt-0.5">Réponses des utilisateurs — cliquer pour développer</p>
          </div>
          <div className="p-4 space-y-3">
            {userRows
              .filter(u => bilanByUser[u.id])
              .map(u => (
                <BilanUserCard
                  key={u.id}
                  email={u.email}
                  responses={bilanByUser[u.id]}
                  completedAt={completedAtByUser[u.id] ?? null}
                />
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
