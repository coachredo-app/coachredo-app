// ============================================================
// PLAN B RENTABLE — content.js — V2
// 7 chapitres narratifs · 2 intermèdes · sans exercices
// ============================================================

// ── INTRO : AVANT DE COMMENCER ───────────────────────────────

const INTRO = {
  id: "avant_de_commencer",
  titre: "Avant de commencer",
  type: "intro",
  progression_rule: "none",

  contenu: [

    {
      type: "text",
      section: "Avant de commencer",
      value: "Il y a des choses qu'on n'avoue pas facilement.\n\nLes projets commencés et jamais terminés. Les carnets remplis d'idées qu'on ne rouvre plus. Les moments où on se dit que cette fois, c'est différent — et puis la semaine passe, l'année suit, et rien n'a vraiment changé.",
      cta_label: "Je t'écoute"
    },

    {
      type: "text",
      value: "J'ai connu ça. Pas une fois. Plusieurs.\n\nPas par manque d'envie. Pas par manque d'idées. Mais parce que je ne voyais pas encore clairement ce que je cherchais à construire, ni pourquoi c'était le bon moment pour le faire."
    },

    {
      type: "text",
      section: "Mot du coach",
      value: "Ce livre n'est pas né d'un chemin tout tracé. Il est né d'une accumulation — d'erreurs, d'observations, de conversations avec des gens qui voulaient avancer et ne savaient pas comment. Des personnes sérieuses, capables, qui avaient tout pour construire quelque chose — et qui n'arrivaient pourtant pas à se mettre en mouvement.\n\nLa réponse n'était presque jamais le manque de potentiel. C'était le manque de clarté."
    },

    {
      type: "text",
      value: "Je n'écris pas ce livre pour te dire quoi faire. Je ne connais pas ta situation, tes contraintes, ni ce que tu portes en ce moment. Ce que je sais, c'est que tu as ouvert ces pages pour une raison. Et que cette raison mérite d'être prise au sérieux.\n\nTout ce que j'espère, c'est qu'il t'aide à voir un peu plus clair. À la fin de cette lecture, quelques questions t'attendront pour prolonger ce que tu auras commencé à regarder.",
      cta_label: "Redouane Agaja"
    },

    {
      type: "pnl_activation",
      value: "Tu n'as pas besoin d'être prêt.\nIl suffit d'être honnête avec toi-même le temps de cette lecture.",
      display: "centered",
      interaction: "button",
      button_label: "Commencer →"
    }

  ]
}

// ── CHAPITRE 1 ───────────────────────────────────────────────

