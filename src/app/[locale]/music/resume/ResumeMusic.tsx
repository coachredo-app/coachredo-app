'use client'

// Résumé (brief) privé CoachRedo Music V0 — vérification par le client (LOT 3).
// Deux actions seulement : demander une correction, ou valider son histoire.
// - Jeton lu dans le fragment #t= ; conservé en mémoire uniquement ; envoyé
//   seulement dans le CORPS des requêtes (jamais dans une URL, jamais stocké).
// - Chaque action porte le numéro de la version affichée : le serveur refuse
//   toute version qui n'est plus la version courante envoyée.
// - Après validation : lecture seule. La validation démarre le délai de
//   5 jours ouvrés.

import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_CORRECTION, TEXTE_VALIDATION_BRIEF, type EtatBrief } from '@/lib/music/brief'
import s from '../questionnaire/questionnaire.module.css'
import r from './resume.module.css'

const API = '/api/music/resume'
const WHATSAPP = 'https://wa.me/221710491314'
const RE_JETON = /^[A-Za-z0-9_-]{43}$/

type Section = { cle: string; titre: string; texte: string }
type Brief = { etat: EtatBrief; version?: number; sections?: Section[]; correction?: string | null; valide_le?: string | null }
type Phase = 'chargement' | 'lien-invalide' | 'erreur' | 'pret'

async function appeler(corps: Record<string, unknown>) {
  const rep = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  })
  const json = (await rep.json().catch(() => ({}))) as Record<string, unknown>
  return { statut: rep.status, json }
}

function dateLisible(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Dakar' }).format(d)
}

