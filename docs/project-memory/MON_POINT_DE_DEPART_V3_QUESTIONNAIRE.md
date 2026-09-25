---
name: mon-point-de-depart-v3-questionnaire
description: Source de vérité conceptuelle du questionnaire Mon point de départ V3 (Q1-Q36) — contenu, branches, relances, règles adaptatives. Transcrit fidèlement du handoff QG2, pas une spécification technique.
metadata:
  type: project-memory
---

# MON_POINT_DE_DEPART_V3_QUESTIONNAIRE — Source de vérité Q1-Q36

Dernière mise à jour : 2026-09-25 (conception de collecte CLOSE, D-022 — statuts finaux post-audit individuel + audit inverse global, deux micro-données ajoutées)

Ce document transcrit fidèlement le handoff QG2 (`HANDOFF_QG2_MON_POINT_DE_DEPART_V3.md`, transmis par le QG le 2026-09-23) sur le contenu détaillé du questionnaire Mon point de départ V3, **mis à jour avec les verdicts finaux de la matrice de couverture Q1-Q36** (audit individuel des 36 questions par étape, puis audit inverse global de couverture décisionnelle, clôturés et arbitrés le 2026-09-25, cf. DECISIONS D-022). **Aucune information n'a été comblée par supposition** — les points encore ouverts sont explicitement notés comme tels.

**La matrice finale de couverture Q1-Q36 est CLOSE (D-022, 2026-09-25).** Chaque question a reçu un verdict final (CONSERVER / CONSERVER MAIS À AJUSTER), aucune suppression n'a résulté de l'audit. **Sauf mention contraire explicite ci-dessous, le statut par défaut de chaque question est CONSERVER** — les points encore ouverts (mécanismes techniques, formulations UX finales) sont listés explicitement en §3 et ne remettent pas en cause la conservation de la question elle-même. **Aucun ajout futur de question « au cas où » n'est autorisé** : toute modification future devra être justifiée par un besoin décisionnel démontré.

**Relation avec `MON_POINT_DE_DEPART_V3.md`** : ce fichier-ci documente le *contenu* (Q1-Q36, branches, relances, règles de collecte). `MON_POINT_DE_DEPART_V3.md` documente l'*architecture UX* (hub, états d'étape, navigation, micro-transitions, Ma feuille de route). Les deux se référencent mutuellement, sans dupliquer.

---

## 0. Architecture générale

**Chaîne produit :** Plan B Rentable → Mon point de départ → Ma feuille de route.

**Les 7 étapes utilisateur, ordre validé** (identique à `MON_POINT_DE_DEPART_V3.md` §B) :
1. Ta situation aujourd'hui
2. Ce que tu veux changer
3. Ton parcours
4. Ce que tu as déjà en main
5. Ta façon d'avancer
6. Ce qui est possible pour toi aujourd'hui
7. Ce que tu observes autour de toi

**Les 7 dimensions internes** (VALIDÉ, §23 du handoff) — à ne pas confondre avec l'ordre UX ci-dessus, c'est un regroupement analytique distinct, pas une 8e famille ni un désaccord :
1. Situation réelle
2. Parcours & expériences
3. Compétences & ressources
4. Aspirations & WHY
5. Fonctionnement face à l'action
6. Contraintes & faisabilité
7. Environnement observé / contexte terrain

Correspondance de contenu avec les étapes UX (note de lecture, pas une donnée du handoff) : Étape 1↔dimension 1, Étape 2↔dimension 4, Étape 3↔dimension 2, Étape 4↔dimension 3, Étape 5↔dimension 5, Étape 6↔dimension 6, Étape 7↔dimension 7. Le **potentiel latent** reste transversal aux 7, pas une famille séparée.

**Principe temporel (VALIDÉ) :** « L'objectif donne la direction. La situation actuelle détermine le point de départ. Les preuves déterminent la prochaine étape. Le terrain permet d'adapter la suite du chemin. » — « CoachRedo part de ce qui est possible aujourd'hui pour construire un chemin réaliste vers ce que la personne veut atteindre demain. » Ma feuille de route distingue : MAINTENANT → PROCHAINE ÉTAPE → MOYEN TERME → DIRECTION LONG TERME (court terme concret, moyen terme conditionnel, long terme = direction jamais une promesse).

**Architecture de collecte adaptative (VALIDÉE) :**
```
SOCLE COMMUN → BRANCHES CONDITIONNELLES PRÉDÉFINIES → RELANCE PRÉDÉFINIE SI NÉCESSAIRE → INCONNU ACCEPTÉ → FIN → ANALYSE IA
```
Aucune question générée librement par IA pendant la collecte. Exemples d'adaptation déterministe : Oui→branche A ; Non→skip ; urgence financière→horizon ; problème concret→Q36 ; plusieurs objectifs sans priorité→Q7. Coût IA pendant la collecte : « pratiquement nul ».

**Frontière IA (VALIDÉE) :** « Adaptation déterministe pendant la collecte. IA après la collecte. » Après la collecte : extraction structurée → croisements → contradictions → capacités possibles → inconnus → voies possibles → critique → priorisation → route → rédaction → QA → validation humaine initiale. L'IA ne doit pas inventer ce que la personne n'a pas dit. Une évolution future pourrait utiliser des **checkpoints IA** pour sélectionner parmi des questions déjà validées, mais **pas en V1**.

**Limite V1 sur l'adaptation sémantique (VALIDÉE, §18) :** un skip du type « cette réponse libre à Q23 couvre déjà Q25 » nécessite une compréhension sémantique que le système ne peut pas garantir sans IA en direct. Règle : **skip sémantique uniquement si des signaux structurés déterministes permettent la décision** ; sinon, accepter une petite redondance plutôt qu'une architecture opaque. S'applique explicitement au skip Q23/Q24→Q25.

**Charge cognitive et ordre (VALIDÉ, §19)** — courbe recherchée : 🟢 Situation → 🟠 Objectif → 🔴 Parcours → 🟢 Ressources → 🔴 Action → 🟢 Faisabilité → 🟠 Environnement. Seul changement d'ordre interne significatif : l'étape 5 (voir §5 ci-dessous).

---

## 1. Règles transversales de collecte

### P0 / P1 / P2 / P3 (VALIDÉ CONCEPTUELLEMENT)

Ce ne sont **jamais des notes attribuées à la personne** — uniquement la couverture d'une information nécessaire.

- **P0** — information suffisamment obtenue → continuer.
- **P1** — information exploitable mais améliorable → **continuer sans relance par défaut**. Le handoff note explicitement : « C'est une évolution importante de notre définition précédente. »
- **P2** — information importante insuffisante, susceptible de modifier une voie/contrainte/recommandation/étape → une relance prédéfinie **si le budget de friction le permet**.
- **P3** — information essentielle insuffisante (une conclusion importante pourrait être peu fiable sans elle) → une relance prédéfinie prioritaire. Ne donne jamais droit à une interrogation sans fin.
- Après relance insuffisante (P2 ou P3) → **INCONNU → continuer.**

**⚠️ Point à signaler, pas résolu silencieusement :** la mémoire `CURRENT_STATE.md` documentait jusqu'ici (avant cette synchronisation) une définition antérieure de P1 : « amélioration secondaire possible, relance seulement si le contexte la rend utile ». Le handoff QG2 indique explicitement que cette définition a évolué vers « continuer sans relance par défaut ». Cette synchronisation retient la définition **la plus récente** (celle ci-dessus, confirmée à la fois par le handoff et par le message QG transmettant cette mission), et retire l'ancienne formulation de `CURRENT_STATE.md` plutôt que de la laisser divergente — ce n'est pas une décision prise de ma propre initiative : c'est l'application directe de ce que le handoff et le QG ont déjà tranché.

### Maximum une relance principale (VALIDÉ, règle absolue V1)

Question → réponse insuffisante → une relance prédéfinie → encore insuffisant → **INCONNU → suite.** Pas de chaîne (« pourquoi ? → exemple ? → précise → pourquoi encore ? » est explicitement exclu).

### Budget global de relances — **HYPOTHÈSE V1 À TESTER**

Recommandation de travail après simulation : **5 relances principales maximum pour V1.** Priorité : P3 avant P2. P1 n'utilise normalement aucun budget.

**Statut exact (à ne jamais présenter comme verrouillé) :** HYPOTHÈSE V1 À TESTER, pas une vérité méthodologique définitive — à valider par les vrais usages.

