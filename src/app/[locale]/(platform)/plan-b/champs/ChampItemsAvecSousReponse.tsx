'use client'

import { useState } from 'react'
import type { QuestionCanonique, ItemsAvecSousReponse } from '@/lib/mpd/canon'
import { normaliserChampsFixesLegacy } from '@/lib/mpd/engine/compatibilite'
import { ChampFixeField, SelectionField } from './core'

type StructureListeDeclaree = Extract<ItemsAvecSousReponse, { motif: 'liste_declaree' }>
type StructureBranches = Extract<ItemsAvecSousReponse, { motif: 'branches_par_option' }>

interface Props {
  question: QuestionCanonique
  value: unknown
  onChange: (value: unknown) => void
}

export function ChampItemsAvecSousReponse({ question, value, onChange }: Props) {
  const structure = question.itemsAvecSousReponse
  if (!structure) return null

  if (structure.motif === 'champs_fixes') {
    // Lot B (anomalie 7, Q4) : une ancienne réponse (tableau brut, avant
    // la collecte réelle du caractère habituel de la semaine) reste
    // pré-remplissable — jamais une valeur inventée pour le(s) champ(s)
    // manquant(s).
    const normalise = normaliserChampsFixesLegacy(structure.champs, value)
    const obj =
      typeof normalise === 'object' && normalise !== null && !Array.isArray(normalise)
        ? (normalise as Record<string, unknown>)
        : {}
    return (
      <div className="space-y-4">
        {structure.champs.map(champ => (
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

  if (structure.motif === 'liste_declaree') {
    return <ListeDeclareeField question={question} structure={structure} value={value} onChange={onChange} />
  }

  return <BranchesParOptionField question={question} structure={structure} value={value} onChange={onChange} />
}

function ListeDeclareeField({
  question,
  structure,
  value,
  onChange,
}: {
  question: QuestionCanonique
  structure: StructureListeDeclaree
  value: unknown
  onChange: (v: unknown) => void
}) {
  const alt = question.options?.[0]
  const isAlt = alt !== undefined && value === alt.value
  const entries = Array.isArray(value) ? (value as Array<{ item: string; sousReponse: unknown }>) : []
  const [nouvelItem, setNouvelItem] = useState('')

  function ajouter() {
    const texte = nouvelItem.trim()
    if (!texte || entries.length >= structure.cardinalite.max) return
    onChange([...entries, { item: texte, sousReponse: undefined }])
    setNouvelItem('')
  }

  function retirer(index: number) {
    onChange(entries.filter((_, i) => i !== index))
  }

  function majSousReponse(index: number, sousReponse: unknown) {
    onChange(entries.map((e, i) => (i === index ? { ...e, sousReponse } : e)))
  }

  return (
    <div className="space-y-3">
      {alt && (
        <label className="flex items-center gap-2 text-sm text-cr-text">
          <input type="checkbox" checked={isAlt} onChange={e => onChange(e.target.checked ? alt.value : [])} />
          {alt.label}
        </label>
      )}
      {!isAlt && (
        <>
          {entries.map((entree, index) => (
            <div key={index} className="rounded-lg border border-cr-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-cr-text">{entree.item}</p>
                <button type="button" onClick={() => retirer(index)} className="text-xs text-red-600">
                  Retirer
                </button>
              </div>
              <ChampFixeField
                champ={structure.sousReponse}
                value={entree.sousReponse}
                onChange={v => majSousReponse(index, v)}
              />
            </div>
          ))}
          {entries.length < structure.cardinalite.max && (
            <div className="flex gap-2">
              <input
                type="text"
                value={nouvelItem}
                onChange={e => setNouvelItem(e.target.value)}
                className="flex-1 rounded-lg border border-cr-border px-3 py-2 text-sm"
                placeholder="Ajouter un élément"
              />
              <button
                type="button"
                onClick={ajouter}
                className="px-3 py-2 rounded-lg border border-cr-border text-sm text-cr-text"
              >
                Ajouter
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function BranchesParOptionField({
  question,
  structure,
  value,
  onChange,
}: {
  question: QuestionCanonique
  structure: StructureBranches
  value: unknown
  onChange: (v: unknown) => void
}) {
  const obj =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as { value?: string; precision?: unknown; champs?: Record<string, unknown> })
      : {}
  const options = question.options ?? []
  const branche = obj.value ? structure.branches[obj.value] : undefined

  return (
    <div className="space-y-3">
      <SelectionField
        options={options}
        value={obj.value !== undefined ? { value: obj.value, precision: obj.precision } : undefined}
        onChange={v => {
          const selection = v as { value: string; precision?: unknown }
          onChange({ value: selection.value, precision: selection.precision, champs: undefined })
        }}
      />
      {branche && (
        <div className="space-y-3 pl-4 border-l-2 border-cr-border">
          {branche.map(champ => (
            <ChampFixeField
              key={champ.id}
              champ={champ}
              value={obj.champs?.[champ.id]}
              onChange={v => onChange({ ...obj, champs: { ...(obj.champs ?? {}), [champ.id]: v } })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
