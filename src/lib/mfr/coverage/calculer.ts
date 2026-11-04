// ============================================================
// MFR — Prototype de contrôle de couverture analytique — fonction pure
// ============================================================
// Entrées : le `MfrAnalysisContext` déjà construit (context/builder.ts),
// le `SourceBindings` associé (SRC_xxx -> mpd_etat_logique_reponses.id)
// et le `AnalyseGrapheResolu` déjà validé par `validerEtResoudreSortieBrute`
// (analysis/validator.ts). Aucune autre dépendance, aucune E/S, aucun
// appel IA — pure recombinaison de structures déjà calculées ailleurs.
// Jamais branché au pipeline de production depuis ce prototype (aucun
// import hors de ce dossier et de ses tests). Voir types.ts pour la
// portée et les limites assumées (arbitrage QG, deux ajustements).

import type { MfrAnalysisContext, SourceBindings } from '../context/types'
import type { AnalyseGrapheResolu } from '../server/types'
import {
  NATURES_ECONOMIQUES,
  NATURES_ADEQUATION_PERSONNELLE,
  type RapportCouvertureAnalytique,
  type SignalCouvertureEconomique,
  type SignalCouvertureAdequation,
  type PisteNonVerifiable,
  type StatutCouvertureEconomique,
  type StatutCouvertureAdequation,
} from './types'

function compterStatuts<S extends string>(signaux: readonly { readonly statut: S }[], statutsPossibles: readonly S[]): Record<S, number> {
  const base = Object.fromEntries(statutsPossibles.map(s => [s, 0])) as Record<S, number>
  for (const s of signaux) base[s.statut] += 1
  return base
}

