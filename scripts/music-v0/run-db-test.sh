#!/usr/bin/env bash
# Tests des migrations 020 et 021 sur une base PostgreSQL JETABLE et locale.
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
"${P[@]}" -d music_test -f "$RACINE/supabase/migrations/021_music_v0_questionnaire.sql"
"${P[@]}" -d music_test -f "$ICI/migration-021.test.sql"
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
# Concurrence questionnaire : 10 envois définitifs simultanés avec le MÊME
# lien → un seul accepté, les autres refusés (DEJA_ENVOYE).
E=$(printf '%s' 'JetonLot2_Concurrence' | shasum -a 256 | cut -d' ' -f1)
REF=$("${P[@]}" -d music_test -t -A -c "select (public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '+221771234567', 'Mon père', null, 'Moussa', 'Hommage', null))->>'reference'")
"${P[@]}" -d music_test -c "select public.music_confirmer_paiement('$REF', null, '$E')" >/dev/null
for i in $(seq 1 10); do
  "${P[@]}" -d music_test -t -A -c "select coalesce(public.music_questionnaire_envoyer('$E', '{\"n\": $i}', 'v0-test')->>'error', 'OK')" >> "$TMP/envois" &
done; wait
OKS=$(grep -c '^OK$' "$TMP/envois" || true); DEJA=$(grep -c '^DEJA_ENVOYE$' "$TMP/envois" || true)
[ "$OKS" = 1 ] && [ "$DEJA" = 9 ] || { echo "ÉCHEC concurrence envoi : $OKS OK, $DEJA DEJA_ENVOYE"; exit 1; }
echo "PASS  concurrence questionnaire : 10 envois simultanés → 1 accepté, 9 refusés (DEJA_ENVOYE)"
