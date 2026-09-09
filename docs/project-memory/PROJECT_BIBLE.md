---
name: project-bible
description: Identité, vision et principes durables de CoachRedo — ce qui ne dépend pas du chantier du jour.
metadata:
  type: project-memory
---

# PROJECT_BIBLE — CoachRedo

Dernière mise à jour : 2026-09-09 (V3 — corrections finales QG post-audit V2)

Ce document explique qui est CoachRedo, pourquoi il existe, et la relation entre ses produits. Il change rarement — seulement quand la vision ou les principes durables évoluent réellement, pas à chaque chantier.

Hiérarchie de confiance appliquée dans ce document : les points marqués **[verrouillé QG]** sont des décisions produit/stratégiques explicites du QG, y compris celles de l'arbitrage du 2026-09-09. Les points marqués **[source historique]** proviennent de passations antérieures non reconfirmées récemment — à traiter comme un point de départ, pas une certitude absolue. Les points marqués **À VALIDER QG** sont des zones où l'information disponible est insuffisante pour trancher.

---

## 1. Identité — CoachRedo, l'écosystème

**[verrouillé QG]** CoachRedo est l'écosystème principal. Il n'est **ni** Plan B Rentable, **ni** une simple application, **ni** une formation. Plan B Rentable est un produit à l'intérieur de cet écosystème — pas son équivalent, pas sa limite.

---

## 2. Mission et philosophie fondatrice

**[verrouillé QG]** Mission :

```
Clarté → Action → Discipline → Construction → Autonomie
```

CoachRedo refuse explicitement : l'argent facile, les promesses irréalistes, le bling-bling, la posture gourou, la victimisation. Il vise une progression réelle de la personne par la compréhension, l'action, l'apprentissage et la construction — pas par la promesse d'un résultat instantané.

---

## 3. Marché fondateur — pas une limite géographique

**[verrouillé QG, corrige une formulation antérieure]** L'Afrique francophone et le Maghreb constituent le **contexte et le marché fondateur** de CoachRedo — pas une limite géographique définitive de son ambition. La version précédente de ce document présentait ce public comme le seul cadrage produit ; cette formulation est corrigée : c'est un point de départ assumé, pas un plafond.

---

## 4. Plan B Rentable — première porte d'entrée pédagogique

**[verrouillé QG]** Plan B Rentable est la **première porte d'entrée pédagogique disponible** de l'écosystème CoachRedo — pas nécessairement la seule prévue à terme.

**[verrouillé QG]** Architecture produit actuelle, verrouillée :

```
Livre (Plan B Rentable) → Bilan de clarté → Rapport CoachRedo personnalisé
```

**Le Rapport est l'aboutissement de ce produit pédagogique.** Un client peut s'arrêter après l'avoir reçu : il a reçu la valeur complète de Plan B Rentable. Ce n'est ni un diagnostic médical/psychologique, ni une promesse de résultat, ni un générateur automatique de « business idéal ». Il fournit une lecture structurée des réponses du Bilan — faits, observations, hypothèses explicitement identifiées comme telles, une piste testable, et les inconnues importantes quand les réponses ne permettent pas de conclure.

**Correction sur la composition du Bilan (17 éléments requis) :**

```
17 éléments requis = C1 + C2 + C3 (3 questions contextuelles) + 13 questions réflexives + E1 (1 question d'expérience antérieure)
```

Les écrans d'introduction **ne sont pas comptés** parmi les 17 éléments requis : ils ne collectent aucune donnée. (La version précédente de ce document en fixait le nombre à tort dans le calcul des « 17 éléments » — leur nombre exact n'est pas un fait à figer dans ce document.)

Détail éditorial et technique complet du Rapport : voir `ARCHITECTURE.md` §6 et `DECISIONS.md` D-013.

---

## 5. Le coaching : une phase distincte et optionnelle

**[verrouillé QG, confirmé 2026-08-31 et reconfirmé 2026-09-09]** *CoachRedo Business Coaching* est un produit **séparé** du parcours pédagogique Plan B Rentable :

