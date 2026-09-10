---
name: current-state
description: État opérationnel vivant de CoachRedo App — où en est le projet et quelle est la prochaine action exacte.
metadata:
  type: project-memory
---

# CURRENT_STATE — CoachRedo App

Dernière mise à jour : 2026-09-10 (V3 — fondation Rapport exécutée)

**Ce document est vivant.** Il doit être mis à jour à chaque incrément fonctionnel significatif validé (cf. règle dans `CLAUDE.md`). S'il contredit le repo réel au moment où vous le lisez, faites confiance au repo et signalez la contradiction au QG.

---

## 1. Référence Git / production

| Élément | Valeur |
|---|---|
| Branche | `main` |
| Dernier commit fonctionnel/applicatif connu | `34f2ca1` — `feat: add CoachRedo report foundation` (les commits mémoire strictement documentaires postérieurs à celui-ci n'invalident pas cette baseline) |
| État de push | Poussé manuellement sur `origin/main`, déployé |
| Vercel Production | `Ready` |
| Smoke test production | Validé le 2026-09-09 par le QG |
| Migration 012 (Fondation Rapport) | Exécutée en production le 2026-09-10, vérifications post-exécution confirmées (voir §5) |

`git status -sb` doit afficher `## main...origin/main` (clean) en début de session — si ce n'est pas le cas, il y a un travail en cours non documenté ici : investiguer avant toute chose, ne pas écraser.

---

## 2. Fonctionnalités terminées et closes

- **Livre Plan B Rentable** (7 chapitres) — lecture, progression cross-device fiabilisée (D-004).
- **Carte du parcours** (`/synthese`) — mind map post-lecture, impression/PDF (D-005).
- **Bilan de Clarté V2** — chantier **clos** (D-012) : 17 éléments requis = C1+C2+C3 (3 questions contextuelles) + 13 réflexives + E1 (intros non comptées) ; upgrade V1→V2, migration du cas legacy orphelin, sélection canonique par `bilan_version=2 AND statut='completed'`. Un Bilan validé reste verrouillé (immuable) en production — confirmé par smoke test du 2026-09-09.
- **Dashboard client** — état du parcours (Livre/Bilan), logique `bilan_version`/`session_type` correcte (D-011), wording aligné sur la frontière produit Bilan/Rapport/Coaching (D-010).
- **Admin** — fiche utilisateur complète, gestion codes d'accès, file « Action requise » A/B/C pour les missions coaching (D-006, D-007 — système de coaching **legacy actuel**, pas l'architecture future), centralisation de l'autorisation admin (D-002).
- **Module Trading** — présent et actif dans le repo, mais son approche est **abandonnée** (D-016) — classé legacy, à auditer puis nettoyer dans un chantier dédié futur. Le futur Trading CoachRedo viendra du projet CMP Trading (développé séparément) une fois opérationnel.
- **Fondation mémoire projet** (`CLAUDE.md` + `docs/project-memory/`) — installée, versionnée et validée, commit `60cd0be` (D-014).

## 3. Chantier actif

**Chantier Rapport CoachRedo personnalisé — fondation DB terminée, chantier en pause stratégique temporaire.** Fondation DB validée en production le 2026-09-10 (migration 012). Le chantier est **mis en pause jusqu'à la synthèse consolidée J1–J5 du Side Hustle Summit 2026** et l'arbitrage QG ADOPTER / ADAPTER / REJETER qui en découlera — J3 a déjà fait émerger des enseignements potentiellement structurants (validation marché, accès au client, distribution, réduction des frictions, accompagnement) que le QG ne veut pas voir figés prématurément dans la doctrine analytique/pédagogique du Rapport. Aucun développement Rapport supplémentaire ne démarre avant cet arbitrage. Voir §8.

## 4. Travail partiellement terminé / non implémenté (à ne pas supposer existant)

- **Fondation Rapport — DB installée, accès applicatif restant à construire** — migration `012_rapport_foundation.sql` (commit `34f2ca1`) exécutée en production le 2026-09-10 : table `rapports` créée (schéma D-013 complet), contrainte `UNIQUE(user_id, id)` posée sur `bilan_sessions`, RLS activé sans policy, 0 ligne. `publie_par` et `updated_at` sont désormais tranchés (voir DECISIONS D-013). Restent non implémentés : RPC `SECURITY DEFINER` de lecture client, Server Actions Admin (création/édition du draft et publication), route `/rapport`, intégration UI dashboard/admin, fournisseur IA (toujours ouvert, non bloquant).
- **Mémoire de coaching multi-domaines (P3)** — **pausée, pas abandonnée** (D-008). La vision longitudinale est validée (D-015, PROJECT_BIBLE §6), mais aucune architecture (`coaching_engagements`, `coaching_timeline`, `mission_coach_notes`) n'est retenue. Le futur suivi coaching sera redessiné depuis zéro le moment venu — chantier dédié futur, non ouvert.
- **Nettoyage des surfaces coaching legacy dans l'admin** (`DiagnosticBloc`, `SignauxBloc`, `JournalBloc`, `MissionsBloc`, section « Action requise ») — classées legacy (ARCHITECTURE §9), administration à conserver, données jamais supprimées automatiquement. Chantier dédié futur, non ouvert.
- **Nettoyage du module Trading legacy** (D-016, ARCHITECTURE §8) — audit puis retrait des éléments applicatifs devenus inutiles, sans suppression destructive de données sans audit et GO. Chantier dédié futur, non ouvert.
- **Correction dette admin `bilan_version`** (ARCHITECTURE §4) — identifiée ; traitement prévu **dans le cadre du chantier Rapport**, pas séparément.

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

## 7. Décisions ouvertes (nécessitent un arbitrage QG)

- Choix du fournisseur IA pour la génération du Rapport — différable, non bloquant.
- Statut de `HANDOFF_CHATGPT.md` et `TECHNICAL_HANDOFF.md` (racine, trackés, obsolètes par endroits) — restent intacts pour l'instant ; leur archivage/suppression sera décidé dans un ménage séparé, une fois la nouvelle mémoire installée et validée. Ne bloque pas le chantier Rapport.

**Chantiers dédiés futurs identifiés, mentionnés mais non ouverts :** nettoyage des surfaces coaching legacy dans l'admin ; nettoyage du module Trading legacy ; redesign du suivi coaching (post-P3) ; audit de l'usage réel de `stripe`.

## 8. Prochaine action exacte

**Attendre la synthèse consolidée J1–J5 du Side Hustle Summit 2026**, puis effectuer l'arbitrage QG ADOPTER / ADAPTER / REJETER des enseignements potentiellement pertinents pour CoachRedo avant de reprendre la conception détaillée du Rapport.

Après cet arbitrage, la prochaine brique technique prévue du chantier Rapport reste la conception puis l'implémentation de la RPC `SECURITY DEFINER` de lecture contrôlée côté client (un utilisateur authentifié ne peut récupérer que son propre Rapport publié — champs strictement limités à `id, sections, contenu_coach, publie_le`, conformément à D-013), **sauf décision QG contraire issue de la synthèse J5**. Le choix du fournisseur IA reste **ouvert, différé et non bloquant**.
