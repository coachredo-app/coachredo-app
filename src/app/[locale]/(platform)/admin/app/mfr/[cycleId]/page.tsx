import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ContenuVersion } from '@/lib/mfr/contenu'
import { ContenuVersionAffichage } from '@/components/mfr/ContenuVersionAffichage'

interface AdminMfrDetailPageProps {
  params: Promise<{ locale: string; cycleId: string }>
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

type StatutMfr = 'AUCUNE_VERSION' | 'BROUILLON' | 'VALIDE' | 'PUBLIE'

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

export default async function AdminMfrDetailPage({ params }: AdminMfrDetailPageProps) {
  const { locale, cycleId } = await params

  // 1. Garde admin — identique au reste de /admin/app. Accès refusé pour
  // tout utilisateur authentifié non-admin.
  const supabase = await createClient()
  const { data: { user: admin } } = await supabase.auth.getUser()
  if (!admin || admin.email !== process.env.ADMIN_EMAIL) {
    redirect(`/${locale}/dashboard`)
  }

  // cycleId mal formé → jamais une requête DB avec une valeur non-UUID.
  if (!UUID_REGEX.test(cycleId)) {
    notFound()
  }

  const service = createServiceClient()

  const { data: cycle, error: erreurCycle } = await service
    .from('mfr_cycles')
    .select('id, user_id, cree_le')
    .eq('id', cycleId)
    .maybeSingle()

  if (erreurCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-cr-text">Feuille de Route — Détail</h1>
        <p className="text-sm text-error">Erreur lors de la lecture du cycle MFR.</p>
      </div>
    )
  }

  // Cycle introuvable (id syntaxiquement valide mais inexistant) — 404,
  // jamais confondu avec « existe mais sans version ».
  if (!cycle) {
    notFound()
  }

  const [versionResult, publicationResult, utilisateurResult] = await Promise.all([
    service
      .from('mfr_versions')
      .select('id, numero_version, contenu, cree_le, valide_le, valide_par')
      .eq('cycle_id', cycleId)
      .order('numero_version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    service
      .from('mfr_publications')
      .select('id, publie_le, publie_par')
      .eq('cycle_id', cycleId)
      .maybeSingle(),
    service.auth.admin.getUserById(cycle.user_id as string),
  ])

  if (versionResult.error || publicationResult.error || utilisateurResult.error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-cr-text">Feuille de Route — Détail</h1>
        <p className="text-sm text-error">Erreur lors de la lecture de la version/publication MFR.</p>
      </div>
    )
  }

  const version = versionResult.data
  const publication = publicationResult.data
  const userEmail = utilisateurResult.data?.user?.email ?? '—'

  let statut: StatutMfr
  if (!version) {
    statut = 'AUCUNE_VERSION'
  } else if (publication) {
    statut = 'PUBLIE'
  } else if (version.valide_le) {
    statut = 'VALIDE'
  } else {
    statut = 'BROUILLON'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-cr-text">Feuille de Route — Détail</h1>
          <p className="text-cr-text-secondary mt-1 text-sm">{userEmail}</p>
        </div>
        <Link href={`/${locale}/admin/app/mfr`} className="text-cr-accent hover:underline text-sm font-medium">
          ← Retour à la liste
        </Link>
      </div>

      <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUT_CLASSES[statut]}`}>
            {STATUT_LABEL[statut]}
          </span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-cr-text-muted">Cycle</dt>
            <dd className="text-cr-text font-mono text-xs">{cycle.id}</dd>
          </div>
          <div>
            <dt className="text-cr-text-muted">Cycle créé le</dt>
            <dd className="text-cr-text">{fmt(cycle.cree_le as string)}</dd>
          </div>
          {version && (
            <>
              <div>
                <dt className="text-cr-text-muted">Version</dt>
                <dd className="text-cr-text">n°{version.numero_version} — créée le {fmt(version.cree_le)}</dd>
              </div>
              <div>
                <dt className="text-cr-text-muted">Validation</dt>
                <dd className="text-cr-text">{version.valide_le ? `validée le ${fmt(version.valide_le)}` : 'non validée'}</dd>
              </div>
            </>
          )}
          {publication && (
            <div>
              <dt className="text-cr-text-muted">Publication</dt>
              <dd className="text-cr-text">publiée le {fmt(publication.publie_le)}</dd>
            </div>
          )}
        </dl>
      </div>

      {!version ? (
        <div className="bg-surface rounded-xl border border-cr-border p-6">
          <p className="text-sm text-cr-text-muted">Aucune version disponible pour ce cycle pour l&apos;instant.</p>
        </div>
      ) : (
        <ContenuVersionAffichage contenu={version.contenu as unknown as ContenuVersion} />
      )}
    </div>
  )
}
