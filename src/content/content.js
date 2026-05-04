// ============================================================
// PLAN B RENTABLE — content.js
// Fichier unifié — généré depuis les fichiers validés
// ============================================================
//
// ── TYPES D'EXERCICES ────────────────────────────────────────
// text               → réponse texte libre
// list               → liste d'items
// text_group         → groupe de champs texte (fields: [])
// selection          → choix unique (options: [] statique | source: string dynamique)
// commitment         → engagement avec confirmation (bouton/case)
// weighted_decision_matrix → matrice de décision pondérée
// generated_summary  → résumé généré depuis plusieurs exercices
//
// ── TYPES DE BLOCS CONTENU ───────────────────────────────────
// text, quote, story, pnl_pause, pnl_activation, exercise_inline, transition
//
// ── OBJET RACINE ─────────────────────────────────────────────
// PLAN_B_CONTENT.intro           → section "Avant de commencer"
// PLAN_B_CONTENT.chapters        → array CHAPTER_1..CHAPTER_10
// PLAN_B_CONTENT.quiz.config     → configuration du quiz
// PLAN_B_CONTENT.quiz.pool       → banque de 28 questions
// PLAN_B_CONTENT.quiz.results    → messages résultats (3 niveaux)
// PLAN_B_CONTENT.quiz.admin      → config réinitialisation admin
//
// REQUIRED_EXERCISE_IDS          → 42 IDs obligatoires pour déblocage quiz

// ── SECTION : AVANT DE COMMENCER ─────────────────────────────

const INTRO = {
  id: "avant_de_commencer",
  titre: "Avant de commencer",
  type: "intro",
  progression_rule: "none",

  contenu: [

    {
      type: "text",
      section: "Avant de commencer",
      value: "Il y a des moments dans la vie…\noù tu sens que quelque chose doit changer.\n\nTu avances. Tu fais ce que tu peux.\nTu gères tes responsabilités.\n\nMais au fond…\ntu sais que tu peux faire plus.\n\nOu autrement."
    },

    {
      type: "text",
      section: "Mot du coach",
      value: "Je suis Coach Redouane.\n\nSi j'ai créé ce parcours, ce n'est pas pour te vendre un rêve.\n\nC'est parce que j'ai vu beaucoup de personnes capables…\nmais bloquées par le manque de méthode, de clarté et de passage à l'action.\n\nMon objectif ici est simple :\nt'aider à commencer avec ce que tu as, là où tu es."
    },

    {
      type: "text",
      value: "Ce que tu vas faire ici… n'est pas magique.\n\nPas de promesse d'argent rapide.\nPas de méthode miracle.\n\nC'est une façon de voir les choses différemment.\nEt de reprendre le contrôle, étape par étape.",
      cta_label: "Je comprends"
    },

    {
      type: "text",
      value: "Tu n'as pas besoin de tout changer aujourd'hui.\n\nTu n'as pas besoin d'avoir beaucoup d'argent.\n\nTu n'as même pas besoin d'avoir toutes les réponses.\n\nTu as juste besoin de commencer… correctement.",
      cta_label: "Je t'écoute"
    },

    {
      type: "text",
      section: "Pour que ça marche",
      value: "Prends ton temps.\n\nLis.\nRéfléchis.\nRéponds aux questions.\n\nEt surtout… sois honnête avec toi-même.\n\nCe parcours ne fonctionne pas si tu lis seulement.\n\nIl fonctionne si tu fais.",
      cta_label: "D'accord"
    },

    {
      type: "text",
      value: "Ce que tu vas découvrir…\n\nne va peut-être pas toujours te mettre à l'aise.\n\nMais c'est souvent comme ça\nque les choses commencent à changer.",
      cta_label: "Je suis prêt(e)"
    },

    {
      type: "pnl_activation",
      value: "Ce qui va suivre va peut-être te faire voir ta situation autrement.\n\nEt c'est exactement le but.",
      display: "centered",
      interaction: "button",
      button_label: "Commencer →"
    }

  ]
};

// ── CHAPITRES ─────────────────────────────────────────────────

const CHAPTER_1 = {
  num: 1,
  titre: "Sécurité ou illusion ? Reprendre le contrôle",
  duree_estimee: "5 min",
  completion_message: "Excellent. Tu viens de poser les fondations. Tu es prêt(e) pour la suite.",
  chapter_progress_label: "Chapitre 1 · 3 exercices",
  progression_rule: "all_exercises",

  // Convention rendu texte :
  // \n  → retour à la ligne simple
  // \n\n → nouveau paragraphe (espace visuel)
  // section → label visible léger affiché uniquement au début d'une nouvelle section
  // interaction: "button" → bouton explicite à cliquer pour continuer

  contenu: [

    // ── Bloc 1 — Immersion ──────────────────────────────────────

    {
      type: "text",
      section: "Prise de conscience",
      value: "Il y a quelque chose que beaucoup de personnes ne réalisent pas tout de suite.\n\nTu avances. Tu fais ce que tu peux avec ce que tu as.\nTu gères tes responsabilités.\n\nEt avec le temps, tu t'habitues à cette stabilité.\nElle devient normale. Elle devient… rassurante.",
      cta_label: "Je t'écoute"
    },

    {
      type: "text",
      section: "Ce qu'on nous a appris",
      value: "On nous a appris que stabilité = sécurité.\n\nTrouver un travail. S'y accrocher.\nEt espérer que tout continue le plus longtemps possible.\n\nMais cette idée mérite d'être questionnée.\n\nParce qu'au fond, si ton revenu s'arrête aujourd'hui…\ncombien de temps tu tiens ?",
      cta_label: "Réfléchir"
    },

    {
      type: "exercise_inline",
      ref: "ch1_ex1"
    },

    // ── Bloc 2 — Histoire Mamadou ───────────────────────────────

    {
      type: "story",
      section: "Réalité terrain",
      value: "Je vais te parler de Mamadou.\n\nIl vit à Dakar. Ça fait plus de 10 ans qu'il travaille dans la même entreprise.\n\nSérieux. Régulier. Respecté.\n\nChaque mois, son salaire tombe.\nIl aide sa famille. Il avance… comme il peut.\n\nEt comme beaucoup…\nil pensait être en sécurité."
    },

    {
      type: "story",
      value: "Jusqu'au jour où son entreprise a commencé à parler de \"réorganisation\".\n\nAu début, personne ne s'inquiète vraiment.\n\nPuis les premières rumeurs arrivent.\n\nPuis les premiers départs.",
      cta_label: "Je comprends"
    },

    {
      type: "story",
      value: "Ce jour-là…\n\nMamadou se pose une question qu'il n'avait jamais vraiment affrontée :\n\n\"Si ça s'arrête… je fais quoi ?\"\n\nEt c'est là qu'il réalise quelque chose de dur.\n\nIl a travaillé pendant des années…\nsans jamais construire une alternative.\nSans jamais préparer un Plan B.",
      cta_label: "Je réalise"
    },

    {
      type: "pnl_pause",
      value: "Et si c'était toi… demain ?\n\nTon revenu. Tes repères.\nTon équilibre. Ta sécurité.\n\nEt si tout ça… dépendait d'une seule chose ?",
      display: "centered",
      interaction: "button",
      button_label: "Ça me concerne"
    },

    {
      type: "exercise_inline",
      ref: "ch1_ex2"
    },

    // ── Bloc 3 — Le vrai problème ───────────────────────────────

    {
      type: "text",
      section: "Le vrai problème",
      value: "Tu n'as pas besoin de tout changer.\n\nTu n'as pas besoin de quitter ton travail.\nNi de tout recommencer de zéro.\n\nCe que tu as construit a de la valeur.\n\nMais aujourd'hui…\nce n'est plus suffisant.\n\nParce que dépendre d'une seule source,\nc'est rester exposé.",
      cta_label: "Je comprends"
    },

    {
      type: "text",
      value: "Ce dont tu as besoin,\nce n'est pas de tout remplacer.\n\nC'est d'ajouter une option.\n\nUne deuxième possibilité.\nUne sécurité en plus.\n\nParce qu'un Plan B\nn'est pas un luxe.\n\nC'est une protection.",
      cta_label: "D'accord"
    },

    {
      type: "exercise_inline",
      ref: "ch1_ex3"
    },

    {
      type: "text",
      section: "Chapitre 1 — Terminé",
      value: "Tu viens de faire quelque chose\nque beaucoup de personnes évitent toute leur vie.\n\nRegarder la réalité en face.\n\nTu as compris une chose essentielle :\n\nCe n'est pas ton travail le problème.\nC'est de dépendre d'une seule source.\n\nEt maintenant, tu vois plus clair.",
      cta_label: "C'est parti"
    },

    {
      type: "text",
      value: "Tu es prêt pour la suite.\n\nDans le prochain chapitre,\non va passer à quelque chose de concret :\n\nTrouver une idée simple,\nréaliste\net faisable pour toi.\n\nPas une idée parfaite.\nUne idée que tu peux réellement lancer."
    }

  ],

  exercices: [

    {
      id: "ch1_ex1",
      type: "text",
      question: "Si ton revenu s'arrête aujourd'hui, combien de jours peux-tu tenir sans stress ?",
      placeholder: "Exemple : 30 jours, 60 jours...",
      aide: "Sois honnête. Ce chiffre n'est pas un jugement, c'est ton point de départ.",
      erreur: "Ne réponds pas avec une estimation idéale. Réponds avec la réalité.",
      success_message: "Parfait. Tu viens de voir ta réalité clairement.",
      obligatoire: true
    },

    {
      id: "ch1_ex2",
      type: "list",
      question: "Quels sont les 3 impacts réels si ton revenu s'arrête ?",
      fields: 3,
      fields_labels: ["Impact 1", "Impact 2", "Impact 3"],
      placeholders: [
        "Ex: Loyer impayé...",
        "Ex: École des enfants...",
        "Ex: Stress familial..."
      ],
      aide: "Pense à ta famille, tes charges, ton stress.",
      success_message: "Très bien. Tu comprends maintenant les conséquences réelles.",
      obligatoire: true
    },

    {
      id: "ch1_ex3",
      type: "text",
      question: "Complète cette phrase :\nJe choisis de ne plus dépendre uniquement de...",
      placeholder: "Écris ce qui te vient naturellement",
      aide: "Ne réfléchis pas trop. Écris ce que tu ressens.",
      success_message: "Décision prise. C'est le début du changement.",
      obligatoire: true
    }

  ]
};

