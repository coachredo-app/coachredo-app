'use client'

import type { QuestionCanonique } from '@/lib/mpd/canon'

interface Props {
  question: QuestionCanonique
  value: unknown
  onChange: (value: unknown) => void
}

export function ChampTexteAvecProvenance({ question, value, onChange }: Props) {
  const structure = question.texteAvecProvenance
  if (!structure) return null

  // Anomalie 13 (Lot B) : quand l'alternative fait doublon avec le
  // statut système INCONNU (canon, aucune fonction propre), elle n'est
  // plus proposée pour une NOUVELLE réponse — le bouton système
  // INCONNU reste l'unique chemin. La value reste lisible pour toute
  // ancienne réponse DECLARE qui la porte déjà (ReponseLectureSeule,
  // non concerné par ce masquage d'affichage du formulaire).
  const alt = question.alternativeRedondanteAvecInconnu ? undefined : question.options?.[0]
  const isAlt = alt !== undefined && value === alt.value
  const obj =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as { texte?: string; provenance?: string })
      : {}

  return (
    <div className="space-y-3">
      {alt && (
        <label className="flex items-center gap-2 text-sm text-cr-text">
          <input
            type="checkbox"
            checked={isAlt}
            onChange={e => onChange(e.target.checked ? alt.value : undefined)}
          />
          {alt.label}
        </label>
      )}
      {!isAlt && (
        <>
          <textarea
            value={obj.texte ?? ''}
            onChange={e => onChange({ ...obj, texte: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-cr-border px-3 py-2 text-sm"
          />
          <div className="space-y-1">
            <p className="text-sm font-medium text-cr-text">Comment le sais-tu ?</p>
            {structure.provenanceOptions.map(option => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-cr-text">
                <input
                  type="radio"
                  checked={obj.provenance === option.value}
                  onChange={() => onChange({ ...obj, provenance: option.value })}
                />
                {option.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
