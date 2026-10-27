// ============================================================
// MFR V1 — Construction de MfrWritingContext — T-MFR.5A
// ============================================================
// Server-only, client `service_role` exclusivement (jamais le client
// authentifié) : RLS est activée sans aucune policy sur toutes les
// tables lues ici (`mfr_curations`, `mfr_curation_directions`,
// `mfr_hypotheses`, `mfr_evaluations_d025`, `mfr_hypothese_ancrages`,
// `mfr_ancrages`, `mfr_proposition_ancrages`, `mfr_proposition_referents`,
// `mfr_referent_sources`) — un client authentifié n'y lirait jamais
// aucune ligne. Cohérent avec la rédaction = geste CoachRedo-privilégié
// (T-MFR.4A/4B), jamais un chemin utilisateur final en 5A.
//
// Lecture pure, aucune écriture, aucun verrou — la fraîcheur de la
// curation/analyse retenue est revérifiée sous verrou par
// `mfr_demarrer_redaction` (025), jamais ici.

import type { createServiceClient } from '@/lib/supabase/server'
import type {
  HypothesisBindings,
  MfrWritingAncrage,
  MfrWritingContext,
  MfrWritingDirection,
  MfrWritingSource,
  WritingConstructionResultat,
} from './writingTypes'
import { MFR_WRITING_CONTEXT_VERSION } from './writingTypes'

type SupabaseServiceClient = ReturnType<typeof createServiceClient>

