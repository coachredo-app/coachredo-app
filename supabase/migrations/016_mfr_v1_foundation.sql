-- ============================================================
-- Migration 016 — Fondation MFR V1 (Ma feuille de route), T-MFR.1
-- ============================================================
-- MIGRATION CANDIDATE — NON EXÉCUTÉE. Rédigée pour audit QG uniquement.
-- NE PAS EXÉCUTER directement — exécution manuelle par le QG, après GO
-- distinct et arbitrage de la stratégie de registre Supabase (le registre
-- `supabase_migrations.schema_migrations` est confirmé ABSENT sur le
-- projet réel au 2026-10-13, cf. CURRENT_STATE.md §5/§6).
--
-- Traduction physique de D-049 (architecture technique T-MFR.1, verrouillée
-- 2026-10-13), elle-même traduction physique de D-048 (doctrine métier
-- MFR V1 — moteur de formation, niveaux de vérité, articulation avec
-- D-023/D-024/D-025).
--
-- Chaîne verrouillée :
--   mpd_etats_logiques → mfr_cycles → mfr_analyses → mfr_redactions
--     → mfr_versions → mfr_publications
-- Objets analytiques rattachés à l'analyse (jamais directement au cycle) :
--   mfr_propositions_analytiques (existante, étendue), mfr_referents
--   (existante, étendue), mfr_ancrages, mfr_hypotheses,
--   mfr_evaluations_d025, mfr_pistes + jointures mfr_proposition_ancrages,
--   mfr_hypothese_ancrages.
--
-- Additive stricte : aucune table MPD V3 (013) ni V2 modifiée, hormis
-- l'ajout de la colonne `analyse_id` sur les deux tables mfr_* déjà
-- créées par 013 (mfr_propositions_analytiques, mfr_referents) — leurs
-- lignes existantes ne sont pas touchées (tables actuellement vides,
-- aucun chemin d'écriture n'ayant jamais existé pour elles, cf. 013
-- Section 8 et CURRENT_STATE.md §8). `mfr_referent_sources` et
-- `mfr_proposition_referents` restent inchangées (D-049 : pas de
-- dénormalisation directe sur ces deux tables de jointure, leurs
-- invariants composites existants suffisent déjà).
--
-- FRONTIÈRE EXPLICITE RUNTIME ↔ DB, même discipline que 013 :
--   Cette migration ne valide jamais elle-même la forme interne d'un
--   contenu JSONB (mécanismes, transformations, acteurs/flux, modalités
--   proposées, exigences, variables de test, contenu curé d'une version,
--   output brut d'une analyse/rédaction) — cette définition vit dans le
--   futur code applicatif/orchestration, non engagé par D-048/D-049
--   (§AN). La DB ne garde que des gardes structurelles : taille, statuts
--   fermés, cohérence de séquence entre filtres D-025, appartenance au
--   même cycle/analyse via FK composites.
--
-- ÉCRITURE VOLONTAIREMENT ABSENTE :
--   Comme pour les 4 tables mfr_* de 013, aucune RPC d'écriture n'est
--   créée ici pour les nouvelles tables MFR. Provider IA, orchestration,
--   mécanisme d'authentification du futur processus analytique restent
--   des chantiers ultérieurs distincts, non engagés par cette migration
--   (hors périmètre explicite du GO QG T-MFR.1).
--
-- RLS/ACCÈS : posture fermée pour TOUTES les tables de cette migration,
--   y compris mfr_versions et mfr_publications — aucune policy
--   authenticated, aucun GRANT à authenticated/anon. Contrairement aux
--   tables mpd_* de 013 (lecture directe autorisée), l'accès utilisateur
--   à toute donnée MFR passera exclusivement par un futur chemin serveur
--   contrôlé (RPC de lecture dédiée), non conçu dans cette migration.
--
-- ARBITRAGES QG (revue ciblée 016bis, cette passe) — remplacent les
-- interprétations initiales listées dans le rapport de la passe
-- précédente, détail complet dans la revue correspondante :
--   - `mfr_cycles.analyse_retenue_id` : la FK simple + trigger de la
--     première rédaction sont remplacées par une FK composite
--     déclarative stricte (id, analyse_retenue_id) → mfr_analyses
--     (cycle_id, id) ON DELETE RESTRICT — possible précisément parce que
--     RESTRICT (contrairement à SET NULL) ne tente jamais de mettre la
--     clé primaire NOT NULL `id` à NULL. Conséquence assumée : supprimer
--     une analyse actuellement retenue par un cycle est bloqué tant que
--     le pointeur n'a pas été vidé explicitement au préalable (UPDATE
--     séparé) — aucun trigger DB restant pour cet invariant.
--   - `mfr_evaluations_d025` : les 3 filtres binaires (COHÉRENCE,
--     COMPATIBILITÉ, DISPONIBILITÉ) sont des `boolean`
--     (`coherence_ok`/`compatibilite_ok`/`disponibilite_ok`), plus aucun
--     vocabulaire textuel inventé pour eux. Seuls ACTIONNABILITÉ (3 états
--     verrouillés par D-025 §B.1/D-048 §Z) et `sortie` (3 sorties
--     verrouillées par D-025 §B.1/D-048 §AA) conservent un vocabulaire
--     texte — transcription directe du canon, pas une invention.
--   - `mfr_hypotheses` : le CHECK DB « DIRECTION_CANDIDATE ⇒ mecanismes +
--     acteurs_flux non NULL » est retiré. La validité sémantique d'une
--     Direction Candidate (ancrage constitutif suffisant D-048 §I,
--     mécanisme D-048 §T pt.4, acteurs/flux minimaux D-048 §T pt.5) est
--     un invariant de l'orchestration de FORMATION, jamais prétendu
--     garanti par un CHECK JSONB — ni par un trigger (explicitement exclu
--     par le QG, cette passe). Les champs « exigences » et « état des
--     exigences » sont désormais deux colonnes JSONB distinctes
--     (`exigences`, `etat_exigences`), plus de fusion en un seul champ.
--   - Checks de cohérence statut/horodatage sur `mfr_analyses` et
--     `mfr_redactions` (EN_COURS ⇒ terminee_le NULL ; SUCCES/ECHEC ⇒
--     terminee_le non NULL) : non concernés par cet arbitrage, inchangés.
--   - Noms des deux tables de jointure Ancrage↔PA et Hypothèse↔Ancrage
--     non prescrits par D-049/le GO QG : choisis par analogie directe
--     avec `mfr_proposition_referents` déjà existante
--     (`mfr_proposition_ancrages`, `mfr_hypothese_ancrages`) — inchangé.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- SECTION A — CHAÎNE RACINE : CYCLE → ANALYSE → RÉDACTION → VERSION
--             → PUBLICATION
-- ────────────────────────────────────────────────────────────