const CHAPTER_2 = {
  num: 2,
  titre: "Trouver ton idée réaliste",
  duree_estimee: "12-15 min",
  completion_message: "Excellent. Tu as maintenant une idée de départ claire et réaliste.",
  chapter_progress_label: "Chapitre 2 · 5 exercices",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Sortir du flou",
      value: "Tu n'as pas besoin de trouver l'idée parfaite.\nTu as besoin de trouver une idée simple, réaliste et faisable avec ta situation actuelle."
    },

    {
      type: "quote",
      value: "Une bonne idée n'est pas forcément impressionnante.\nElle est claire, utile et possible à lancer."
    },

    {
      type: "text",
      value: "Beaucoup de personnes restent bloquées parce qu'elles cherchent l'idée du siècle.\nMais en réalité, les petits business qui démarrent vite sont souvent simples : un service utile, un besoin local, une compétence déjà présente."
    },

    {
      type: "pnl_pause",
      value: "Respire un instant.\nEt demande-toi : qu'est-ce que je sais déjà faire que d'autres trouvent utile ?",
      display: "centered",
      interaction: "button",
      button_label: "Je suis prêt(e) à explorer ✓"
    },

    {
      type: "exercise_inline",
      ref: "ch2_ex1"
    },

    {
      type: "text",
      section: "Les 3 angles",
      value: "Pour trouver une idée réaliste, on va croiser 3 angles :\n\n1. Ce que tu sais faire naturellement\n2. Les besoins autour de toi\n3. Ce qui se vend déjà dans ton environnement"
    },

    {
      type: "quote",
      value: "Ton idée se trouve souvent au croisement de tes capacités, des besoins réels et du marché."
    },

    {
      type: "exercise_inline",
      ref: "ch2_ex2"
    },

    {
      type: "text",
      value: "Maintenant, observe ton entourage.\nLes besoins sont souvent visibles : manque de temps, manque d'organisation, besoin de visibilité, besoin de service, besoin de simplification."
    },

    {
      type: "exercise_inline",
      ref: "ch2_ex3"
    },

    {
      type: "story",
      section: "Déclic terrain",
      value: "Natacha, à Abidjan, pensait ne pas avoir de talent particulier.\n\nElle disait : \"Je suis juste bonne avec les chiffres.\"\n\nMais chaque mois, elle aidait ses amies à organiser leur budget, éviter les dettes et mieux gérer leurs dépenses.\n\nUn jour, une amie lui dit :\n\"Pourquoi tu ne proposes pas ça comme service ? Beaucoup de personnes ont besoin de ça.\"\n\nCe jour-là, Natacha a compris quelque chose : ce qui lui semblait normal pouvait avoir de la valeur pour les autres."
    },

    {
      type: "quote",
      value: "Ce qui est facile pour toi peut être précieux pour quelqu'un d'autre."
    },

    {
      type: "exercise_inline",
      ref: "ch2_ex4"
    },

    {
      type: "text",
      section: "Choisir avec méthode",
      value: "Tu as maintenant plusieurs idées.\nMais tu ne vas pas choisir au hasard.\n\nOn va utiliser une matrice de décision simple pour identifier l'idée la plus réaliste."
    },

    {
      type: "text",
      value: "Chaque idée sera notée selon plusieurs critères importants : budget nécessaire, facilité de démarrage, demande locale, compétence personnelle, potentiel de revenu et temps disponible."
    },

    {
      type: "quote",
      value: "Un débutant ne doit pas choisir l'idée la plus brillante.\nIl doit choisir l'idée qu'il peut vraiment lancer."
    },

    {
      type: "exercise_inline",
      ref: "ch2_ex5"
    },

    {
      type: "pnl_activation",
      section: "Décision",
      value: "Regarde ton idée recommandée.\nNe cherche pas la perfection.\nCherche le premier mouvement.",
      display: "centered",
      interaction: "button",
      button_label: "J'accepte mon idée de départ ✓"
    },

    {
      type: "transition",
      value: "Maintenant que ton idée est choisie, on va passer à l'étape suivante : organiser ton temps pour avancer sans te disperser."
    }

  ],

  exercices: [

    {
      id: "ch2_ex1",
      type: "list",
      question: "Liste 5 idées de Plan B possibles, même si elles ne sont pas parfaites.",
      fields: 5,
      fields_labels: ["Idée 1", "Idée 2", "Idée 3", "Idée 4", "Idée 5"],
      placeholders: [
        "Ex: aider des commerçants avec WhatsApp...",
        "Ex: vendre des repas faits maison...",
        "Ex: créer des visuels simples...",
        "Ex: service de livraison locale...",
        "Ex: coaching budget personnel..."
      ],
      aide: "Ne juge pas tes idées maintenant. Écris d'abord. Le tri viendra après.",
      erreur: "Ne cherche pas l'idée parfaite dès le départ.",
      success_message: "Très bien. Tu as ouvert le champ des possibilités.",
      obligatoire: true
    },

    {
      id: "ch2_ex2",
      type: "text_group",
      question: "Identifie tes forces naturelles.",
      fields: [
        {
          id: "force_simple",
          label: "Ce qui te semble simple à faire",
          placeholder: "Ex: expliquer, organiser, cuisiner, vendre, écouter..."
        },
        {
          id: "force_remarquee",
          label: "Ce que les autres remarquent souvent chez toi",
          placeholder: "Ex: tu expliques bien, tu es organisé(e), tu aides facilement..."
        },
        {
          id: "force_energie",
          label: "Ce qui te donne de l'énergie quand tu le fais",
          placeholder: "Ex: parler aux gens, créer, conseiller, réparer..."
        }
      ],
      aide: "Une force naturelle est souvent quelque chose que tu fais sans effort, mais que les autres trouvent utile.",
      erreur: "Ne minimise pas ce qui te semble facile. C'est parfois là que se cache ta valeur.",
      success_message: "Parfait. Tu commences à voir ce que tu peux utiliser.",
      obligatoire: true
    },

    {
      id: "ch2_ex3",
      type: "list",
      question: "Quels sont 3 besoins réels que tu observes autour de toi ?",
      fields: 3,
      fields_labels: ["Besoin 1", "Besoin 2", "Besoin 3"],
      placeholders: [
        "Ex: les commerçants manquent de visibilité...",
        "Ex: les salariés n'ont pas le temps de cuisiner...",
        "Ex: les étudiants ont besoin d'aide pour s'organiser..."
      ],
      aide: "Regarde ton quartier, ton travail, ta famille, tes amis, les groupes WhatsApp ou Facebook.",
      erreur: "Ne choisis pas un besoin imaginaire. Observe ce que les gens demandent déjà.",
      success_message: "Très bien. Une idée rentable commence par un besoin réel.",
      obligatoire: true
    },

    {
      id: "ch2_ex4",
      type: "selection",
      question: "Parmi tes idées, sélectionne les 3 idées les plus réalistes à analyser.",
      source: "ch2_ex1",
      max_selection: 3,
      aide: "Choisis les idées que tu peux lancer avec peu de budget, rapidement, et sans bouleverser ta vie.",
      erreur: "Ne choisis pas l'idée qui impressionne le plus. Choisis celle que tu peux tester.",
      success_message: "Très bien. On va maintenant comparer ces idées avec méthode.",
      obligatoire: true
    },

    {
      id: "ch2_ex5",
      type: "weighted_decision_matrix",
      question: "Évalue tes 3 idées pour choisir la plus réaliste.",
      source: "ch2_ex4",
      scoring_scale: 5,
      tie_breaking: "first",
      criteria: [
        {
          id: "budget",
          label: "Budget nécessaire",
          weight: 5,
          helper: "Plus le budget est faible, meilleure est la note.",
          scale_low_label: "Budget élevé",
          scale_high_label: "Aucun budget nécessaire"
        },
        {
          id: "facilite",
          label: "Facilité de démarrage",
          weight: 5,
          helper: "Note haut si tu peux commencer rapidement."
        },
        {
          id: "demande_locale",
          label: "Demande locale",
          weight: 5,
          helper: "Note haut si tu vois déjà des gens qui ont ce besoin."
        },
        {
          id: "competence",
          label: "Compétence personnelle",
          weight: 4,
          helper: "Note haut si tu as déjà une base ou une facilité."
        },
        {
          id: "revenu",
          label: "Potentiel de revenu",
          weight: 4,
          helper: "Note haut si l'idée peut générer de l'argent rapidement."
        },
        {
          id: "temps",
          label: "Temps disponible",
          weight: 3,
          helper: "Plus l'idée s'adapte à ton emploi du temps, meilleure est la note.",
          scale_low_label: "Demande beaucoup de temps",
          scale_high_label: "S'adapte parfaitement"
        }
      ],
      result_label: "Idée recommandée",
      result_rank: true,
      result_explanation_template: "{{idee_nom}} est recommandée avec un score de {{score}} points. Elle semble la plus réaliste et faisable selon ta situation actuelle.",
      aide: "Note chaque critère de 1 à 5. Ne cherche pas la perfection. Cherche l'idée la plus lançable.",
      erreur: "Ne note pas selon ton rêve. Note selon ta réalité actuelle.",
      success_message: "Décision prise. Tu as maintenant une idée de départ claire.",
      obligatoire: true
    }

  ]
};

const CHAPTER_3 = {
  num: 3,
  titre: "Organiser ton temps et passer à l'action",
  duree_estimee: "10-12 min",
  completion_message: "Parfait. Tu as maintenant un plan simple et une routine pour agir chaque jour.",
  chapter_progress_label: "Chapitre 3 · 4 exercices",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Réalité du temps",
      value: "Tu n'as pas besoin de plus de temps.\nTu as besoin de mieux utiliser le temps que tu as déjà."
    },

    {
      type: "quote",
      value: "Le temps ne se trouve pas.\nIl se crée."
    },

    {
      type: "text",
      value: "Entre le travail, la famille et les obligations, il est normal de penser que tu n'as pas de temps.\nMais en réalité, il existe toujours des moments exploitables."
    },

    {
      type: "pnl_pause",
      value: "Arrête-toi un instant.\nPense à ta journée d'hier.\nOù as-tu perdu du temps ?",
      display: "centered",
      interaction: "button",
      button_label: "Je suis prêt(e) à analyser ✓"
    },

    {
      type: "exercise_inline",
      ref: "ch3_ex1"
    },

    {
      type: "text",
      section: "Créer ton créneau",
      value: "Ton Plan B n'a pas besoin de 5 heures par jour.\nIl a besoin de régularité.\n\nMême 30 à 60 minutes par jour peuvent changer ta situation sur 90 jours."
    },

    {
      type: "quote",
      value: "Ce n'est pas l'intensité qui change ta vie.\nC'est la constance."
    },

    {
      type: "exercise_inline",
      ref: "ch3_ex2"
    },

    {
      type: "story",
      section: "Discipline terrain",
      value: "Karim travaillait toute la journée et pensait ne jamais avoir le temps.\n\nIl a commencé avec seulement 30 minutes chaque soir.\n\nPas parfait.\nPas spectaculaire.\nMais constant.\n\nAprès quelques semaines, il avait déjà avancé plus que les gens qui attendaient le bon moment."
    },

    {
      type: "quote",
      value: "Un petit effort répété vaut plus qu'un grand effort occasionnel."
    },

    {
      type: "text",
      section: "Plan simple",
      value: "Tu n'as pas besoin d'un plan compliqué.\nTu as besoin d'un plan que tu peux suivre même les jours difficiles."
    },

    {
      type: "exercise_inline",
      ref: "ch3_ex3"
    },

    {
      type: "text",
      section: "Passer à l'action",
      value: "Le plus grand piège est d'attendre d'être prêt.\n\nTu ne seras jamais totalement prêt.\n\nL'action vient avant la confiance."
    },

    {
      type: "pnl_activation",
      value: "À partir d'aujourd'hui, tu avances chaque jour, même petit.",
      display: "centered",
      interaction: "button",
      button_label: "Je m'engage à agir chaque jour ✓"
    },

    {
      type: "exercise_inline",
      ref: "ch3_ex4"
    },

    {
      type: "transition",
      value: "Maintenant que tu es organisé, on va passer à l'étape suivante : tester ton idée dans la réalité."
    }

  ],

  exercices: [

    {
      id: "ch3_ex1",
      type: "list",
      question: "Identifie 3 moments dans ta journée où tu perds du temps.",
      fields: 3,
      fields_labels: ["Moment 1", "Moment 2", "Moment 3"],
      placeholders: [
        "Ex: scroll sur téléphone...",
        "Ex: télévision sans objectif...",
        "Ex: temps non structuré après le travail..."
      ],
      aide: "Sois honnête avec toi-même. Le but est de voir clair.",
      erreur: "Ne minimise pas ces moments.",
      success_message: "Parfait. Tu viens d'identifier du temps récupérable.",
      obligatoire: true
    },

    {
      id: "ch3_ex2",
      type: "selection",
      question: "Choisis ton créneau quotidien pour ton Plan B.",
      options: [
        "Matin avant le travail",
        "Pause déjeuner",
        "Soir après le travail",
        "Week-end uniquement",
        "Horaires variables"
      ],
      additional_input: true,
      additional_placeholder: "Précise ton créneau si nécessaire...",
      aide: "Choisis un moment réaliste que tu peux tenir chaque jour.",
      erreur: "Ne choisis pas un créneau idéal mais impossible.",
      success_message: "Très bien. Tu as maintenant ton créneau.",
      obligatoire: true
    },

    {
      id: "ch3_ex3",
      type: "text_group",
      question: "Définis ton plan d'action simple.",
      fields: [
        {
          id: "action_quotidienne",
          label: "Action quotidienne",
          placeholder: "Ex: contacter 3 personnes, créer 1 contenu..."
        },
        {
          id: "duree",
          label: "Durée quotidienne",
          placeholder: "Ex: 30 minutes, 1 heure..."
        },
        {
          id: "objectif_7j",
          label: "Objectif sur 7 jours",
          placeholder: "Ex: tester mon offre avec 2 personnes, envoyer 5 messages..."
        }
      ],
      aide: "Reste simple. Un plan compliqué ne sera pas suivi.",
      erreur: "Ne vise pas un résultat financier en 7 jours. Vise une première action concrète : un test, un contact, une conversation.",
      success_message: "Parfait. Ton plan est clair et réalisable.",
      obligatoire: true
    },

    {
      id: "ch3_ex4",
      type: "commitment",
      question: "Engage-toi à suivre ce plan pendant 7 jours.",
      confirmation_text: "Je m'engage à suivre mon plan pendant 7 jours",
      aide: "Ce n'est pas une promesse parfaite. C'est un engagement à avancer.",
      erreur: "Ce n'est pas un contrat parfait. C'est juste un premier engagement envers toi-même.",
      success_message: "Engagement validé. C'est le début du mouvement.",
      obligatoire: true
    }

  ]
};

