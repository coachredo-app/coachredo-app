# CLAUDE.md — CoachRedo App

Dernière mise à jour : 2026-09-09

Ce fichier est le point d'entrée. Il ne contient pas le contexte projet — il pointe vers lui et fixe les règles de travail.

## À lire avant toute intervention

1. `docs/project-memory/CURRENT_STATE.md` — où en est le projet, chantier actif, prochaine action exacte.
2. `docs/project-memory/ARCHITECTURE.md` — stack réelle, schéma DB, sécurité, dettes connues.
3. `docs/project-memory/DECISIONS.md` — décisions structurantes déjà prises, et pourquoi.
4. `docs/project-memory/PROJECT_BIBLE.md` — vision et principes durables (change rarement, à lire une fois puis en cas de doute produit).

Puis, dans cet ordre, avant de traiter la demande du jour :

- Vérifier `git status -sb` et `HEAD`.
- Confronter ce que dit la documentation à l'état réel du repo (fichiers, schéma, code).
- Si une contradiction apparaît entre la documentation et le repo, ou entre deux documents : **signaler au QG, ne pas trancher silencieusement.**
- Respecter le chantier actif indiqué dans `CURRENT_STATE.md` — ne pas en ouvrir un autre sans que le QG l'ait demandé.

## Répartition des rôles

**QG pilote** le produit, l'architecture et les décisions. **Claude exécute et audite** le repo — mais doit signaler ou challenger toute contradiction, risque réel, ou incohérence détectée, plutôt que d'exécuter aveuglément.

## Règles permanentes

- Aucune modification de code sans GO explicite du QG.
- Aucune migration SQL exécutée sans GO explicite.
- Aucun commit sans GO explicite.
- Aucun push — le push est fait manuellement par Coach Redouane, jamais par Claude.
- Pas de refactor hors périmètre de la tâche demandée.
- Corrections minimales par défaut — ne pas privilégier la facilité de code au détriment de la qualité produit ou de l'architecture future (cf. `ARCHITECTURE.md` pour les invariants à respecter).

## Mise à jour de cette mémoire

Après un incrément fonctionnel significatif validé, décider explicitement (avec le QG) si :
- `CURRENT_STATE.md` doit être mis à jour (quasi systématique),
- une nouvelle entrée doit être ajoutée à `DECISIONS.md` (si la décision empêche de refaire une erreur ou de rouvrir un arbitrage),
- `ARCHITECTURE.md` doit être actualisé (si l'architecture réelle a changé),
- `PROJECT_BIBLE.md` doit changer (uniquement si la vision ou les principes durables ont réellement évolué — rarement).

Ne pas mettre à jour ces fichiers par réflexe à chaque petite modification : l'objectif est une mémoire fiable, pas une mémoire exhaustive.

## Ce qui reste local et hors mémoire versionnée

Le dossier `handoff/` (non tracké, `.gitignore`) contient les audits et passations détaillés de chantier. Il reste volontairement local — coordination de travail, pas mémoire persistante. Cette mémoire (`docs/project-memory/`) est construite en dépouillant ses conclusions, pas en le dupliquant.