-- ── TABLE : mfr_cycles ────────────────────────────────────────
-- Un cycle par snapshot MPD consommé (UNIQUE etat_logique_id). Aucun
-- enum de lifecycle persisté (D-049) — les états (NON_DEMARRE,
-- ANALYSE_EN_COURS, ANALYSE_EN_ECHEC, ANALYSE_TERMINEE,
-- REDACTION_EN_COURS, REDACTION_EN_ECHEC, BROUILLON, VALIDEE, PUBLIEE)
-- sont dérivés par le futur code applicatif à partir de l'état réel des
-- tables filles. `analyse_retenue_id` est un pointeur de travail mutable,
-- jamais la provenance d'une version déjà créée (D-049) — la provenance
-- réelle reste la chaîne de FK composites : version → rédaction →
-- analyse → cycle → snapshot.
create table if not exists public.mfr_cycles (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null,
  etat_logique_id     uuid        not null,
  analyse_retenue_id  uuid,
  cree_le             timestamptz not null default now(),
  modifie_le          timestamptz not null default now(),
  constraint mfr_cycles_etat_logique_id_key unique (etat_logique_id),
  constraint mfr_cycles_user_id_id_key unique (user_id, id),
  -- Cible de la FK composite de mfr_analyses.etat_logique_id (dénormalisé)
  -- vers ce cycle — garantit que l'analyse ne peut jamais prétendre
  -- appartenir à un snapshot différent de celui réellement associé à ce
  -- cycle.
  constraint mfr_cycles_id_etat_logique_id_key unique (id, etat_logique_id),
  -- Ownership + « snapshot → cycle : CASCADE » (D-049 §7) en une seule FK.
  constraint mfr_cycles_etat_logique_fkey
    foreign key (user_id, etat_logique_id)
    references public.mpd_etats_logiques (user_id, id)
    on delete cascade
);

create index if not exists idx_mfr_cycles_user
  on public.mfr_cycles (user_id);