const CHAPTER_4 = {
  num: 4,
  titre: "Construire les bases solides de ton activité",
  duree_estimee: "12-15 min",
  completion_message: "Excellent. Ton idée devient maintenant une offre claire et compréhensible.",
  chapter_progress_label: "Chapitre 4 · 5 exercices",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Clarifier ton offre",
      value: "Avoir une idée, c'est bien.\nMais une idée floue ne se vend pas.\n\nPour commencer, ton activité doit être simple à comprendre."
    },

    {
      type: "quote",
      value: "Les gens n'achètent pas ce qui est flou.\nIls achètent ce qu'ils comprennent rapidement."
    },

    {
      type: "text",
      value: "Ton objectif maintenant est de transformer ton idée en une phrase claire :\n\nJ'aide [type de personne] à [résultat concret].\n\nCommence par une première version instinctive. Tu l'amélioreras avec les exercices suivants."
    },

    {
      type: "exercise_inline",
      ref: "ch4_ex1"
    },

    {
      type: "text",
      section: "Choisir ton public",
      value: "Tu ne peux pas parler à tout le monde.\nEt ce n'est pas grave.\n\nPlus ton public est clair, plus ton message devient facile."
    },

    {
      type: "quote",
      value: "Quand tu parles à tout le monde, personne ne se sent vraiment concerné."
    },

    {
      type: "exercise_inline",
      ref: "ch4_ex2"
    },

    {
      type: "story",
      section: "Déclic terrain",
      value: "Yasmine, à Rabat, aimait cuisiner.\nAu départ, elle disait simplement : \"Je peux faire des plats.\"\n\nMais son message était trop vague.\n\nUn jour, elle a observé que beaucoup de salariés autour d'elle mangeaient vite, mal, ou n'avaient pas le temps de préparer leurs repas.\n\nElle a alors clarifié son offre :\n\"J'aide les salariés pressés à manger mieux pendant la semaine avec des repas faits maison prêts à emporter.\"\n\nÀ partir de ce moment, les gens comprenaient immédiatement ce qu'elle proposait."
    },

    {
      type: "quote",
      value: "Une offre claire donne envie d'écouter.\nUne offre floue fatigue l'esprit."
    },

    {
      type: "text",
      section: "Définir le bénéfice",
      value: "Les gens n'achètent pas seulement un produit ou un service.\nIls achètent un résultat, un soulagement, une facilité, un gain de temps ou une solution."
    },

    {
      type: "exercise_inline",
      ref: "ch4_ex3"
    },

    {
      type: "text",
      section: "Ton canevas simple",
      value: "Maintenant, on va rassembler les éléments importants dans un mini-canevas.\n\nTon offre doit être simple, réaliste et compréhensible en moins de 10 secondes."
    },

    {
      type: "exercise_inline",
      ref: "ch4_ex4"
    },

    {
      type: "exercise_inline",
      section: "Offre validée",
      ref: "ch4_ex5"
    },

    {
      type: "pnl_activation",
      value: "Relis ton offre.\nSi une personne peut comprendre rapidement ce que tu proposes, tu as déjà gagné en clarté.",
      display: "centered",
      interaction: "button",
      button_label: "Mon offre est claire ✓"
    },

    {
      type: "transition",
      value: "Maintenant que ton offre est claire, on va passer à l'étape suivante : créer une version simple à tester rapidement."
    }

  ],

  exercices: [

    {
      id: "ch4_ex1",
      type: "text",
      question: "Écris une première version instinctive de ton offre :\nJ'aide [qui] à [obtenir quoi].",
      placeholder: "Ex: J'aide les commerçants locaux à mieux présenter leurs produits sur WhatsApp.",
      aide: "C'est un brouillon. Ne cherche pas la perfection. Tu affineras cette phrase avec les exercices suivants.",
      erreur: "Évite les phrases vagues comme : j'aide tout le monde, je fais un peu de tout.",
      success_message: "Bon départ. On va maintenant affiner cette phrase étape par étape.",
      obligatoire: true
    },

    {
      id: "ch4_ex2",
      type: "text_group",
      question: "Clarifie ton public principal.",
      fields: [
        {
          id: "public_principal",
          label: "À qui tu t'adresses ?",
          placeholder: "Ex: petits commerçants, étudiants, salariés, mamans occupées..."
        },
        {
          id: "probleme_public",
          label: "Quel problème ont-ils ?",
          placeholder: "Ex: ils manquent de visibilité, de temps, d'organisation..."
        },
        {
          id: "ou_les_trouver",
          label: "Où peux-tu les trouver ?",
          placeholder: "Ex: WhatsApp, Facebook, quartier, travail, marché..."
        }
      ],
      aide: "Choisis un public que tu peux réellement atteindre facilement.",
      erreur: "Ne choisis pas un public trop large. Commence avec un groupe précis.",
      success_message: "Parfait. Ton public devient plus clair.",
      obligatoire: true
    },

    {
      id: "ch4_ex3",
      type: "text_group",
      question: "Définis le bénéfice concret de ton offre.",
      fields: [
        {
          id: "benefice_principal",
          label: "Quel résultat concret ton client obtient ?",
          placeholder: "Ex: plus de visibilité, gain de temps, meilleure organisation..."
        },
        {
          id: "soulagement",
          label: "Quel problème tu lui enlèves ?",
          placeholder: "Ex: il ne sait pas quoi publier, il manque de temps..."
        },
        {
          id: "raison_acheter",
          label: "Pourquoi il devrait payer pour ça ?",
          placeholder: "Ex: parce que ça l'aide à vendre plus facilement..."
        }
      ],
      aide: "Un bon bénéfice doit être simple et concret.",
      erreur: "Ne vends pas seulement ce que tu fais. Explique ce que ça change pour le client.",
      success_message: "Excellent. Tu clarifies maintenant la vraie valeur de ton offre.",
      obligatoire: true
    },

    {
      id: "ch4_ex4",
      type: "text_group",
      question: "Remplis ton mini-canevas d'offre.",
      fields: [
        {
          id: "offre",
          label: "Mon offre",
          placeholder: "Ex: création d'annonces WhatsApp pour commerçants"
        },
        {
          id: "public",
          label: "Mon public",
          placeholder: "Ex: petits commerçants locaux"
        },
        {
          id: "benefice",
          label: "Le bénéfice",
          placeholder: "Ex: mieux présenter leurs produits et attirer plus de clients"
        },
        {
          id: "prix_depart",
          label: "Prix de départ réaliste",
          placeholder: "Ex: 5 000 FCFA"
        }
      ],
      aide: "Utilise ce que tu as écrit dans l'exercice précédent, en une version plus simple et plus claire. Ton prix de départ doit être simple, accessible et facile à tester.",
      erreur: "Ne sous-estime pas ta valeur, mais commence avec un prix testable. Entre 5 000 et 20 000 FCFA pour un premier service, c'est souvent raisonnable.",
      success_message: "Très bien. Ton offre a maintenant une structure simple.",
      obligatoire: true
    },

    {
      id: "ch4_ex5",
      type: "generated_summary",
      question: "Voici la phrase finale de ton offre.",
      source: ["ch4_ex1", "ch4_ex2", "ch4_ex3", "ch4_ex4"],
      template: "J'aide {{public}} à {{benefice}} grâce à {{offre}}. Prix de départ : {{prix_depart}}.",
      variables_map: {
        public:      { exercise: "ch4_ex2", field: "public_principal" },
        benefice:    { exercise: "ch4_ex4", field: "benefice" },
        offre:       { exercise: "ch4_ex4", field: "offre" },
        prix_depart: { exercise: "ch4_ex4", field: "prix_depart" }
      },
      editable: true,
      result_preview: true,
      aide: "Tu peux modifier cette phrase pour qu'elle soit plus naturelle.",
      erreur: "Si la phrase est trop longue, simplifie-la. Elle doit être comprise en moins de 10 secondes.",
      success_message: "Offre validée. Tu peux maintenant la tester.",
      obligatoire: true
    }

  ]
};