export default function ResumeMusic() {
  const jeton = useRef<string | null>(null)
  const [phase, setPhase] = useState<Phase>('chargement')
  const [brief, setBrief] = useState<Brief | null>(null)
  const [mode, setMode] = useState<'choix' | 'correction'>('choix')
  const [correction, setCorrection] = useState('')
  const [accord, setAccord] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const titreRef = useRef<HTMLHeadingElement>(null)
  // Verrou immédiat (avant même le rendu) : plusieurs appuis rapides = un seul envoi.
  const occupe = useRef(false)

  const charger = useCallback(async () => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get('t')
    if (!t || !RE_JETON.test(t)) { setPhase('lien-invalide'); return }
    jeton.current = t
    try {
      const { statut, json } = await appeler({ action: 'charger', jeton: t })
      if (statut === 404) { setPhase('lien-invalide'); return }
      if (statut !== 200) { setPhase('erreur'); return }
      setBrief(json as unknown as Brief)
      setMode('choix')
      setAccord(false)
      setErreur('')
      setPhase('pret')
      window.scrollTo({ top: 0 })
      requestAnimationFrame(() => titreRef.current?.focus())
    } catch {
      setPhase('erreur')
    }
  }, [])

  useEffect(() => { void charger() }, [charger])

  const agir = async (corps: Record<string, unknown>) => {
    if (occupe.current || !jeton.current || !brief?.version) return
    occupe.current = true
    setEnCours(true)
    setErreur('')
    try {
      const { statut } = await appeler({ ...corps, jeton: jeton.current, version: brief.version })
      if (statut === 200 || statut === 409) { await charger(); return } // 409 : déjà traité ou version mise à jour → état réel
      if (statut === 404) { setPhase('lien-invalide'); return }
      setErreur('Votre réponse n’a pas pu être enregistrée. Vérifiez votre connexion, puis réessayez.')
    } catch {
      setErreur('Votre réponse n’a pas pu être enregistrée. Vérifiez votre connexion, puis réessayez.')
    } finally {
      occupe.current = false
      setEnCours(false)
    }
  }

  const valider = () => {
    if (!accord) { setErreur('Cochez la case pour confirmer avant de valider.'); return }
    void agir({ action: 'valider', consentement: true })
  }
  const envoyerCorrection = () => {
    if (correction.trim() === '') { setErreur('Décrivez ce que vous aimeriez corriger ou préciser.'); return }
    void agir({ action: 'corriger', correction })
  }

  if (phase === 'chargement') {
    return <main className={s.page}><p className={s.centre} role="status">Chargement de votre résumé…</p></main>
  }
  if (phase === 'lien-invalide' || phase === 'erreur') {
    return (
      <main className={s.page}>
        <Marque />
        <section className={s.carte} aria-live="polite">
          <h1 className={s.titre}>{phase === 'erreur' ? 'Connexion impossible pour le moment' : 'Ce lien n’est pas valide'}</h1>
          {phase === 'erreur' ? (
            <>
              <p className={s.texte}>Votre résumé n’a pas pu être chargé. Vérifiez votre connexion, puis réessayez.</p>
              <button type="button" className={s.btnPrincipal} onClick={() => { setPhase('chargement'); void charger() }}>Réessayer</button>
            </>
          ) : (
            <>
              <p className={s.texte}>Il a peut-être expiré ou été remplacé par un lien plus récent. Écrivez-nous sur WhatsApp : nous vous enverrons votre lien personnel.</p>
              <a className={s.btnSecondaire} href={WHATSAPP} target="_blank" rel="noopener noreferrer">Écrire à CoachRedo Music sur WhatsApp</a>
            </>
          )}
        </section>
      </main>
    )
  }
  if (!brief) return null

  if (brief.etat === 'en_preparation') {
    return (
      <main className={s.page}>
        <Marque />
        <section className={s.carte} data-etat="en_preparation">
          <h1 className={s.titre} ref={titreRef} tabIndex={-1}>Votre résumé est en préparation</h1>
          <p className={s.texte}>Nous préparons le résumé de votre histoire. Nous vous enverrons un lien dès qu’il sera prêt à être vérifié.</p>
          <p className={s.aide}>La création de votre chanson ne commence qu’après votre validation du résumé.</p>
        </section>
      </main>
    )
  }

  const sections = brief.sections ?? []

  if (brief.etat === 'valide') {
    return (
      <main className={s.page}>
        <Marque />
        <section className={s.carte} data-etat="valide" aria-live="polite">
          <h1 className={s.titre} ref={titreRef} tabIndex={-1}>Merci, votre histoire est validée ❤️</h1>
          <p className={s.texte}>Nous commençons la création de votre chanson.</p>
          <p className={s.texte} data-delai>Le délai de 5 jours ouvrés démarre à partir de cette validation{brief.valide_le ? `, le ${dateLisible(brief.valide_le)}` : ''}.</p>
          <p className={s.aide}>Votre résumé est désormais verrouillé. Pour toute question, écrivez-nous sur WhatsApp.</p>
        </section>
        <h2 className={s.sousTitre}>Votre histoire validée</h2>
        <Sections sections={sections} />
      </main>
    )
  }

  if (brief.etat === 'correction_demandee') {
    return (
      <main className={s.page}>
        <Marque />
        <section className={s.carte} data-etat="correction_demandee" aria-live="polite">
          <h1 className={s.titre} ref={titreRef} tabIndex={-1}>Merci, votre demande de correction est bien reçue</h1>
          {brief.correction && <blockquote className={r.citation} data-correction>{brief.correction}</blockquote>}
          <p className={s.texte}>Nous allons corriger votre résumé et vous envoyer une nouvelle version à vérifier.</p>
          <p className={s.aide}>La création de votre chanson ne commence qu’après votre validation.</p>
        </section>
        <h2 className={s.sousTitre}>Résumé en cours de correction</h2>
        <Sections sections={sections} />
      </main>
    )
  }

  // a_valider
  return (
    <main className={s.page}>
      <Marque />
      <h1 className={s.titre} ref={titreRef} tabIndex={-1}>Vérifiez votre histoire</h1>
      <p className={`${s.texte} ${r.intro}`}>Nous avons préparé ce résumé à partir de vos réponses. Relisez-le attentivement avant que nous commencions la création de votre chanson.</p>

      <Sections sections={sections} />

      <section className={r.actions} data-actions>
        {mode === 'choix' ? (
          <>
            <h2 className={s.sousTitre}>Tout est juste ?</h2>
            <label className={s.consentement}>
              <input type="checkbox" checked={accord} onChange={(e) => { setAccord(e.target.checked); setErreur('') }} data-accord />
              <span>{TEXTE_VALIDATION_BRIEF}</span>
            </label>
            {erreur && <p className={s.erreurs} role="alert" data-erreur>{erreur}</p>}
            <button type="button" className={s.btnPrincipal} onClick={valider} disabled={enCours} aria-busy={enCours} data-valider>
              {enCours ? 'Validation en cours…' : 'Valider mon histoire'}
            </button>
            <p className={r.ou}>Quelque chose n’est pas exact ?</p>
            <button type="button" className={s.btnSecondaire} onClick={() => { setMode('correction'); setErreur('') }} data-demander-correction>
              Demander une correction
            </button>
          </>
        ) : (
          <>
            <h2 className={s.sousTitre}>Demander une correction</h2>
            <div className={s.champ}>
              <label htmlFor="correction" className={s.question}>Qu’aimeriez-vous corriger ou préciser ?</label>
              <p className={s.aide}>Indiquez uniquement ce qui doit être corrigé : un prénom, un souvenir, un détail, une préférence…</p>
              <textarea id="correction" className={s.saisie} rows={5} maxLength={MAX_CORRECTION} value={correction}
                onChange={(e) => { setCorrection(e.target.value); setErreur('') }} data-champ-correction />
            </div>
            {erreur && <p className={s.erreurs} role="alert" data-erreur>{erreur}</p>}
            <div className={s.navigation}>
              <button type="button" className={s.btnRetour} onClick={() => { setMode('choix'); setErreur('') }} data-retour>Retour</button>
              <button type="button" className={s.btnPrincipal} onClick={envoyerCorrection} disabled={enCours} aria-busy={enCours} data-envoyer-correction>
                {enCours ? 'Envoi…' : 'Envoyer ma demande'}
              </button>
            </div>
            <p className={s.aide}>Votre résumé ne sera pas validé : nous vous enverrons une version corrigée à vérifier.</p>
          </>
        )}
      </section>
    </main>
  )
}

function Marque() {
  return <p className={s.marque}>CoachRedo <span>Music</span></p>
}

function Sections({ sections }: { sections: Section[] }) {
  return (
    <div className={s.recap} data-sections>
      {sections.map((x) => (
        <section key={x.cle} className={s.recapSection} data-section={x.cle}>
          <div className={s.recapEntete}><h3>{x.titre}</h3></div>
          <p className={r.texteSection}>{x.texte}</p>
        </section>
      ))}
    </div>
  )
}
