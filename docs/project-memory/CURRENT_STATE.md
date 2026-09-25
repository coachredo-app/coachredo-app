---
name: current-state
description: État opérationnel vivant de CoachRedo App — où en est le projet et quelle est la prochaine action exacte.
metadata:
  type: project-memory
---

# CURRENT_STATE — CoachRedo App

Dernière mise à jour : 2026-09-25 (V9 — conception de collecte Mon point de départ V3 close, D-022)

**Ce document est vivant.** Il doit être mis à jour à chaque incrément fonctionnel significatif validé (cf. règle dans `CLAUDE.md`). S'il contredit le repo réel au moment où vous le lisez, faites confiance au repo et signalez la contradiction au QG.

---

## 1. Référence Git / production

| Élément | Valeur |
|---|---|
| Branche | `main` |
| Dernier commit fonctionnel/applicatif connu | `806a932` — `assets: add CoachRedo Music brand identity` (commit d'assets, pas de code applicatif — succède à `6db96d4` — `feat: pause Bilan during book testing` ; le commit intermédiaire `29ca9c8` est strictement documentaire et n'invalide jamais une baseline) |
| État de push | Poussé manuellement sur `origin/main`, déployé |
| Vercel Production | `Ready` |
| Smoke test production | Validé le 2026-09-09 par le QG |
| Migration 012 (Fondation Rapport) | Exécutée en production le 2026-09-10, vérifications post-exécution confirmées (voir §5) |
| Fermeture temporaire du Bilan (`BILAN_OPEN`) | `BILAN_OPEN=false` actif en Production depuis le 2026-09-11, phase testeurs du livre — voir §2 et D-017 |

`git status -sb` doit afficher `## main...origin/main` (clean) en début de session — si ce n'est pas le cas, il y a un travail en cours non documenté ici : investiguer avant toute chose, ne pas écraser.

---

## 2. Fonctionnalités terminées et closes

- **Livre Plan B Rentable** (7 chapitres) — lecture, progression cross-device fiabilisée (D-004).
- **Carte du parcours** (`/synthese`) — mind map post-lecture, impression/PDF (D-005). Une route `synthese/pdf/` existe dans le code (implémentation de la décision D-005) — **présence dans le repo confirmée, fonctionnement en Production non re-vérifié dans le cadre de cet audit.**
- **Bilan de Clarté V2** — chantier **clos** (D-012) : 17 éléments requis = C1+C2+C3 (3 questions contextuelles) + 13 réflexives + E1 (intros non comptées) ; upgrade V1→V2, migration du cas legacy orphelin, sélection canonique par `bilan_version=2 AND statut='completed'`. Un Bilan validé reste verrouillé (immuable) en production — confirmé par smoke test du 2026-09-09.
- **Dashboard client** — état du parcours (Livre/Bilan), logique `bilan_version`/`session_type` correcte (D-011), wording aligné sur la frontière produit Bilan/Rapport/Coaching (D-010).
- **Admin** — fiche utilisateur complète, gestion codes d'accès, file « Action requise » A/B/C pour les missions coaching (D-006, D-007 — système de coaching **legacy actuel**, pas l'architecture future), centralisation de l'autorisation admin (D-002).
- **Module Trading** — présent et actif dans le repo, mais son approche est **abandonnée** (D-016) — classé legacy, à auditer puis nettoyer dans un chantier dédié futur. Le futur Trading CoachRedo viendra du projet CMP Trading (développé séparément) une fois opérationnel.
- **Fondation mémoire projet** (`CLAUDE.md` + `docs/project-memory/`) — installée, versionnée et validée, commit `60cd0be` (D-014).
- **Fermeture temporaire du Bilan de clarté (phase testeurs du livre)** — chantier clos (D-017) : flag serveur unique `BILAN_OPEN` (`src/lib/bilan-flag.ts`), guard central dans `bilan/page.tsx` distinguant les 4 états (aucune session / `in_progress` / `completed` V2 / legacy V1 sans V2), neutralisation de `/bilan/upgrade`, écritures d'autosauvegarde (réponses + étape courante) migrées du client Supabase navigateur vers des Server Actions vérifiant le flag (client authentifié, RLS inchangé, aucun `service_role`). CTA dashboard et Carte du parcours (`/synthese`) reflètent l'état fermé. Commit `6db96d4`, déployé en Production le 2026-09-11, `BILAN_OPEN=false` actif.
  **Validé fonctionnellement en Production** pour les scénarios testables manuellement : Bilan V2 completed toujours consultable, legacy nécessitant upgrade suspendu (données conservées), utilisateur sans Bilan → écran « Bientôt disponible » (dashboard, synthese, et `/bilan` en accès direct par URL).
  **Non reproduit manuellement en Production** : le scénario « onglet Bilan déjà ouvert avant le déploiement de la fermeture » — sa robustesse repose sur la vérification du code faite avant déploiement (Server Actions gated par `BILAN_OPEN`, RLS inchangé), pas sur un test end-to-end en Production, pour ne pas manipuler inutilement des données réelles.