const CHAPTER_5 = {
  num: 5,
  titre: "Répéter ce qui marche",
  duree_estimee: "10-12 min",
  completion_message: "Bien. Tu as maintenant une action à répéter. C'est là que tout commence vraiment.",
  chapter_progress_label: "Chapitre 5 · 4 exercices",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Réalité terrain",
      value: "Beaucoup de personnes commencent une activité avec de l'énergie.\nMais elles changent trop vite.\n\nUn jour elles font ça.\nLe lendemain, autre chose.\nLa semaine suivante, encore une nouvelle idée."
    },

    {
      type: "text",
      value: "Résultat :\nAucun système. Aucune stabilité. Aucun résultat visible."
    },

    {
      type: "quote",
      value: "Ce n'est pas ce que tu fais une fois qui change ta vie.\nC'est ce que tu répètes."
    },

    {
      type: "pnl_pause",
      value: "Pense à ta dernière semaine.\nAs-tu répété la même action… ou as-tu changé d'approche à chaque fois ?",
      display: "centered",
      interaction: "button",
      button_label: "Je suis prêt(e) à être honnête ✓"
    },

    {
      type: "text",
      section: "Prise de conscience",
      value: "Tu n'as pas besoin de faire plus.\nTu as besoin de faire mieux… et surtout de répéter."
    },

    {
      type: "text",
      value: "Beaucoup abandonnent une idée… alors qu'elle commençait juste à fonctionner.\n\nLe problème n'était pas l'idée.\nLe problème, c'était le manque de répétition."
    },

    {
      type: "text",
      value: "Et bonne nouvelle : tu n'as pas besoin de capital pour répéter.\nTu as besoin de constance."
    },

    {
      type: "exercise_inline",
      ref: "ch5_ex1"
    },

    {
      type: "story",
      section: "Déclic terrain",
      value: "Ibrahima, à Dakar, vendait des chaussures via WhatsApp.\n\nIl postait une photo… puis arrêtait.\nPuis changeait de produit.\nPuis essayait autre chose.\n\nRésultat : aucune vente régulière.\n\nLe jour où il a décidé de :\nPublier une photo chaque jour.\nRépondre à chaque message.\nRépéter le même produit pendant 3 semaines.\n\nLes ventes ont commencé.\n\nCe n'était pas le produit le problème.\nC'était le manque de répétition."
    },

    {
      type: "quote",
      value: "Un signal faible répété vaut plus qu'une grande idée abandonnée."
    },

    {
      type: "exercise_inline",
      ref: "ch5_ex2"
    },

    {
      type: "text",
      value: "Tu viens de faire un choix important.\n\nLa plupart des gens restent bloqués parce qu'ils ne décident pas.\nToi, tu viens de choisir une action.\n\nMaintenant, il ne reste qu'une chose : la répéter."
    },

    {
      type: "text",
      section: "Ce qui marche",
      value: "Ce qui marche, c'est simple :\nC'est ce qui provoque une réaction, même petite."
    },

    {
      type: "text",
      value: "Les signaux à observer :\n\nQuelqu'un répond à ton message.\nQuelqu'un pose une question sur ton produit.\nQuelqu'un montre de l'intérêt sur ton statut.\nQuelqu'un achète.\n\nMême un seul de ces signaux est une information précieuse.\nCela veut dire : continue, répète, insiste."
    },

    {
      type: "text",
      value: "Commence avec 3 à 5 personnes de confiance.\nTeste. Observe. Répète ce qui provoque une réaction.\n\nTu n'as pas besoin de toucher 1000 personnes pour commencer.\nTu as besoin de convaincre les premières."
    },

    {
      type: "exercise_inline",
      ref: "ch5_ex3"
    },

    {
      type: "text",
      section: "Engagement",
      value: "Le vrai but de cette étape n'est pas encore de gagner de l'argent.\n\nC'est de te prouver que tu peux avancer.\nQue tu peux être constant.\nQue tu peux créer un système simple."
    },

    {
      type: "text",
      value: "Quand tu répètes une action pendant 7 jours… quelque chose change en toi.\nTu n'attends plus la motivation pour agir.\nTu agis. Et la motivation suit."
    },

    {
      type: "exercise_inline",
      ref: "ch5_ex4"
    },

    {
      type: "pnl_activation",
      value: "La réussite ne vient pas d'une idée parfaite.\nElle vient d'une action répétée jusqu'à ce qu'elle fonctionne.",
      display: "centered",
      interaction: "button",
      button_label: "Je m'engage à répéter ✓"
    },

    {
      type: "transition",
      value: "Maintenant que tu sais répéter ce qui marche, on va passer à l'étape suivante : obtenir des retours réels du terrain."
    }

  ],

  exercices: [

    {
      id: "ch5_ex1",
      type: "text",
      question: "Qu'est-ce que tu as déjà fait qui a provoqué une réaction ?\n(message, intérêt, question, vente)",
      placeholder: "Ex: quelqu'un m'a demandé le prix / quelqu'un a répondu à mon statut...",
      aide: "Ne cherche pas grand. Même un petit signal compte.",
      erreur: "Ne dis pas que rien n'a marché. Il y a toujours un début. Cherche le moindre signe d'intérêt.",
      success_message: "Bien. Tu viens d'identifier un signal réel. C'est ton point de départ.",
      obligatoire: true
    },

    {
      id: "ch5_ex2",
      type: "text",
      question: "Parmi ce que tu as testé, qu'est-ce que tu peux répéter dès maintenant ?",
      placeholder: "Ex: publier mes produits sur WhatsApp tous les jours...",
      aide: "Choisis une action simple et faisable. Pas besoin de budget.",
      erreur: "Ne choisis pas 10 actions. Une seule action répétée vaut plus que dix actions abandonnées.",
      success_message: "Parfait. Tu as identifié ton action à répéter.",
      obligatoire: true
    },

    {
      id: "ch5_ex3",
      type: "text_group",
      question: "Crée ta routine simple de répétition.",
      fields: [
        {
          id: "action",
          label: "Action à répéter",
          placeholder: "Ex: publier sur WhatsApp, contacter 3 personnes..."
        },
        {
          id: "frequence",
          label: "Fréquence",
          placeholder: "Ex: tous les jours, 5 fois par semaine..."
        },
        {
          id: "duree",
          label: "Pendant combien de temps",
          placeholder: "Ex: 7 jours, 2 semaines..."
        }
      ],
      aide: "La clé est la régularité, pas la perfection. Une action imparfaite répétée vaut mieux qu'une action parfaite jamais faite.",
      erreur: "Ne choisis pas quelque chose de compliqué. Si tu ne peux pas le faire même fatigué, ce n'est pas la bonne routine.",
      success_message: "Ta routine est définie. Tiens-la.",
      obligatoire: true
    },

    {
      id: "ch5_ex4",
      type: "text",
      question: "Écris ton engagement :\nPendant X jours, je vais répéter cette action sans changer.",
      placeholder: "Ex: Pendant 7 jours, je publie tous les jours sans abandonner.",
      aide: "Engage-toi sur une durée courte mais réelle. 7 jours, c'est suffisant pour commencer.",
      erreur: "Ne dis pas \"je vais essayer\". Décide. Un engagement flou ne tient pas.",
      success_message: "Engagement pris. Reviens dans 7 jours avec tes observations.",
      obligatoire: true
    }

  ]
};

const CHAPTER_6 = {
  num: 6,
  titre: "Recommandations et témoignages",
  duree_estimee: "10-12 min",
  completion_message: "Très bien. Tu commences à construire ta crédibilité. Tes premiers témoignages font partie de ton système.",
  chapter_progress_label: "Chapitre 6 · 4 exercices",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Réalité terrain",
      value: "Tu n'as pas besoin de 1000 clients pour avancer.\n\nTu as besoin de quelques personnes satisfaites.\n\nParce que dans la réalité…\nune personne satisfaite peut t'en amener 2, 3, ou plus."
    },

    {
      type: "quote",
      value: "Un client satisfait vaut plus que 10 prospects silencieux."
    },

    {
      type: "pnl_pause",
      value: "Pense à une personne à qui tu as déjà rendu service.\nMême gratuitement.\n\nÉtait-elle satisfaite ?",
      display: "centered",
      interaction: "button",
      button_label: "Oui, je vois ✓"
    },

    {
      type: "text",
      section: "Prise de conscience",
      value: "Beaucoup de personnes font une erreur :\n\nElles attendent d'avoir un \"business parfait\" avant de demander un retour ou un témoignage.\n\nMauvaise stratégie.\n\nTu peux commencer dès maintenant.\nMême avec une petite action.\nMême avec un premier client."
    },

    {
      type: "exercise_inline",
      ref: "ch6_ex1"
    },

    {
      type: "story",
      section: "Déclic terrain",
      value: "Fatou, à Abidjan, faisait des coiffures à domicile.\n\nAu début, elle ne demandait rien à ses clientes.\n\nPuis un jour, elle a simplement demandé :\n\"Si tu es satisfaite, peux-tu m'envoyer un petit message ?\"\n\nElle a reçu :\nDes messages.\nDes vocaux.\nDes photos.\n\nElle a commencé à les publier sur son statut WhatsApp.\n\nRésultat : plus de confiance, plus de clientes.\n\nElle n'avait pas changé son service.\nElle avait juste rendu sa valeur visible."
    },

    {
      type: "quote",
      value: "Les gens font confiance aux autres clients, pas à toi."
    },

    {
      type: "exercise_inline",
      ref: "ch6_ex2"
    },

    {
      type: "text",
      section: "Construire ta crédibilité",
      value: "Un témoignage, c'est une preuve réelle.\n\nPas besoin de montage compliqué.\nJuste du vrai."
    },

    {
      type: "text",
      value: "Les types de preuves simples que tu peux collecter dès maintenant :\n\nUn message WhatsApp de satisfaction.\nUne capture d'écran d'un retour positif.\nUne note vocale d'un client heureux.\nUne photo avant et après.\n\nChaque preuve que tu collectes renforce ta crédibilité.\nChaque preuve publiée travaille pour toi."
    },

    {
      type: "exercise_inline",
      ref: "ch6_ex3"
    },

    {
      type: "exercise_inline",
      ref: "ch6_ex4"
    },

    {
      type: "text",
      value: "Tu viens de lancer quelque chose de très important.\n\nLa plupart des gens n'osent jamais demander un retour.\n\nToi, tu passes à l'action.\n\nEt c'est exactement comme ça que les premières opportunités arrivent."
    },

    {
      type: "text",
      section: "Engagement",
      value: "Le vrai but ici n'est pas seulement d'avoir des témoignages.\n\nC'est de renforcer ta confiance.\n\nQuand tu vois que les gens sont satisfaits…\ntu comprends que tu peux continuer.\n\nChaque client satisfait devient une pièce de ton système."
    },

    {
      type: "pnl_activation",
      value: "Tu n'as pas besoin d'être parfait.\nTu as besoin d'être utile.\n\nEt les gens le verront.",
      display: "centered",
      interaction: "button",
      button_label: "Je passe à l'action ✓"
    },

    {
      type: "transition",
      value: "Maintenant que tu commences à avoir des retours et de la crédibilité, on va structurer ta discipline pour avancer chaque jour."
    }

  ],

  exercices: [

    {
      id: "ch6_ex1",
      type: "text",
      question: "As-tu déjà aidé quelqu'un ou rendu un service ?\nQui et comment ?",
      placeholder: "Ex: oui, j'ai aidé un ami à organiser son commerce / une connaissance avec ses réseaux...",
      aide: "Même quelque chose de petit compte. Un service gratuit, une aide, un conseil.",
      erreur: "Ne dis pas non trop vite. Cherche bien dans les dernières semaines ou les derniers mois.",
      success_message: "Parfait. Tu as déjà une base réelle sur laquelle construire.",
      obligatoire: true
    },

    {
      id: "ch6_ex2",
      type: "text",
      question: "Écris un message simple pour demander un témoignage.",
      placeholder: "Ex: Salut, si tu es satisfait(e), peux-tu m'envoyer un petit message pour dire ce que tu penses ?",
      aide: "Sois naturel. Pas besoin de phrases compliquées. Un message court et sincère suffit.",
      erreur: "Ne fais pas un message trop long. Plus c'est court, plus les gens répondent.",
      success_message: "Excellent. Tu peux envoyer ce message dès aujourd'hui.",
      obligatoire: true
    },

    {
      id: "ch6_ex3",
      type: "text_group",
      question: "Organise ta collecte de preuves.",
      fields: [
        {
          id: "type_preuve",
          label: "Type de preuve que tu vas collecter",
          placeholder: "Ex: messages WhatsApp, photos, captures d'écran..."
        },
        {
          id: "ou_stocker",
          label: "Où tu vas les garder",
          placeholder: "Ex: dossier dans le téléphone, album photo, WhatsApp..."
        },
        {
          id: "comment_utiliser",
          label: "Comment tu vas les utiliser",
          placeholder: "Ex: publier sur statut WhatsApp, montrer aux nouveaux clients..."
        }
      ],
      aide: "Organise dès le début. Une preuve bien rangée est une preuve utilisable.",
      erreur: "Ne laisse pas les témoignages se perdre dans tes messages. Range-les dès que tu les reçois.",
      success_message: "Parfait. Tu construis ton système de crédibilité.",
      obligatoire: true
    },

    {
      id: "ch6_ex4",
      type: "text",
      question: "À combien de personnes vas-tu demander un témoignage aujourd'hui ou cette semaine ?",
      placeholder: "Ex: 2 personnes — mon ancienne cliente et mon ami que j'ai aidé...",
      aide: "Commence petit, mais commence. Une seule réponse positive peut changer ton énergie.",
      erreur: "Ne dis pas plus tard. Aujourd'hui, c'est le bon moment.",
      success_message: "Action lancée. Va leur envoyer le message que tu as écrit.",
      obligatoire: true
    }

  ]
};