const CHAPTER_1 = {
  num: 1,
  titre: "Pourquoi as-tu l'impression de tourner en rond ?",
  duree_estimee: "7 min",
  completion_message: "Chapitre 1 terminé.",
  chapter_progress_label: "Chapitre 1",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Chapitre 1",
      value: "Il y a des semaines qui commencent toutes de la même façon.\n\nLa même promesse muette qu'on se fait à soi-même. Cette semaine, c'est différent. Cette semaine, on avance vraiment. Parfois ça arrive un dimanche soir, téléphone en main, après une vidéo qui parle de liberté et de projets construits depuis zéro. Parfois un lundi matin, juste avant que la journée reprenne. Le sentiment est sincère. L'intention aussi. Et puis les obligations reviennent, et la semaine se termine comme les précédentes — avec cette impression d'avoir fait des choses, mais pas la chose."
    },

    {
      type: "text",
      value: "Tu n'es probablement pas quelqu'un qui manque de volonté. Ni d'idées. Si tu faisais le compte de ce que tu as voulu commencer ces dernières années — les projets pensés, les directions entrevues, les déclics ressentis — la liste serait probablement plus longue que tu ne l'imagines.\n\nLe problème n'est pas là."
    },

    {
      type: "text",
      value: "Le problème, c'est ce cycle que beaucoup connaissent mais que peu arrivent à nommer. On attend que les études ouvrent des portes — et les portes tardent. On regarde des vidéos le soir, dans le noir, sur quelqu'un qui raconte comment il a lancé quelque chose depuis zéro. On like. On sauvegarde. On crée même parfois un compte quelque part pour le projet — deux publications, puis plus rien. On note une idée dans son téléphone à 23h en se disant que là, c'est la bonne. Et puis rien. La semaine suivante, une autre idée, le même demi-élan."
    },

    {
      type: "text",
      value: "Ce n'est pas de la paresse. C'est de la dispersion. Et la dispersion ressemble à la stagnation vue de l'extérieur — mais ce n'est pas la même chose. La personne dispersée cherche vraiment. Elle n'a juste pas encore trouvé dans quelle direction creuser.\n\nCe qui complique les choses, c'est que certains autour de toi semblent avancer. Il y a ces conversations où quelqu'un de ton entourage parle de ce qu'il est en train de construire, avec cet air de quelqu'un qui sait où il va. Tu félicites. Tu encourages. Et sur le chemin du retour, tu te demandes en silence ce qui te retient."
    },

    {
      type: "text",
      value: "La réponse que tu t'es peut-être donnée : tu n'es pas encore assez prêt. Ou tu attends le bon moment, la bonne information, les bonnes conditions. Ou — dans les moments plus difficiles — tu te demandes si tu n'es simplement pas fait pour ça.\n\nPeut-être que tu as même essayé quelque chose de concret. Tu en as parlé autour de toi — à un ami, à un proche — avec l'enthousiasme du début. Et puis ça n'a pas marché comme tu l'espérais, ou tu t'es retrouvé seul à porter quelque chose de trop lourd. Tu as arrêté. Et tu n'as pas eu très envie d'en reparler."
    },

    {
      type: "text",
      value: "Ce n'est pas un défaut. C'est une protection normale. Mais cette protection, si on n'y fait pas attention, peut finir par ressembler à une prison.\n\nJ'ai connu cet endroit. Des projets commencés avec énergie, abandonnés quelques semaines plus tard sans raison bien claire. Pas par manque de sérieux — plutôt par manque de boussole."
    },

    {
      type: "text",
      value: "Et voici ce que j'ai fini par comprendre, et ce que beaucoup de personnes que j'ai accompagnées ont compris à un moment ou un autre : tourner en rond n'est presque jamais un problème de motivation. C'est presque toujours un problème de clarté.\n\nLa motivation, on l'a. Elle vient et elle repart, c'est sa nature. Mais la clarté — savoir ce qu'on veut construire, pourquoi c'est important maintenant, et par où commencer concrètement — c'est quelque chose de différent. Et c'est ce qui manque le plus souvent quand on a l'impression de ne pas avancer.\n\nCe n'est pas un aveu de faiblesse. C'est une information — peut-être la plus utile de ce chapitre. La clarté, ça se construit.\n\nMais quelque chose, souvent, nous en empêche. Quelque chose qu'on prend, la plupart du temps, pour une force."
    }

  ],

  exercices: []
}

// ── CHAPITRE 2 ───────────────────────────────────────────────