- **Archivage des assets officiels CoachRedo Music** — commit `806a932` : 5 assets de marque officiels (avatar, logo horizontal, logo principal transparent, monochrome blanc transparent, monochrome or transparent) archivés dans `public/assets/brand/coachredo-music/`, plus le monogramme historique CoachRedo (marque mère) archivé séparément dans `public/assets/brand/coachredo/coachredo-monogram.png`. Copies vérifiées bit-à-bit (SHA-256) depuis les fichiers sources fournis par le QG. **Archivage uniquement — aucun de ces assets n'est encore intégré à l'interface CoachRedo App.**

## 3. Chantier — Mon point de départ V3 (conception de collecte CLOSE, implémentation non ouverte)

**Nommage produit V3, introduit le 2026-09-23** : **Mon point de départ** (Bilan) → **Ma feuille de route** (Rapport). Ne s'applique pas rétroactivement au produit actuellement en production, toujours nommé Bilan de Clarté V2 / Rapport CoachRedo (§2, ARCHITECTURE §3/§6) — ni aux identifiants techniques réels (`bilan_sessions`, `rapports`, `BILAN_OPEN`).

L'audit stratégique indépendant post-Summit (Side Hustle Summit 2026, J1–J5) a servi de base à l'arbitrage. Séquence suivie (actée le 2026-09-11, complétée le 2026-09-25) : arbitrage ADOPTER / ADAPTER / REJETER → définition du Rapport idéal → matrice de compréhension CoachRedo → audit du Bilan V2 actuel → décision sur une future version → architecture UX du hub/parcours → **matrice finale de couverture Q1-Q36 (close, D-022)** → **prochaine étape : reprise de l'architecture technique de Ma feuille de route, non commencée (voir §8)**.

**Les 7 étapes retenues** : Ta situation aujourd'hui / Ce que tu veux changer / Ton parcours / Ce que tu as déjà en main / Ta façon d'avancer / Ce qui est possible pour toi aujourd'hui / Ce que tu observes autour de toi. Ceci reformule et précise ce que cette mémoire documentait précédemment comme des « familles » (Situation réelle, WHY/Direction personnelle, Parcours & expériences) — même chantier conceptuel, la structure à 7 étapes est désormais la référence.

**Conception du questionnaire (Q1-Q36) : CLOSE (D-022, 2026-09-25).** `docs/project-memory/MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md` est la source de vérité canonique pour le contenu des 36 questions + les deux micro-données ajoutées (territoire principal, Étape 1 ; actif relationnel mobilisable, Étape 4), les branches conditionnelles, les relances prédéfinies, les questions de récupération, les règles P0-P3, la réutilisation des données, INCONNU, et les verdicts finaux (CONSERVER / CONSERVER MAIS À AJUSTER) par question issus de l'audit individuel puis de l'audit inverse global de couverture décisionnelle. **Aucune suppression de question** n'a résulté de cet audit ; **aucun ajout futur « au cas où »** n'est autorisé — toute modification devra être justifiée par un besoin décisionnel démontré (D-022).

**Épistémologie des données — vocabulaire unifié (2026-09-23) :** l'ancienne formulation `SELF-DECLARED / EVIDENCE-BASED / INFERRED / CONTRADICTOIRE / INCONNU`, précédemment documentée ici, et `DÉCLARÉ / ÉTAYÉ / INFÉRÉ / CONTRADICTOIRE / INCONNU` sont **le même cadre conceptuel** — la seconde est désormais la terminologie canonique pour Mon point de départ V3 / Ma feuille de route (confirmé explicitement par le QG, cf. `MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md` §1). Ne concerne pas le cadre conversationnel volontairement distinct de `COACHING_DOCTRINE.md` §3.