const CHAPTER_7 = {
  num: 7,
  titre: "Routine et discipline",
  duree_estimee: "10-12 min",
  completion_message: "Bien. Tu as maintenant une routine et un système. La discipline se construit jour après jour.",
  chapter_progress_label: "Chapitre 7 · 4 exercices",
  progression_rule: "all_exercises",
  streak_tracking: true,
  streak_days: 7,

  contenu: [

    {
      type: "text",
      section: "Réalité terrain",
      value: "Au début, tu es motivé.\n\nTu veux avancer.\nTu veux réussir.\n\nMais après quelques jours…\nla motivation baisse.\n\nC'est normal."
    },

    {
      type: "quote",
      value: "La motivation commence le travail.\nLa discipline le termine."
    },

    {
      type: "pnl_pause",
      value: "Repense aux derniers jours.\n\nAs-tu toujours respecté ce que tu avais prévu ?",
      display: "centered",
      interaction: "button",
      button_label: "Je suis honnête ✓"
    },

    {
      type: "text",
      section: "Prise de conscience",
      value: "La vérité est simple :\n\nTu ne peux pas compter sur ta motivation.\n\nElle change.\nElle dépend de ton humeur.\nDe ta fatigue.\nDe ta journée.\n\nMais la discipline…\nelle se construit."
    },

    {
      type: "exercise_inline",
      ref: "ch7_ex1"
    },

    {
      type: "story",
      section: "Déclic terrain",
      value: "Aminata, à Dakar, voulait lancer son activité.\n\nElle était motivée au début.\n\nPuis la fatigue.\nLe travail.\nLa famille.\n\nElle a commencé à arrêter… puis reprendre… puis arrêter encore.\n\nJusqu'au jour où elle a décidé une chose simple :\n30 minutes par jour.\nPas plus.\nMais tous les jours.\n\nMême fatiguée.\nMême sans envie.\n\nQuelques semaines plus tard…\nelle avançait plus que jamais."
    },

    {
      type: "quote",
      value: "Ce n'est pas ce que tu fais quand tu es motivé qui compte.\nC'est ce que tu fais quand tu ne l'es pas."
    },

    {
      type: "text",
      section: "Construire ton système",
      value: "La discipline n'est pas compliquée.\n\nC'est juste :\nfaire la même action, chaque jour, même quand c'est difficile.\n\nPas parfait.\nPas long.\nMais régulier."
    },

    {
      type: "exercise_inline",
      ref: "ch7_ex2"
    },

    {
      type: "exercise_inline",
      ref: "ch7_ex3"
    },

    {
      type: "exercise_inline",
      ref: "ch7_ex4"
    },

    {
      type: "text",
      section: "Engagement",
      value: "À partir de maintenant, tu n'es plus quelqu'un qui essaie.\n\nTu es quelqu'un qui agit.\n\nMême quand c'est difficile.\nMême quand ce n'est pas parfait."
    },

    {
      type: "pnl_activation",
      value: "Tu n'as pas besoin d'être motivé.\nTu as besoin d'être constant.",
      display: "centered",
      interaction: "button",
      button_label: "Je deviens discipliné ✓"
    },

    {
      type: "transition",
      value: "Maintenant que tu avances chaque jour, on va passer à l'étape suivante : rendre ton message plus clair pour attirer plus de clients."
    }

  ],

  exercices: [

    {
      id: "ch7_ex1",
      type: "text",
      question: "Qu'est-ce qui t'empêche aujourd'hui d'être régulier ?",
      placeholder: "Ex: fatigue, manque de temps, distractions...",
      aide: "Sois honnête. C'est le point de départ pour construire quelque chose de solide.",
      erreur: "Ne blâme pas seulement l'extérieur. Cherche ce que tu peux contrôler dans ta situation.",
      success_message: "Bien. Tu identifies le vrai obstacle. C'est la première étape pour le dépasser.",
      obligatoire: true
    },

    {
      id: "ch7_ex2",
      type: "text",
      question: "Quelle est l'action la plus simple que tu peux faire chaque jour ?",
      placeholder: "Ex: publier sur WhatsApp, contacter 2 personnes, répondre aux messages...",
      aide: "Plus c'est simple, plus tu vas tenir. Cherche l'action minimale qui produit un résultat.",
      erreur: "Ne choisis pas une action difficile ou qui dépend d'autres facteurs. Choisis ce que tu contrôles seul.",
      success_message: "Parfait. C'est ton action de base. Elle devient ta fondation.",
      obligatoire: true
    },

    {
      id: "ch7_ex3",
      type: "text_group",
      question: "Crée ton système simple.",
      fields: [
        {
          id: "heure",
          label: "Quand ?",
          placeholder: "Ex: 20h chaque soir, 6h du matin..."
        },
        {
          id: "lieu",
          label: "Où ?",
          placeholder: "Ex: chambre, bureau, transports..."
        },
        {
          id: "action",
          label: "Action",
          placeholder: "Ex: publier sur WhatsApp, envoyer 2 messages..."
        }
      ],
      aide: "Un bon système enlève les décisions inutiles. Tu ne te demandes plus quoi faire — tu le fais.",
      erreur: "Ne laisse pas de flou. Plus c'est précis, plus ça fonctionne. Un créneau vague n'est jamais respecté.",
      success_message: "Ton système est prêt. Il ne reste plus qu'à l'activer.",
      obligatoire: true
    },

    {
      id: "ch7_ex4",
      type: "text",
      question: "Écris ton engagement :\nJe vais faire cette action chaque jour pendant 7 jours, même sans motivation.",
      placeholder: "Ex: Je publie chaque jour pendant 7 jours sans exception.",
      aide: "La discipline commence par une décision claire. Pas une intention — une décision.",
      erreur: "Ne dis pas \"je vais essayer\". Décide. Un engagement flou ne tient pas.",
      success_message: "Engagement validé. Tu viens de décider. Maintenant, tiens-le.",
      obligatoire: true
    }

  ]
};

const CHAPTER_8 = {
  num: 8,
  titre: "Un message clair qui attire",
  duree_estimee: "12-15 min",
  completion_message: "Bien. Tu as maintenant un message clair et tu es prêt(e) à le tester sur le terrain.",
  chapter_progress_label: "Chapitre 8 · 4 exercices",
  progression_rule: "all_exercises",
  // message_sent_tracking: true  → À activer plus tard : suivre si l'utilisateur a vraiment envoyé son message

  contenu: [

    {
      type: "text",
      section: "Réalité terrain",
      value: "Beaucoup de personnes ont une bonne offre…\n\nMais personne ne comprend ce qu'elles proposent.\n\nRésultat :\nPas de réponse.\nPas de clients.\n\nPas parce que l'offre est mauvaise.\nParce que le message n'est pas clair."
    },

    {
      type: "quote",
      value: "Si les gens ne comprennent pas, ils n'achètent pas."
    },

    {
      type: "pnl_pause",
      value: "Si quelqu'un voit ton message aujourd'hui…\ncomprendra-t-il immédiatement ce que tu proposes ?",
      display: "centered",
      interaction: "button",
      button_label: "Je réfléchis ✓"
    },

    {
      type: "text",
      section: "Prise de conscience",
      value: "Si tu n'es pas sûr(e)… c'est normal.\nLa plupart des gens ne savent pas encore comment parler de leur offre.\n\nC'est exactement pour ça qu'on est là."
    },

    {
      type: "text",
      value: "Ton message doit être :\nsimple\nclair\nrapide à comprendre\n\nEn moins de 5 secondes.\n\nSi la personne doit réfléchir pour comprendre…\nelle passe."
    },

    {
      type: "exercise_inline",
      ref: "ch8_ex1"
    },

    {
      type: "text",
      value: "Maintenant, observe ce qui se passe quand quelqu'un décide de simplifier son message."
    },

    {
      type: "story",
      section: "Déclic terrain",
      value: "Ousmane, à Dakar, proposait ses services depuis plusieurs semaines.\n\nSon message était long.\nCompliqué.\nFlou.\n\nIl disait : \"Je suis dans le digital, je peux faire des choses pour aider les entreprises à se développer sur les réseaux sociaux et à améliorer leur communication en ligne.\"\n\nPersonne ne répondait.\n\nPuis il a tout simplifié :\n\"Je crée des visuels simples pour aider les commerçants à vendre sur WhatsApp.\"\n\nUne seule phrase.\nClaire. Directe. Précise.\n\nLes gens ont commencé à répondre."
    },

    {
      type: "quote",
      value: "Un message simple vaut plus qu'un message intelligent mais compliqué."
    },

    {
      type: "text",
      section: "Construire ton message",
      value: "Ton message doit répondre à 3 questions seulement :\n\n1. Pour qui ?\n2. Tu fais quoi ?\n3. Quel résultat ?\n\nC'est tout.\n\nSi tu réponds à ces 3 questions en une phrase…\nton message est prêt."
    },

    {
      type: "exercise_inline",
      ref: "ch8_ex2"
    },

    {
      type: "text",
      value: "Maintenant, il faut rendre ce message naturel.\n\nSur WhatsApp, les gens ne lisent pas des publicités.\nIls lisent des messages d'humains.\n\nParle comme tu parles. Simplement."
    },

    {
      type: "exercise_inline",
      ref: "ch8_ex3"
    },

    {
      type: "exercise_inline",
      ref: "ch8_ex4"
    },

    {
      type: "text",
      section: "Engagement",
      value: "Tu n'as pas besoin d'un message parfait.\n\nTu as besoin d'un message clair.\n\nEt c'est en l'envoyant que tu vas l'améliorer.\n\nChaque réponse que tu reçois t'apprend quelque chose.\nChaque silence aussi."
    },

    {
      type: "pnl_activation",
      value: "Tu ne vas pas attendre.\nTu vas envoyer ton message.\n\nC'est comme ça que tout commence.",
      display: "centered",
      interaction: "button",
      button_label: "J'envoie mon message ✓"
    },

    {
      type: "transition",
      value: "Maintenant que tu sais parler de ton offre, on va voir comment fixer un prix juste et vendre sans bloquer."
    }

  ],

  exercices: [

    {
      id: "ch8_ex1",
      type: "text",
      question: "Écris ton message actuel.\n(Ce que tu dirais à quelqu'un si tu lui présentais ton activité.)",
      placeholder: "Ex: je fais du marketing, je propose des services, je vends des produits...",
      aide: "Écris ce que tu dis aujourd'hui, même si ce n'est pas parfait. Sois naturel.",
      erreur: "Ne réfléchis pas trop. Ce n'est pas le message final — c'est le point de départ.",
      success_message: "Parfait. On a ton message de départ. On va maintenant le transformer.",
      obligatoire: true
    },

    {
      id: "ch8_ex2",
      type: "text",
      question: "Réécris ton message de manière simple :\nJ'aide [qui] à [résultat] grâce à [offre].",
      placeholder: "Ex: J'aide les commerçants à vendre plus sur WhatsApp grâce à des visuels simples.",
      aide: "Une seule phrase. Clair. Direct. Réponds aux 3 questions : pour qui, tu fais quoi, quel résultat.",
      erreur: "Ne rajoute pas trop d'informations. Si ta phrase dépasse 2 lignes, elle est encore trop longue.",
      success_message: "Excellent. Ton message devient compréhensible en moins de 5 secondes.",
      obligatoire: true
    },

    {
      id: "ch8_ex3",
      type: "text",
      question: "Transforme ton message en version WhatsApp — naturelle et courte.",
      placeholder: "Ex: Salut, j'aide les commerçants à vendre plus sur WhatsApp avec des visuels simples. Si ça t'intéresse, dis-moi.",
      aide: "Parle comme si tu écrivais à un ami. Pas de formules de politesse excessives. Pas de majuscules partout.",
      erreur: "Ne fais pas un message trop formel ou trop long. Un message WhatsApp naturel est court, direct, humain.",
      success_message: "Très bien. Ce message peut être envoyé aujourd'hui.",
      obligatoire: true
    },

    {
      id: "ch8_ex4",
      type: "text",
      question: "À combien de personnes vas-tu envoyer ce message ?\n(Et quand ?)",
      placeholder: "Ex: 3 personnes aujourd'hui — mon ami commerçant, ma cousine, mon collègue...",
      aide: "Commence petit mais commence. Si personne ne répond, ce n'est pas un échec — c'est une information. Ajuste le message et réessaie.",
      erreur: "Ne dis pas plus tard. Le meilleur moment pour envoyer ton message, c'est maintenant.",
      success_message: "Action lancée. Va envoyer ton message avant de passer à la suite.",
      obligatoire: true
    }

  ]
};

