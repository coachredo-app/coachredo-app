# Passation projet CoachRedo — état au 21 août 2026

Ce document résume tout ce qu'il faut savoir pour reprendre le projet CoachRedo App là où nous en sommes.

---

## 1. Vision générale du projet

**CoachRedo** est un programme de coaching en ligne structuré en deux volets liés :

### Le livre — "Plan B Rentable"
- Sous-titre : *Une nouvelle façon de construire son indépendance*
- Public : jeunes, étudiants, salariés et entrepreneurs d'Afrique francophone (Afrique de l'Ouest, Afrique centrale, Maghreb francophone)
- Philosophie : le livre crée la conscience et le déclic → l'application structure l'action et l'accompagnement
- 7 chapitres (ordre validé le 2026-05-15) :
  1. Confusion — Pourquoi tu tournes en rond
  2. Fausse sécurité — Ce que tu appelles stabilité
  3. Blocages internes — Ce qui te retient vraiment
  4. Ressources cachées — Ce que tu possèdes déjà sans le savoir
  5. Opportunités — Changer de regard sur ce qui t'entoure
  6. Commencer avant d'être prêt — La confiance vient après
  7. Construire quelque chose de réel — L'engagement calme
- Style : narratif premium, paragraphes courts, pas de listes froides, PNL intégrée discrètement, pas de ton gourou
- Manuscrit V1 **figé** depuis le 2026-06-01. Ne modifier qu'en cas de faute ou bug.

### L'application — CoachRedo App
- Stack : **Next.js 14/16 App Router**, **Supabase** (PostgreSQL + Auth + RLS), déployé sur **Vercel**
- Repo : `/Users/redouaneagaja/projects/coachredo-app`
- Branche principale : `main`

---

## 2. Architecture technique

### Deux systèmes de routes coexistants

| Système | Route | Style | Auth | Usage |
|---|---|---|---|---|
| `(app)` reader | `/bilan`, `/intro`, `/ch1`…`/ch7`, `/transition` | Sombre, immersif, sans sidebar | Via middleware `proxy.ts` | Lecture du livre + Bilan |
| `[locale]/(platform)` | `/fr/dashboard`, `/fr/auth/...`, `/fr/admin/...` | Clair, sidebar | Via Supabase SSR | Espace utilisateur + Admin |

### Fichier clé : `src/proxy.ts`
- Middleware unique qui gère les deux branches
- Branche `isAppRoute` : routes reader
- Branche `isProtected` : routes platform
- Redirige `/bilan` non authentifié vers `/fr/auth/login?next=/bilan`

### Supabase
- `createClient()` : client utilisateur, RLS appliquée
- `createServiceClient()` : client service_role, bypasse RLS — utilisé uniquement server-side pour les opérations autorisées
- **Règle absolue** : `SUPABASE_SERVICE_ROLE_KEY` jamais avec `NEXT_PUBLIC_`; `ADMIN_EMAIL` comparé server-side uniquement

---

## 3. Tables principales

### `bilan_sessions`
- Colonnes : `id`, `user_id`, `session_num`, `statut` (`in_progress` | `completed`), `current_step`, `started_at`, `completed_at`
- Index unique partiel : `(user_id) WHERE statut='in_progress'` — garantit une seule session active à la fois
- Sessions numérotées séquentiellement par utilisateur (`session_num`)

### `bilan_responses`
- Colonnes : `session_id`, `question_id`, `response`, `famille`
- RLS : utilisateurs peuvent SELECT leurs propres réponses, UPDATE les réponses de leur session `in_progress`

### `reading_progress`
- Source de vérité pour la progression de lecture
- `getReadingProgress(rows)` → `{ fullyDone: boolean, completedCount: number }`
- `REQUIRED_TOTAL = 7` (ch1 à ch7)
- **Note** : `profiles.livre_completed` n'est jamais écrit par le code — ne pas s'y fier

### `profiles`
- `bilan_completed_at` : maintenu pour compatibilité dashboard/admin

---

## 4. Le Bilan de Clarté — état complet

### 13 questions, 5 familles

