'use client'

// ============================================================
// MPD V3 — Rendu d'une question du parcours linéaire — T7.10D
// ============================================================
// Mince wrapper autour de QuestionRenderer (T7.4B/T7.8B, inchangé) :
// ne détient JAMAIS de copie de reponses/applicabilité/familyStates
// comme autorité (même correction QG qu'en T7.8B/T7.8E). Après une
// sauvegarde réussie, navigue vers /plan-b/parcours?apres=<stableId
// soumis> — page.tsx + resolution.ts redérivent intégralement, depuis
// l'état serveur frais, la prochaine vue (question suivante de la
// même famille, transition, ou état terminal). Aucune décision de
// navigation métier n'est prise ici — uniquement un fait transmis
// (« j'ai soumis ce stableId »), jamais une conclusion.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { QuestionCanonique } from '@/lib/mpd/canon'
import type { ReponseCourante } from '@/lib/mpd/types-runtime'
import { QuestionRenderer } from '../QuestionRenderer'

interface ParcoursRendererProps {
  readonly locale: string
  readonly dossierId: string
  readonly revision: number
  readonly question: QuestionCanonique
  readonly reponseExistante: ReponseCourante | null
  readonly retourHref: string
  readonly preferredCurrency?: string
}

export function ParcoursRenderer({
  locale,
  dossierId,
  revision,
  question,
  reponseExistante,
  retourHref,
  preferredCurrency,
}: ParcoursRendererProps) {
  const router = useRouter()

  // GO QG (navigation explicite vers le hub) : resolution.ts ne produit
  // `{ kind: 'hub' }` que dans un seul cas précis (construireVueQuestion
  // — la toute première question de F1, confirmé par audit lecture
  // seule) — jamais ailleurs dans la vue 'question'. Comparer la
  // destination déjà calculée au hub est donc une détection fiable de
  // ce cas précis, purement présentationnelle : aucune nouvelle donnée,
  // aucun changement de resolution.ts, aucune duplication de sa logique.
  const hubHref = `/${locale}/plan-b`
  const retourMeneDejaAuHub = retourHref === hubHref

  return (
    <div className="space-y-3">
      {retourMeneDejaAuHub ? (
        // Première question de F1 : une seule destination (le hub) —
        // jamais deux liens qui mèneraient au même endroit.
        <Link href={retourHref} className="text-sm text-cr-text-secondary hover:text-cr-text">
          ← Mon Point de Départ
        </Link>
      ) : (
        <div className="flex items-center gap-3">
          <Link href={retourHref} className="text-sm text-cr-text-secondary hover:text-cr-text">
            ← Retour
          </Link>
          <span className="text-cr-border" aria-hidden="true">
            ·
          </span>
          <Link href={hubHref} className="text-sm text-cr-text-secondary hover:text-cr-text">
            Mon Point de Départ
          </Link>
        </div>
      )}

      <QuestionRenderer
        key={question.stableId}
        locale={locale}
        dossierId={dossierId}
        revision={revision}
        question={question}
        reponseExistante={reponseExistante ?? undefined}
        preferredCurrency={preferredCurrency}
        onSuccess={() => router.push(`/${locale}/plan-b/parcours?apres=${question.stableId}`)}
      />
    </div>
  )
}