const CHAPTER_9 = {
  num: 9,
  titre: "Fixer ton prix et vendre sans bloquer",
  duree_estimee: "12-15 min",
  completion_message: "Bien. Tu as maintenant un prix, une phrase de vente et une première cible. Tu es prêt(e) à vendre.",
  chapter_progress_label: "Chapitre 9 · 5 exercices",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Réalité terrain",
      value: "Beaucoup de personnes arrivent à ce stade…\n\nElles ont :\nune idée\nune offre\nun message\n\nMais elles bloquent ici :\nle prix.\n\nPas parce que leur offre ne vaut rien.\nParce qu'elles ont peur de demander."
    },

    {
      type: "quote",
      value: "Ce n'est pas le prix qui bloque.\nC'est la peur de demander."
    },

    {
      type: "pnl_pause",
      value: "Quand tu penses à demander de l'argent…\nqu'est-ce que tu ressens ?",
      display: "centered",
      interaction: "button",
      button_label: "Je suis honnête ✓"
    },

    {
      type: "text",
      section: "Prise de conscience",
      value: "Ce que tu ressens est normal.\n\nLa plupart des débutants ressentent la même chose :\n\n\"Je ne suis pas encore prêt.\"\n\"Je ne suis pas expert.\"\n\"Les gens ne vont pas payer.\"\n\nCes pensées sont des réflexes naturels.\nPas des vérités."
    },

    {
      type: "text",
      value: "La vérité est simple :\n\nSi tu aides quelqu'un à résoudre un problème…\ntu mérites d'être payé.\n\nLes gens ne paient pas ton diplôme.\nIls ne paient pas ton expérience.\nIls paient le résultat que tu leur apportes."
    },

    {
      type: "exercise_inline",
      ref: "ch9_ex1"
    },

    {
      type: "text",
      value: "Maintenant, regarde ce qui se passe quand quelqu'un dépasse ce blocage."
    },

    {
      type: "story",
      section: "Déclic terrain",
      value: "Moussa, à Bamako, aidait des commerçants à prendre des photos de leurs produits.\n\nAu début, il le faisait gratuitement.\nIl pensait ne pas être assez bon pour être payé.\n\nPuis un jour, un client lui a demandé :\n\"Combien tu prends ?\"\n\nIl a hésité.\nPuis il a dit : \"3 000 FCFA.\"\n\nLe client a accepté immédiatement.\n\nCe jour-là, Moussa a compris quelque chose d'important :\n\nCe n'était pas une question de perfection.\nC'était une question de valeur."
    },

    {
      type: "quote",
      value: "Les gens ne paient pas la perfection.\nIls paient une solution."
    },

    {
      type: "text",
      section: "Ton prix",
      value: "Ton prix doit être :\nsimple\nréaliste\nfacile à accepter\n\nTu n'as pas besoin du prix parfait.\nTu as besoin d'un prix test.\n\nUn prix que tu peux dire à voix haute, sans baisser les yeux."
    },

    {
      type: "exercise_inline",
      ref: "ch9_ex2"
    },

    {
      type: "exercise_inline",
      ref: "ch9_ex3"
    },

    {
      type: "text",
      value: "Maintenant que tu connais ta valeur et ton prix…\nil te faut une phrase simple pour le proposer.\n\nPas un discours.\nPas une présentation.\nUne phrase."
    },

    {
      type: "exercise_inline",
      ref: "ch9_ex4"
    },

    {
      type: "text",
      value: "Tu as une phrase.\nTu as un prix.\n\nIl reste une seule chose :\nchoisir la première personne à qui tu vas la dire."
    },

    {
      type: "exercise_inline",
      ref: "ch9_ex5"
    },

    {
      type: "text",
      section: "Engagement",
      value: "Tu n'as pas besoin d'être parfait pour vendre.\n\nTu as besoin d'être utile.\nEt d'oser proposer.\n\nUn refus n'est pas un jugement.\nC'est une information.\nEt chaque refus te rapproche d'un oui."
    },

    {
      type: "pnl_activation",
      value: "Tu ne vas pas attendre.\n\nTu vas proposer ton offre avec ton prix.\n\nC'est comme ça que les premières ventes arrivent.",
      display: "centered",
      interaction: "button",
      button_label: "Je propose mon offre ✓"
    },

    {
      type: "transition",
      value: "Maintenant que tu peux vendre, on va voir comment trouver encore plus de clients autour de toi."
    }

  ],

  exercices: [

    {
      id: "ch9_ex1",
      type: "text",
      question: "Qu'est-ce qui te bloque aujourd'hui pour demander un prix ?",
      placeholder: "Ex: peur du refus, sentiment de ne pas mériter, manque de confiance...",
      aide: "Écris ce que tu ressens vraiment. Il n'y a pas de mauvaise réponse ici.",
      erreur: "Ne dis pas je ne sais pas. Tu ressens quelque chose. Prends le temps de l'identifier.",
      success_message: "Bien. Tu mets des mots sur ton blocage. C'est la première étape pour le dépasser.",
      obligatoire: true
    },

    {
      id: "ch9_ex2",
      type: "text",
      question: "Quel est un prix simple et réaliste pour commencer ?",
      placeholder: "Ex: 2 000 FCFA, 5 000 FCFA, 10 000 FCFA...",
      aide: "Choisis un prix que tu es à l'aise de proposer aujourd'hui. Pas le prix idéal — le prix que tu peux dire sans bloquer.",
      erreur: "Ne cherche pas le prix parfait. Un prix trop bas vaut mieux qu'un prix jamais proposé. Tu augmenteras plus tard.",
      success_message: "Très bien. Tu as maintenant un prix de départ. Il évoluera avec ton expérience.",
      obligatoire: true
    },

    {
      id: "ch9_ex3",
      type: "text",
      question: "Pourquoi ton service vaut ce prix ?",
      placeholder: "Ex: ça aide à vendre plus, ça fait gagner du temps, ça résout un vrai problème...",
      aide: "Pense au résultat pour le client, pas à ton niveau. Ce que tu apportes a de la valeur.",
      erreur: "Ne te sous-estime pas. Si ton service aide quelqu'un, il vaut le prix que tu demandes.",
      success_message: "Excellent. Tu comprends ta valeur. Garde cette réponse en tête quand tu hésites.",
      obligatoire: true
    },

    {
      id: "ch9_ex4",
      type: "text",
      question: "Écris ta phrase pour proposer ton service avec ton prix.",
      placeholder: "Ex: Je peux t'aider à améliorer tes visuels pour 3 000 FCFA. Tu veux qu'on essaie ?",
      aide: "Simple. Direct. Sans justification compliquée. Tu proposes une solution, pas une excuse.",
      erreur: "Ne t'excuse pas de proposer un prix. Ne dis pas \"c'est peut-être trop cher mais...\". Propose avec confiance.",
      success_message: "Parfait. Cette phrase est prête. Tu peux la dire ou l'écrire dès aujourd'hui.",
      obligatoire: true
    },

    {
      id: "ch9_ex5",
      type: "text",
      question: "À qui vas-tu proposer ton offre aujourd'hui ?\n(Prénom ou description)",
      placeholder: "Ex: mon ami commerçant du quartier, ma collègue qui voulait des visuels...",
      aide: "Commence avec quelqu'un de simple — quelqu'un que tu connais déjà. Le premier client est souvent dans ton entourage.",
      erreur: "Ne dis pas plus tard. La première vente ne se fait pas en attendant. Elle se fait en proposant.",
      success_message: "Action lancée. Va lui envoyer ton message avec ta phrase et ton prix.",
      obligatoire: true
    }

  ]
};

