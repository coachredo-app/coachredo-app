---
name: mon-point-de-depart-v3-ux
description: Architecture UX arbitrée pour Mon point de départ V3 (hub, 7 étapes, navigation, micro-transitions, Ma feuille de route) — décisions produit/UX, pas une spécification technique.
metadata:
  type: project-memory
---

# MON_POINT_DE_DEPART_V3 — Architecture UX arbitrée

Dernière mise à jour : 2026-09-23

Ce document enregistre l'arbitrage QG du chantier UX « Journey Progress / Mon point de départ V3 » (benchmark *Alchemy of Self* étudié comme mécanisme, non copié). Ce sont des décisions **produit/UX**, pas une spécification technique — voir §P pour ce qui reste explicitement ouvert. Aucune implémentation n'est engagée par ce document.

**Nommage produit (nouveau, V3) :** Plan B Rentable → **Mon point de départ** → **Ma feuille de route**. Ce nommage concerne le chantier V3 en conception. Le produit actuellement en production reste nommé Bilan de Clarté V2 / Rapport CoachRedo (voir `CURRENT_STATE.md` §2, `ARCHITECTURE.md` §3/§6) — **aucun renommage rétroactif** du code, des tables (`bilan_sessions`, `rapports`), ou du flag `BILAN_OPEN` n'est impliqué par cette décision produit.

---

## A. Architecture générale

Hybride retenu (ni tunnel linéaire pur, ni vue Journey façon Alchemy affichée en continu). Hub central avec deux espaces visibles dès le départ : **Mon point de départ | Ma feuille de route**. Les deux sont visibles dès le départ, mais leur disponibilité dépend de l'état réel du parcours.

## B. Les 7 étapes

1. Ta situation aujourd'hui
2. Ce que tu veux changer
3. Ton parcours
4. Ce que tu as déjà en main
5. Ta façon d'avancer
6. Ce qui est possible pour toi aujourd'hui
7. Ce que tu observes autour de toi

Visibles dès le départ. Parcours **obligatoirement séquentiel** (1→2→3→4→5→6→7) — l'utilisateur ne choisit pas librement son ordre. Ceci tranche explicitement le point laissé ouvert lors du challenge UX précédent (dépendance ou non des branches entre étapes non confirmée à l'époque).

Étapes futures : terme retenu **« À venir »**, pas « verrouillé » — pas de logique de récompense/gamification. Visibilité du chemin et accessibilité sont deux choses différentes.

## C. Vue globale / continuité du parcours

La vue des 7 étapes apparaît : à l'entrée de Mon point de départ, lors d'une reprise après interruption réelle, ou sur demande explicite de l'utilisateur. Jamais imposée automatiquement entre chaque étape d'une session continue : fin d'étape → micro-transition → étape suivante, sans clic obligatoire sur la carte globale. Objectif : conserver la vision globale sans casser l'élan.

## D. Consultation et modification des étapes terminées

Une étape terminée reste **toujours consultable**. Elle reste **modifiable uniquement tant qu'aucune nouvelle réponse utilisateur n'a été effectivement enregistrée dans l'étape suivante**.

Exemple : étape 2 terminée → modifiable ; micro-transition vers étape 3 → étape 2 encore modifiable ; première question de l'étape 3 affichée → étape 2 encore modifiable ; première nouvelle réponse utilisateur de l'étape 3 enregistrée → étape 2 devient lecture seule.

Un préremplissage automatique, une information réutilisée, ou une question automatiquement sautée ne déclenchent PAS ce verrouillage à eux seuls. Frontière exacte : **première nouvelle réponse utilisateur effectivement enregistrée dans l'étape suivante.**

Cette règle doit être expliquée simplement à l'utilisateur dès le départ. **Implémentation technique non conçue à ce stade.**

## E. États utilisateur des étapes

Quatre états visibles seulement, pas plus : **À venir / À commencer / En cours / Terminée**.

Lecture seule / modifiable peut rester une règle interne ou déterminer les actions disponibles, sans devenir un statut utilisateur supplémentaire. **INCONNU** reste un état de donnée/réponse, jamais un état d'étape.

