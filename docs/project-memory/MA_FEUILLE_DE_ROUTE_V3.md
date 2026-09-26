---
name: ma-feuille-de-route-v3
description: Architecture conceptuelle verrouillée de Ma feuille de route V3 (pipeline exploration/filtrage, granularité voie/option, anatomie d'une voie, architecture documentaire finale à 7 sections) — décisions conceptuelles issues des Arbitrages 1-4, pas une architecture technique.
metadata:
  type: project-memory
---

# MA_FEUILLE_DE_ROUTE_V3 — Architecture conceptuelle verrouillée

Dernière mise à jour : 2026-09-26 (D-023 — clôture des Arbitrages 1-4 MFR)

Ce document enregistre l'architecture **conceptuelle** de Ma feuille de route V3, arbitrée par le QG en quatre tours le 2026-09-26 (Arbitrages 1 à 4). **Aucune architecture technique n'est décidée ici** : provider IA, prompts, orchestration, nombre d'appels, schéma de données et RPC restent explicitement ouverts (voir `CURRENT_STATE.md` §8). Ce document est le pendant, côté Ma feuille de route, de `MON_POINT_DE_DEPART_V3.md` (côté collecte).

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

Question directrice pour choisir : *qu'est-ce qui manque aujourd'hui pour avancer intelligemment ?* Exemple conceptuel verrouillé : une activité réelle qui fonctionne déjà ne doit jamais recevoir artificiellement un test destiné à vérifier ce qui est déjà suffisamment établi. Un test ne doit jamais devenir une recette générique (« parle à X personnes ») — il découle de l'incertitude critique propre à la voie.

**Lecture du résultat d'un test, autonomie :** lorsqu'un test est proposé, MFR explique ce qu'il cherche à apprendre, les moyens nécessaires, les signaux à observer, ce que ces signaux peuvent raisonnablement indiquer, et ce qu'ils ne permettent pas encore de conclure — ceci relève de l'éducation à la preuve et de l'autonomie. MFR **ne préconstruit pas** une arborescence exhaustive d'adaptations futures (« si résultat A → action B → si B échoue → C… ») — l'analyse continue des résultats et les adaptations successives appartiennent à l'action autonome ultérieure ou au futur coaching facultatif.

### D.2 — Comparabilité sans classement

Plusieurs voies suivent les mêmes règles de construction et les mêmes règles d'apparition des blocs conditionnels — mais pas nécessairement la même longueur, le même nombre d'options, le même nombre d'inconnues, ni la même quantité de texte. Une différence de profondeur est légitime lorsqu'elle découle réellement de la voie et des informations disponibles ; elle ne doit jamais être utilisée pour favoriser silencieusement une voie. Aucun score global, aucun classement, aucun gagnant, aucune « meilleure voie » désignée par CoachRedo.

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

Aucune architecture technique n'est décidée par les Arbitrages 1-4 : provider IA, prompts, orchestration interne (le nombre et la nature des opérations réelles — analyser/explorer/filtrer/construire/vérifier/rédiger ou une autre séquence — restent ouverts ; la décision conceptuelle ne se traduit pas par « un seul appel IA »), schéma de données, RPC, mise en page finale/PDF.

Reports conceptuels encore ouverts, non résolus par les Arbitrages 1-4 : mécanisme de convergence DÉCLARÉ→ÉTAYÉ (aucun principe de scoring défini à dessein — **prochain verrou conceptuel**) ; algorithme technique exact du filtrage/croisement (le principe et le pipeline sont verrouillés, pas l'algorithme) ; seuils et algorithme du principe à 3 niveaux de Q20 ; mise en œuvre technique exacte de l'exploration élargie (le principe est verrouillé, pas la méthode) ; position exacte de « Direction(s) à garder en vue » dans le document ; wording UX final de toutes les sections. (Le fork Architecture I/Architecture II est tranché — voir §F, Section 2 : Architecture I retenue.)

Voir `CURRENT_STATE.md` §8 pour le suivi vivant de ces reports, et `DECISIONS.md` D-023 pour la décision de clôture.