export async function construireMfrWritingContext(
  service: SupabaseServiceClient,
  cycleId: string,
  analyseId: string,
  curationId: string
): Promise<WritingConstructionResultat> {
  const { data: cycle, error: erreurCycle } = await service
    .from('mfr_cycles')
    .select('id, analyse_retenue_id')
    .eq('id', cycleId)
    .maybeSingle()

  if (erreurCycle || !cycle) {
    return { ok: false, anomalie: { type: 'cycle_introuvable' } }
  }
  if (!cycle.analyse_retenue_id) {
    return { ok: false, anomalie: { type: 'analyse_retenue_manquante' } }
  }
  if (cycle.analyse_retenue_id !== analyseId) {
    return { ok: false, anomalie: { type: 'analyse_retenue_incoherente' } }
  }

  const { data: curation, error: erreurCuration } = await service
    .from('mfr_curations')
    .select('id, cycle_id, analyse_id, recommandation_confirmee, cree_le')
    .eq('cycle_id', cycleId)
    .eq('analyse_id', analyseId)
    .order('cree_le', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (erreurCuration || !curation) {
    return { ok: false, anomalie: { type: 'curation_introuvable' } }
  }
  if (curation.id !== curationId) {
    return { ok: false, anomalie: { type: 'curation_non_officielle' } }
  }

  const { data: liaisons, error: erreurLiaisons } = await service
    .from('mfr_curation_directions')
    .select('hypothese_id, position')
    .eq('curation_id', curationId)
    .order('position', { ascending: true })

  if (erreurLiaisons || !liaisons) {
    return { ok: false, anomalie: { type: 'incoherence_donnees', detail: 'lecture_curation_directions_echouee' } }
  }

  const hypothesisBindings = new Map<1 | 2 | 3, string>()
  for (const liaison of liaisons) {
    hypothesisBindings.set(liaison.position as 1 | 2 | 3, liaison.hypothese_id as string)
  }

  let srcCompteur = 0
  const srcParReponse = new Map<string, string>()
  function obtenirOuCreerSrc(etatLogiqueReponseId: string): string {
    const existant = srcParReponse.get(etatLogiqueReponseId)
    if (existant) return existant
    srcCompteur += 1
    const nouveau = `SRC_${srcCompteur}`
    srcParReponse.set(etatLogiqueReponseId, nouveau)
    return nouveau
  }

  const directions: MfrWritingDirection[] = []
  let recommandationPosition: 1 | 2 | 3 | null = null

  for (const liaison of liaisons) {
    const position = liaison.position as 1 | 2 | 3
    const hypotheseId = liaison.hypothese_id as string

    const { data: hypothese, error: erreurHypothese } = await service
      .from('mfr_hypotheses')
      .select('formulation, mecanismes')
      .eq('id', hypotheseId)
      .maybeSingle()
    if (erreurHypothese || !hypothese) {
      return { ok: false, anomalie: { type: 'incoherence_donnees', detail: `hypothese_introuvable:${hypotheseId}` } }
    }

    const { data: evaluation, error: erreurEvaluation } = await service
      .from('mfr_evaluations_d025')
      .select('coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui, justification')
      .eq('analyse_id', analyseId)
      .eq('hypothese_id', hypotheseId)
      .maybeSingle()
    if (erreurEvaluation || !evaluation) {
      return { ok: false, anomalie: { type: 'incoherence_donnees', detail: `evaluation_d025_introuvable:${hypotheseId}` } }
    }

    if (evaluation.recommandee_aujourdhui && curation.recommandation_confirmee) {
      recommandationPosition = position
    }

    const { data: liensAncrages, error: erreurLiensAncrages } = await service
      .from('mfr_hypothese_ancrages')
      .select('ancrage_id')
      .eq('hypothese_id', hypotheseId)
      .eq('constitutif', true)
      .order('ancrage_id', { ascending: true })
    if (erreurLiensAncrages || !liensAncrages) {
      return { ok: false, anomalie: { type: 'incoherence_donnees', detail: `ancrages_constitutifs_introuvables:${hypotheseId}` } }
    }

    const ancragesConstitutifs: MfrWritingAncrage[] = []
    for (const lien of liensAncrages) {
      const ancrageId = lien.ancrage_id as string

      const { data: ancrage, error: erreurAncrage } = await service
        .from('mfr_ancrages')
        .select('famille, enonce')
        .eq('id', ancrageId)
        .maybeSingle()
      if (erreurAncrage || !ancrage) {
        return { ok: false, anomalie: { type: 'incoherence_donnees', detail: `ancrage_introuvable:${ancrageId}` } }
      }

      const { data: liensPropositions } = await service
        .from('mfr_proposition_ancrages')
        .select('proposition_id')
        .eq('ancrage_id', ancrageId)
        .order('proposition_id', { ascending: true })

      const sources: MfrWritingSource[] = []
      for (const lienProposition of liensPropositions ?? []) {
        const { data: liensReferents } = await service
          .from('mfr_proposition_referents')
          .select('referent_id')
          .eq('proposition_id', lienProposition.proposition_id as string)
          .order('referent_id', { ascending: true })

        for (const lienReferent of liensReferents ?? []) {
          const { data: referentSources } = await service
            .from('mfr_referent_sources')
            .select('etat_logique_reponse_id, extrait')
            .eq('referent_id', lienReferent.referent_id as string)
            .order('etat_logique_reponse_id', { ascending: true })

          for (const rs of referentSources ?? []) {
            const etatLogiqueReponseId = rs.etat_logique_reponse_id as string
            const extrait = (rs.extrait as string | null) ?? ''
            const src = obtenirOuCreerSrc(etatLogiqueReponseId)
            if (!sources.some(s => s.src === src)) {
              sources.push({ src, extrait })
            }
          }
        }
      }

      ancragesConstitutifs.push({ famille: ancrage.famille, enonce: ancrage.enonce, sources })
    }

    directions.push({
      position,
      formulation: hypothese.formulation,
      mecanismes: hypothese.mecanismes,
      evaluationD025: {
        coherenceOk: evaluation.coherence_ok,
        compatibiliteOk: evaluation.compatibilite_ok,
        actionnabiliteResultat: evaluation.actionnabilite_resultat,
        disponibiliteOk: evaluation.disponibilite_ok,
        sortie: evaluation.sortie,
        justification: evaluation.justification,
      },
      ancragesConstitutifs,
    })
  }

  const context: MfrWritingContext = {
    contextVersion: MFR_WRITING_CONTEXT_VERSION,
    directions,
    recommandationPosition,
  }

  return {
    ok: true,
    context,
    hypothesisBindings: hypothesisBindings as HypothesisBindings,
    cycleId,
    analyseId,
    curationId,
    recommandationConfirmee: Boolean(curation.recommandation_confirmee),
  }
}
