---
name: decisions
description: Registre chronologique des décisions structurantes de CoachRedo App — ce qui empêche de refaire une erreur ou de rouvrir un arbitrage déjà tranché.
metadata:
  type: project-memory
---

# DECISIONS — CoachRedo App

Dernière mise à jour : 2026-09-09 (V3 — corrections finales QG post-audit V2)

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
**Conséquence :** ce schéma est la référence pour la migration 012 (non créée à ce jour — numéro à revérifier avant utilisation, cf. ARCHITECTURE §6). Le chantier Rapport démarre par un audit read-only (repo, migrations, Admin, Auth), pas par le choix du fournisseur IA.
**Statut :** ACTIVE (structure verrouillée par le QG) — **non implémenté** (migration non créée, non exécutée) ; `publie_par` et fournisseur IA restent ouverts.

---

### D-014 — Fondation mémoire projet persistante
**Date :** 2026-09-09
**Décision :** création de `CLAUDE.md` + `docs/project-memory/{PROJECT_BIBLE,ARCHITECTURE,DECISIONS,CURRENT_STATE}.md`, destinés à être **trackés par git** — à la différence de `handoff/` qui reste local (D-003).
**Pourquoi :** les sessions Claude Code/ChatGPT changent régulièrement ; le contexte produit et technique doit survivre au-delà d'une session et d'une machine, ce que `handoff/` (gitignored) ne permet pas structurellement.
**Conséquence :** toute nouvelle session doit lire ces documents avant d'intervenir (cf. `CLAUDE.md`). Mise à jour disciplinée : ne pas alourdir ces fichiers à chaque micro-changement, seulement aux incréments significatifs validés.
**Statut :** ACTIVE (en cours de relecture QG — pas encore intégrée au repo)

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
