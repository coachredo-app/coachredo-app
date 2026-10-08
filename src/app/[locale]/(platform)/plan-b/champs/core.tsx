'use client'

// Primitives internes partagées par les 6 composants Champ* — jamais
// exportées en dehors de ce dossier comme une 7e forme : elles ne font
// que factoriser le rendu des champs fixes (ChampFixe), réutilisés à la
// fois par items_avec_sous_reponse et par la précision composite de
// choix_avec_precision.

import { useState } from 'react'
import type { Option, Cardinalite, PrecisionOption, ChampFixe } from '@/lib/mpd/canon'

export interface SelectionValue {
  readonly value: string
  readonly precision?: unknown
}

const champTexte = 'w-full rounded-lg border border-cr-border px-3 py-2 text-sm'

export function PrecisionInput({
  precision,
  value,
  onChange,
}: {
  precision: PrecisionOption
  value: unknown
  onChange: (value: unknown) => void
}) {
  if (precision.type === 'texte') {
    return (
      <div className="mt-2 space-y-1">
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder={precision.label}
          className={champTexte}
        />
        {precision.aide && <p className="text-xs text-cr-text-muted">{precision.aide}</p>}
      </div>
    )
  }

  if (precision.type === 'nombre_devise') {
    // Lot B (anomalie 8) : montant + devise réelle, devise optionnelle
    // (jamais inventée). Une ancienne réponse (nombre nu) reste lisible
    // en pré-remplissage ; toute nouvelle saisie produit la forme
    // { montant, devise }, jamais réécrite dans l'ancien format.
    const obj =
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as { montant?: number; devise?: string })
        : undefined
    const montantActuel = obj ? obj.montant : typeof value === 'number' ? value : undefined
    const deviseActuelle = obj?.devise ?? ''
    return (
      <div className="mt-2 space-y-2">
        <input
          type="number"
          value={montantActuel ?? ''}
          onChange={e =>
            onChange({
              montant: e.target.value === '' ? undefined : Number(e.target.value),
              devise: deviseActuelle || undefined,
            })
          }
          placeholder={precision.label}
          className={champTexte}
        />
        <input
          type="text"
          value={deviseActuelle}
          onChange={e => onChange({ montant: montantActuel, devise: e.target.value || undefined })}
          placeholder="Devise (ex. Euros, FCFA, Dirhams…) — si tu ne sais pas, laisse vide"
          className={champTexte}
        />
      </div>
    )
  }

  const obj =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  return (
    <div className="mt-2 space-y-3 pl-4 border-l-2 border-cr-border">
      {precision.champs.map(champ => (
        <ChampFixeField
          key={champ.id}
          champ={champ}
          value={obj[champ.id]}
          onChange={v => onChange({ ...obj, [champ.id]: v })}
        />
      ))}
    </div>
  )
}

