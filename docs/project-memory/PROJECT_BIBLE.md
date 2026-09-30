---
name: project-bible
description: Identité, vision et principes durables de CoachRedo — ce qui ne dépend pas du chantier du jour.
metadata:
  type: project-memory
---

# PROJECT_BIBLE — CoachRedo

Dernière mise à jour : 2026-09-30 (V4 — synchronisation de la vision élargie de l'écosystème : Academy, B2C/B2B, frontière réseau de distribution, coaching IA, environnement des coachs et Master Coaches, D-033)

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

**[note, 2026-09-23]** Le Livre existe sous deux formes distinctes : une **expérience numérique** (le Reader de l'application) et une **édition papier** — voir `ARCHITECTURE.md` §2 et `DECISIONS.md` D-021 pour le détail. Les deux ne partagent aujourd'hui aucun pipeline de contenu commun vérifié dans le repo.

**Le Rapport est l'aboutissement de ce produit pédagogique.** Un client peut s'arrêter après l'avoir reçu : il a reçu la valeur complète de Plan B Rentable. Ce n'est ni un diagnostic médical/psychologique, ni une promesse de résultat, ni un générateur automatique de « business idéal ». Il fournit une lecture structurée des réponses du Bilan — faits, observations, hypothèses explicitement identifiées comme telles, une piste testable, et les inconnues importantes quand les réponses ne permettent pas de conclure.

**Correction sur la composition du Bilan (17 éléments requis) :**

```
17 éléments requis = C1 + C2 + C3 (3 questions contextuelles) + 13 questions réflexives + E1 (1 question d'expérience antérieure)
```

Les écrans d'introduction **ne sont pas comptés** parmi les 17 éléments requis : ils ne collectent aucune donnée. (La version précédente de ce document en fixait le nombre à tort dans le calcul des « 17 éléments » — leur nombre exact n'est pas un fait à figer dans ce document.)

Détail éditorial et technique complet du Rapport : voir `ARCHITECTURE.md` §6 et `DECISIONS.md` D-013.

**[fait enregistré, 2026-09-30]** Référence papier actuelle du livre : titre *PLAN B RENTABLE*, sous-titre *« Une nouvelle façon de comprendre ce qui te retient — et de construire autre chose. »*, auteur Redouane Agaja, marque CoachRedo. L'ancienne formulation *« Une nouvelle façon de construire son indépendance »* est une version antérieure du sous-titre et ne doit plus être présentée comme la référence papier actuelle. Cet enregistrement ne modifie aucun fichier du livre (`livre/*`, D-021) — c'est une référence produit, pas une intervention éditoriale.

**[note, 2026-09-23]** Le chantier V3 introduit un nouveau nommage produit orienté utilisateur — **Mon point de départ** (Bilan) et **Ma feuille de route** (Rapport) — ainsi qu'une architecture UX de hub arbitrée (voir `docs/project-memory/MON_POINT_DE_DEPART_V3.md` et `DECISIONS.md` D-019). Ce nommage ne modifie pas, à ce stade, le produit actuellement en production (toujours nommé Bilan de Clarté V2 / Rapport CoachRedo) ni l'architecture structurelle verrouillée ci-dessus, qui reste correcte pour décrire l'enchaînement Livre → évaluation → livrable personnalisé.

---

## 5. Le coaching : une phase distincte et optionnelle

**[verrouillé QG, confirmé 2026-08-31 et reconfirmé 2026-09-09]** *CoachRedo Business Coaching* est un produit **séparé** du parcours pédagogique Plan B Rentable :

```
CoachRedo Business Coaching → objectif → missions → actions → réponses → analyse coach → adaptation → mission suivante
```

Règle stricte : **aucun engagement de coaching n'est créé automatiquement** à la fin du Bilan ou à la publication du Rapport. Le coaching ne commence que si le client le choisit explicitement, après avoir reçu son Rapport.

Cette frontière a été identifiée comme nécessaire après un bug produit réel (le dashboard promettait « la suite de ton accompagnement » à un client qui n'avait fait que soumettre son Bilan, avant même que le concept de Rapport existe formellement — voir DECISIONS D-010).

**[verrouillé QG, 2026-09-16]** La méthode du coaching humain CoachRedo (posture IA-copilote, discipline d'analyse, conduite de séance, limites) est formalisée dans `docs/project-memory/COACHING_DOCTRINE.md`. Ce document ne modifie pas la frontière produit ci-dessus — il la présuppose. Voir aussi DECISIONS D-018.

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
- **CoachRedo Academy, B2C, B2B, coaching IA, environnement des coachs et Master Coaches** — vision élargie validée le 2026-09-30 (D-033), détaillée en §12-§19 ci-dessous.

Il est normal — et attendu — que ce document ne prédise pas aujourd'hui toutes les futures directions de CoachRedo. Cette liste s'enrichira au fil des décisions réelles ; son incomplétude n'est pas, en soi, un point à arbitrer.

---

## 12. CoachRedo Academy — évolution stratégique validée

**[verrouillé QG, 2026-09-30]** L'ancienne segmentation étudiée pour CoachRedo Academy — *Entrepreneur / Revendeur / Futur leader MLM* — n'est plus l'architecture stratégique de référence. Elle n'était documentée nulle part dans cette mémoire durable avant cette entrée : il s'agit d'un enregistrement direct de non-rétention, pas de la correction d'une décision antérieure.

CoachRedo Academy doit être envisagée comme une **infrastructure de développement de compétences réelles et transférables**, utiles à l'autonomie professionnelle et entrepreneuriale. Domaines potentiels déjà identifiés, à titre indicatif seulement — **pas un catalogue définitif, pas de niveaux obligatoires, pas de cursus verrouillé** : entrepreneuriat, vente, marketing, IA, communication, création d'offre, validation marché, finance entrepreneuriale, organisation, productivité, leadership, systèmes, digital, et toute autre compétence pertinente selon des besoins réels validés plus tard.

Les anciens parcours *Starter 7 jours / Core 30 jours / Leader 90 jours*, s'ils sont déjà documentés ailleurs (hors mémoire durable), doivent être identifiés comme **architecture antérieure étudiée**, pas comme l'architecture stratégique actuelle.

**NON DÉCIDÉ :** architecture pédagogique précise, niveaux, cursus, catalogue définitif de compétences.

---

## 13. CoachRedo B2C et B2B — directions long terme validées

**[verrouillé QG, 2026-09-30] B2C.** CoachRedo pourra accompagner directement des individus via différentes briques progressivement développées : livre, application, Mon point de départ, Ma feuille de route, formations, Academy (§12), outils IA, communauté, accompagnements. Toutes ces briques ne sont pas nécessairement construites aujourd'hui — chacune doit être suivie avec son statut réel (**existant / validé / envisagé / non décidé / en cours**) ; ne jamais présenter une brique envisagée comme existante.

**[verrouillé QG, 2026-09-30] B2B.** À terme, CoachRedo pourra fournir des programmes de formation et d'accompagnement à des organisations externes — entreprises, associations, ONG, écoles, institutions, réseaux commerciaux, autres. Ces organisations sont des **clientes** de CoachRedo, pas des partenaires orientant sa doctrine (cf. §15). CoachRedo pourra concevoir des programmes spécifiques adaptés aux compétences dont leurs collaborateurs, entrepreneurs, vendeurs, partenaires ou membres ont besoin.

**NON DÉCIDÉ :** modèle économique B2B précis ; quelles briques B2C seront effectivement construites, et dans quel ordre.

---

## 14. Frontière avec un futur projet de commerce/distribution en réseau

**[verrouillé QG, 2026-09-30]** Le projet de future société de commerce/distribution en réseau étudié séparément par Coach Redouane est un **PROJET INDÉPENDANT DE COACHREDO**. Il ne doit influencer ni Plan B Rentable, ni Mon point de départ, ni Ma feuille de route, ni les recommandations CoachRedo, ni les algorithmes d'orientation, ni la doctrine CoachRedo. **Aucune architecture MLM ne doit être enregistrée comme composante de CoachRedo.**

Si cette société existe un jour et a des besoins de formation, elle pourra devenir une **cliente B2B** de CoachRedo (§13), selon exactement les mêmes principes qu'une organisation externe quelconque. **Aucun programme spécifique pour cette société n'est conçu aujourd'hui.**

---

## 15. Indépendance pédagogique de CoachRedo

**[verrouillé QG, 2026-09-30]** Même lorsque Coach Redouane possède ou participe à une autre entreprise, CoachRedo conserve son indépendance pédagogique. Une entreprise liée à Coach Redouane doit être traitée comme une **cliente B2B** (§13), pas comme une destination privilégiée des utilisateurs CoachRedo. Ses intérêts commerciaux ne doivent jamais modifier artificiellement les conclusions de Mon point de départ ou de Ma feuille de route.

Ceci renforce explicitement, pour le cas d'une entreprise liée au fondateur (y compris un futur projet de commerce/distribution en réseau, §14), le principe déjà verrouillé en §1 : CoachRedo ne doit pas devenir l'outil commercial d'une entreprise particulière ni orienter artificiellement ses utilisateurs vers une opportunité commerciale de Coach Redouane ou d'une organisation cliente.

---

## 16. Coaching IA pour les utilisateurs — vision long terme validée

**VISION LONG TERME VALIDÉE (QG, 2026-09-30).** CoachRedo doit pouvoir proposer progressivement des formes de coaching et d'accompagnement assistés ou réalisés via l'intelligence artificielle, pour aider une personne dans la durée sur la clarté, la réflexion, le passage à l'action, le suivi, la progression, la construction de son autonomie — cohérent avec la mission `Clarté → Action → Discipline → Construction → Autonomie` (§2). Ce coaching IA **ne doit pas décider à la place de la personne**, ni créer artificiellement une dépendance à CoachRedo.

Ceci spécialise, pour l'usage « coaching direct de l'utilisateur », la direction stratégique transversale déjà validée en §7 (CoachRedo IA) — sans la remplacer : §7 reste le cadre général (ni architecture ni fournisseur décidés), cette section en valide un usage cible parmi d'autres possibles.

**NON DÉCIDÉ :** architecture fonctionnelle précise ; méthodes de coaching utilisées ; degré d'autonomie du coach IA ; frontières coach IA / coach humain ; garde-fous détaillés ; modèle économique ; intégration précise dans l'application.

---

## 17. Outils et environnement professionnel pour les coachs — vision validée

**VISION LONG TERME VALIDÉE (QG, 2026-09-30).** CoachRedo doit également pouvoir devenir progressivement un **environnement professionnel destiné aux coachs**, mettant à leur disposition outils, méthodes, ressources, formations et capacités IA pour faciliter et améliorer leur travail d'accompagnement. Principe stratégique : CoachRedo ne doit pas seulement utiliser l'IA pour accompagner directement les utilisateurs (§16) — il doit également pouvoir mettre l'IA et ses outils au service des coachs humains.

**Distinct de la doctrine de coaching humain déjà en vigueur** (`COACHING_DOCTRINE.md`, D-018) : celle-ci documente la méthode réellement utilisée aujourd'hui par le coaching humain CoachRedo ; cette section documente une direction future d'outillage professionnel pour les coachs, non encore conçue.

**NON DÉCIDÉ :** liste fonctionnelle définitive des outils ; SaaS coach ; CRM ; marketplace ; architecture technique.

---

## 18. Environnement de Master Coaches — vision validée

**VISION LONG TERME VALIDÉE (QG, 2026-09-30).** À long terme, CoachRedo a vocation à devenir un environnement réunissant et développant des coachs de haut niveau, avec l'ambition de constituer un **environnement de Master Coaches** — permettant la complémentarité entre expertise humaine, méthodes CoachRedo, formation et montée en compétence, outils numériques, intelligence artificielle, et collaboration entre coachs lorsque cela devient pertinent. La direction est enregistrée ; **le système n'est pas inventé aujourd'hui.**

**NON DÉCIDÉ, explicitement, chacun un point ouvert :** définition officielle de « Master Coach CoachRedo » ; critères d'accès ; niveaux ; certification éventuelle ; cursus ; contrôle qualité ; marketplace éventuelle ; attribution des clients ; rémunération ou partage de revenus ; modèle économique ; statut juridique des coachs ; relation précise entre coach humain et IA.

---

## 19. Vision long terme consolidée et frontière synthétique

**Ce que cette mémoire durable doit permettre de comprendre (QG, 2026-09-30) :** CoachRedo peut progressivement devenir (1) un écosystème de clarté et d'orientation ; (2) une infrastructure de formation ; (3) un environnement d'accompagnement humain ; (4) un environnement de coaching IA (§16) ; (5) un ensemble d'outils IA et professionnels pour les coachs (§17) ; (6) un environnement de développement de Master Coaches (§18) ; (7) une communauté favorisant action et autonomie ; (8) une plateforme pouvant accueillir certaines spécialisations lorsque leur validation le justifie (Trading, §9, parmi d'autres) ; (9) un fournisseur B2B de programmes de formation et d'accompagnement pour des organisations externes (§13).

**Ces neuf capacités constituent une vision progressive, pas neuf chantiers à construire maintenant.** La priorité produit reste, sans changement : **Plan B Rentable → Mon point de départ V3 → Ma feuille de route V3** (§4).

**Frontière synthétique à conserver :**

```
COACHREDO = CLARTÉ + ORIENTATION + FORMATION + ACCOMPAGNEMENT HUMAIN/IA + OUTILS + DÉVELOPPEMENT DES COACHS + AUTONOMIE.
ENTREPRISES CLIENTES = LEURS PRODUITS + LEUR BUSINESS + LEURS OBJECTIFS COMMERCIAUX.
```

CoachRedo peut former et accompagner les équipes ou réseaux d'une entreprise cliente sans devenir son département commercial ou son outil de recrutement (§14, §15).