**Exception envisagée, non arbitrée :** `critical_for_route = true`, pour éviter qu'une information absolument indispensable soit abandonnée uniquement parce que les 5 relances sont déjà consommées. **À ARBITRER.**

### INCONNU (VALIDÉ)

Sortie normale du système, pas un échec. Doctrine : « Quand CoachRedo ne sait pas, il questionne. Quand il ne peut pas encore savoir, il propose un test. Il n'invente jamais. » Une absence d'information peut devenir une partie de la feuille de route (« ce que nous devons encore vérifier »). Exemples : aucun problème observé→observation terrain ; capacité incertaine→test ; direction inconnue→exploration ; solution actuelle inconnue→conversation terrain. **INCONNU est un état de donnée, jamais un état UX d'étape** (cohérent avec `MON_POINT_DE_DEPART_V3.md` §E).

### Réutilisation des données déjà obtenues (VALIDÉ)

« CoachRedo ne redemande pas à la personne une information qu'elle lui a déjà suffisamment donnée. » L'adaptation peut : réutiliser, rappeler, préremplir, croiser, éviter une répétition. Exemples travaillés (pas des règles génériques, des cas illustratifs) :
- si Q11 contient déjà une longue expérience en restauration, Q33 pourrait rappeler cette information et ne demander que les environnements **additionnels** ;
- Q14 et Q24 peuvent éventuellement exploiter un même épisode si les données nécessaires sont déjà disponibles.

Ne pas supposer qu'une IA sémantique en temps réel réalise cette tâche en V1 (cf. limite §18 ci-dessus).

### Règle des aides et exemples (VALIDÉE)

Pour chaque question : « AIDE/EXEMPLES → nécessaires ? → lesquels ? → risque d'influencer ? » Trois cas : (1) exemples utiles si le concept risque d'être mal compris ; (2) explication sans exemple si des exemples risqueraient de souffler la réponse ; (3) aucune aide si la question est déjà claire. Principe : « Si l'utilisateur risque de ne pas comprendre ce que nous cherchons, on l'aide. Si l'aide risque de lui souffler ce qu'il devrait répondre, on la retire ou on la reporte. » Quand utiles : environ 3-5 exemples simples et diversifiés maximum.

### Discipline de preuve (VALIDÉE — terminologie canonique unifiée)

Pour Mon point de départ V3 : **DÉCLARÉ / ÉTAYÉ / INFÉRÉ / CONTRADICTOIRE / INCONNU**. ÉTAYÉ nécessite des éléments convergents — une anecdote unique ne prouve pas une capacité générale. Séparer faits / observations / interprétations / hypothèses. Pas de pseudo-diagnostic psychologique, pas de personnalité déduite de quelques réponses. VAK/PNL uniquement comme éventuels indices linguistiques secondaires, jamais comme profil scientifique.

**Confirmation d'unification (cf. point 13 de la mission) :** le QG tranche explicitement que `SELF-DECLARED/EVIDENCE-BASED/INFERRED/CONTRADICTOIRE/INCONNU` (formulation précédemment documentée dans `CURRENT_STATE.md`) et `DÉCLARÉ/ÉTAYÉ/INFÉRÉ/CONTRADICTOIRE/INCONNU` (ci-dessus) sont **le même cadre conceptuel** — la seconde devient la terminologie canonique pour V3, la première est l'ancienne formulation/équivalence historique. Ceci ne modifie pas le cadre conversationnel volontairement distinct de la doctrine coaching humain (`COACHING_DOCTRINE.md` §3 : DÉCLARÉ/OBSERVATION/HYPOTHÈSE/INCONNU, 4 états, contexte différent).

### ÉTAT ACTUEL ≠ LIMITE PERMANENTE (VERROUILLÉ, D-022, 2026-09-25)

Toute donnée de Mon point de départ décrit la situation connue au moment de la collecte. Elle sert à calibrer ce qui est réaliste **maintenant**, sans être projetée automatiquement par Ma feuille de route comme une limite à moyen ou long terme. Une contrainte, préférence ou condition n'est considérée comme durable que si les données permettent réellement de le soutenir — sinon, son évolution future reste ouverte (INCONNU, pas une négation). Toute voie utilisée comme étape — emploi, mission, apprentissage, petit service, stabilisation ou autre — doit être présentée comme une étape lorsqu'elle l'est, reliée à la direction recherchée (Étape 2), et non substituée silencieusement à l'objectif de la personne.

