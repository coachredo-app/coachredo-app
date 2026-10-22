'use client'

// Questionnaire privé CoachRedo Music V0 — 8 étapes (LOT 2, D-058).
// - Jeton lu dans le fragment #t= ; conservé en mémoire uniquement ; envoyé
//   seulement dans le CORPS des requêtes (jamais dans une URL, jamais stocké).
// - Brouillon sauvegardé sur le serveur à chaque changement d'étape, après
//   une courte pause de saisie, et à la mise en arrière-plan de la page.
// - Après l'envoi définitif : lecture seule.
// La validation affichée ici guide le client ; le serveur revalide tout.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AMBIANCES,
  ASPECTS_INSPIRATION,
  DE_LA_PART,
  EMOTIONS,
  LIMITES,
  MAX_SOUVENIRS_SUPPLEMENTAIRES,
  NB_ETAPES,
  OUI_NON,
  STYLES,
  TEXTE_CONSENTEMENT,
  VOIX,
  reponsesVides,
  validerReponses,
  type CleDetail,
  type Reponses,
} from '@/lib/music/questionnaire'
import { URL_CGV, URL_CONFIDENTIALITE } from '@/lib/music/legal'
import s from './questionnaire.module.css'

const API = '/api/music/questionnaire'
const WHATSAPP = 'https://wa.me/221710491314'
const RE_JETON = /^[A-Za-z0-9_-]{43}$/
const DELAI_SAUVEGARDE_MS = 1500

type Commande = { beneficiaire_prenom: string; relation: string | null; relation_autre: string | null; occasion: string | null }
type Phase = 'chargement' | 'lien-invalide' | 'erreur' | 'questionnaire' | 'envoye'
type EtatSauvegarde = 'ok' | 'en-cours' | 'echec' | null

const TITRES = [
  'Pour qui est cette chanson ?',
  'Un souvenir important',
  'Les petits détails',
  'Ce que vous voulez vraiment lui dire',
  'Imaginez la chanson',
  'Une chanson qui vous inspire ?',
  'Vérification',
  'Votre histoire est prête ❤️',
]

const MESSAGES: Record<string, string> = {
  'etape1.de_la_part:requis': 'Choisissez une réponse.',
  'etape1.de_la_part_qui:requis': 'Indiquez de la part de qui est la chanson.',
  'etape2.souvenir_principal:requis': 'Racontez au moins un souvenir, avec vos mots.',
  'etape4.message:requis': 'Écrivez ce que vous aimeriez lui dire.',
  'etape4.emotions:requis': 'Choisissez au moins une émotion.',
  'etape4.emotion_principale:requis': 'Indiquez l’émotion la plus importante.',
  'etape4.emotion_principale:incoherente': 'Indiquez l’émotion la plus importante.',
  'etape4.emotion_autre:requis': 'Précisez l’émotion recherchée.',
  'etape5.ambiance:requis': 'Choisissez une ambiance.',
  'etape5.voix:requis': 'Choisissez une voix.',
  'etape5.style_autre:requis': 'Précisez le style souhaité.',
  'etape6.titre_ou_lien:requis': 'Indiquez le titre et l’artiste, ou collez un lien.',
  'etape6.lien:format': 'Le lien doit être un lien YouTube ou Spotify commençant par https://',
}

function messageErreur(code: string): string {
  if (MESSAGES[code]) return MESSAGES[code]
  if (code.endsWith(':longueur')) return 'Ce texte est trop long.'
  return 'Une réponse n’est pas valide.'
}

/** Erreurs bloquantes d'une étape (champs obligatoires, format). */
function erreursEtape(r: Reponses, etape: number): string[] {
  if (etape < 1 || etape > 6) return []
  const v = validerReponses(r, 'envoi')
  return v.ok ? [] : v.erreurs.filter((e) => e.startsWith('etape' + etape + '.'))
}

async function appeler(corps: Record<string, unknown>, keepalive = false) {
  const rep = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    keepalive,
  })
  const json = (await rep.json().catch(() => ({}))) as Record<string, unknown>
  return { statut: rep.status, json }
}

