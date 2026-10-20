-- ============================================================
-- Migration 020 — Music V0 : commandes de chansons personnalisées (LOT 1)
-- ============================================================
-- MIGRATION CANDIDATE — NON EXÉCUTÉE. Exécution manuelle par le QG,
-- après GO distinct (même discipline que 016-018 : `psql` direct ou
-- éditeur SQL Supabase, registre CLI volontairement absent, D-050).
--
-- Traduction physique de D-058 (commande Music sans compte CoachRedo,
-- co-décision QG App + QG Music, tranche D-056.M.1), limitée au LOT 1 :
--   création d'une commande + référence CRM atomique, coordonnées
--   séparées, confirmation manuelle du paiement Wave, lien privé
--   questionnaire (génération / régénération / révocation / résolution).
--
-- Hors LOT 1 (non créé ici) : `music_questionnaires`, `music_briefs` et
-- leur logique (LOT 2), Wave API, rattachement à `auth.users`,
-- tableau de bord, livraison.
--
-- Cloisonnement fort (D-056.F/H) : RLS activée, AUCUNE policy, aucun
-- privilège de table pour anon/authenticated ; accès exclusivement par
-- fonctions SECURITY DEFINER (search_path fixé) exécutables par
-- service_role uniquement. Les fonctions d'administration sont aussi
-- appelées par la commande d'administration locale
-- scripts/music-v0/admin.mjs (clé service_role, poste de Coach Redouane).
--
-- Jetons des liens privés : générés UNIQUEMENT côté serveur Node
-- (crypto.randomBytes(32), base64url — scripts/music-v0/admin.mjs). La
-- base ne reçoit et ne stocke que l'empreinte SHA-256 (hexadécimal) ;
-- elle ne génère ni ne voit jamais un jeton en clair. Aucune extension
-- requise. Aucun objet existant n'est modifié.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Référence CRM : séquence atomique, jamais réutilisée
-- ────────────────────────────────────────────────────────────
-- CRM-00001 à CRM-00004 sont des commandes historiques hors base :
-- la séquence commence donc à 5. nextval() est atomique et ne revient
-- jamais en arrière (même après rollback) : une référence consommée
-- n'est jamais réattribuée. Jamais de MAX(reference) + 1.
create sequence public.music_order_ref_seq
  as integer
  start with 5
  minvalue 5
  maxvalue 99999
  no cycle;


-- ────────────────────────────────────────────────────────────
-- 2. music_orders — la commande (aucune coordonnée)
-- ────────────────────────────────────────────────────────────
create table public.music_orders (
  id                              uuid primary key default gen_random_uuid(),
  reference                       text not null unique
                                    default ('CRM-' || lpad(nextval('public.music_order_ref_seq')::text, 5, '0')),
  -- D-058 : commande possible sans compte ; rattachement ultérieur
  -- uniquement par vérification explicite (jamais automatique).
  user_id                         uuid null references auth.users(id) on delete restrict,
  -- Statuts futurs déjà acceptés pour rester compatible avec le cycle
  -- validé ; seuls EN_ATTENTE_PAIEMENT, PAYÉE et ANNULÉE sont utilisés
  -- par les fonctions du LOT 1.
  statut                          text not null default 'EN_ATTENTE_PAIEMENT',
  relation                        text not null,
  relation_autre                  text null,
  beneficiaire_prenom             text not null,
  occasion                        text not null,
  date_souhaitee                  date null,          -- null = « Pas de date précise »
  marche                          text not null default 'SN',
  montant_xof                     integer not null default 29900,
  cle_idempotence                 uuid not null unique,
  paye_le                         timestamptz null,
  ref_wave                        text null,
  annule_le                       timestamptz null,
  motif_annulation                text null,
  jeton_questionnaire_hash        text null unique,
  jeton_questionnaire_expire_le   timestamptz null,
  cree_le                         timestamptz not null default now(),
  maj_le                          timestamptz not null default now(),

  constraint music_orders_reference_format
    check (reference ~ '^CRM-[0-9]{5}$' and substring(reference from 5)::integer >= 5),
  constraint music_orders_statut_valide
    check (statut in ('EN_ATTENTE_PAIEMENT', 'PAYÉE', 'QUESTIONNAIRE_REÇU', 'BRIEF_À_VALIDER',
                      'BRIEF_VALIDÉ', 'EN_PRODUCTION', 'PRÊTE_À_LIVRER', 'LIVRÉE', 'ANNULÉE')),
  constraint music_orders_relation_valide
    check (relation in ('Ma mère', 'Mon père', 'Mon épouse', 'Mon mari', 'Mon/ma partenaire', 'Mon fils',
                        'Ma fille', 'Mon frère', 'Ma sœur', 'Un(e) ami(e)', 'Mes parents', 'Ma famille', 'Autre')),
  constraint music_orders_relation_autre
    check ((relation = 'Autre') = (relation_autre is not null)
           and (relation_autre is null or char_length(relation_autre) between 1 and 80)),
  constraint music_orders_occasion_valide
    check (occasion in ('Anniversaire', 'Mariage', 'Anniversaire de couple', 'Demande en mariage', 'Naissance',
                        'Fête des mères', 'Fête des pères', 'Remerciement', 'Encouragement',
                        'Déclaration d''amour', 'Hommage', 'Sans occasion particulière', 'Autre')),
  constraint music_orders_beneficiaire_longueur
    check (char_length(beneficiaire_prenom) between 1 and 60),
  constraint music_orders_marche_v0 check (marche = 'SN'),
  constraint music_orders_montant_v0 check (montant_xof = 29900),
  constraint music_orders_ref_wave_longueur check (ref_wave is null or char_length(ref_wave) <= 120),
  constraint music_orders_motif_longueur check (motif_annulation is null or char_length(motif_annulation) <= 500),
  -- Paiement : PAYÉE implique un paiement horodaté.
  constraint music_orders_paye_coherent
    check (statut not in ('PAYÉE', 'QUESTIONNAIRE_REÇU', 'BRIEF_À_VALIDER', 'BRIEF_VALIDÉ',
                          'EN_PRODUCTION', 'PRÊTE_À_LIVRER', 'LIVRÉE') or paye_le is not null),
  constraint music_orders_annule_coherent
    check ((statut = 'ANNULÉE') = (annule_le is not null)),
  -- Aucun lien questionnaire avant paiement ; empreinte et expiration vont ensemble.
  constraint music_orders_jeton_apres_paiement
    check (jeton_questionnaire_hash is null or paye_le is not null),
  constraint music_orders_jeton_complet
    check ((jeton_questionnaire_hash is null) = (jeton_questionnaire_expire_le is null)),
  constraint music_orders_jeton_format
    check (jeton_questionnaire_hash is null or jeton_questionnaire_hash ~ '^[0-9a-f]{64}$')
);