Généralise deux doctrines déjà verrouillées isolément : les trois règles Q29 (urgence économique, voir Étape 6) et la séparation Q18 (niveau de preuve d'une capacité / mobilisabilité actuelle, voir Étape 4) — désormais des cas particuliers de cette règle unique.

**Nuance verrouillée pour Q31** : la condition indispensable doit être respectée **maintenant** (doctrine Q8/Q31 inchangée, aucune obligation immédiate affaiblie) ; seule sa **permanence future** ne doit pas être présumée sans données. Deux choses distinctes, non contradictoires.

Cas couverts explicitement (vérifiés sans contradiction lors de l'audit de clôture) : temps disponible (Q3/Q4), mobilisabilité d'une capacité (Q18), budget de test (Q28), mobilité réelle (Q30), condition indispensable (Q31, avec la nuance ci-dessus), ouverture au changement (Q32), et toute voie de stabilisation présentée comme étape.

### Classification des questions — logique d'apparition UX (VERROUILLÉ, D-022, 2026-09-25)

Trois états d'apparition exclusivement, sans hiérarchie d'importance automatique attachée (une question conditionnelle ou de récupération peut être déterminante dans un parcours et inutile dans un autre) :
- **SOCLE** = question normalement présentée dans le parcours.
- **CONDITIONNELLE** = apparaît lorsqu'une condition explicite du parcours est remplie.
- **RÉCUPÉRATION** = apparaît seulement lorsque les questions précédentes n'ont pas suffisamment couvert une dimension.

« Contextualisation » (une question qui qualifie/enrichit une donnée déjà obtenue sous un angle particulier, ex. Q14 et Q24) reste un **descripteur analytique secondaire** possible, **jamais un quatrième état d'apparition** — ne pas mélanger fonction analytique et logique UX d'apparition.

### Johari (VALIDÉ comme mécanisme interne)

Zone connue = la personne sait + éléments disponibles. Zone aveugle = elle ne revendique pas quelque chose mais plusieurs expériences convergent. Zone cachée = elle connaît quelque chose mais ne l'utilise/valorise pas. Potentiel latent = hypothèse uniquement, jamais présenté comme découvert (« CoachRedo a découvert ton talent caché » est explicitement exclu). Pour le latent : hypothèse → test → terrain → données réelles.

### Voies / Options / Route (VALIDÉ)

- **VOIE** : stratégie générale (emploi, mission, service, activité complémentaire, apprentissage préalable, entrepreneuriat, combinaison).
- **OPTION** : possibilité concrète dans une voie.
- **ROUTE** : séquence d'étapes entre situation actuelle et objectif.

Architecture : OBJECTIF → SITUATION/CONTRAINTES → VOIES PLAUSIBLES → OPTIONS → DÉCISION UTILISATEUR → ROUTE → TESTS → ADAPTATION. CoachRedo ne force pas un nombre fixe de solutions (peut en présenter 1, 2, 3 ou plus si réellement plausibles).

### Principe d'action et de risque (VALIDÉ)

CoachRedo ne cherche pas à faire lancer un business à tout prix. Une route peut commencer par : emploi, mission rémunérée, petit service, apprentissage ciblé, activité complémentaire, exploration, test entrepreneurial, combinaison. Principe : « CoachRedo privilégie d'abord les actions réversibles et les tests à risque maîtrisé tant que le terrain n'apporte pas suffisamment de preuves pour justifier un engagement plus important. »

### Pas de Q37 (DÉCISION VALIDÉE)

Refus explicite d'ajouter des questions demandant à la personne d'estimer : fréquence exacte, importance supposée pour les autres, volonté de payer, prix, concurrents, taille du marché. Frontière : « Mon point de départ = ce que la personne sait réellement. CoachRedo = ce que le système peut rechercher/analyser. Terrain = ce que les personnes concernées peuvent réellement nous apprendre. »

### Mesure de longueur (VALIDÉ CONCEPTUELLEMENT)

Ne pas mesurer seulement le nombre de Q — mesurer aussi : nombre d'écrans, nombre d'interactions, questions profondes, nombre de relances, temps réel. Une question (ex. Q17, Q24) peut contenir plusieurs champs sous un seul numéro.

### Durée / nombre de questions — HYPOTHÈSES, PAS MÉTRIQUES VALIDÉES

Refus explicite d'un objectif arbitraire type « 20-30 questions maximum ». Critère retenu : couverture décisionnelle suffisante avec le minimum raisonnable de friction. Simulation conceptuelle réalisée (⚠️ **chiffres non validés produit, à mesurer sur vrais testeurs**) :

| Profil | Parcours estimé (interactions) | Relances | Temps hypothétique |
|---|---|---|---|
| Précis | ~31-33 | 0-2 | ~12-18 min |
| Moyen | ~33-36 | 3-5 | ~16-24 min |
| Vague | ~32-35 | ≤5 (prioritaires) | ~15-22 min |

Un utilisateur vague ne doit pas être puni par le parcours le plus long. Cohérent avec D-019 : pas de nombre affiché dans l'UX, durée par étape en fourchette prudente, calibration réelle encore à faire.

### Micro-transitions — exemples de travail (formulations non figées)

Pas de nouvelles questions. Exemples travaillés, non définitifs : après *Ton parcours* → « Merci. Maintenant, regardons ce que tu peux réellement mobiliser aujourd'hui. » ; après *Ta façon d'avancer* → « Nous allons maintenant revenir à quelque chose de très concret : ce qui est possible pour toi aujourd'hui. » ; avant l'étape 7 → « Dernière étape : regardons maintenant ce que tu connais déjà autour de toi. » But : éviter l'impression de formulaire administratif. **Formulations finales non figées.**

---

## 2. Q1-Q36 — Contenu détaillé par étape

**Matrice de couverture close (D-022, 2026-09-25).** Sauf mention contraire explicite dans le verdict d'une question, statut par défaut = **CONSERVER** (voir note en tête de document).

### Étape 1 — Ta situation aujourd'hui

**Q1 — Situation principale**
- Formulation : « Quelle est ta situation principale aujourd'hui ? »
- Choix : Salarié(e) / À mon compte / indépendant(e) / Étudiant(e) / En recherche d'emploi / Sans activité professionnelle actuellement / Retraité(e) / Autre
- Aide : aucune (les choix suffisent)
- Objectif : contexte professionnel principal
- **Statut : CONSERVER (VALIDÉ, D-022).** Le point autrefois « à arbitrer » (distinguer entrepreneur existant et indépendant/freelance) est résolu **différemment** de l'ajout d'une catégorie à Q1 : voir la branche « activité existante » ci-dessous, rattachée à Q1 mais non fusionnée avec elle.

**Branche « activité existante », rattachée à Q1 — AJOUTÉE (VALIDÉ QG, D-022, 2026-09-24).** Q1 reste centrée sur la situation principale et n'absorbe pas le cumul. Question courte commune à tous les profils (salarié, étudiant, recherche d'emploi, retraité, etc.), posée juste après Q1 :
- Formulation : « En parallèle de ta situation principale, as-tu déjà une activité, un service ou un petit business que tu développes ou qui te rapporte parfois de l'argent ? » — Oui / Non.
- Si Oui, branche courte : (1) « En une phrase, de quoi s'agit-il ? » (texte libre) ; (2) « Où en est cette activité aujourd'hui ? » — *Je viens juste de commencer* / *Je suis en train de la tester* / *Elle fonctionne déjà, même modestement* / *Elle est déjà bien installée*.
- Aucune relance sur le champ 1 (validé, pas un point ouvert par défaut).
- Objectif décisionnel : distinguer une personne qui part réellement de zéro d'une personne qui possède déjà quelque chose pouvant être consolidé, développé, testé différemment ou pivoté.
- Aucune conclusion de viabilité, de marché, ou de compétence entrepreneuriale généralisée à partir de cette réponse.
- Chevauchement possible avec Q16 (valeur déjà apportée) dans le sous-cas où l'activité est déjà « fonctionne déjà »/« bien installée » — traité par réutilisation/rappel UX, pas par un skip sémantique (mécanisme exact non spécifié, reste ouvert).
- Fonction d'apparition : SOCLE pour la question Oui/Non ; CONDITIONNELLE pour le détail (si Oui).

**Micro-donnée « territoire principal », rattachée à l'Étape 1 — AJOUTÉE (VALIDÉ QG, D-022, 2026-09-25).** Après Q1 et sa branche activité existante :
- Formulation : « Depuis quel pays ou territoire envisages-tu principalement de développer ton Plan B aujourd'hui ? » — pays/territoire sélectionnable + Autre / Je ne sais pas encore.
- Doctrine : ce n'est pas la nationalité ; ce n'est pas nécessairement le pays administratif de résidence ; c'est le territoire principal pertinent pour l'action envisagée aujourd'hui. Aucune adresse, aucune géolocalisation IP, aucune ville obligatoire dans MPD — une précision géographique supplémentaire pourra être demandée ultérieurement uniquement si une recherche/un test concret l'exige.
- Soumise à ÉTAT ACTUEL ≠ LIMITE PERMANENTE (le territoire déclaré n'est pas présumé définitif).
- Ajoutée après audit factuel du repo (lecture seule, 2026-09-24) confirmant qu'aucune donnée géographique exploitable n'existe actuellement dans le produit : `profiles.country` (`supabase/migrations/001_schema.sql:13`) existe en base mais est une colonne dormante, jamais peuplée ni utilisée nulle part dans `src/`.
- Fonction d'apparition : SOCLE.

**Q2 — Occupations importantes**
- Formulation : « En dehors de ton activité principale, qu'est-ce qui prend régulièrement une partie importante de ton temps ? »
- Choix : enfants / responsabilités familiales / maison-tâches du quotidien / études-formation / autre travail-activité / association-communauté / autre / rien de particulier
- Objectif : comprendre les autres charges de temps
- Limite d'interprétation : ne pas déduire automatiquement leur impact réel sur la disponibilité

**Q3 — Temps réellement disponible**
- Formulation : « Dans une semaine normale, combien de temps peux-tu réellement consacrer à ton Plan B ? »
- Choix : moins de 2h / 2-4h / 5-9h / 10-20h / plus de 20h / cela varie / je ne sais pas
- Micro-question associée : « À quels moments peux-tu généralement consacrer ce temps à ton Plan B ? » — un peu chaque jour / soirs de semaine / week-end / blocs de temps plus longs / cela varie / autre
- Objectif : quantité + structure réelle du temps disponible (principe : 5h fragmentées ≠ 5h en bloc, routes différentes)
- Aide : aucun exemple nécessaire

**Q4 — Réalité récente du temps**
- Formulation : « Pense à la semaine dernière. Qu'est-ce qui a pris le plus de ton temps ? » (jusqu'à 3 parmi : travail/activité pro, études/formation, enfants/famille, maison/tâches, déplacements, projet/activité personnelle, loisirs/sorties, repos, autre)
- Question associée : « Cette semaine ressemblait-elle à une semaine habituelle pour toi ? » — Oui plutôt / Non elle était exceptionnelle / Ça varie beaucoup
- Relance conditionnelle si tension Q3/Q4 : « Tu as indiqué pouvoir consacrer environ [X] heures par semaine à ton Plan B. Avec ton organisation actuelle, à quels moments pourrais-tu réellement trouver ce temps ? »
- Limite d'interprétation : un épisode d'une semaine = observation récente déclarée, **pas une preuve forte** d'une habitude générale
- **Statut : VALIDÉ** — ancienne Q4-B (« Comment décrirais-tu cette semaine ? ») supprimée.

**Q5 — Pourquoi maintenant**
- Formulation : « Pourquoi cherches-tu à construire un Plan B maintenant ? »
- Aide (sans exemple) : « Qu'est-ce qui, dans ta situation actuelle, t'a donné envie ou besoin de commencer à chercher une autre voie ? »
- Type : réponse libre
- Relance conditionnelle si événement/délai concret nécessitant précision : « À partir de quand cette situation risque-t-elle de devenir un vrai problème pour toi ? »
- Objectif : déclencheur / WHY NOW. Ne pas confondre avec Q29 (pression économique).

### Étape 2 — Ce que tu veux changer

**Q6 — Changement recherché**
- Formulation : « Si ton Plan B commençait vraiment à fonctionner, qu'aimerais-tu qu'il change concrètement dans ta vie ? »
- Aide (sans exemple) : « Pense à ce que tu aimerais voir réellement changer dans ta situation ou dans ta vie. »
- Relance si réponse vague : « Qu'est-ce qui serait concrètement différent dans ta vie si les choses allaient mieux ? »
- Relance si réponse uniquement financière : « Si tu gagnais davantage grâce à ton Plan B, qu'est-ce que cela te permettrait concrètement de changer dans ta vie ? »
- Objectif : destination/changement recherché. Règle : une motivation financière est légitime — ne pas chercher artificiellement une motivation « plus profonde ».
- **Branche moyen/long terme, non numérotée — CONSERVER MAIS À AJUSTER (VALIDÉ QG avec justification corrigée, D-022).** Sa nécessité décisionnelle n'est **pas** d'éviter qu'une section de Ma feuille de route reste vide : elle est de **distinguer un objectif immédiat qui constitue la destination elle-même d'un objectif immédiat qui n'est qu'une première marche vers une direction plus lointaine.** Si Q6 ne donne qu'un objectif immédiat sans direction plus lointaine identifiable : « Et plus tard, si ce premier changement devient possible, vers quoi aimerais-tu que cela t'emmène ? » — réponse libre, INCONNU accepté, pas de seconde relance. **SKIP si Q6 contient déjà la trajectoire.** Mécanisme déterministe exact du skip : **toujours À ARBITRER** (pas de décision IA live).

**Q7 — Priorité**
- **Conditionnelle** : seulement si Q6 contient plusieurs changements sans hiérarchie.
- Formulation : « Parmi les changements que tu viens de citer, lequel compte le plus pour toi aujourd'hui ? »
- Aide : aucune. Si techniquement possible, réafficher les propres éléments de la personne plutôt que d'en proposer de nouveaux.

**WHY conditionnel (non numéroté)**
- **Condition d'apparition** : si Q6/Q7 disent quoi, mais pas pourquoi.
- Formulation : « Pourquoi ce changement est-il important pour toi ? »
- **SKIP** si le WHY est déjà suffisamment explicite.

**Q8 — Ce qu'il faut préserver**
- Formulation : « Pendant que tu construis ton Plan B, qu'est-ce qui est important pour toi de garder dans ta vie actuelle ? »
- Aide : « Par exemple : du temps pour ta famille, ton revenu actuel, tes études, ta santé, une certaine stabilité ou autre chose d'important pour toi. »
- Type : réponse libre + « rien de particulier » possible
- Objectif : valeurs/préférences de vie à préserver. **Q8 = important à préserver, pas une contrainte absolue** (distinction explicite avec Q31).

**Q9 — Signe de progression**
- Formulation : « Qu'est-ce qui te montrerait concrètement que ton Plan B commence à avancer ? »
- Aide (sans exemple) : « Pense à quelque chose que tu pourrais réellement constater. »
- Relance si vague : « Qu'est-ce que tu pourrais voir ou constater qui te ferait dire : "oui, j'avance vraiment" ? »
- Limite : pas d'exemples spécifiques (pour ne pas fabriquer le critère de réussite de la personne). Ce n'est pas automatiquement un objectif contractuel imposé par CoachRedo.

### Étape 3 — Ton parcours

**Q10 — Réussites / expériences significatives — CONSERVER MAIS À AJUSTER (VALIDÉ QG, D-022)**
- Formulation : « Dans ton parcours, quelles sont les choses que tu es content(e) d'avoir réussi à faire ? »
- Aide : « Cela peut être quelque chose que tu as réalisé, appris, amélioré ou aidé à résoudre, dans ton travail, tes études, ta famille, une activité ou ta vie quotidienne. »
- Type : jusqu'à 3 + « aucune »
- **Relance corrigée : une seule relance maximale, pas une par réussite.** Formulation : « Parmi ces réussites, choisis celle qui représente le mieux ce que tu sais apporter. Qu'as-tu fait toi-même pour que cela fonctionne ? » Les réussites non retenues par cette relance restent des données de contexte/capacités candidates — elles n'ont pas besoin d'être chacune individuellement transformées en preuve exploitable.
- Objectif interne : CONTEXTE → ACTION PERSONNELLE → RÉSULTAT → APPRENTISSAGE → CAPACITÉ POSSIBLE → RÉCENCE → ENVIE DE RÉUTILISER — **mais pas sept questions UX séparées** (un seul numéro Q porte cette collecte).

**Q11 — Origine des apprentissages**
- Formulation : « Comment as-tu appris la plupart des choses que tu sais faire aujourd'hui ? »
- Type : multi-sélection — école/études, formation professionnelle/technique, apprentissage d'un métier, travail, activité familiale, autodidacte, formations en ligne, autre, je débute/j'ai encore peu d'expérience
- Branches travaillées : études → niveau + domaine (études incomplètes autorisées) ; formation/métier → domaine ; travail → domaines + durée approximative (max 3) ; activité familiale → activité + rôle ; autodidacte → ce qui a été appris ; online → formations/certifications importantes
- Objectif : provenance des apprentissages/expériences. Limite : ne jamais déduire automatiquement une maîtrise d'un diplôme ou du nombre d'années.
- Réutilisation notée : peut alimenter Q33 (cf. §1, exemple restauration).

**Q12 — Reconnaissance extérieure**
- Formulation : « Pour quelles choses les autres viennent-ils souvent te demander de l'aide, un conseil ou un avis ? »
- Aide : « Cela peut concerner le travail, les études, une activité pratique, l'organisation, la technologie, les démarches du quotidien ou autre chose. Même si cela te paraît simple ou naturel. »
- Type : jusqu'à 3 ; options « personne ne me demande particulièrement » / « je ne sais pas »
- Relance si vague : « Concrètement, qu'est-ce qu'on te demande d'aider à faire ou à résoudre ? »
- Objectif : trace déclarée de reconnaissance externe. Limite : ni preuve de compétence, ni preuve de valeur marchande.

**Q13 — Question de récupération**
- **CONDITIONNELLE / RÉCUPÉRATION** : seulement si Q10-Q12 donnent peu de matière sur les capacités.
- Formulation : « Y a-t-il quelque chose que tu trouves assez facile à faire alors que d'autres personnes autour de toi trouvent cela plus difficile ? »
- Aide : contextuelle seulement (travail/études/pratique/quotidien), pas d'exemples de capacités
- Choix : Oui (→ quoi ?) / Non / Je ne sais pas
- Objectif : récupérer une capacité potentiellement sous-estimée. Limite : déclaration comparative seulement, **pas une preuve**.

**Q14 — Apprentissage issu d'une difficulté**
- Formulation : « As-tu déjà vécu une situation difficile ou exigeante qui t'a appris quelque chose d'utile pour la suite ? »
- Choix : Oui / Non / Je ne sais pas / Je préfère ne pas répondre
- Si oui : « Qu'est-ce que cette expérience t'a appris à faire ou à mieux gérer ? » — Aide : « pas besoin de raconter une histoire privée ; seulement ce qui a été appris. »
- Relance si réponse abstraite : « Concrètement, qu'est-ce que tu fais différemment aujourd'hui grâce à ce que tu as appris ? »
- Limite stricte : pas de trauma mining, pas de diagnostic, pas d'étiquette « résilience ».
- Réutilisation possible avec Q24 si même épisode (cf. §1).

**Q15 — Stratégie d'apprentissage — CONSERVER MAIS À AJUSTER (VALIDÉ QG avec correction de la logique de déclenchement, D-022)**
- **RÉCUPÉRATION** : le déclencheur **ne dépend pas de Q11** (Q11 = provenance/canal des apprentissages, nature de donnée incompatible pour tester une suffisance). Le vrai déclencheur : Q10–Q14 ont-ils déjà fourni un épisode suffisamment concret montrant comment la personne s'est réellement débrouillée pour apprendre quelque chose qu'elle ne savait pas faire ? Si oui → skip. Si non → Q15 apparaît, sur une seule situation. Traduction en règle déterministe structurée : **toujours à spécifier ultérieurement**, pas de décision IA live.
- Formulation : « Pense à une fois où tu as dû apprendre quelque chose d'important que tu ne savais pas faire au départ. Comment t'y es-tu pris ? »
- Aide : volontairement aucune
- Relance si vague : « Concrètement, qu'as-tu fait pour apprendre ? »
- Limite : un épisode ≠ style psychologique général. **Aucun typage VAK.**

**Q16 — Valeur déjà apportée — CONSERVER MAIS À AJUSTER (VALIDÉ QG avec correction du niveau de preuve, D-022)**
- Formulation : « As-tu déjà utilisé ce que tu sais faire pour rendre un service, aider quelqu'un à obtenir un résultat ou vendre quelque chose ? »
- Aide : « Cela peut avoir été payé ou non. »
- Choix : Oui / Non / Je ne sais pas
- Si oui : « Donne-nous un exemple : qu'as-tu fait, pour qui, et qu'est-ce qui s'est passé ? » (pas de noms nécessaires)
- Relance si trace de valeur externe absente : « Est-ce que cette personne t'a payé, donné quelque chose en échange, recommandé à quelqu'un ou demandé de recommencer ? »
- Objectif : trace d'une valeur déjà créée pour quelqu'un. Limite : **pas une validation de marché**.
- **Niveau de preuve corrigé (verrouillé) :** DÉCLARÉ dans tous les cas, **y compris lorsqu'un paiement, une recommandation, une répétition ou une action d'un tiers est rapporté(e) par la personne** — cela reste une trace externe déclarée particulièrement informative, mais **pas une corroboration indépendante**. Le passage éventuel vers ÉTAYÉ appartient exclusivement à l'analyse post-collecte par convergence avec d'autres signaux indépendants (ex. Q12), jamais à Q16 seule. Dans tous les cas : **capacité ÉTAYÉE ≠ marché validé**.
- **Distinction avec la branche activité existante (Q1) — verrouillée :** Q1 = qu'est-ce qui existe actuellement et à quel stade déclaré ? Q16 = existe-t-il une expérience concrète où une capacité a déjà produit de la valeur pour quelqu'un ? **Q16 conservée même lorsqu'une activité existante est déclarée en Q1** — les deux répondent à des questions différentes. Chevauchement possible dans le sous-cas d'une activité déjà « fonctionne déjà »/« bien installée » : traité par réutilisation/rappel des données déjà connues dans l'UX, **pas un skip sémantique complexe** — mécanisme exact non spécifié, reste ouvert.

**Q17 — Ce qu'on veut réutiliser / éviter**
- Deux champs sous une même question/écran :
  1. « Dans ce que tu sais déjà faire, qu'aimerais-tu utiliser encore dans la suite ? » (+ « aucun »)
  2. « Et y a-t-il des choses que tu sais faire mais que tu préférerais éviter dans la suite ? » (+ « aucun »)
- Aide : volontairement aucune
- Objectif : distinguer capacité existante et volonté de la réutiliser. Principe : compétence forte + refus de réutiliser ≠ recommander automatiquement le même métier — transfert possible des capacités sous-jacentes si étayées.

### Étape 4 — Ce que tu as déjà en main

**Q18 — Capacités actuelles — CONSERVER (VALIDÉ QG avec correction doctrinale, D-022)**
- Formulation : « Aujourd'hui, qu'est-ce que tu sais réellement faire par toi-même ? »
- Aide : « Pense à ce que tu sais faire au travail, dans tes études, dans une activité, un métier ou dans la vie quotidienne. Pas besoin d'être expert(e). »
- Type : jusqu'à 5 + « aucune »
- Pour chaque élément, sous-question : « Aujourd'hui, tu pourrais encore le faire : » — Oui facilement / Oui avec une petite remise à niveau / Non je devrais beaucoup réapprendre / Je ne sais pas
- Limite : pas de score débutant/intermédiaire/expert. Catégories internes : disponible maintenant / réactivable / à réapprendre / inconnu.
- **Doctrine verrouillée — deux dimensions strictement distinctes, jamais fusionnées :** (A) le niveau de preuve de l'existence d'une capacité (alimenté par Q10–Q17 et leur future convergence DÉCLARÉ→ÉTAYÉ) et (B) la mobilisabilité actuelle déclarée (ce que Q18 mesure uniquement). Une capacité peut être ÉTAYÉE + facilement mobilisable ; ÉTAYÉE + nécessitant beaucoup de réapprentissage ; DÉCLARÉE + facilement mobilisable ; ou DÉCLARÉE + mobilisabilité inconnue — les quatre combinaisons sont légitimes. Une tension entre Q18 et une donnée historique (ex. Q10) n'est pas automatiquement CONTRADICTOIRE : elle peut refléter une évolution temporelle normale. Q18 ne participe jamais à la convergence DÉCLARÉ→ÉTAYÉ.

**Q19 — Moyens matériels**
- Formulation : « Parmi ces moyens, lesquels pourrais-tu réellement utiliser pour construire ton Plan B ? »
- Choix : smartphone, ordinateur, connexion Internet suffisamment fiable, transport, endroit pour travailler, espace permettant de recevoir des personnes si nécessaire, matériel lié à une activité/métier, autre, aucun
- Si matériel : préciser lequel
- Objectif : ressources matérielles mobilisables. Principe : absence de ressource ≠ élimination automatique d'une voie — chercher d'abord un test adapté aux moyens disponibles.
- Distinction : Q19 = moyen de transport disponible (≠ Q30 = rayon de mobilité réel).

**Q20 — Autonomie numérique**
- Formulation : « Avec un smartphone ou un ordinateur, qu'est-ce que tu sais faire seul(e) aujourd'hui ? »
- Aide : « Choisis seulement ce que tu peux faire sans avoir besoin qu'on te guide à chaque étape. »
- Actions : rechercher sur Internet, messages/photos/documents, e-mail, formulaires/démarches en ligne, documents simples, tableur basique, visuel/présentation, publication réseaux sociaux, gestion d'un compte social professionnel, appel vidéo, acheter/vendre/recevoir une commande en ligne, paiement numérique, outils IA pour rechercher/écrire/créer/travailler, autre, peu de choses seul(e)
- Objectif : capacités numériques fonctionnelles, **pas un score digital global**.
- **Principe verrouillé pour l'analyse post-collecte (CONSERVER MAIS À AJUSTER, D-022) :** pas de taxonomie universelle « lacune de fond vs lacune superficielle ». Pour une action numérique requise par la route : (1) déjà autonome → directement mobilisable ; (2) non autonome mais accompagnement raisonnablement léger au regard du test envisagé → intégrer un préalable ; (3) non autonome et acquisition significative au regard du test → adapter la forme du test ou la route. Seuils et algorithme **toujours à spécifier**. Aucun score numérique global, aucune nouvelle question.

**Q21 — Langues fonctionnelles**
- Formulation : « Quelles langues peux-tu utiliser aujourd'hui, même si tu ne les maîtrises pas parfaitement ? »
- Pour chaque langue : « Avec cette langue, qu'est-ce que tu peux réellement faire ? » — converser / échanger avec client-fournisseur-partenaire / lire informations-documents utiles / écrire des messages-textes professionnels
- Limite : pas de CEFR sauf besoin ultérieur spécifique.

**Q22 — Réseau d'aide**
- Formulation : « Si tu avais besoin d'aide pour avancer, y a-t-il des personnes que tu pourrais réellement contacter ? »
- Aide : « Pas besoin de donner leurs noms. Indique simplement le type d'aide que tu pourrais leur demander. »
- Choix : conseil/expérience, information secteur/métier, aide sur compétence manquante, introduction/mise en relation, aide pratique/administrative, encouragement/aide à passer à l'action, autre, personne, je ne sais pas
- Si secteur/introduction pertinent : préciser domaine/activité
- Objectif : réseau mobilisable pour construire. Ne pas interpréter négativement l'absence de réseau.
- Distinction : Q22 (réseau d'aide général) ≠ Q35 (accès aux personnes concernées par un problème observé).

**Micro-donnée « actif relationnel mobilisable », rattachée à l'Étape 4 — AJOUTÉE (VALIDÉ QG, D-022, 2026-09-25).** Après Q22 :
- Formulation : « As-tu déjà un groupe ou un réseau de personnes que tu peux contacter directement si tu veux apprendre de leurs besoins, tester une idée ou leur proposer quelque chose ? » — Oui / Non / Je ne sais pas.
- Si Oui, une seule qualification : « De quel type de groupe ou réseau s'agit-il principalement ? » — Réseau professionnel / Anciens clients ou contacts / Communauté en ligne / Groupe ou association / Entourage ou réseau local / Autre. Aucun nombre d'abonnés, aucun nombre de contacts, aucun score d'engagement, aucun nom.
- Doctrine verrouillée : **ACTIF RELATIONNEL ACCESSIBLE ≠ AUDIENCE ENGAGÉE ≠ DEMANDE ≠ CLIENTÈLE.** Indique uniquement l'existence déclarée d'un canal de contact potentiellement mobilisable, peut influencer la friction/testabilité de certaines options. Reste DÉCLARÉE.
- Ne fusionne ni avec Q22 (soutien reçu par la personne, direction inverse) ni avec Q35 (accès conditionné à un problème déjà identifié) — confirmé absent de Q1–Q36 après tous les croisements possibles (audit inverse global).
- Fonction d'apparition : SOCLE pour la question Oui/Non ; CONDITIONNELLE pour la qualification (si Oui).

### Étape 5 — Ta façon d'avancer

**⚠️ Ordre interne VALIDÉ DÉFINITIVEMENT (D-022, 2026-09-25), à ne jamais réordonner de sa propre initiative :**
```
Q23 → Q27 → Q24 → Q26 → Q25 conditionnelle
```
Raison déjà arbitrée, confirmée après audit challengeant explicitement l'alternative (Q23→Q24 consécutifs) : la rupture volontaire entre Q23 et Q24 par Q27 est conservée afin d'éviter une séquence exclusivement centrée sur les difficultés, équilibrée immédiatement par une expérience de continuité réussie — un compromis délibéré entre continuité narrative stricte et charge émotionnelle, jugé défendable.

**Garde-fou transversal de l'Étape 5, VERROUILLÉ (D-022) :** les comportements passés servent à calibrer le prochain test, pas à enfermer la personne dans ses comportements passés. Architecture : ÉPISODE PASSÉ → observation contextuelle → hypothèse prudente pour calibrer le premier test → nouvelle expérience → nouvelle donnée terrain → adaptation. Une absence ou une difficulté passée peut conduire à créer une expérience progressive élargissant la capacité d'action, pas seulement à réduire l'ambition du test. Exemples verrouillés : absence passée de demande de feedback ≠ incapacité à en demander ; action retardée ≠ besoin permanent de micro-actions ; arrêt après obstacle ≠ faible persévérance ; attente avant décision ≠ personne indécise ; difficulté après retour extérieur ≠ faible confiance. **Aucun trait psychologique stable ne doit être dérivé de Q23–Q27.**

**Q23 — Démarrage / retard à agir**
- Formulation : « Ces derniers mois, t'est-il arrivé de décider de faire quelque chose d'important, puis de beaucoup tarder à commencer ou de ne pas commencer ? »
- Choix : Oui / Non / Je ne sais pas — aucun exemple
- Si oui : « Pense à un exemple récent. Qu'avais-tu décidé de faire, et qu'est-ce qui t'a empêché de commencer plus tôt ? » (pas d'exemples de raisons)
- Relance si « je n'étais pas prêt » : « Concrètement, qu'est-ce qui te manquait pour commencer ? »
- Limite : pas d'étiquette « procrastination ».

**Q27 — Continuité**
- Formulation : « Pense à quelque chose que tu as réussi à continuer pendant un certain temps. »
- Aide contextuelle seulement : travail, études, projet, activité personnelle, habitude du quotidien
- Champs : « Qu'est-ce que tu as réussi à continuer ? » / « Qu'est-ce qui t'a aidé à continuer ? » (+ « aucun »)
- Limite : ne pas donner d'exemples de leviers comme discipline/routine — c'est précisément ce qu'on veut découvrir
- Relance si abstrait : « Concrètement, qu'est-ce qui t'a aidé à continuer même quand c'était plus difficile ? »
- Limite : pas d'étiquette discipline/résilience.

**Q24 — Obstacle / adaptation**
- Formulation : « Pense à une situation récente où tu avais commencé quelque chose, puis rencontré un obstacle ou obtenu un résultat moins bon que prévu. »
- Champs : « Qu'est-ce qui s'est passé ? » / « Et qu'as-tu fait ensuite ? » (+ « aucun »)
- Relance si logique de décision peu claire : « Qu'est-ce qui t'a fait décider de continuer, de changer d'approche ou d'arrêter ? »
- Limite : arrêter peut être une décision rationnelle (ne pas la traiter comme un échec).
- Réutilisation possible avec Q14 si même épisode (cf. §1).

**Q26 — Exposition au retour extérieur**
- Formulation : « Pense à une situation récente où tu as montré ton travail, proposé une idée ou demandé quelque chose à quelqu'un. »
- Champs : « Qu'as-tu fait ? » / « Quand la personne t'a répondu, qu'as-tu fait ensuite ? » (+ « aucun »)
- Objectif : comportement après retour extérieur. Limite : ne pas transformer en score de confiance ou de tolérance au rejet.

**Q25 — Décision dans l'incertitude — CONSERVER MAIS À AJUSTER (VALIDÉ QG, fonction verrouillée, D-022)**
- **RÉCUPÉRATION**, strictement conditionnelle.
- **Fonction unique verrouillée :** obtenir au moins un épisode concret montrant ce que la personne a fait lorsqu'elle devait décider alors qu'elle ne disposait pas de toutes les informations qu'elle aurait souhaitées. Q25 n'est **pas** une question sur l'indécision, la tolérance psychologique à l'incertitude, la prise de risque, le courage décisionnel, ou un style général de décision.
- Formulation : « Pense à une situation récente où tu devais avancer ou décider sans avoir toutes les informations que tu voulais. Qu'as-tu fait ? » (+ « aucun », pas d'exemples)
- Relance si attente/blocage : « Qu'est-ce qui te manquait pour pouvoir avancer ou décider ? » — **une seule relance maximale.**
- **Condition de SKIP** : si Q23 ou Q24 a déjà fourni clairement un épisode de décision sous information incomplète, Q25 est inutile et peut être skippée ; sinon elle joue son rôle de récupération — **mais uniquement si un signal structuré permet de le décider** (pas d'IA sémantique en direct). **Mécanisme exact de ce skip déterministe : toujours À ARBITRER.**

### Étape 6 — Ce qui est possible pour toi aujourd'hui

*Titre explicitement validé par l'utilisateur.*

**Q28 — Budget du premier test**
- Formulation : « Pour faire un premier test de ton Plan B, combien pourrais-tu utiliser aujourd'hui sans mettre en difficulté tes dépenses essentielles ? »
- Aide : « Nous ne parlons pas du budget nécessaire pour lancer toute une activité. Seulement d'une petite somme que tu pourrais réellement utiliser pour vérifier une première idée. »
- Type : montant approximatif + devise ; options « je veux commencer sans dépenser » / « cela dépend de l'idée » / « je ne sais pas »
- Relance si « dépend » : « Pour tester une idée qui te paraît intéressante mais qui n'a pas encore fait ses preuves, quelle somme maximum serais-tu prêt(e) à risquer ? » — une relance → puis INCONNU
- Limite : Q28 ≠ patrimoine/revenu/budget d'investissement global/profil psychologique de risque. **Zéro est une réponse valide.**

**Q29 — Urgence financière**
- Formulation : « As-tu besoin que ton Plan B commence à te rapporter de l'argent rapidement ? »
- Choix : Non je peux prendre le temps / J'aimerais que cela arrive assez vite mais je peux attendre / Oui j'ai besoin d'un revenu supplémentaire dans les prochains mois / Oui ma situation financière rend cela très urgent / Ma situation varie beaucoup / Je préfère ne pas répondre
- Si besoin réel/urgent : « À partir de quand aurais-tu besoin que cela commence à t'apporter un revenu ? » — moins d'un mois / 1-3 mois / 3-6 mois / 6-12 mois / plus d'un an / je ne sais pas
- Objectif : horizon/pression économique. Un horizon urgent n'est pas une promesse de revenu — peut au contraire favoriser une voie emploi/mission/stabilisation avant un projet entrepreneurial.
- **CONSERVER MAIS À AJUSTER (VALIDÉ QG, D-022) — trois règles verrouillées pour Ma feuille de route, aucune nouvelle question :**
  1. **URGENCE DÉCLARÉE ≠ DÉLAI DE RÉSULTAT PRÉDIT.** L'horizon déclaré exprime le besoin économique de la personne, jamais une estimation CoachRedo du délai nécessaire, une prévision de revenu, ou une promesse. Exemple doctrinal : « J'ai besoin d'un effet économique en moins d'un mois » signifie *la route doit tenir compte d'une forte contrainte temporelle*, jamais *CoachRedo estime que cette route produira un revenu en moins d'un mois*.
  2. **Pas d'automatisme de catégorie de voie.** Pas de « urgence forte → emploi/mission/stabilisation obligatoire ». Plus l'urgence est forte, moins CoachRedo doit faire dépendre la prochaine étape d'une voie longue, coûteuse ou hautement incertaine sans preuves suffisantes — en considérant explicitement emploi, mission, activité existante, petit service, réactivation d'une capacité ayant déjà créé de la valeur, ou autre voie étayée. **Q29 influence le poids du délai et de l'incertitude ; Q29 ne choisit jamais seule la voie.**
  3. **Urgence ≠ prise de risque accrue.** Ne doit jamais justifier seule un investissement plus lourd, l'abandon prématuré d'une source de revenu existante, une atteinte aux dépenses essentielles, une voie moins réversible, ou une hypothèse présentée comme certitude. Preuves faibles + urgence forte → privilégier une prochaine étape courte, peu coûteuse, réversible, produisant rapidement une information terrain ou une valeur économique réelle.

**Q30 — Mobilité réelle**
- Formulation : « Aujourd'hui, jusqu'où peux-tu réellement te déplacer pour travailler ou développer une activité ? »
- Choix : principalement chez moi/très près, quartier, ville/zone de vie, occasionnellement plus loin si cela vaut la peine, régulièrement vers d'autres villes/zones, cela varie, autre
- Relance si limité/variable : « Y a-t-il quelque chose d'important que CoachRedo doit prendre en compte concernant tes déplacements ? » (aide : pas besoin de détails privés, indiquer seulement l'effet pratique)
- Distinction : Q19 = moyen de transport disponible ; Q30 = rayon de mobilité réel.