export default function QuestionnaireMusic() {
  const jeton = useRef<string | null>(null)
  const [phase, setPhase] = useState<Phase>('chargement')
  const [commande, setCommande] = useState<Commande | null>(null)
  const [reference, setReference] = useState('')
  const [r, setR] = useState<Reponses>(reponsesVides)
  const [etape, setEtape] = useState(1)
  const [erreurs, setErreurs] = useState<string[]>([])
  const [consentement, setConsentement] = useState(false)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreurEnvoi, setErreurEnvoi] = useState('')
  const [sauvegarde, setSauvegarde] = useState<EtatSauvegarde>(null)
  const titreRef = useRef<HTMLHeadingElement>(null)

  // Sauvegarde : une seule requête à la fois, toujours avec la dernière version.
  const dernier = useRef<Reponses>(r)
  const modifie = useRef(false)
  const enVol = useRef(false)
  const relance = useRef(false)
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null)
  const verrouille = useRef(false)
  // Verrou immédiat (avant même le rendu) : plusieurs appuis rapides = un seul envoi.
  const envoiOccupe = useRef(false)

  const prenom = commande?.beneficiaire_prenom ?? ''

  const charger = useCallback(async () => {
    setPhase('chargement')
    const t = new URLSearchParams(window.location.hash.slice(1)).get('t')
    if (!t || !RE_JETON.test(t)) { setPhase('lien-invalide'); return }
    jeton.current = t
    try {
      const { statut, json } = await appeler({ action: 'charger', jeton: t })
      if (statut === 404) { setPhase('lien-invalide'); return }
      if (statut !== 200) { setPhase('erreur'); return }
      const rep = json.reponses as Reponses
      setCommande(json.commande as Commande)
      setReference(String(json.reference ?? ''))
      setR(rep)
      dernier.current = rep
      if (json.envoye_le) {
        verrouille.current = true
        setPhase('envoye')
      } else {
        setEtape(Math.min(Math.max(rep.etape_courante || 1, 1), NB_ETAPES))
        setPhase('questionnaire')
      }
    } catch {
      setPhase('erreur')
    }
  }, [])

  useEffect(() => { void charger() }, [charger])

  const sauvegarder = useCallback(async (keepalive = false) => {
    if (verrouille.current || !jeton.current || !modifie.current) return
    if (enVol.current) { relance.current = true; return }
    enVol.current = true
    modifie.current = false
    setSauvegarde('en-cours')
    try {
      const { statut } = await appeler({ action: 'brouillon', jeton: jeton.current, reponses: dernier.current }, keepalive)
      if (statut === 200) setSauvegarde('ok')
      else if (statut === 409) { verrouille.current = true; void charger() }
      else if (statut === 404) { verrouille.current = true; setPhase('lien-invalide') }
      else { modifie.current = true; setSauvegarde('echec') }
    } catch {
      modifie.current = true
      setSauvegarde('echec')
    } finally {
      enVol.current = false
      if (relance.current) { relance.current = false; void sauvegarder() }
    }
  }, [charger])

  const planifier = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current)
    minuteur.current = setTimeout(() => { void sauvegarder() }, DELAI_SAUVEGARDE_MS)
  }, [sauvegarder])

  // Mise en arrière-plan (changement d'application, fermeture) : sauvegarde immédiate.
  useEffect(() => {
    const auMasquage = () => { if (document.visibilityState === 'hidden') void sauvegarder(true) }
    window.addEventListener('pagehide', auMasquage)
    document.addEventListener('visibilitychange', auMasquage)
    return () => {
      window.removeEventListener('pagehide', auMasquage)
      document.removeEventListener('visibilitychange', auMasquage)
    }
  }, [sauvegarder])

  const maj = useCallback((f: (x: Reponses) => Reponses) => {
    setR((avant) => {
      const apres = f(avant)
      dernier.current = apres
      return apres
    })
    modifie.current = true
    setErreurs([])
    planifier()
  }, [planifier])

  const allerA = useCallback((n: number) => {
    const cible = Math.min(Math.max(n, 1), NB_ETAPES)
    setErreurs([])
    setErreurEnvoi('')
    setEtape(cible)
    dernier.current = { ...dernier.current, etape_courante: cible }
    setR(dernier.current)
    modifie.current = true
    if (minuteur.current) clearTimeout(minuteur.current)
    void sauvegarder()
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => titreRef.current?.focus())
  }, [sauvegarder])

  const continuer = () => {
    const e = erreursEtape(r, etape)
    if (e.length) { setErreurs(e); return }
    allerA(etape + 1)
  }

  const envoyer = async () => {
    if (envoiOccupe.current || !jeton.current) return
    if (!consentement) { setErreurEnvoi('Cochez la case pour confirmer votre accord avant d’envoyer.'); return }
    envoiOccupe.current = true
    setEnvoiEnCours(true)
    setErreurEnvoi('')
    if (minuteur.current) clearTimeout(minuteur.current)
    try {
      const { statut, json } = await appeler({ action: 'envoyer', jeton: jeton.current, reponses: dernier.current, consentement: true })
      if (statut === 200 || statut === 409) {
        verrouille.current = true
        await charger()
        return
      }
      if (statut === 404) { setPhase('lien-invalide'); return }
      if (statut === 400 && Array.isArray(json.champs)) {
        const champs = json.champs as string[]
        const m = /^etape(\d)\./.exec(champs[0] ?? '')
        if (m) { allerA(Number(m[1])); setErreurs(champs.filter((c) => c.startsWith('etape' + m[1] + '.'))); return }
      }
      setErreurEnvoi('L’envoi n’a pas abouti. Vos réponses sont conservées : vérifiez votre connexion puis réessayez.')
    } catch {
      setErreurEnvoi('L’envoi n’a pas abouti. Vos réponses sont conservées : vérifiez votre connexion puis réessayez.')
    } finally {
      envoiOccupe.current = false
      setEnvoiEnCours(false)
    }
  }

  if (phase === 'chargement') {
    return <main className={s.page}><p className={s.centre} role="status">Chargement de votre questionnaire…</p></main>
  }
  if (phase === 'lien-invalide' || phase === 'erreur') {
    return (
      <main className={s.page}>
        <Marque />
        <section className={s.carte} aria-live="polite">
          <h1 className={s.titre}>{phase === 'erreur' ? 'Connexion impossible pour le moment' : 'Ce lien n’est pas valide'}</h1>
          {phase === 'erreur' ? (
            <>
              <p className={s.texte}>Votre questionnaire n’a pas pu être chargé. Vérifiez votre connexion, puis réessayez.</p>
              <button type="button" className={s.btnPrincipal} onClick={() => void charger()}>Réessayer</button>
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
  if (phase === 'envoye' && commande) {
    return (
      <main className={s.page}>
        <Marque />
        <section className={s.carte} aria-live="polite">
          <h1 className={s.titre} data-confirmation>Merci, votre histoire est bien arrivée ❤️</h1>
          <p className={s.texte}>CoachRedo Music va maintenant préparer un résumé de votre histoire. Vous pourrez le relire avant la création de votre chanson.</p>
          <p className={s.aide}>Vos réponses sont enregistrées et ne peuvent plus être modifiées depuis ce lien. Pour toute question, écrivez-nous sur WhatsApp{reference ? ` en indiquant votre référence ${reference}` : ''}.</p>
        </section>
        <h2 className={s.sousTitre}>Vos réponses</h2>
        <Recapitulatif r={r} commande={commande} />
      </main>
    )
  }
  if (!commande) return null

  const pct = Math.round((etape / NB_ETAPES) * 100)

  return (
    <main className={s.page}>
      <Marque />
      <div className={s.progression}>
        <p className={s.progressionTexte}>Étape {etape} sur {NB_ETAPES}</p>
        <div className={s.barre} role="progressbar" aria-valuemin={1} aria-valuemax={NB_ETAPES} aria-valuenow={etape} aria-label={`Étape ${etape} sur ${NB_ETAPES}`}>
          <span style={{ width: pct + '%' }} />
        </div>
      </div>

      <form
        className={s.etape}
        data-etape={etape}
        noValidate
        onSubmit={(e) => { e.preventDefault(); if (etape < NB_ETAPES) continuer(); else void envoyer() }}
      >
        <h1 className={s.titre} ref={titreRef} tabIndex={-1}>{titreEtape(etape, prenom)}</h1>

        {etape === 1 && <Etape1 r={r} maj={maj} commande={commande} />}
        {etape === 2 && <Etape2 r={r} maj={maj} prenom={prenom} />}
        {etape === 3 && <Etape3 r={r} maj={maj} prenom={prenom} />}
        {etape === 4 && <Etape4 r={r} maj={maj} prenom={prenom} />}
        {etape === 5 && <Etape5 r={r} maj={maj} />}
        {etape === 6 && <Etape6 r={r} maj={maj} />}
        {etape === 7 && (
          <>
            <p className={s.texte}>Relisez tranquillement. Vous pouvez encore tout modifier : rien n’est envoyé pour l’instant.</p>
            <Recapitulatif r={r} commande={commande} modifier={allerA} />
          </>
        )}
        {etape === 8 && (
          <>
            <p className={s.texte}>Merci d’avoir partagé tout cela. Dernière étape : votre accord, puis l’envoi.</p>
            <label className={s.consentement}>
              <input type="checkbox" checked={consentement} onChange={(e) => { setConsentement(e.target.checked); setErreurEnvoi('') }} data-consentement />
              <span>{TEXTE_CONSENTEMENT}</span>
            </label>
            <p className={s.aide} data-liens-legaux>
              Consultez la <a className={s.lienLegal} href={URL_CONFIDENTIALITE} target="_blank" rel="noopener noreferrer">politique de confidentialité</a> et
              les <a className={s.lienLegal} href={URL_CGV} target="_blank" rel="noopener noreferrer">conditions générales de vente</a>.
            </p>
            <p className={s.aide}>Une fois envoyées, vos réponses ne pourront plus être modifiées depuis ce lien.</p>
          </>
        )}

        {erreurs.length > 0 && (
          <div className={s.erreurs} role="alert" data-erreurs>
            {[...new Set(erreurs.map(messageErreur))].map((m) => <p key={m}>{m}</p>)}
          </div>
        )}
        {erreurEnvoi && <p className={s.erreurs} role="alert" data-erreur-envoi>{erreurEnvoi}</p>}

        <div className={s.navigation}>
          {etape > 1 && (
            <button type="button" className={s.btnRetour} onClick={() => allerA(etape - 1)} data-precedent>Précédent</button>
          )}
          {etape < NB_ETAPES ? (
            <button type="submit" className={s.btnPrincipal} data-continuer>{etape === 7 ? 'Tout est correct' : 'Continuer'}</button>
          ) : (
            <button type="submit" className={s.btnPrincipal} disabled={envoiEnCours} aria-busy={envoiEnCours} data-envoyer>
              {envoiEnCours ? 'Envoi en cours…' : 'Envoyer mon histoire à CoachRedo Music'}
            </button>
          )}
        </div>
        <p className={s.sauvegarde} aria-live="polite" data-sauvegarde={sauvegarde ?? ''}>
          {sauvegarde === 'en-cours' && 'Enregistrement…'}
          {sauvegarde === 'ok' && 'Vos réponses sont enregistrées. Vous pouvez revenir plus tard avec le même lien.'}
          {sauvegarde === 'echec' && 'Connexion instable : vos réponses seront enregistrées dès que possible.'}
        </p>
      </form>
    </main>
  )
}

function Marque() {
  return <p className={s.marque}>CoachRedo <span>Music</span></p>
}

function titreEtape(etape: number, prenom: string) {
  if (etape === 4) return 'Ce que vous voulez vraiment dire à ' + prenom
  return TITRES[etape - 1]
}

function relationLisible(c: Commande) {
  return c.relation === 'Autre' ? (c.relation_autre ?? 'Autre') : (c.relation ?? '')
}

type PropsEtape = { r: Reponses; maj: (f: (x: Reponses) => Reponses) => void }

/* ── Composants de saisie ── */

function Choix({ nom, options, valeur, onChange, legende, facultatif }: {
  nom: string; options: readonly string[]; valeur: string; onChange: (v: string) => void; legende: string; facultatif?: boolean
}) {
  return (
    <fieldset className={s.groupe}>
      <legend className={s.question}>{legende}{facultatif && <span className={s.facultatif}> (facultatif)</span>}</legend>
      <div className={s.options}>
        {options.map((o) => (
          <label key={o} className={s.option} data-actif={valeur === o}>
            <input type="radio" name={nom} value={o} checked={valeur === o} onChange={() => onChange(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function ChoixMultiples({ nom, options, valeurs, onChange, legende, aide }: {
  nom: string; options: readonly string[]; valeurs: string[]; onChange: (v: string[]) => void; legende: string; aide?: string
}) {
  return (
    <fieldset className={s.groupe}>
      <legend className={s.question}>{legende}</legend>
      {aide && <p className={s.aide}>{aide}</p>}
      <div className={s.options}>
        {options.map((o) => {
          const actif = valeurs.includes(o)
          return (
            <label key={o} className={s.option} data-actif={actif}>
              <input type="checkbox" name={nom} value={o} checked={actif}
                onChange={() => onChange(actif ? valeurs.filter((x) => x !== o) : options.filter((x) => x === o || valeurs.includes(x)))} />
              <span>{o}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function Texte({ id, label, valeur, onChange, max, lignes, aide, facultatif, placeholder, type }: {
  id: string; label: string; valeur: string; onChange: (v: string) => void; max: number; lignes?: number
  aide?: React.ReactNode; facultatif?: boolean; placeholder?: string; type?: 'url'
}) {
  return (
    <div className={s.champ}>
      <label htmlFor={id} className={s.question}>{label}{facultatif && <span className={s.facultatif}> (facultatif)</span>}</label>
      {aide && <div className={s.aide}>{aide}</div>}
      {lignes ? (
        <textarea id={id} className={s.saisie} rows={lignes} maxLength={max} value={valeur} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className={s.saisie} type={type ?? 'text'} inputMode={type === 'url' ? 'url' : undefined}
          autoCapitalize={type === 'url' ? 'none' : 'sentences'} autoCorrect={type === 'url' ? 'off' : undefined}
          maxLength={max} value={valeur} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {lignes && valeur.length > max * 0.8 && <p className={s.compteur}>{valeur.length} / {max}</p>}
    </div>
  )
}

/* ── Étapes ── */

function Etape1({ r, maj, commande }: PropsEtape & { commande: Commande }) {
  return (
    <>
      <dl className={s.prerempli} data-prerempli>
        <div><dt>Pour</dt><dd>{commande.beneficiaire_prenom}</dd></div>
        <div><dt>Qui est-ce pour vous ?</dt><dd>{relationLisible(commande)}</dd></div>
        {commande.occasion && <div><dt>Occasion</dt><dd>{commande.occasion}</dd></div>}
      </dl>
      <p className={s.aide}>Ces informations viennent de votre commande. Une erreur ? Signalez-la-nous sur WhatsApp.</p>
      <Choix nom="de_la_part" legende="Cette chanson est de la part de qui ?" options={DE_LA_PART} valeur={r.etape1.de_la_part}
        onChange={(v) => maj((x) => ({ ...x, etape1: { ...x.etape1, de_la_part: v } }))} />
      {r.etape1.de_la_part === 'Plusieurs personnes' && (
        <Texte id="de-la-part-qui" label="De la part de qui ?" max={LIMITES.deLaPartQui} valeur={r.etape1.de_la_part_qui}
          placeholder="Par exemple : ses enfants Awa, Moussa et Cheikh"
          onChange={(v) => maj((x) => ({ ...x, etape1: { ...x.etape1, de_la_part_qui: v } }))} />
      )}
    </>
  )
}

function Etape2({ r, maj, prenom }: PropsEtape & { prenom: string }) {
  const sup = r.etape2.souvenirs_supplementaires
  const majSup = (liste: string[]) => maj((x) => ({ ...x, etape2: { ...x.etape2, souvenirs_supplementaires: liste } }))
  return (
    <>
      <Texte id="souvenir-principal" label={`Quel souvenir avec ${prenom} vous vient en premier ?`} lignes={6} max={LIMITES.souvenir}
        valeur={r.etape2.souvenir_principal}
        onChange={(v) => maj((x) => ({ ...x, etape2: { ...x.etape2, souvenir_principal: v } }))}
        aide={<>
          <p>Racontez-le simplement, avec vos mots, comme à un ami. Par exemple :</p>
          <ul className={s.exemples}>
            <li>un voyage ou des vacances ;</li>
            <li>un repas ou une fête ;</li>
            <li>une discussion ;</li>
            <li>un souvenir d’enfance ;</li>
            <li>quelque chose que cette personne faisait souvent ;</li>
            <li>un moment du quotidien.</li>
          </ul>
        </>} />
      {sup.map((v, i) => (
        <div key={i} className={s.souvenirSup}>
          <Texte id={`souvenir-sup-${i}`} label={`Un autre souvenir`} facultatif lignes={4} max={LIMITES.souvenir} valeur={v}
            onChange={(t) => majSup(sup.map((x, j) => (j === i ? t : x)))} />
          <button type="button" className={s.lienAction} onClick={() => majSup(sup.filter((_, j) => j !== i))}>Retirer ce souvenir</button>
        </div>
      ))}
      {sup.length < MAX_SOUVENIRS_SUPPLEMENTAIRES && (
        <button type="button" className={s.btnAjout} onClick={() => majSup([...sup, ''])} data-ajout-souvenir>
          + Ajouter un autre souvenir (facultatif)
        </button>
      )}
      <p className={s.aide}>Un seul souvenir suffit. N’en ajoutez d’autres que s’ils vous viennent naturellement.</p>
    </>
  )
}

function Etape3({ r, maj, prenom }: PropsEtape & { prenom: string }) {
  const champs: { cle: CleDetail; label: string; placeholder?: string }[] = [
    { cle: 'expression', label: `Une phrase ou une expression que ${prenom} dit souvent` },
    { cle: 'surnom', label: 'Un surnom' },
    { cle: 'habitude', label: 'Une habitude ou un geste' },
    { cle: 'lieu', label: 'Un lieu important' },
    { cle: 'chose_aimee', label: `Un plat, une activité ou une chose que ${prenom} aime` },
    { cle: 'tradition', label: 'Une tradition' },
    { cle: 'autre', label: 'Un autre petit détail personnel' },
  ]
  return (
    <>
      <p className={s.question}>{`Qu’est-ce qui vous fait immédiatement penser à ${prenom} ?`}</p>
      <p className={s.aide}>Tout est facultatif : remplissez seulement ce qui vous parle. Ces petits détails rendent la chanson unique.</p>
      {champs.map((c) => (
        <Texte key={c.cle} id={`detail-${c.cle}`} label={c.label} max={LIMITES.detail} valeur={r.etape3[c.cle]}
          onChange={(v) => maj((x) => ({ ...x, etape3: { ...x.etape3, [c.cle]: v } }))} />
      ))}
    </>
  )
}

function Etape4({ r, maj, prenom }: PropsEtape & { prenom: string }) {
  const e = r.etape4
  const majE = (p: Partial<Reponses['etape4']>) => maj((x) => {
    const n = { ...x.etape4, ...p }
    // Une seule émotion : c'est la principale. Passage à plusieurs : le client
    // désigne lui-même la principale (aucune présélection implicite).
    if (n.emotions.length === 1) n.emotion_principale = n.emotions[0]
    else if (x.etape4.emotions.length <= 1 && n.emotions.length > 1) n.emotion_principale = ''
    else if (!n.emotions.includes(n.emotion_principale)) n.emotion_principale = ''
    return { ...x, etape4: n }
  })
  return (
    <>
      <Texte id="message" label={`Si cette chanson ne pouvait dire qu’une seule chose à ${prenom}, qu’aimeriez-vous lui dire ?`}
        lignes={5} max={LIMITES.message} valeur={e.message} onChange={(v) => majE({ message: v })} />
      <ChoixMultiples nom="emotions" legende={`Que voulez-vous que ${prenom} ressente en l’écoutant ?`} aide="Vous pouvez en choisir plusieurs."
        options={EMOTIONS} valeurs={e.emotions} onChange={(v) => majE({ emotions: v })} />
      {e.emotions.includes('Autre') && (
        <Texte id="emotion-autre" label="Quelle autre émotion ?" max={LIMITES.court} valeur={e.emotion_autre} onChange={(v) => majE({ emotion_autre: v })} />
      )}
      {e.emotions.length > 1 && (
        <Choix nom="emotion_principale" legende="Laquelle compte le plus ?" options={e.emotions} valeur={e.emotion_principale}
          onChange={(v) => majE({ emotion_principale: v })} />
      )}
    </>
  )
}

function Etape5({ r, maj }: PropsEtape) {
  const e = r.etape5
  const majE = (p: Partial<Reponses['etape5']>) => maj((x) => ({ ...x, etape5: { ...x.etape5, ...p } }))
  return (
    <>
      <p className={s.aide}>Aucune connaissance musicale n’est nécessaire. Dans le doute, laissez-nous choisir.</p>
      <Choix nom="ambiance" legende="Quelle ambiance pour la chanson ?" options={AMBIANCES} valeur={e.ambiance} onChange={(v) => majE({ ambiance: v })} />
      <Choix nom="style" legende="Un style de musique ?" facultatif options={STYLES} valeur={e.style} onChange={(v) => majE({ style: v })} />
      {e.style === 'Autre' && (
        <Texte id="style-autre" label="Quel style ?" max={LIMITES.court} valeur={e.style_autre} onChange={(v) => majE({ style_autre: v })} />
      )}
      <Choix nom="voix" legende="Plutôt une voix…" options={VOIX} valeur={e.voix} onChange={(v) => majE({ voix: v })} />
    </>
  )
}

function Etape6({ r, maj }: PropsEtape) {
  const e = r.etape6
  const majE = (p: Partial<Reponses['etape6']>) => maj((x) => ({ ...x, etape6: { ...x.etape6, ...p } }))
  return (
    <>
      <Choix nom="a_inspiration" legende="Avez-vous une chanson qui pourrait nous servir d’inspiration ?" facultatif options={OUI_NON}
        valeur={e.a_inspiration} onChange={(v) => majE({ a_inspiration: v })} />
      {e.a_inspiration === 'Oui' && (
        <>
          <Texte id="titre-artiste" label="Titre et artiste" max={LIMITES.titreArtiste} valeur={e.titre_artiste}
            placeholder="Par exemple : Titre — Artiste" onChange={(v) => majE({ titre_artiste: v })} />
          <Texte id="lien-inspiration" label="Ou un lien YouTube ou Spotify" type="url" max={LIMITES.lien} valeur={e.lien}
            placeholder="https://" onChange={(v) => majE({ lien: v })} />
          <ChoixMultiples nom="aspects" legende="Qu’aimez-vous dans cette chanson ? (facultatif)" options={ASPECTS_INSPIRATION}
            valeurs={e.aspects} onChange={(v) => majE({ aspects: v })} />
          {e.aspects.includes('Autre') && (
            <Texte id="aspect-autre" label="Quoi d’autre ?" max={LIMITES.court} valeur={e.aspect_autre} onChange={(v) => majE({ aspect_autre: v })} />
          )}
        </>
      )}
      <p className={s.encadre} data-avertissement-inspiration>
        Cette chanson servira uniquement de référence artistique pour mieux comprendre vos goûts. Nous ne copierons ni les paroles, ni la mélodie, ni les éléments distinctifs de la chanson. Votre chanson restera une création originale.
      </p>
    </>
  )
}

/* ── Récapitulatif (étape 7 et lecture seule) ── */

function Section({ n, titre, modifier, children }: { n: number; titre: string; modifier?: (n: number) => void; children: React.ReactNode }) {
  return (
    <section className={s.recapSection} data-recap={n}>
      <div className={s.recapEntete}>
        <h3>{titre}</h3>
        {modifier && <button type="button" className={s.lienAction} onClick={() => modifier(n)} data-modifier={n}>Modifier</button>}
      </div>
      {children}
    </section>
  )
}

function Ligne({ t, children }: { t: string; children: React.ReactNode }) {
  return <div className={s.recapLigne}><dt>{t}</dt><dd>{children}</dd></div>
}

function Recapitulatif({ r, commande, modifier }: { r: Reponses; commande: Commande; modifier?: (n: number) => void }) {
  const prenom = commande.beneficiaire_prenom
  const vide = <span className={s.vide}>Non renseigné</span>
  const val = (v: string) => (v ? v : vide)
  const details: [string, string][] = ([
    ['Phrase ou expression', r.etape3.expression],
    ['Surnom', r.etape3.surnom],
    ['Habitude ou geste', r.etape3.habitude],
    ['Lieu important', r.etape3.lieu],
    ['Ce qu’elle/il aime', r.etape3.chose_aimee],
    ['Tradition', r.etape3.tradition],
    ['Autre détail', r.etape3.autre],
  ] as [string, string][]).filter(([, v]) => v)
  const emotions = r.etape4.emotions.map((x) => (x === 'Autre' && r.etape4.emotion_autre ? r.etape4.emotion_autre : x))
  const principale = r.etape4.emotion_principale === 'Autre' && r.etape4.emotion_autre ? r.etape4.emotion_autre : r.etape4.emotion_principale
  const style = r.etape5.style === 'Autre' ? r.etape5.style_autre : r.etape5.style

  return (
    <div className={s.recap} data-recapitulatif>
      <Section modifier={modifier} n={1} titre="Pour qui">
        <dl>
          <Ligne t="Pour">{prenom} ({relationLisible(commande)})</Ligne>
          {commande.occasion && <Ligne t="Occasion">{commande.occasion}</Ligne>}
          <Ligne t="De la part de">{r.etape1.de_la_part === 'Plusieurs personnes' ? val(r.etape1.de_la_part_qui) : val(r.etape1.de_la_part)}</Ligne>
        </dl>
      </Section>
      <Section modifier={modifier} n={2} titre="Souvenirs">
        <dl>
          <Ligne t="Souvenir principal">{val(r.etape2.souvenir_principal)}</Ligne>
          {r.etape2.souvenirs_supplementaires.map((x, i) => <Ligne key={i} t={`Autre souvenir ${i + 1}`}>{x}</Ligne>)}
        </dl>
      </Section>
      <Section modifier={modifier} n={3} titre="Petits détails">
        {details.length ? <dl>{details.map(([t, v]) => <Ligne key={t} t={t}>{v}</Ligne>)}</dl> : <p className={s.texte}>{vide}</p>}
      </Section>
      <Section modifier={modifier} n={4} titre={`Ce que vous voulez dire à ${prenom}`}>
        <dl>
          <Ligne t="Message">{val(r.etape4.message)}</Ligne>
          <Ligne t="Émotions">{emotions.length ? emotions.join(', ') : vide}</Ligne>
          {emotions.length > 1 && <Ligne t="La plus importante">{val(principale)}</Ligne>}
        </dl>
      </Section>
      <Section modifier={modifier} n={5} titre="La chanson">
        <dl>
          <Ligne t="Ambiance">{val(r.etape5.ambiance)}</Ligne>
          <Ligne t="Style">{val(style)}</Ligne>
          <Ligne t="Voix">{val(r.etape5.voix)}</Ligne>
        </dl>
      </Section>
      <Section modifier={modifier} n={6} titre="Inspiration">
        {r.etape6.a_inspiration === 'Oui' ? (
          <dl>
            {r.etape6.titre_artiste && <Ligne t="Titre et artiste">{r.etape6.titre_artiste}</Ligne>}
            {r.etape6.lien && <Ligne t="Lien"><span className={s.lienTexte}>{r.etape6.lien}</span></Ligne>}
            {r.etape6.aspects.length > 0 && (
              <Ligne t="Ce que vous aimez">{r.etape6.aspects.map((x) => (x === 'Autre' && r.etape6.aspect_autre ? r.etape6.aspect_autre : x)).join(', ')}</Ligne>
            )}
          </dl>
        ) : (
          <p className={s.texte}>{r.etape6.a_inspiration === 'Non' ? 'Pas de chanson d’inspiration' : vide}</p>
        )}
      </Section>
    </div>
  )
}