## F. Nombre de questions et durée

Ne PAS afficher le nombre de questions par étape — le nombre réel d'interactions varie (branches conditionnelles, relances, questions de récupération sautées, réutilisation d'informations déjà obtenues).

Afficher en revanche une **durée estimée par étape**, pour réduire l'incertitude sans créer de fausse précision. Orientation retenue : **≈ 5–10 min**, présentée comme fourchette, pas comme un chiffre garanti. Durées exactes non définies — à calibrer plus tard une fois le parcours V3, les branches et les relances suffisamment stabilisés, idéalement avec des données d'usage. Une estimation globale du parcours pourra être envisagée si elle peut être suffisamment crédible.

## G. Progression à l'intérieur d'une étape

Progression visuelle interne **sans chiffre** retenue — pas de pourcentage, pas de « Question X sur Y », pas de nombre total d'interactions. Doit permettre de ressentir qu'on avance et se rapproche de la fin.

Principe important : **la progression affichée ne doit pas reculer** lorsqu'une branche ou une relance apparaît. Mécanisme exact de calcul **non spécifié** — à concevoir plus tard avec l'architecture adaptative déterministe. Ne pas inventer d'algorithme de progression maintenant.

## H. Reprise après interruption

Retour = vue globale des 7 étapes d'abord (terminées / en cours / à venir clairement visibles). Action « Continuer mon parcours » → reprise exacte à l'endroit où l'utilisateur s'était arrêté. Il ne recommence ni le parcours, ni l'étape.

## I. Micro-transitions

Courtes et contextualisées à chaque changement d'étape — expliquent naturellement le passage au thème suivant, évitent l'impression de formulaire administratif. Ne doivent PAS : produire un diagnostic, interpréter prématurément la personne, tirer des conclusions avant l'analyse finale, rallonger inutilement le parcours. Elles créent du sens et de la continuité.

## J. Desktop et mobile

Desktop : vue compacte des 7 étapes, une grille peut être utilisée si elle sert correctement la lisibilité. Mobile : liste verticale compacte, les 7 étapes restent visibles — pas de carrousel horizontal, pas de « Voir plus » masquant une partie du parcours. Le principe produit reste identique sur les deux.

## K. Navigation — trois fonctions distinctes

- **Retour** : écran logique précédent du parcours — pas nécessairement un simple `history.back()` navigateur. Doit respecter les règles de modification, de consultation et les dépendances du parcours.
- **Voir mon parcours** : accès discret mais permanent à la carte des 7 étapes. La progression en cours doit être conservée.
- **Mon espace CoachRedo** : sortie du module vers le dashboard général de l'application. Logique déjà existante dans le Reader de Plan B Rentable, à garder cohérente à l'échelle de l'écosystème.

Principe général : la navigation doit éviter toute perte de progression.

## L. Fin de l'étape 7

Pas de fin brutale sur un simple écran « questionnaire terminé ». Une page de transition dédiée annonce : que Mon point de départ est terminé, que les 7 étapes ont été complétées, que CoachRedo prépare maintenant Ma feuille de route. Aucune promesse de délai, aucune fausse progression de génération. Bouton « OK » → retour à la vue centrale, qui montre alors les 7 étapes **Terminées**.

## M. Ma feuille de route dans le hub

Visible dans le hub dès le début du parcours. Avant la fin des 7 étapes, si l'utilisateur l'ouvre : message clair expliquant qu'elle sera préparée une fois Mon point de départ terminé, avec retour/continuation du parcours possible. Une fois les 7 étapes terminées : état **« En préparation »**, message clair, aucun délai inventé ou promis. Quand réellement disponible : état **« Prête »** — la page peut alors proposer une représentation visuelle (couverture/première page), un accès in-app, un téléchargement PDF. **Éléments non transformés en spécification technique définitive.**

## N. Positionnement de l'IA

L'IA n'est pas le protagoniste de l'expérience utilisateur. Formulation privilégiée : « CoachRedo prépare Ma feuille de route » — pas « Une IA génère ton rapport ». Méthodologie inchangée : collecte déterministe pendant Mon point de départ, aucune question générée par IA pendant la collecte, analyse après la collecte.