alter sequence public.music_order_ref_seq owned by public.music_orders.reference;


-- ────────────────────────────────────────────────────────────
-- 3. music_order_contacts — coordonnées déclarées, séparées
-- ────────────────────────────────────────────────────────────
-- Contact déclaré ≠ identité vérifiée (D-058) : aucune relation avec
-- auth.users, aucun rapprochement automatique.
create table public.music_order_contacts (
  order_id    uuid primary key references public.music_orders(id) on delete cascade,
  prenom      text not null,
  email       text not null,
  whatsapp    text not null,          -- format international : +221771234567
  cree_le     timestamptz not null default now(),

  constraint music_order_contacts_prenom_longueur check (char_length(prenom) between 1 and 60),
  constraint music_order_contacts_email_format
    check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  constraint music_order_contacts_whatsapp_format check (whatsapp ~ '^\+[0-9]{7,15}$')
);


-- ────────────────────────────────────────────────────────────
-- 4. Cloisonnement fort : RLS sans policy, aucun privilège direct
-- ────────────────────────────────────────────────────────────
alter table public.music_orders enable row level security;
alter table public.music_order_contacts enable row level security;

-- Supabase accorde par défaut tous les privilèges sur les nouveaux objets
-- de `public` à anon, authenticated et service_role : ils sont retirés
-- explicitement. service_role compris : la clé serveur n'a AUCUN accès
-- générique aux tables Music, uniquement l'exécution des RPC ci-dessous.
-- (L'éditeur SQL / tableau de bord Supabase, rôle propriétaire, garde l'accès.)
revoke all on table public.music_orders from public, anon, authenticated, service_role;
revoke all on table public.music_order_contacts from public, anon, authenticated, service_role;
revoke all on sequence public.music_order_ref_seq from public, anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 5. Empreinte de jeton : format attendu
-- ────────────────────────────────────────────────────────────
-- SHA-256 hexadécimal (64 caractères) d'un jeton de 32 octets aléatoires
-- généré côté serveur Node. Vérifié par chaque fonction qui en reçoit une
-- (et par la contrainte music_orders_jeton_format).