Règles de conception détaillées (P0-P3, modèle de Dilts, contradiction = signal de clarification, budget de relances, classification SOCLE/CONDITIONNELLE/RÉCUPÉRATION, doctrine ÉTAT ACTUEL ≠ LIMITE PERMANENTE, etc.) : voir `MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md` §1 — non dupliquées ici pour ne pas surcharger ce fichier.

**Benchmark externe *Alchemy of Self* : terminé.** Son mécanisme « Journey Progress » (vue centrale des chapitres, déverrouillage progressif) a été étudié et challengé, **pas copié**.

**Architecture UX arbitrée le 2026-09-23 (D-019)** : hub à deux espaces (Mon point de départ | Ma feuille de route) ; 7 étapes visibles dès le départ mais parcours strictement séquentiel ; états À venir / À commencer / En cours / Terminée uniquement ; pas d'affichage du nombre de questions ; durée estimée par étape en fourchette non garantie (≈5–10 min, à calibrer) ; progression interne sans chiffre, ne reculant jamais ; règle de modification des étapes terminées basée sur la première nouvelle réponse enregistrée dans l'étape suivante ; navigation à trois fonctions distinctes (Retour / Voir mon parcours / Mon espace CoachRedo) ; page de transition dédiée en fin de parcours ; orientation narrative (pas diagnostique) retenue pour le futur chantier Ma feuille de route. Détail complet : `docs/project-memory/MON_POINT_DE_DEPART_V3.md`. **Décisions produit/UX uniquement — aucune spécification technique engagée** (liste de ce qui reste ouvert : §P du fichier).

**Distinct de ce chantier** : le Bilan de clarté actuel (V2, en production) reste temporairement gelé (`BILAN_OPEN=false`, voir §2 et D-017) pour la phase testeurs du livre — un gel opérationnel réversible, pas une refonte, qui ne préjuge d'aucune décision sur la future version évoquée ci-dessus.

**Chantier suivant, non commencé** : architecture technique de Ma feuille de route (mécanisme de convergence DÉCLARÉ→ÉTAYÉ, mécanismes déterministes de skip/recovery, mécanisme de filtrage produisant les voies/options, sélection du premier test, fonction de la section « Ton miroir CoachRedo », etc.) — voir §8 pour le détail complet des reports.

## 4. Travail partiellement terminé / non implémenté (à ne pas supposer existant)

- **Fondation Rapport — DB installée, accès applicatif restant à construire** — migration `012_rapport_foundation.sql` (commit `34f2ca1`) exécutée en production le 2026-09-10 : table `rapports` créée (schéma D-013 complet), contrainte `UNIQUE(user_id, id)` posée sur `bilan_sessions`, RLS activé sans policy, 0 ligne. `publie_par` et `updated_at` sont désormais tranchés (voir DECISIONS D-013). Restent non implémentés : RPC `SECURITY DEFINER` de lecture client, Server Actions Admin (création/édition du draft et publication), route `/rapport`, intégration UI dashboard/admin, fournisseur IA (toujours ouvert, non bloquant).
- **Mémoire de coaching multi-domaines (P3)** — **pausée, pas abandonnée** (D-008). La vision longitudinale est validée (D-015, PROJECT_BIBLE §6), mais aucune architecture (`coaching_engagements`, `coaching_timeline`, `mission_coach_notes`) n'est retenue. Le futur suivi coaching sera redessiné depuis zéro le moment venu — chantier dédié futur, non ouvert.
- **Nettoyage des surfaces coaching legacy dans l'admin** (`DiagnosticBloc`, `SignauxBloc`, `JournalBloc`, `MissionsBloc`, section « Action requise ») — classées legacy (ARCHITECTURE §9), administration à conserver, données jamais supprimées automatiquement. Chantier dédié futur, non ouvert.
- **Nettoyage du module Trading legacy** (D-016, ARCHITECTURE §8) — audit puis retrait des éléments applicatifs devenus inutiles, sans suppression destructive de données sans audit et GO. Chantier dédié futur, non ouvert.
- **Correction dette admin `bilan_version`** (ARCHITECTURE §4) — identifiée ; traitement prévu **dans le cadre du chantier Rapport**, pas séparément.
- **Édition papier de Plan B Rentable** (D-021) — **dormante** : dernier travail actif le 2026-06-19 (commit `141d735`), aucune activité depuis. Source de vérité : `livre/PRINT_HANDOFF.md`. Manuscrit intérieur figé, format 140×210mm, 62 pages, structure/marges/CSS d'impression et choix éditoriaux (polices, couleurs) finalisés ; couverture au stade prototype HTML. **Reste ouvert avant impression finale** : ISBN (placeholder non rempli), tranche exacte de couverture (calculateur KDP selon grammage), fond perdu de couverture (3mm à ajouter), polices à intégrer en local pour export offline, couverture finale à valider/produire. **Aucune preuve dans le repo d'une impression réalisée ou d'une commande passée.** Chantier dédié futur, non ouvert.