const CHAPTER_10 = {
  num: 10,
  titre: "Ton futur commence maintenant",
  duree_estimee: "10-12 min",
  completion_message: "Bien. Tu as terminé le parcours. Tu sais où tu vas et tu sais ce que tu dois faire. Continue chaque jour.",
  chapter_progress_label: "Chapitre 10 · 4 exercices",
  progression_rule: "all_exercises",

  contenu: [

    {
      type: "text",
      section: "Regard en arrière",
      value: "Arrête-toi un instant.\n\nRegarde ce que tu viens de faire.\n\nTu es parti de :\ndoutes\nincertitudes\nflou\n\nEt aujourd'hui :\ntu as une idée\nune offre\nun message\nun prix\nune action en cours\n\nCe n'est pas rien."
    },

    {
      type: "quote",
      value: "Ce que tu viens de construire, beaucoup ne le font jamais."
    },

    {
      type: "pnl_pause",
      value: "Prends quelques secondes.\n\nRéalise le chemin que tu viens de parcourir.",
      display: "centered",
      interaction: "button",
      button_label: "Je réalise ✓"
    },

    {
      type: "text",
      section: "Prise de conscience",
      value: "La différence entre toi et beaucoup de personnes :\n\nTu es passé à l'action.\n\nPas parfait.\nPas facile.\nMais réel."
    },

    {
      type: "text",
      value: "Tu as fait ce que la plupart ne font jamais.\n\nTu as commencé.\nTu as continué.\nTu as construit quelque chose.\n\nMême imparfait — c'est réel."
    },

    {
      type: "exercise_inline",
      ref: "ch10_ex1"
    },

    {
      type: "text",
      value: "Observe maintenant ce qui se passe quand quelqu'un décide simplement de commencer."
    },

    {
      type: "story",
      section: "Déclic terrain",
      value: "Cheikh, à Dakar, avait toujours des idées.\n\nMais il ne passait jamais à l'action.\n\nUn jour, il a décidé de tester.\n\nPetit.\nImparfait.\nMais réel.\n\nQuelques semaines plus tard :\npremiers retours\npremiers clients\nplus de confiance\n\nPas parce qu'il était meilleur que les autres.\n\nParce qu'il a commencé."
    },

    {
      type: "quote",
      value: "Ce n'est pas celui qui sait le plus qui réussit.\nC'est celui qui agit."
    },

    {
      type: "text",
      section: "La suite",
      value: "Ce que tu as fait n'est pas une fin.\n\nC'est un début.\n\nLe vrai travail commence maintenant :\n\nrépéter\naméliorer\najuster\ncontinuer"
    },

    {
      type: "exercise_inline",
      ref: "ch10_ex2"
    },

    {
      type: "exercise_inline",
      ref: "ch10_ex3"
    },

    {
      type: "text",
      section: "Engagement",
      value: "Tu as une direction.\nTu as une action.\n\nIl reste une décision à prendre."
    },

    {
      type: "exercise_inline",
      ref: "ch10_ex4"
    },

    {
      type: "text",
      value: "À partir de maintenant, tu n'es plus quelqu'un qui cherche.\n\nTu es quelqu'un qui construit.\n\nChaque jour.\nPetit à petit.\nMais réellement."
    },

    {
      type: "pnl_activation",
      value: "Tu as commencé.\n\nEt tu ne vas pas t'arrêter.\n\nParce que ton futur dépend de ce que tu fais maintenant.",
      display: "centered",
      interaction: "button",
      button_label: "Je continue ✓"
    },

    {
      type: "transition",
      value: "Tu peux maintenant continuer avec le programme complet 90 jours pour structurer et accélérer tes résultats."
    }

  ],

  exercices: [

    {
      id: "ch10_ex1",
      type: "text",
      question: "Qu'est-ce que tu as appris sur toi pendant ce parcours ?",
      placeholder: "Ex: que je peux agir, que j'avais peur pour rien, que je suis capable de tenir...",
      aide: "Réfléchis à ton évolution, pas seulement aux résultats. Ce que tu as appris sur toi est aussi précieux.",
      erreur: "Ne minimise pas ton parcours. Tu as fait quelque chose que beaucoup n'ont pas fait.",
      success_message: "Parfait. Tu prends conscience de ton évolution.",
      obligatoire: true
    },

    {
      id: "ch10_ex2",
      type: "text",
      question: "Où veux-tu être dans 30 jours si tu continues à ce rythme ?",
      placeholder: "Ex: avoir 3 clients, être plus à l'aise à proposer, générer mes premiers revenus...",
      aide: "Sois réaliste mais ambitieux. 30 jours, c'est court — vise quelque chose d'atteignable avec ce que tu fais déjà.",
      erreur: "Ne vise pas trop loin. Concentre-toi sur le prochain mois, pas les 5 prochaines années.",
      success_message: "Très bien. Tu as une direction.",
      obligatoire: true
    },

    {
      id: "ch10_ex3",
      type: "text",
      question: "Quelle est la prochaine action que tu vas continuer dès demain ?",
      placeholder: "Ex: envoyer des messages, publier sur WhatsApp, parler à des clients potentiels...",
      aide: "Continue ce que tu as déjà commencé. Ne change pas tout — améliore ce qui fonctionne.",
      erreur: "Ne change pas tout. Ce qui a produit un résultat, même petit, mérite d'être continué.",
      success_message: "Parfait. Tu restes en mouvement.",
      obligatoire: true
    },

    {
      id: "ch10_ex4",
      type: "text",
      question: "Écris ton engagement :\nJe continue, même quand c'est difficile.",
      placeholder: "Ex: Je continue chaque jour, même sans motivation.",
      aide: "Ce chapitre n'est pas une fin. C'est un départ. Un engagement écrit tient mieux qu'une intention.",
      erreur: "Ne dis pas je vais essayer. Décide. Un engagement flou ne tient pas.",
      success_message: "Engagement validé. Tu ne reviens pas en arrière.",
      obligatoire: true
    }

  ]
};

// ── QUIZ DE VALIDATION ───────────────────────────────────────

const QUIZ_CONFIG = {
  total_questions: 10,
  passing_score: 7,
  categories: ["mindset", "idee", "action", "vente"],
  selection_per_category: {
    mindset: 3,
    idee: 2,
    action: 3,
    vente: 2
  },
  shuffle_questions: true,
  shuffle_options: true,
  feedback_mode: "instant",
  points_per_question: 1,
  max_attempts: 3,
  retry_cooldown_hours: 24,
  max_attempts_reached_message: "Tu as utilisé tes 3 tentatives. Contacte-nous pour obtenir un accompagnement personnalisé."
};

// ── POOL : 28 QUESTIONS — 617 400 COMBINAISONS POSSIBLES ─────

const QUIZ_POOL = [

  // ═══════════════════════════════════════════
  // MINDSET — 8 questions (sélection : 3)
  // Tests : posture, discipline, résilience
  // ═══════════════════════════════════════════

  {
    id: "m1",
    category: "mindset",
    question: "Quelle est la vraie différence entre motivation et discipline ?",
    options: [
      "La motivation est stable, la discipline change",
      "La discipline permet d'agir même sans motivation",
      "Les deux sont identiques",
      "La motivation suffit pour réussir"
    ],
    correct: "La discipline permet d'agir même sans motivation",
    explanation: "La motivation varie. La discipline permet d'agir même quand elle disparaît."
  },

  {
    id: "m2",
    category: "mindset",
    question: "Pourquoi attendre le bon moment pour commencer est une erreur ?",
    options: [
      "Parce que le bon moment n'existe pas — il se crée par l'action",
      "Parce que c'est trop long d'attendre",
      "Parce que tout le monde attend",
      "Parce que c'est trop compliqué"
    ],
    correct: "Parce que le bon moment n'existe pas — il se crée par l'action",
    explanation: "Le bon moment n'arrive jamais. Il est créé par l'action."
  },

  {
    id: "m3",
    category: "mindset",
    question: "Que signifie vraiment passer à l'action ?",
    options: [
      "Lire et réfléchir longuement avant de commencer",
      "Planifier jusqu'à être totalement prêt",
      "Faire, même de manière imparfaite",
      "Attendre d'avoir toutes les ressources nécessaires"
    ],
    correct: "Faire, même de manière imparfaite",
    explanation: "L'action vient avant la perfection. Un résultat imparfait vaut mieux qu'un projet jamais lancé."
  },

  {
    id: "m4",
    category: "mindset",
    question: "Quel est le principal blocage au démarrage d'une activité ?",
    options: [
      "Le manque d'argent",
      "Le manque d'idées",
      "Le manque de clarté et de passage à l'action",
      "Le manque de temps"
    ],
    correct: "Le manque de clarté et de passage à l'action",
    explanation: "Le vrai blocage est mental, pas matériel. La clarté vient en agissant."
  },

  {
    id: "m5",
    category: "mindset",
    question: "Pourquoi la répétition est-elle plus importante que l'inspiration ?",
    options: [
      "Parce qu'elle permet de gagner du temps",
      "Parce que c'est ce qui produit des résultats concrets",
      "Parce que tout le monde répète",
      "Parce qu'elle évite les erreurs"
    ],
    correct: "Parce que c'est ce qui produit des résultats concrets",
    explanation: "Ce n'est pas l'idée brillante qui change les choses. C'est l'action répétée jusqu'à ce qu'elle fonctionne."
  },

  {
    id: "m6",
    category: "mindset",
    question: "Tu proposes ton offre à quelqu'un et il refuse. Que fais-tu ?",
    options: [
      "Tu arrêtes de proposer pendant quelques semaines",
      "Tu changes d'activité",
      "Tu analyses la réaction et tu continues à proposer",
      "Tu baisses immédiatement ton prix"
    ],
    correct: "Tu analyses la réaction et tu continues à proposer",
    explanation: "Un refus n'est pas un échec. C'est une information. Chaque refus te rapproche d'un oui."
  },

  {
    id: "m7",
    category: "mindset",
    question: "Tu n'as aucune envie de travailler ce soir. Que fais-tu ?",
    options: [
      "Tu regardes des vidéos de motivation avant de commencer",
      "Tu attends demain pour être en forme",
      "Tu fais quand même ton action du jour, même petite",
      "Tu prends une pause de quelques jours pour récupérer"
    ],
    correct: "Tu fais quand même ton action du jour, même petite",
    explanation: "La discipline, c'est agir sans motivation. C'est ce qui distingue ceux qui avancent."
  },

  {
    id: "m8",
    category: "mindset",
    question: "Ça fait 3 semaines que tu travailles et tu n'as toujours pas de client. Quelle est la bonne réaction ?",
    options: [
      "Changer complètement d'activité",
      "Faire une pause pour réfléchir",
      "Continuer, ajuster le message, rester régulier",
      "Investir dans la publicité payante immédiatement"
    ],
    correct: "Continuer, ajuster le message, rester régulier",
    explanation: "Les premiers résultats arrivent après la régularité, pas avant. Ajuste — ne cède pas."
  },

  // ═══════════════════════════════════════════
  // IDEE — 6 questions (sélection : 2)
  // Tests : validation, choix, critères
  // ═══════════════════════════════════════════

  {
    id: "i1",
    category: "idee",
    question: "Une bonne idée de Plan B doit avant tout être :",
    options: [
      "Complexe et innovante",
      "Simple et faisable avec ce que tu as aujourd'hui",
      "Unique au monde",
      "Très technique"
    ],
    correct: "Simple et faisable avec ce que tu as aujourd'hui",
    explanation: "Une idée simple est plus facile à lancer, à tester et à améliorer."
  },

  {
    id: "i2",
    category: "idee",
    question: "Une bonne idée se trouve à l'intersection de :",
    options: [
      "Argent + chance",
      "Compétence + besoin réel + marché accessible",
      "Réseau + publicité",
      "Temps + motivation"
    ],
    correct: "Compétence + besoin réel + marché accessible",
    explanation: "Sans ces trois éléments réunis, une idée reste une idée."
  },

  {
    id: "i3",
    category: "idee",
    question: "Pourquoi utiliser une matrice de décision pour choisir son idée ?",
    options: [
      "Pour compliquer le processus de décision",
      "Pour choisir rationnellement l'idée la plus réaliste",
      "Pour gagner du temps sans réfléchir",
      "Pour éviter d'avoir trop d'idées"
    ],
    correct: "Pour choisir rationnellement l'idée la plus réaliste",
    explanation: "La matrice enlève l'émotion du choix et met en avant ce qui est vraiment faisable."
  },

  {
    id: "i4",
    category: "idee",
    question: "Que faut-il absolument éviter au début ?",
    options: [
      "Tester une idée rapidement",
      "Changer constamment d'idée avant d'obtenir un résultat",
      "Parler de son idée à des clients potentiels",
      "Commencer avec une offre simple"
    ],
    correct: "Changer constamment d'idée avant d'obtenir un résultat",
    explanation: "Changer d'idée à répétition empêche de voir les résultats. C'est la régularité qui révèle le potentiel."
  },

  {
    id: "i5",
    category: "idee",
    question: "Quelle est la principale raison de commencer avec une offre simple ?",
    options: [
      "Pour paraître professionnel immédiatement",
      "Pour tester rapidement la réaction du marché",
      "Pour impressionner les concurrents",
      "Pour garantir de gagner de l'argent dès le début"
    ],
    correct: "Pour tester rapidement la réaction du marché",
    explanation: "On ne sait pas ce qui fonctionne avant de tester. Commencer simple permet d'apprendre vite."
  },

  {
    id: "i6",
    category: "idee",
    question: "Quel est le signe concret qu'une idée mérite d'être développée ?",
    options: [
      "Elle est très originale et personne ne l'a jamais faite",
      "Quelqu'un a montré un intérêt concret ou est prêt à payer",
      "Elle est difficile à copier",
      "Elle nécessite un investissement important"
    ],
    correct: "Quelqu'un a montré un intérêt concret ou est prêt à payer",
    explanation: "Une idée validée par le marché vaut plus que mille idées validées par soi-même."
  },

  // ═══════════════════════════════════════════
  // ACTION — 7 questions (sélection : 3)
  // Tests : routine, terrain, premiers clients
  // ═══════════════════════════════════════════

  {
    id: "a1",
    category: "action",
    question: "Quelle durée quotidienne minimum suffit pour avancer régulièrement ?",
    options: [
      "5 minutes",
      "30 minutes",
      "3 heures",
      "Toute la journée libre"
    ],
    correct: "30 minutes",
    explanation: "La régularité compte plus que la durée. 30 minutes par jour, tous les jours, produit plus que 5 heures une fois par semaine."
  },

  {
    id: "a2",
    category: "action",
    question: "Pourquoi créer une routine de travail ?",
    options: [
      "Pour gagner du temps sur les tâches",
      "Pour éviter de réfléchir à quoi faire",
      "Pour être régulier sans dépendre de la motivation",
      "Pour travailler plus longtemps chaque jour"
    ],
    correct: "Pour être régulier sans dépendre de la motivation",
    explanation: "Une routine enlève les décisions inutiles. Tu n'as plus à décider si tu travailles — tu le fais."
  },

  {
    id: "a3",
    category: "action",
    question: "Quelle est la clé pour tenir une routine sur le long terme ?",
    options: [
      "Trouver la motivation chaque matin",
      "Définir une action simple, précise et répétable chaque jour",
      "Avoir des objectifs très ambitieux",
      "Changer son action chaque semaine pour rester intéressé"
    ],
    correct: "Définir une action simple, précise et répétable chaque jour",
    explanation: "Un bon système enlève les décisions inutiles. Tu ne te demandes plus quoi faire — tu le fais."
  },

  {
    id: "a4",
    category: "action",
    question: "Quel est le but principal du premier test terrain ?",
    options: [
      "Gagner beaucoup d'argent rapidement",
      "Observer la réaction réelle du marché",
      "Se perfectionner avant de proposer",
      "Créer un produit parfait"
    ],
    correct: "Observer la réaction réelle du marché",
    explanation: "Tester, c'est apprendre. Chaque réaction — même négative — est une information précieuse."
  },

  {
    id: "a5",
    category: "action",
    question: "Que signifie le silence d'un client potentiel ?",
    options: [
      "Un échec définitif",
      "Un rejet personnel",
      "Une information : ajuster le message ou la cible",
      "Un problème insurmontable"
    ],
    correct: "Une information : ajuster le message ou la cible",
    explanation: "Le silence indique que quelque chose dans le message ou la cible est à ajuster — pas que l'idée est mauvaise."
  },

  {
    id: "a6",
    category: "action",
    question: "Qu'apporte un témoignage client avant tout ?",
    options: [
      "De l'argent supplémentaire directement",
      "De la crédibilité visible pour les clients suivants",
      "Du temps gagné",
      "De nouvelles idées de produits"
    ],
    correct: "De la crédibilité visible pour les clients suivants",
    explanation: "Les gens font confiance aux autres clients, pas aux promesses. Un témoignage travaille pour toi en permanence."
  },

  {
    id: "a7",
    category: "action",
    question: "Pourquoi commencer avec 3 à 5 personnes de confiance ?",
    options: [
      "Pour avoir un grand réseau rapidement",
      "Pour tester sans pression et observer les premières réactions",
      "Pour gagner plus vite",
      "Pour éviter les concurrents"
    ],
    correct: "Pour tester sans pression et observer les premières réactions",
    explanation: "Les premières personnes permettent de tester et d'ajuster avant de s'adresser à un marché plus large."
  },

  // ═══════════════════════════════════════════
  // VENTE — 7 questions (sélection : 2)
  // Tests : message, prix, proposition
  // ═══════════════════════════════════════════

  {
    id: "v1",
    category: "vente",
    question: "Pourquoi ton message doit-il être compris en moins de 5 secondes ?",
    options: [
      "Pour impressionner le client",
      "Parce qu'un message compris immédiatement déclenche l'action",
      "Pour paraître plus professionnel",
      "Pour être plus court que la concurrence"
    ],
    correct: "Parce qu'un message compris immédiatement déclenche l'action",
    explanation: "Si la personne doit réfléchir pour comprendre, elle passe. La clarté crée l'engagement."
  },

  {
    id: "v2",
    category: "vente",
    question: "Que doit contenir un bon message de vente ?",
    options: [
      "Beaucoup d'informations pour tout expliquer",
      "Une promesse floue mais attractive",
      "Pour qui, quel résultat, quelle solution",
      "Des détails techniques sur le service"
    ],
    correct: "Pour qui, quel résultat, quelle solution",
    explanation: "Ces 3 éléments répondent à la question du client : est-ce fait pour moi ?"
  },

  {
    id: "v3",
    category: "vente",
    question: "Pourquoi les gens paient-ils pour un service ?",
    options: [
      "Pour le prix compétitif",
      "Pour la qualité perçue",
      "Pour la solution à un problème réel",
      "Pour la marque ou la notoriété"
    ],
    correct: "Pour la solution à un problème réel",
    explanation: "Les gens ne paient pas un diplôme ou une expérience. Ils paient le résultat que tu leur apportes."
  },

  {
    id: "v4",
    category: "vente",
    question: "Quel est le bon prix quand on démarre ?",
    options: [
      "Le plus élevé possible pour paraître sérieux",
      "Le plus bas possible pour attirer le maximum",
      "Un prix test réaliste que tu peux proposer avec confiance",
      "Un prix calculé au centime près après une étude de marché"
    ],
    correct: "Un prix test réaliste que tu peux proposer avec confiance",
    explanation: "Tu n'as pas besoin du prix parfait. Tu as besoin d'un prix que tu peux dire à voix haute, sans hésiter."
  },

  {
    id: "v5",
    category: "vente",
    question: "Quelle est la première étape concrète pour obtenir une vente ?",
    options: [
      "Créer un site web professionnel",
      "Lancer une campagne publicitaire",
      "Proposer directement son offre à quelqu'un",
      "Attendre que les clients viennent naturellement"
    ],
    correct: "Proposer directement son offre à quelqu'un",
    explanation: "La première vente ne vient pas d'un site ou d'une publicité. Elle vient d'une proposition directe."
  },

  {
    id: "v6",
    category: "vente",
    question: "Que fais-tu si personne ne répond à ton premier message ?",
    options: [
      "Tu arrêtes de proposer",
      "Tu ajustes le message et tu réessaies",
      "Tu baisses ton prix immédiatement",
      "Tu changes d'activité"
    ],
    correct: "Tu ajustes le message et tu réessaies",
    explanation: "Le silence n'est pas un rejet — c'est une information. Ajuste le message ou la cible, et continue."
  },

  {
    id: "v7",
    category: "vente",
    question: "Pour quoi les clients paient-ils réellement ?",
    options: [
      "Pour ton expérience et tes années de pratique",
      "Pour ton diplôme et ta formation",
      "Pour le résultat concret que tu leur apportes",
      "Pour ta notoriété sur les réseaux sociaux"
    ],
    correct: "Pour le résultat concret que tu leur apportes",
    explanation: "Les gens ne paient pas ton parcours. Ils paient ce que tu leur apportes comme solution."
  }

];