```
CoachRedo Business Coaching → objectif → missions → actions → réponses → analyse coach → adaptation → mission suivante
```

Règle stricte : **aucun engagement de coaching n'est créé automatiquement** à la fin du Bilan ou à la publication du Rapport. Le coaching ne commence que si le client le choisit explicitement, après avoir reçu son Rapport.

Cette frontière a été identifiée comme nécessaire après un bug produit réel (le dashboard promettait « la suite de ton accompagnement » à un client qui n'avait fait que soumettre son Bilan, avant même que le concept de Rapport existe formellement — voir DECISIONS D-010).

---

## 6. Vision multi-domaines et mémoire longitudinale CoachRedo — VALIDÉE comme vision stratégique

**[verrouillé QG stratégique, 2026-09-09]** La vision multi-domaines est **validée comme vision stratégique** : CoachRedo pourra à terme accompagner une même personne à travers plusieurs domaines/parcours d'accompagnement, dont Business et de futurs domaines pertinents, tout en conservant lorsque pertinent une **continuité longitudinale** entre eux.

**Trading — vision future, forme d'intégration non décidée.** Trading appartient à la vision future de l'écosystème CoachRedo, mais sa forme d'intégration n'est pas encore décidée. Elle sera déterminée lorsque le projet CMP Trading sera suffisamment opérationnel (module, outil, parcours pédagogique, accompagnement, ou toute autre architecture pertinente — voir §9, `DECISIONS.md` D-016). **Trading n'est pas listé ci-dessus comme domaine/parcours d'accompagnement déjà décidé.**

**Distinction à conserver — un domaine d'accompagnement n'est pas une branche de l'écosystème.** Les domaines/parcours d'accompagnement (Business, futurs domaines pertinents) sont distincts des **autres branches de l'écosystème**, dont **CoachRedo Music** (§8) : celle-ci peut porter les valeurs et l'identité CoachRedo sans constituer, pour autant, un domaine de coaching. Cette distinction n'implique aujourd'hui aucune architecture particulière.

**Important — cette validation porte sur la vision, pas sur une implémentation.** Aucune architecture particulière (`coaching_engagements`, `coaching_timeline`, ou toute autre table/entité explorée en 2026-08-30) n'est validée comme cible d'implémentation actuelle. Voir `DECISIONS.md` D-008 et D-015 pour le détail et le statut exact.

Éléments à préserver pour une future conception, sans qu'aucun ne déclenche d'implémentation aujourd'hui :

- L'idée d'un **Dossier/Mémoire CoachRedo** longitudinal, pouvant progressivement retenir les éléments pertinents de l'histoire, des objectifs, des projets, des apprentissages, des comportements significatifs, des réussites, des échecs et de l'évolution de la personne — au-delà d'un seul domaine ou d'un seul cycle de mission.
- La distinction conceptuelle entre **mémoire déclarative** (ce que la personne dit, déclare, répond) et **mémoire comportementale** (ce qu'elle fait réellement, observé dans le temps).
- Le principe directeur : **« Les modules possèdent leurs données métier ; CoachRedo possède l'histoire de transformation de la personne. »**

Ce principe doit empêcher les décisions présentes de fermer inutilement les portes du futur — sans pour autant transformer le MVP actuel en usine à gaz. Aucune implémentation n'en découle avant qu'un chantier dédié soit explicitement ouvert.

---

## 7. CoachRedo IA — direction stratégique transversale potentielle

**[verrouillé QG]** CoachRedo IA est une **direction stratégique transversale potentielle** — pas une collection souhaitée de chatbots indépendants par module. Ni l'architecture ni le fournisseur ne sont décidés.

**L'humain reste une composante importante de l'écosystème.** L'IA n'implique la suppression ni du coaching humain, ni de la communauté.

---

## 8. Composantes actuelles de l'écosystème

- La plateforme applicative `coachredo.app` (ce repo).
- Le site vitrine statique `coachredo.com` (repo séparé `coachredo-vitrine`), qui présente l'écosystème et vend Plan B Rentable.
- Une communauté (groupe WhatsApp).
- **CoachRedo Music** — branche artistique/culturelle **officielle** de l'écosystème.

**Correction du 2026-09-09 :** *CoachRedo Media* est retiré des composantes actuelles — la version précédente de ce document le mentionnait à tort comme pilier actif de l'écosystème.

---

## 9. CoachRedo Trading — vision future, développement séparé

**[verrouillé QG]** Trading appartient à la **vision future** de CoachRedo. Le projet CMP Trading actuel est développé **séparément** (projet distinct) ; sa priorité actuelle est de rendre opérationnel son cœur Pine Script sur TradingView. **Aucune intégration CoachRedo n'est à construire maintenant.**

L'ébauche Trading déjà présente dans CoachRedo App (`[locale]/(platform)/trading/`, tables `trading_*`) est désormais **legacy** — issue d'une première phase exploratoire commencée trop tôt, dont l'approche est abandonnée. Voir `ARCHITECTURE.md` §8 et `DECISIONS.md` D-016 pour le détail et le traitement prévu (audit puis nettoyage, sans suppression destructive automatique).

L'architecture d'intégration future de Trading dans CoachRedo sera conçue **lorsque le projet CMP Trading sera opérationnel** — pas avant.

---

## 10. Philosophie éditoriale — principes généraux de l'écosystème

Principes généraux, applicables à l'ensemble des contenus CoachRedo (pas seulement au Rapport) : **accessible, concret, réaliste, honnête sur l'incertitude, sans promesse irréaliste, sans posture gourou.**

**Important — ne pas généraliser à l'excès :** les règles rédactionnelles particulières du Rapport (doctrine fait / observation / hypothèse / piste / inconnu, `evidence_refs`, formulations conditionnelles obligatoires sur les hypothèses — voir `ARCHITECTURE.md` §6 et `DECISIONS.md` D-013) sont **propres au Rapport**. Elles ne doivent pas être lues comme des interdictions universelles applicables à tout futur contenu CoachRedo (livre, Carte du parcours, futurs modules).

---

## 11. Où nous voulons aller à long terme

Directions identifiées comme réelles, sans constituer une feuille de route entièrement formalisée :

- **Le Dossier/Mémoire CoachRedo longitudinal** (§6) — la direction structurante la plus importante identifiée à ce jour pour l'accompagnement à l'échelle, validée comme vision, non implémentée.
- **Provider-neutralité IA — portée exacte.** Pour le Rapport CoachRedo, l'abstraction provider-neutral est une **décision architecturale verrouillée** (voir ARCHITECTURE §6, DECISIONS D-013). Plus largement, les futures architectures IA de CoachRedo (§7) doivent éviter un verrouillage fournisseur inutile — **sans que cela impose aujourd'hui une règle technique universelle** à tous les futurs usages IA de CoachRedo.
- **Identité cohérente et continuité longitudinale, sans invariant technique figé.** L'écosystème CoachRedo doit préserver une identité cohérente et, lorsque pertinent, une continuité longitudinale de la personne entre ses produits et domaines. L'organisation technique future — application unique, modules, services ou autres architectures — sera décidée selon les besoins réels et **ne constitue pas aujourd'hui un invariant stratégique**.
- **CoachRedo Trading et CoachRedo Music**, chacun avec son propre rythme de développement (§8, §9) — Trading comme vision future de l'écosystème dont la forme d'intégration (domaine d'accompagnement, outil, ou autre) reste à décider (§6, §9), Music comme branche identitaire (§6).

Il est normal — et attendu — que ce document ne prédise pas aujourd'hui toutes les futures directions de CoachRedo. Cette liste s'enrichira au fil des décisions réelles ; son incomplétude n'est pas, en soi, un point à arbitrer.