const CHAPTER_2 = {
  num: 2,
  titre: "Le piège de la fausse sécurité",
  duree_estimee: "7 min",
  completion_message: "Chapitre 2 terminé.",
  chapter_progress_label: "Chapitre 2",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Chapitre 2",
      value: "Il y a quelque chose de rassurant dans la routine.\n\nL'heure du réveil qui ne change pas. Le trajet qu'on connaît par cœur. La journée qui se déroule à peu près comme la précédente. Ce n'est pas une mauvaise vie — et il serait faux de le prétendre. C'est une vie qui tient. Qui a ses repères, ses certitudes, ses petites victoires quotidiennes. Et dans un monde où les incertitudes sont nombreuses, il y a une vraie valeur dans quelque chose qui tient.\n\nLe problème n'est pas la routine elle-même. C'est ce qu'elle cache parfois, si on ne regarde pas trop près."
    },

    {
      type: "text",
      value: "Il y a des soirs où une question traverse l'esprit sans prévenir. Pas une question urgente — plutôt quelque chose de sourd, qu'on entend entre deux pensées, juste avant de s'endormir.\n\nEst-ce que c'est ça ?\n\nPas « est-ce que c'est bien ? » ou « est-ce que c'est mal ? » — juste : est-ce que c'est ça, la trajectoire ? Est-ce que dans cinq ans, dans dix ans, la vie ressemblera à ça — en un peu plus grand, en un peu plus lourd, mais fondamentalement pareille ?\n\nLa question ne dure jamais longtemps. Le sommeil arrive, le lendemain recommence, et on n'y pense plus vraiment jusqu'à la prochaine fois."
    },

    {
      type: "text",
      value: "Le temps a une façon étrange de passer dans la stabilité. Pas comme quand on traverse quelque chose de difficile — là, chaque jour se remarque, chaque semaine laisse une trace. Dans la routine, les semaines glissent. On réalise en novembre qu'on avait dit « cette année, je fais quelque chose » en janvier. Et l'année n'est pas perdue — les choses ont avancé, la vie a continué. Mais rien n'a vraiment bougé non plus, dans le sens où on avait vaguement imaginé que ça bougerait.\n\nC'est une fatigue particulière, ça. Pas l'épuisement d'avoir trop fait. Plutôt la lassitude tranquille d'avoir tourné suffisamment longtemps dans le même périmètre."
    },

    {
      type: "text",
      value: "Puis il y a des moments qui changent le regard, sans qu'on l'ait cherché.\n\nUn collègue dont le contrat ne se renouvelle pas. Une restructuration dont on entend parler dans un couloir. Quelqu'un qu'on connaît, sérieux et compétent, qui se retrouve à devoir tout reprendre de zéro à un âge où il ne l'avait pas prévu. Ce n'est pas forcément sa propre situation. Mais quelque chose dans ces nouvelles met mal à l'aise, plus que de raison. Parce qu'elles rappellent quelque chose qu'on avait préféré laisser dans l'angle mort : une partie de ta vie est dans les mains de quelqu'un d'autre.\n\nCombien de temps est-ce que tu pourrais tenir si ce revenu-là s'arrêtait demain ?"
    },

    {
      type: "text",
      value: "Pas longtemps, pour la plupart des gens. Le salaire arrive, et il repart presque aussi vite. Il couvre. Il ne protège pas toujours. Ce n'est pas une honte — c'est la réalité de beaucoup de personnes sérieuses, qui ont fait ce qu'on attendait d'elles : les études, le diplôme, le poste qu'elles ont mis du temps à obtenir. Mais un cadre qu'on n'a pas construit soi-même est un cadre dont on ne contrôle pas tous les paramètres.\n\nIl m'a fallu du temps pour regarder cette réalité en face. Pas par naïveté — plutôt parce que la nommer obligeait à reconnaître quelque chose que je préférais ignorer. La sécurité que j'avais était réelle. Mais elle était aussi un argument commode pour ne pas avoir à choisir."
    },

    {
      type: "text",
      value: "Ce que cette réflexion amène, quand on s'y laisse aller honnêtement, ce n'est pas la panique. Ce n'est pas non plus l'envie de tout quitter du jour au lendemain. C'est quelque chose de plus discret et de plus urgent à la fois : l'envie de dépendre un peu moins. D'avoir quelque chose à soi, même de petit, même d'imparfait, qui ne dépende pas d'une décision prise ailleurs.\n\nUn Plan B n'est pas forcément un projet révolutionnaire. Pour beaucoup de gens qui ont réfléchi honnêtement à leur situation, ce n'est pas un rêve de richesse ni une promesse de liberté totale. C'est quelque chose de plus simple — une façon de respirer un peu mieux. De ne plus avoir cette sensation sourde que tout repose sur une seule chose sur laquelle on n'a pas vraiment la main.\n\nIl reste une question, pourtant. Si cette réalité est visible — si on peut la sentir, la nommer, la reconnaître dans une soirée honnête avec soi-même — pourquoi est-ce qu'elle dure ?\n\nParce que ce qui nous retient n'est presque jamais à l'extérieur."
    }

  ],

  exercices: []
}

// ── CHAPITRE 3 ───────────────────────────────────────────────

