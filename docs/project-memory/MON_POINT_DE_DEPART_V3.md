---
name: mon-point-de-depart-v3-ux
description: Architecture UX arbitrée pour Mon point de départ V3 (hub, 7 étapes, navigation, micro-transitions, Ma feuille de route) — décisions produit/UX, pas une spécification technique.
metadata:
  type: project-memory
---

# MON_POINT_DE_DEPART_V3 — Architecture UX arbitrée

Dernière mise à jour : 2026-10-05 (micro-transitions entre familles du parcours linéaire — clôture T7.10, D-040 — §I/§P et pointeur en fin de document mis à jour)

Ce document enregistre l'arbitrage QG du chantier UX « Journey Progress / Mon point de départ V3 » (benchmark *Alchemy of Self* étudié comme mécanisme, non copié). Ce sont des décisions **produit/UX**, pas une spécification technique — voir §P pour ce qui reste explicitement ouvert. Aucune implémentation n'est engagée par ce document.

**Nommage produit (nouveau, V3) :** Plan B Rentable → **Mon point de départ** → **Ma feuille de route**. Ce nommage concerne le chantier V3 en conception. Le produit actuellement en production reste nommé Bilan de Clarté V2 / Rapport CoachRedo (voir `CURRENT_STATE.md` §2, `ARCHITECTURE.md` §3/§6) — **aucun renommage rétroactif** du code, des tables (`bilan_sessions`, `rapports`), ou du flag `BILAN_OPEN` n'est impliqué par cette décision produit.

---

## A. Architecture générale

Hybride retenu (ni tunnel linéaire pur, ni vue Journey façon Alchemy affichée en continu). Hub central avec deux espaces visibles dès le départ : **Mon point de départ | Ma feuille de route**. Les deux sont visibles dès le départ, mais leur disponibilité dépend de l'état réel du parcours.

**Première implémentation du hub : close (D-038, 2026-10-03)** — navigation supérieure à deux onglets, grille des 7 familles, articulation MPD/MFR. Seule la structure UX fonctionnelle est verrouillée par D-038, pas le détail esthétique (revue design globale différée). Détail canonique complet : `DECISIONS.md` D-038.

## B. Les 7 étapes

1. **Ta situation aujourd'hui** — « Faisons le point sur ta situation actuelle et le temps dont tu disposes réellement. »
2. **Ce que tu veux changer** — « Clarifions ce que tu aimerais changer, améliorer ou préserver dans ta situation. »
3. **Ton parcours** — « Regardons ce que tes expériences t'ont déjà permis d'apprendre et de savoir faire. »
4. **Ce que tu as déjà en main** — « Identifions les ressources, les moyens et les appuis que tu peux déjà mobiliser. »
5. **Ta façon d'avancer** — « Regardons comment tu as déjà réagi, appris et avancé dans des situations concrètes. »
6. **Ce qui est possible pour toi aujourd'hui** — « Prenons en compte tes possibilités et tes contraintes réelles pour construire quelque chose d'adapté à ta situation. »
7. **Ce que tu observes autour de toi** — « Regardons les personnes, les situations et les problèmes que tu connais ou observes autour de toi. »

Noms et courtes descriptions utilisateur **VALIDÉS (D-036)**.

Visibles dès le départ. Parcours **obligatoirement séquentiel** (1→2→3→4→5→6→7) — l'utilisateur ne choisit pas librement son ordre. Ceci tranche explicitement le point laissé ouvert lors du challenge UX précédent (dépendance ou non des branches entre étapes non confirmée à l'époque).

Étapes futures : terme retenu **« À venir »**, pas « verrouillé » — pas de logique de récompense/gamification. Visibilité du chemin et accessibilité sont deux choses différentes.

## C. Vue globale / continuité du parcours

La vue des 7 étapes apparaît : à l'entrée de Mon point de départ, lors d'une reprise après interruption réelle, ou sur demande explicite de l'utilisateur. Jamais imposée automatiquement entre chaque étape d'une session continue : fin d'étape → micro-transition → étape suivante, sans clic obligatoire sur la carte globale. Objectif : conserver la vision globale sans casser l'élan.

## D. Consultation et modification des étapes terminées

Une étape terminée reste **toujours consultable**. Elle reste **modifiable uniquement tant qu'aucune nouvelle réponse utilisateur n'a été effectivement enregistrée dans l'étape suivante**.

