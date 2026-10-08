// ============================================================
// MPD V3 — Page famille : consultation + point d'entrée modification — T7.8E
// réponses précédentes ajoutées T7.12
// ============================================================
// Socle commun T7.8/T7.9 (GO QG T7.8E, option 2 verrouillée) :
// remplace l'ancien concept "entrer toujours par la première question"
// (T7.8B, famille/[etape]/modifier/page.tsx, supprimé). Consultation
// des questions ACTUELLEMENT applicables de cette famille et de leur
// réponse ACTIVE, pour TOUTE famille TERMINEE (verrouillée ou
// modifiable, consommée ou non — §15/§17). Point de départ de la
// modification ciblée (un bouton « Modifier » par réponse, jamais une
// action globale de famille) uniquement si modifiable et dossier non
// consommé. Relit l'état serveur frais à chaque accès — jamais une
// confiance héritée du hub ou de l'URL. Ce n'est volontairement PAS
// un questionnaire : lecture seule + liens, rien d'autre (§3).
//
// T7.12 : « Réponses précédentes » — projection lecture seule de
// mpd_historique_evenements (D-028 pt.4/D-037 §F, mécanisme
// DEVENUE_INACTIVE déjà verrouillé, inchangé). L'historique n'est
// JAMAIS injecté dans une ReponsesParId utilisée comme état courant —
// il ne passe jamais à getFamilyStates/getApplicableQuestions, et ne
// sert ici qu'à construire un objet d'affichage indépendant. La
// pertinence d'affichage (question actuellement non applicable) est
// recalculée à chaque rendu via estApplicable, exactement comme pour
// toute question active — aucun mapping par stableId.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOuCreerDossierCourant } from '@/lib/mpd/server/dossier'
import { MPD_CANON_V1, MPD_CANON_PAR_ID, type Etape, type QuestionCanonique } from '@/lib/mpd/canon'
import { estApplicable, getApplicableQuestions } from '@/lib/mpd/engine/applicabilite'
import { getFamilyStates } from '@/lib/mpd/engine/progression'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'
import { FAMILLES_MPD } from '../../familles'
import { ReponseLectureSeule } from './ReponseLectureSeule'

interface FamillePageProps {
  params: Promise<{ locale: string; etape: string }>
}