| question_id | Famille | Écran (sur 17) | Obligatoire |
|---|---|---|---|
| `reconnaissance_1` | Reconnaissance | 4/17 | **OUI** |
| `reconnaissance_2` | Reconnaissance | 5/17 | non |
| `reconnaissance_3` | Reconnaissance | 6/17 | non |
| `blocages_1` | Blocages | 7/17 | non |
| `blocages_2` | Blocages | 8/17 | non |
| `blocages_3` | Blocages | 9/17 | **OUI** |
| `ressources_1` | Ressources | 10/17 | **OUI** |
| `ressources_2` | Ressources | 11/17 | non |
| `ressources_3` | Ressources | 12/17 | non |
| `observation_1` | Observation | 13/17 | **OUI** |
| `observation_2` | Observation | 14/17 | non |
| `mouvement_1` | Mouvement | 15/17 | **OUI** |
| `mouvement_2` | Mouvement | 16/17 | non |

Structure STEPS complète : 3 intros (écrans 1-3) + 13 questions (écrans 4-16) + 1 écran "done" (écran 17/17).

### Règles produit implémentées

**1. Cooldown 30 jours**
- Un utilisateur ne peut pas démarrer un nouveau Bilan dans les 30 jours suivant la completion du précédent
- Implémenté dans `createBilanSession()` (server action) ET dans `BilanGateway` (UX — affiche la date de disponibilité au lieu du bouton)

