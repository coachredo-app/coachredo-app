#!/usr/bin/env bash
# ============================================================
# Music V0 — contrôles de la base de PRODUCTION (outillage, lecture seule)
# ============================================================
# Ce script NE TOUCHE JAMAIS Supabase. Il :
#   1. construit une base PostgreSQL locale JETABLE (stub Supabase + 020 + 021 + 022) ;
#   2. régénère les postchecks (generer.py) à partir de cette base de référence ;
#   3. valide les postchecks pas à pas (après 020, 021, 022) ;
#   4. vérifie qu'une divergence volontaire est bien détectée.
# Prérequis : binaires PostgreSQL (initdb, pg_ctl, psql) — PGBIN pour les indiquer.
#
# Usage en production (LECTURE SEULE, SELECT uniquement, jamais d'écriture) :
#   npx supabase db query --linked --agent=no -o json -f scripts/music-v0/production/precheck.sql
#   npx supabase db query --linked --agent=no -o json -f scripts/music-v0/production/postcheck-020.sql
#   (idem 021, 022) — attendu : tous les champs à true et "sections_differentes": [].
# Ne jamais appeler music_creer_commande ni nextval pour « tester » : la séquence CRM
# n'est pas remise en arrière par un ROLLBACK (D-060).
set -euo pipefail
cd "$(dirname "$0")"
R="$(cd ../../.. && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v initdb 2>/dev/null || echo /Applications/Postgres.app/Contents/Versions/latest/bin/initdb)")}"
T=$(mktemp -d)
trap '"$PGBIN/pg_ctl" -D "$T/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$T"' EXIT
P=("$PGBIN/psql" -h "$T" -p 54331 -U postgres -X -q -v ON_ERROR_STOP=1)
nouveau_cluster() {
  "$PGBIN/pg_ctl" -D "$T/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$T/data"
  "$PGBIN/initdb" -D "$T/data" -U postgres -A trust -E UTF8 --locale=C >/dev/null
  "$PGBIN/pg_ctl" -D "$T/data" -o "-p 54331 -k $T -c listen_addresses=''" -l "$T/log" -w start >/dev/null
  "${P[@]}" -c "create database m" postgres
  "${P[@]}" -d m -f "$R/scripts/music-v0/supabase-stub.sql"
}
etape() { "${P[@]}" -d m -t -A -f "$1" | python3 -c "
import json,sys; d=json.loads(sys.stdin.read()); bad=[k for k,v in d.items() if v is False or (k=='sections_differentes' and v)]
print('   ', d['migration'], 'conforme =', d['conforme'], '| contrôles en échec :', bad or 'aucun', '| sections différentes :', d['sections_differentes'])"; }
# 1. Référence : stub Supabase + 020 + 021 + 022 → valeurs attendues
nouveau_cluster
for f in 020_music_v0_commandes 021_music_v0_questionnaire 022_music_v0_brief; do "${P[@]}" -d m -f "$R/supabase/migrations/$f.sql"; done
python3 generer.py "$PGBIN/psql" -h "$T" -p 54331 -U postgres -X -d m
# 2. Validation pas à pas sur une base neuve
nouveau_cluster
echo "après 020 :"; "${P[@]}" -d m -f "$R/supabase/migrations/020_music_v0_commandes.sql"; etape postcheck-020.sql
echo "après 021 :"; "${P[@]}" -d m -f "$R/supabase/migrations/021_music_v0_questionnaire.sql"; etape postcheck-020.sql; etape postcheck-021.sql
echo "après 022 :"; "${P[@]}" -d m -f "$R/supabase/migrations/022_music_v0_brief.sql"; etape postcheck-020.sql; etape postcheck-021.sql; etape postcheck-022.sql
# 3. Sensibilité : chaque divergence volontaire doit être détectée
echo "divergences volontaires (doivent être NON conformes) :"
"${P[@]}" -d m -c "grant select on public.music_orders to anon"; etape postcheck-020.sql; "${P[@]}" -d m -c "revoke select on public.music_orders from anon"
"${P[@]}" -d m -c "create policy p on public.music_questionnaires for select using (true)"; etape postcheck-021.sql; "${P[@]}" -d m -c "drop policy p on public.music_questionnaires"
"${P[@]}" -d m -c "create or replace function public.music_brief_charger(p_empreinte text) returns json language plpgsql stable security definer set search_path = public, pg_temp as \$\$ begin return '{}'::json; end \$\$"; etape postcheck-022.sql
"${P[@]}" -d m -c "select nextval('public.music_order_ref_seq')" >/dev/null; etape postcheck-020.sql