export function calculerCouvertureAnalytique(
  context: MfrAnalysisContext,
  sourceBindings: SourceBindings,
  graphe: AnalyseGrapheResolu
): RapportCouvertureAnalytique {
  const referentSources = graphe.referent_sources ?? []
  const propositionReferents = graphe.proposition_referents ?? []
  const propositionAncrages = graphe.proposition_ancrages ?? []
  const hypotheseAncrages = graphe.hypothese_ancrages ?? []
  const hypotheses = graphe.hypotheses ?? []
  const pistesResolues = graphe.pistes ?? []

  // etat_logique_reponse_id -> referent_id[] citant structurellement ce SRC.
  const referentsParEtatLogiqueReponseId = new Map<string, string[]>()
  for (const rs of referentSources) {
    const liste = referentsParEtatLogiqueReponseId.get(rs.etat_logique_reponse_id)
    if (liste) liste.push(rs.referent_id)
    else referentsParEtatLogiqueReponseId.set(rs.etat_logique_reponse_id, [rs.referent_id])
  }

  // referent_id -> proposition_id[]
  const propositionsParReferentId = new Map<string, string[]>()
  for (const pr of propositionReferents) {
    const liste = propositionsParReferentId.get(pr.referent_id)
    if (liste) liste.push(pr.proposition_id)
    else propositionsParReferentId.set(pr.referent_id, [pr.proposition_id])
  }

  // proposition_id -> ancrage_id[]
  const ancragesParPropositionId = new Map<string, string[]>()
  for (const pa of propositionAncrages) {
    const liste = ancragesParPropositionId.get(pa.proposition_id)
    if (liste) liste.push(pa.ancrage_id)
    else ancragesParPropositionId.set(pa.proposition_id, [pa.ancrage_id])
  }

  // ancrage_id -> hypothese_id[] — uniquement les liens CONSTITUTIFS
  // (D-048 §I : une Direction Candidate exige au moins un ancrage
  // constitutif — c'est la seule promotion jamais déduite ici).
  const hypothesesConstitutivesParAncrageId = new Map<string, string[]>()
  for (const ha of hypotheseAncrages) {
    if (!ha.constitutif) continue
    const liste = hypothesesConstitutivesParAncrageId.get(ha.ancrage_id)
    if (liste) liste.push(ha.hypothese_id)
    else hypothesesConstitutivesParAncrageId.set(ha.ancrage_id, [ha.hypothese_id])
  }

  const hypothesesDirectionCandidate = new Set(hypotheses.filter(h => h.statut === 'DIRECTION_CANDIDATE').map(h => h.id))

  const signauxEconomiques: SignalCouvertureEconomique[] = []
  const signauxAdequationPersonnelle: SignalCouvertureAdequation[] = []

  for (const source of context.sources) {
    const estEconomique = NATURES_ECONOMIQUES.includes(source.natureObjet)
    const estAdequation = NATURES_ADEQUATION_PERSONNELLE.includes(source.natureObjet)
    // `contexte` (et toute nature non listée) : jamais un signal
    // potentiellement décisif, hors périmètre de ce contrôle.
    if (!estEconomique && !estAdequation) continue

    // INSUFFISAMMENT_DOCUMENTE : statut de la réponse elle-même
    // (INCONNU/REFUS), vérifié AVANT toute recherche de citation — un
    // signal non déclaré ne peut structurellement jamais être « cité ».
    if (source.statut !== 'DECLARE') {
      if (estEconomique) {
        signauxEconomiques.push({
          src: source.src,
          natureObjet: source.natureObjet,
          statut: 'INSUFFISAMMENT_DOCUMENTE',
          propositionsLiees: [],
          ancragesLies: [],
          hypothesesPromouvant: [],
        })
      } else {
        signauxAdequationPersonnelle.push({ src: source.src, natureObjet: source.natureObjet, statut: 'INSUFFISAMMENT_DOCUMENTE', propositionsLiees: [] })
      }
      continue
    }

    // Lien privé SRC -> etat_logique_reponse_id, garanti existant par
    // construction (même builder que sourceBindings) — jamais une
    // assertion fatale ici (fonction pure) : absence traitée comme
    // "sans trace", jamais une exception qui romprait le calcul.
    const etatLogiqueReponseId = sourceBindings.get(source.src)
    const referentIds = etatLogiqueReponseId ? referentsParEtatLogiqueReponseId.get(etatLogiqueReponseId) ?? [] : []

    if (referentIds.length === 0) {
      if (estEconomique) {
        signauxEconomiques.push({
          src: source.src,
          natureObjet: source.natureObjet,
          statut: 'SANS_TRACE_ANALYTIQUE',
          propositionsLiees: [],
          ancragesLies: [],
          hypothesesPromouvant: [],
        })
      } else {
        signauxAdequationPersonnelle.push({ src: source.src, natureObjet: source.natureObjet, statut: 'SANS_TRACE_ANALYTIQUE', propositionsLiees: [] })
      }
      continue
    }

    const propositionIds = Array.from(new Set(referentIds.flatMap(rid => propositionsParReferentId.get(rid) ?? [])))

    if (estAdequation) {
      // Aucun chemin structurel vers RETENU pour ce groupe (cf. types.ts,
      // point 2) — seule la présence dans une proposition est vérifiable.
      signauxAdequationPersonnelle.push({
        src: source.src,
        natureObjet: source.natureObjet,
        statut: 'EXAMINE_SANS_VALIDATION_POSSIBLE',
        propositionsLiees: propositionIds,
      })
      continue
    }

    // Groupe économique : recherche de la promotion jusqu'à un ancrage
    // CONSTITUTIF d'une hypothèse DIRECTION_CANDIDATE.
    const ancrageIds = Array.from(new Set(propositionIds.flatMap(pid => ancragesParPropositionId.get(pid) ?? [])))
    const hypothesesPromouvant = Array.from(
      new Set(
        ancrageIds.flatMap(aid => hypothesesConstitutivesParAncrageId.get(aid) ?? []).filter(hid => hypothesesDirectionCandidate.has(hid))
      )
    )

    signauxEconomiques.push({
      src: source.src,
      natureObjet: source.natureObjet,
      statut: hypothesesPromouvant.length > 0 ? 'RETENU' : 'CITE_NON_DETERMINANT',
      propositionsLiees: propositionIds,
      ancragesLies: ancrageIds,
      hypothesesPromouvant,
    })
  }

  // Pistes : aucune référence structurelle à un SRC_xxx dans le schéma
  // actuel (variables_test est du texte libre) — état uniforme, sans
  // aucune affirmation de correspondance (ou d'absence) avec un signal.
  const pistes: PisteNonVerifiable[] = pistesResolues.map(p => ({
    pisteId: p.id,
    incertitudeConstitutive: p.incertitude_constitutive,
    etat: 'A_EXPLORER_NON_VERIFIABLE' as const,
  }))

  const STATUTS_ECONOMIQUES: readonly StatutCouvertureEconomique[] = ['RETENU', 'CITE_NON_DETERMINANT', 'INSUFFISAMMENT_DOCUMENTE', 'SANS_TRACE_ANALYTIQUE']
  const STATUTS_ADEQUATION: readonly StatutCouvertureAdequation[] = ['EXAMINE_SANS_VALIDATION_POSSIBLE', 'INSUFFISAMMENT_DOCUMENTE', 'SANS_TRACE_ANALYTIQUE']

  return {
    signauxEconomiques,
    signauxAdequationPersonnelle,
    pistes,
    resume: {
      totalSignauxEvalues: signauxEconomiques.length + signauxAdequationPersonnelle.length,
      economiques: compterStatuts(signauxEconomiques, STATUTS_ECONOMIQUES),
      adequation: compterStatuts(signauxAdequationPersonnelle, STATUTS_ADEQUATION),
    },
  }
}
