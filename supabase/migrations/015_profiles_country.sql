-- ============================================================
-- PLAN B RENTABLE — Migration 015
-- Ajout de profiles.country (pays de résidence du profil)
-- ============================================================
-- GO QG (audit drift confirmé) : profiles.country N'EXISTE PAS en
-- production au moment de cette migration — toute documentation
-- antérieure l'affirmant « dormante »/existante était factuellement
-- fausse (audit read-only du schéma réel, projet PlanB App,
-- ref ggeohumiyxqhknnftydi). Cette migration CRÉE réellement la
-- colonne, elle ne « réutilise » rien.
--
-- Additive, nullable, aucun default — aucune donnée existante
-- modifiée, aucune des 23 lignes profiles actuelles affectée au-delà
-- de l'ajout de la colonne (NULL pour toutes). Aucune modification de
-- handle_new_user() (le trigger réel insère déjà sans lister country,
-- une colonne nullable supplémentaire ne le casse jamais). Aucune
-- modification RLS (profiles_select_own/update_own + les deux
-- policies françaises préexistantes couvrent déjà toute colonne de
-- la ligne, sans restriction par colonne). Ne touche à aucune autre
-- table ni à preferred_currency (migration 014, déjà en place).
--
-- Safe à rejouer : ADD COLUMN IF NOT EXISTS (colonne), bloc DO avec
-- vérification pg_constraint (contrainte CHECK), COMMENT ON (toujours
-- idempotent par nature).

alter table public.profiles
  add column if not exists country text;

comment on column public.profiles.country is
  'Pays de résidence du profil utilisateur (code ISO 3166-1 alpha-2, ex. SN, MA, FR, CN). '
  'Distinct de territoire_principal du MPD (territoire où l''utilisateur envisage de développer '
  'son Plan B — peut différer du pays de résidence). Utilisé notamment pour proposer une devise '
  'préférée/par défaut (profiles.preferred_currency, migration 014) ; ne verrouille jamais la '
  'devise réelle d''une réponse MPD (ex. Q28), qui reste modifiable indépendamment.';

-- Garde-fou DB léger : contrôle uniquement le FORMAT ISO alpha-2 (deux
-- lettres majuscules), jamais une recopie du référentiel applicatif
-- des 242 pays sélectionnables (source de vérité unique :
-- src/lib/profile/pays.ts). Empêche uniquement des valeurs
-- manifestement invalides (ex. 'Senegal', 'sn', 'SEN', '123') sans
-- dupliquer la liste. Ajout idempotent via vérification pg_constraint
-- (ALTER TABLE ... ADD CONSTRAINT ne supporte pas IF NOT EXISTS en
-- PostgreSQL — ce bloc DO est la forme idiomatique déjà utilisée dans
-- ce projet, voir 004_coaching_tables.sql/005_bilan_sessions.sql pour
-- le même motif appliqué aux policies).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_country_iso_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_country_iso_format_check
      check (country is null or country ~ '^[A-Z]{2}$');
  end if;
end $$;
