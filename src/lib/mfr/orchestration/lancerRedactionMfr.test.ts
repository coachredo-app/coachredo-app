// ============================================================
// MFR V1 — Tests OFFLINE de l'orchestrateur de rédaction — T-MFR.5A
// ============================================================
// Script plain, même discipline que lancerAnalyseMfr.test.ts. Zéro
// Supabase réel, zéro OpenAI réel : toutes les briques DB/provider sont
// des fakes injectées via `deps`/`appelerProvider`.

import { lancerRedactionMfr, type LancerRedactionMfrDeps, type LancerRedactionMfrParams } from './lancerRedactionMfr'
import type { ResultatAppelProvider } from '../provider/openai'
import type { MfrWritingContext } from '../context/writingTypes'

let total = 0
let echecs = 0
function verifier(nom: string, condition: boolean, detail?: string): void {
  total += 1
  if (condition) {
    console.log(`PASS  ${nom}`)
  } else {
    echecs += 1
    console.log(`FAIL  ${nom}${detail ? ` — ${detail}` : ''}`)
  }
}

const METADATA = { provider: 'openai', model: 'gpt-6.1-sol', promptVersion: 'v1', schemaVersion: '1' }

const CONTEXTE_VIDE: MfrWritingContext = { contextVersion: 1, directions: [], recommandationPosition: null }

function depsFinishFactices(): Pick<LancerRedactionMfrDeps, 'finirRedactionEchec' | 'finirRedactionSucces'> {
  return {
    finirRedactionEchec: async () => ({ ok: true, alreadyTerminal: false }),
    finirRedactionSucces: async () => ({ ok: true, alreadyTerminal: false, versionId: 'version-factice', numeroVersion: 1 }),
  }
}

function paramsDeBase(overrides: Partial<LancerRedactionMfrParams> = {}): LancerRedactionMfrParams {
  return {
    service: {} as never,
    cycleId: 'cycle-1',
    analyseId: 'analyse-1',
    curationId: 'curation-1',
    metadata: METADATA,
    promptSysteme: 'prompt de test',
    appelerProvider: async () => ({ type: 'erreur_reseau', erreur: 'ne devrait jamais être appelé' }) as ResultatAppelProvider,
    timeoutMs: 120000,
    ...overrides,
  }
}