-- ── TABLE : mfr_analyses ──────────────────────────────────────
-- Objet distinct de la rédaction, plusieurs analyses possibles par cycle,
-- jamais remplacées physiquement (append-only, D-049). etat_logique_id
-- dénormalisé pour l'intégrité snapshot/analyse — vérifié structurellement
-- contre le cycle parent (pas une simple copie de confiance).
create table if not exists public.mfr_analyses (
  id                  uuid        primary key default gen_random_uuid(),
  cycle_id            uuid        not null,
  user_id             uuid        not null,
  etat_logique_id     uuid        not null,
  provider            text        not null check (length(provider) between 1 and 100),
  model               text        not null check (length(model) between 1 and 100),
  prompt_version      text        not null check (length(prompt_version) between 1 and 100),
  schema_version      text        not null check (length(schema_version) between 1 and 100),
  catalogue_version   text        not null check (length(catalogue_version) between 1 and 100),
  statut              text        not null check (statut in ('EN_COURS','SUCCES','ECHEC')),
  demarree_le         timestamptz not null default now(),
  terminee_le         timestamptz,
  erreur              text        check (erreur is null or length(erreur) < 10000),
  output_brut         jsonb       check (output_brut is null or octet_length(output_brut::text) < 2000000),
  cree_le             timestamptz not null default now(),
  -- Cible de la FK composite de mfr_cycles.analyse_retenue_id (ajoutée
  -- plus bas, après création de cette table) — garantit qu'une analyse
  -- retenue par un cycle appartient structurellement à ce même cycle.
  constraint mfr_analyses_cycle_id_id_key unique (cycle_id, id),
  -- Cible de la FK composite de mfr_propositions_analytiques.analyse_id
  -- et mfr_referents.analyse_id (Section B).
  constraint mfr_analyses_etat_logique_id_key unique (etat_logique_id, id),
  -- Ownership, chaîne vers rédactions/ancrages/hypothèses/pistes.
  constraint mfr_analyses_user_id_id_key unique (user_id, id),
  constraint mfr_analyses_statut_timestamp_check check (
    (statut = 'EN_COURS' and terminee_le is null)
    or
    (statut in ('SUCCES','ECHEC') and terminee_le is not null)
  ),
  -- Ownership + « cycle → analyse : CASCADE ».
  constraint mfr_analyses_cycle_fkey
    foreign key (user_id, cycle_id)
    references public.mfr_cycles (user_id, id)
    on delete cascade,
  -- Cohérence structurelle : l'etat_logique_id dénormalisé doit être
  -- exactement celui du cycle parent — jamais un snapshot différent.
  constraint mfr_analyses_cycle_etat_logique_fkey
    foreign key (cycle_id, etat_logique_id)
    references public.mfr_cycles (id, etat_logique_id)
    on delete cascade
);

create index if not exists idx_mfr_analyses_cycle
  on public.mfr_analyses (cycle_id);
create index if not exists idx_mfr_analyses_user
  on public.mfr_analyses (user_id);
create index if not exists idx_mfr_analyses_etat_logique
  on public.mfr_analyses (etat_logique_id);


-- ── mfr_cycles.analyse_retenue_id — FK composite déclarative ──────────
-- « appartient au même cycle » est garanti directement par la FK
-- composite (id, analyse_retenue_id) → mfr_analyses(cycle_id, id) —
-- aucun trigger nécessaire (arbitrage QG, revue 016bis). ON DELETE
-- RESTRICT (et non SET NULL) est précisément ce qui rend cette FK
-- composite possible : RESTRICT ne tente jamais de mettre une colonne à
-- NULL, donc ne heurte jamais la clé primaire NOT NULL `id` de
-- mfr_cycles (une FK composite + SET NULL aurait, elle, tenté de mettre
-- `id` à NULL — structurellement impossible, c'est ce cas précis qui
-- avait motivé le trigger dans la rédaction initiale). Conséquence
-- assumée : suppression d'une analyse actuellement retenue par un cycle
-- bloquée tant que `analyse_retenue_id` n'a pas été vidé par un UPDATE
-- explicite au préalable.
alter table public.mfr_cycles
  add constraint mfr_cycles_analyse_retenue_fkey
  foreign key (id, analyse_retenue_id)
  references public.mfr_analyses (cycle_id, id)
  on delete restrict;


-- Cible nécessaire à mfr_redactions_analyse_cycle_fkey ci-dessous —
-- (id, cycle_id) dans cet ordre précis, distinct de
-- mfr_analyses_cycle_id_id_key (cycle_id, id) déjà créée. Doit exister
-- AVANT la création de mfr_redactions (la FK composite de la table est
-- vérifiée à la création).
alter table public.mfr_analyses
  add constraint mfr_analyses_id_cycle_id_key unique (id, cycle_id);

-- ── TABLE : mfr_redactions ────────────────────────────────────
-- Appartient à une analyse précise. cycle_id dénormalisé pour garantir,
-- via FK composite, que la rédaction reste dans le même cycle que son
-- analyse (D-049).
create table if not exists public.mfr_redactions (
  id              uuid        primary key default gen_random_uuid(),
  analyse_id      uuid        not null,
  cycle_id        uuid        not null,
  user_id         uuid        not null,
  provider        text        not null check (length(provider) between 1 and 100),
  model           text        not null check (length(model) between 1 and 100),
  prompt_version  text        not null check (length(prompt_version) between 1 and 100),
  schema_version  text        not null check (length(schema_version) between 1 and 100),
  statut          text        not null check (statut in ('EN_COURS','SUCCES','ECHEC')),
  demarree_le     timestamptz not null default now(),
  terminee_le     timestamptz,
  erreur          text        check (erreur is null or length(erreur) < 10000),
  output_brut     jsonb       check (output_brut is null or octet_length(output_brut::text) < 2000000),
  cree_le         timestamptz not null default now(),
  -- Cible de la FK composite de mfr_versions.redaction_id (cycle_id +
  -- RESTRICT, cf. Section A suivante).
  constraint mfr_redactions_cycle_id_id_key unique (cycle_id, id),
  constraint mfr_redactions_user_id_id_key unique (user_id, id),
  constraint mfr_redactions_statut_timestamp_check check (
    (statut = 'EN_COURS' and terminee_le is null)
    or
    (statut in ('SUCCES','ECHEC') and terminee_le is not null)
  ),
  -- Ownership + « analyse → rédaction : CASCADE ».
  constraint mfr_redactions_analyse_fkey
    foreign key (user_id, analyse_id)
    references public.mfr_analyses (user_id, id)
    on delete cascade,
  -- Cohérence structurelle : cycle_id dénormalisé doit être exactement
  -- celui de l'analyse parente.
  constraint mfr_redactions_analyse_cycle_fkey
    foreign key (analyse_id, cycle_id)
    references public.mfr_analyses (id, cycle_id)
    on delete cascade
);

