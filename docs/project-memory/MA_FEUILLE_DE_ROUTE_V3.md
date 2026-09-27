---
name: ma-feuille-de-route-v3
description: Architecture conceptuelle verrouillée de Ma feuille de route V3 (pipeline exploration/filtrage, granularité voie/option, anatomie d'une voie, mécanisme de convergence de preuve, architecture documentaire finale à 7 sections) — décisions conceptuelles issues des Arbitrages 1-5, pas une architecture technique.
metadata:
  type: project-memory
---

# MA_FEUILLE_DE_ROUTE_V3 — Architecture conceptuelle verrouillée

Dernière mise à jour : 2026-09-26 (D-024 — verrouillage du mécanisme de convergence DÉCLARÉ→ÉTAYÉ, Arbitrage 5)

Ce document enregistre l'architecture **conceptuelle** de Ma feuille de route V3, arbitrée par le QG en cinq tours le 2026-09-26 (Arbitrages 1 à 5). **Aucune architecture technique n'est décidée ici** : provider IA, prompts, orchestration, nombre d'appels, schéma de données et RPC restent explicitement ouverts (voir `CURRENT_STATE.md` §8). Ce document est le pendant, côté Ma feuille de route, de `MON_POINT_DE_DEPART_V3.md` (côté collecte) — la doctrine de convergence de preuve vit ici, pas dans les fichiers MPD, pour éviter toute duplication.

---

## A. Principe produit (Arbitrage 1)

Ma feuille de route est un **produit autonome complet**. Elle doit être exploitable sans que CoachRedo connaisse le choix final de la personne — le choix d'une voie n'est jamais une condition nécessaire à son achèvement, c'est un résultat qu'elle doit permettre à la personne de prendre de manière suffisamment éclairée.

```
Livre → Mon point de départ → Ma feuille de route → choisir librement → agir seule
```

Le coaching est un parcours **distinct, facultatif et postérieur** — jamais engagé automatiquement (cohérent avec D-010, PROJECT_BIBLE §5). Une personne peut terminer MFR, choisir sa direction et agir seule, sans jamais solliciter de coaching.

**Générosité, principe directeur :** le parcours autonome doit être suffisamment généreux pour permettre à une personne d'agir sans coaching. Le coaching crée sa valeur par la personnalisation continue, le suivi, la discipline, l'analyse des résultats réels et l'adaptation — jamais par une information que MFR aurait pu donner mais aurait volontairement retenue.

MFR présente une ou plusieurs voies selon ce qui est réellement plausible, **sans nombre prédéfini** : une seule si une seule le mérite, plusieurs si plusieurs le sont, jamais un nombre artificiel pour remplir un gabarit. CoachRedo ne désigne jamais silencieusement une voie comme « la bonne » ou « la meilleure ».

Le bouclage des résultats de terrain (analyse continue, adaptations successives, suivi) **n'est pas une responsabilité de MFR** — il appartiendra, si la personne le choisit, au futur système de coaching (`objectif opérationnel → plan d'action → missions → actions → retours terrain → résultats → analyse → adaptation → suivi`), non conçu à ce stade.

---

## B. Pipeline conceptuel (Arbitrage 2)

```
EXPLORER largement → ÉVALUER chaque candidat → FILTRER rigoureusement → PRÉSENTER
```

**Exploration large ≠ présentation large.** Ce que la personne connaît (Q33-Q36 notamment) nourrit l'exploration mais ne la délimite jamais — l'exploration externe de CoachRedo dépasse ce qui a été spontanément cité, ancrée dans l'objectif, le parcours, les capacités, les ressources, les contraintes, le territoire et les critères personnels.

Les deux risques identifiés ne sont pas un compromis à équilibrer mais deux réglages indépendants, sur deux étages différents :
- **Enfermement** = risque d'un EXPLORER trop étroit.
- **Fantaisie** = risque d'un ÉVALUER/FILTRER trop permissif.

Le **filtre est principalement un mécanisme interne** — la personne voit les voies retenues et les raisons individualisées de leur présence, jamais un journal exhaustif des possibilités explorées puis rejetées (une courte transparence de portée suffit).

**Discipline de preuve appliquée au filtrage :** DÉCLARÉ / ÉTAYÉ / INFÉRÉ / CONTRADICTOIRE / INCONNU. **Faible preuve ≠ élimination automatique** — faible preuve implique une exigence accrue de prudence, d'explicitation de l'inconnu et de testabilité, pas une exclusion. Une voie comportant des inconnues peut être présentée si un test réaliste, proportionné, réversible et accessible permet d'en réduire l'incertitude pertinente.

**Vocabulaire verrouillé pour qualifier une voie :** plausible, compatible aujourd'hui, testable aujourd'hui, éventuellement validée plus tard par le terrain — jamais « prometteuse », jamais « recommandée ». CoachRedo peut proposer/recommander une manière prudente de **tester** une voie, jamais laquelle **choisir**.

**Rôle de l'urgence (Q29) :** pondère le poids donné au délai et à l'incertitude dans le filtrage. Ne choisit jamais une voie seule. Ne justifie jamais une prise de risque supérieure.

**Rôle de Q8/Q31/Q32, trois poids distincts, jamais aplatis en un même filtre :**
- Q8 (préférence) — rend un compromis visible, ne filtre jamais durement.
- Q31 (condition indispensable) — appelle d'abord une adaptation de la voie ; élimination seulement si aucune forme réaliste ne permet de la respecter.
- Q32 (disponibilité actuelle) — agit sur la disponibilité à considérer une voie **aujourd'hui**, jamais sur sa possibilité permanente (voir §E).

---

## C. Granularité et vocabulaire (Arbitrage 2-3)

- **VOIE** — stratégie générale de progression.
- **OPTION** — possibilité concrète à l'intérieur d'une voie, uniquement lorsque cette déclinaison apporte réellement de la valeur. Aucun nombre artificiel.
- **ROUTE** — séquence de progression depuis la situation actuelle vers l'objectif, **pour une voie donnée** (pas une notion transversale à toutes les voies présentées).
- **TEST** — expérience limitée destinée à produire une donnée terrain et réduire une incertitude précise.

Le nom produit **« Ma feuille de route »** reste valide : son singulier désigne le document personnel global, qui peut contenir plusieurs voies et donc plusieurs routes candidates sans contradiction de nommage. Point clos.

---

## D. Anatomie d'une voie considérable aujourd'hui (Arbitrage 3-4)

Sept blocs conceptuels :

1. **La voie** — nom/intitulé clair.
2. **Pourquoi elle apparaît pour toi** — fusion ciblée : lien avec l'objectif, éléments pertinents du parcours, capacités/preuves réellement mobilisées, ressources pertinentes, adaptation éventuelle à Q31. Ne jamais répéter mécaniquement tout MPD — ne rappeler que ce qui explique réellement pourquoi cette voie est plausible pour cette personne.
3. **Ce qu'elle demande** — exigences propres à la voie, écarts entre exigences et situation actuelle, compromis avec Q8 lorsqu'une tension existe, contraintes pertinentes. Q8 n'a pas de bloc autonome.
4. **Ce que nous ne savons pas encore** — inconnues/hypothèses réellement importantes pour cette voie, discipline DÉCLARÉ/ÉTAYÉ/INFÉRÉ/CONTRADICTOIRE/INCONNU stricte, jamais comblée par une supposition.
5. **Les options concrètes** — conditionnel, uniquement si la déclinaison VOIE→OPTION apporte réellement de la valeur.
6. **Ta prochaine action** — voir §D.1 ci-dessous.
7. **La trajectoire possible** — `MAINTENANT → PROCHAINE ACTION → MOYEN TERME → DIRECTION LONG TERME`, conditionnalité croissante avec l'éloignement de l'horizon **et** avec la faiblesse du niveau de preuve. MAINTENANT concret et spécifique à la voie ; MOYEN TERME conditionnel ; DIRECTION LONG TERME jamais une promesse.

### D.1 — PROCHAINE ACTION : notion supérieure, verrouillée

`PROCHAINE ACTION` est la catégorie supérieure. Un `TEST` est un type particulier de prochaine action — **TEST ≠ PROCHAINE ACTION** par défaut.

- Si une incertitude décisive doit être réduite avant d'avancer intelligemment → **TEST** : `INCONNU/HYPOTHÈSE → QUESTION → TEST → SIGNAL OBSERVABLE`.
- Si les preuves disponibles permettent déjà d'avancer intelligemment → **ACTION DIRECTE** : `PREUVES SUFFISANTES POUR CETTE ÉTAPE → ACTION DIRECTE`.

Question directrice pour choisir : *qu'est-ce qui manque aujourd'hui pour avancer intelligemment ?* Exemple conceptuel verrouillé : une activité réelle qui fonctionne déjà ne doit jamais recevoir artificiellement un test destiné à vérifier ce qui est déjà suffisamment établi. Un test ne doit jamais devenir une recette générique (« parle à X personnes ») — il découle de l'incertitude critique propre à la voie. **Pas de gate ÉTAYÉ (Arbitrage 5, §D.3) :** ÉTAYÉ n'est jamais une condition obligatoire d'ACTION DIRECTE — une action directe reste raisonnable avec une capacité seulement DÉCLARÉE si l'action elle-même est de risque suffisamment faible, réversible, proportionnée, et produit elle-même de l'information terrain. Un test peut être lui-même une action réelle.

**Lecture du résultat d'un test, autonomie :** lorsqu'un test est proposé, MFR explique ce qu'il cherche à apprendre, les moyens nécessaires, les signaux à observer, ce que ces signaux peuvent raisonnablement indiquer, et ce qu'ils ne permettent pas encore de conclure — ceci relève de l'éducation à la preuve et de l'autonomie. MFR **ne préconstruit pas** une arborescence exhaustive d'adaptations futures (« si résultat A → action B → si B échoue → C… ») — l'analyse continue des résultats et les adaptations successives appartiennent à l'action autonome ultérieure ou au futur coaching facultatif.

### D.2 — Comparabilité sans classement

Plusieurs voies suivent les mêmes règles de construction et les mêmes règles d'apparition des blocs conditionnels — mais pas nécessairement la même longueur, le même nombre d'options, le même nombre d'inconnues, ni la même quantité de texte. Une différence de profondeur est légitime lorsqu'elle découle réellement de la voie et des informations disponibles ; elle ne doit jamais être utilisée pour favoriser silencieusement une voie. Aucun score global, aucun classement, aucun gagnant, aucune « meilleure voie » désignée par CoachRedo.

### D.3 — Mécanisme de convergence DÉCLARÉ → ÉTAYÉ (Arbitrage 5)

**Pas une progression pendant la collecte.** La collecte MPD reste déterministe ; l'évaluation du niveau de preuve intervient **une seule fois, après la collecte**, sur l'ensemble des informations disponibles — une réponse ne « monte » jamais progressivement de statut au fil du questionnaire.

**Signification de ÉTAYÉ :** suffisamment soutenu par le récit structuré pour être utilisé prudemment dans le raisonnement CoachRedo. Jamais une vérité certifiée, une preuve externe indépendante, une qualification professionnelle, une garantie de performance future, ou une validation marché.

**Vocabulaire canonique : diversité des référents, jamais « indépendance des sources ».** Dans MPD, la source primaire reste généralement la personne — il ne peut donc jamais y avoir d'indépendance des signaux au sens strict. Ce qui compte : plusieurs éléments se rapportent-ils au même fait/épisode répété, ou à des faits/épisodes réellement distincts ? **Un même épisode raconté dans plusieurs réponses ne constitue qu'un seul référent.** La détection technique/automatique de cette identité de référent reste un problème d'implémentation ultérieur, explicitement non résolu à ce stade.

**Règle de convergence, sans seuil numérique :** une proposition peut être ÉTAYÉE lorsqu'au moins deux référents réellement distincts apportent une corroboration substantielle de la même proposition, dont au moins un épisode concret. La seconde corroboration doit apporter une information nouvelle sur la réalité de la proposition, jamais une simple reformulation de la première. Cette règle reste à opérationnaliser techniquement, sans jamais la transformer silencieusement en score arbitraire.

**Typologie des signaux — analytique, jamais numérique :** auto-évaluation abstraite ; contexte/provenance ; modèle comportemental agrégé rapporté ; épisode concret ; trace externe rapportée liée à un épisode ; éventuelle preuve externe vérifiée (catégorie future, hors MPD). Utile pour raisonner et auditer une décision — **ne devient jamais un score, un rang numérique additif, ni un seuil canonique.**

**Les cinq statuts ne forment pas une échelle de confiance.** Ne jamais représenter INCONNU→DÉCLARÉ→INFÉRÉ→ÉTAYÉ ni DÉCLARÉ<INFÉRÉ<ÉTAYÉ — ce sont des natures épistémiques différentes :
- **DÉCLARÉ** : la personne affirme X.
- **ÉTAYÉ** : plusieurs référents substantiels distincts soutiennent précisément X.
- **INFÉRÉ** : CoachRedo déduit prudemment Y à partir d'informations disponibles, au-delà de leur formulation littérale.
- **CONTRADICTOIRE** : informations réellement incompatibles sur le même objet/référent, même période/granularité pertinente.
- **INCONNU** : les informations disponibles ne permettent pas raisonnablement de conclure.

**Objets concernés par ÉTAYÉ, principalement deux :**
- **Capacités** — cas central. Étayée quand plusieurs référents substantiels distincts soutiennent précisément cette capacité.
- **Certains comportements passés** — étayés uniquement dans leur portée factuelle/épisodique (« dans plusieurs situations rapportées, la personne a fait X »), jamais transformés en trait stable, personnalité, profil psychologique ou identité.

**Objets qui restent naturellement DÉCLARÉS, jamais à faire monter artificiellement vers ÉTAYÉ :** préférences, contraintes, ressources, moyens disponibles, réseau d'aide, actif relationnel accessible, mobilisabilité actuelle, **et observation/connaissance déclarée d'un problème.** Ils peuvent être croisés et utilisés dans le raisonnement sans changer de statut. **Réseau d'aide (Q22) ≠ actif relationnel accessible (micro-donnée)** — deux faits DÉCLARÉS distincts ; leur coexistence ne produit jamais un « réseau ÉTAYÉ ».

**Observation/connaissance d'un problème = DÉCLARÉE, explicitement hors du mécanisme de convergence.** Q33/Q34/Q36 peuvent rendre une observation plus pertinente pour l'exploration, sans jamais changer son statut. Maintenir strictement : problème observé ≠ demande ; plainte répétée ≠ volonté de payer ; connaissance d'un environnement ≠ marché validé ; solution existante ≠ opportunité viable.

**Portée minimale de l'étayage.** CoachRedo étaye la proposition la plus précise raisonnablement supportée par les référents — jamais une généralisation. Toute généralisation, catégorie ou projection vers un contexte non testé bascule vers INFÉRÉ. Exemple verrouillé : ÉTAYÉ = « a coordonné plusieurs personnes dans plusieurs situations rapportées » ; INFÉRÉ = « pourrait disposer d'aptitudes utiles dans une fonction de coordination » ; jamais « est un manager » ou « a un profil de leader ».

**Contradiction.** Une vraie contradiction suppose une incompatibilité réelle sur le même objet/référent et un périmètre temporel/granulaire comparable. Ne sont pas automatiquement contradictoires : capacité historiquement étayée + faible mobilisabilité actuelle ; succès passé + difficulté récente ; déclaration générale + absence de preuve concrète ; différence de contexte/période. Une contradiction locale n'invalide jamais automatiquement d'autres propositions étayées.

**Axe A (preuve) ≠ Axe B (mobilisabilité), maintenu strictement.** Q18 reste sur l'axe B : ne produit jamais ÉTAYÉ, ne le renforce pas, ne dégrade jamais rétroactivement une preuve historique — sert uniquement à déterminer comment une capacité peut raisonnablement être mobilisée aujourd'hui. Une capacité peut donc être historiquement ÉTAYÉE et actuellement peu mobilisable, sans contradiction.

**Aucun score.** Famille verrouillée : règles qualitatives déterministes. Rejet explicite : scoring pondéré, addition de points, seuil numérique arbitraire, score secondaire même « informatif ». Aucun score de preuve, interne ou visible utilisateur, pour V3.

**Preuve personnelle ≠ validation terrain, verrou absolu.** Une capacité personnelle peut être ÉTAYÉE ; cela ne suffit jamais à étayer un marché, une demande, une volonté de payer, un prix, une offre, une rentabilité, ou la réussite future d'une voie — ces éléments restent INCONNUS ou éventuellement INFÉRÉS avec prudence jusqu'à recherche/test/terrain approprié. Maintenir : « L'IA explore. CoachRedo filtre et éclaire. La personne décide. Le terrain valide. »

**Impact sur les blocs de l'anatomie (§D) :** « Pourquoi elle apparaît pour toi » distingue faits déclarés, propositions étayées et inférences pertinentes ; « Ce qu'elle demande » intègre la mobilisabilité actuelle sans la confondre avec la preuve historique ; « Ce que nous ne savons pas encore » conserve les inconnues réelles, notamment marché/opportunité ; « Ta prochaine action » dépend de l'incertitude déterminante, du risque, de la réversibilité et de l'information que l'action peut produire — jamais d'un simple statut de preuve (voir §D.1, pas de gate) ; la trajectoire devient plus conditionnelle quand les inconnues pertinentes augmentent, sans jamais utiliser la hiérarchie artificielle DÉCLARÉ<INFÉRÉ<ÉTAYÉ.

---

## E. Q32 — direction plausible mais non considérée aujourd'hui (Arbitrage 3-4)

**PRÊT À CONSIDÉRER AUJOURD'HUI ≠ LIMITE PERMANENTE.** Une direction suffisamment plausible mais explicitement non considérée aujourd'hui peut apparaître **en retrait**, uniquement si sa présence apporte une réelle valeur — cette catégorie n'a aucune obligation d'exister.

Anatomie légère :
1. Nom de la direction.
2. Pourquoi elle reste cohérente avec l'objectif.
3. Ce qui devrait évoluer pour qu'elle devienne éventuellement pertinente.

Aucun : prochaine action immédiate, test prescrit, options détaillées, pression implicite.

Nom de travail conceptuel, **non verrouillé comme wording UX final** : « Direction à garder en vue ».

---

## F. Architecture documentaire finale — 7 sections + clôture (Arbitrage 4)

**Section 1 — Ton point de départ.** Synthèse de la situation actuelle et du contexte (Q1-Q5, branche activité). Le territoire d'action reste ici comme donnée contextuelle globale — ne pas le déplacer vers « Ton capital de départ ». Synthétise, ne recopie pas MPD.

**Section 2 — Ton parcours comme capital.** Reste distincte de « Ton capital de départ » (Q10-Q17) — **tranché définitivement (Arbitrage 4) : Architecture I retenue, jamais fusionnée avec Section 4.** Raison doctrinale, à garder visible : parcours/preuves historiques ≠ ressources et capacités mobilisables aujourd'hui — les deux axes ne doivent jamais être confondus. Fonction : ce que le vécu permet raisonnablement d'identifier comme expériences, apprentissages et preuves pertinentes. Discipline stricte : pas de compétence inventée, pas de surinterprétation, pas d'identité psychologique, pas de confusion DÉCLARÉ/ÉTAYÉ. Doit rester suffisamment légère pour ne pas dupliquer les preuves ciblées utilisées ensuite dans chaque voie (bloc 2).

**Section 3 — Ta boussole.** Direction recherchée : ce que la personne veut changer, objectif/direction, WHY lorsqu'il existe, signe concret d'avancement (Q6, Q7, WHY conditionnel, Q9). Q8 n'appartient plus ici.

**Section 4 — Ton capital de départ.** Ce qui est réellement mobilisable aujourd'hui : capacités mobilisables (Q18), moyens matériels (Q19), autonomie numérique (Q20), langues (Q21), réseau d'aide + actif relationnel (Q22 + micro-donnée), budget (Q28), mobilité (Q30), autres ressources pertinentes. Ne jamais confondre mobilisabilité actuelle et niveau de preuve (Section 2).

**Section 5 — Tes critères de Plan B.** Quatre catégories distinctes, jamais aplaties en un filtre unique : Q8 (préférence), Q31 (condition indispensable maintenant), Q32 (disponibilité actuelle), Q29 (urgence/horizon).

**Section 6 — Tes voies plausibles.** Cœur de MFR. Une ou plusieurs voies selon ce que l'analyse justifie, sans nombre prédéfini. Chaque voie utilise l'anatomie à 7 blocs (§D). Les raisons de sa présence sont restituées dans la voie elle-même — le filtre CoachRedo n'est donc pas une section utilisateur autonome. Après les voies, lorsque pertinent : « Direction(s) à garder en vue » (§E), sous forme d'encadré conditionnel en retrait, jamais au même niveau que les voies considérables.

**Section 7 — Pour t'aider à choisir.** Remplace l'ancien « Ta décision ». Fonction : mise en regard des voies sans choisir à la place de la personne. Avec plusieurs voies : aide à comparer à partir de l'objectif, des critères, des contraintes et de ce que la personne est prête à envisager. Avec une seule voie : aide à se demander si elle souhaite réellement l'envisager maintenant. Aucun score, classement ou gagnant.

**Clôture non numérotée** (ex-Section 12, devient une clôture éditoriale, pas une section principale). Rappelle : autonomie, liberté de choix, possibilité d'agir seul, absence de promesse, coaching facultatif uniquement. Aucun funnel artificiel. Aucun contenu nécessaire à l'action ne doit être retenu pour créer une dépendance au coaching.

### F.1 — Sections historiques supprimées, et où vont leurs fonctions

La suppression d'une section historique ne signifie jamais la suppression de sa fonction utile :

- **Ton miroir CoachRedo** — supprimée comme section autonome. Aucun profil psychologique ou lecture identitaire, aucun VAK, aucune croyance profonde inventée, aucune conclusion absolue sur « qui est la personne ». Une tension factuelle globale reste signalée uniquement là où elle devient pertinente (pas une section dédiée).
- **Le filtre CoachRedo** — supprimée. Mécanisme interne ; justification intégrée à chaque voie (bloc 2, Section 6).
- **Ton premier test réel** — supprimée. Fonction absorbée dans « Ta prochaine action » (bloc 6) de chaque voie.
- **Ta feuille de route de départ** — supprimée. Fonction absorbée dans « La trajectoire possible » (bloc 7) de chaque voie — une ROUTE est par définition propre à une voie donnée (§C), aucune synthèse transversale cohérente n'est possible.

---

## G. Ce qui reste explicitement ouvert

Aucune architecture technique n'est décidée par les Arbitrages 1-5 : provider IA, prompts, orchestration interne (le nombre et la nature des opérations réelles — analyser/explorer/filtrer/construire/vérifier/rédiger ou une autre séquence — restent ouverts ; la décision conceptuelle ne se traduit pas par « un seul appel IA »), schéma de données, RPC, mise en page finale/PDF.

**Mécanisme de convergence DÉCLARÉ→ÉTAYÉ : conceptuellement verrouillé (§D.3, Arbitrage 5, D-024).** Reste ouvert, explicitement pour son seul volet technique : comment détecter de façon fiable qu'un même référent est cité sous deux questions différentes (§D.3).

Reports conceptuels encore ouverts, non résolus par les Arbitrages 1-5 : algorithme technique exact du filtrage/croisement produisant les voies elles-mêmes (le principe et le pipeline sont verrouillés, pas l'algorithme — candidat naturel pour un prochain verrou conceptuel, non ouvert à ce stade) ; seuils et algorithme du principe à 3 niveaux de Q20 ; mise en œuvre technique exacte de l'exploration élargie (le principe est verrouillé, pas la méthode) ; détection technique du référent partagé (ci-dessus) ; position exacte de « Direction(s) à garder en vue » dans le document ; wording UX final de toutes les sections. (Le fork Architecture I/Architecture II est tranché — voir §F, Section 2 : Architecture I retenue.)

Voir `CURRENT_STATE.md` §8 pour le suivi vivant de ces reports, et `DECISIONS.md` D-023/D-024 pour les décisions de clôture.