## 5. Migrations

Fichiers présents dans `supabase/migrations/` : `001_schema`, `001_trading_bootstrap`, `002_rls`, `003_bilan`, `004_coaching_tables`, `005_bilan_sessions`, `006_trading_rpc`, `007_fix_rpc_is_active`, `008_mission_unique_active`, `009_bilan_upgrade`, `010_bilan_superseded_upgrade`, `011_migrate_legacy_session`, `012_rapport_foundation`.

**012 exécutée avec succès en production le 2026-09-10** — vérifications post-exécution confirmées : contrainte `bilan_sessions_user_id_id_key` présente, `public.rapports` créée (schéma complet), RLS activé, 0 policy, 0 ligne, volumétrie `bilan_sessions` inchangée (12→12).

**013 est désormais le prochain numéro libre connu** — à **revérifier immédiatement avant toute création**, ne pas le considérer comme définitivement figé.

**Statut d'exécution en production :** le smoke test du 2026-09-09 valide fonctionnellement le Bilan V2 (migrations 009-011 actives). La migration 008 (`mission_unique_active`) est **considérée comme exécutée, et P2 comme clôturé/déployé, selon l'état QG validé** — le repo prouve la définition du fichier, l'historique QG validé constitue la preuve opérationnelle déclarée (cf. DECISIONS D-007).

## 6. Risques / précautions actives

- Ne jamais exécuter de migration SQL sans GO explicite — règle qui a gouverné l'exécution de la migration 012 (Rapport, exécutée le 2026-09-10) et qui reste active pour toute migration SQL future (013+, notamment si elle porte la future RPC de lecture client). Tout développement applicatif (Server Actions Admin du Rapport, intégration UI) reste également soumis à un GO QG explicite, mais relève du code applicatif — à ne pas confondre avec une migration SQL.
- Ne jamais utiliser `profiles.bilan_completed_at` ou `profiles.livre_completed` comme source de vérité.
- Appliquer les mêmes critères sémantiques que le dashboard pour toute sélection du Bilan canonique (ARCHITECTURE §3) — sans nécessité de copier littéralement une requête, l'équivalence sémantique suffit.
- Ne jamais commit ni push sans GO — le push reste manuel, fait par Coach Redouane.
- `typescript: { ignoreBuildErrors: true }` reste actif dans `next.config.ts` — dette technique de type-safety avec impact/risque indirects possibles, pas une vulnérabilité de sécurité en soi.
- `handoff/` reste hors git — ne jamais proposer de le tracker sans décision QG explicite.
- **Aucune suppression destructive de données/tables** (coaching legacy, Trading legacy) sans audit préalable et GO explicite.
- `BILAN_OPEN=false` actif en Production (phase testeurs du livre, depuis le 2026-09-11) — gèle toute nouvelle production de données Bilan (création, reprise/saisie, upgrade) ; la consultation d'un Bilan V2 déjà `completed` reste active. Réouverture = repasser la variable à `true` (ou la retirer) en Vercel Production puis redéployer — aucune migration, aucune donnée à réconcilier. Voir D-017.
- **Bug terrain actif, non résolu** : affichage initial du Reader mobile fortement zoomé/décalé sur iPhone, rapporté par un vrai lecteur (dézoom manuel à deux doigts nécessaire pour corriger). Diagnostic fait par inspection de code uniquement le 2026-09-16 (capture jamais reçue) — balise viewport et protections anti-overflow existantes inspectées, **aucune cause repo directe démontrée**. Pistes non confirmées (navigateur in-app, chaîne de redirections au premier accès, comportement WebKit `viewport-fit=cover`) — ce sont des hypothèses classées par probabilité, pas des faits établis. Aucune correction choisie ni autorisée. Détail complet : `handoff/20260916_handoff_point_de_coupure.md`.

