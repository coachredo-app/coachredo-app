-- ============================================================
-- Migration 013 — Fondation MPD V3 (Mon point de départ)
-- ============================================================
-- MIGRATION CANDIDATE — NON EXÉCUTÉE. Rédigée pour audit QG uniquement.
-- NE PAS EXÉCUTER directement — exécution manuelle par le QG, après audit.
--
-- Implémente le modèle physique verrouillé par T4 + corrections T4.1 +
-- Security Gate S1 (intégration cross-snapshot + réduction du privilège
-- analytique), lui-même une traduction physique de D-028 (contrat métier
-- MPD V3 → MFR V3) et D-029 (architecture logique de persistance).
--
-- Additive stricte :
--   - Aucune table V2 modifiée (bilan_sessions, bilan_responses, rapports,
--     profiles, book_access, access_codes, chapter_progress,
--     exercise_responses, quiz_attempts, coaching_*, trading_*).
--   - Aucune donnée V2 migrée ou touchée.
--   - Aucun comportement V2 modifié.
--   - MPD V3 utilise des structures entièrement dédiées, réutilisant
--     uniquement les patterns déjà éprouvés de ce repo (RLS ownership,
--     RPC SECURITY DEFINER à privilège minimal, auth.uid() exclusif,
--     verrouillage FOR UPDATE, idempotence par contrainte unique nommée),
--     jamais les tables V2 elles-mêmes (D-029, Candidate B).
--
-- FRONTIÈRE EXPLICITE RUNTIME (TypeScript) ↔ DB (cette migration) :
--   La définition canonique des questions (formulation, choix, triggers
--   déterministes D-026, nature métier/éligibilité D→E) vit exclusivement
--   en code TypeScript versionné (D-029 §F) — jamais dupliquée en DB.
--   En conséquence, cette migration NE VALIDE JAMAIS elle-même :
--     - qu'un payload correspond à la forme attendue pour une question
--       donnée (nécessite de connaître la définition canonique) ;
--     - qu'une question est actuellement applicable (nécessite d'évaluer
--       les triggers déterministes D-026) ;
--     - quelles questions doivent transitionner vers « devenue inactive »
--       suite à une modification amont (même raison).
--   Ces déterminations appartiennent à la Server Action appelante, selon
--   le flux verrouillé par D-031 : Server Action → validation canonique
--   TypeScript → dépôt privilégié de l'attestation (via le client
--   backend service_role, Section 1/5) → RPC appelée sous JWT utilisateur
--   → lecture/consommation de l'attestation par la RPC. Aucune de ces
--   listes déjà calculées (questions à désactiver, questions actuellement
--   applicables, libellés de choix historiques) n'est jamais transmise
--   comme paramètre libre aux RPC — elles sont lues depuis l'attestation
--   canonique, sous le même verrou de dossier. Les RPC de cette migration
--   ne vérifient elles-mêmes que ce que la DB peut réellement vérifier
--   sans connaître cette définition : cohérence structurelle (statut
--   fermé, cohérence statut/payload), ownership, concurrence, et
--   cohérence ensembliste (« chaque question annoncée applicable
--   possède-t-elle une réponse ? »). Voir note détaillée avant chaque
--   fonction. Ce choix est documenté ici comme une frontière assumée,
--   pas une simplification silencieuse (demande explicite QG, phase T5).
--
-- STATUTS MPD (D-030) ET CONFIANCE CANONIQUE (D-031, D-032) :
--   Le statut d'une instance de réponse MPD est {DECLARE, INCONNU, REFUS}
--   — REFUS est un choix explicite de non-réponse pour une question qui
--   l'offre, sans signification psychologique propre, à éligibilité
--   question-par-question laissée à la définition canonique TypeScript
--   (jamais vérifiée en DB, cf. frontière ci-dessus).
--
--   Les deux RPC ci-dessous (Sections 6/7) ne reçoivent aucun paramètre
--   client libre déterminant une décision canonique (version déployée,
--   désactivations, questions applicables, libellés historiques) : ces
--   décisions sont calculées exclusivement par la Server Action et
--   déposées, avant l'appel RPC, dans mpd_attestations_canoniques
--   (D-031) — une attestation consommée exactement une fois, liée à la
--   valeur exacte soumise (comparaison structurelle jsonb native, jamais
--   un hash ni une resérialisation texte). L'état logique source
--   (Section 2) ne contient jamais que les réponses appartenant à
--   l'ensemble exact des questions applicables attesté (D-032) — jamais
--   une copie brute de l'état courant.
--
--   Création des attestations : capacité backend privilégiée (client
--   service_role existant, jamais un rôle Postgres nouveau), utilisée
--   uniquement pour déposer l'attestation — jamais pour muter l'état MPD
--   ni construire le snapshot directement, qui restent réservés aux RPC
--   sous JWT utilisateur. service_role conserve son pouvoir global ; seule
--   sa surface d'usage applicative est réduite. Détail Section 1 (table
--   mpd_attestations_canoniques) et Section 5.
--
-- ANALYSE POST-COLLECTE (mfr_*) — VOLONTAIREMENT INCOMPLÈTE :
--   Les 4 tables de la couche Analyse sont créées avec leur schéma complet
--   (y compris la correction cross-snapshot du Security Gate S1), RLS
--   totalement fermée à authenticated/anon. AUCUNE fonction d'écriture
--   n'est créée dans cette migration : le Security Gate S1 a retenu comme
--   cible une capacité backend à privilège minimal (rôle Postgres dédié,
--   jamais authenticated, jamais service_role global) — mais la
--   disponibilité réelle de ce mécanisme dans l'environnement Supabase du
--   projet n'a pas pu être vérifiée (aucun accès production dans cette
--   session). Exposer une RPC d'écriture analytique à authenticated
--   serait une vulnérabilité réelle (un utilisateur pourrait s'auto-
--   insérer une proposition fabriquée). Sécurité conservatrice retenue :
--   la couche Analyse reste donc sans aucun chemin d'écriture dans cette
--   migration, jusqu'à vérification et décision explicite du mécanisme
--   d'authentification du futur processus analytique.
--
-- Bornes techniques : quelques contraintes de taille généreuses (payload
-- JSONB, longueur d'identifiant) sont posées comme filet de sécurité
-- structurel contre un abus grossier — ce ne sont PAS des limites produit
-- (nombre d'items, longueur de texte réellement pertinente pour l'UX),
-- qui restent à définir séparément et n'ont pas été inventées ici.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- SECTION 1 — COLLECTE / PERSISTANCE MPD
-- ────────────────────────────────────────────────────────────

-- ── TABLE : mpd_dossiers ──────────────────────────────────────
-- Ancrage mutable d'un parcours MPD V3. Aucun champ analytique,
-- aucun score, aucune progression, aucun diagnostic (rejetés par D-029).
create table if not exists public.mpd_dossiers (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  revision      integer     not null default 0 check (revision >= 0),
  est_courant   boolean     not null default true,
  cree_le       timestamptz not null default now(),
  revision_le   timestamptz not null default now(),
  constraint mpd_dossiers_user_id_id_key unique (user_id, id)
);

-- Au plus un dossier « courant » par utilisateur — mirroring exact de
-- idx_bilan_sessions_one_active (005_bilan_sessions.sql).
create unique index if not exists idx_mpd_dossiers_courant
  on public.mpd_dossiers (user_id)
  where est_courant;

create index if not exists idx_mpd_dossiers_user
  on public.mpd_dossiers (user_id);


-- ── TABLE : mpd_reponses_courantes ────────────────────────────
-- État courant mutable : au plus une réponse active par question et par
-- dossier. Statut = {DECLARE, INCONNU, REFUS} (D-030). REFUS est un
-- statut système à part entière : un choix explicite de non-réponse pour
-- une question qui l'offre, sans signification psychologique propre,
-- éligibilité question-par-question laissée à la définition canonique
-- TypeScript (frontière assumée, D-029 §F) — jamais vérifiée en DB.
create table if not exists public.mpd_reponses_courantes (
  id                  uuid        primary key default gen_random_uuid(),
  dossier_id          uuid        not null,
  user_id             uuid        not null,
  question_id         text        not null check (length(question_id) between 1 and 100),
  statut              text        not null check (statut in ('DECLARE','INCONNU','REFUS')),
  payload             jsonb       check (payload is null or octet_length(payload::text) < 100000),
  version_definition  text        not null check (length(version_definition) between 1 and 100),
  cree_le             timestamptz not null default now(),
  modifie_le          timestamptz not null default now(),
  constraint mpd_reponses_courantes_dossier_question_key unique (dossier_id, question_id),
  constraint mpd_reponses_courantes_statut_payload_check check (
    (statut = 'DECLARE' and payload is not null)
    or
    (statut in ('INCONNU','REFUS') and payload is null)
  ),
  -- FK composite ownership : garantit déclarativement que user_id
  -- correspond exactement au propriétaire réel du dossier (T4.1 §B).
  constraint mpd_reponses_courantes_dossier_fkey
    foreign key (user_id, dossier_id)
    references public.mpd_dossiers (user_id, id)
    on delete cascade
);

create index if not exists idx_mpd_reponses_courantes_dossier
  on public.mpd_reponses_courantes (dossier_id);


-- ── TABLE : mpd_historique_evenements ─────────────────────────
-- Journal CONTRÔLÉ — jamais un log de chaque autosave/frappe (T4.1 §B/§C
-- correction, append-only intégral explicitement rejeté). Peuplé
-- exclusivement par la RPC d'écriture, au seul moment où une question
-- devenue inactive perd sa ligne dans l'état courant. La consommation
-- MFR n'y est JAMAIS dupliquée — elle a son propre mécanisme (snapshot).
create table if not exists public.mpd_historique_evenements (
  id                uuid        primary key default gen_random_uuid(),
  dossier_id        uuid        not null,
  user_id           uuid        not null,
  question_id       text        not null check (length(question_id) between 1 and 100),
  type_evenement    text        not null check (type_evenement in ('DEVENUE_INACTIVE')),
  statut_capture    text        not null check (statut_capture in ('DECLARE','INCONNU','REFUS')),
  payload_capture   jsonb       check (payload_capture is null or octet_length(payload_capture::text) < 100000),
  cree_le           timestamptz not null default now(),
  constraint mpd_historique_evenements_statut_payload_check check (
    (statut_capture = 'DECLARE' and payload_capture is not null)
    or
    (statut_capture in ('INCONNU','REFUS') and payload_capture is null)
  ),
  constraint mpd_historique_evenements_dossier_fkey
    foreign key (user_id, dossier_id)
    references public.mpd_dossiers (user_id, id)
    on delete cascade
);

create index if not exists idx_mpd_historique_dossier_question
  on public.mpd_historique_evenements (dossier_id, question_id);
create index if not exists idx_mpd_historique_dossier
  on public.mpd_historique_evenements (dossier_id);


-- ── TABLE : mpd_attestations_canoniques ───────────────────────
-- D-031. Capacité par laquelle la Server Action, seule à connaître la
-- définition canonique TypeScript (D-029 §F), dépose une décision déjà
-- prise — que les deux RPC de Section 6/7 consomment exactement une
-- fois, sous leur propre verrou de dossier, sans jamais redonner à
-- authenticated le pouvoir de fournir lui-même les paramètres qui
-- déterminent l'intégrité canonique/métier.
--
-- Clé naturelle (aucun attestation_id aléatoire, non justifié) :
-- (user_id, dossier_id, revision, operation_type, question_id) — deux
-- index UNIQUE partiels ci-dessous (pas une contrainte UNIQUE classique)
-- car question_id est NULL pour CONSOMMATION, et NULL n'est jamais égal
-- à lui-même dans une contrainte UNIQUE standard.
--
-- Liaison à la valeur exacte (D-031) : statut_attendu/payload_attendu
-- sont comparés par la RPC à la valeur soumise via l'opérateur natif
-- `IS DISTINCT FROM` (structurel, null-safe, jsonb typé des deux côtés)
-- — jamais une resérialisation JSON ni un hash : jsonb ne garantit pas
-- de représentation texte canonique stable (l'ordre des clés n'est pas
-- préservé), donc aucune comparaison textuelle indépendante n'est jamais
-- effectuée sur les deux côtés.
--
-- questions_applicables (CONSOMMATION) définit l'ensemble EXACT des
-- questions dont la réponse courante est copiée dans le snapshot (D-032)
-- — jamais un simple filtre de complétude. NOT NULL (peut être vide) :
-- une valeur NULL rendrait cet ensemble ambigu, incompatible avec
-- l'invariant D-032.
--
-- Consommée exactement une fois (consommee_le), marquée avant toute
-- écriture métier dans la même transaction : un crash entre les deux
-- annule tout atomiquement, un rejeu après succès échoue explicitement.
--
-- Entièrement fermée à authenticated/anon (RLS + GRANT, Section 4/5).
-- Création (INSERT) réservée à la capacité backend privilégiée
-- (service_role existant, cf. en-tête de fichier et Section 5) — jamais
-- authenticated, jamais depuis le navigateur.
create table if not exists public.mpd_attestations_canoniques (
  id                        uuid        primary key default gen_random_uuid(),
  user_id                   uuid        not null,
  dossier_id                uuid        not null,
  revision                  integer     not null check (revision >= 0),
  operation_type            text        not null check (operation_type in ('ECRITURE_REPONSE','CONSOMMATION')),
  question_id               text        check (length(question_id) between 1 and 100),
  statut_attendu            text        check (statut_attendu in ('DECLARE','INCONNU','REFUS')),
  payload_attendu           jsonb       check (payload_attendu is null or octet_length(payload_attendu::text) < 100000),
  version_definition        text        not null check (length(version_definition) between 1 and 100),
  questions_a_desactiver    text[],
  version_canonique         text        check (length(version_canonique) between 1 and 100),
  questions_applicables     text[],
  libelles_historiques      jsonb,
  cree_le                   timestamptz not null default now(),
  consommee_le              timestamptz,
  constraint mpd_attestations_canoniques_dossier_fkey
    foreign key (user_id, dossier_id)
    references public.mpd_dossiers (user_id, id)
    on delete cascade,
  -- Cohérence par type d'opération : empêche une ligne ambiguë
  -- utilisable pour les deux RPC, et empêche une attestation d'écriture
  -- incohérente avec elle-même (mêmes règles statut/payload que les
  -- tables de contenu réel).
  constraint mpd_attestations_canoniques_type_check check (
    (
      operation_type = 'ECRITURE_REPONSE'
      and question_id is not null
      and statut_attendu is not null
      and (
        (statut_attendu = 'DECLARE' and payload_attendu is not null)
        or
        (statut_attendu in ('INCONNU','REFUS') and payload_attendu is null)
      )
      and version_canonique is null
      and questions_applicables is null
      and libelles_historiques is null
    )
    or
    (
      operation_type = 'CONSOMMATION'
      and question_id is null
      and statut_attendu is null
      and payload_attendu is null
      and questions_a_desactiver is null
      and version_canonique is not null
      -- D-032 : questions_applicables définit l'ensemble EXACT copié
      -- dans le snapshot, jamais un simple filtre optionnel — NULL
      -- rendrait cet ensemble ambigu, donc structurellement refusé ici.
      and questions_applicables is not null
    )
  )
);

create unique index if not exists idx_mpd_attestations_ecriture_key
  on public.mpd_attestations_canoniques (user_id, dossier_id, revision, question_id)
  where operation_type = 'ECRITURE_REPONSE';

create unique index if not exists idx_mpd_attestations_consommation_key
  on public.mpd_attestations_canoniques (user_id, dossier_id, revision)
  where operation_type = 'CONSOMMATION';

create index if not exists idx_mpd_attestations_dossier
  on public.mpd_attestations_canoniques (dossier_id);


-- ────────────────────────────────────────────────────────────
-- SECTION 2 — ÉTAT LOGIQUE SOURCE
-- ────────────────────────────────────────────────────────────

-- ── TABLE : mpd_etats_logiques ────────────────────────────────
-- Racine du snapshot immuable. Deux identités techniques distinctes du
-- dossier mutable (T4.1 §1/§C — nécessité démontrée, pas un choix de
-- confort). UNIQUE(dossier_id, revision) = mécanisme central
-- d'idempotence de la consommation (T4 §F).
--
-- ARBITRAGE PRODUIT/DONNÉES REQUIS AVANT PRODUCTION (signalé T5.6, non
-- tranché ici, ne pas modifier ces FK sans décision QG explicite) :
-- auth.users → mpd_dossiers est ON DELETE CASCADE (ligne ~107) alors que
-- mpd_dossiers → mpd_etats_logiques (ci-dessous) est ON DELETE RESTRICT
-- — la combinaison peut empêcher la suppression d'un compte utilisateur
-- possédant un état logique source déjà consommé. Le QG tranchera
-- séparément la politique de conservation/suppression des snapshots
-- (conservation légale, RGPD, anonymisation, CASCADE contrôlé, ou autre)
-- avant toute mise en production de ce chemin.
create table if not exists public.mpd_etats_logiques (
  id                          uuid        primary key default gen_random_uuid(),
  dossier_id                  uuid        not null,
  user_id                     uuid        not null,
  revision_dossier_capturee   integer     not null check (revision_dossier_capturee >= 0),
  version_canonique           text        not null check (length(version_canonique) between 1 and 100),
  cree_le                     timestamptz not null default now(),
  constraint mpd_etats_logiques_user_id_id_key unique (user_id, id),
  constraint mpd_etats_logiques_dossier_revision_key unique (dossier_id, revision_dossier_capturee),
  constraint mpd_etats_logiques_dossier_fkey
    foreign key (user_id, dossier_id)
    references public.mpd_dossiers (user_id, id)
    on delete restrict
);

create index if not exists idx_mpd_etats_logiques_dossier
  on public.mpd_etats_logiques (dossier_id);


-- ── TABLE : mpd_etat_logique_reponses ─────────────────────────
-- Contenu capturé du snapshot — immuable dès sa création, jamais modifié.
-- libelles_choix_historiques : uniquement pour les questions à choix
-- structurés, fourni par la Server Action (définition canonique),
-- jamais recalculé ni deviné côté DB (D-029 §F).
create table if not exists public.mpd_etat_logique_reponses (
  id                           uuid        primary key default gen_random_uuid(),
  etat_logique_id              uuid        not null,
  user_id                      uuid        not null,
  question_id                  text        not null check (length(question_id) between 1 and 100),
  statut                       text        not null check (statut in ('DECLARE','INCONNU','REFUS')),
  payload                      jsonb       check (payload is null or octet_length(payload::text) < 100000),
  libelles_choix_historiques   jsonb,
  constraint mpd_etat_logique_reponses_etat_question_key unique (etat_logique_id, question_id),
  constraint mpd_etat_logique_reponses_etat_id_key unique (etat_logique_id, id),
  constraint mpd_etat_logique_reponses_statut_payload_check check (
    (statut = 'DECLARE' and payload is not null)
    or
    (statut in ('INCONNU','REFUS') and payload is null)
  ),
  constraint mpd_etat_logique_reponses_fkey
    foreign key (user_id, etat_logique_id)
    references public.mpd_etats_logiques (user_id, id)
    on delete cascade
);

create index if not exists idx_mpd_etat_logique_reponses_etat
  on public.mpd_etat_logique_reponses (etat_logique_id);


-- ────────────────────────────────────────────────────────────
-- SECTION 3 — ANALYSE POST-COLLECTE (schéma seul, écriture différée)
-- ────────────────────────────────────────────────────────────

-- ── TABLE : mfr_referents ─────────────────────────────────────
create table if not exists public.mfr_referents (
  id                uuid        primary key default gen_random_uuid(),
  etat_logique_id   uuid        not null,
  user_id           uuid        not null,
  cree_le           timestamptz not null default now(),
  constraint mfr_referents_etat_id_key unique (etat_logique_id, id),
  constraint mfr_referents_fkey
    foreign key (user_id, etat_logique_id)
    references public.mpd_etats_logiques (user_id, id)
    on delete cascade
);

create index if not exists idx_mfr_referents_etat
  on public.mfr_referents (etat_logique_id);


-- ── TABLE : mfr_propositions_analytiques ──────────────────────
-- nature_objet réutilise le vocabulaire de nature métier déjà canonique
-- (D-029 §3/T3) — pas une taxonomie nouvelle. Le CHECK ci-dessous est le
-- garde-fou D→E structurel central (T4.1 §E, demande explicite S11/S1) :
-- aucune nature hors {capacite, comportement_passe} ne peut jamais porter
-- le statut ETAYE, quelle que soit l'origine de la tentative d'écriture.
create table if not exists public.mfr_propositions_analytiques (
  id                    uuid        primary key default gen_random_uuid(),
  etat_logique_id       uuid        not null,
  user_id               uuid        not null,
  enonce                text        not null check (length(enonce) between 1 and 20000),
  nature_objet          text        not null check (nature_objet in (
                                       'ressource','contrainte','preference',
                                       'capacite','comportement_passe',
                                       'observation_probleme','contexte'
                                     )),
  statut_epistemique    text        not null check (statut_epistemique in (
                                       'DECLARE','ETAYE','INFERE','CONTRADICTOIRE','INCONNU'
                                     )),
  cree_le               timestamptz not null default now(),
  constraint mfr_propositions_analytiques_etat_id_key unique (etat_logique_id, id),
  constraint mfr_propositions_analytiques_etaye_nature_check check (
    nature_objet in ('capacite','comportement_passe')
    or statut_epistemique <> 'ETAYE'
  ),
  constraint mfr_propositions_analytiques_fkey
    foreign key (user_id, etat_logique_id)
    references public.mpd_etats_logiques (user_id, id)
    on delete cascade
);

create index if not exists idx_mfr_propositions_etat
  on public.mfr_propositions_analytiques (etat_logique_id);


-- ── TABLE : mfr_referent_sources ──────────────────────────────
-- Correction Security Gate S1 §4 intégrée : etat_logique_id dénormalisé
-- + double FK composite garantissant que le référent ET la réponse
-- capturée appartiennent tous deux au MÊME état logique — empêche
-- structurellement qu'un référent de l'état A soit nourri par une
-- donnée de l'état B, même pour le même utilisateur. user_id
-- volontairement absent (table de jointure pure, ownership déjà garanti
-- par transitivité des deux FK ci-dessous — aucune nécessité nouvelle
-- démontrée pour le réintroduire, conformément à l'instruction).
create table if not exists public.mfr_referent_sources (
  id                        uuid  primary key default gen_random_uuid(),
  etat_logique_id           uuid  not null,
  referent_id               uuid  not null,
  etat_logique_reponse_id   uuid  not null,
  extrait                   text  check (extrait is null or length(extrait) < 5000),
  constraint mfr_referent_sources_unique
    unique (referent_id, etat_logique_reponse_id, extrait),
  constraint mfr_referent_sources_referent_fkey
    foreign key (etat_logique_id, referent_id)
    references public.mfr_referents (etat_logique_id, id)
    on delete cascade,
  constraint mfr_referent_sources_reponse_fkey
    foreign key (etat_logique_id, etat_logique_reponse_id)
    references public.mpd_etat_logique_reponses (etat_logique_id, id)
    on delete cascade
);

create index if not exists idx_mfr_referent_sources_referent
  on public.mfr_referent_sources (referent_id);
create index if not exists idx_mfr_referent_sources_reponse
  on public.mfr_referent_sources (etat_logique_reponse_id);


-- ── TABLE : mfr_proposition_referents ─────────────────────────
-- Même correction S1 §4 : double FK composite sur etat_logique_id.
-- UNIQUE(proposition_id, referent_id) garantit qu'un référent ne compte
-- jamais deux fois pour une même proposition (D-028, réponse structurelle
-- directe à l'exigence « jamais compté plusieurs fois »).
create table if not exists public.mfr_proposition_referents (
  id                uuid  primary key default gen_random_uuid(),
  etat_logique_id   uuid  not null,
  proposition_id    uuid  not null,
  referent_id       uuid  not null,
  constraint mfr_proposition_referents_unique unique (proposition_id, referent_id),
  constraint mfr_proposition_referents_proposition_fkey
    foreign key (etat_logique_id, proposition_id)
    references public.mfr_propositions_analytiques (etat_logique_id, id)
    on delete cascade,
  constraint mfr_proposition_referents_referent_fkey
    foreign key (etat_logique_id, referent_id)
    references public.mfr_referents (etat_logique_id, id)
    on delete cascade
);

create index if not exists idx_mfr_proposition_referents_proposition
  on public.mfr_proposition_referents (proposition_id);
create index if not exists idx_mfr_proposition_referents_referent
  on public.mfr_proposition_referents (referent_id);


-- ────────────────────────────────────────────────────────────
-- SECTION 4 — RLS
-- ────────────────────────────────────────────────────────────

alter table public.mpd_dossiers enable row level security;
alter table public.mpd_reponses_courantes enable row level security;
alter table public.mpd_historique_evenements enable row level security;
alter table public.mpd_etats_logiques enable row level security;
alter table public.mpd_etat_logique_reponses enable row level security;
alter table public.mpd_attestations_canoniques enable row level security;
alter table public.mfr_referents enable row level security;
alter table public.mfr_propositions_analytiques enable row level security;
alter table public.mfr_referent_sources enable row level security;
alter table public.mfr_proposition_referents enable row level security;

-- mpd_dossiers : lecture propriétaire uniquement. Aucune policy
-- INSERT/UPDATE/DELETE : création, revision et est_courant ne sont
-- modifiables que par les RPC SECURITY DEFINER ci-dessous (T5.6, audit
-- QG — un INSERT direct via RLS laissait authenticated fournir lui-même
-- des valeurs système structurantes telles que revision, est_courant,
-- cree_le, revision_le ; RLS ne porte que sur user_id, jamais sur la
-- valeur des autres colonnes). Même discipline RPC-only déjà en vigueur
-- pour toutes les autres écritures MPD de ce fichier (S1 §3).
create policy "mpd_dossiers_select_own"
  on public.mpd_dossiers for select
  using (auth.uid() = user_id);

-- mpd_reponses_courantes : lecture propriétaire uniquement. Aucune
-- policy d'écriture — RPC-only (T4 §K, renforcé S1 §3 : un utilisateur
-- authentifié hostile avec son propre JWT reste protégé même sur ses
-- propres données, RLS seule ne suffit pas contre cet acteur).
create policy "mpd_reponses_courantes_select_own"
  on public.mpd_reponses_courantes for select
  using (auth.uid() = user_id);

create policy "mpd_historique_evenements_select_own"
  on public.mpd_historique_evenements for select
  using (auth.uid() = user_id);

create policy "mpd_etats_logiques_select_own"
  on public.mpd_etats_logiques for select
  using (auth.uid() = user_id);

create policy "mpd_etat_logique_reponses_select_own"
  on public.mpd_etat_logique_reponses for select
  using (auth.uid() = user_id);

-- mpd_attestations_canoniques : posture fermée — aucune policy
-- authenticated, y compris SELECT (D-031). Seules les RPC SECURITY
-- DEFINER des Sections 6/7 y accèdent (bypass RLS par défaut pour le
-- rôle propriétaire, sans FORCE ROW LEVEL SECURITY — même mécanisme déjà
-- utilisé pour toutes les autres tables MPD).

-- mfr_* : posture fermée — aucune policy authenticated, y compris SELECT
-- (T4 §K, pattern rapports T1 §B). Accès futur uniquement via une RPC de
-- lecture dédiée, non conçue dans cette migration.


-- ────────────────────────────────────────────────────────────
-- SECTION 5 — PRIVILÈGES (défense en profondeur, indépendante de RLS)
-- ────────────────────────────────────────────────────────────
-- Explicite quel que soit le comportement par défaut réel de Supabase
-- pour de nouvelles tables (non vérifiable depuis ce repo, T4 §A / S1
-- §6) : si une policy RLS permissive était un jour ajoutée par erreur,
-- l'absence de GRANT bloque quand même l'opération. Discipline renforcée
-- T5.6 (audit QG) : chaque table part désormais d'un `REVOKE ALL`
-- explicite pour `public, anon, authenticated` ensemble (plus seulement
-- une liste de privilèges nommés) — le QG refuse de dépendre d'une
-- hypothèse sur les default grants Supabase (TRUNCATE/REFERENCES/TRIGGER
-- notamment) pour garantir leur absence ; seul ce qui est réaccordé
-- explicitement ensuite existe.

revoke all on public.mpd_dossiers from public, anon, authenticated;
grant select on public.mpd_dossiers to authenticated;

revoke all on public.mpd_reponses_courantes from public, anon, authenticated;
grant select on public.mpd_reponses_courantes to authenticated;

revoke all on public.mpd_historique_evenements from public, anon, authenticated;
grant select on public.mpd_historique_evenements to authenticated;

revoke all on public.mpd_etats_logiques from public, anon, authenticated;
grant select on public.mpd_etats_logiques to authenticated;

revoke all on public.mpd_etat_logique_reponses from public, anon, authenticated;
grant select on public.mpd_etat_logique_reponses to authenticated;

-- mpd_attestations_canoniques : aucun privilège pour authenticated/anon,
-- y compris SELECT (D-031) — inaccessible directement depuis le
-- navigateur sous toutes ses formes. Création réservée à service_role
-- (client backend existant, jamais un rôle nouveau). Aucun GRANT INSERT
-- explicite à service_role n'est ajouté ici : Supabase configure
-- typiquement service_role avec des privilèges par défaut sur le schéma
-- public (ALTER DEFAULT PRIVILEGES, posé une fois au bootstrap du
-- projet, pas par migration applicative) — À VÉRIFIER avant exécution
-- dans l'environnement Supabase réel : si service_role dispose bien d'un
-- privilège INSERT effectif sur cette table, sinon ajouter explicitement
-- `grant insert on public.mpd_attestations_canoniques to service_role;`
-- avant exécution (non inventé ici, faute d'accès à la configuration
-- réelle du projet).
revoke all on public.mpd_attestations_canoniques from public, anon, authenticated;

-- mfr_* : aucun privilège pour authenticated/anon, y compris SELECT.
revoke all on public.mfr_referents from public, anon, authenticated;
revoke all on public.mfr_propositions_analytiques from public, anon, authenticated;
revoke all on public.mfr_referent_sources from public, anon, authenticated;
revoke all on public.mfr_proposition_referents from public, anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- RPC : création d'un dossier (ajout T5.6, audit QG)
-- ────────────────────────────────────────────────────────────
-- Remplace l'INSERT direct + policy RLS précédents sur mpd_dossiers :
-- un INSERT direct laissait authenticated fournir lui-même des valeurs
-- système structurantes (revision, est_courant, cree_le, revision_le),
-- RLS ne portant que sur user_id, jamais sur la valeur des autres
-- colonnes. Même discipline RPC-only déjà en vigueur pour toutes les
-- autres écritures MPD (S1 §3). Comportement fonctionnel identique à
-- l'ancien INSERT (mêmes valeurs par défaut, même contrainte d'unicité
-- « au plus un dossier courant », idx_mpd_dossiers_courant) — seule la
-- surface de confiance change : aucun paramètre, aucune valeur système
-- fournie par le client, identité exclusivement via auth.uid().

create or replace function public.mpd_creer_dossier()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid;
  v_new_id    uuid;
begin
  -- 1. Authentification
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Non authentifié');
  end if;

  -- 2. Insertion à valeurs système exclusivement par défaut — id,
  --    revision, est_courant, cree_le, revision_le ne sont jamais
  --    fournis par l'appelant, jamais lus depuis un paramètre.
  --    idx_mpd_dossiers_courant (unique partiel) applique la même
  --    contrainte « au plus un dossier courant » qu'un INSERT direct
  --    aurait déjà rencontrée — comportement inchangé, retour contrôlé
  --    au lieu d'un message Postgres brut (S1 §13/§16/§17).
  begin
    insert into public.mpd_dossiers (user_id)
    values (v_user_id)
    returning id into v_new_id;
  exception when unique_violation then
    return json_build_object('error', 'dossier_courant_deja_existant');
  end;

  -- 3. Retour contrôlé.
  return json_build_object('success', true, 'dossier_id', v_new_id);
end;
$$;

revoke all on function public.mpd_creer_dossier() from public;
revoke all on function public.mpd_creer_dossier() from anon;
grant execute on function public.mpd_creer_dossier() to authenticated;


-- ────────────────────────────────────────────────────────────
-- SECTION 6 — RPC : écriture d'une réponse
-- ────────────────────────────────────────────────────────────
-- Aucun paramètre client libre ne détermine une décision canonique
-- (D-031) : ni la version déployée, ni les désactivations en cascade.
-- Ces décisions sont lues depuis l'attestation canonique correspondante
-- (mpd_attestations_canoniques), sous le même verrou de dossier. La
-- question et le statut/payload restent des paramètres explicites
-- (p_question_id, p_statut, p_payload) — comparés à la valeur EXACTE
-- attestée (§8 ci-dessous, IS DISTINCT FROM structurel) : une attestation
-- pour une valeur ne peut jamais servir à en écrire une autre (D-031).

create or replace function public.mpd_ecrire_reponse(
  p_dossier_id          uuid,
  p_expected_revision   integer,
  p_question_id         text,
  p_statut              text,
  p_payload             jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid;
  v_dossier        record;
  v_attestation    record;
  v_existing       record;
  v_changement     boolean := false;
  v_q              text;
  v_inactive       record;
  v_new_revision   integer;
begin
  -- 1. Authentification
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Non authentifié');
  end if;

  -- 2. Validations structurelles précoces, indépendantes du verrou —
  --    jamais une décision canonique, seulement ce qui est vérifiable
  --    sans connaître la définition TypeScript (statut fermé, cohérence
  --    statut/payload, taille).
  if p_question_id is null or length(p_question_id) = 0 then
    return json_build_object('error', 'Requête invalide');
  end if;
  if p_statut not in ('DECLARE', 'INCONNU', 'REFUS') then
    return json_build_object('error', 'Requête invalide');
  end if;
  if (p_statut = 'DECLARE' and p_payload is null)
     or (p_statut in ('INCONNU','REFUS') and p_payload is not null) then
    return json_build_object('error', 'Requête invalide');
  end if;
  if p_payload is not null and octet_length(p_payload::text) >= 100000 then
    return json_build_object('error', 'Requête invalide');
  end if;

  -- 3. Verrou du dossier — acquis en premier, avant toute lecture/écriture
  --    sur les tables enfants (T4.1 §C : discipline de verrouillage
  --    uniforme, pas seulement pour la consommation).
  select * into v_dossier
  from public.mpd_dossiers
  where id = p_dossier_id
  for update;

  if not found then
    return json_build_object('error', 'Dossier introuvable');
  end if;

  -- 4. Ownership revérifié sous verrou — jamais présumé depuis un
  --    contrôle client antérieur. Message identique au cas « inexistant »
  --    pour ne jamais permettre l'énumération d'UUID (S1 §16).
  if v_dossier.user_id <> v_user_id then
    return json_build_object('error', 'Dossier introuvable');
  end if;

  -- 5. Concurrence optimiste — expected_revision obligatoire (T4.1 §D).
  if v_dossier.revision <> p_expected_revision then
    return json_build_object(
      'error', 'revision_conflict',
      'revision_actuelle', v_dossier.revision
    );
  end if;

  -- 6. Attestation canonique (D-031) — recherchée par sa clé naturelle
  --    sous le même verrou de dossier (aucun attestation_id fourni par
  --    le client, D-031). La question elle-même vient du paramètre client
  --    (§2), mais la LÉGITIMITÉ de la valeur soumise pour cette question
  --    vient exclusivement d'ici.
  select * into v_attestation
  from public.mpd_attestations_canoniques
  where user_id = v_user_id
    and dossier_id = p_dossier_id
    and revision = p_expected_revision
    and operation_type = 'ECRITURE_REPONSE'
    and question_id = p_question_id
  for update;

  if not found then
    return json_build_object('error', 'attestation_introuvable');
  end if;

  -- 7. Rejeu — une attestation déjà consommée ne peut plus jamais servir.
  if v_attestation.consommee_le is not null then
    return json_build_object('error', 'attestation_introuvable');
  end if;

  -- 8. Liaison à la valeur EXACTE (D-031) — comparaison
  --    structurelle native jsonb (IS DISTINCT FROM), jamais un hash ni
  --    une resérialisation : les deux côtés sont déjà des valeurs jsonb
  --    typées nativement (voir note canonicalisation, table §D-031).
  if v_attestation.statut_attendu is distinct from p_statut
     or v_attestation.payload_attendu is distinct from p_payload then
    return json_build_object('error', 'attestation_introuvable');
  end if;

  -- 9. Marquage de consommation — avant toute écriture métier, dans la
  --    même transaction (atomicité : un crash après ce point annule tout,
  --    y compris ce marquage — aucune consommation partielle possible).
  update public.mpd_attestations_canoniques
  set consommee_le = now()
  where id = v_attestation.id;

  -- 10. État actuel relu sous le même verrou (pas un état lu avant son
  --     acquisition) — détecte aussi un « autosave » à valeur strictement
  --     identique, qui ne doit jamais incrémenter la révision (T4.1 §9).
  select * into v_existing
  from public.mpd_reponses_courantes
  where dossier_id = p_dossier_id and question_id = p_question_id;

  if found
     and v_existing.statut = p_statut
     and v_existing.payload is not distinct from p_payload then
    v_changement := false;
  else
    -- 11. Modification de la réponse (upsert). version_definition
    --     provient exclusivement de l'attestation — jamais un paramètre
    --     client (S1 §4).
    insert into public.mpd_reponses_courantes (
      dossier_id, user_id, question_id, statut, payload, version_definition
    )
    values (
      p_dossier_id, v_user_id, p_question_id, p_statut, p_payload,
      v_attestation.version_definition
    )
    on conflict (dossier_id, question_id) do update
      set statut              = excluded.statut,
          payload             = excluded.payload,
          version_definition  = excluded.version_definition,
          modifie_le          = now();
    v_changement := true;
  end if;

  -- 12. Transitions d'applicabilité / historique — liste EXCLUSIVEMENT
  --     issue de l'attestation (D-031), plus un paramètre client libre.
  --     Relecture sous le même verrou pour éviter toute double écriture
  --     d'historique (S1 §9) ; silencieusement ignoré si déjà inactif
  --     (idempotent).
  if v_attestation.questions_a_desactiver is not null then
    foreach v_q in array v_attestation.questions_a_desactiver loop
      select * into v_inactive
      from public.mpd_reponses_courantes
      where dossier_id = p_dossier_id and question_id = v_q;

      if found then
        insert into public.mpd_historique_evenements (
          dossier_id, user_id, question_id, type_evenement, statut_capture, payload_capture
        )
        values (
          p_dossier_id, v_user_id, v_q, 'DEVENUE_INACTIVE', v_inactive.statut, v_inactive.payload
        );

        delete from public.mpd_reponses_courantes
        where dossier_id = p_dossier_id and question_id = v_q;

        v_changement := true;
      end if;
    end loop;
  end if;

  -- 13. Incrément unique de révision, uniquement si une mutation métier
  --     réelle a eu lieu (jamais pour une navigation ou un autosave
  --     identique — T4.1 §9). Retour contrôlé — jamais un message
  --     Postgres brut (S1 §13/§16/§17).
  v_new_revision := v_dossier.revision;
  if v_changement then
    update public.mpd_dossiers
    set revision = revision + 1,
        revision_le = now()
    where id = p_dossier_id
    returning revision into v_new_revision;
  end if;

  return json_build_object('success', true, 'revision', v_new_revision);
end;
$$;

revoke all on function public.mpd_ecrire_reponse(uuid, integer, text, text, jsonb) from public;
revoke all on function public.mpd_ecrire_reponse(uuid, integer, text, text, jsonb) from anon;
grant execute on function public.mpd_ecrire_reponse(uuid, integer, text, text, jsonb) to authenticated;


-- ────────────────────────────────────────────────────────────
-- SECTION 7 — RPC : consommation (création de l'état logique source)
-- ────────────────────────────────────────────────────────────
-- Aucun paramètre client libre ne détermine une décision canonique
-- (D-031) : ni la version canonique du snapshot, ni l'ensemble des
-- questions applicables, ni les libellés historiques. Ces décisions sont
-- lues depuis l'attestation canonique CONSOMMATION correspondante, sous
-- le même verrou de dossier. L'état logique source ne contient jamais
-- que les réponses dont question_id appartient à l'ensemble exact
-- attesté (D-032, §9 ci-dessous) — jamais une copie brute de l'état
-- courant.

create or replace function public.mpd_consommer_dossier(
  p_dossier_id   uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id                 uuid;
  v_dossier                 record;
  v_existing_etat           record;
  v_attestation             record;
  v_questions_applicables   text[];
  v_new_etat_id             uuid;
  v_manquante               text;
  v_reponse                 record;
begin
  -- 1. Authentification
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Non authentifié');
  end if;

  -- 2. Verrou du dossier — acquis en premier (T4 §H, T4.1 §C).
  select * into v_dossier
  from public.mpd_dossiers
  where id = p_dossier_id
  for update;

  if not found then
    return json_build_object('error', 'Dossier introuvable');
  end if;

  -- 3. Ownership revérifié sous verrou — message identique au cas
  --    « inexistant » (S1 §16, anti-énumération).
  if v_dossier.user_id <> v_user_id then
    return json_build_object('error', 'Dossier introuvable');
  end if;

  -- 4. Idempotence — un état logique existe-t-il déjà pour cette
  --    révision précise ? Vérifiée AVANT la recherche d'attestation,
  --    délibérément : un double-clic sur une consommation déjà
  --    réussie ne doit jamais échouer faute d'attestation encore
  --    présente — elle a déjà été consommée par le premier appel,
  --    l'idempotence ne doit pas dépendre de l'état de l'attestation.
  --    UNIQUE(dossier_id, revision) reste le rempart ultime ; cette
  --    relecture évite un aller-retour d'exception pour le cas courant
  --    (T4 §F/§H).
  select * into v_existing_etat
  from public.mpd_etats_logiques
  where dossier_id = p_dossier_id
    and revision_dossier_capturee = v_dossier.revision;

  if found then
    return json_build_object(
      'success', true, 'etat_logique_id', v_existing_etat.id, 'created', false
    );
  end if;

  -- 5. Attestation canonique (D-031) — recherchée par sa clé naturelle
  --    sous le même verrou de dossier (aucun attestation_id fourni par
  --    le client, D-031).
  select * into v_attestation
  from public.mpd_attestations_canoniques
  where user_id = v_user_id
    and dossier_id = p_dossier_id
    and revision = v_dossier.revision
    and operation_type = 'CONSOMMATION'
  for update;

  if not found then
    return json_build_object('error', 'attestation_introuvable');
  end if;

  -- Rejeu — une attestation déjà consommée ne peut plus jamais servir.
  if v_attestation.consommee_le is not null then
    return json_build_object('error', 'attestation_introuvable');
  end if;

  -- 6. Ensemble EXACT des questions applicables attestées — dédupliqué
  --    (DISTINCT sur unnest) pour une sémantique ensembliste propre : un
  --    doublon éventuel dans la liste attestée ne doit ni fausser le
  --    test de complétude ni être copié deux fois (impossible de toute
  --    façon, §10, mais la déduplication reste correcte par construction
  --    plutôt que par accident). NOT NULL garanti par le CHECK de la
  --    table (D-032) — jamais besoin d'un garde « is not null » ici.
  v_questions_applicables := (
    select coalesce(array_agg(distinct q), '{}'::text[])
    from unnest(v_attestation.questions_applicables) as q
  );

  -- 7. Validation de complétude structurelle — pas une réévaluation des
  --    triggers, un simple test d'existence pour chaque question
  --    annoncée applicable. Combiné à UNIQUE(dossier_id, question_id) sur
  --    mpd_reponses_courantes (au plus une réponse active par question),
  --    ce test d'existence garantit qu'une question applicable attestée
  --    possède EXACTEMENT une réponse courante — jamais zéro, jamais
  --    plusieurs. **Volontairement AVANT le marquage de consommation
  --    (§8)** : un dossier_incomplet ne doit jamais laisser une
  --    attestation consommée sans snapshot créé (correction T5.6, audit
  --    QG — invariant D-031 : l'attestation est consommée atomiquement
  --    avec l'opération qu'elle autorise, jamais avant que ses
  --    préconditions métier ne soient définitivement satisfaites).
  foreach v_manquante in array v_questions_applicables loop
    if not exists (
      select 1 from public.mpd_reponses_courantes
      where dossier_id = p_dossier_id and question_id = v_manquante
    ) then
      return json_build_object(
        'error', 'dossier_incomplet', 'question_manquante', v_manquante
      );
    end if;
  end loop;

  -- 8. Marquage de consommation — désormais seulement une fois toutes
  --    les préconditions métier satisfaites (complétude comprise),
  --    immédiatement avant la création du snapshot, dans la même
  --    transaction que celle-ci (atomicité : un crash après ce point
  --    annule tout, y compris ce marquage — aucune consommation
  --    partielle possible ; aucun chemin de retour contrôlé ne se trouve
  --    plus entre ce marquage et la création effective du snapshot).
  update public.mpd_attestations_canoniques
  set consommee_le = now()
  where id = v_attestation.id;

  -- 9. Création de la racine du snapshot, avec récupération sur
  --    collision de concurrence (pattern déjà éprouvé,
  --    create_upgrade_bilan_session, 010_bilan_superseded_upgrade.sql).
  --    version_canonique provient exclusivement de l'attestation.
  begin
    insert into public.mpd_etats_logiques (
      dossier_id, user_id, revision_dossier_capturee, version_canonique
    )
    values (
      p_dossier_id, v_user_id, v_dossier.revision, v_attestation.version_canonique
    )
    returning id into v_new_etat_id;
  exception when unique_violation then
    select id into v_new_etat_id
    from public.mpd_etats_logiques
    where dossier_id = p_dossier_id
      and revision_dossier_capturee = v_dossier.revision;

    if v_new_etat_id is not null then
      return json_build_object(
        'success', true, 'etat_logique_id', v_new_etat_id, 'created', false
      );
    end if;
    raise;
  end;

  -- 10. Copie des réponses actives, STRICTEMENT filtrée à l'ensemble
  --     exact des questions applicables attestées (D-032) — une réponse
  --     courante étrangère à cet ensemble, même si elle existe dans la
  --     table, est exclue du snapshot. Métadonnées d'interprétation
  --     historique EXCLUSIVEMENT issues de l'attestation, jamais
  --     devinées ni fournies librement par le client.
  for v_reponse in
    select * from public.mpd_reponses_courantes
    where dossier_id = p_dossier_id
      and question_id = any(v_questions_applicables)
  loop
    insert into public.mpd_etat_logique_reponses (
      etat_logique_id, user_id, question_id, statut, payload, libelles_choix_historiques
    )
    values (
      v_new_etat_id,
      v_user_id,
      v_reponse.question_id,
      v_reponse.statut,
      v_reponse.payload,
      v_attestation.libelles_historiques -> v_reponse.question_id
    );
  end loop;

  -- Cette RPC ne construit jamais mfr_* — frontière de raisonnement
  -- D-028 §12, confirmée T4 §5/§7.

  -- 11. Retour contrôlé.
  return json_build_object(
    'success', true, 'etat_logique_id', v_new_etat_id, 'created', true
  );
end;
$$;

revoke all on function public.mpd_consommer_dossier(uuid) from public;
revoke all on function public.mpd_consommer_dossier(uuid) from anon;
grant execute on function public.mpd_consommer_dossier(uuid) to authenticated;


-- ────────────────────────────────────────────────────────────
-- SECTION 8 — ANALYSE POST-COLLECTE : écriture volontairement absente
-- ────────────────────────────────────────────────────────────
-- Aucune fonction d'écriture pour mfr_referents / mfr_propositions_
-- analytiques / mfr_referent_sources / mfr_proposition_referents n'est
-- créée dans cette migration. Voir note en-tête de fichier et rapport
-- de phase T5 §J pour la justification complète (Security Gate S1 §3 :
-- capacité backend à privilège minimal retenue comme cible, mécanisme
-- d'authentification exact non vérifiable depuis ce repo — sécurité
-- conservatrice retenue plutôt que d'exposer une RPC privilégiée
-- publiquement exploitable).
