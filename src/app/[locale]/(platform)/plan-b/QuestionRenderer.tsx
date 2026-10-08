'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { QuestionCanonique } from '@/lib/mpd/canon'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'
import { soumettreReponse } from './actions'
import { ChampTexte } from './champs/ChampTexte'
import { ChampChoixUnique } from './champs/ChampChoixUnique'
import { ChampChoixAvecPrecision } from './champs/ChampChoixAvecPrecision'
import { ChampMultiSelection } from './champs/ChampMultiSelection'
import { ChampItemsAvecSousReponse } from './champs/ChampItemsAvecSousReponse'
import { ChampTexteAvecProvenance } from './champs/ChampTexteAvecProvenance'

interface QuestionRendererProps {
  locale: string
  dossierId: string
  revision: number
  question: QuestionCanonique
  // T7.8B — optionnels, strictement rétrocompatibles : /parcours
  // continue de se comporter exactement comme avant lorsqu'ils sont
  // omis (reponseExistante=undefined, onSuccess=undefined).
  readonly reponseExistante?: ReponseCourante
  readonly onSuccess?: (revision: number) => void
  // GO QG (intégration Q28) : devise préférée du PROFIL — valeur
  // initiale uniquement, jamais une autorité. L'utilisateur reste
  // libre de la changer pour cette réponse ; aucune modification du
  // profil n'est jamais déclenchée depuis ici.
  readonly preferredCurrency?: string
}

const MESSAGES_ERREUR: Record<string, string> = {
  option_inconnue: 'Choix invalide.',
  selection_invalide: 'Choix invalide.',
  selection_dupliquee: 'Choix en double.',
  texte_invalide: 'Réponse requise.',
  liste_texte_invalide: 'Réponse requise.',
  entree_texte_invalide: 'Un des éléments saisis est vide.',
  cardinalite_invalide: 'Nombre d’éléments invalide.',
  precision_manquante: 'Une précision est requise pour ce choix.',
  precision_texte_invalide: 'Précision requise.',
  precision_nombre_invalide: 'Montant invalide.',
  payload_requis: 'Réponse requise.',
  question_non_applicable: 'Cette question n’est plus applicable — la page va se recharger.',
  attestation_conflit: 'Cette réponse a changé entre-temps — la page va se recharger.',
  attestation_deja_consommee: 'Cette soumission a déjà été traitée.',
  attestation_erreur: 'Une erreur est survenue. Réessaie.',
  'Dossier introuvable': 'Dossier introuvable.',
  'Non authentifié.': 'Session expirée — reconnecte-toi.',
}

function messageErreur(code: string): string {
  if (code.startsWith('revision_conflict')) {
    return 'Cette information a changé entre-temps — la page va se recharger.'
  }
  return MESSAGES_ERREUR[code] ?? 'Une erreur est survenue. Réessaie.'
}

function ChampDispatcher({
  question,
  value,
  onChange,
  preferredCurrency,
}: {
  question: QuestionCanonique
  value: unknown
  onChange: (value: unknown) => void
  preferredCurrency?: string
}) {
  switch (question.formeReponse) {
    case 'texte':
      return <ChampTexte question={question} value={value} onChange={onChange} />
    case 'choix_unique':
      return <ChampChoixUnique question={question} value={value} onChange={onChange} />
    case 'choix_avec_precision':
      return (
        <ChampChoixAvecPrecision question={question} value={value} onChange={onChange} preferredCurrency={preferredCurrency} />
      )
    case 'multi_selection':
      return <ChampMultiSelection question={question} value={value} onChange={onChange} />
    case 'items_avec_sous_reponse':
      return <ChampItemsAvecSousReponse question={question} value={value} onChange={onChange} />
    case 'texte_avec_provenance':
      return <ChampTexteAvecProvenance question={question} value={value} onChange={onChange} />
  }
}

export function QuestionRenderer({
  locale,
  dossierId,
  revision,
  question,
  reponseExistante,
  onSuccess,
  preferredCurrency,
}: QuestionRendererProps) {
  // Préremplissage T7.8B : préserve strictement le statut exact
  // (DECLARE/INCONNU/REFUS) et le payload exact de la réponse active
  // existante — jamais de conversion silencieuse vers DECLARE.
  const [statut, setStatut] = useState<StatutReponse>(reponseExistante?.statut ?? 'DECLARE')
  const [payload, setPayload] = useState<unknown>(reponseExistante ? reponseExistante.payload : undefined)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const peutSoumettre = statut !== 'DECLARE' || payload !== undefined

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await soumettreReponse(
        locale,
        dossierId,
        revision,
        question.stableId,
        statut,
        statut === 'DECLARE' ? payload : null
      )
      if ('error' in result) {
        setError(messageErreur(result.error))
        if (result.error.startsWith('revision_conflict') || result.error === 'question_non_applicable') {
          router.refresh()
        }
        return
      }
      // T7.8B : /parcours (onSuccess omis) garde exactement son
      // comportement actuel — router.refresh(). FamilyRevisionRenderer
      // fournit onSuccess pour reprendre la navigation depuis l'état
      // serveur frais (jamais une autorité côté client).
      if (onSuccess) {
        onSuccess(result.revision)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
      <div>
        {/* GO QG (verrou final referenceEditoriale) : plus aucune
            forme de referenceEditoriale affichée à l'utilisateur, y
            compris « Qxx » — jamais remplacée par un autre identifiant
            interne, simplement absente. */}
        <h2 className="text-base font-semibold text-cr-text">{question.libelle}</h2>
        {question.aide && question.aide !== 'aucune' && (
          <p className="text-sm text-cr-text-secondary mt-1">{question.aide}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatut('DECLARE')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
            statut === 'DECLARE' ? 'bg-cr-accent text-white border-cr-accent' : 'border-cr-border text-cr-text'
          }`}
        >
          Répondre
        </button>
        <button
          type="button"
          onClick={() => {
            setStatut('INCONNU')
            setPayload(undefined)
          }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
            statut === 'INCONNU' ? 'bg-cr-accent text-white border-cr-accent' : 'border-cr-border text-cr-text'
          }`}
        >
          Je ne sais pas
        </button>
        {question.eligibiliteRefus && (
          <button
            type="button"
            onClick={() => {
              setStatut('REFUS')
              setPayload(undefined)
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              statut === 'REFUS' ? 'bg-cr-accent text-white border-cr-accent' : 'border-cr-border text-cr-text'
            }`}
          >
            Je préfère ne pas répondre
          </button>
        )}
      </div>

      {statut === 'DECLARE' && (
        <ChampDispatcher question={question} value={payload} onChange={setPayload} preferredCurrency={preferredCurrency} />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !peutSoumettre}
        className="px-4 py-2 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isPending ? 'Enregistrement…' : 'Continuer'}
      </button>
    </div>
  )
}