create index if not exists idx_mfr_redactions_analyse
  on public.mfr_redactions (analyse_id);
create index if not exists idx_mfr_redactions_cycle
  on public.mfr_redactions (cycle_id);
create index if not exists idx_mfr_redactions_user
  on public.mfr_redactions (user_id);


-- ── TABLE : mfr_versions ──────────────────────────────────────
-- Document utilisateur curé UNIQUEMENT — aucune donnée analytique
-- interne (D-049). Mutable avant validation ; totalement figée (garde-fou
-- DB, trigger ci-dessous) après `valide_le`.
create table if not exists public.mfr_versions (
  id              uuid        primary key default gen_random_uuid(),
  cycle_id        uuid        not null,
  redaction_id    uuid        not null,
  user_id         uuid        not null,
  numero_version  integer     not null check (numero_version >= 1),
  contenu         jsonb       not null check (octet_length(contenu::text) < 2000000),
  cree_le         timestamptz not null default now(),
  modifie_le      timestamptz not null default now(),
  cree_par        uuid        references auth.users(id) on delete set null,
  valide_le       timestamptz,
  valide_par      uuid        references auth.users(id) on delete set null,
  constraint mfr_versions_cycle_numero_key unique (cycle_id, numero_version),
  -- Cible de la FK composite de mfr_publications.version_id.
  constraint mfr_versions_cycle_id_id_key unique (cycle_id, id),
  constraint mfr_versions_user_id_id_key unique (user_id, id),
  -- Ownership, RESTRICT (pas de cascade — une version déjà créée protège
  -- sa rédaction source d'une suppression silencieuse).
  constraint mfr_versions_redaction_user_fkey
    foreign key (user_id, redaction_id)
    references public.mfr_redactions (user_id, id)
    on delete restrict,
  -- « rédaction → version : RESTRICT » + cohérence structurelle : la
  -- rédaction référencée doit appartenir exactement au même cycle que
  -- cette version.
  constraint mfr_versions_redaction_cycle_fkey
    foreign key (cycle_id, redaction_id)
    references public.mfr_redactions (cycle_id, id)
    on delete restrict
);

create index if not exists idx_mfr_versions_cycle
  on public.mfr_versions (cycle_id);
create index if not exists idx_mfr_versions_redaction
  on public.mfr_versions (redaction_id);
create index if not exists idx_mfr_versions_user
  on public.mfr_versions (user_id);

-- Garde-fou DB d'immuabilité post-validation (D-049). Le passage de
-- valide_le NULL → non-NULL (la validation elle-même) reste autorisé —
-- seule une ligne DÉJÀ validée (OLD.valide_le non NULL) devient
-- intégralement figée, quelle que soit la colonne modifiée, et devient
-- également non supprimable (arbitrage QG, revue 016bis : le trigger
-- couvre désormais UPDATE OR DELETE). Un brouillon jamais validé
-- (OLD.valide_le encore NULL) reste librement modifiable ET supprimable.
create or replace function public.mfr_versions_empecher_modification_apres_validation()
returns trigger
language plpgsql
as $$
begin
  if old.valide_le is not null then
    raise exception
      'mfr_versions: modification/suppression interdite après validation (id=%)', old.id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger trg_mfr_versions_immuable
  before update or delete on public.mfr_versions
  for each row execute function public.mfr_versions_empecher_modification_apres_validation();


-- ── TABLE : mfr_publications ──────────────────────────────────
-- Événement officiel de publication, insert-only, garde-fou DB contre
-- UPDATE et DELETE. Au plus une publication par cycle en V1 (D-049).
create table if not exists public.mfr_publications (
  id          uuid        primary key default gen_random_uuid(),
  cycle_id    uuid        not null,
  version_id  uuid        not null,
  user_id     uuid        not null,
  publie_le   timestamptz not null default now(),
  publie_par  uuid        references auth.users(id) on delete set null,
  -- Au plus une publication officielle par cycle (V1).
  constraint mfr_publications_cycle_id_key unique (cycle_id),
  -- Ownership, RESTRICT (« cycle/version → publication : RESTRICT »).
  constraint mfr_publications_version_user_fkey
    foreign key (user_id, version_id)
    references public.mfr_versions (user_id, id)
    on delete restrict,
  -- La version publiée doit appartenir exactement à ce cycle.
  constraint mfr_publications_version_cycle_fkey
    foreign key (cycle_id, version_id)
    references public.mfr_versions (cycle_id, id)
    on delete restrict
);

create index if not exists idx_mfr_publications_version
  on public.mfr_publications (version_id);
create index if not exists idx_mfr_publications_user
  on public.mfr_publications (user_id);

-- Garde-fou DB : insert-only strict, aucune exception.
create or replace function public.mfr_publications_empecher_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'mfr_publications: table insert-only, modification/suppression interdite (id=%)',
    coalesce(old.id, new.id);
end;
$$;

create trigger trg_mfr_publications_immuable
  before update or delete on public.mfr_publications
  for each row execute function public.mfr_publications_empecher_mutation();


-- ────────────────────────────────────────────────────────────
-- SECTION B — EXTENSION DES TABLES mfr_* EXISTANTES (013)
-- ────────────────────────────────────────────────────────────
-- Les 4 tables mfr_* créées par 013 sont conservées — aucun renommage,
-- aucun remplacement. `analyse_id` est ajouté directement à
-- mfr_propositions_analytiques et mfr_referents (etat_logique_id
-- conservé) ; mfr_referent_sources et mfr_proposition_referents restent
-- inchangées (D-049 : leurs invariants composites existants, déjà basés
-- sur etat_logique_id, suffisent — aucune dénormalisation supplémentaire
-- n'y est imposée).
--
-- `analyse_id` est ajouté NOT NULL sans DEFAULT : valide uniquement parce
-- que ces deux tables sont actuellement VIDES (013 Section 8 — aucune
-- fonction d'écriture n'a jamais existé pour elles). Si cette hypothèse
-- s'avérait fausse au moment de l'exécution réelle, l'ALTER TABLE échoue
-- explicitement (erreur Postgres), il ne corrompt silencieusement aucune
-- ligne existante.

alter table public.mfr_propositions_analytiques
  add column analyse_id uuid not null;

alter table public.mfr_propositions_analytiques
  add constraint mfr_propositions_analytiques_analyse_id_key unique (analyse_id, id);

-- Cohérence structurelle : l'analyse référencée doit porter exactement
-- le même etat_logique_id que cette proposition (jamais un snapshot
-- différent, même pour le même utilisateur) — même discipline que le
-- Security Gate S1 de 013 (double FK composite sur etat_logique_id).
alter table public.mfr_propositions_analytiques
  add constraint mfr_propositions_analytiques_analyse_fkey
  foreign key (etat_logique_id, analyse_id)
  references public.mfr_analyses (etat_logique_id, id)
  on delete cascade;

create index if not exists idx_mfr_propositions_analyse
  on public.mfr_propositions_analytiques (analyse_id);


alter table public.mfr_referents
  add column analyse_id uuid not null;

alter table public.mfr_referents
  add constraint mfr_referents_analyse_fkey
  foreign key (etat_logique_id, analyse_id)
  references public.mfr_analyses (etat_logique_id, id)
  on delete cascade;

create index if not exists idx_mfr_referents_analyse
  on public.mfr_referents (analyse_id);


-- ────────────────────────────────────────────────────────────
-- SECTION C — ANCRAGES, HYPOTHÈSES, ÉVALUATIONS D-025, PISTES
-- ────────────────────────────────────────────────────────────

-- ── TABLE : mfr_ancrages ──────────────────────────────────────
-- Appartient à une analyse. Ancrage ↔ PA = 0..N, jamais obligatoire
-- (D-049) — aucune contrainte n'exige qu'un ancrage possède au moins une
-- proposition analytique associée. Immuable dans le workflow normal
-- (discipline applicative — aucun trigger DB, non requis par D-049).
create table if not exists public.mfr_ancrages (
  id          uuid        primary key default gen_random_uuid(),
  analyse_id  uuid        not null,
  user_id     uuid        not null,
  famille     text        not null check (famille in (
                             'CAPACITE','COMPORTEMENT_PASSE','EXPERIENCE_EXPOSITION',
                             'RESSOURCE','ACCES_RELATION','PROBLEME_OBSERVE'
                           )),
  enonce      text        not null check (length(enonce) between 1 and 20000),
  cree_le     timestamptz not null default now(),
  -- Cible des FK composites des jointures (Ancrage↔PA, Hypothèse↔Ancrage).
  constraint mfr_ancrages_analyse_id_id_key unique (analyse_id, id),
  -- Ownership + « analyse → objets analytiques : CASCADE ».
  constraint mfr_ancrages_analyse_fkey
    foreign key (user_id, analyse_id)
    references public.mfr_analyses (user_id, id)
    on delete cascade
);

create index if not exists idx_mfr_ancrages_analyse
  on public.mfr_ancrages (analyse_id);


-- ── TABLE : mfr_proposition_ancrages ──────────────────────────
-- Jointure M:N Ancrage ↔ PA. analyse_id dénormalisé pour garantir, via
-- double FK composite, que la proposition ET l'ancrage appartiennent à
-- la même analyse — même discipline que mfr_proposition_referents (013,
-- Security Gate S1). user_id volontairement absent (table de jointure
-- pure, ownership garanti par transitivité des deux FK ci-dessous).
create table if not exists public.mfr_proposition_ancrages (
  id              uuid  primary key default gen_random_uuid(),
  analyse_id      uuid  not null,
  proposition_id  uuid  not null,
  ancrage_id      uuid  not null,
  constraint mfr_proposition_ancrages_unique unique (proposition_id, ancrage_id),
  constraint mfr_proposition_ancrages_proposition_fkey
    foreign key (analyse_id, proposition_id)
    references public.mfr_propositions_analytiques (analyse_id, id)
    on delete cascade,
  constraint mfr_proposition_ancrages_ancrage_fkey
    foreign key (analyse_id, ancrage_id)
    references public.mfr_ancrages (analyse_id, id)
    on delete cascade
);

create index if not exists idx_mfr_proposition_ancrages_proposition
  on public.mfr_proposition_ancrages (proposition_id);
create index if not exists idx_mfr_proposition_ancrages_ancrage
  on public.mfr_proposition_ancrages (ancrage_id);


-- ── TABLE : mfr_hypotheses ─────────────────────────────────────
-- Statut de FORMATION uniquement (DIRECTION_CANDIDATE / REJETEE) — jamais
-- le résultat D-025, qui vit dans mfr_evaluations_d025 (D-048 §AC :
-- Hypothèse rejetée ≠ Ne pas présenter, deux objets distincts). Les
-- sous-concepts (mécanismes, transformations, acteurs/flux, modalités,
-- exigences, état des exigences, inconnues) sont représentés en JSONB —
-- représentation proportionnée (D-049), forme interne non validée en DB
-- (même frontière que 013 pour les payloads de question).
--
-- VALIDITÉ SÉMANTIQUE D'UNE DIRECTION CANDIDATE — INVARIANT APPLICATIF,
-- PAS UNE GARANTIE DB (arbitrage QG, revue 016bis) : qu'une hypothèse
-- statut='DIRECTION_CANDIDATE' dispose réellement d'au moins un Ancrage
-- constitutif suffisant (D-048 §I), d'au moins un mécanisme (D-048 §T
-- pt.4) et d'une relation acteurs/flux minimale intelligible (D-048 §T
-- pt.5) est un invariant du contrôle de formation/orchestration — il
-- n'est délibérément PAS vérifié ici par un CHECK sur le contenu JSONB
-- (une colonne non NULL ne prouve rien sur la validité de son contenu)
-- ni par un trigger consultant mfr_hypothese_ancrages (ajouterait une
-- vérification applicative déguisée en garde-fou DB, hors périmètre de
-- cette migration). Cette table ne garantit donc QUE l'intégrité
-- structurelle (ownership, appartenance à l'analyse) — jamais la
-- validité métier d'une Direction Candidate.
create table if not exists public.mfr_hypotheses (
  id                    uuid        primary key default gen_random_uuid(),
  analyse_id            uuid        not null,
  user_id               uuid        not null,
  statut                text        not null check (statut in ('DIRECTION_CANDIDATE','REJETEE')),
  formulation           text        not null check (length(formulation) between 1 and 20000),
  mecanismes            jsonb       check (mecanismes is null or octet_length(mecanismes::text) < 100000),
  transformations       jsonb       check (transformations is null or octet_length(transformations::text) < 100000),
  acteurs_flux          jsonb       check (acteurs_flux is null or octet_length(acteurs_flux::text) < 100000),
  modalites_proposees   jsonb       check (modalites_proposees is null or octet_length(modalites_proposees::text) < 100000),
  -- Exigences réelles (ce qui est requis) — distinct de leur état
  -- (ci-dessous). Forme interne non validée en DB.
  exigences             jsonb       check (exigences is null or octet_length(exigences::text) < 100000),
  -- État des exigences ci-dessus (ex. satisfaite / non satisfaite /
  -- inconnue, par exigence) — colonne distincte, jamais fusionnée avec
  -- `exigences` (arbitrage QG, revue 016bis). Forme interne non validée
  -- en DB, même discipline.
  etat_exigences        jsonb       check (etat_exigences is null or octet_length(etat_exigences::text) < 100000),
  inconnues_critiques   jsonb       check (inconnues_critiques is null or octet_length(inconnues_critiques::text) < 100000),
  cree_le               timestamptz not null default now(),
  -- Cible des FK composites des jointures et de mfr_evaluations_d025.
  constraint mfr_hypotheses_analyse_id_id_key unique (analyse_id, id),
  -- Ownership + « analyse → objets analytiques : CASCADE ».
  constraint mfr_hypotheses_analyse_fkey
    foreign key (user_id, analyse_id)
    references public.mfr_analyses (user_id, id)
    on delete cascade
);

create index if not exists idx_mfr_hypotheses_analyse
  on public.mfr_hypotheses (analyse_id);


-- ── TABLE : mfr_hypothese_ancrages ────────────────────────────
-- Jointure M:N Hypothèse ↔ Ancrage. `constitutif` appartient à cette
-- relation, jamais à l'ancrage lui-même (D-049 — un même ancrage peut
-- être constitutif pour une hypothèse et non constitutif pour une autre).
--
-- « Direction Candidate ⇒ au moins un ancrage constitutif suffisant »
-- (D-048 §I) reste un invariant de l'orchestration de formation,
-- délibérément NON vérifié ici — aucun trigger/CHECK n'impose qu'une
-- hypothèse statut='DIRECTION_CANDIDATE' possède au moins une ligne
-- constitutif=true dans cette table (arbitrage QG, revue 016bis).
create table if not exists public.mfr_hypothese_ancrages (
  id             uuid     primary key default gen_random_uuid(),
  analyse_id     uuid     not null,
  hypothese_id   uuid     not null,
  ancrage_id     uuid     not null,
  constitutif    boolean  not null,
  constraint mfr_hypothese_ancrages_unique unique (hypothese_id, ancrage_id),
  constraint mfr_hypothese_ancrages_hypothese_fkey
    foreign key (analyse_id, hypothese_id)
    references public.mfr_hypotheses (analyse_id, id)
    on delete cascade,
  constraint mfr_hypothese_ancrages_ancrage_fkey
    foreign key (analyse_id, ancrage_id)
    references public.mfr_ancrages (analyse_id, id)
    on delete cascade
);