**Q31 — Condition indispensable**
- Formulation : « Y a-t-il une condition importante que ta prochaine activité devra respecter dans ta vie actuelle ? »
- Aide : « Par exemple : certains horaires, rester près de chez toi, travailler principalement à distance, éviter certaines tâches ou respecter une responsabilité importante. »
- Choix : Oui / Non / Je ne sais pas / Je préfère ne pas répondre
- Si oui : « Quelle condition doit-elle respecter ? »
- Relance si seulement la cause est donnée : « Concrètement, qu'est-ce que cela change dans ce que tu peux faire pour ta prochaine activité ? » — une relance → INCONNU
- **Doctrine Q8/Q31 CORRIGÉE et verrouillée (D-022) — ne pas documenter Q31 comme « filtre éliminatoire » absolu :** Q8 = préférence importante → un compromis éventuel doit être rendu visible. Q31 = condition indispensable → CoachRedo ne doit pas recommander une route sous une forme qui viole cette condition **maintenant** — mais une voie peut être **adaptée** pour respecter Q31 plutôt qu'éliminée. Nuance temporelle verrouillée (cf. ÉTAT ACTUEL ≠ LIMITE PERMANENTE, §1) : Q31 doit être respectée maintenant ; sa permanence future ne doit pas être supposée sans données.

