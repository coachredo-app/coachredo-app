'use client'

// ============================================================
// MPD V3 — Modification ciblée au sein d'une famille — T7.8B, réécrit T7.8E
// ============================================================
// Ne pilote plus une marche avant/arrière sur toutes les questions de
// la famille (T7.8B) : pilote UNE question à la fois — celle
// explicitement ciblée par l'utilisateur depuis la page famille, puis,
// si la sauvegarde révèle qu'une intervention reste nécessaire, la
// première question manquante retournée par obtenirEtatApresSauvegarde.
// Ne détient JAMAIS de copie parallèle de reponsesActuelles/
// familyStates comme autorité (correction QG T7.8B, reconduite T7.8E) :
// après chaque sauvegarde, l'état affiché est entièrement redérivé
// depuis une lecture serveur fraîche. Retour quitte toujours vers la
// page famille — plus de navigation séquentielle arrière (GO QG
// T7.8E §11) : un simple lien, aucun appel serveur.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Etape, QuestionCanonique } from '@/lib/mpd/canon'
import type { ReponseCourante } from '@/lib/mpd/types-runtime'
import { QuestionRenderer } from '../../../QuestionRenderer'
import { obtenirEtatApresSauvegarde } from './navigation'

interface FamilyRevisionRendererProps {
  readonly locale: string
  readonly dossierId: string
  readonly revision: number
  readonly etape: Etape
  readonly question: QuestionCanonique
  readonly reponseExistante: ReponseCourante | null
  readonly preferredCurrency?: string
}

export function FamilyRevisionRenderer({
  locale,
  dossierId,
  revision: revisionInitiale,
  etape,
  question: questionInitiale,
  reponseExistante: reponseInitiale,
  preferredCurrency,
}: FamilyRevisionRendererProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [revision, setRevision] = useState(revisionInitiale)
  const [question, setQuestion] = useState(questionInitiale)
  const [reponseExistante, setReponseExistante] = useState(reponseInitiale)

  const urlFamille = `/${locale}/plan-b/famille/${etape}`

  function apresSauvegarde(nouvelleRevision: number) {
    setRevision(nouvelleRevision)
    startTransition(async () => {
      const resultat = await obtenirEtatApresSauvegarde(dossierId, etape)
      if (!resultat.ok || resultat.termine) {
        router.push(urlFamille)
        return
      }
      setQuestion(resultat.question)
      setReponseExistante(resultat.reponseExistante)
    })
  }

  return (
    <div className="space-y-3">
      <Link href={urlFamille} className="text-sm text-cr-text-secondary hover:text-cr-text">
        ← Retour
      </Link>

      <QuestionRenderer
        key={question.stableId}
        locale={locale}
        dossierId={dossierId}
        revision={revision}
        question={question}
        reponseExistante={reponseExistante ?? undefined}
        preferredCurrency={preferredCurrency}
        onSuccess={apresSauvegarde}
      />

      {isPending && <p className="text-xs text-cr-text-muted">Vérification…</p>}
    </div>
  )
}
