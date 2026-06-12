# Document de transmission technique — CoachRedo Platform
**Destinataire : fenêtre Claude dédiée à CoachRedo Trading**
**Date : 11 juin 2026**
**Rédigé par : Claude Code (session CoachRedo App)**

---

## 1. Vue générale de l'écosystème

CoachRedo est composé de **deux projets distincts** :

| Domaine | Rôle | Dépôt |
|---|---|---|
| `coachredo.com` | Site vitrine — présentation, page de vente Plan B Rentable | `coachredo-vitrine` |
| `coachredo.app` | Plateforme membre — lecture, bilan, suivi coaching | `coachredo-app` |

**La plateforme `coachredo.app` est la seule qui contient du code applicatif.** Le site vitrine est un projet HTML/CSS statique déployé séparément.

CoachRedo Trading devra être intégré dans `coachredo.app` comme un **module séparé**, pas comme un projet indépendant.

---

## 2. Stack technique actuelle

| Élément | Choix | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Langage | TypeScript | 5.x |
| Styles | Tailwind CSS + design tokens custom | — |
| Base de données | Supabase (PostgreSQL) | SDK 2.98 |
| Auth | Supabase Auth (magic link + email/password) | — |
| i18n | next-intl | — |
| Hébergement | Vercel | — |
| Icônes | Lucide React | — |

### Conventions techniques importantes

**Design tokens Tailwind à respecter absolument :**
```
text-cr-text           — texte principal
text-cr-text-secondary — texte secondaire
text-cr-text-muted     — texte atténué
text-cr-accent         — couleur accent (or/brun CoachRedo)
cr-accent-subtle       — fond léger accent
cr-border              — bordures
bg-surface             — fond carte
bg-background          — fond page
text-success           — vert succès
text-error             — rouge erreur
```

**Patterns à suivre :**
- Server Components par défaut, `'use client'` uniquement si nécessaire (interactions, état local)
- Server Actions (`'use server'`) pour les mutations — jamais d'API Route pour les opérations CRUD simples
- `createClient()` pour les requêtes utilisateur (respect RLS), `createServiceClient()` pour l'admin uniquement (bypass RLS)
- `router.refresh()` après mutation côté client pour resynchroniser le server component parent
- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` accepté pour les types Supabase non générés

---

## 3. Structure de l'application

### Groupes de routes

```
src/app/
├── (app)/                          # Reader — sans layout plateforme
│   ├── intro/                      # Introduction du livre
│   ├── chapter/[num]/              # Chapitres 1–7
│   ├── bilan/                      # Bilan de Clarté (13 questions)
│   │   └── confirmation/
│   ├── quiz/
│   ├── resume/                     # Redirection intelligente vers dernier chapitre
│   └── transition/                 # Page fin de livre → vers Bilan
│
├── (auth)/                         # Auth sans layout plateforme
│   ├── login/
│   ├── signup/
│   └── reset-password/
│
├── [locale]/(platform)/            # Plateforme avec layout sidebar
│   ├── dashboard/                  # Dashboard utilisateur
│   └── admin/                      # Dashboard admin (ADMIN_EMAIL uniquement)
│       ├── page.tsx                # Vue globale : stats, utilisateurs, codes
│       ├── codes/                  # Gestion codes d'accès
│       └── users/[id]/             # Fiche utilisateur complète
│
├── [locale]/auth/                  # Auth avec layout locale
│   ├── login/
│   └── verify/
│
└── access/                         # Activation code d'accès
```

### Modules existants côté utilisateur

| Module | Accès | État |
|---|---|---|
| Livre numérique Plan B Rentable | `book_access.has_access = true` | Actif |
| Bilan de Clarté (13 questions) | Après livre | Actif |
| Dashboard utilisateur | Connecté | Basique (à enrichir) |
| Diagnostic (affiché) | Quand statut = validé | À construire côté user |

### Dashboard admin — blocs de la fiche utilisateur

L'ordre actuel dans `admin/users/[id]/page.tsx` :
1. Compte (email, nom, téléphone, ID)
2. Accès (code, programme, statut)
3. Parcours (Livre, Bilan, Signaux, Missions, Dernière activité)
4. Progression lecture (grille 7 chapitres)
5. Diagnostic CoachRedo (force, frein, hypothèse Plan B, signal prioritaire, niveaux, synthèse coach, message utilisateur)
6. Bilan de Clarté (réponses complètes par famille)
7. Signaux (observations coach)
8. Journal de suivi (contacts et actions)
9. Missions (actions assignées)

---

## 4. Schéma de base de données actuel

### Tables Supabase

```sql
-- Auth (gérée par Supabase)
auth.users (id uuid PK, email, created_at, last_sign_in_at, ...)