**2. 5 réponses obligatoires**
- Les 5 `question_id` marqués `required: true` dans `bilan-questions.ts` doivent avoir une réponse non vide pour terminer le Bilan
- Implémenté côté client dans `BilanReader` (bouton désactivé + liste des numéros d'écran manquants) ET côté serveur dans `completeBilanSession()` (vérification en base)

### Flux utilisateur Bilan

```
/bilan (page.tsx)
  ├─ Non authentifié → /fr/auth/login?next=/bilan
  ├─ Livre non terminé (< 7/7 chapitres) → /fr/dashboard
  ├─ Cas A : session in_progress → BilanReader (reprise)
  ├─ Cas B : sessions completed, aucune in_progress → BilanGateway (liste historique)
  └─ Cas C : aucune session → création via service_role → BilanReader
```

### Fichiers du Bilan

| Fichier | Rôle |
|---|---|
| `src/app/(app)/bilan/page.tsx` | Server Component — routing des 3 cas |
| `src/app/(app)/bilan/actions.ts` | Server Actions — `createBilanSession()`, `completeBilanSession()` |
| `src/app/(app)/bilan/BilanReader.tsx` | Client Component — interface de saisie des réponses |
| `src/app/(app)/bilan/BilanGateway.tsx` | Client Component — liste des bilans complétés + bouton nouveau bilan |
| `src/app/(app)/bilan/steps.ts` | Définition des 17 étapes (`STEPS`, `QUESTION_STEPS`) |
| `src/lib/bilan-questions.ts` | Définition des 13 questions + `REQUIRED_QUESTION_IDS` (Set de 5 IDs) |
| `src/lib/reader/bilan-storage.ts` | localStorage cache (Supabase = source de vérité) |
| `src/lib/reader/bilan-sync.ts` | Sync localStorage → Supabase |

---

## 5. Historique des commits récents

```
9f83127  fix: clarify required Bilan questions
a478b26  feat: enforce 30-day cooldown and 5 required questions on Bilan
4180fc2  fix: show full bilan history in gateway — all completed sessions
02980c9  fix: enforce Bilan access rules and clarify admin status
e2a7835  feat: add multi-session clarity assessment
```

### Détail des corrections majeures (commit 02980c9)
1. `proxy.ts` : redirect `/bilan` non authentifié → `/fr/auth/login?next=/bilan`
2. `bilan/page.tsx` : garde lecture 7/7 chapitres avant d'accéder au Bilan
3. `actions.ts` (`createBilanSession`) : même garde côté Server Action
4. `VerifyForm.tsx` : validation du paramètre `next` (protection open redirect) + échappement apostrophe
5. `admin/users/[id]/page.tsx` : correction message "pas commencé" pour session complétée à 0 réponses
6. `admin/page.tsx` : affiche "0/13 ✓" pour un bilan complété avec 0 réponses

### Détail correction historique (commit 4180fc2)
- `BilanGateway` n'affichait que le dernier bilan complété (`.find()` au lieu de `.filter()`)
- Corrigé : toutes les sessions complétées passées en props, réponses indexées par `session_id`

### Détail commit a478b26 — règles produit
- `bilan-questions.ts` : interface `required?: boolean` + 5 questions marquées + export `REQUIRED_QUESTION_IDS`
- `actions.ts` : cooldown 30j dans `createBilanSession()`, vérification 5 obligatoires dans `completeBilanSession()`
- `page.tsx` : calcul `nextAvailableAt` passé à `BilanGateway`
- `BilanGateway.tsx` : bouton conditionnel / message date de disponibilité
- `BilanReader.tsx` : `missingRequiredIds`, blocage bouton, `completionError` state, check result de `completeBilanSession()`

### Détail commit 9f83127 — libellé questions obligatoires
- `BilanReader.tsx` : les 5 questions obligatoires affichent `✎ Réponse essentielle` au lieu de `✎ Répondre (optionnel)`
- Écran final : message liste les numéros d'écran des questions manquantes (ex. "questions 4, 9, 10 — utilise ← Précédent")

---

## 6. État actuel — ce qui fonctionne

| Fonctionnalité | État |
|---|---|
| Création de compte + code d'accès | ✅ |
| Lecture du livre (7 chapitres) | ✅ |
| Bilan de Clarté — saisie + sauvegarde | ✅ |
| Bilan — 5 réponses obligatoires (client + serveur) | ✅ |
| Bilan — cooldown 30 jours (client + serveur) | ✅ |
| Bilan — historique multi-sessions | ✅ |
| Dashboard utilisateur — état du parcours | ❌ à construire (V1) |
| Missions — vue utilisateur | ❌ à construire (V1) |
| Missions — réponse utilisateur | ❌ à construire (V1) |
| Admin — voir/gérer utilisateurs + bilan + diagnostic | ✅ |
| Admin — assigner une mission | ✅ |
| Admin — voir réponse utilisateur à une mission | ❌ à construire (V1) |

---

## 7. Prochaines étapes V1 (selon définition de terminé validée le 2026-07-31)

Le critère central V1 :
> Un utilisateur réel peut parcourir le cycle complet — du code d'accès à la réponse à sa première mission — sans sortir de l'application et sans intervention technique.

Reste à construire :
1. **Dashboard utilisateur** — afficher l'état du parcours (lecture, bilan, mission en cours)
2. **Vue mission utilisateur** — l'utilisateur voit la mission assignée par le coach
3. **Réponse à la mission** — l'utilisateur écrit sa réponse depuis l'app
4. **Confirmation de transmission** — l'utilisateur voit que sa réponse a été reçue
5. **Admin — réponse utilisateur** — le coach voit la réponse dans l'interface admin

---

## 8. Règles de développement non négociables

### Sécurité
- RLS systématique sur toutes les tables
- `SUPABASE_SERVICE_ROLE_KEY` uniquement server-side, jamais `NEXT_PUBLIC_`
- `ADMIN_EMAIL` comparé server-side uniquement
- Validation des entrées aux frontières système (input utilisateur, APIs externes)
- Séparation stricte User / Admin

### Processus
- Aucune modification sans GO explicite du propriétaire
- Aucun commit / push sans GO explicite
- Aucune migration SQL sans validation préalable
- Corrections minimales — pas de refactorisation sans nécessité directe
- Toujours : `tsc --noEmit` + ESLint + `npm run build` avant de proposer un commit
- Vérifications dans l'ordre : `git diff --check` → `tsc` → `eslint` → `build` → `git status` → `git diff --stat`

### Architecture
- Ne pas utiliser `profiles.livre_completed` (jamais écrit)
- Source de vérité lecture : `reading_progress` via `getReadingProgress()`
- localStorage = cache uniquement, Supabase = source de vérité
- Server Actions idempotentes : attraper l'erreur PostgreSQL `23505` pour la concurrence

---

## 9. Commandes utiles

```bash
# Dev local
npm run dev

# Vérifications avant commit
npx tsc --noEmit
npx eslint src/chemin/fichier.tsx --max-warnings=0
npm run build

# Git
git status --short
git log --oneline -5
git diff --stat
```

---

## 10. Ce qui est en attente

- **Push** des 2 derniers commits (`a478b26` et `9f83127`) sur `origin/main` — en attente du GO du propriétaire
- **Tests fonctionnels en production** des deux règles produit après déploiement