create index if not exists idx_mfr_hypothese_ancrages_hypothese
  on public.mfr_hypothese_ancrages (hypothese_id);
create index if not exists idx_mfr_hypothese_ancrages_ancrage
  on public.mfr_hypothese_ancrages (ancrage_id);


-- ── TABLE : mfr_evaluations_d025 ──────────────────────────────
-- D-025 et la recommandation appartiennent à l'analyse qui les a
-- produites (jamais un état flottant du cycle), au plus une
-- recommandation par analyse (D-049). Quatre filtres séquentiels, sans
-- compensation : un filtre n'est jamais renseigné si le filtre précédent
-- n'a pas été satisfait (guard ci-dessous) — DISPONIBILITÉ intervient en
-- dernier (D-048 §Z). Aucun score, aucun ranking (D-048 §AE).
create table if not exists public.mfr_evaluations_d025 (
  id                        uuid        primary key default gen_random_uuid(),
  analyse_id                uuid        not null,
  hypothese_id              uuid        not null,
  user_id                   uuid        not null,
  coherence_ok              boolean     not null,
  compatibilite_ok          boolean,
  actionnabilite_resultat   text        check (actionnabilite_resultat in (
                                           'ACTIONNABLE_MAINTENANT',
                                           'CONSTRUCTIBLE_MAIS_PREMATUREE',
                                           'SANS_ROUTE_RAISONNABLE'
                                         )),
  disponibilite_ok          boolean,
  sortie                    text        not null check (sortie in (
                                           'PRESENTER_MAINTENANT',
                                           'DIRECTION_A_GARDER_EN_VUE',
                                           'NE_PAS_PRESENTER'
                                         )),
  recommandee_aujourdhui    boolean     not null default false,
  justification             jsonb       check (justification is null or octet_length(justification::text) < 100000),
  cree_le                   timestamptz not null default now(),
  -- Séquentialité sans compensation (D-048 §B.1/§Z) : chaque filtre n'est
  -- évalué/renseigné que si tous les filtres qui le précèdent ont été
  -- satisfaits. Le mapping complet filtre→sortie n'est volontairement
  -- pas verrouillé ici au-delà de ce guard.
  constraint mfr_evaluations_d025_sequentialite_check check (
    (compatibilite_ok is null or coherence_ok = true)
    and (actionnabilite_resultat is null or compatibilite_ok = true)
    and (disponibilite_ok is null or actionnabilite_resultat = 'ACTIONNABLE_MAINTENANT')
  ),
  -- D-048 §AD : une recommandation n'existe que parmi les Directions
  -- PRÉSENTER MAINTENANT.
  constraint mfr_evaluations_d025_recommandation_check check (
    not recommandee_aujourdhui or sortie = 'PRESENTER_MAINTENANT'
  ),
  constraint mfr_evaluations_d025_hypothese_fkey
    foreign key (analyse_id, hypothese_id)
    references public.mfr_hypotheses (analyse_id, id)
    on delete cascade,
  -- Ownership + « analyse → objets analytiques : CASCADE ».
  constraint mfr_evaluations_d025_analyse_fkey
    foreign key (user_id, analyse_id)
    references public.mfr_analyses (user_id, id)
    on delete cascade
);