const CHAPTER_3 = {
  num: 3,
  titre: "Ce qui te bloque n'est pas toujours ce que tu crois",
  duree_estimee: "8 min",
  completion_message: "Chapitre 3 terminé.",
  chapter_progress_label: "Chapitre 3",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Chapitre 3",
      value: "On sait toujours exactement ce qui nous retient.\n\nOu du moins, on le croit.\n\nLe temps qu'on n'a pas. L'argent qu'il faudrait. Le réseau qui manque. Les conditions qui ne sont pas encore réunies. Ce sont des réponses sincères — et souvent, ces obstacles sont bien réels. Il serait faux de les balayer d'un revers de main."
    },

    {
      type: "text",
      value: "Mais il y en a un autre, moins souvent nommé, qui est peut-être plus déterminant que tous les autres réunis. Pas parce qu'il est plus grand. Parce qu'il est à l'intérieur — et qu'il porte des déguisements très convaincants.\n\nIl prend surtout deux formes. Les deux savent très bien se faire passer pour autre chose."
    },

    {
      type: "text",
      value: "Le premier s'appelle le perfectionnisme.\n\nIl ressemble à du sérieux. Il se présente comme de la rigueur, de l'exigence, du respect pour le travail bien fait. Et ce n'est pas entièrement faux — il y a quelque chose de réel dans cette intention. Mais dans la pratique, le perfectionnisme fait une chose très précise : il reporte indéfiniment le moment de commencer."
    },

    {
      type: "text",
      value: "Il y a toujours quelque chose à approfondir encore. Une compétence à consolider. Un plan à affiner. Un détail à régler avant d'y aller vraiment. Et pendant ce temps, le projet reste en attente — pas abandonné, juste pas encore lancé.\n\nLe dossier existe. Il a un nom. Il y a peut-être même quelques pages de notes dedans, prises un soir d'élan. Mais il n'a pas été ouvert depuis un moment. Et chaque fois qu'on y pense, on se dit que ce n'est pas encore le bon moment — qu'il faut d'abord que..."
    },

    {
      type: "text",
      value: "Il y en a un autre, plus profond et moins souvent avoué.\n\nCe n'est pas la peur d'échouer. Beaucoup de gens, dans l'honnêteté, pourraient vivre avec l'échec — un projet qui ne marche pas, une tentative qui tourne court. Ce qu'ils imaginent moins facilement, c'est décevoir."
    },

    {
      type: "text",
      value: "Décevoir ceux qui ont cru en eux. Ceux qui ont investi, d'une façon ou d'une autre, dans ce qu'ils sont devenus. Ceux dont le regard a de l'importance. Ce n'est pas une faiblesse — c'est souvent une forme d'amour retourné. Mais cet amour-là peut se transformer en poids, sans qu'on l'ait cherché.\n\nAlors on ne parle pas du projet. Pas encore. On attend qu'il ait une forme, qu'il soit présentable, qu'il tienne debout avant d'être montré. Si ça ne marche pas, au moins personne ne l'aura su. Si ça marche, on pourra en parler. Cette prudence a du sens. Mais elle isole aussi — et elle prive parfois d'un soutien qui aurait changé quelque chose."
    },

    {
      type: "text",
      value: "Reconnaître ces mécanismes n'est pas confortable. Parce qu'ils ne ressemblent pas à de la peur au premier regard. Ils ressemblent à de la prudence, à de la préparation, à du sérieux. Et c'est précisément ce qui les rend difficiles à voir.\n\nMais il y a quelque chose d'important à comprendre sur eux : ils ne sont pas là par hasard. Ils ont été construits pour protéger quelque chose de réel — une image de soi, une relation, une réputation dans un cercle où les regards comptent. Cette protection a eu sa raison d'être."
    },

    {
      type: "text",
      value: "Le problème n'est pas qu'elle existe. Le problème, c'est quand elle devient si confortable qu'on finit par la confondre avec qui on est.\n\nAttendre d'être totalement prêt est parfois une manière élégante de repousser la peur. Pas toujours — parfois la préparation est vraiment de la préparation. Mais il y a un moment où la différence devient possible à voir, si on se donne la permission de regarder honnêtement.\n\nCe n'est pas une invitation à tout lâcher ni à tout risquer. C'est regarder ses propres mécanismes avec un peu de curiosité, plutôt qu'avec de la sévérité."
    },

    {
      type: "text",
      value: "Non pas « je me bloque à cause de la peur. » Mais : « voilà comment fonctionne cette partie de moi — et voilà ce que ça me coûte peut-être. »\n\nCette distinction semble petite. Elle change beaucoup de choses.\n\nParce qu'à partir du moment où on commence à voir ses propres mécanismes avec honnêteté, quelque chose change dans les questions qu'on se pose.\n\nOn ne se demande plus seulement : « qu'est-ce qui me retient ? » On commence à se demander : « qu'est-ce que j'ai déjà, pour commencer à avancer ? »"
    },

    {
      type: "quote",
      value: "Il arrive qu'une idée change quelque chose sans qu'on sache encore quoi. Elle s'installe sans bruit, sans cérémonie. On continue à vivre à peu près comme avant — les mêmes journées, les mêmes habitudes. Et pourtant quelque chose ne se voit plus tout à fait de la même façon.\n\nC'est souvent aussi discret que ça."
    }

  ],

  exercices: []
}