// ── RÉSULTATS — 3 NIVEAUX + FEEDBACK PAR CATÉGORIE ───────────

const QUIZ_RESULTS = {

  success: {
    min_score: 7,
    title: "Parcours validé.",
    message: "Tu as compris les bases. Tu es prêt(e) à passer à l'étape suivante.",
    action: "unlock_offre_2",
    cta_label: "Accéder au programme 90 jours →"
  },

  near_miss: {
    score_range: [5, 6],
    title: "Tu es presque là.",
    message: "Il te manque peu de chose. Revois les chapitres liés à {{weak_categories}} et réessaie dans 24 heures.",
    action: "retry",
    cta_label: "Revoir et réessayer"
  },

  fail: {
    score_range: [0, 4],
    title: "Continue à apprendre.",
    message: "Les bases sont là — prends le temps de les ancrer. Revois le parcours depuis le début et réessaie.",
    action: "restart_book",
    cta_label: "Revoir le parcours"
  },

  // Mapping catégorie → chapitres à revoir (injecté dans {{weak_categories}})
  category_chapters: {
    mindset: "Chapitres 1, 3, 5, 7",
    idee: "Chapitres 2, 3",
    action: "Chapitres 5, 6, 7",
    vente: "Chapitres 8, 9"
  }

};

// ── ADMIN — RÉINITIALISATION MANUELLE DES TENTATIVES ─────────

// Objectif : permettre à l'admin de débloquer un utilisateur
// sans toucher au reste de son compte (progression livre, exercices, etc.)
//
// Cas d'usage :
// - Testeur bloqué injustement (bug, problème de connexion)
// - Contenu du quiz corrigé après que l'utilisateur ait échoué
// - Accompagnement personnalisé Coach Redouane
//
// Champs Supabase concernés (table : quiz_attempts) :
// - attempt_count       → remettre à 0
// - last_attempt_at     → remettre à null
// - is_locked           → remettre à false
// - admin_reset_at      → horodatage de la réinitialisation (audit)
// - admin_reset_by      → id de l'admin qui a effectué l'action (audit)
// - admin_reset_reason  → motif saisi par l'admin (optionnel, texte libre)
//
// Action admin (dashboard) :
// - Rechercher l'utilisateur par email
// - Afficher son statut quiz : tentatives utilisées / score dernier essai / date dernier essai
// - Bouton "Réinitialiser les tentatives"
// - Modal de confirmation avec champ "Motif" (optionnel)
// - Confirmation → écriture en base + log d'audit

const QUIZ_ADMIN = {
  reset_action: "quiz_attempts_reset",
  fields_to_reset: [
    { field: "attempt_count",    value: 0    },
    { field: "last_attempt_at",  value: null },
    { field: "is_locked",        value: false }
  ],
  audit_fields: [
    "admin_reset_at",
    "admin_reset_by",
    "admin_reset_reason"
  ],
  confirmation_required: true,
  reason_field: {
    label: "Motif de la réinitialisation",
    placeholder: "Ex: testeur bloqué, contenu corrigé, accompagnement coach...",
    obligatoire: false
  }
};

// ── OBJET RACINE ─────────────────────────────────────────────

export const PLAN_B_CONTENT = {
  intro: INTRO,
  chapters: [
    CHAPTER_1,
    CHAPTER_2,
    CHAPTER_3,
    CHAPTER_4,
    CHAPTER_5,
    CHAPTER_6,
    CHAPTER_7,
    CHAPTER_8,
    CHAPTER_9,
    CHAPTER_10,
  ],
  quiz: {
    config: QUIZ_CONFIG,
    pool: QUIZ_POOL,
    results: QUIZ_RESULTS,
    admin: QUIZ_ADMIN,
  },
}

// ── IDS DES EXERCICES OBLIGATOIRES ───────────────────────────
// Utilisé pour le check de déblocage quiz :
// quiz débloqué si exercise_responses contient tous ces IDs pour l'utilisateur

export const REQUIRED_EXERCISE_IDS = [
  "ch1_ex1",
  "ch1_ex2",
  "ch1_ex3",
  "ch2_ex1",
  "ch2_ex2",
  "ch2_ex3",
  "ch2_ex4",
  "ch2_ex5",
  "ch3_ex1",
  "ch3_ex2",
  "ch3_ex3",
  "ch3_ex4",
  "ch4_ex1",
  "ch4_ex2",
  "ch4_ex3",
  "ch4_ex4",
  "ch4_ex5",
  "ch5_ex1",
  "ch5_ex2",
  "ch5_ex3",
  "ch5_ex4",
  "ch6_ex1",
  "ch6_ex2",
  "ch6_ex3",
  "ch6_ex4",
  "ch7_ex1",
  "ch7_ex2",
  "ch7_ex3",
  "ch7_ex4",
  "ch8_ex1",
  "ch8_ex2",
  "ch8_ex3",
  "ch8_ex4",
  "ch9_ex1",
  "ch9_ex2",
  "ch9_ex3",
  "ch9_ex4",
  "ch9_ex5",
  "ch10_ex1",
  "ch10_ex2",
  "ch10_ex3",
  "ch10_ex4"
]