create index if not exists idx_mfr_evaluations_d025_hypothese
  on public.mfr_evaluations_d025 (hypothese_id);
create index if not exists idx_mfr_evaluations_d025_analyse
  on public.mfr_evaluations_d025 (analyse_id);

-- Au plus une recommandation aujourd'hui par analyse (D-049) — index
-- unique partiel, même mécanisme que idx_mpd_dossiers_courant (013).
create unique index if not exists idx_mfr_evaluations_d025_recommandee_unique
  on public.mfr_evaluations_d025 (analyse_id)
  where recommandee_aujourdhui;


-- ── TABLE : mfr_pistes ────────────────────────────────────────
-- Aucune évaluation D-025, aucune mécanique de re-entry dans T-MFR.1
-- (D-049/GO QG — hors périmètre explicite). Le résultat futur d'une
-- piste redevient un simple fait, repassant par Fait → PA → Ancrage →
-- Formation dans un cycle ultérieur (D-048 §U/§AK) — jamais conçu ici.
create table if not exists public.mfr_pistes (
  id                        uuid        primary key default gen_random_uuid(),
  analyse_id                uuid        not null,
  user_id                   uuid        not null,
  incertitude_constitutive  text        not null check (length(incertitude_constitutive) between 1 and 20000),
  action_reduction          text        not null check (length(action_reduction) between 1 and 20000),
  variables_test            jsonb       check (variables_test is null or octet_length(variables_test::text) < 100000),
  cree_le                   timestamptz not null default now(),
  -- Ownership + « analyse → objets analytiques : CASCADE ».
  constraint mfr_pistes_analyse_fkey
    foreign key (user_id, analyse_id)
    references public.mfr_analyses (user_id, id)
    on delete cascade
);