## 7. Décisions ouvertes (nécessitent un arbitrage QG)

- Choix du fournisseur IA pour la génération du Rapport — différable, non bloquant.
- Statut de `HANDOFF_CHATGPT.md` et `TECHNICAL_HANDOFF.md` (racine, trackés, obsolètes par endroits) — restent intacts pour l'instant ; leur archivage/suppression sera décidé dans un ménage séparé, une fois la nouvelle mémoire installée et validée. Ne bloque pas le chantier Rapport.
- Durée de la phase testeurs du livre et date de réouverture du Bilan — non fixée à ce stade ; dépend de l'avancement de cette phase, pas du calendrier du chantier Rapport.

**Chantiers dédiés futurs identifiés, mentionnés mais non ouverts :** nettoyage des surfaces coaching legacy dans l'admin ; nettoyage du module Trading legacy ; redesign du suivi coaching (post-P3) ; audit de l'usage réel de `stripe`.

## 8. Prochaine action exacte

**Matrice finale de couverture Q1-Q36 : CLOSE (D-022, 2026-09-25).** L'audit individuel des 36 questions puis l'audit inverse global (parti des décisions que Ma feuille de route doit éclairer pour vérifier en sens inverse la couverture de Q1-Q36) sont terminés et arbitrés. Aucune suppression de question, deux micro-données ajoutées (territoire principal en Étape 1, actif relationnel mobilisable en Étape 4). Détail canonique complet : `docs/project-memory/MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md`.

**Chantier suivant, non commencé à ce stade, à ouvrir explicitement par le QG :** architecture technique de Ma feuille de route. Reports explicitement identifiés par l'audit de clôture (D-022), aucun n'est tranché :
- Mécanisme de convergence DÉCLARÉ → ÉTAYÉ (comment plusieurs signaux DÉCLARÉS convergent vers un niveau de preuve supérieur) — aucun principe de scoring n'a été défini à dessein.
- Mécanismes déterministes de skip/recovery (branche moyen/long terme de Q6, WHY conditionnel, Q15, Q25, et les autres triggers déjà identifiés dans le fichier questionnaire).
- Mécanisme de réutilisation UX pour les chevauchements identifiés (Q16/branche activité existante de Q1, Q11/Q33).
- Seuils et algorithme du principe à 3 niveaux de Q20 (action numérique requise par la route : autonome / accompagnement léger / acquisition significative).
- Mécanisme d'exploration élargie de CoachRedo hors des environnements spontanément cités par la personne (Q33/Q34).
- Mécanisme de filtrage/croisement produisant les voies/options elles-mêmes — cœur de l'architecture technique, aucune question ne le fournit directement (normal, c'est un produit d'analyse).
- Mécanisme du point de choix de la personne dans l'architecture UX hub/étapes (« la personne décide »).
- Fonction exacte de la section « Ton miroir CoachRedo » du futur rapport — **ne devra jamais devenir un profil psychologique ni une affirmation identitaire**, risque déjà identifié comme le plus élevé de l'architecture du rapport envisagée.
- Position écran et numérotation définitive de Q1-Q36 et des deux micro-données ajoutées.
- Opérationnalisation déterministe complète de P0/P1/P2/P3 et du budget global de relances (déjà HYPOTHÈSE V1 à tester).
- Architecture détaillée de génération de Ma feuille de route et de sélection du premier test.

Après ouverture explicite de ce chantier par le QG, la séquence prévue reste (voir §3) : architecture technique de Ma feuille de route/Rapport → conception puis implémentation de la RPC `SECURITY DEFINER` de lecture contrôlée côté client (un utilisateur authentifié ne peut récupérer que son propre Rapport publié — champs strictement limités à `id, sections, contenu_coach, publie_le`, conformément à D-013), **sauf décision QG contraire issue de cette séquence**. Le choix du fournisseur IA reste **ouvert, différé et non bloquant**.

**En parallèle, sans lien avec ce qui précède** : le Bilan actuel (V2, en production) reste gelé (`BILAN_OPEN=false`, §2, §6, D-017) pendant la phase testeurs du livre. Ce gel n'est pas une action de ce chantier et n'a pas vocation à être réévalué automatiquement, sauf si le QG le demande explicitement.
