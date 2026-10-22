-- ============================================================
-- Migration 024 — Curation humaine (T-MFR.4B)
-- ============================================================
-- APPLIQUÉE LIVE ET VÉRIFIÉE sur le projet réel `ggeohumiyxqhknnftydi`
-- (T-MFR.4B, le 2026-10-22, via `supabase db query -f ... --linked`,
-- Stratégie B, même discipline que 013-023). RPC `mfr_creer_curation` en
-- production, postcheck objets/grants conforme, test SQL rollback 18/18
-- PASS, REAL E2E validé séparément. Le registre
-- `supabase_migrations.schema_migrations` reste volontairement absent
-- (D-050), inchangé. NE PAS RÉAPPLIQUER.
--
-- Traduction physique de T-MFR.4B : après SELECT RETAINED (023), une
-- seconde décision humaine distincte — quelles directions parmi les
-- `PRESENTER_MAINTENANT` de l'analyse retenue seront réellement
-- présentées (0 à 3), et la recommandation proposée par l'IA/ENGINE
-- est-elle confirmée ou retirée. Jamais une mutation de l'analyse :
-- une curation est un acte humain append-only distinct, référençant
-- uniquement des `hypothese_id` — aucune recopie du graphe analytique.
--
-- L'identité de la direction recommandée n'est JAMAIS stockée ici :
-- `mfr_curations.recommandation_confirmee` n'est qu'un booléen
-- confirmant ou retirant ce que `mfr_evaluations_d025.recommandee_aujourdhui`
-- a déjà proposé pour cette analyse (au plus une, déjà garanti par
-- l'index unique partiel de 016). Aucune colonne ne permet d'écrire
-- qu'une AUTRE direction devient recommandée — la substitution reste
-- structurellement impossible, pas seulement interdite par convention.
--
-- Append-only strict : aucun UPDATE, aucun DELETE applicatif sur
-- `mfr_curations`/`mfr_curation_directions`. Un changement d'avis humain
-- = un nouvel appel RPC = une nouvelle ligne. La « curation officielle »
-- se résout en lecture (`order by cree_le desc, id desc limit 1` pour
-- le cycle et l'analyse retenue courante), jamais par un flag muté —
-- choix délibéré, plus strict que l'idiome `est_courant`/index unique
-- partiel déjà utilisé ailleurs (`mpd_dossiers`, `bilan_sessions`),
-- précisément parce qu'ici aucune ligne de curation ne doit jamais être
-- réécrite, même pour un simple flag.
--
-- Fermeture à l'écriture applicative directe (arbitrage QG) : grants
-- `INSERT`/`UPDATE`/`DELETE` explicitement révoqués sur les deux
-- tables pour `anon`/`authenticated`/`service_role`/`PUBLIC` — le seul
-- chemin d'écriture est la RPC `SECURITY DEFINER` ci-dessous, qui écrit
-- avec les privilèges de son propriétaire (`postgres`), jamais ceux de
-- l'appelant. Vérifié empiriquement avant cette rédaction : `service_role`
-- a `rolbypassrls=true` (contourne RLS) mais PAS `rolsuper` — les
-- privilèges `GRANT`/`REVOKE` au niveau table restent un système
-- totalement distinct de RLS et s'appliquent donc intégralement à
-- `service_role` lui-même. Révoquer `INSERT`/`UPDATE`/`DELETE` à
-- `service_role` sur ces deux tables est donc une garde RÉELLEMENT
-- appliquée par Postgres, pas une simple convention de confiance —
-- `SELECT` reste accordé à `service_role` (lecture d'audit déjà
-- pratiquée tout au long de ce chantier, aucune nouvelle architecture
-- de lecture T-MFR.5 ouverte ici). Limite honnête, non dissimulée : un
-- accès direct en tant que `postgres`/`supabase_admin` (propriétaire des
-- tables, hors `service_role`) contourne nécessairement toute
-- permission — hors périmètre de toute garde applicative possible, par
-- définition d'un rôle superutilisateur/propriétaire.
--
-- RLS activée, zéro policy, sur les deux nouvelles tables — même
-- discipline que les 11 tables MFR déjà existantes (016, D-049).

-- ────────────────────────────────────────────────────────────
-- 1. Tables
-- ────────────────────────────────────────────────────────────

-- Un acte de curation humaine, append-only. `analyse_id` dénormalisé
-- pour garantir, via FK composite, que la curation reste dans le même
-- cycle que son analyse (même discipline que `mfr_redactions`, 016).
create table if not exists public.mfr_curations (
  id                        uuid        primary key default gen_random_uuid(),
  cycle_id                  uuid        not null,
  analyse_id                uuid        not null,
  user_id                   uuid        not null,
  recommandation_confirmee  boolean     not null default false,
  cree_le                   timestamptz not null default now(),
  -- Cible de la FK composite de mfr_curation_directions.curation_id.
  constraint mfr_curations_id_analyse_id_key unique (id, analyse_id),
  -- Ownership + « cycle → curation : CASCADE ».
  constraint mfr_curations_cycle_fkey
    foreign key (user_id, cycle_id)
    references public.mfr_cycles (user_id, id)
    on delete cascade,
  -- Ownership + « analyse → curation : CASCADE ».
  constraint mfr_curations_analyse_fkey
    foreign key (user_id, analyse_id)
    references public.mfr_analyses (user_id, id)
    on delete cascade,
  -- Cohérence structurelle : l'analyse référencée doit appartenir
  -- exactement à ce même cycle (même pattern que mfr_redactions_analyse_cycle_fkey).
  constraint mfr_curations_analyse_cycle_fkey
    foreign key (analyse_id, cycle_id)
    references public.mfr_analyses (id, cycle_id)
    on delete cascade
);

create index if not exists idx_mfr_curations_cycle_analyse
  on public.mfr_curations (cycle_id, analyse_id);
create index if not exists idx_mfr_curations_user
  on public.mfr_curations (user_id);

alter table public.mfr_curations enable row level security;

revoke all on public.mfr_curations from public, anon, authenticated, service_role;
grant select on public.mfr_curations to service_role;

-- 0 à 3 directions sélectionnées pour une curation — référence uniquement
-- (aucune recopie du graphe). `position` = ordre éditorial d'affichage
-- UNIQUEMENT, jamais un score, un classement analytique ni une décision
-- ENGINE (D-048 §AE, inchangé — même interdiction, appliquée ici à un
-- nouveau contexte).
create table if not exists public.mfr_curation_directions (
  id            uuid     primary key default gen_random_uuid(),
  curation_id   uuid     not null,
  analyse_id    uuid     not null,
  hypothese_id  uuid     not null,
  position      smallint not null check (position between 1 and 3),
  -- Aucun doublon de direction au sein d'une même curation.
  constraint mfr_curation_directions_unique unique (curation_id, hypothese_id),
  -- Aucune collision de rang d'affichage au sein d'une même curation.
  constraint mfr_curation_directions_position_key unique (curation_id, position),
  -- La curation parente doit porter exactement cette même analyse.
  constraint mfr_curation_directions_curation_fkey
    foreign key (curation_id, analyse_id)
    references public.mfr_curations (id, analyse_id)
    on delete cascade,
  -- L'hypothèse référencée doit appartenir exactement à cette même analyse.
  constraint mfr_curation_directions_hypothese_fkey
    foreign key (analyse_id, hypothese_id)
    references public.mfr_hypotheses (analyse_id, id)
    on delete cascade
);

create index if not exists idx_mfr_curation_directions_hypothese
  on public.mfr_curation_directions (hypothese_id);

alter table public.mfr_curation_directions enable row level security;

revoke all on public.mfr_curation_directions from public, anon, authenticated, service_role;
grant select on public.mfr_curation_directions to service_role;

-- ────────────────────────────────────────────────────────────
-- 2. Trigger — défense en profondeur, DB-level (pas seulement RPC/TS)
-- ────────────────────────────────────────────────────────────
-- La RPC ci-dessous valide déjà cette condition avant toute écriture —
-- ce trigger est une seconde garde indépendante, au cas où une ligne
-- serait un jour insérée par un autre chemin privilégié (ex. migration
-- future, correction manuelle) : jamais une direction hors
-- `PRESENTER_MAINTENANT` ne peut être persistée, quel que soit le
-- chemin d'écriture.
create or replace function public.mfr_curation_directions_verifier_presentable()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.mfr_evaluations_d025
    where analyse_id = new.analyse_id
      and hypothese_id = new.hypothese_id
      and sortie = 'PRESENTER_MAINTENANT'
  ) then
    raise exception
      'mfr_curation_directions: direction non PRESENTER_MAINTENANT pour cette analyse (hypothese_id=%)', new.hypothese_id;
  end if;
  return new;
end;
$$;

create trigger trg_mfr_curation_directions_presentable
  before insert on public.mfr_curation_directions
  for each row execute function public.mfr_curation_directions_verifier_presentable();

-- ────────────────────────────────────────────────────────────
-- 3. mfr_creer_curation — RPC unique d'écriture, atomique
-- ────────────────────────────────────────────────────────────
-- Un seul appel = une décision humaine complète (jamais un CRUD
-- incrémental direction par direction) : toutes les gardes sont
-- vérifiées avant la moindre écriture, aucune curation invalide ne peut
-- exister même transitoirement. Verrou du cycle en premier (FOR UPDATE),
-- même discipline que 017/019/023. Aucun `auth.uid()` — même acteur
-- privilégié transverse que 023, jamais le propriétaire du cycle.
create or replace function public.mfr_creer_curation(
  p_cycle_id                 uuid,
  p_analyse_id               uuid,
  p_hypothese_ids            uuid[],
  p_recommandation_confirmee boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle        record;
  v_nb_total     integer;
  v_nb_distincts integer;
  v_nb_eligibles integer;
  v_reco_id      uuid;
  v_curation_id  uuid;
begin
  select * into v_cycle
  from public.mfr_cycles
  where id = p_cycle_id
  for update;

  if not found then
    return json_build_object('error', 'cycle_introuvable');
  end if;

  if exists (select 1 from public.mfr_publications where cycle_id = p_cycle_id) then
    return json_build_object('error', 'cycle_publie');
  end if;

  if v_cycle.analyse_retenue_id is null then
    return json_build_object('error', 'aucune_analyse_retenue');
  end if;

  if v_cycle.analyse_retenue_id <> p_analyse_id then
    return json_build_object('error', 'analyse_retenue_a_change');
  end if;

  v_nb_total := coalesce(array_length(p_hypothese_ids, 1), 0);

  if v_nb_total > 3 then
    return json_build_object('error', 'trop_de_directions');
  end if;

  select count(distinct x) into v_nb_distincts from unnest(p_hypothese_ids) as x;
  if v_nb_distincts <> v_nb_total then
    return json_build_object('error', 'doublon_direction');
  end if;

  if v_nb_total > 0 then
    select count(*) into v_nb_eligibles
    from public.mfr_evaluations_d025 e
    where e.analyse_id = p_analyse_id
      and e.sortie = 'PRESENTER_MAINTENANT'
      and e.hypothese_id = any(p_hypothese_ids);

    if v_nb_eligibles <> v_nb_total then
      return json_build_object('error', 'direction_non_eligible');
    end if;
  end if;

  if p_recommandation_confirmee then
    select hypothese_id into v_reco_id
    from public.mfr_evaluations_d025
    where analyse_id = p_analyse_id
      and recommandee_aujourdhui = true;

    if v_reco_id is null then
      return json_build_object('error', 'aucune_recommandation_proposee');
    end if;

    if not (v_reco_id = any(p_hypothese_ids)) then
      return json_build_object('error', 'recommandation_non_selectionnee');
    end if;
  end if;

  -- Toutes les gardes sont passées — écriture atomique, append-only.
  insert into public.mfr_curations (cycle_id, analyse_id, user_id, recommandation_confirmee)
  values (p_cycle_id, p_analyse_id, v_cycle.user_id, p_recommandation_confirmee)
  returning id into v_curation_id;

  if v_nb_total > 0 then
    insert into public.mfr_curation_directions (curation_id, analyse_id, hypothese_id, position)
    select v_curation_id, p_analyse_id, h.hypothese_id, h.position::smallint
    from unnest(p_hypothese_ids) with ordinality as h(hypothese_id, position);
  end if;

  return json_build_object('success', true, 'curation_id', v_curation_id, 'cycle_id', p_cycle_id, 'analyse_id', p_analyse_id);
end;
$$;

revoke all on function public.mfr_creer_curation(uuid, uuid, uuid[], boolean) from public, anon, authenticated;
grant execute on function public.mfr_creer_curation(uuid, uuid, uuid[], boolean) to service_role;