Principes structurants à préserver (reformulations validées cette session) :
- « L'IA explore. CoachRedo filtre et éclaire. La personne décide. Le terrain valide. »
- « Quand CoachRedo ne sait pas, il questionne. Quand il ne peut pas encore savoir, il propose un test. Il n'invente jamais. »
- « L'objectif donne la direction. La situation actuelle détermine le point de départ. Les preuves déterminent la prochaine étape. Le terrain permet d'adapter la suite du chemin. »
- « CoachRedo ne cherche pas à faire lancer un business à tout prix. Il cherche la prochaine étape réaliste qui augmente progressivement la capacité d'action et l'autonomie de la personne. »

Logique générale (cf. PROJECT_BIBLE §2) : Clarté → Action → Discipline → Construction → Autonomie.
Moteur : Explorer → Filtrer → Décider → Tester → Valider → Documenter → Réutiliser.

## O. Orientation narrative de Ma feuille de route — [FUTUR, chantier non ouvert]

Orientation conceptuelle pour le futur chantier Ma feuille de route (non ouvert à ce jour, ne pas anticiper d'implémentation) : ne doit pas se lire comme une succession froide de fiches/résultats de questionnaire, mais comme **une histoire structurée** — introduction, paragraphes qui s'enchaînent naturellement, transitions, progression narrative, conclusion.

L'architecture analytique interne peut conserver les blocs/sections nécessaires à la couverture, au raisonnement, aux preuves et à la QA. Mais l'architecture utilisateur doit raconter progressivement : d'où la personne part → ce qu'elle veut construire → ce que son parcours et ses preuves montrent réellement → ce qu'elle possède déjà → ses contraintes → les voies plausibles → les arbitrages → ce qui reste inconnu → la prochaine étape → le premier test → la trajectoire.

Horizon temporel du récit : MAINTENANT → PROCHAINE ÉTAPE → MOYEN TERME → DIRECTION LONG TERME. Plus l'horizon est éloigné, plus le langage doit être conditionnel.

Ne pas copier Alchemy of Self. Le benchmark enseigne la puissance d'une narration continue donnant à la personne le sentiment que son histoire a été réellement entendue — mais CoachRedo doit explicitement éviter : les causalités psychologiques affirmées sans preuve suffisante, les diagnostics de personnalité, les interprétations profondes présentées comme certaines, les projections futures racontées comme si elles allaient nécessairement se réaliser, les engagements culpabilisants ou artificiellement contraignants.

**Distinction avec l'épistémologie du coaching humain** (cf. `COACHING_DOCTRINE.md` §3, deux cadres intentionnellement distincts, à ne pas harmoniser automatiquement) : l'architecture de preuve retenue pour Ma feuille de route est **DÉCLARÉ / ÉTAYÉ / INFÉRÉ / CONTRADICTOIRE / INCONNU**. Une narration fluide ne doit jamais effacer cette discipline méthodologique.

Résultat recherché, ressenti par la personne : « CoachRedo a compris ce que je lui ai raconté, distingue ce qu'il sait de ce qu'il ne sait pas, m'aide à comprendre pourquoi certaines voies sont plausibles et pourquoi cette prochaine étape a du sens pour moi. »

## P. Ce qui n'est explicitement PAS décidé

Non verrouillés à ce stade, chantiers ultérieurs séparés : durées exactes des 7 étapes ; mécanisme technique exact de la progression visuelle interne ; design graphique final des cartes ; choix clair/sombre de Mon point de départ ; wording final de tous les écrans ; algorithme technique de reprise/navigation ; architecture technique finale de génération de Ma feuille de route ; mise en page finale du PDF ; couverture finale de Ma feuille de route.

---

## Prochaine étape officielle

Le prochain chantier QG n'est pas l'implémentation. Reprise exacte à la **Matrice finale de couverture Q1-Q36** — voir `CURRENT_STATE.md` §8 pour le détail. Non commencée à ce stade.