Exemple : étape 2 terminée → modifiable ; micro-transition vers étape 3 → étape 2 encore modifiable ; première question de l'étape 3 affichée → étape 2 encore modifiable ; première nouvelle réponse utilisateur de l'étape 3 enregistrée → étape 2 devient lecture seule.

Un préremplissage automatique, une information réutilisée, ou une question automatiquement sautée ne déclenchent PAS ce verrouillage à eux seuls. Frontière exacte : **première nouvelle réponse utilisateur effectivement enregistrée dans l'étape suivante.**

Cette règle doit être expliquée simplement à l'utilisateur dès le départ. **Modèle de dérivation et garde serveur désormais implémentés (D-037)** — `E_max`/`getFamilyStates`, voir §Q ; l'écran hub/les composants restent non engagés. Granularité exacte de Retour et de la restauration d'une réponse dans une famille encore modifiable : précisée par D-036, voir §Q.

**Consultation et modification ciblée désormais implémentées et closes (D-039, 2026-10-03)** — toute famille Terminée (verrouillée ou modifiable) est consultable depuis le hub via une action « Consulter » → `/plan-b/famille/[etape]` (le verrouillage interdit l'écriture, jamais la consultation) ; une famille Terminée+modifiable n'est plus rouverte séquentiellement depuis sa première question — chaque réponse affichée porte sa propre action « Modifier » vers `/plan-b/famille/[etape]/modifier/[stableId]`, permettant à l'utilisateur de choisir directement la réponse à modifier. Détail complet : `DECISIONS.md` D-039.

## E. États utilisateur des étapes

Quatre états visibles seulement, pas plus : **À venir / À commencer / En cours / Terminée**.

Lecture seule / modifiable peut rester une règle interne ou déterminer les actions disponibles, sans devenir un statut utilisateur supplémentaire. **INCONNU** reste un état de donnée/réponse, jamais un état d'étape.

## F. Nombre de questions et durée

Ne PAS afficher le nombre de questions par étape — le nombre réel d'interactions varie (branches conditionnelles, relances, questions de récupération sautées, réutilisation d'informations déjà obtenues).

Afficher en revanche une **durée estimée par étape**, pour réduire l'incertitude sans créer de fausse précision. Orientation retenue : **≈ 5–10 min**, présentée comme fourchette, pas comme un chiffre garanti. Durées exactes non définies — à calibrer plus tard une fois le parcours V3, les branches et les relances suffisamment stabilisés, idéalement avec des données d'usage. Une estimation globale du parcours pourra être envisagée si elle peut être suffisamment crédible.