**Q32 — Voies que la personne est prête à envisager**
- Formulation : « Pour avancer vers ton objectif, qu'es-tu réellement prêt(e) à envisager aujourd'hui ? »
- Aide : « plusieurs réponses possibles ; aucune bonne ou mauvaise réponse. »
- Choix : construire progressivement en gardant ma situation actuelle / utiliser mon temps libre pour tester une activité ou un service / apprendre une nouvelle compétence si utile / chercher un emploi-mission qui améliore ma situation / commencer par une petite activité même si ce n'est pas l'objectif final / plus tard réduire-quitter mon activité actuelle si une autre voie devient solide / changer le moins de choses possible pour le moment / je ne sais pas encore / autre
- Pas de relance générique.
- **Distinction fondamentale à préserver** : CE QUE LA PERSONNE VEUT = Étape 2 ; CE QU'ELLE EST PRÊTE À ENVISAGER = Q32 ; CE QUI EST RÉALISTE AUJOURD'HUI = croisement de toutes les données. Le 3e niveau ne remplace pas l'objectif. CoachRedo doit montrer : ce qui peut être fait maintenant + pourquoi + ce que cela peut débloquer ensuite + comment cela rapproche de l'objectif moyen/long terme. **La volonté déclarée n'est jamais une preuve qu'une décision est bonne.**