-- Profil utilisateur
profiles (
  id uuid PK → auth.users,
  bilan_completed_at timestamptz,
  nom text,
  telephone text,
  livre_completed boolean,
  livre_completed_at timestamptz
)

-- Système d'accès par code
access_codes (
  code text PK,
  access_type text,        -- 'book'
  used_by uuid → auth.users,
  used_at timestamptz,
  created_at timestamptz
)

book_access (
  user_id uuid PK → auth.users,
  has_access boolean,
  access_granted_at timestamptz
)

-- Reader
exercise_responses (
  user_id uuid,
  exercise_id text,
  chapter_num int,
  response jsonb,
  PK: (user_id, exercise_id)
)

chapter_progress (        -- ancienne table reader
  user_id uuid,
  chapter_num int,
  is_completed boolean,
  completed_at timestamptz,
  PK: (user_id, chapter_num)
)

reading_progress (        -- nouvelle table unifiée
  user_id uuid,
  chapter_id text,        -- 'avant-commencer','introduction','ch1'...'ch7','intermede-1','intermede-2'
  chapter_order smallint, -- 0 à 10
  started_at timestamptz,
  completed_at timestamptz,
  PK: (user_id, chapter_id)
)

-- Bilan de Clarté
bilan_responses (
  user_id uuid,
  question_id text,
  famille text,           -- 'RECONNAISSANCE','BLOCAGES','RESSOURCES','OBSERVATION','MOUVEMENT'
  response text,
  updated_at timestamptz
)

-- Coaching admin
user_signals (
  id uuid PK,
  user_id uuid → auth.users,
  categorie text,         -- 'Clarté','Blocage','Ressource','Observation','Mouvement','Sécurité','Action'
  signal text,
  intensite text,         -- 'faible','moyenne','forte'
  coach_note text,
  created_at timestamptz
)

coach_journal (
  id uuid PK,
  user_id uuid → auth.users,
  type text,              -- 'WhatsApp','Appel','Note','Mission','Relance'
  contenu text,
  resultat text,
  created_at timestamptz
)

user_missions (
  id uuid PK,
  user_id uuid → auth.users,
  mission text,
  statut text,            -- 'en_cours','terminée','abandonnée'
  coach_note text,
  assigned_at timestamptz,
  completed_at timestamptz
)

-- Diagnostic CoachRedo V1 (ajouté juin 2026)
diagnostics (
  user_id uuid PK → auth.users,
  diagnostic_status text, -- 'brouillon','en_cours','validé','révision_nécessaire'
  force_principale text,
  frein_principal text,
  hypothese_plan_b text,
  signal_prioritaire text,
  niveau_clarte smallint, -- 1–5
  niveau_mouvement smallint, -- 1–5
  synthese_coach text,    -- PRIVÉ — jamais montré à l'utilisateur
  message_utilisateur text,
  created_at timestamptz,
  updated_at timestamptz
)

