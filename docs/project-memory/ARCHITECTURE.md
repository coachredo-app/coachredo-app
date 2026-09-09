---
name: architecture
description: Stack réelle, structure applicative, schéma DB, sécurité et dettes connues de CoachRedo App — reflète le repo au HEAD indiqué, pas une architecture souhaitée.
metadata:
  type: project-memory
---

# ARCHITECTURE — CoachRedo App

Dernière mise à jour : 2026-09-09 (V2 — corrections QG) — reflète le repo au HEAD `3eb835a`.

Ce document décrit l'existant vérifié dans le repo. Une architecture future déjà décidée mais non implémentée est explicitement marquée **[FUTUR — non implémenté]**. Ne jamais présenter une table ou fonctionnalité de cette catégorie comme si elle existait.

---

## 1. Stack réelle

| Élément | Valeur (package.json) |
|---|---|
| Framework | Next.js 16.1.6, App Router |
| UI | React 19.2.3 |
| Langage | TypeScript 5.x |
| Styles | Tailwind CSS 4 + design tokens custom (`text-cr-*`, `bg-cr-*`, voir composants existants) |
| Base de données | Supabase (PostgreSQL) — SDK `@supabase/supabase-js` 2.105.1, `@supabase/ssr` 0.10.2 |
| i18n | `next-intl` 4.12 |
| Paiement | `stripe` 22.2.0 (présent en dépendance — la présence de la dépendance n'est pas une preuve d'usage actif ; usage réel à auditer si/quand le paiement devient pertinent — non bloquant aujourd'hui) |
| Hébergement | Vercel |
| SDK IA | **Aucun installé.** Ne pas en ajouter sans décision QG (cf. PROJECT_BIBLE §7, §11, DECISIONS D-013). |

**Dette technique (type-safety)** (`next.config.ts`) : `typescript: { ignoreBuildErrors: true }` — toujours présent au HEAD `3eb835a`, confirmé par lecture directe du fichier. C'est une dette de qualité/type-safety avec un **impact et un risque indirects possibles** (une erreur de type peut passer un déploiement sans être bloquée) — **pas automatiquement une vulnérabilité de sécurité en soi**. Signalée le 2026-08-25, non traitée depuis. Le fichier définit par ailleurs des headers de sécurité corrects (`X-Frame-Options: DENY`, HSTS, `X-Content-Type-Options`, etc.).

---

## 2. Structure applicative — deux systèmes de routes coexistants

```
src/app/
├── (app)/                    # Reader legacy — sans i18n, sombre, immersif
│   ├── intro/, chapter/[num]/, resume/, transition/, quiz/
│   ├── bilan/                # Bilan de Clarté V2 (+ upgrade/, confirmation/)
│   └── synthese/             # Carte du parcours (mind map post-lecture)
│
├── (auth)/                   # Auth reader, sans i18n
│
├── [locale]/(platform)/      # Plateforme avec sidebar, i18n (fr/en)
│   ├── dashboard/
│   ├── account/
│   ├── trading/dashboard/    # Module Trading — LEGACY, voir §8 (à auditer puis nettoyer)
│   └── admin/                # ADMIN_EMAIL uniquement
│       ├── page.tsx          # Vue globale : stats, utilisateurs, codes, "Action requise"
│       ├── codes/
│       └── users/[id]/       # Fiche utilisateur complète — contient des blocs coaching legacy, voir §9
│
├── [locale]/auth/            # Auth plateforme, avec i18n
├── access/                   # Activation code d'accès
└── api/access/                # Redemption code (rate-limited côté Vercel)
```

Middleware unique : `src/proxy.ts`. Branche `isAppRoute` (reader legacy, pas de préfixe locale) vs branche plateforme (passe par `next-intl` middleware). Chaque branche gère elle-même son guard auth — pas de layout global qui protège tout. `PLATFORM_PROTECTED = ['dashboard', 'plan-b', 'account', 'settings', 'admin']` (note : le segment `plan-b` est listé dans le middleware mais aucun dossier `plan-b/` n'existe actuellement sous `[locale]/(platform)/` — écart mineur, sans impact fonctionnel connu).

**Trois patterns de navigation coexistent délibérément** (décision confirmée le 2026-08-26, ne pas unifier en un composant partagé) : `BlockRenderer` (reader step-by-step), `BilanReader`/`BilanView` (question-by-question), pages standalone (transition, confirmation, synthese). Chaque fix de navigation reste local à son fichier.

---

## 3. Supabase — Auth, RLS, sources de vérité

### Auth / rôle admin

**Il n'existe aucune notion de rôle en base.** Pas de colonne `role` ou `is_admin` sur `profiles`, pas de claim JWT custom, pas de policy RLS dédiée admin. L'admin est un unique compte identifié par comparaison d'email :

```ts
// src/lib/admin.ts — point d'entrée unique, centralisé le 2026-08-25
export async function requireAdminService() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Accès admin requis')
  }
  return createServiceClient()
}
```

Toutes les Server Actions admin (13 call-sites au moment de la centralisation) passent par cette fonction unique. Les trois pages Server Component admin (`admin/page.tsx`, `admin/codes/page.tsx`, `admin/users/[id]/page.tsx`) font le même check inline mais avec `redirect()` au lieu de `throw` — pattern distinct et volontairement non fusionné (mécanisme Next.js différent).

`createClient()` = client RLS (utilisateur), pour toute lecture/écriture respectant la propriété de l'utilisateur courant. `createServiceClient()` = client `service_role`, bypass RLS — **réservé aux usages admin passant par `requireAdminService()`**, jamais exposé côté client.

### RLS — principe général

Chaque table utilisateur a RLS activé. Règle par défaut : un utilisateur ne voit que ses propres lignes (`auth.uid() = user_id`). Le `service_role` bypass systématiquement. Tables sans policy `authenticated` du tout (accès service_role exclusif) : `access_codes`, `diagnostics`, `user_signals`, `coach_journal`.

### Tables principales (confirmées par les migrations 001-011)

| Table | Rôle | Note |
|---|---|---|
| `profiles` | Étend `auth.users` | `bilan_completed_at` : dénormalisation legacy, **ne pas utiliser comme source canonique** du statut Bilan (cf. `bilan_sessions`) |
| `book_access` | Gate d'accès Plan B Rentable | 1 ligne/utilisateur |
| `access_codes` | Codes d'accès admin | `access_type` : `'book'` \| `'trading'` |
| `reading_progress` | **Source de vérité** progression lecture | `(user_id, chapter_id)`, lu server-side par dashboard et guards |
| `chapter_progress` | Cache client redondant | Ne plus en dépendre pour la logique de déverrouillage critique — `reading_progress` couvre tous les flux (cf. DECISIONS D-005) |
| `exercise_responses` | Réponses exercices du livre | jsonb |
| `bilan_sessions` | Sessions du Bilan de Clarté (V1 et V2) | Voir détail ci-dessous |
| `bilan_responses` | Réponses au Bilan | `(session_id, question_id)` unique |
| `user_missions` | Missions coaching | `statut`: `en_cours`\|`terminée`\|`abandonnée` ; 1 seule `en_cours` par user (index `idx_user_missions_one_active`, migration 008). **Statut de production : considéré comme exécuté et P2 clôturé/déployé, selon l'historique QG validé** — le repo prouve la définition du fichier de migration, l'historique QG validé constitue la preuve opérationnelle déclarée. Voir DECISIONS D-007. |
| `diagnostics`, `user_signals`, `coach_journal`, `user_missions` (blocs UI) | Coaching legacy | Surfaces admin encore actives mais classées **legacy / à auditer puis nettoyer** — voir §9. Ne jamais supprimer les données automatiquement du fait du retrait d'une UI. |
| `trading_*` | Module Trading (accès, scores, trades, locks) | **Legacy** — première phase exploratoire abandonnée comme approche, voir §8 |

### Bilan de Clarté — schéma exact (`bilan_sessions`)

```sql
id, user_id, session_num, current_step, started_at, completed_at,
statut          text  check (in_progress | completed | superseded),   -- superseded ajouté migration 010
bilan_version   integer default null,        -- NULL = V1 legacy, 2 = V2
session_type    text default 'standard'      -- 'standard' | 'upgrade'
```

Index clés : `idx_bilan_sessions_one_active` (1 seule `in_progress` par user), `idx_bilan_sessions_user_num` (unique `user_id, session_num`). **Pas de `UNIQUE(user_id, id)`** — nécessaire si une future table référence `(user_id, session_id)` par FK composite (cf. DECISIONS D-013).

**Sélection canonique du Bilan pour toute logique produit (Rapport inclus).** Les critères sémantiques à respecter partout où le Bilan canonique est nécessaire :
- `statut = 'completed'`
- `bilan_version = 2`
- la session la plus récente parmi celles qui satisfont les deux critères ci-dessus (`session_num` décroissant)

Ces critères sont déjà appliqués correctement dans `dashboard/page.tsx`. Toute nouvelle logique (génération du Rapport notamment) doit appliquer les **mêmes critères sémantiques** — sans qu'une copie littérale de la requête existante soit une fin en soi, du moment que l'équivalence sémantique est garantie.

**RPC `SECURITY DEFINER` disponibles :**

- `migrate_legacy_session()` (migration 011) — pour une session V1 `in_progress` orpheline (aucun V1 `completed`) : garde d'entrée stricte sur `statut = 'completed'` (un V1 `superseded` seul ne qualifie jamais). Crée une session V2 `standard`.
- `create_upgrade_bilan_session()` (migration 010) — pour un utilisateur avec au moins un V1 `completed` : crée une session V2 `upgrade` et copie les réponses. **Éligibilité côté produit : repose sur l'existence d'une session V1 `completed` ; un `superseded` seul ne qualifie pas.** Note technique de repo : le SQL de cette RPC (déjà exécutée, non modifiable) conserve en interne un test plus large (`completed` OU `superseded`) pour sa présélection de source de copie — sans incidence pratique sur l'éligibilité telle que vécue par l'utilisateur, car un `superseded` ne peut apparaître sans qu'un `completed` ait existé au préalable dans le flux normal. La garde produit réellement opposée à l'utilisateur (`hasV1History` en TypeScript, qui conditionne l'accès à `/bilan/upgrade`) teste `completed` strictement.

Les deux RPC suivent la même discipline : `auth.uid()` uniquement (jamais un paramètre user_id), `SET search_path = public`, `REVOKE ALL FROM PUBLIC/anon`, `GRANT EXECUTE TO authenticated`, verrou `profiles FOR UPDATE` en premier pour la sérialisation. **Réutiliser ce pattern pour toute future fonction `SECURITY DEFINER`** (ex. future fonction de lecture du Rapport).

---

## 4. Dette admin active — sélection de session sans filtre `bilan_version`

Deux écrans admin sélectionnent encore une session Bilan sans filtrer `bilan_version = 2`, contrairement au dashboard client (déjà correct) :

- `src/app/[locale]/(platform)/admin/users/[id]/page.tsx` (requête `bilanSessionsResult`, ~ligne 64) : prend la session la plus récente par `session_num`, sans filtre `statut` ni `bilan_version`.
- `src/app/[locale]/(platform)/admin/page.tsx` (`latestSessionByUser`, ~lignes 87-107) : filtre `statut = 'completed'` mais pas `bilan_version` — un utilisateur legacy V1 complété sans upgrade apparaît à tort comme « Bilan complété ».

Conséquence pratique confirmée : un utilisateur legacy peut apparaître en catégorie « À accompagner » dans la file admin « Action requise » alors qu'il n'a pas encore validé son upgrade V2. **Traitement prévu : cette dette doit être corrigée dans le cadre du chantier Rapport CoachRedo**, afin que la source utilisée pour toute décision produit (génération du Rapport comme affichage admin) soit systématiquement le Bilan V2 canonique.

---

## 5. Sécurité — état vérifié

- Toutes les routes admin gardées par `requireAdminService()` ou check inline + `redirect()`. Pas de chemin connu permettant à un non-admin d'atteindre une donnée d'un autre utilisateur via l'app (audit du 2026-08-25).
- Rate limiting sur `/api/access/redeem` : Vercel Firewall, fenêtre fixe 600s/5 req/IP/HTTP 429.
- RLS activé sur toutes les tables utilisateur.
- Callback auth protégé contre les redirections externes (paramètre `next` validé).
- **Dette technique ouverte (type-safety, pas une vulnérabilité en soi)** : `typescript: { ignoreBuildErrors: true }` (voir §1) — non traitée.
- **Dette basse priorité, non bloquante** : `.env.local.save` présent sur disque (non tracké git, présent au 2026-08-25, toujours présent) ; `profiles_update_own` sans restriction de colonnes ; CSP absent ; `deleteUser` sans protection anti-auto-suppression.

---

## 6. [FUTUR — non implémenté] Fondation Rapport CoachRedo

Schéma arbitré par le QG le 2026-09-07, verrouillé pour ses aspects structurels, **migration non exécutée**. Aucune table `rapports`, aucune route `/rapport`, aucun SDK IA n'existe dans le repo à ce jour.

```
TABLE rapports (proposée, PAS créée)
  id uuid PK, user_id uuid NOT NULL, bilan_session_id uuid NOT NULL,
  statut text DEFAULT 'draft' CHECK (draft|published),
  sections jsonb, contenu_coach text,                         -- client-visible via RPC uniquement
  sections_meta jsonb, ai_provider text, ai_model text,
  ai_generated_at timestamptz, publie_par <type ouvert>, publie_le timestamptz,  -- admin-only
  schema_version integer DEFAULT 1, created_at, updated_at,
  UNIQUE (bilan_session_id),
  FOREIGN KEY (user_id, bilan_session_id) REFERENCES bilan_sessions(user_id, id)
    -- requiert : ALTER TABLE bilan_sessions ADD UNIQUE (user_id, id) — trivial, id déjà PK
```

Accès client exclusif via une future fonction de lecture `SECURITY DEFINER` (ne retournant que `id, sections, contenu_coach, publie_le`) — **aucune policy `SELECT` `authenticated` sur la table**. Décision explicite après comparaison de 3 options (vue RLS / double table / RPC) — voir DECISIONS D-013 pour le détail et les alternatives rejetées.

**Points explicitement ouverts (ne pas les traiter comme tranchés) :**
- **`publie_par`** : type et provenance **OUVERTS** — à auditer/trancher pendant le chantier Rapport, pas avant.
- **Fournisseur IA** : **OUVERT, différé et non bloquant.** L'interface *provider-neutral* (contrat TypeScript indépendant du fournisseur) est, elle, décidée — mais aucun fournisseur n'est choisi.

**Lifecycle V1, strict :** `draft → published`. Pas de workflow ordinaire de dépublication ou de retour arrière en V1. Une future architecture de correction/révision/historisation sera un **chantier explicite séparé** — ne documenter aucune procédure de contournement (y compris via `service_role`) comme une exception officielle en attendant ce chantier.

**Numérotation de migration :** 012 est actuellement le prochain numéro libre connu (vérifié par lecture du dossier le 2026-09-09) — **à revérifier immédiatement avant toute création**, ne pas le considérer comme figé.

Détail doctrinal complet (workflow, types de blocs `fait/observation/hypothese/piste/inconnu`, `evidence_refs`) : voir PROJECT_BIBLE §4 et DECISIONS D-013.

**Point de départ du chantier :** le prochain chantier Rapport commence par un **audit read-only** du repo actuel — migrations, Admin, Auth — pas par le choix du fournisseur IA (cf. CURRENT_STATE §8).

---

## 7. [PAUSÉ — pas abandonné] Mémoire de coaching multi-domaines

Trois architectures alternatives ont été conçues en détail le 2026-08-30 pour capturer l'analyse du coach à la clôture d'une mission et préparer un futur multi-domaines (`coaching_engagements`, `coaching_timeline`, ou table dédiée `mission_coach_notes`). **Aucune n'a été implémentée.**

**Statut actuel :** ce chantier (P3) est **pausé, pas abandonné**. La vision de mémoire longitudinale qui le motivait reste valide et est désormais formalisée comme vision stratégique (PROJECT_BIBLE §6). Les trois propositions ci-dessus doivent être lues comme des **explorations historiques**, utiles pour comprendre le raisonnement passé, mais **aucune n'est une architecture cible déjà décidée**. Décision actuelle : lorsque le nouveau suivi coaching sera rouvert, il sera **redessiné proprement depuis zéro**, autour des besoins alors validés — pas repris tel quel depuis ces propositions. Détail et statut : DECISIONS D-008, D-015.

Ne pas supposer que `coaching_engagements`, `coaching_timeline` ou `mission_coach_notes` existent, ni qu'ils constituent un plan d'implémentation engagé.

---

## 8. [LEGACY — à auditer puis nettoyer] Module Trading dans CoachRedo App

L'intégration Trading présente dans ce repo (`[locale]/(platform)/trading/`, tables `trading_*`, `src/lib/trading-*.ts`) provient d'une **première phase exploratoire commencée trop tôt**. Cette approche est **abandonnée** — voir PROJECT_BIBLE §9 et DECISIONS D-016.

- Les éléments applicatifs devenus inutiles ont vocation à être retirés, **après audit**.
- **Aucune suppression destructive de données ou de tables sans audit et GO explicite du QG.**
- Le futur module Trading de CoachRedo sera intégré ultérieurement, à partir de l'architecture réelle du projet CMP Trading une fois celui-ci opérationnel — pas à partir de cette ébauche.

Ce nettoyage est un **chantier dédié futur**, non ouvert à ce jour.

---

## 9. [LEGACY — à auditer puis nettoyer] Surfaces admin de coaching

L'administration CoachRedo **reste nécessaire** et ne doit pas être supprimée. En revanche, certaines surfaces de la fiche utilisateur admin — `DiagnosticBloc`, `SignauxBloc`, `JournalBloc`, `MissionsBloc`, ainsi que la section « Action requise » de la page admin principale — sont construites autour du système de coaching actuel (missions simples, sans mémoire structurée), lui-même amené à être redessiné (§7).

Ces surfaces sont classées **legacy / à auditer puis nettoyer** — pas à supprimer immédiatement. Principe impératif : **les tables et données historiques ne doivent jamais être supprimées automatiquement parce qu'une UI est retirée.** Toute suppression de données reste soumise à audit préalable et GO explicite. Ce nettoyage est un **chantier dédié futur**, distinct du chantier Rapport, non ouvert à ce jour.

---

## 10. Invariants à ne pas casser

- `profiles.livre_completed` et `profiles.bilan_completed_at` : jamais écrits de façon fiable — ne jamais les utiliser comme source canonique.
- `reading_progress` est la seule source de vérité serveur pour la progression de lecture. `chapter_progress` est un cache client, tolérant à la divergence.
- La sélection canonique du Bilan (§3) repose sur des critères sémantiques fixes (`statut='completed'`, `bilan_version=2`, le plus récent) — à appliquer partout où c'est pertinent, sans dériver de ces critères.
- `ADMIN_EMAIL` comparé strictement server-side. `SUPABASE_SERVICE_ROLE_KEY` jamais exposé en `NEXT_PUBLIC_`.
- Toute nouvelle fonction `SECURITY DEFINER` : `auth.uid()` uniquement (jamais un paramètre user_id passé par le caller), `SET search_path = public`, `REVOKE`/`GRANT` explicites.
- `handoff/` reste hors git (`.gitignore`) — ne jamais le retirer du `.gitignore` sans décision QG explicite (contient des cartographies de sécurité internes).
- **Aucune suppression destructive de tables, colonnes ou données historiques** (coaching legacy, Trading legacy ou autre) sans audit préalable et GO explicite — le retrait d'une UI ne justifie jamais, à lui seul, la suppression des données sous-jacentes.