### Étape 7 — Ce que tu observes autour de toi

**Garde-fou transversal de l'Étape 7 — anti-« prison d'exploration », VERROUILLÉ (D-022, 2026-09-25) :** ce que la personne connaît (Q33/Q34) alimente l'exploration de CoachRedo ; cela ne délimite jamais son périmètre. Architecture : CE QUE LA PERSONNE SAIT/OBSERVE → matière initiale → COACHREDO EXPLORE ET RECHERCHE → hypothèses plausibles → LA PERSONNE DÉCIDE QUOI TESTER → LE TERRAIN VALIDE OU INFIRME → adaptation. CoachRedo doit pouvoir explorer à l'intérieur des environnements cités, autour, et **hors de ces environnements** lorsque les autres données du profil rendent d'autres pistes plausibles — sans devenir une génération illimitée d'idées sans rapport avec la personne (filtrée par objectif + capacités/preuves + mobilisabilité + ressources + contraintes + ouverture actuelle + environnement + données externes disponibles). « Aucun » en Q33 ne signifie jamais : aucune opportunité, aucune piste, aucune capacité à entreprendre, ou impossibilité pour CoachRedo d'explorer ailleurs.

**Q33 — Environnements connus**
- Formulation (dernière version de travail) : « Y a-t-il des personnes ou des activités que tu connais bien dans ta vie actuelle ou grâce à ton expérience ? »
- Aide : « Par exemple : des commerçants, des étudiants, des parents, des chauffeurs, des restaurateurs, des artisans, des sportifs, des vendeurs en ligne… Cela peut venir de ton travail, de ta famille, de ton quartier ou de tes activités. »
- Type : jusqu'à 5 ; option « aucun ne me vient à l'esprit »
- Relance si trop général : « De quel type de personnes, d'activité ou de milieu s'agit-il plus précisément ? » — une relance → INCONNU
- Objectif : environnement connu déclaré. Limite : ni expertise, ni preuve de marché, ni accès client, ni validation d'opportunité.
- Réutilisation depuis Q11 (cf. exemple restauration, §1).