-- ────────────────────────────────────────────────────────────
-- 6. music_creer_commande — création publique (via la route serveur)
-- ────────────────────────────────────────────────────────────
-- Appelée uniquement par la route POST /api/music/commandes (service_role),
-- après validation côté serveur. Les contraintes de table revalident
-- (défense en profondeur). Idempotente : même clé → même commande, même
-- référence, aucune seconde commande (y compris en cas d'appels concurrents).
-- Retour minimal : la référence.
create or replace function public.music_creer_commande(
  p_cle_idempotence      uuid,
  p_prenom               text,
  p_email                text,
  p_whatsapp             text,
  p_relation             text,
  p_relation_autre       text,
  p_beneficiaire_prenom  text,
  p_occasion             text,
  p_date_souhaitee       date
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id   uuid;
  v_reference  text;
begin
  if p_cle_idempotence is null then
    return json_build_object('error', 'CLE_IDEMPOTENCE_MANQUANTE');
  end if;

  select o.reference into v_reference
    from public.music_orders o
   where o.cle_idempotence = p_cle_idempotence;
  if found then
    return json_build_object('reference', v_reference, 'existante', true);
  end if;

  -- Date passée refusée (tolérance d'un jour pour les fuseaux horaires).
  if p_date_souhaitee is not null and p_date_souhaitee < current_date - 1 then
    return json_build_object('error', 'DATE_PASSEE');
  end if;

  begin
    insert into public.music_orders (cle_idempotence, relation, relation_autre,
                                     beneficiaire_prenom, occasion, date_souhaitee)
    values (p_cle_idempotence, p_relation, nullif(p_relation_autre, ''),
            p_beneficiaire_prenom, p_occasion, p_date_souhaitee)
    returning id, reference into v_order_id, v_reference;

    insert into public.music_order_contacts (order_id, prenom, email, whatsapp)
    values (v_order_id, p_prenom, lower(p_email), p_whatsapp);
  exception
    when unique_violation then
      -- Appel concurrent avec la même clé : renvoyer la commande gagnante.
      select o.reference into v_reference
        from public.music_orders o
       where o.cle_idempotence = p_cle_idempotence;
      if found then
        return json_build_object('reference', v_reference, 'existante', true);
      end if;
      raise;
    when check_violation or not_null_violation then
      return json_build_object('error', 'DONNEES_INVALIDES');
  end;

  return json_build_object('reference', v_reference, 'existante', false);
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 7. music_confirmer_paiement — Wave manuel (administration)
-- ────────────────────────────────────────────────────────────
-- À déclencher par Coach Redouane APRÈS avoir réellement vérifié la
-- réception du paiement dans Wave (aucun reçu/capture client ne déclenche
-- quoi que ce soit), via la commande locale :
--   node scripts/music-v0/admin.mjs confirmer CRM-00005 <référence Wave>
-- Cette commande génère le jeton (crypto.randomBytes(32)), transmet ici
-- son EMPREINTE uniquement, puis affiche UNE SEULE FOIS le lien complet.
create or replace function public.music_confirmer_paiement(
  p_reference  text,
  p_ref_wave   text,
  p_empreinte  text
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order   record;
  v_expire  timestamptz;
begin
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then
    return json_build_object('error', 'EMPREINTE_INVALIDE');
  end if;

  select o.id, o.reference, o.statut into v_order
    from public.music_orders o
   where o.reference = p_reference
   for update;
  if not found then
    return json_build_object('error', 'COMMANDE_INTROUVABLE');
  end if;
  if v_order.statut <> 'EN_ATTENTE_PAIEMENT' then
    return json_build_object('error', 'STATUT_INCOMPATIBLE', 'statut', v_order.statut);
  end if;

  v_expire := now() + interval '60 days';

  begin
    update public.music_orders
       set statut = 'PAYÉE',
           paye_le = now(),
           ref_wave = nullif(btrim(p_ref_wave), ''),
           jeton_questionnaire_hash = p_empreinte,
           jeton_questionnaire_expire_le = v_expire,
           maj_le = now()
     where id = v_order.id;
  exception when unique_violation then
    return json_build_object('error', 'EMPREINTE_DEJA_UTILISEE');
  end;

  return json_build_object('reference', v_order.reference, 'statut', 'PAYÉE', 'expire_le', v_expire);
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 8. Lien questionnaire : régénération / révocation (administration)
-- ────────────────────────────────────────────────────────────
-- Régénérer remplace l'empreinte : l'ancien lien devient immédiatement
-- invalide. Nouveau délai de 60 jours. Le nouveau jeton est généré par
-- scripts/music-v0/admin.mjs (regenerer), qui n'envoie que son empreinte.
create or replace function public.music_regenerer_lien_questionnaire(
  p_reference  text,
  p_empreinte  text
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order   record;
  v_expire  timestamptz;
begin
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then
    return json_build_object('error', 'EMPREINTE_INVALIDE');
  end if;

  select o.id, o.reference, o.statut, o.paye_le into v_order
    from public.music_orders o
   where o.reference = p_reference
   for update;
  if not found then
    return json_build_object('error', 'COMMANDE_INTROUVABLE');
  end if;
  if v_order.paye_le is null or v_order.statut = 'ANNULÉE' then
    return json_build_object('error', 'STATUT_INCOMPATIBLE', 'statut', v_order.statut);
  end if;

  v_expire := now() + interval '60 days';

  begin
    update public.music_orders
       set jeton_questionnaire_hash = p_empreinte,
           jeton_questionnaire_expire_le = v_expire,
           maj_le = now()
     where id = v_order.id;
  exception when unique_violation then
    return json_build_object('error', 'EMPREINTE_DEJA_UTILISEE');
  end;

  return json_build_object('reference', v_order.reference, 'expire_le', v_expire);
end;
$$;

create or replace function public.music_revoquer_lien_questionnaire(p_reference text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.music_orders
     set jeton_questionnaire_hash = null,
         jeton_questionnaire_expire_le = null,
         maj_le = now()
   where reference = p_reference;
  if not found then
    return json_build_object('error', 'COMMANDE_INTROUVABLE');
  end if;
  return json_build_object('reference', p_reference, 'lien_revoque', true);
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 9. music_resoudre_jeton_questionnaire — résolution d'un lien
-- ────────────────────────────────────────────────────────────
-- Préparée pour la future route du questionnaire (LOT 2) : reçoit
-- l'EMPREINTE (calculée côté serveur Node), jamais une référence CRM.
-- Ne renvoie rien si l'empreinte est inconnue, expirée, révoquée ou si
-- la commande est annulée (réponse identique dans tous les cas).
create or replace function public.music_resoudre_jeton_questionnaire(p_empreinte text)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
begin
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then
    return json_build_object('error', 'LIEN_INVALIDE');
  end if;

  select o.id, o.reference, o.statut, o.beneficiaire_prenom, o.relation, o.relation_autre, o.occasion
    into v_order
    from public.music_orders o
   where o.jeton_questionnaire_hash = p_empreinte
     and o.jeton_questionnaire_expire_le > now()
     and o.statut <> 'ANNULÉE';
  if not found then
    return json_build_object('error', 'LIEN_INVALIDE');
  end if;

  return json_build_object(
    'order_id', v_order.id,
    'reference', v_order.reference,
    'statut', v_order.statut,
    'beneficiaire_prenom', v_order.beneficiaire_prenom,
    'relation', v_order.relation,
    'relation_autre', v_order.relation_autre,
    'occasion', v_order.occasion
  );
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 10. music_annuler_commande (administration)
-- ────────────────────────────────────────────────────────────
-- Annulation manuelle (avant production). Révoque le lien questionnaire.
-- La référence reste consommée et n'est jamais réattribuée.
create or replace function public.music_annuler_commande(
  p_reference  text,
  p_motif      text default null
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
begin
  select o.id, o.statut into v_order
    from public.music_orders o
   where o.reference = p_reference
   for update;
  if not found then
    return json_build_object('error', 'COMMANDE_INTROUVABLE');
  end if;
  if v_order.statut not in ('EN_ATTENTE_PAIEMENT', 'PAYÉE') then
    return json_build_object('error', 'STATUT_INCOMPATIBLE', 'statut', v_order.statut);
  end if;

  update public.music_orders
     set statut = 'ANNULÉE',
         annule_le = now(),
         motif_annulation = nullif(btrim(p_motif), ''),
         jeton_questionnaire_hash = null,
         jeton_questionnaire_expire_le = null,
         maj_le = now()
   where id = v_order.id;

  return json_build_object('reference', p_reference, 'statut', 'ANNULÉE');
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 11. Privilèges : exécution réservée à service_role
-- ────────────────────────────────────────────────────────────
revoke all on function public.music_creer_commande(uuid, text, text, text, text, text, text, text, date) from public, anon, authenticated;
revoke all on function public.music_confirmer_paiement(text, text, text) from public, anon, authenticated;
revoke all on function public.music_regenerer_lien_questionnaire(text, text) from public, anon, authenticated;
revoke all on function public.music_revoquer_lien_questionnaire(text) from public, anon, authenticated;
revoke all on function public.music_resoudre_jeton_questionnaire(text) from public, anon, authenticated;
revoke all on function public.music_annuler_commande(text, text) from public, anon, authenticated;

grant execute on function public.music_creer_commande(uuid, text, text, text, text, text, text, text, date) to service_role;
grant execute on function public.music_confirmer_paiement(text, text, text) to service_role;
grant execute on function public.music_regenerer_lien_questionnaire(text, text) to service_role;
grant execute on function public.music_revoquer_lien_questionnaire(text) to service_role;
grant execute on function public.music_resoudre_jeton_questionnaire(text) to service_role;
grant execute on function public.music_annuler_commande(text, text) to service_role;