export default async function FamillePage({ params }: FamillePageProps) {
  const { locale, etape: etapeParam } = await params
  const etapeNombre = Number(etapeParam)

  // Garde paramètre (T7.8E §7) : etape invalide → hub, pas de crash.
  if (!Number.isInteger(etapeNombre) || etapeNombre < 1 || etapeNombre > 7) redirect(`/${locale}/plan-b`)
  const etape = etapeNombre as Etape

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const dossier = await getOuCreerDossierCourant(supabase, user.id)
  if ('error' in dossier) redirect(`/${locale}/plan-b`)

  const { data: etatLogique } = await supabase
    .from('mpd_etats_logiques')
    .select('id')
    .eq('dossier_id', dossier.dossierId)
    .limit(1)
    .maybeSingle()
  const consomme = Boolean(etatLogique)

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

  // Garde famille (T7.8E §3/§15) : la page famille n'est une
  // consultation que pour une famille déjà Terminée — avant cela, le
  // parcours reste exclusivement /plan-b/parcours (hors périmètre).
  const familyStates = getFamilyStates(MPD_CANON_V1, reponses)
  const etatFamille = familyStates.find(f => f.etape === etape)
  if (!etatFamille || etatFamille.statut !== 'TERMINEE') redirect(`/${locale}/plan-b`)

  // T7.11 correction navigation §2/§3/§4 : MPD réellement complet =
  // les 7 familles Terminées, dérivé de la MÊME lecture getFamilyStates
  // ci-dessus — aucune seconde définition de « MPD terminé », rien de
  // persisté côté client. Recalculé à chaque chargement de cette page.
  const mpdComplet = familyStates.every(f => f.statut === 'TERMINEE')

  // T7.8E §15/§17 : modifiable UNIQUEMENT si la famille l'autorise ET
  // le dossier n'est pas consommé — sinon consultation pure.
  const modifiable = etatFamille.modifiable && !consomme
  const famille = FAMILLES_MPD.find(f => f.etape === etape)!

  // T7.8E §4 : fondé sur l'état ACTIF actuel — questions actuellement
  // applicables uniquement, jamais une réponse DEVENUE_INACTIVE
  // présentée comme courante (elle a, par construction, disparu de
  // `reponses` et n'apparaît donc jamais ici).
  const questions = getApplicableQuestions(MPD_CANON_V1, reponses).filter(q => q.etape === etape)

  // T7.12 — lecture seule de l'historique de désactivation, protégée
  // par les mêmes RLS/auth déjà en place (aucune nouvelle policy).
  // Jamais passé à getFamilyStates/getApplicableQuestions.
  const { data: historiqueRows } = await supabase
    .from('mpd_historique_evenements')
    .select('question_id, statut_capture, payload_capture, cree_le')
    .eq('dossier_id', dossier.dossierId)
    .eq('type_evenement', 'DEVENUE_INACTIVE')

  // CAS C : dédupliquer par question_id, ne garder que l'événement le
  // plus récent (comparaison par date réelle, pas par tri de chaîne).
  const dernierEvenementParQuestion = new Map<
    string,
    { readonly statut: StatutReponse; readonly payload: unknown; readonly creeLe: string }
  >()
  for (const ligne of historiqueRows ?? []) {
    const questionId = ligne.question_id as string
    const existant = dernierEvenementParQuestion.get(questionId)
    if (!existant || new Date(ligne.cree_le as string) > new Date(existant.creeLe)) {
      dernierEvenementParQuestion.set(questionId, {
        statut: ligne.statut_capture as StatutReponse,
        payload: ligne.payload_capture,
        creeLe: ligne.cree_le as string,
      })
    }
  }

  // CAS B : une question réactivée depuis ne doit plus apparaître ici —
  // seule l'applicabilité ACTUELLE (recalculée, jamais déduite de la
  // seule présence d'un événement) décide de l'affichage. Générique :
  // aucun stableId Q13/Q35/Q36 codé en dur.
  const reponsesPrecedentes = [...dernierEvenementParQuestion.entries()]
    .map(([questionId, evenement]) => {
      const question = MPD_CANON_PAR_ID.get(questionId)
      if (!question || question.etape !== etape) return null
      if (estApplicable(question, reponses)) return null
      const reponse: ReponseCourante = { questionId, statut: evenement.statut, payload: evenement.payload }
      return { question, reponse }
    })
    .filter((v): v is { question: QuestionCanonique; reponse: ReponseCourante } => v !== null)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/${locale}/plan-b`} className="text-sm text-cr-text-secondary hover:text-cr-text">
          ← Mon Point de Départ
        </Link>
        <h1 className="text-xl font-bold text-cr-text mt-2">{famille.nom}</h1>
        <p className="text-sm text-cr-text-secondary mt-1">{famille.description}</p>
      </div>

      <div className="space-y-3">
        {questions.map(question => {
          const reponse = reponses.get(question.stableId) ?? null
          // GO QG (verrou final referenceEditoriale) : plus aucune
          // forme de referenceEditoriale affichée à l'utilisateur, y
          // compris « Qxx » — jamais remplacée par un autre identifiant
          // interne, simplement absente. La VRAIE question (libelle)
          // reste évidemment affichée.
          return (
            <div key={question.stableId} className="bg-surface rounded-xl border border-cr-border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-cr-text">{question.libelle}</p>
                </div>
                {modifiable && (
                  <Link
                    href={`/${locale}/plan-b/famille/${etape}/modifier/${question.stableId}`}
                    className="flex-shrink-0 text-sm text-cr-accent hover:underline"
                  >
                    Modifier
                  </Link>
                )}
              </div>
              <ReponseLectureSeule question={question} reponse={reponse} />
            </div>
          )
        })}
      </div>

      {/* T7.12 — « Réponses précédentes » : lecture seule stricte,
          aucun lien « Modifier », aucune restauration. Présentation
          secondaire/atténuée minimale uniquement — pas de revue design. */}
      {reponsesPrecedentes.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-cr-text-secondary">Réponses précédentes</h2>
            <p className="text-xs text-cr-text-muted mt-1">
              Ces réponses ne sont plus utilisées dans ton Point de Départ actuel, car ta situation a changé.
            </p>
          </div>
          {reponsesPrecedentes.map(({ question, reponse }) => {
            return (
              <div
                key={question.stableId}
                className="bg-background rounded-xl border border-cr-border p-4 space-y-2 opacity-75"
              >
                <div>
                  <p className="text-sm font-medium text-cr-text-secondary">{question.libelle}</p>
                </div>
                <ReponseLectureSeule question={question} reponse={reponse} />
              </div>
            )
          })}
        </div>
      )}

      {/* T7.11 correction navigation §2 : sortie claire vers la clôture
          dédiée, uniquement depuis la consultation de F7, uniquement
          si le MPD est réellement complet et non consommé — jamais une
          redirection automatique, l'utilisateur consulte F7 normalement. */}
      {etape === 7 && mpdComplet && !consomme && (
        <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-3">
          <p className="text-sm font-medium text-cr-text">Ton Point de Départ est terminé.</p>
          <Link
            href={`/${locale}/plan-b/cloture`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Passer à l’étape suivante →
          </Link>
        </div>
      )}
    </div>
  )
}
