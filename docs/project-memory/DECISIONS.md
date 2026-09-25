---
name: decisions
description: Registre chronologique des décisions structurantes de CoachRedo App — ce qui empêche de refaire une erreur ou de rouvrir un arbitrage déjà tranché.
metadata:
  type: project-memory
---

# DECISIONS — CoachRedo App

Dernière mise à jour : 2026-09-25 (V10 — D-022 ajoutée, clôture de la conception de collecte Mon point de départ V3)

Ce registre ne contient que les décisions structurantes — pas les discussions intermédiaires. Chaque entrée : sujet, décision, pourquoi, conséquence, statut. Une décision remplacée reste visible avec `Statut: SUPERSEDED`, jamais supprimée.

---

### D-001 — Admin = email unique, pas de rôle en base
**Date :** origine du projet (confirmé actif jusqu'au 2026-08-25)
**Décision :** l'administration est identifiée par `user.email === process.env.ADMIN_EMAIL`. Aucune table de rôles, aucune colonne `is_admin`, aucun claim JWT custom.
**Pourquoi :** un seul coach à ce stade — solution volontairement minimale.
**Conséquence :** toute future logique « qui est admin » doit passer par ce même mécanisme (ou une décision QG explicite pour le faire évoluer vers un vrai système de rôles si un second admin apparaît).
**Statut :** ACTIVE

---

### D-002 — Centralisation de la primitive admin (`requireAdminService()`)
**Date :** 2026-08-25
**Décision :** un point d'entrée unique, `src/lib/admin.ts::requireAdminService()`, remplace 2 helpers dupliqués (`checkAdmin`, `requireAdmin`) et un check inline — 13 call-sites migrés.
**Pourquoi :** la logique de vérification admin était dupliquée 7 fois dans le repo sans jamais être centralisée ; risque de divergence et d'oubli de guard sur une nouvelle fonction sensible (cas concret trouvé : `getTradingAdminData` bypassait RLS sans aucun guard).
**Conséquence :** toute nouvelle Server Action admin doit démarrer par `const service = await requireAdminService()`. Les 3 pages Server Component admin (`admin/page.tsx`, `admin/codes/page.tsx`, `admin/users/[id]/page.tsx`) restent volontairement hors de ce helper — elles utilisent `redirect()`, un mécanisme Next.js incompatible avec un helper qui `throw`.
**Statut :** ACTIVE

---

### D-003 — `handoff/` jamais tracké par git
**Date :** 2026-08-25
**Décision :** le dossier `handoff/` (comptes-rendus d'audit inter-sessions) est ajouté à `.gitignore`, volontairement non versionné.
**Pourquoi :** il contient des cartographies détaillées de failles/patterns de sécurité et des audits internes — un risque opérationnel concret s'il était poussé sur un dépôt public ou semi-public. Il n'a par ailleurs jamais été tracké.
**Conséquence :** `handoff/` reste un espace de travail local, propre à cette machine — jamais la source de mémoire persistante inter-sessions/machines. C'est pourquoi `docs/project-memory/` (ce dossier) est créé et **doit**, lui, être tracké par git (cf. D-014).
**Statut :** ACTIVE

---

### D-004 — Correction du parcours de lecture (BUG A/B/C)
**Date :** 2026-08-25/26
**Décision :** `reading_progress` devient la source de vérité exclusive côté serveur pour la progression de lecture. `/resume` devient un Server Component qui lit `reading_progress` (au lieu du localStorage seul). `fetchAndMergeProgress` lit aussi `reading_progress` en plus de `chapter_progress`. Les writes `upsertReadingComplete` deviennent inconditionnellement idempotents (retry implicite). Le statut visuel du Bilan sur le dashboard est verrouillé (`locked`) tant que `!reading.fullyDone`.
**Pourquoi :** `/resume` ne lisait que le localStorage → cassé cross-device et après vidage du cache (l'utilisateur repartait de l'intro au lieu de reprendre où il en était réellement, côté serveur).
**Conséquence :** `chapter_progress` reste un cache client toléré à la divergence, mais aucun flux critique ne doit plus en dépendre exclusivement.
**Statut :** ACTIVE

---

### D-005 — Carte du parcours (`/synthese`) : positionnement et architecture technique
**Date :** 2026-08-26/27
**Décision :** une mind map de synthèse du livre (structure éditoriale VOIR → RECENTRER → AGIR) est accessible **uniquement après avoir terminé le livre** (`reading.fullyDone`), jamais avant le Bilan comme étape imposée du flux `/transition`. Implémentation en HTML/CSS React statique + `window.print()` — zéro nouvelle dépendance (pas de canvas, pas de librairie de mind map).
**Pourquoi :** un accès avant le Bilan risquait de « primer » les réponses du client (la charnière éditoriale « Qu'est-ce que j'ai déjà ? » ressemble à une question introspective du Bilan). Le zéro-dépendance était une contrainte projet explicite.
**Conséquence :** pour l'export PDF sur iPhone (`window.print()` peu fiable sur iOS Safari selon version/contexte), la solution retenue est un **PDF pré-généré statique** servi en téléchargement (Option A parmi 4 comparées) plutôt que `html2canvas`/`jsPDF` (fonts/CSS non fiables), Puppeteer serveur (incompatible limite 50 Mo Vercel Hobby/Pro) ou `pdf-lib` (réécriture complète, jugée non viable).
**Statut :** ACTIVE

---

### D-006 — Admin « Action requise » : règle A/B/C
**Date :** 2026-08-29
**Décision :** file de suivi coach basée sur 3 catégories mutuellement exclusives — **A** (Bilan complété, aucune mission active), **B** (au moins une mission active avec réponse client), **C** (aucune mission active avec réponse, et au moins une mission active sans réponse dépassant 3 jours). La règle évalue **toutes** les missions actives d'un utilisateur, pas seulement la plus récente.
**Pourquoi :** plusieurs missions actives simultanées sont un cas réel (aucun guard n'existait à l'origine) — une règle basée sur « la plus récente seulement » aurait masqué des missions anciennes en retard.
**Conséquence :** le seuil de relance (3 jours) est une constante unique modifiable en tête de fichier, sans logique de notification automatique en V1.
**Note (2026-09-09) :** cette règle décrit le **système de coaching legacy actuel** — elle ne constitue pas l'architecture future du coaching (cf. D-008, D-015, PROJECT_BIBLE §6). Elle reste active tant que le nouveau suivi coaching n'est pas rouvert.
**Statut :** ACTIVE (système legacy)

---

### D-007 — Continuité client (P2) : une seule mission active, wording honnête
**Date :** 2026-08-29/30
**Décision :** un guard applicatif dans `addMission` refuse la création d'une 2ᵉ mission active (le bouton admin se masque aussi). Le message « Tu seras notifié dès qu'une mission est disponible » (faux — aucun mécanisme de notification n'existe) est supprimé. Un bloc « dernier cycle » affiche la mission précédente terminée + réponse du client.
**Pourquoi :** rien n'empêchait techniquement plusieurs missions actives (source d'incohérence entre ce que voit le coach et ce que voit le client) ; le texte de notification était un mensonge UX.
**Conséquence :** migration `008_mission_unique_active.sql` (index unique partiel `user_id WHERE statut='en_cours'`) créée en miroir de `idx_bilan_sessions_one_active`. **Statut d'exécution en production (2026-09-09) : considérée comme exécutée, et P2 comme clôturé/déployé, selon l'état QG validé.** Distinction conservée par rigueur documentaire : le repo prouve la définition du fichier de migration ; l'historique QG validé constitue la preuve opérationnelle déclarée.
**Note (2026-09-09) :** comme D-006, cette règle décrit le **système de coaching legacy actuel** — elle ne constitue pas l'architecture future du coaching.
**Statut :** ACTIVE (système legacy) — migration considérée EXÉCUTÉE en production.

---

### D-008 — Chantier « mémoire de coaching » (P3) : exploré en profondeur, pausé — pas abandonné
**Date :** 2026-08-30 (exploration) → 2026-09-09 (statut clarifié par le QG)
**Décision :** trois architectures alternatives avaient été conçues pour capturer l'analyse du coach à la clôture d'une mission :
1. `user_missions.coach_closing_note` (colonne simple) ;
2. `coaching_engagements` + `coaching_timeline` (fondation multi-domaines complète, `event_type` enum) ;
3. `mission_coach_notes` (table dédiée, sans policy client).

Ces trois propositions sont documentées comme **explorations historiques** — utiles pour comprendre le raisonnement passé, mais **aucune ne doit apparaître comme architecture cible déjà décidée**, y compris `mission_coach_notes` qui avait été notée comme « recommandation finale » dans l'audit du 2026-08-30 : cette conclusion est **dépassée** par la décision ci-dessous.

**Décision actuelle (2026-09-09) :** ce chantier est **pausé, pas abandonné**. Lorsque le nouveau suivi coaching sera rouvert, il sera **redessiné proprement depuis zéro**, autour des besoins alors validés — pas repris tel quel depuis ces trois propositions. La vision de mémoire longitudinale qui motivait ce chantier est préservée et validée comme vision stratégique — voir D-015 et PROJECT_BIBLE §6.
**Pourquoi :** chaque mission clôturée sans trace d'analyse coach est une information perdue ; problème jugé mineur à 10 clients, structurel à 50. La priorité a cependant été donnée à d'autres chantiers (Bilan V2, fondation mémoire projet).
**Conséquence :** ne pas supposer l'existence de `coaching_engagements`, `coaching_timeline` ou `mission_coach_notes`. Ne pas relancer ce chantier en repartant de l'une de ces trois propositions sans re-valider les besoins.
**Statut :** PAUSÉ (vision préservée, implémentation non engagée)

---

### D-009 — Autres chantiers déconseillés (revue stratégique post-P1/P2)
**Date :** 2026-08-30
**Décision :** ne pas construire, **pour l'instant** : un système de notifications email/push automatisées, une messagerie coach-client intégrée à l'app (WhatsApp existe déjà et fonctionne), des suggestions de missions générées par IA, un tableau de bord analytics.
**Pourquoi :** infrastructure disproportionnée par rapport au problème réel à ce stade ; le canal WhatsApp existant couvre déjà la communication ; les données nécessaires à des métriques utiles sont encore trop fragmentées (dépendent du chantier D-008, pausé) ; automatiser les missions risquerait de dégrader la valeur perçue de l'accompagnement humain.
**Conséquence :** ceci est une **priorité historique/actuelle de ne pas construire maintenant — pas une interdiction éternelle.** Si l'un de ces sujets revient, vérifier d'abord que le contexte (charge clients, données disponibles) a changé depuis cette évaluation.
**Statut :** ACTIVE (priorité actuelle, révisable)

---

### D-010 — Frontière produit : Bilan/Rapport ≠ Coaching
**Date :** identifiée le 2026-08-31 (via un bug produit concret), reconfirmée et verrouillée le 2026-09-09
**Décision :** le parcours pédagogique (Livre → Bilan → Rapport) est distinct et complet en lui-même. Le Business Coaching est une phase optionnelle et distincte, jamais démarrée implicitement. Aucun engagement de coaching ne doit être créé automatiquement à la fin du Bilan ou à la publication du Rapport.
**Pourquoi :** un bug dashboard réel affichait « Ton Bilan a bien été transmis. Ton coach prépare la suite de ton accompagnement » à un utilisateur qui n'avait même pas terminé le livre — révélant que le wording confondait implicitement Bilan et entrée en coaching.
**Conséquence :** tout wording produit et toute logique serveur doivent respecter cette séparation. Voir PROJECT_BIBLE §5.
**Statut :** ACTIVE

---

### D-011 — Bug dashboard : conditions manquantes sur les blocs d'état
**Date :** 2026-08-31 (diagnostic) → 2026-09-04/05 (dashboard corrigé avec la logique `bilan_version`/`session_type`)
**Décision :** le bloc « Ton Bilan a bien été transmis » doit être conditionné à `bilanCompleted` réel (pas seulement « pas de mission active ») ; le dashboard doit dériver `hasV1History` / `hasCompletedV2` / `needsUpgrade` / `bilanCompleted` depuis **toutes** les sessions de l'utilisateur, pas seulement la plus récente par `session_num`.
**Pourquoi :** un utilisateur ayant ouvert le livre sans le terminer, sans jamais avoir soumis de Bilan, voyait pourtant le message « Bilan transmis » — car ce bloc ne vérifiait que l'absence de mission, jamais l'état réel du Bilan.
**Conséquence :** ces critères sémantiques corrigés sont désormais la référence de sélection du Bilan côté client (voir ARCHITECTURE §3).
**Statut :** ACTIVE — implémentée, confirmée présente dans `dashboard/page.tsx` au HEAD `3eb835a`.

---

### D-012 — Bilan V2 : versionnement, upgrade legacy, et clôture du chantier
**Date :** 2026-09-03 → 2026-09-05
**Décision :** `bilan_sessions` gagne `bilan_version` (NULL = V1 legacy, 2 = V2) et `session_type` (`standard`|`upgrade`), plus le statut `superseded`. Deux RPC `SECURITY DEFINER` gèrent la migration : `create_upgrade_bilan_session()` (V1 **completed** → V2 upgrade, avec copie des réponses) et `migrate_legacy_session()` (V1 **in_progress orphelin sans aucun completed** → V2 standard directement). Invariant corrigé en cours de route : un V1 `superseded` seul (sans `completed`) **ne prouve pas** qu'un Bilan a été validé — la garde côté produit (`hasV1History` en TypeScript, `migrate_legacy_session()`) teste `statut = 'completed'` strictement. Détail technique complet et nuance sur le SQL déjà déployé de `create_upgrade_bilan_session()` : voir ARCHITECTURE §3.
**Pourquoi :** des utilisateurs avaient des sessions V1 orphelines (in_progress, jamais complétées) issues de l'ancien système — un cas non couvert par le premier design de l'upgrade.
**Conséquence :** le chantier Bilan V2 est **clos** — tous les cas identifiés sont couverts et testés. Composition exacte des 17 éléments requis : C1+C2+C3 (3 questions contextuelles) + 13 réflexives + E1 — les intros ne sont pas comptées (cf. PROJECT_BIBLE §4). C3 (`contexte_priorite`, texte libre, 150 caractères max) a été ajouté après cette clôture, confirmé présent dans `bilan-questions.ts` au HEAD `3eb835a`.
**Statut :** ACTIVE — clos, smoke-testé en production le 2026-09-09 selon le QG.

---

### D-013 — Schéma et sécurité de la table `rapports` (fondation Rapport)
**Date :** 2026-09-06 → 2026-09-07 (structure), précisée le 2026-09-09 (lifecycle et points ouverts)
**Décision :**
- **Cardinalité :** `UNIQUE(bilan_session_id)` — un seul Rapport total par session Bilan, tous statuts confondus. Rejeté : deux index partiels séparés pour `draft` et `published` (permettrait 1 draft + 1 published simultanés = un système de révision implicite, refusé en V1).
- **Intégrité propriétaire :** FK composite `(user_id, bilan_session_id) → bilan_sessions(user_id, id)` — robustesse au niveau DB, non contournable même par `service_role`. Rejeté : validation applicative seule (bypassable), trigger `BEFORE INSERT` (overhead jugé disproportionné face à une FK déclarative suffisante).
- **Séparation client/interne :** aucune policy `SELECT` `authenticated` sur `rapports`. Accès client exclusivement via une fonction de lecture `SECURITY DEFINER` dédiée, qui ne retourne que `id, sections, contenu_coach, publie_le`. Rejeté : vue Postgres avec RLS (fragile sur Supabase/PostgREST, edge cases documentés), table séparée client/admin (duplication et complexité disproportionnées pour V1).
- **`sections_meta`** (evidence_refs + warnings de validation) : jsonb séparé, jamais mêlé au contenu éditorial `sections`, jamais exposé au client.
- **`rapport_type`** : rejeté — future-proofing sans second cas d'usage actuel ; additive facilement plus tard si besoin réel.
- **Lifecycle V1, strict :** `draft → published`, sans autre transition. **Aucune procédure de dépublication/retour arrière (y compris via `service_role`) n'est documentée comme officielle** — une future architecture de correction/révision/historisation sera un chantier explicite séparé, pas un contournement documenté en attendant.
**Points explicitement OUVERTS (2026-09-09), à ne pas traiter comme tranchés :**
- **`publie_par`** — type et provenance ouverts, à auditer/trancher pendant le chantier Rapport.
- **Fournisseur IA** — ouvert, différé, **non bloquant**. L'interface provider-neutral (contrat), elle, est décidée.
**Pourquoi :** détail complet des comparaisons dans les audits `handoff/20260906_QG_audit_rapport_architecture*.md` et `20260907_QG_rapport_arbitrage_data_final.md` (non versionnés, locaux).
**Conséquence :** ce schéma est la référence pour la migration 012.

**Résolution (2026-09-10) — fondation DB exécutée en production :**
- Migration `012_rapport_foundation.sql` créée (commit `34f2ca1`, poussé sur `main`) et **exécutée avec succès en production le 2026-09-10** (vérifications post-exécution confirmées par le QG : contrainte `bilan_sessions_user_id_id_key` présente, table `rapports` créée conforme au schéma ci-dessus, RLS activé, 0 policy, 0 ligne, volumétrie `bilan_sessions` inchangée 12→12).
- **`publie_par` tranché** : `uuid references auth.users(id) on delete set null`. L'UUID admin est l'identité stable (contrairement à l'email, qui peut changer) ; `on delete set null` (et non `no action`) car le Rapport appartient au client et doit survivre à la suppression d'un ancien compte admin — `publie_le` reste la preuve durable de publication même si `publie_par` devient `NULL` par la suite.
- **`updated_at` tranché** : `DEFAULT now()`, sans trigger générique — mise à jour posée explicitement (`updated_at = now()`) par les futures Server Actions, cohérent avec le pattern déjà en place sur `bilan_responses` (aucun trigger générique n'existe dans ce repo, cf. ARCHITECTURE §3).
- **Invariant de publication ajouté** : contrainte `rapports_publication_consistency_check` — `statut = 'draft' ⇒ publie_le IS NULL AND publie_par IS NULL` ; `statut = 'published' ⇒ publie_le IS NOT NULL`. Permet une publication atomique en une seule opération. Le lifecycle reste strictement `draft → published` (V1) : aucune procédure de révision/correction post-publication n'est décidée par cette résolution — une telle architecture, si elle voit le jour, restera un chantier explicite séparé.
- **Reste ouvert** : fournisseur IA (différé, non bloquant).
- **Reste à construire**, hors périmètre de cette migration : RPC `SECURITY DEFINER` de lecture client, Server Actions Admin de création/édition du draft et publication, intégration UI, correction de la dette admin `bilan_version` (incrément séparé, cf. ARCHITECTURE §4).

**Statut :** ACTIVE — structure verrouillée **et fondation DB exécutée en production** (2026-09-10, migration 012). `publie_par` et `updated_at` tranchés. RPC de lecture client et Server Actions Admin restent à construire. Fournisseur IA reste ouvert.

---

### D-014 — Fondation mémoire projet persistante
**Date :** 2026-09-09
**Décision :** création de `CLAUDE.md` + `docs/project-memory/{PROJECT_BIBLE,ARCHITECTURE,DECISIONS,CURRENT_STATE}.md`, destinés à être **trackés par git** — à la différence de `handoff/` qui reste local (D-003).
**Pourquoi :** les sessions Claude Code/ChatGPT changent régulièrement ; le contexte produit et technique doit survivre au-delà d'une session et d'une machine, ce que `handoff/` (gitignored) ne permet pas structurellement.
**Conséquence :** toute nouvelle session doit lire ces documents avant d'intervenir (cf. `CLAUDE.md`). Mise à jour disciplinée : ne pas alourdir ces fichiers à chaque micro-changement, seulement aux incréments significatifs validés.
**Statut :** ACTIVE — implémentée et versionnée dans le repo au commit `60cd0be`.

---

### D-015 — Vision multi-domaines et mémoire longitudinale CoachRedo — VALIDÉE comme vision stratégique
**Date :** 2026-09-09 (arbitrage stratégique QG, transmission complémentaire du QG historique)
**Décision :** la vision multi-domaines est **validée comme vision stratégique** : CoachRedo pourra à terme accompagner une même personne à travers plusieurs domaines/parcours d'accompagnement, dont Business et de futurs domaines pertinents, tout en conservant lorsque pertinent une continuité longitudinale entre eux, via un futur « Dossier/Mémoire CoachRedo » distinguant mémoire déclarative et mémoire comportementale, selon le principe « les modules possèdent leurs données métier ; CoachRedo possède l'histoire de transformation de la personne ». **Aucune architecture particulière n'est validée comme cible d'implémentation actuelle** — ni celles explorées en P3 (D-008), ni aucune autre. **Cette vision ne constitue pas non plus un invariant d'organisation technique** : elle n'implique ni plateforme applicative unique, ni modules, ni services obligatoires — l'organisation technique future sera décidée selon les besoins réels (cf. PROJECT_BIBLE §11).

**Précision (2026-09-09) — Trading n'est pas un domaine d'accompagnement déjà décidé :** Trading appartient à la vision future de l'écosystème CoachRedo (D-016), mais sa forme d'intégration future n'est pas décidée — module, outil, parcours pédagogique, accompagnement, ou autre architecture pertinente. Cette forme sera déterminée lorsque le projet CMP Trading sera suffisamment opérationnel. Trading ne doit donc pas être énuméré comme exemple déjà décidé de « domaine/parcours d'accompagnement ».

**Précision (2026-09-09) :** un domaine/parcours d'accompagnement (Business, futurs) est également distinct des autres branches de l'écosystème CoachRedo (ex. CoachRedo Music) — une branche peut porter l'identité et les valeurs de l'écosystème sans être un domaine de coaching. Voir PROJECT_BIBLE §6.
**Pourquoi :** éviter que des décisions techniques prises aujourd'hui (schémas, découpage de tables, périmètre du MVP, organisation applicative) ferment inutilement des portes qu'une vision multi-domaines confirmée nécessitera plus tard — sans pour autant figer une architecture technique qui n'est pas encore justifiée.
**Conséquence :** cette validation ne déclenche aucune implémentation. Elle doit être gardée à l'esprit lors de futures décisions de schéma (ex. éviter un couplage trop rigide d'une donnée à un seul domaine quand l'effort de généralisation est faible), sans faire dévier le MVP actuel vers une architecture anticipée non nécessaire, et sans présumer d'une organisation technique (plateforme unique ou non) qui reste à décider le moment venu.
**Statut :** ACTIVE (vision validée, implémentation non engagée)

---

### D-016 — Trading dans CoachRedo App : abandon de l'intégration précoce
**Date :** 2026-09-09 (arbitrage stratégique QG)
**Décision :** l'intégration Trading présente dans CoachRedo App provient d'une première phase exploratoire commencée trop tôt. Cette approche est **abandonnée**. Les éléments applicatifs devenus inutiles ont vocation à être retirés **après audit**. **Aucune suppression destructive de données ou de tables sans audit et GO explicite.** Le futur Trading sera intégré ultérieurement à partir de l'architecture réelle du projet CMP Trading, une fois celui-ci opérationnel — CMP Trading est développé séparément, avec pour priorité actuelle son cœur Pine Script sur TradingView.
**Pourquoi :** l'intégration actuelle anticipait un projet Trading qui n'était pas encore mature ; poursuivre son développement dans CoachRedo App créerait une dette d'architecture vis-à-vis d'un projet CMP qui évolue indépendamment.
**Conséquence :** le module Trading actuel (`[locale]/(platform)/trading/`, tables `trading_*`) est classé **legacy** (voir ARCHITECTURE §8). Aucune nouvelle fonctionnalité Trading ne doit être ajoutée à cette ébauche. Le nettoyage est un chantier dédié futur, non ouvert à ce jour.
**Statut :** ACTIVE (abandon de l'approche actée ; nettoyage non engagé)

---

### D-017 — Fermeture temporaire du Bilan de clarté pendant la phase testeurs du livre
**Date :** 2026-09-11
**Décision :** pendant la phase de test du livre Plan B Rentable auprès de premiers clients testeurs, le Bilan de clarté actuel est gelé via un flag serveur unique `BILAN_OPEN` (`src/lib/bilan-flag.ts` — `process.env.BILAN_OPEN !== 'false'`). `BILAN_OPEN=false` empêche toute nouvelle production de données Bilan : création d'une première session, reprise/saisie d'une session `in_progress` (y compris la migration automatique d'une session legacy orpheline via `migrate_legacy_session()`), et démarrage d'un upgrade V2 pour un legacy V1 `completed` sans V2 — sans toucher Supabase ni RLS. La consultation en lecture seule d'un Bilan V2 déjà `completed` reste pleinement active.

Les écritures d'autosauvegarde (réponses + étape courante), qui passaient auparavant directement du navigateur vers Supabase (`src/lib/reader/bilan-sync.ts`, client `createBrowserClient`), ont été converties en Server Actions (`saveBilanResponseAction`, `updateCurrentStepAction`, ajoutées à `bilan/actions.ts`) vérifiant `BILAN_OPEN` avant écriture — nécessaire pour neutraliser un onglet Bilan resté ouvert avant le déploiement de la fermeture, qui aurait sinon continué à écrire directement via RLS sans jamais passer par ce contrôle. Ces Server Actions utilisent le client Supabase **authentifié** de l'utilisateur (jamais `service_role`) ; l'ownership reste garanti par les policies RLS déjà en place (`bilan_responses_insert/update/delete_active_session`, `bilan_sessions_update_step_own`, migration `005_bilan_sessions.sql`), **inchangées**.

**Pourquoi :** donner accès au livre à des clients testeurs sans les exposer au Bilan actuel, dont l'avenir (refonte, ajustement ou statu quo) dépend de l'arbitrage QG post-J5 (Side Hustle Summit) — éviter de collecter des données Bilan sur une version que le QG pourrait vouloir faire évoluer.

**Conséquence :** commit `6db96d4` (`feat: pause Bilan during book testing`), poussé sur `main` et déployé en Production le 2026-09-11, `BILAN_OPEN=false` actif. Réversible sans migration : repasser `BILAN_OPEN` à `true` (ou retirer la variable) en Vercel Production puis redéployer restaure intégralement le comportement antérieur — aucune donnée n'a été supprimée ni transformée pendant la fermeture.

**Validation — distinguer Production et code :**
- **Validé fonctionnellement en Production** (tests manuels QG, 2026-09-11) : Bilan V2 `completed` toujours consultable, aucune nouvelle session créée ; legacy nécessitant une mise à niveau suspendu, données conservées, aucun nouvel upgrade V2 ; utilisateur sans Bilan → livre terminé normalement, dashboard et Carte du parcours affichent « Bientôt disponible » ; accès direct par URL à `/bilan` → écran d'attente, aucune question accessible, aucune session créée.
- **Non reproduit manuellement en Production** : le scénario « onglet Bilan déjà ouvert avant le déploiement de la fermeture ». Sa robustesse repose sur la vérification du code faite avant déploiement (Server Actions gated par `BILAN_OPEN`, RLS inchangé, `tsc`/`eslint`/`build` passés) — pas sur un test end-to-end en Production, pour ne pas manipuler inutilement des données réelles.

**Statut :** ACTIVE — `BILAN_OPEN=false` en vigueur en Production depuis le 2026-09-11, durée liée à la phase testeurs du livre, sans date de réouverture fixée à ce stade. Ne préjuge d'aucune décision sur une future version du Bilan (cf. CURRENT_STATE §3).

---

### D-018 — Doctrine formalisée du coaching humain CoachRedo (copilote IA)
**Date :** 2026-09-16
**Décision :** formalisation d'une doctrine méthodologique durable pour le coaching humain CoachRedo assisté par IA (posture copilote, discipline d'analyse DÉCLARÉ/OBSERVATION/HYPOTHÈSE/INCONNU, conduite de séance, dossier longitudinal, limites médicales/psychologiques/juridiques/sécurité, rôle de challenge de l'IA) — détail complet dans `docs/project-memory/COACHING_DOCTRINE.md`, prompt maître de démarrage dans `docs/project-memory/COACHING_SESSION_TEMPLATE.md`.
**Pourquoi :** disposer d'une référence stable et comparable d'une fenêtre client à l'autre, plutôt que de redéfinir la méthode à chaque session. L'épistémologie à 4 états de cette doctrine (DÉCLARÉ/OBSERVATION/HYPOTHÈSE/INCONNU) est intentionnellement distincte de celle du Bilan V3 (SELF-DECLARED/EVIDENCE-BASED/INFERRED/CONTRADICTOIRE/INCONNU, cf. CURRENT_STATE §3) — deux cadres adaptés à deux usages différents (produit structuré vs. discipline conversationnelle live), à ne pas harmoniser automatiquement.
**Conséquence :** nouveaux fichiers `COACHING_DOCTRINE.md` et `COACHING_SESSION_TEMPLATE.md` créés dans `docs/project-memory/` ; pointeur ajouté dans PROJECT_BIBLE §5. Aucune donnée personnelle ni dossier d'un client réel dans ces fichiers — uniquement la méthode générique. Ne modifie pas la frontière produit Bilan/Rapport ≠ Coaching (D-010).
**Statut :** ACTIVE

---

### D-019 — Architecture UX arbitrée pour Mon point de départ V3 (hub, 7 étapes, navigation)
**Date :** 2026-09-23
**Décision :** le mécanisme « Journey Progress » d'*Alchemy of Self* a été étudié comme benchmark et challengé — pas copié. Architecture **hybride** retenue pour le futur « Mon point de départ V3 » : hub central avec deux espaces visibles dès le départ (Mon point de départ | Ma feuille de route) ; 7 étapes visibles dès le départ mais parcours **obligatoirement séquentiel** (1→7, pas de choix libre d'ordre) ; étapes futures nommées « À venir » (pas « verrouillé », pas de logique de récompense/gamification) ; vue globale des 7 étapes affichée à l'entrée, à la reprise après interruption réelle, ou sur demande — jamais imposée entre deux étapes d'une session continue ; quatre états utilisateur uniquement (À venir / À commencer / En cours / Terminée) ; étape terminée toujours consultable, modifiable uniquement tant qu'aucune nouvelle réponse utilisateur n'a été effectivement enregistrée dans l'étape suivante (préremplissage automatique, réutilisation d'info ou question sautée ne déclenchent pas ce verrouillage) ; pas d'affichage du nombre de questions (variable selon branches/relances/récupération) ; durée estimée par étape affichée en fourchette non garantie (orientation ≈5–10 min, à calibrer plus tard) ; progression interne sans chiffre, ne reculant jamais même si une branche/relance apparaît ; trois fonctions de navigation distinctes (Retour / Voir mon parcours / Mon espace CoachRedo) ; page de transition dédiée en fin de parcours (pas de fin brutale, pas de délai promis) ; Ma feuille de route visible dans le hub dès le début avec états « en préparation » puis « prête », sans délai inventé ; positionnement de l'IA non protagoniste de l'UX ; orientation narrative (histoire structurée, pas diagnostique) retenue pour le futur chantier Ma feuille de route. Détail complet : `docs/project-memory/MON_POINT_DE_DEPART_V3.md`.
**Pourquoi :** déterminer si le principe UX d'Alchemy (vue globale + déverrouillage progressif) est pertinent pour CoachRedo sans en copier le ton gamifié — incompatible avec le refus de la posture gourou (PROJECT_BIBLE §2) — ni sa promesse de nombre de questions/durée fixes, impossible à garantir avec un moteur déterministe à branches conditionnelles et relances variables, ce qui aurait contredit le principe déjà verrouillé « honnête sur l'incertitude, sans promesse irréaliste » (PROJECT_BIBLE §10).
**Conséquence :** nouveau fichier `docs/project-memory/MON_POINT_DE_DEPART_V3.md` créé. **Nommage produit V3 introduit** : Plan B Rentable → Mon point de départ → Ma feuille de route — ne renomme pas rétroactivement le produit actuellement en production (Bilan de Clarté V2 / Rapport CoachRedo, cf. CURRENT_STATE §2, ARCHITECTURE §3/§6), ni les identifiants techniques réels (`bilan_sessions`, `rapports`, `BILAN_OPEN`). Aucune implémentation technique engagée — spécification technique explicitement différée (voir §P du nouveau fichier pour la liste de ce qui reste ouvert). Prochaine étape enregistrée : Matrice finale de couverture Q1-Q36, non commencée (cf. CURRENT_STATE §8).
**Statut :** ACTIVE (décisions produit/UX verrouillées, implémentation non engagée)

---

### D-020 — Unification du vocabulaire de l'architecture de preuve pour Mon point de départ V3 / Ma feuille de route
**Date :** 2026-09-23
**Décision :** l'ancienne formulation `SELF-DECLARED / EVIDENCE-BASED / INFERRED / CONTRADICTOIRE / INCONNU` (documentée dans `CURRENT_STATE.md` depuis le 2026-09-16) et `DÉCLARÉ / ÉTAYÉ / INFÉRÉ / CONTRADICTOIRE / INCONNU` sont **le même cadre conceptuel**, pas deux architectures concurrentes. La seconde devient la terminologie canonique utilisateur/méthodologique pour Mon point de départ V3 et Ma feuille de route. La première est considérée comme l'ancienne formulation / équivalence historique.
**Pourquoi :** une divergence de vocabulaire avait été signalée (non résolue) lors de la synchronisation mémoire du 2026-09-23 précédant ce tour, entre l'épistémologie documentée pour le Bilan V3 et celle introduite pour l'architecture UX (D-019). Le handoff QG2 transmis ce jour confirme indépendamment `DÉCLARÉ/ÉTAYÉ/INFÉRÉ/CONTRADICTOIRE/INCONNU` comme le cadre validé (§24 du handoff), ce qui permet de trancher explicitement plutôt que de laisser deux formulations coexister dans la mémoire.
**Conséquence :** `CURRENT_STATE.md` §3 mis à jour pour refléter l'unification. Ne modifie pas le cadre conversationnel volontairement distinct de la doctrine coaching humain (`COACHING_DOCTRINE.md` §3, DÉCLARÉ/OBSERVATION/HYPOTHÈSE/INCONNU — 4 états, contexte différent, D-018). Par la même occasion, la conception détaillée du questionnaire Q1-Q36 (contenu, branches, relances, statuts VALIDÉ/HYPOTHÈSE/À ARBITRER) transmise par le handoff QG2 est désormais documentée dans `docs/project-memory/MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md` — transcription fidèle, pas une nouvelle conception ni une validation supplémentaire ; la matrice finale de couverture Q1-Q36 reste non commencée (cf. CURRENT_STATE §8).
**Statut :** ACTIVE

---

### D-021 — Reconnaissance de l'édition papier de Plan B Rentable comme chantier existant
**Date :** 2026-09-23 (reconnaissance mémoire) — travail éditorial/technique sous-jacent réalisé 2026-06-05 → 2026-06-19
**Décision :** l'édition papier de Plan B Rentable est reconnue officiellement dans la mémoire durable comme un chantier existant, distinct du Reader numérique. Source de vérité détaillée : `livre/PRINT_HANDOFF.md` (commit `141d735`, 2026-06-19 — dernier commit touchant `livre/`, aucune modification depuis). Sources éditoriales : `livre/*.md` (manuscrit — figé, ne pas modifier), `livre/interieur.html` (dernière modification de contenu : commit `654cc13`, 2026-06-10, antérieure à `PRINT_HANDOFF.md` — donc décrite fidèlement par lui), `livre/couverture.html` (prototype).

**Contrôle Git effectué avant cette décision :** `141d735` est le seul et dernier commit touchant `livre/` — aucune spécification papier antérieure ou concurrente n'existe dans l'historique (pas de version « 62 pages » différente à superseder). Vérification empirique de `interieur.html` : 52 pages `page-std` + 5 spreads (`page-left`/`page-right`) = **62 pages, confirmé exact et cohérent avec `PRINT_HANDOFF.md`**.

**Finalisé (au 2026-06-19, dernier état vérifié) :** manuscrit intérieur figé (« V1 validé juin 2026 », aucune modification de contenu autorisée hors corrections techniques) ; format fini 140×210mm ; structure/pagination exacte des 62 pages ; marges et CSS d'impression de l'intérieur ; choix éditorial des polices (EB Garamond, DM Serif Display, DM Sans) et de la palette couleur ; dimensions de la couverture (287×210mm, tranche 7mm estimée) et son CSS d'impression ; procédure d'export PDF documentée.

**Reste ouvert (bloquant avant impression finale, tel que documenté dans `PRINT_HANDOFF.md` §6) :** ISBN (placeholder `[À compléter]`, confirmé également présent tel quel dans `interieur.html` ligne ~510) ; tranche exacte de la couverture à confirmer via calculateur KDP selon le grammage retenu ; fond perdu de la couverture non défini (3mm à ajouter) ; polices actuellement chargées en ligne (Google Fonts), à intégrer en local pour un export PDF offline ; couverture finale encore au stade prototype HTML, à valider ou reproduire en Illustrator/Canva.

**Aucune preuve dans le repo d'une impression réalisée ou d'une commande passée** (aucun PDF final du livre, aucune trace d'ISBN obtenu, aucun fichier de confirmation d'impression) — à ne jamais présenter comme complété.

**Pourquoi :** ce travail réel, versionné et détaillé était resté invisible dans `docs/project-memory/` (système de mémoire créé le 2026-09-09, postérieur à ce chantier) — un `/clear` sans cette entrée ferait perdre la connaissance de son existence, contrairement à `handoff/` qui est volontairement local (D-003), `livre/` est **tracké par git**.
**Conséquence :** `CURRENT_STATE.md` mis à jour (chantier dormant/partiellement terminé) ; `ARCHITECTURE.md` mis à jour (pointeur de découvrabilité vers `livre/`, relation avec le Reader numérique) ; `PROJECT_BIBLE.md` mentionne brièvement les deux formes du Livre (numérique et papier).
**Statut :** DORMANT (dernier travail actif : 2026-06-19 ; aucune activité depuis ; non abandonné, non relancé)

---

### D-022 — Clôture de la conception de collecte Mon point de départ V3 (Q1–Q36) et doctrines transversales verrouillées
**Date :** 2026-09-24 → 2026-09-25 (audit complet en 9 sessions d'arbitrage progressif : 7 étapes + audit inverse global + corrections finales ; clôture prononcée le 2026-09-25)
**Décision :** le QG prononce la clôture de la **conception de collecte** de Mon point de départ V3 : « MON POINT DE DÉPART V3 — CONCEPTION DE COLLECTE CLOSE. » Chaque question Q1–Q36 a été analysée individuellement (grille information recherchée/preuve/croisements/décision influencée/risque d'interprétation/verdict) puis un audit inverse global est parti des décisions que Ma feuille de route devra éclairer pour vérifier en sens inverse que Q1–Q36 fournit les données nécessaires. Q1–Q36 restent les identifiants de travail actuels — **aucune renumérotation ni position d'écran définitive n'est décidée par cette clôture**, reportée à la spécification technique.

**Deux micro-données ajoutées à l'issue de l'audit inverse global**, toutes deux confirmées absentes de Q1–Q36 après tous les croisements possibles :
1. **Territoire principal du Plan B**, rattachée à l'Étape 1 (après Q1 et sa branche activité existante) : « Depuis quel pays ou territoire envisages-tu principalement de développer ton Plan B aujourd'hui ? » — pays/territoire sélectionnable + Autre / Je ne sais pas encore. Ce n'est ni la nationalité, ni nécessairement le pays administratif de résidence, mais le territoire pertinent pour l'action envisagée aujourd'hui — aucune adresse, aucune géolocalisation IP, aucune ville obligatoire dans MPD. Ajoutée après audit factuel du repo (lecture seule) confirmant qu'aucune donnée géographique exploitable n'existe actuellement dans le produit : `profiles.country` (`supabase/migrations/001_schema.sql:13`) existe en base mais est une colonne dormante — jamais peuplée par `handle_new_user()`, jamais lue ni écrite ailleurs dans `src/`, aucune géolocalisation IP nulle part dans le codebase.
2. **Actif relationnel mobilisable**, rattachée à l'Étape 4 (après Q22) : « As-tu déjà un groupe ou un réseau de personnes que tu peux contacter directement si tu veux apprendre de leurs besoins, tester une idée ou leur proposer quelque chose ? » — Oui / Non / Je ne sais pas ; si Oui, une seule qualification du type principal (réseau professionnel / anciens clients ou contacts / communauté en ligne / groupe ou association / entourage ou réseau local / autre), sans aucun nombre d'abonnés, de contacts, de score d'engagement, ni de nom. Distincte de Q22 (soutien reçu par la personne pour avancer) et de Q35 (accès conditionné à un problème déjà identifié) — deux directions relationnelles différentes, non fusionnées.

**Doctrines transversales verrouillées à cette occasion :**
- **ÉTAT ACTUEL ≠ LIMITE PERMANENTE** : toute donnée de Mon point de départ décrit la situation connue au moment de la collecte et sert à calibrer ce qui est réaliste maintenant — jamais projetée automatiquement par Ma feuille de route comme une limite à moyen/long terme. Une contrainte, préférence ou condition n'est considérée comme durable que si les données permettent réellement de le soutenir ; sinon son évolution future reste ouverte. Toute voie utilisée comme étape (emploi, mission, apprentissage, petit service, stabilisation) doit être présentée comme une étape reliée à la direction recherchée, jamais substituée silencieusement à l'objectif de la personne. **Nuance verrouillée pour Q31** : la condition indispensable doit être respectée *maintenant* (doctrine Q8/Q31 inchangée, aucune obligation immédiate affaiblie) ; seule sa *permanence future* ne doit pas être présumée sans données — deux choses distinctes, non contradictoires. Cette règle généralise ce qui avait d'abord été verrouillé isolément pour l'urgence économique (3 règles Q29 : urgence déclarée ≠ délai de résultat prédit ; pas de choix automatique de voie ; urgence ≠ prise de risque accrue) et pour la mobilisabilité d'une capacité (Q18 : niveau de preuve de l'existence d'une capacité et mobilisabilité actuelle sont deux dimensions strictement distinctes, jamais fusionnées).
- **Logique d'apparition des questions** : **SOCLE / CONDITIONNELLE / RÉCUPÉRATION** exclusivement — une question conditionnelle ou de récupération peut être déterminante dans un parcours et inutile dans un autre, une hiérarchie d'importance fixe ne reflète pas cette réalité. « Contextualisation » reste un descripteur analytique secondaire possible (une question qui qualifie/enrichit une donnée déjà obtenue sous un angle particulier), **jamais un quatrième état d'apparition** — correction explicite après un premier mélange erroné entre fonction analytique et logique UX dans une version intermédiaire de l'audit.
- **Aucun ajout futur de question « au cas où ».** Toute modification future de la collecte devra être justifiée par un besoin décisionnel démontré — cohérent avec le test absolu déjà retenu pour cet audit (« une question reste uniquement si sa réponse change une interprétation, un filtre, une voie, une recommandation ou une action »).
- **Absence de Q37 définitivement confirmée** après l'analyse complète des 36 questions : aucune estimation de fréquence, d'importance pour autrui, de volonté de payer, de prix, de taille de marché, de concurrence exhaustive ou de potentiel commercial n'est demandée à l'utilisateur — ces données relèvent structurellement du terrain, jamais de Mon point de départ.

**Pourquoi :** vérifier, avant toute spécification technique de Ma feuille de route, que chaque question a une conséquence décisionnelle réelle et que l'ensemble Q1–Q36 couvre sans trou ni redondance de fond les données nécessaires — plutôt que de commencer une architecture technique sur un contenu de collecte non audité.

**Conséquence :** `docs/project-memory/MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md` mis à jour pour refléter l'état canonique final (statuts résolus, deux micro-données, doctrines verrouillées) ; `docs/project-memory/MON_POINT_DE_DEPART_V3.md` mis à jour avec un pointeur vers la doctrine temporelle. L'historique détaillé question par question (grille complète, tableaux de tensions, audit du futur rapport en 12 sections) reste un document de travail local, non versionné dans cette mémoire — conforme au principe déjà appliqué à `handoff/` (D-003) : cette mémoire retient l'état canonique, pas la totalité du raisonnement intermédiaire.

**Reports explicitement maintenus, non résolus par cette clôture** (liste complète, aucun n'est traité comme tranché) : mécanisme de convergence DÉCLARÉ→ÉTAYÉ ; mécanismes déterministes de skip/recovery (branche moyen/long terme de Q6, WHY conditionnel, Q15, Q25, et les autres triggers déterministes déjà identifiés dans `MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md`) ; mécanisme de réutilisation UX pour les chevauchements identifiés (Q16/branche activité existante de Q1, Q11/Q33) ; seuils et algorithme du principe à 3 niveaux de Q20 (action numérique requise par la route : autonome / accompagnement léger / acquisition significative) ; mécanisme d'exploration élargie de CoachRedo hors des environnements spontanément cités (Q33/Q34) ; mécanisme de filtrage/croisement produisant les voies/options elles-mêmes ; mécanisme du point de choix de la personne dans l'architecture UX (hub/étapes) ; fonction exacte de la section « Ton miroir CoachRedo » du futur rapport — **ne devra jamais devenir un profil psychologique ni une affirmation identitaire** ; position écran et numérotation définitive de Q1–Q36 et des deux micro-données ; opérationnalisation déterministe complète de P0/P1/P2/P3 et du budget global de relances (déjà HYPOTHÈSE V1 à tester, cf. `MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md` §1) ; architecture détaillée de génération de Ma feuille de route et de sélection du premier test.

**Statut :** ACTIVE — conception de collecte close. L'implémentation technique (mécanismes ci-dessus) reste un chantier futur explicitement non ouvert par cette décision.
