import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface AdminMfrPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ avant_cree_le?: string; avant_id?: string }>
}

const TAILLE_PAGE = 50
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Statut réel, jamais déduit approximativement — dérivé uniquement de
// l'existence/l'état des lignes mfr_versions/mfr_publications pour ce
// cycle, jamais d'une heuristique sur une autre colonne.
type StatutMfr = 'AUCUNE_VERSION' | 'BROUILLON' | 'VALIDE' | 'PUBLIE'

interface LigneCycle {
  cycleId: string
  userEmail: string
  creeLe: string
  statut: StatutMfr
}

const STATUT_LABEL: Record<StatutMfr, string> = {
  AUCUNE_VERSION: 'Aucune version',
  BROUILLON: 'Brouillon',
  VALIDE: 'Validé',
  PUBLIE: 'Publié',
}

const STATUT_CLASSES: Record<StatutMfr, string> = {
  AUCUNE_VERSION: 'bg-cr-accent-subtle text-cr-text-muted border-cr-border',
  BROUILLON: 'bg-amber-50 text-amber-700 border-amber-200',
  VALIDE: 'bg-blue-50 text-blue-700 border-blue-200',
  PUBLIE: 'bg-green-50 text-green-700 border-green-200',
}

export default async function AdminMfrPage({ params, searchParams }: AdminMfrPageProps) {
  const { locale } = await params
  const { avant_cree_le: avantCreeLe, avant_id: avantId } = await searchParams

  // 1. Garde admin — même mécanisme que /admin et /admin/app/users/[id].
  const supabase = await createClient()
  const { data: { user: admin } } = await supabase.auth.getUser()
  if (!admin || admin.email !== process.env.ADMIN_EMAIL) {
    redirect(`/${locale}/dashboard`)
  }

  // 2. Lectures autorisées — RLS fermée sans policy sur ces tables (016) :
  // service_role exclusivement, jamais le client authentifié.
  const service = createServiceClient()

  // Curseur stable (cree_le, id) décroissant — jamais OFFSET/LIMIT, qui
  // peut sauter ou répéter des lignes si de nouveaux cycles apparaissent
  // entre deux pages. Validé seulement si syntaxiquement plausible
  // (sinon traité comme absent, retour silencieux à la première page —
  // page interne admin, pas une surface publique).
  const curseurValide = Boolean(
    avantCreeLe && avantId && UUID_REGEX.test(avantId) && !Number.isNaN(new Date(avantCreeLe).getTime())
  )

  let requeteCycles = service
    .from('mfr_cycles')
    .select('id, user_id, cree_le')
    .order('cree_le', { ascending: false })
    .order('id', { ascending: false })
    .limit(TAILLE_PAGE + 1) // +1 pour détecter une page suivante, jamais affiché

  if (curseurValide) {
    requeteCycles = requeteCycles.or(
      `cree_le.lt.${avantCreeLe},and(cree_le.eq.${avantCreeLe},id.lt.${avantId})`
    )
  }

  const { data: cyclesPage, error: erreurCycles } = await requeteCycles

  // État erreur — jamais un statut deviné si la lecture a échoué.
  if (erreurCycles) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-cr-text">Feuilles de Route — Administration</h1>
        <p className="text-sm text-error">Erreur lors de la lecture des cycles MFR.</p>
      </div>
    )
  }

  // État liste vide (uniquement pertinent en première page — une page
  // suivante vide ne devrait jamais être atteignable via le lien généré
  // ci-dessous, mais reste gérée sans crash si elle l'était).
  if (!cyclesPage || cyclesPage.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-cr-text">Feuilles de Route — Administration</h1>
        <p className="text-sm text-cr-text-muted">Aucun cycle MFR pour l&apos;instant.</p>
      </div>
    )
  }

  const pageSuivanteExiste = cyclesPage.length > TAILLE_PAGE
  const cycles = pageSuivanteExiste ? cyclesPage.slice(0, TAILLE_PAGE) : cyclesPage
  const derniereLigne = cycles[cycles.length - 1]

  const cycleIds = cycles.map(c => c.id as string)

  const [versionsResult, publicationsResult, usersResult] = await Promise.all([
    service
      .from('mfr_versions')
      .select('cycle_id, numero_version, valide_le')
      .in('cycle_id', cycleIds),
    service
      .from('mfr_publications')
      .select('cycle_id, version_id')
      .in('cycle_id', cycleIds),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ])

  if (versionsResult.error || publicationsResult.error || usersResult.error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-cr-text">Feuilles de Route — Administration</h1>
        <p className="text-sm text-error">Erreur lors de la lecture des versions/publications MFR.</p>
      </div>
    )
  }

  // Dernière version par cycle (numero_version le plus élevé) — jamais
  // une supposition, calculée depuis les lignes réellement lues.
  const derniereVersionParCycle = new Map<string, { numeroVersion: number; valideLe: string | null }>()
  for (const v of versionsResult.data ?? []) {
    const existante = derniereVersionParCycle.get(v.cycle_id as string)
    if (!existante || (v.numero_version as number) > existante.numeroVersion) {
      derniereVersionParCycle.set(v.cycle_id as string, {
        numeroVersion: v.numero_version as number,
        valideLe: v.valide_le as string | null,
      })
    }
  }

  const cyclesPublies = new Set((publicationsResult.data ?? []).map(p => p.cycle_id as string))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailByUser = Object.fromEntries(((usersResult.data as any)?.users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email ?? '—']))

  const lignes: LigneCycle[] = cycles.map(c => {
    const derniereVersion = derniereVersionParCycle.get(c.id as string)
    let statut: StatutMfr
    if (!derniereVersion) {
      statut = 'AUCUNE_VERSION'
    } else if (cyclesPublies.has(c.id as string)) {
      statut = 'PUBLIE'
    } else if (derniereVersion.valideLe) {
      statut = 'VALIDE'
    } else {
      statut = 'BROUILLON'
    }
    return {
      cycleId: c.id as string,
      userEmail: emailByUser[c.user_id as string] ?? '—',
      creeLe: c.cree_le as string,
      statut,
    }
  })

  const hrefPageSuivante = pageSuivanteExiste
    ? `/${locale}/admin/app/mfr?avant_cree_le=${encodeURIComponent(derniereLigne.cree_le as string)}&avant_id=${encodeURIComponent(derniereLigne.id as string)}`
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-cr-text">Feuilles de Route — Administration</h1>
        <p className="text-cr-text-secondary mt-1 text-sm">
          {lignes.length} cycle{lignes.length > 1 ? 's' : ''} MFR{curseurValide ? ' (page suivante)' : ''}
        </p>
      </div>

      <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cr-border">
                <th className="text-left px-5 py-3 text-cr-text-secondary font-medium">Utilisateur</th>
                <th className="text-left px-5 py-3 text-cr-text-secondary font-medium whitespace-nowrap">Créé le</th>
                <th className="text-left px-5 py-3 text-cr-text-secondary font-medium">Statut</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cr-border">
              {lignes.map(ligne => (
                <tr key={ligne.cycleId} className="hover:bg-background transition-colors">
                  <td className="px-5 py-3 font-medium text-cr-text">{ligne.userEmail}</td>
                  <td className="px-5 py-3 text-cr-text-secondary whitespace-nowrap">{fmt(ligne.creeLe)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUT_CLASSES[ligne.statut]}`}>
                      {STATUT_LABEL[ligne.statut]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/${locale}/admin/app/mfr/${ligne.cycleId}`}
                      className="text-cr-accent hover:underline text-xs font-medium"
                    >
                      Détail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {hrefPageSuivante && (
        <div className="flex justify-end">
          <Link
            href={hrefPageSuivante}
            className="text-cr-accent hover:underline text-sm font-medium"
          >
            Page suivante →
          </Link>
        </div>
      )}
    </div>
  )
}