create index if not exists idx_mfr_pistes_analyse
  on public.mfr_pistes (analyse_id);


-- ────────────────────────────────────────────────────────────
-- SECTION D — RLS (posture fermée, aucune policy authenticated)
-- ────────────────────────────────────────────────────────────
-- Même discipline que les 4 tables mfr_* de 013 : aucune policy
-- authenticated, y compris SELECT, même pour mfr_versions/mfr_publications
-- (accès futur exclusivement via une RPC de lecture dédiée côté serveur,
-- non conçue dans cette migration — jamais une policy user directe,
-- conformément au GO QG §6).

alter table public.mfr_cycles enable row level security;
alter table public.mfr_analyses enable row level security;
alter table public.mfr_redactions enable row level security;
alter table public.mfr_versions enable row level security;
alter table public.mfr_publications enable row level security;
alter table public.mfr_ancrages enable row level security;
alter table public.mfr_proposition_ancrages enable row level security;
alter table public.mfr_hypotheses enable row level security;
alter table public.mfr_hypothese_ancrages enable row level security;
alter table public.mfr_evaluations_d025 enable row level security;
alter table public.mfr_pistes enable row level security;

-- Aucune policy créée sur les tables ci-dessus — posture fermée par
-- défaut (aucun accès authenticated/anon tant qu'aucune policy n'existe).


