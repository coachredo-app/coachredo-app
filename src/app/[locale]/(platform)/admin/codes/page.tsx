import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { CopyCodeButton } from './CopyCodeButton'
import { cn } from '@/lib/utils'

interface AdminCodesPageProps {
  params: Promise<{ locale: string }>
}

export default async function AdminCodesPage({ params }: AdminCodesPageProps) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect(`/${locale}/dashboard`)
  }

  const service = createServiceClient()

  const { data: available } = await service
    .from('access_codes')
    .select('id, code, created_at')
    .is('used_by', null)
    .eq('access_type', 'book')
    .order('created_at', { ascending: true })

  const { data: used } = await service
    .from('access_codes')
    .select('code, used_at, used_by')
    .not('used_by', 'is', null)
    .eq('access_type', 'book')
    .order('used_at', { ascending: false })
    .limit(10)

  const nextCode = available?.[0]?.code ?? null
  const availableCount = available?.length ?? 0
  const usedCount = used?.length ?? 0

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-cr-text">Codes d&apos;accès</h1>
        <p className="text-cr-text-secondary mt-1 text-sm">
          Plan B Rentable — gestion des codes d&apos;activation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-surface rounded-xl border border-cr-border p-5">
          <p className="text-3xl font-bold text-cr-accent">{availableCount}</p>
          <p className="text-cr-text-secondary text-sm mt-1">codes disponibles</p>
        </div>
        <div className="bg-surface rounded-xl border border-cr-border p-5">
          <p className="text-3xl font-bold text-cr-text">{usedCount}</p>
          <p className="text-cr-text-secondary text-sm mt-1">codes utilisés</p>
        </div>
      </div>

      {/* Prochain code */}
      <div className="bg-surface rounded-xl border border-cr-border shadow-md p-6 mb-8">
        <p className="text-sm font-medium text-cr-text-secondary mb-3">
          Prochain code à envoyer au client :
        </p>
        {nextCode ? (
          <div className="flex items-center gap-4 flex-wrap">
            <code className="text-2xl font-mono font-bold text-cr-text tracking-widest bg-cr-accent-subtle px-4 py-2 rounded-lg">
              {nextCode}
            </code>
            <CopyCodeButton code={nextCode} />
          </div>
        ) : (
          <p className="text-error font-medium">
            Stock épuisé — générer de nouveaux codes dans Supabase.
          </p>
        )}
      </div>

      {/* Procédure après vente */}
      <div className="bg-cr-accent-subtle border border-cr-border rounded-xl p-5 mb-8">
        <h2 className="font-semibold text-cr-text mb-3">Procédure après chaque vente Chariow</h2>
        <ol className="space-y-1.5 text-sm text-cr-text-secondary list-decimal list-inside">
          <li>Recevoir la notification de paiement Chariow</li>
          <li>Copier le prochain code disponible ci-dessus</li>
          <li>Envoyer le code au client par email ou WhatsApp</li>
          <li>Le code est marqué utilisé automatiquement quand le client l&apos;active</li>
        </ol>
      </div>

      {/* Tous les codes disponibles */}
      {available && available.length > 0 && (
        <div className="bg-surface rounded-xl border border-cr-border overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-cr-border">
            <h2 className="font-semibold text-cr-text">Codes disponibles ({availableCount})</h2>
          </div>
          <div className="divide-y divide-cr-border max-h-64 overflow-y-auto">
            {available.map((row, i) => (
              <div
                key={row.id}
                className={cn(
                  'flex items-center justify-between px-5 py-3',
                  i === 0 && 'bg-cr-accent-subtle'
                )}
              >
                <code className="font-mono text-sm text-cr-text tracking-wider">
                  {row.code}
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
      {used && used.length > 0 && (
        <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
          <div className="px-5 py-4 border-b border-cr-border">
            <h2 className="font-semibold text-cr-text">Derniers codes utilisés</h2>
          </div>
          <div className="divide-y divide-cr-border">
            {used.map((row) => (
              <div key={row.code} className="flex items-center justify-between px-5 py-3">
                <code className="font-mono text-sm text-cr-text-secondary tracking-wider line-through">
                  {row.code}
                </code>
                <span className="text-xs text-cr-text-muted">
                  {row.used_at
                    ? new Date(row.used_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