// ── CHAPITRE 4 ───────────────────────────────────────────────

const CHAPTER_4 = {
  num: 4,
  titre: "Tu n'as peut-être pas besoin de tout recommencer",
  duree_estimee: "7 min",
  completion_message: "Chapitre 4 terminé.",
  chapter_progress_label: "Chapitre 4",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Chapitre 4",
      value: "Il y a une question qu'on se pose rarement, parce qu'on est trop occupé à regarder ce qu'on n'a pas encore."
    },

    {
      type: "quote",
      value: "Qu'est-ce que j'ai déjà ?"
    },

    {
      type: "text",
      value: "Pas dans le sens d'un bilan comptable. Plutôt dans le sens d'un regard honnête sur ce qu'on a traversé, construit, appris — souvent sans le nommer comme tel, souvent sans le compter comme une ressource.\n\nLa plupart des gens qui veulent avancer pensent qu'il leur manque quelque chose. Un diplôme de plus. Une formation spécifique. Un capital de départ. Un contact au bon endroit. Et peut-être que ces choses manquent réellement, dans certains cas. Mais il y a presque toujours, en parallèle, un autre inventaire qu'on n'a jamais fait — celui de ce qu'on possède déjà, sans encore l'avoir nommé."
    },

    {
      type: "text",
      value: "Pense à ce qu'on vient te demander.\n\nPas tes supérieurs, pas les institutions — les gens autour de toi. Les amis, les proches, les voisins, les collègues. Pour quel type de problème est-ce qu'on t'appelle ? Quelle situation est-ce qu'on te soumet parce qu'on sait que tu vas trouver une issue ? Quelle question est-ce qu'on te pose parce que ta façon de voir les choses est différente ?\n\nIl y a presque toujours quelque chose. Quelque chose que tu résous naturellement, que tu expliques clairement, que tu navigues sans effort apparent — au point que tu ne le vois même plus comme une compétence. Parce que ce qui vient naturellement ne ressemble pas à un talent. Ça ressemble à de l'évidence."
    },

    {
      type: "text",
      value: "C'est souvent là que se cachent les ressources les plus solides.\n\nIl y a des gens qui savent lire une situation commerciale en quelques minutes, parce qu'ils ont grandi dans un environnement où le commerce était une langue vivante — les conversations à la boutique familiale, les négociations entendues depuis l'enfance, la logique des prix et des marges absorbée sans manuel. Ils ne pensent pas à ça comme une compétence. Pourtant, des consultants facturent cher pour expliquer des choses qu'ils savent intuitivement.\n\nIl y a des gens qui passent d'un registre à l'autre sans effort — une langue ici, un dialecte là, un code culturel différent selon l'interlocuteur. Ils trouvent ça normal. Pourtant, cette capacité à naviguer entre des mondes différents est une forme d'intelligence sociale rare, et souvent décisive dans les contextes où les marchés se croisent."
    },

    {
      type: "text",
      value: "Il y a des gens qui ont géré des situations familiales complexes — des responsabilités prises tôt, des équilibres à tenir, des décisions à prendre sous pression. Ils n'en parlent pas comme d'une formation. Et pourtant.\n\nIl m'a fallu du temps pour voir ça dans ma propre trajectoire. Accompagner des gens dans des projets qui n'avancent pas. Apprendre à tenir une conversation difficile sans imposer de réponse. Comprendre comment quelqu'un prend une décision — ou pourquoi il ne la prend pas. Ces choses-là, je ne les rangeais pas du côté des compétences. Je les rangeais du côté de la vie. Ce n'est que plus tard que j'ai compris que ce qu'on traverse forme aussi, même quand ça ne ressemble pas à une école."
    },

    {
      type: "text",
      value: "Tu as probablement plus que ce que tu comptes.\n\nEt la différence entre quelqu'un qui commence avec peu et quelqu'un qui commence avec plus n'est pas toujours là où on croit. Elle est parfois dans la façon dont on regarde ce qu'on a déjà — et ce qu'on décide d'en faire.\n\nIl s'agit peut-être juste de regarder ce qu'on est déjà — avec un peu plus de justesse que d'habitude.\n\nCe regard-là, une fois qu'on le pose, change quelque chose dans la façon dont on observe ce qui nous entoure.\n\nCe qu'on appelle une opportunité commence à ressembler à quelque chose de différent."
    }

  ],

  exercices: []
}