-- ────────────────────────────────────────────────────────────
-- SECTION E — PRIVILÈGES (défense en profondeur, indépendante de RLS)
-- ────────────────────────────────────────────────────────────
-- Même discipline que 013 Section 5 : REVOKE ALL explicite pour
-- public/anon/authenticated sur chaque table, aucun GRANT réaccordé —
-- l'accès futur viendra exclusivement d'une capacité backend/RPC dédiée,
-- non conçue dans cette migration.

revoke all on public.mfr_cycles from public, anon, authenticated;
revoke all on public.mfr_analyses from public, anon, authenticated;
revoke all on public.mfr_redactions from public, anon, authenticated;
revoke all on public.mfr_versions from public, anon, authenticated;
revoke all on public.mfr_publications from public, anon, authenticated;
revoke all on public.mfr_ancrages from public, anon, authenticated;
revoke all on public.mfr_proposition_ancrages from public, anon, authenticated;
revoke all on public.mfr_hypotheses from public, anon, authenticated;
revoke all on public.mfr_hypothese_ancrages from public, anon, authenticated;
revoke all on public.mfr_evaluations_d025 from public, anon, authenticated;
revoke all on public.mfr_pistes from public, anon, authenticated;

-- mfr_propositions_analytiques / mfr_referents : déjà REVOKE ALL par 013
-- (inchangé par un ALTER TABLE ADD COLUMN — les privilèges sont posés par
-- table, pas par colonne). Aucune action nécessaire ici.
