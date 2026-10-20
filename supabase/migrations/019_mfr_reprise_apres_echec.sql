-- ============================================================
-- Migration 019 — Reprise explicite après ÉCHEC (T-MFR.3D)
-- ============================================================
-- APPLIQUÉE LIVE ET VÉRIFIÉE sur le projet réel `ggeohumiyxqhknnftydi`
-- (T-MFR.3D, via `supabase db query -f ... --linked`, Stratégie B, même
-- discipline que 013-018). Primitive de reprise explicite après ÉCHEC —
-- voir ci-dessous. Le registre `supabase_migrations.schema_migrations`
-- reste volontairement absent (D-050), inchangé. NE PAS RÉAPPLIQUER.
--
-- Traduction physique de la décision QG (T-MFR.3D, post-mortem premier
-- E2E réel, analyse 11f77bcf-24ed-4dee-84f5-6e5cc55124cc, ECHEC) :
-- primitive GÉNÉRALE de nouvelle tentative explicite après ÉCHEC,
-- EXPLICITEMENT PAS un retry automatique, PAS une réparation, PAS un
-- reset, PAS une suppression de l'analyse précédente, PAS un
-- contournement de `auth.uid()`. Additive stricte sur 016/017/018 :
-- AUCUNE table, colonne, contrainte, policy, privilège ou fonction
-- existante n'est modifiée — une seule fonction nouvelle est ajoutée.
--
-- `mfr_analyses` reste append-only (016, déjà conçue pour « plusieurs
-- analyses possibles par cycle ») — cette migration active enfin ce que
-- le commentaire de `mfr_demarrer_premiere_analyse` (017) anticipait
-- explicitement : « elle n'empêche architecturalement aucune future
-- tentative privilégiée après ÉCHEC... passerait par une fonction
-- distincte, non créée ici ». C'est cette fonction distincte.
--
-- `mfr_cycles.analyse_retenue_id` reste intact et non écrit par cette
-- fonction (toujours hors périmètre, conformément à sa définition de
-- « pointeur de travail mutable », D-049 — décision non rouverte ici).
--
-- `mfr_finir_analyse_succes`/`mfr_finir_analyse_echec` (017/018) sont
-- réutilisées sans aucune modification : elles opèrent déjà sur
-- `p_analyse_id` fourni explicitement, sans aucune hypothèse sur le
-- rang de l'analyse dans son cycle (vérifié par audit read-only avant
-- ce GO).

-- ────────────────────────────────────────────────────────────
-- 1. mfr_relancer_analyse_apres_echec — REPRISE EXPLICITE
-- ────────────────────────────────────────────────────────────
-- Verrou du cycle en premier (FOR UPDATE), même discipline que
-- `mfr_demarrer_premiere_analyse` — sérialise tous les appelants
-- concurrents sur ce cycle. « Dernière tentative » identifiée par
-- `order by cree_le desc, id desc limit 1 for update` (aucune nouvelle
-- colonne introduite — convention de tri reprise de la colonne déjà
-- utilisée par 017, simplement inversée, avec `id` en départage
-- déterministe pour le cas théorique de deux lignes à la même
-- microseconde) ; cette même ligne est verrouillée pour empêcher un
-- FINISH concurrent de changer son statut pendant la décision.
--
-- Un geste explicite = au maximum UNE nouvelle ligne `mfr_analyses` :
--   - aucune analyse précédente pour ce cycle   → erreur, rien à reprendre ;
--   - dernière tentative statut = EN_COURS      → erreur, jamais une 2e pendant qu'une tourne ;
--   - dernière tentative statut = SUCCES        → erreur, une reprise n'a de sens qu'après ÉCHEC ;
--   - dernière tentative statut = ECHEC         → seul cas qui insère.
-- Plusieurs reprises successives restent possibles (rappel : si la
-- reprise #2 échoue à son tour, un nouvel appel de cette même fonction
-- verra #2 comme « dernière tentative = ECHEC » et créera #3 — aucun
-- cas spécial, comportement récursif par construction, jamais un
-- retry caché puisque chaque appel reste un geste utilisateur/ops
-- distinct et explicite).
--
-- Aucune modification de l'ancienne ligne (append-only strict).
-- Aucune écriture de `analyse_retenue_id`.
create or replace function public.mfr_relancer_analyse_apres_echec(
  p_cycle_id          uuid,
  p_provider          text,
  p_model             text,
  p_prompt_version    text,
  p_schema_version    text,
  p_catalogue_version text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid;
  v_cycle     record;
  v_derniere  record;
  v_new_id    uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Non authentifié');
  end if;

  select * into v_cycle
  from public.mfr_cycles
  where id = p_cycle_id
  for update;

  if not found or v_cycle.user_id <> v_user_id then
    return json_build_object('error', 'cycle_introuvable');
  end if;

  if exists (select 1 from public.mfr_publications where cycle_id = p_cycle_id) then
    return json_build_object('error', 'cycle_publie');
  end if;

  -- Dernière tentative réelle, verrouillée — jamais un simple SELECT
  -- non verrouillé qui laisserait une fenêtre entre la lecture du
  -- statut et l'insertion de la nouvelle ligne.
  select * into v_derniere
  from public.mfr_analyses
  where cycle_id = p_cycle_id
  order by cree_le desc, id desc
  limit 1
  for update;

  if not found then
    return json_build_object('error', 'aucune_analyse_precedente');
  end if;

  if v_derniere.statut = 'EN_COURS' then
    return json_build_object('error', 'analyse_en_cours');
  end if;

  if v_derniere.statut = 'SUCCES' then
    return json_build_object('error', 'derniere_tentative_deja_succes');
  end if;

  -- v_derniere.statut = 'ECHEC' — seul cas qui continue.
  insert into public.mfr_analyses (
    cycle_id, user_id, etat_logique_id, provider, model,
    prompt_version, schema_version, catalogue_version, statut
  )
  values (
    p_cycle_id, v_user_id, v_cycle.etat_logique_id, p_provider, p_model,
    p_prompt_version, p_schema_version, p_catalogue_version, 'EN_COURS'
  )
  returning id into v_new_id;

  return json_build_object('success', true, 'analyse_id', v_new_id, 'created', true);
end;
$$;

revoke all on function public.mfr_relancer_analyse_apres_echec(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.mfr_relancer_analyse_apres_echec(uuid, text, text, text, text, text) to authenticated;