-- Architecture anticipée (non construite)
messages (               -- futur module conversation
  id uuid PK,
  user_id uuid → auth.users,
  sender text,           -- 'user' | 'coach'
  type text,             -- 'question','reponse_mission','clarification','retour','note'
  contenu text,
  mission_id uuid → user_missions,  -- optionnel
  read_at timestamptz,
  created_at timestamptz
)
```

---

## 5. Gestion des accès

### Modèle actuel

```
Utilisateur s'inscrit → pas d'accès par défaut
Coach génère un code → insère dans access_codes (access_type='book')
Utilisateur entre le code → /access → book_access.has_access = true
```

### Rôles

| Rôle | Identification | Accès |
|---|---|---|
| Admin/Coach | `user.email === process.env.ADMIN_EMAIL` | Tout, via service client |
| Utilisateur avec accès | `book_access.has_access = true` | Reader + Bilan |
| Utilisateur sans accès | Connecté mais pas de code | Dashboard uniquement |

Il n'existe **pas de table de rôles** — le rôle admin est déterminé par variable d'environnement. C'est volontaire pour l'instant (une seule personne = le coach).

### Variable d'environnement critique

```
ADMIN_EMAIL=redouaneagaja@gmail.com
```

Toutes les pages admin vérifient : `user.email !== process.env.ADMIN_EMAIL → redirect`.

---

## 6. Principes d'architecture à respecter

### Une seule plateforme

`coachredo.app` est **la** plateforme. Tous les modules (Plan B Rentable, Trading, futurs) vivent dans le même projet Next.js. Pas de sous-domaines séparés par module.

### Isolation par groupe de routes

Chaque module peut avoir son propre groupe de routes :
```
[locale]/(platform)/trading/    ← futur module Trading
[locale]/(platform)/planb/      ← module Plan B (actuel dans dashboard)
```

### Système d'accès par code

Le modèle code → `book_access` est généralisable. Pour Trading, prévoir une table `trading_access` ou étendre `access_codes` avec `access_type='trading'`. Ne pas réutiliser `book_access` pour un autre produit.

### Admin centralisé

La fiche utilisateur `admin/users/[id]/page.tsx` est le point central de suivi. Chaque nouveau module doit ajouter **son propre bloc** dans cette fiche, pas créer une page admin séparée.

### Séparation coach/utilisateur

- `coach_journal` → notes privées coach, jamais visibles utilisateur
- `diagnostics.synthese_coach` → même règle
- `diagnostics.message_utilisateur` → visible côté user seulement si `diagnostic_status = 'validé'`

---

## 7. Recommandations pour CoachRedo Trading

### Ce qu'il faudra créer

1. **Table `trading_access`** — même modèle que `book_access`
2. **Codes d'accès Trading** — `access_type = 'trading'` dans `access_codes`
3. **Groupe de routes** — `[locale]/(platform)/trading/`
4. **Bloc admin** dans la fiche utilisateur — même pattern que `SignauxBloc`, `MissionsBloc`
5. **Lib dédiée** — `src/lib/trading-*.ts` — ne pas polluer les fichiers existants

### Ce qu'il ne faudra pas toucher

- `book_access`, `bilan_responses`, `chapter_progress`, `reading_progress` — propres au module Plan B
- `user_signals`, `coach_journal`, `user_missions`, `diagnostics` — partagés, à étendre si besoin mais pas modifier
- Les design tokens Tailwind — même palette sur tout le site
- Le layout `[locale]/(platform)/layout.tsx` — la sidebar est partagée, ajouter Trading comme entrée de menu

### Pattern à suivre pour un nouveau module

```ts
// 1. Table SQL
create table trading_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  has_access boolean default false,
  access_granted_at timestamptz
);

// 2. Guard dans les pages
const { data: tradingAccess } = await supabase
  .from('trading_access')
  .select('has_access')
  .eq('user_id', user.id)
  .single()
if (!tradingAccess?.has_access) redirect(`/${locale}/dashboard`)

// 3. Admin — vérification
const service = createServiceClient()
// toujours via checkAdmin() dans actions.ts
```

### Avertissement important

Le pattern `createServiceClient()` bypasse toutes les RLS Supabase. Ne l'utiliser que dans les Server Actions protégées par `checkAdmin()`. Côté utilisateur, toujours utiliser `createClient()`.

---

**État de la plateforme au 11 juin 2026.**
Modules actifs : Livre numérique Plan B Rentable, Bilan de Clarté, Dashboard admin complet.
Prochain module prévu : CoachRedo Trading.