async function main() {
  // 1. Démarrage refusé (ex. curation_non_officielle) → provider jamais appelé.
  {
    let providerAppele = false
    const resultat = await lancerRedactionMfr(
      paramsDeBase({
        appelerProvider: async () => {
          providerAppele = true
          return { type: 'erreur_reseau', erreur: 'ne devrait jamais être appelé' }
        },
        deps: {
          demarrerRedaction: async () => ({ error: 'curation_non_officielle' }),
        },
      })
    )
    verifier('1. démarrage refusé → statut ECHEC_AVANT_REDACTION', resultat.statut === 'ECHEC_AVANT_REDACTION')
    verifier('1. provider jamais appelé', !providerAppele)
  }

  // 2. Démarrage accepté, construction du contexte échoue → FINISH ECHEC, provider jamais appelé.
  {
    let providerAppele = false
    let analyseIdPasseAFinirEchec: string | undefined
    const resultat = await lancerRedactionMfr(
      paramsDeBase({
        appelerProvider: async () => {
          providerAppele = true
          return { type: 'erreur_reseau', erreur: 'ne devrait jamais être appelé' }
        },
        deps: {
          demarrerRedaction: async () => ({ ok: true, redactionId: 'redaction-1', created: true }),
          construireMfrWritingContext: async () => ({ ok: false, anomalie: { type: 'curation_introuvable' } }),
          finirRedactionEchec: async (_s, redactionId) => {
            analyseIdPasseAFinirEchec = redactionId
            return { ok: true, alreadyTerminal: false }
          },
        },
      })
    )
    verifier('2. construction contexte échouée → statut ECHEC', resultat.statut === 'ECHEC')
    verifier('2. provider jamais appelé', !providerAppele)
    verifier('2. FINISH ECHEC reçoit le bon redactionId', analyseIdPasseAFinirEchec === 'redaction-1')
  }

  // 3. Chemin complet réussi → provider appelé EXACTEMENT une fois, FINISH SUCCES reçoit le contenu validé.
  {
    let appelsProvider = 0
    let contenuPasseAFinirSucces: unknown
    let redactionIdPasseAFinirSucces: string | undefined
    const resultat = await lancerRedactionMfr(
      paramsDeBase({
        appelerProvider: async () => {
          appelsProvider += 1
          return {
            type: 'succes',
            payload: { directions: [], aucuneDirectionMessage: { texte: 'Rien de solide aujourd’hui.', sources: [] } },
            metadonnees: { responseId: 'resp-1', model: 'gpt-6.1-sol', usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } },
          }
        },
        deps: {
          demarrerRedaction: async () => ({ ok: true, redactionId: 'redaction-2', created: true }),
          construireMfrWritingContext: async () => ({
            ok: true,
            context: CONTEXTE_VIDE,
            hypothesisBindings: new Map(),
            cycleId: 'cycle-1',
            analyseId: 'analyse-1',
            curationId: 'curation-1',
            recommandationConfirmee: false,
          }),
          ...depsFinishFactices(),
          finirRedactionSucces: async (_s, redactionId, _outputBrut, contenu) => {
            redactionIdPasseAFinirSucces = redactionId
            contenuPasseAFinirSucces = contenu
            return { ok: true, alreadyTerminal: false, versionId: 'version-2', numeroVersion: 1 }
          },
        },
      })
    )
    verifier('3. provider appelé EXACTEMENT une fois', appelsProvider === 1)
    verifier('3. statut SUCCES', resultat.statut === 'SUCCES')
    verifier('3. FINISH SUCCES reçoit le bon redactionId', redactionIdPasseAFinirSucces === 'redaction-2')
    verifier(
      '3. FINISH SUCCES reçoit le contenu réellement validé (zéro direction, message présent)',
      typeof contenuPasseAFinirSucces === 'object' &&
        contenuPasseAFinirSucces !== null &&
        Array.isArray((contenuPasseAFinirSucces as Record<string, unknown>).directions) &&
        (contenuPasseAFinirSucces as Record<string, unknown[]>).directions.length === 0
    )
  }

  // 4. Payload invalide (ex. direction hors contexte) → FINISH ECHEC, jamais de version créée.
  {
    let finirSuccesAppele = false
    let erreurPasseeAFinirEchec: string | undefined
    const resultat = await lancerRedactionMfr(
      paramsDeBase({
        appelerProvider: async () => ({
          type: 'succes',
          payload: { directions: [{ position: 1, titre: 'x', pourquoi: { texte: 'x', sources: ['SRC_1'] }, forces: { texte: 'x', sources: ['SRC_1'] }, limites: { texte: 'x', sources: [] }, planAction: { texte: 'x', sources: [] } }], aucuneDirectionMessage: null },
          metadonnees: { responseId: 'resp-2', model: 'gpt-6.1-sol', usage: null },
        }),
        deps: {
          demarrerRedaction: async () => ({ ok: true, redactionId: 'redaction-3', created: true }),
          construireMfrWritingContext: async () => ({
            // Contexte VIDE (0 direction attendue) — le payload ci-dessus en propose une : incohérence détectée par le validateur.
            ok: true,
            context: CONTEXTE_VIDE,
            hypothesisBindings: new Map(),
            cycleId: 'cycle-1',
            analyseId: 'analyse-1',
            curationId: 'curation-1',
            recommandationConfirmee: false,
          }),
          finirRedactionEchec: async (_s, _redactionId, erreur) => {
            erreurPasseeAFinirEchec = erreur
            return { ok: true, alreadyTerminal: false }
          },
          finirRedactionSucces: async () => {
            finirSuccesAppele = true
            return { ok: true, alreadyTerminal: false, versionId: 'ne-devrait-jamais-etre-cree', numeroVersion: 1 }
          },
        },
      })
    )
    verifier('4. payload invalide → statut ECHEC', resultat.statut === 'ECHEC')
    verifier('4. FINISH SUCCES jamais appelé', !finirSuccesAppele)
    verifier('4. erreur de validation reportée', typeof erreurPasseeAFinirEchec === 'string' && erreurPasseeAFinirEchec.length > 0)
  }

  // 5. mode omis (défaut) → demarrerRedaction appelé, relancerRedactionApresEchec jamais.
  {
    let demarrerAppele = false
    let relancerAppele = false
    await lancerRedactionMfr(
      paramsDeBase({
        deps: {
          demarrerRedaction: async () => {
            demarrerAppele = true
            return { ok: true, redactionId: 'redaction-5', created: true }
          },
          relancerRedactionApresEchec: async () => {
            relancerAppele = true
            return { ok: true, redactionId: 'ne-devrait-jamais-etre-cree', created: true }
          },
          construireMfrWritingContext: async () => ({ ok: false, anomalie: { type: 'curation_introuvable' } }),
          ...depsFinishFactices(),
        },
      })
    )
    verifier('5. mode omis (défaut) → demarrerRedaction appelé', demarrerAppele)
    verifier('5. mode omis (défaut) → relancerRedactionApresEchec jamais appelé', !relancerAppele)
  }

  // 6. mode REPRISE_APRES_ECHEC → relancerRedactionApresEchec appelé, demarrerRedaction jamais.
  {
    let demarrerAppele = false
    let relancerAppele = false
    await lancerRedactionMfr(
      paramsDeBase({
        mode: 'REPRISE_APRES_ECHEC',
        deps: {
          demarrerRedaction: async () => {
            demarrerAppele = true
            return { ok: true, redactionId: 'ne-devrait-jamais-etre-cree', created: true }
          },
          relancerRedactionApresEchec: async () => {
            relancerAppele = true
            return { ok: true, redactionId: 'redaction-6', created: true }
          },
          construireMfrWritingContext: async () => ({ ok: false, anomalie: { type: 'curation_introuvable' } }),
          ...depsFinishFactices(),
        },
      })
    )
    verifier('6. mode REPRISE_APRES_ECHEC → relancerRedactionApresEchec appelé', relancerAppele)
    verifier('6. mode REPRISE_APRES_ECHEC → demarrerRedaction jamais appelé', !demarrerAppele)
  }

  // 7. Reprise refusée par la RPC (ex. redaction_en_cours, déjà SUCCES, aucune précédente) → provider JAMAIS appelé.
  for (const erreurRpc of ['aucune_redaction_precedente', 'redaction_en_cours', 'derniere_tentative_deja_succes'] as const) {
    let providerAppele = false
    const resultat = await lancerRedactionMfr(
      paramsDeBase({
        mode: 'REPRISE_APRES_ECHEC',
        appelerProvider: async () => {
          providerAppele = true
          return { type: 'erreur_reseau', erreur: 'ne devrait jamais être appelé' }
        },
        deps: {
          relancerRedactionApresEchec: async () => ({ error: erreurRpc }),
        },
      })
    )
    verifier(`7. reprise refusée (${erreurRpc}) → statut ECHEC_AVANT_REDACTION`, resultat.statut === 'ECHEC_AVANT_REDACTION')
    verifier(`7. reprise refusée (${erreurRpc}) → provider jamais appelé`, !providerAppele)
  }

  // 8. Reprise acceptée → provider appelé EXACTEMENT une fois → FINISH SUCCES fonctionne sur la reprise.
  {
    let appelsProvider = 0
    let redactionIdPasseAFinirSucces: string | undefined
    const resultat = await lancerRedactionMfr(
      paramsDeBase({
        mode: 'REPRISE_APRES_ECHEC',
        appelerProvider: async () => {
          appelsProvider += 1
          return {
            type: 'succes',
            payload: { directions: [], aucuneDirectionMessage: { texte: 'Rien de solide.', sources: [] } },
            metadonnees: { responseId: 'resp-8', model: 'gpt-6.1-sol', usage: null },
          }
        },
        deps: {
          relancerRedactionApresEchec: async () => ({ ok: true, redactionId: 'redaction-reprise-1', created: true }),
          construireMfrWritingContext: async () => ({
            ok: true,
            context: CONTEXTE_VIDE,
            hypothesisBindings: new Map(),
            cycleId: 'cycle-1',
            analyseId: 'analyse-1',
            curationId: 'curation-1',
            recommandationConfirmee: false,
          }),
          ...depsFinishFactices(),
          finirRedactionSucces: async (_s, redactionId) => {
            redactionIdPasseAFinirSucces = redactionId
            return { ok: true, alreadyTerminal: false, versionId: 'version-reprise', numeroVersion: 1 }
          },
        },
      })
    )
    verifier('8. reprise acceptée → provider appelé EXACTEMENT une fois', appelsProvider === 1)
    verifier('8. ENGINE accepte le payload valide → statut SUCCES', resultat.statut === 'SUCCES')
    verifier('8. FINISH SUCCES reçoit bien le redactionId de la REPRISE', redactionIdPasseAFinirSucces === 'redaction-reprise-1')
  }

  console.log(`\n${total - echecs}/${total} vérifications passées.`)
  if (echecs > 0) {
    console.log(`${echecs} ÉCHEC(S).`)
    process.exitCode = 1
  } else {
    console.log('Toutes les vérifications sont passées.')
  }
}

main()
