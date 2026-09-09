-- ============================================================
-- Migration 012 — Fondation Rapport CoachRedo
-- ============================================================
-- Fondation DB uniquement (D-013 + arbitrages QG du 2026-09-09) :
--   1. Prérequis : UNIQUE(user_id, id) sur bilan_sessions
--      (nécessaire pour la FK composite ci-dessous — id déjà PK,
--      cette contrainte est donc additive et non destructive)
--   2. Table rapports : schéma complet D-013
--   3. RLS activé, AUCUNE policy authenticated (ni SELECT, ni INSERT,
--      ni UPDATE) — accès client exclusivement via une future RPC
--      SECURITY DEFINER (hors scope de cette migration), écriture
--      exclusivement via service_role (Server Actions Admin, hors
--      scope de cette migration)
--
-- Hors scope de cette migration (volontairement) :
--   - RPC de lecture client
--   - Toute policy authenticated
--   - Trigger updated_at (décision QG : géré applicativement,
--     `updated_at = now()` posé explicitement par les futures
--     Server Actions — cf. pattern déjà en place sur bilan_responses)
--   - Toute logique IA / fournisseur IA
--   - Correction de la dette admin bilan_version (incrément séparé)
--
-- Protections contre certaines réexécutions accidentelles présentes
-- (IF NOT EXISTS, DO blocks avec vérification pg_constraint) ; cette
-- migration reste destinée à être appliquée une seule fois selon le
-- workflow normal Supabase — ces protections ne garantissent pas la
-- réparation automatique d'une table déjà existante mais incomplète.
-- NE PAS EXÉCUTER directement — exécution manuelle par le QG.
-- ============================================================


-- ── 1. PRÉREQUIS : UNIQUE(user_id, id) sur bilan_sessions ─────
-- Nécessaire pour que la FK composite de rapports (ci-dessous)
-- puisse référencer (user_id, id). Additive, non destructive —
-- id est déjà PK, cette contrainte n'ajoute qu'une garantie
-- d'unicité supplémentaire sur un couple qui l'est déjà de facto.

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bilan_sessions_user_id_id_key'
    and conrelid = 'public.bilan_sessions'::regclass
  ) then
    alter table public.bilan_sessions
      add constraint bilan_sessions_user_id_id_key
      unique (user_id, id);
  end if;
end $$;


-- ── 2. TABLE : rapports ────────────────────────────────────────
-- Schéma arbitré D-013. Un seul Rapport total par session Bilan
-- (tous statuts confondus) — UNIQUE(bilan_session_id).
-- Intégrité propriétaire garantie en DB par la FK composite,
-- non contournable même par service_role.

create table if not exists public.rapports (
  id                 uuid        primary key default gen_random_uuid(),

  user_id            uuid        not null
                                  references auth.users(id) on delete cascade,
  bilan_session_id   uuid        not null,

  statut             text        not null default 'draft'
                                  check (statut in ('draft', 'published')),

  -- Contenu éditorial — nullable : une ligne peut exister (créée)
  -- avant que la génération n'ait produit de contenu.
  sections           jsonb,
  contenu_coach      text,

  -- Métadonnées internes — jamais mêlées au contenu éditorial,
  -- jamais exposées au client (evidence_refs, warnings de validation).
  sections_meta      jsonb,

  -- Provenance IA — provider-neutral, nullable tant qu'aucun
  -- fournisseur n'est choisi/installé (décision différée, non bloquante).
  ai_provider        text,
  ai_model           text,
  ai_generated_at    timestamptz,

  -- Publication — admin-only, nullable tant que statut = 'draft'.
  -- ON DELETE SET NULL (arbitrage QG) : le Rapport appartient au
  -- client et doit survivre à la suppression d'un compte admin ;
  -- publie_le reste l'information durable prouvant la publication
  -- même si publie_par devient NULL par la suite.
  publie_par         uuid        references auth.users(id) on delete set null,
  publie_le          timestamptz,

  schema_version     integer     not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint rapports_bilan_session_id_key unique (bilan_session_id),

  constraint rapports_user_bilan_session_fkey
    foreign key (user_id, bilan_session_id)
    references public.bilan_sessions (user_id, id),

  -- Invariant de cohérence publication (arbitrage QG) :
  --   draft     ⇒ publie_le IS NULL ET publie_par IS NULL
  --   published ⇒ publie_le IS NOT NULL
  --   (publie_par reste autorisé à NULL même en published, car
  --   ON DELETE SET NULL doit rester valide si l'ancien compte
  --   admin est supprimé)
  -- Permet une publication atomique en une seule opération :
  --   statut='published', publie_le=now(), publie_par=<admin_uuid>,
  --   updated_at=now()
  constraint rapports_publication_consistency_check
    check (
      (
        statut = 'draft'
        and publie_le is null
        and publie_par is null
      )
      or
      (
        statut = 'published'
        and publie_le is not null
      )
    )
);


-- ── 3. RLS : rapports ──────────────────────────────────────────
-- Activé, AUCUNE policy authenticated créée dans cette migration.
-- Conséquence : ni le client ni un utilisateur authentifié
-- quelconque ne peut lire, écrire, modifier ou supprimer une ligne
-- via l'API RLS — seul service_role (bypass RLS systématique,
-- réservé aux usages passant par requireAdminService()) peut agir,
-- jusqu'à l'introduction d'une future RPC de lecture dédiée.

alter table public.rapports enable row level security;