// ── CHAPITRE 5 ───────────────────────────────────────────────

const CHAPTER_5 = {
  num: 5,
  titre: "Les opportunités ne ressemblent pas toujours à ce qu'on imagine",
  duree_estimee: "8 min",
  completion_message: "Chapitre 5 terminé.",
  chapter_progress_label: "Chapitre 5",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Chapitre 5",
      value: "La plupart des gens cherchent une opportunité comme on cherche un objet perdu.\n\nQuelque chose de spécifique, qui existe quelque part, qu'il s'agirait de trouver avant les autres. Une idée originale. Un marché inexploré. Un moment parfait. Et pendant qu'on cherche cet objet-là, on passe à côté de choses visibles depuis longtemps — parce qu'elles ne ressemblent pas à ce qu'on avait imaginé trouver."
    },

    {
      type: "text",
      value: "Il y a quelque chose de curieux dans la façon dont les opportunités apparaissent, quand on commence vraiment à y faire attention.\n\nElles ne se présentent presque jamais comme des révélations. Elles ressemblent plutôt à des frictions — à des moments où quelque chose ne fonctionne pas bien, où quelque chose manque, où quelqu'un cherche ce qu'il ne trouve pas facilement. Des moments qu'on a appris à ignorer parce qu'ils font partie du paysage habituel."
    },

    {
      type: "text",
      value: "Il y a des problèmes qu'on finit par ne plus voir dans son quotidien. Pas les grands — ceux qu'on attend que d'autres résolvent. Les petits. Ceux qu'on contourne depuis si longtemps qu'ils sont devenus invisibles. La chose qu'on ne trouve nulle part et pour laquelle on improvise à chaque fois. Le service qu'on obtient seulement si on connaît quelqu'un. L'information qu'il faut assembler soi-même à partir de trois sources différentes parce qu'elle n'existe pas organisée quelque part. L'attente qu'on a acceptée sans vraiment comprendre pourquoi elle existe encore.\n\nCes frictions-là ont quelque chose en commun : elles sont là depuis longtemps, et personne ne les a encore résolues sérieusement."
    },

    {
      type: "text",
      value: "Il y a quelques années, quelqu'un dans un quartier que je connais a commencé à faire quelque chose de très simple.\n\nIl remarquait depuis longtemps que les gens autour de lui payaient des prix très différents pour les mêmes choses — selon qui ils connaissaient, selon le moment, selon le quartier. Cette information circulait. Elle existait de bouche à oreille depuis toujours. Mais elle n'était organisée nulle part."
    },

    {
      type: "text",
      value: "Il a commencé à l'organiser. Simplement. Sans grande infrastructure, sans capital de départ. Juste l'acte de collecter ce que tout le monde savait partiellement, et de le rendre accessible à ceux qui en avaient besoin.\n\nCe n'était pas une idée brillante. C'était une observation qu'il avait faite pendant des mois, avant de décider de faire quelque chose avec.\n\nUne opportunité est souvent un problème que quelqu'un a décidé de prendre au sérieux.\n\nÇa peut aussi être un étudiant qui aide régulièrement ses camarades à naviguer dans des démarches que personne n'a encore organisées pour eux — et qui réalise que cette capacité à trouver, synthétiser, rendre accessible ce que d'autres cherchent en vain, ça vaut quelque chose."
    },

    {
      type: "text",
      value: "Ce qui change quand on commence à regarder avec cette question — quel problème est-ce que j'observe régulièrement, sans qu'il soit encore bien résolu ? — c'est qu'on cesse de chercher une idée. On commence à observer. On s'interroge sur ce qui complique inutilement la vie des gens autour de soi. Sur ce qu'ils font de façon détournée alors que ça pourrait être direct. Sur les connexions qui n'existent pas encore entre des choses qui, pourtant, existent déjà.\n\nCe n'est pas un secteur porteur. Ce n'est pas une niche à exploiter. C'est juste un regard différent sur ce qui est déjà là."
    },

    {
      type: "text",
      value: "La difficulté n'est pas de trouver quoi observer. La plupart des gens, quand ils se posent honnêtement cette question, trouvent rapidement plusieurs réponses.\n\nLa difficulté, c'est de se décider à faire quelque chose avec ce qu'on a vu.\n\nCe moment — où voir devient faire — est rarement celui qu'on avait prévu."
    },

    {
      type: "quote",
      value: "Il y a des observations qu'on fait et qu'on repose. On ne sait pas encore quoi en faire — et pourtant quelque chose continue à travailler, silencieusement. Parfois une idée qu'on avait crue mise de côté revient quelques jours plus tard avec un peu plus de forme.\n\nSans qu'on l'ait cherché."
    }

  ],

  exercices: []
}

