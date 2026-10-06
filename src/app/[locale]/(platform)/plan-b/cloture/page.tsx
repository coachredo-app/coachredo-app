// ============================================================
// MPD V3 — Clôture de Mon Point de Départ — T7.11C
// ============================================================
// Autonome : revérifie elle-même auth/dossier/consommation/complétude
// à chaque chargement (refresh-safe par construction, même principe
// que /parcours et /famille/[etape]). Cette page NE CONSOMME RIEN —
// seule la Server Action déclenchée explicitement par le CTA
// (ClotureRenderer → preparerMaFeuilleDeRoute) appelle
// mpd_consommer_dossier.
//
// Cas (GO QG T7.11C §4-5) :
//   déjà consommé          → redirect /plan-b/feuille-de-route
//   non consommé, incomplet → redirect /plan-b/parcours
//   non consommé, complet   → affiche la clôture + CTA

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOuCreerDossierCourant } from '@/lib/mpd/server/dossier'
import { MPD_CANON_V1 } from '@/lib/mpd/canon'
import { getNextQuestion } from '@/lib/mpd/engine/applicabilite'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'
import { ClotureRenderer } from './ClotureRenderer'

interface CloturePageProps {
  params: Promise<{ locale: string }>
}

export default async function CloturePage({ params }: CloturePageProps) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const dossier = await getOuCreerDossierCourant(supabase, user.id)

  if ('error' in dossier) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-bold text-cr-text">Mon Point de Départ</h1>
        <p className="text-sm text-red-600">{dossier.error}</p>
      </div>
    )
  }

  const { data: etatLogique } = await supabase
    .from('mpd_etats_logiques')
    .select('id')
    .eq('dossier_id', dossier.dossierId)
    .limit(1)
    .maybeSingle()

  if (etatLogique) redirect(`/${locale}/plan-b/feuille-de-route`)

  const { data: reponsesRows } = await supabase
    .from('mpd_reponses_courantes')
    .select('question_id, statut, payload')
    .eq('dossier_id', dossier.dossierId)

  const reponses = new Map<string, ReponseCourante>(
    (reponsesRows ?? []).map(r => [
      r.question_id as string,
      { questionId: r.question_id as string, statut: r.statut as StatutReponse, payload: r.payload },
    ])
  )

  const complet = getNextQuestion(MPD_CANON_V1, reponses) === null
  if (!complet) redirect(`/${locale}/plan-b/parcours`)

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-bold text-cr-text">Mon Point de Départ est terminé.</h1>
      <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
        <p className="text-sm text-cr-text">
          Tes réponses vont maintenant servir de base pour préparer Ta Feuille de Route — la prochaine étape de ton
          Plan B.
        </p>
        <p className="text-sm text-cr-text-secondary">
          Cette étape est définitive : Mon Point de Départ restera consultable, mais ne pourra plus être modifié.
        </p>
        <ClotureRenderer locale={locale} dossierId={dossier.dossierId} revision={dossier.revision} />
        {/* Action secondaire — avant consommation, le MPD reste
            consultable et F7 reste modifiable (D-037) : l'utilisateur
            doit pouvoir vérifier son parcours avant l'action définitive. */}
        <div>
          <Link href={`/${locale}/plan-b`} className="text-sm text-cr-text-secondary hover:text-cr-text">
            ← Voir Mon Point de Départ
          </Link>
        </div>
      </div>
    </div>
  )
}