**Doctrine temporelle transversale, verrouillée le 2026-09-25 (D-022) : ÉTAT ACTUEL ≠ LIMITE PERMANENTE.** Toute donnée de Mon point de départ décrit la situation connue au moment de la collecte et calibre ce qui est réaliste maintenant — jamais projetée automatiquement par Ma feuille de route comme une limite à moyen/long terme, sauf si les données permettent réellement de soutenir cette permanence. Détail complet et vérification de couverture (temps, budget, mobilité, mobilisabilité d'une capacité, ouverture au changement, voies utilisées comme étapes) : `docs/project-memory/MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md` §1.

## G. Progression à l'intérieur d'une étape

Progression visuelle interne **sans chiffre** retenue — pas de pourcentage, pas de « Question X sur Y », pas de nombre total d'interactions. Doit permettre de ressentir qu'on avance et se rapproche de la fin.

Principe important : **la progression affichée ne doit pas reculer** lorsqu'une branche ou une relance apparaît. Mécanisme exact de calcul **non spécifié** — à concevoir plus tard avec l'architecture adaptative déterministe. Ne pas inventer d'algorithme de progression maintenant.

## H. Reprise après interruption

Retour = vue globale des 7 étapes d'abord (terminées / en cours / à venir clairement visibles). Action « Continuer mon parcours » → reprise exacte à l'endroit où l'utilisateur s'était arrêté. Il ne recommence ni le parcours, ni l'étape.

## I. Micro-transitions

Courtes et contextualisées à chaque changement d'étape — expliquent naturellement le passage au thème suivant, évitent l'impression de formulaire administratif. Ne doivent PAS : produire un diagnostic, interpréter prématurément la personne, tirer des conclusions avant l'analyse finale, rallonger inutilement le parcours. Elles créent du sens et de la continuité. Ne doivent pas non plus forcer un retour au hub entre deux familles pendant une session continue (cohérent avec §C).

**Six textes validés (D-036)** — remplacent les exemples de travail non figés précédemment listés dans `MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md` :
- **1→2** : « Maintenant que ta situation est plus claire, regardons ce que tu aimerais changer. »
- **2→3** : « Tu sais mieux où tu veux aller. Regardons maintenant ce que ton parcours t'a déjà apporté. »
- **3→4** : « Ton parcours nous donne déjà des informations utiles. Regardons maintenant ce que tu as concrètement en main aujourd'hui. »
- **4→5** : « Nous savons mieux ce que tu peux mobiliser. Regardons maintenant comment tu avances face aux situations concrètes. »
- **5→6** : « Regardons maintenant ce qui est réellement possible pour toi aujourd'hui, avec ta situation actuelle. »
- **6→7** : « Dernière étape. Regardons maintenant ce que tu connais et observes autour de toi. »

**Implémentation et Retour linéaire minimal : clos et validés par test utilisateur réel (D-040, 2026-10-05).** Le mécanisme (dérivé de l'état serveur frais, jamais une question/réponse/persistance) et le Retour depuis la première question d'une nouvelle famille (vers sa micro-transition d'entrée, distinct du Retour de D-039) sont désormais implémentés — validés sur les 4 frontières F3→F4, F4→F5, F5→F6, F6→F7. Détail canonique complet : `DECISIONS.md` D-040.

## J. Desktop et mobile

Desktop : vue compacte des 7 étapes, une grille peut être utilisée si elle sert correctement la lisibilité. Mobile : liste verticale compacte, les 7 étapes restent visibles — pas de carrousel horizontal, pas de « Voir plus » masquant une partie du parcours. Le principe produit reste identique sur les deux.

## K. Navigation — trois fonctions distinctes

- **Retour** : écran logique précédent du parcours — pas nécessairement un simple `history.back()` navigateur. Doit respecter les règles de modification, de consultation et les dépendances du parcours. Granularité exacte précisée par D-036 — voir §Q.
- **Voir mon parcours** : accès discret mais permanent à la carte des 7 étapes. La progression en cours doit être conservée.
- **Mon espace CoachRedo** : sortie du module vers le dashboard général de l'application. Logique déjà existante dans le Reader de Plan B Rentable, à garder cohérente à l'échelle de l'écosystème.

Principe général : la navigation doit éviter toute perte de progression.

## L. Fin de l'étape 7

Pas de fin brutale sur un simple écran « questionnaire terminé ». Lorsque la dernière question applicable de la 7ᵉ famille est enregistrée, le système vérifie qu'il ne reste aucune question applicable non traitée, puis affiche une **page de clôture dédiée** annonçant que Mon point de départ est terminé, que les 7 étapes ont été complétées, et que la suite est Ma feuille de route. Aucune promesse de délai, aucune fausse progression de génération.

**Déclenchement de la préparation de Ma feuille de route, précisé par D-036 :** ce n'est **pas automatique** au simple enregistrement de la dernière réponse. La page de clôture porte un CTA explicite — libellé privilégié **« Préparer ma Feuille de Route »** — qui n'est ni une validation juridique, ni une confirmation individuelle de chaque réponse : il constitue l'action fonctionnelle par laquelle l'utilisateur termine son Mon point de départ et déclenche la consommation du dossier (création de l'état logique source, D-028 pt. 6) puis le lancement de la préparation de Ma feuille de route. Si l'utilisateur quitte l'application depuis la page de clôture **avant** d'utiliser ce CTA : ses réponses restent enregistrées, la préparation de Ma feuille de route n'a pas encore commencé, et à son retour il doit retrouver cette même page de clôture pour poursuivre. Après action sur le CTA → retour à la vue centrale, qui montre alors les 7 étapes **Terminées** et Ma feuille de route en **« En préparation »**.

## M. Ma feuille de route dans le hub

Visible dans le hub dès le début du parcours. Avant la fin des 7 étapes, si l'utilisateur l'ouvre : message clair expliquant qu'elle sera préparée une fois Mon point de départ terminé, avec retour/continuation du parcours possible. Le passage de « visible mais indisponible » à **« En préparation »** est déclenché par l'action utilisateur sur le CTA de clôture décrit en §L — pas automatiquement à l'enregistrement de la dernière réponse (précisé par D-036). Message clair, aucun délai inventé ou promis. Quand réellement disponible : état **« Prête »** — la page peut alors proposer une représentation visuelle (couverture/première page), un accès in-app, un téléchargement PDF. **Éléments non transformés en spécification technique définitive.**

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

## Q. Retour, modification et applicabilité conditionnelle (précisé par D-036)

Dans une famille encore modifiable, **Retour** ramène à la question logique précédente du parcours applicable (pas un simple `history.back()` navigateur). Lorsque cette question possède déjà une réponse active, elle est **systématiquement restaurée et affichée** — l'utilisateur peut la conserver ou la modifier. Depuis la première question d'une famille, Retour ramène à la micro-transition d'entrée de cette famille ; au-delà, « Voir mon parcours » permet de revenir à la vue globale des 7 familles. Une famille verrouillée (§D) reste consultable en lecture seule — ses réponses ne sont jamais restaurées pour modification.

Lorsqu'une réponse déjà active est modifiée puis validée, le moteur recalcule **immédiatement** l'applicabilité des questions suivantes (cohérent avec D-026, « toute modification amont réévalue les dépendances déterministes »).

- Si la modification fait apparaître une **nouvelle question applicable** : elle s'intègre naturellement dans le parcours à sa position logique, sans aucun message technique (« une nouvelle question a été déclenchée » est explicitement exclu). Elle doit être traitée avant que la famille puisse être considérée comme terminée (D-026).
- Si la modification rend une question précédemment répondue **non applicable** : elle disparaît naturellement du parcours utilisateur, sans aucun message technique. Sa réponse cesse de participer au dossier actif — le mécanisme déjà verrouillé DEVENUE_INACTIVE (`mpd_historique_evenements`, D-028 pt. 4) reste l'unique source technique de vérité, aucun comportement alternatif n'est introduit.
- Si cette question **redevient applicable ultérieurement**, son ancienne réponse n'est **jamais restaurée silencieusement** — l'utilisateur doit répondre ou confirmer activement à nouveau (D-029, « une nouvelle confirmation active de la personne est requise »).

**Principe UX général :** l'utilisateur ne voit que les questions pertinentes selon l'état actuel de ses réponses — la mécanique d'applicabilité reste entièrement invisible pour lui.

**Repositionnement après modification :** après modification et validation d'une ancienne réponse, le parcours reprend **vers l'avant, question par question, selon le nouvel état d'applicabilité** — il n'y a jamais de téléportation automatique vers la dernière question non répondue. Si une question suivante reste applicable et possède déjà une réponse, elle est affichée avec sa réponse restaurée (même règle que ci-dessus) ; si une question suivante n'est plus applicable, elle est sautée ; si une nouvelle conditionnelle s'est insérée, elle apparaît à sa position canonique et l'utilisateur doit y répondre.

*(Exemple illustratif, non normatif : Q15 → Retour Q14 → Retour Q13 → modification de Q13 → Continuer → la prochaine question logique applicable après Q13, pas directement Q15.)*

Granularité technique exacte de l'implémentation UI (composant, état client, écran hub, etc.) non engagée par cette décision — principe produit uniquement, même frontière que D-019/D-026 entre décision produit et implémentation technique. **Le modèle serveur de dérivation des familles et les gardes d'écriture (verrouillage, ordre strict d'une nouvelle réponse, modification rétroactive, garde après consommation) sont désormais implémentés et verrouillés par D-037** — aucun composant d'interface n'en découle encore.

**Mode de navigation distinct introduit par D-039 (2026-10-03) — ne contredit pas ce qui précède :** le Retour décrit ci-dessus concerne le **parcours linéaire initial** d'une famille pas encore Terminée (`/plan-b/parcours`). La **modification ciblée d'une famille déjà Terminée** (T7.8/T7.9, apparue après ce document) suit une règle distincte, propre à ce nouveau mode : Retour ramène **toujours** à la page de consultation de la famille (`/plan-b/famille/[etape]`) — jamais à une « question précédente », jamais un simple historique navigateur. Les deux règles coexistent, chacune dans son propre contexte de navigation. Détail complet : `DECISIONS.md` D-039.

## P. Ce qui n'est explicitement PAS décidé

Non verrouillés à ce stade, chantiers ultérieurs séparés : durées exactes des 7 étapes ; mécanisme technique exact de la progression visuelle interne ; design graphique final des cartes ; choix clair/sombre de Mon point de départ ; wording final de tous les écrans ; architecture technique finale de génération de Ma feuille de route ; mise en page finale du PDF ; couverture finale de Ma feuille de route ; **masquage des libellés `Qxx` dans l'interface utilisateur** (constaté visuellement incohérent lors de la validation réelle T7.10 — ex. Q23→Q27→Q24 — le canon n'est pas renuméroté, `stableId`/`ordre` inchangés, D-040 point 8).

---

## Prochaine étape officielle

**Matrice finale de couverture Q1-Q36 : close (D-022, 2026-09-25).** **Architecture conceptuelle de Ma feuille de route V3 : close (D-023, D-024, D-025, 2026-09-26 à 2026-09-28)** — pipeline exploration/filtrage, granularité voie/option, anatomie d'une voie à 7 blocs, mécanisme de convergence de preuve DÉCLARÉ→ÉTAYÉ, mécanisme de plausibilité et de présentation des voies (Cohérence/Compatibilité/Actionnabilité/Disponibilité), architecture documentaire finale à 7 sections. Détail canonique complet : `docs/project-memory/MA_FEUILLE_DE_ROUTE_V3.md`. **Mécanique déterministe de collecte (Mon point de départ, §D de ce document) : close (A7, D-026, 2026-09-28)** — frontière « adaptation déterministe pendant la collecte, IA après la collecte » précisée, P0/P1/P2/P3 et budget global de relances abandonnés, triggers de relance/branche/skip tous formalisés en syntaxe structurée, règles de réutilisation verrouillées. Détail canonique complet : `docs/project-memory/MON_POINT_DE_DEPART_V3_QUESTIONNAIRE.md`. **Contrat métier MPD V3 → MFR V3 : close (D-028, 2026-09-29)** — ce que MPD doit produire pour que MFR applique correctement D-023/D-024/D-025/D-027, indépendamment de toute architecture technique. Détail canonique complet : `docs/project-memory/DECISIONS.md` D-028. **Consolidation UX du parcours (Retour/restauration, modification et applicabilité conditionnelle, repositionnement, clôture MPD → déclenchement MFR) : close (D-036, 2026-10-02)** — précise D-019 sans le remplacer, suite à l'audit de réconciliation T7.x ayant confirmé que l'architecture UX de D-019 n'avait jamais été implémentée ni contredite. Contenus éditoriaux validés (7 descriptions de famille §B, 6 micro-transitions §I). Détail canonique complet : `docs/project-memory/DECISIONS.md` D-036, §B/§D/§I/§K/§L/§M/§Q de ce document. **Dérivation technique des états de famille et invariants serveur d'écriture séquentielle : close et implémenté (D-037, 2026-10-03)** — première implémentation technique engagée sur ce chantier UX (`getFamilyStates`, garde de séquentialité, garde après consommation), strictement serveur ; aucun écran/composant d'interface n'en découle encore. Détail canonique complet : `docs/project-memory/DECISIONS.md` D-037. **Hub MPD/MFR et navigation architecturale : close et implémenté (D-038, 2026-10-03)** — première implémentation visuelle du hub (§A), navigation à deux onglets Mon point de départ/Ma feuille de route, grille des 7 familles. Seule la structure UX fonctionnelle est verrouillée ; aucun détail esthétique n'est figé comme décision durable, une revue design globale restant explicitement différée. Détail canonique complet : `docs/project-memory/DECISIONS.md` D-038. **Consultation et modification ciblée d'une famille Terminée : close et validée par tests utilisateur réels (D-039, 2026-10-03)** — fusion de T7.8 (réouverture ciblée) et T7.9 (consultation lecture seule d'une famille verrouillée) sur un socle commun unique (§D/§Q de ce document), suite à un test utilisateur réel ayant révélé la faiblesse UX de la conception séquentielle initiale ; projection lecture seule des réponses corrigée après un second test utilisateur réel (métadonnées canoniques internes et marqueurs placeholder masqués par des règles génériques, jamais un mapping par question). Détail canonique complet : `docs/project-memory/DECISIONS.md` D-039. **Micro-transitions entre familles du parcours linéaire et Retour linéaire minimal : close et validés par test utilisateur réel (D-040, 2026-10-05)** — mécanisme entièrement dérivé de l'état serveur frais (§I de ce document), jamais une question/réponse/persistance/autorité ; Retour depuis la première question d'une famille vers sa micro-transition d'entrée, distinct du Retour de D-039 (famille déjà Terminée) ; validé sur les 4 frontières F3→F4, F4→F5, F5→F6, F6→F7. Point UX reporté (libellés `Qxx` visuellement incohérents, §P) — canon non renuméroté. Détail canonique complet : `docs/project-memory/DECISIONS.md` D-040. Aucune autre architecture technique ouverte à ce stade — voir `CURRENT_STATE.md` §8 pour le suivi vivant des reports techniques.