// ── CHAPITRE 6 ───────────────────────────────────────────────

const CHAPTER_6 = {
  num: 6,
  titre: "Commencer avant d'être prêt",
  duree_estimee: "7 min",
  completion_message: "Chapitre 6 terminé.",
  chapter_progress_label: "Chapitre 6",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Chapitre 6",
      value: "On commence quand on est prêt.\n\nQuand on a les compétences nécessaires. Quand les conditions sont réunies. Quand le plan est solide et la peur s'est calmée suffisamment pour avancer sans trop de risques.\n\nC'est une pensée raisonnable. Le problème, c'est qu'elle peut s'étirer indéfiniment."
    },

    {
      type: "text",
      value: "L'attente a une façon particulière de se justifier à elle-même. Il y a toujours une bonne raison de ne pas encore commencer — une raison différente de celle du mois précédent, mais une raison. Et les mois s'accumulent avec une régularité silencieuse, jusqu'au moment où on réalise que le « bientôt » dure depuis plus longtemps qu'on ne l'avait prévu.\n\nCe n'est pas de la mauvaise foi. C'est une façon de se protéger qui a l'apparence de la sagesse."
    },

    {
      type: "text",
      value: "Ce qu'on comprend moins facilement, c'est que la confiance ne précède pas l'action. Elle en est le résultat.\n\nOn ne commence pas parce qu'on est prêt. On devient prêt parce qu'on a commencé. On n'apprend pas à marcher en regardant marcher. On tombe, on se relève, on ajuste. La confiance dans l'équilibre se construit comme ça — pas avant."
    },

    {
      type: "text",
      value: "Ça signifie qu'une première tentative imparfaite a plus de valeur réelle qu'un plan parfait qui n'a jamais été testé. Que l'imperfection du début n'est pas un problème à corriger avant de commencer — c'est une étape normale dans presque tout ce qui finit par bien fonctionner. Et que celui qui se dit « je ne suis pas encore prêt » n'est peut-être pas en train d'être prudent. Il est peut-être en train d'attendre une sensation qui n'arrive qu'après."
    },

    {
      type: "text",
      value: "Il y a des gens qui ont déjà commencé, sans l'avoir vraiment nommé.\n\nUn premier message envoyé à quelqu'un qui pourrait être intéressé. Une première offre formulée en deux phrases, sans logo, sans site. Un premier test posé simplement pour voir ce qui se passe.\n\nUne prestation rendue régulièrement, une compétence facturée de temps en temps, quelque chose qu'on fait « en parallèle » depuis des mois sans lui donner de nom parce qu'on attend que ça ressemble davantage à quelque chose. Il y a peut-être un numéro enregistré dans son téléphone sous « client », sans que le mot ait jamais été prononcé à voix haute. Ou une somme reçue pour quelque chose fait naturellement, notée quelque part, dans une case qu'on n'a pas encore su nommer."
    },

    {
      type: "text",
      value: "C'est déjà quelque chose. Même si ça ne ressemble pas encore à ce qu'on avait imaginé.\n\nIl y a eu des mois comme ça. Quelque chose en cours, sans encore savoir si ça allait vraiment devenir quelque chose. Je continuais."
    },

    {
      type: "text",
      value: "Commencer avant d'être prêt ne signifie pas commencer sans réfléchir. Ça signifie ne pas confondre la réflexion avec l'attente, ni la prudence avec l'immobilité.\n\nIl y a un moment — pas un moment parfait, juste un moment suffisant — où il devient possible de faire une première chose concrète. Pas le plan entier. Pas la version finale. Juste quelque chose de réel, même petit, même imparfait, qui a l'avantage d'exister.\n\nCe qui se construit ensuite est rarement ce qu'on avait prévu. Mais au moins, c'est réel."
    }

  ],

  exercices: []
}