export function SelectionField({
  options,
  value,
  onChange,
  preferredCurrency,
}: {
  options: readonly Option[]
  value: unknown
  onChange: (value: unknown) => void
  // GO QG (intégration Q28) : valeur initiale UNIQUEMENT — pré-remplit
  // la devise d'une precision nombre_devise au premier choix de
  // l'option (jamais sur une réponse déjà existante, jamais sur le
  // montant lui-même). Purement générique : n'importe quelle future
  // question nombre_devise en bénéficierait de la même façon, aucun
  // branchement spécifique à Q28.
  preferredCurrency?: string
}) {
  const selection =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as SelectionValue)
      : undefined

  function choisir(option: Option) {
    if (!option.precision) {
      onChange({ value: option.value })
      return
    }
    const precisionInitiale = option.precision.type === 'nombre_devise' && preferredCurrency
      ? { devise: preferredCurrency }
      : undefined
    onChange({ value: option.value, precision: precisionInitiale })
  }

  return (
    <div className="space-y-2">
      {options.map(option => {
        const coche = selection?.value === option.value
        return (
          <div key={option.value}>
            <label className="flex items-center gap-2 text-sm text-cr-text">
              <input type="radio" checked={coche} onChange={() => choisir(option)} />
              {option.label}
            </label>
            {coche && option.precision && (
              <PrecisionInput
                precision={option.precision}
                value={selection?.precision}
                onChange={p => onChange({ value: option.value, precision: p })}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function MultiSelectionField({
  options,
  cardinalite,
  value,
  onChange,
}: {
  options: readonly Option[]
  cardinalite?: Cardinalite
  value: unknown
  onChange: (value: unknown) => void
}) {
  const selections: SelectionValue[] = Array.isArray(value) ? (value as SelectionValue[]) : []

  function estCoche(option: Option) {
    return selections.some(s => s.value === option.value)
  }

  function basculer(option: Option, coche: boolean) {
    if (coche) {
      if (cardinalite && selections.length >= cardinalite.max) return
      const nouvelleEntree: SelectionValue = option.precision
        ? { value: option.value, precision: undefined }
        : { value: option.value }
      // Anomalie 12 (Lot B) : une option exclusive (ex. Q32 « Je ne
      // sais pas encore ») remplace toute sélection concrète existante ;
      // sélectionner une option concrète alors qu'une option exclusive
      // est déjà cochée la retire. Jamais appliqué entre deux options
      // concrètes — uniquement vis-à-vis d'une option marquée exclusif.
      if (option.exclusif) {
        onChange([nouvelleEntree])
      } else {
        onChange([...selections.filter(s => !options.find(o => o.value === s.value)?.exclusif), nouvelleEntree])
      }
    } else {
      onChange(selections.filter(s => s.value !== option.value))
    }
  }

  function majPrecision(option: Option, precision: unknown) {
    onChange(selections.map(s => (s.value === option.value ? { value: s.value, precision } : s)))
  }

  return (
    <div className="space-y-2">
      {options.map(option => {
        const coche = estCoche(option)
        const selection = selections.find(s => s.value === option.value)
        return (
          <div key={option.value}>
            <label className="flex items-center gap-2 text-sm text-cr-text">
              <input type="checkbox" checked={coche} onChange={e => basculer(option, e.target.checked)} />
              {option.label}
            </label>
            {coche && option.precision && (
              <PrecisionInput
                precision={option.precision}
                value={selection?.precision}
                onChange={p => majPrecision(option, p)}
              />
            )}
          </div>
        )
      })}
      {cardinalite && (
        <p className="text-xs text-cr-text-muted">
          {selections.length}/{cardinalite.max} sélectionné(s)
        </p>
      )}
    </div>
  )
}

function ListeTexteField({
  alt,
  isAlt,
  cardinalite,
  entries,
  onChange,
}: {
  alt?: Option
  isAlt: boolean
  cardinalite: Cardinalite
  entries: string[]
  onChange: (value: unknown) => void
}) {
  const [brouillon, setBrouillon] = useState(entries.join('\n'))

  return (
    <div className="space-y-2">
      {alt && (
        <label className="flex items-center gap-2 text-sm text-cr-text">
          <input type="checkbox" checked={isAlt} onChange={e => onChange(e.target.checked ? alt.value : [])} />
          {alt.label}
        </label>
      )}
      {!isAlt && (
        <>
          <textarea
            value={brouillon}
            onChange={e => {
              setBrouillon(e.target.value)
              const lignes = e.target.value
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0)
                .slice(0, cardinalite.max)
              onChange(lignes)
            }}
            rows={3}
            placeholder="Un élément par ligne"
            className={champTexte}
          />
          <p className="text-xs text-cr-text-muted">
            {entries.length}/{cardinalite.max} élément(s)
          </p>
        </>
      )}
    </div>
  )
}

export function TexteField({
  options,
  cardinalite,
  value,
  onChange,
}: {
  options?: readonly Option[]
  cardinalite?: Cardinalite
  value: unknown
  onChange: (value: unknown) => void
}) {
  const alt = options?.[0]
  const isAlt = alt !== undefined && value === alt.value

  if (cardinalite) {
    const entries: string[] = Array.isArray(value) ? (value as string[]) : []
    return <ListeTexteField alt={alt} isAlt={isAlt} cardinalite={cardinalite} entries={entries} onChange={onChange} />
  }

  if (alt) {
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-cr-text">
          <input type="checkbox" checked={isAlt} onChange={e => onChange(e.target.checked ? alt.value : '')} />
          {alt.label}
        </label>
        {!isAlt && (
          <textarea
            value={typeof value === 'string' ? value : ''}
            onChange={e => onChange(e.target.value)}
            rows={3}
            className={champTexte}
          />
        )}
      </div>
    )
  }

  return (
    <textarea
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      rows={3}
      className={champTexte}
    />
  )
}

export function ChampFixeField({
  champ,
  value,
  onChange,
}: {
  champ: ChampFixe
  value: unknown
  onChange: (value: unknown) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-cr-text mb-1">{champ.label}</label>
      {champ.aide && <p className="text-xs text-cr-text-muted mb-1">{champ.aide}</p>}
      {champ.formeReponse === 'texte' && (
        <TexteField options={champ.options} cardinalite={champ.cardinalite} value={value} onChange={onChange} />
      )}
      {(champ.formeReponse === 'choix_unique' || champ.formeReponse === 'choix_avec_precision') && (
        <SelectionField options={champ.options ?? []} value={value} onChange={onChange} />
      )}
      {champ.formeReponse === 'multi_selection' && (
        <MultiSelectionField options={champ.options ?? []} cardinalite={champ.cardinalite} value={value} onChange={onChange} />
      )}
    </div>
  )
}