**Q34 — Problèmes observés**
- Formulation : « Dans ta vie ou parmi les personnes que tu connais, quels problèmes vois-tu revenir souvent ? »
- Aide (formulation finale travaillée) : « Pense à des choses qui te posent problème à toi aussi, ou dont les autres se plaignent, qui font perdre du temps ou de l'argent, qui sont compliquées à faire ou pour lesquelles on cherche souvent de l'aide. »
- Type : jusqu'à 3 ; option « je n'en vois pas pour le moment »
- Relance si vague : « Concrètement, quel problème rencontres-tu ou entends-tu le plus souvent ? » — une relance → INCONNU
- Q34 reste indépendante de Q33. Limite forte : un problème personnel peut générer une **hypothèse**, jamais une validation de marché. Une plainte répétée ≠ volonté de payer.

**Q35 — Accès aux personnes concernées**
- **Conditionnelle** : selon existence d'un environnement/problème (Q33/Q34) permettant de la poser utilement.
- Formulation : « Parmi ces personnes, y en a-t-il à qui tu pourrais facilement parler pour mieux comprendre leurs problèmes ? »
- Aide : « Par exemple : leur poser quelques questions, leur demander comment ils font aujourd'hui, ce qui leur pose le plus de difficultés ou ce qu'ils ont déjà essayé. »
- Choix : Oui plusieurs / Oui quelques-unes / Peut-être mais ce ne serait pas facile / Non pas vraiment / Je ne sais pas
- Si oui : « À quelles personnes pourrais-tu parler le plus facilement ? » (aide allégée : pas besoin de noms, indiquer le type de personnes)
- Objectif : accessibilité du terrain/testabilité. Limite : plus testable ≠ meilleure opportunité finale.
- Distinction : Q22 (réseau d'aide général) ≠ Q35 (accès spécifique aux personnes concernées par le problème).

**Q36 — Comportement actuel face au problème — CONSERVER MAIS À AJUSTER (VALIDÉ QG, D-022)**
- **CONDITIONNELLE** : si Q34 contient un problème suffisamment concret.
- Formulation : « Quand ces personnes rencontrent ce problème, que font-elles aujourd'hui pour essayer de le résoudre ? »
- Aide : « Par exemple : elles se débrouillent seules, demandent de l'aide à quelqu'un, utilisent un outil ou un service, paient déjà pour une solution, ou ne font rien de particulier. »
- Type : réponse courte + « je ne sais pas » — **pas de relance automatique** (« je ne sais pas » devient une information à vérifier sur le terrain, pas un manque à combler par relance)
- Objectif : solution/comportement actuel déclaré. Distinguer observation réelle et supposition.
- **Ajustement verrouillé :** une provenance minimale est distinguée après la réponse, sans preuve demandée ni transformation en étude de marché : observée directement / entendue de personnes concernées / supposée ou déduite / pas vraiment connue-je ne sais pas. Formulation UX exacte à spécifier ultérieurement. **Important : même « observée directement » reste DÉCLARÉE** — CoachRedo reçoit toujours le récit de l'utilisateur, jamais une vérification indépendante. Cette provenance sert uniquement à empêcher CoachRedo de présenter une supposition comme une observation ; elle ne transforme pas Q36 en validation de marché.

---

## 3. Statut consolidé — POST-CLÔTURE (D-022, 2026-09-25)

### Éléments VALIDÉS (principes/mécanismes, cf. §1)
Chaîne produit et 7 étapes ; principe temporel MAINTENANT→...→DIRECTION LONG TERME ; architecture de collecte SOCLE COMMUN→...→ANALYSE IA ; frontière IA déterministe/collecte vs IA/analyse ; limite V1 sur le skip sémantique ; charge cognitive et ordre des 7 étapes ; P0-P3 (mécanisme, avec la définition P1 mise à jour) ; règle 1 relance principale max ; INCONNU comme sortie légitime ; réutilisation des données (principe) ; règle aides/exemples ; discipline de preuve DÉCLARÉ/ÉTAYÉ/INFÉRÉ/CONTRADICTOIRE/INCONNU (terminologie canonique unifiée) ; Johari (mécanisme interne) ; voies/options/route ; principe d'action et de risque ; refus définitif de Q37 (reconfirmé après audit complet de Q33-Q36) ; mesure de longueur multi-critères ; ordre interne étape 5 (Q23→Q27→Q24→Q26→Q25, validé définitivement) ; titre étape 6 ; suppression de l'ancienne Q4-B ; **ÉTAT ACTUEL ≠ LIMITE PERMANENTE** (nouvelle doctrine transversale) ; **classification SOCLE/CONDITIONNELLE/RÉCUPÉRATION** (nouvelle, remplace toute notion de hiérarchie d'importance) ; garde-fou transversal Étape 5 (comportements passés calibrent sans enfermer) ; garde-fou transversal Étape 7 (anti-« prison d'exploration ») ; doctrine Q8/Q31 corrigée (adaptation possible, pas élimination automatique) ; trois règles Q29 (urgence ≠ délai prédit / automatisme de voie / prise de risque accrue) ; doctrine Q18 (preuve d'existence ≠ mobilisabilité actuelle, jamais fusionnées) ; doctrine Q16 (DÉCLARÉ dans tous les cas, jamais ÉTAYÉ seule, capacité ÉTAYÉE ≠ marché validé).

### Verdicts finaux par question (CONSERVER sauf mention contraire)
Toutes les questions Q1–Q36 + les deux micro-données ajoutées ont reçu le verdict **CONSERVER**, à l'exception des suivantes en **CONSERVER MAIS À AJUSTER** (ajustement documenté au fil du §2, aucun n'est une remise en cause de la question elle-même) : Q10 (relance corrigée), Q15 (déclencheur corrigé), Q16 (niveau de preuve corrigé), Q18 (doctrine A/B), Q20 (principe à 3 niveaux route-relatif), Q25 (fonction verrouillée), Q29 (trois règles), Q36 (provenance ajoutée), la branche moyen/long terme de Q6 (justification corrigée). **Aucune suppression de question n'a résulté de l'audit.**

### HYPOTHÈSE / À TESTER (non résolu par cette clôture)
- Budget global de relances : **5 relances principales maximum (V1)** — à valider par les vrais usages.
- Simulations de durée/nombre d'interactions par profil (précis/moyen/vague) — chiffres non validés produit.
- Formulations des micro-transitions — exemples travaillés, non figés.

### À ARBITRER — liste finale après clôture (aucun ne remet en cause une question, tous relèvent de mécanismes techniques futurs)
- Mécanisme exact d'exception `critical_for_route = true` (budget de relances).
- Formulations finales des micro-transitions.
- Mécanisme déterministe exact du skip Q23/Q24→Q25 (fonction de Q25 verrouillée, seul le déclencheur reste ouvert).
- Mécanisme déterministe exact du skip de la branche moyen/long terme de Q6 (justification corrigée et verrouillée, seul le déclencheur reste ouvert).
- Mécanisme déterministe exact du déclenchement de Q15 (corrigé : dépend de l'absence d'épisode concret dans Q10-Q14, pas de Q11 — seule la traduction en règle structurée reste ouverte).
- Mécanisme de réutilisation UX pour les chevauchements Q16/branche activité existante de Q1, et Q11/Q33.
- Seuils et algorithme du principe à 3 niveaux route-relatif de Q20.
- Mécanisme de convergence DÉCLARÉ→ÉTAYÉ — explicitement non défini à ce stade par choix du QG, à traiter après spécification technique.
- Mécanisme d'exploration élargie de CoachRedo hors des environnements spontanément cités (garde-fou conceptuel verrouillé, mise en œuvre non définie).
- Position écran et numérotation définitive de Q1-Q36 et des deux micro-données ajoutées (territoire principal, actif relationnel mobilisable).
- Métriques de durée — hypothèses uniquement avant tests réels.

**Résolu depuis la version précédente de ce document (ne plus traiter comme ouvert) :**
- ~~Ajout éventuel à Q1 d'une catégorie « je gère déjà une activité ou une entreprise »~~ → résolu différemment par une branche « activité existante » distincte rattachée à Q1 (§2, Étape 1).
- ~~Éventuelle captation explicite d'une audience/communauté/réputation déjà mobilisable~~ → résolu par l'ajout de la micro-donnée « actif relationnel mobilisable » (§2, Étape 4).
- ~~Contexte géographique~~ → résolu par l'ajout de la micro-donnée « territoire principal » (§2, Étape 1), après vérification factuelle que l'application ne connaît déjà rien de tel (`profiles.country` dormant).

---

## 4. Ce que la matrice finale Q1-Q36 a vérifié — FAIT (D-022, 2026-09-25)

L'audit individuel de chaque question (aide/exemples, type de réponse, information obtenue, provenance/preuve, croisements, usage dans Ma feuille de route, décision influencée, risque d'interprétation, verdict) puis l'audit inverse global (parti des décisions que Ma feuille de route doit éclairer pour vérifier en sens inverse la couverture de Q1-Q36, recherche des tensions entre données, audit de la frontière personne/CoachRedo/terrain, audit de l'architecture en 12 sections du futur rapport) sont **terminés et arbitrés**.

Test absolu retenu et appliqué : **une question reste uniquement si sa réponse change une interprétation, un filtre, une voie, une recommandation ou une action.** Aucune question n'a été supprimée sur cette base ; deux micro-données ont été ajoutées après vérification qu'aucune donnée existante ne les couvrait déjà.

**Verdict final de l'audit : Q1-Q36 + les deux micro-données fournissent une matière suffisante pour construire Ma feuille de route, sous réserve des mécanismes d'exploitation listés en §3 (« À ARBITRER ») et `CURRENT_STATE.md` §8.** Le risque résiduel identifié ne porte plus sur un manque de données mais sur l'exploitation future de données par ailleurs suffisantes (mécanisme de convergence de preuve non appliqué rigoureusement, principe ÉTAT ACTUEL ≠ LIMITE PERMANENTE non respecté en rédaction, fonction de « Ton miroir CoachRedo » dérivant vers un profil psychologique).