// ── CHAPITRE 7 ───────────────────────────────────────────────

const CHAPTER_7 = {
  num: 7,
  titre: "Construire quelque chose de réel",
  duree_estimee: "6 min",
  completion_message: "Chapitre 7 terminé.",
  chapter_progress_label: "Chapitre 7",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Chapitre 7",
      value: "Il y a une différence entre comprendre quelque chose et décider de faire quelque chose avec ce qu'on a compris.\n\nLes deux sont nécessaires. Mais ce sont deux mouvements différents — et le passage de l'un à l'autre est l'endroit où beaucoup de choses se jouent."
    },

    {
      type: "text",
      value: "Ce qui reste après avoir traversé ces chapitres n'est pas forcément une clarté parfaite. C'est peut-être juste une façon légèrement différente de regarder sa propre situation. Un déplacement discret dans la façon de se voir — pas un bouleversement, juste une nuance.\n\nC'est souvent de là que quelque chose commence."
    },

    {
      type: "text",
      value: "Construire quelque chose de réel ne ressemble presque jamais à ce qu'on imagine depuis l'extérieur.\n\nÇa ressemble à des débuts hésitants. À des ajustements en cours de route. À des moments où l'on n'est pas sûr d'avancer dans la bonne direction, et où l'on continue quand même — parce que rester immobile n'est pas gratuit non plus."
    },

    {
      type: "text",
      value: "Il m'a fallu du temps pour comprendre ça autrement qu'en théorie. Recommencer après avoir arrêté n'a jamais ressemblé à un nouveau départ propre. Ça ressemblait à reprendre quelque chose de maladroit, avec les traces de ce qui avait déjà été tenté. Et c'est exactement comme ça que ça s'est construit."
    },

    {
      type: "text",
      value: "Ce que ça donne, dans la réalité, c'est rarement spectaculaire au début. Des choses qui fonctionnent. D'autres qui ne fonctionnent pas. Une démarche faite la semaine dernière, rangée sans en faire grand cas. Une conversation tenue, un premier essai posé quelque part. Sur le moment, ça ne ressemble pas à grand-chose. Une progression qui n'a pas la régularité qu'on aurait voulu — mais qui existe, réellement, quand on y revient quelques mois plus tard.\n\nEt c'est cette réalité-là — imparfaite, non linéaire, souvent silencieuse — qui finit par produire quelque chose de solide."
    },

    {
      type: "text",
      value: "La lecture s'arrête ici.\n\nCe qui suit n'est pas une évaluation. C'est simplement quelques questions — pour voir ce qui a bougé, ce qui mérite d'être regardé de plus près. Elles n'attendent pas de réponse parfaite."
    }

  ],

  exercices: []
}

// ── QUIZ (stub — non utilisé dans le flow V2) ─────────────────

const QUIZ = {
  config: {
    total_questions: 0,
    passing_score: 0,
    categories: [],
    selection_per_category: {},
    shuffle_questions: false,
    shuffle_options: false,
    feedback_mode: "instant",
    points_per_question: 1,
    max_attempts: 1,
    retry_cooldown_hours: 24,
    max_attempts_reached_message: "—"
  },
  pool: [],
  results: {
    success: {
      title: "—",
      message: "—",
      action: "—",
      cta_label: "—"
    },
    near_miss: {
      title: "—",
      message: "—",
      action: "—",
      cta_label: "—"
    },
    fail: {
      title: "—",
      message: "—",
      action: "—",
      cta_label: "—"
    },
    category_chapters: {}
  },
  admin: {
    reset_action: "—",
    fields_to_reset: [],
    audit_fields: [],
    confirmation_required: false,
    reason_field: {
      label: "—",
      placeholder: "—",
      obligatoire: false
    }
  }
}

// ── EXPORT ────────────────────────────────────────────────────

const PLAN_B_CONTENT = {
  intro: INTRO,
  chapters: [
    CHAPTER_1,
    CHAPTER_2,
    CHAPTER_3,
    CHAPTER_4,
    CHAPTER_5,
    CHAPTER_6,
    CHAPTER_7,
  ],
  quiz: QUIZ
}

const REQUIRED_EXERCISE_IDS = []

module.exports = { PLAN_B_CONTENT, REQUIRED_EXERCISE_IDS }
