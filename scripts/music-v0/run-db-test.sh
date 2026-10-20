#!/usr/bin/env bash
# Tests de la migration 020 sur une base PostgreSQL JETABLE et locale.
# Ne se connecte jamais à Supabase. Prérequis : binaires PostgreSQL
# (initdb, pg_ctl, psql) dans le PATH ou via PGBIN.
set -euo pipefail
ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v initdb)")}"
TMP="$(mktemp -d)"
PORT="${PORT:-54329}"
trap '"$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust -E UTF8 --locale=C >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
P=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1)
"${P[@]}" -c "create database music_test" postgres
"${P[@]}" -d music_test -f "$ICI/supabase-stub.sql"
"${P[@]}" -d music_test -f "$RACINE/supabase/migrations/020_music_v0_commandes.sql"
"${P[@]}" -d music_test -f "$ICI/migration-020.test.sql"
# Concurrence : 20 créations simultanées avec des clés distinctes, puis
# 10 créations simultanées avec la MÊME clé.
for i in $(seq 1 20); do
  "${P[@]}" -d music_test -c "select public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '+221771234567', 'Mon père', null, 'Moussa', 'Hommage', null)" >/dev/null &
done; wait
for i in $(seq 1 10); do
  "${P[@]}" -d music_test -c "select public.music_creer_commande('11111111-1111-4111-8111-111111111111', 'Awa', 'a@b.sn', '+221771234567', 'Mon père', null, 'Moussa', 'Hommage', null)" >/dev/null &
done; wait
"${P[@]}" -d music_test -t -A -c "
do \$\$ begin
  assert (select count(*) = count(distinct reference) from public.music_orders), 'références dupliquées';
  assert (select count(*) from public.music_orders where cle_idempotence = '11111111-1111-4111-8111-111111111111') = 1, 'même clé concurrente : plusieurs commandes';
end \$\$;
select 'PASS  concurrence : ' || count(*) || ' commandes, références uniques ; même clé concurrente = 1 commande' from public.music_orders;"
