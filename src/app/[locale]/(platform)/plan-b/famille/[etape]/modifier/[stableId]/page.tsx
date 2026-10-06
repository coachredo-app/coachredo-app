// ============================================================
// Modification ciblée d'une réponse — T7.8E
// ============================================================
// Remplace l'ancien point d'entrée "toujours la première question de
// la famille" (T7.8B, famille/[etape]/modifier/page.tsx, supprimé) :
// l'entrée est désormais le stableId explicitement choisi par
// l'utilisateur sur la page famille (/plan-b/famille/[etape]). Le
// stableId de l'URL n'accorde AUCUN droit (GO QG T7.8E §6/§7) — toute
// permission (étape, dossier, consommation, famille terminée/
// modifiable, appartenance de la question à cette famille,
// applicabilité actuelle) est redérivée ici, côté serveur, à chaque
// accès — jamais une confiance héritée de l'URL ou du hub. Les gardes
// d'écriture D-037 dans soumettreReponse (actions.ts, inchangé)
// restent la frontière de sécurité réelle ; cette garde n'est qu'une
// garde d'affichage.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOuCreerDossierCourant } from '@/lib/mpd/server/dossier'
import { MPD_CANON_V1, MPD_CANON_PAR_ID, type Etape } from '@/lib/mpd/canon'
import { getApplicableQuestions } from '@/lib/mpd/engine/applicabilite'
import { getFamilyStates } from '@/lib/mpd/engine/progression'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'
import { FamilyRevisionRenderer } from '../FamilyRevisionRenderer'

interface ModifierQuestionPageProps {
  params: Promise<{ locale: string; etape: string; stableId: string }>
}

export default async function ModifierQuestionPage({ params }: ModifierQuestionPageProps) {
  const { locale, etape: etapeParam, stableId } = await params
  const etapeNombre = Number(etapeParam)

  // Garde paramètre étape (T7.8E §7) : etape invalide → hub direct,
  // aucune famille de repli possible.
  if (!Number.isInteger(etapeNombre) || etapeNombre < 1 || etapeNombre > 7) redirect(`/${locale}/plan-b`)
  const etape = etapeNombre as Etape

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const dossier = await getOuCreerDossierCourant(supabase, user.id)
  if ('error' in dossier) redirect(`/${locale}/plan-b`)

  // Garde consommation (T7.8E §17) : aucune modification possible dès
  // qu'un état logique existe — repli sur la consultation, jamais un
  // formulaire éditable.
  const { data: etatLogique } = await supabase
    .from('mpd_etats_logiques')
    .select('id')
    .eq('dossier_id', dossier.dossierId)
    .limit(1)
    .maybeSingle()
  if (etatLogique) redirect(`/${locale}/plan-b/famille/${etape}`)

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

  // Garde famille (T7.8E §6/§7) : exclusivement TERMINEE + modifiable.
  // TERMINEE-mais-verrouillée replie sur la consultation (étape valide
  // et consultable) ; pas-encore-TERMINEE replie sur le hub.
  const etatFamille = getFamilyStates(MPD_CANON_V1, reponses).find(f => f.etape === etape)
  if (!etatFamille) redirect(`/${locale}/plan-b`)
  if (etatFamille.statut !== 'TERMINEE' || !etatFamille.modifiable) {
    redirect(etatFamille.statut === 'TERMINEE' ? `/${locale}/plan-b/famille/${etape}` : `/${locale}/plan-b`)
  }

  // Garde question (T7.8E §6/§12) : le stableId de l'URL n'accorde
  // AUCUN droit — existence, appartenance à CETTE famille, et
  // applicabilité actuelle sont revérifiées depuis le canon + l'état
  // serveur frais, jamais depuis l'URL seule.
  const question = MPD_CANON_PAR_ID.get(stableId)
  const estApplicableIci =
    question !== undefined &&
    question.etape === etape &&
    getApplicableQuestions(MPD_CANON_V1, reponses).some(q => q.stableId === stableId)
  if (!question || !estApplicableIci) redirect(`/${locale}/plan-b/famille/${etape}`)

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-bold text-cr-text">Mon Point de Départ</h1>
      <FamilyRevisionRenderer
        locale={locale}
        dossierId={dossier.dossierId}
        revision={dossier.revision}
        etape={etape}
        question={question}
        reponseExistante={reponses.get(question.stableId) ?? null}
      />
    </div>
  )
}
