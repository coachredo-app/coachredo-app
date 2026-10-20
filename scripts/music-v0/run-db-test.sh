#!/usr/bin/env bash
# Tests des migrations 020, 021 et 022 sur une base PostgreSQL JETABLE et locale.
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
"${P[@]}" -d music_test -f "$RACINE/supabase/migrations/022_music_v0_brief.sql"
"${P[@]}" -d music_test -v sections="$(cat "$RACINE/src/lib/music/brief-sections.json")" -f "$ICI/migration-022.test.sql"
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
# Concurrence brief : 10 validations simultanées + 5 demandes de correction
# simultanées sur la même version → exactement 1 opération acceptée.
J=$(printf '%s' 'JetonLot3_Conc' | shasum -a 256 | cut -d' ' -f1)
JB=$(printf '%s' 'JetonLot3_ConcBrief' | shasum -a 256 | cut -d' ' -f1)
REF=$("${P[@]}" -d music_test -t -A -c "select (public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '+221771234567', 'Mon père', null, 'Moussa', 'Hommage', null))->>'reference'")
"${P[@]}" -d music_test -c "select public.music_confirmer_paiement('$REF', null, '$J')" >/dev/null
"${P[@]}" -d music_test -c "select public.music_questionnaire_envoyer('$J', '{}', 'v0-test')" >/dev/null
"${P[@]}" -d music_test -c "select public.music_admin_brief_enregistrer('$REF', '{\"destinataire\": \"Moussa\", \"relation\": \"Mon père\", \"de_la_part\": \"Awa\", \"histoire\": \"h\", \"message\": \"m\", \"emotions\": \"e\", \"direction_musicale\": \"d\"}')" >/dev/null
"${P[@]}" -d music_test -c "select public.music_admin_brief_envoyer('$REF', '$JB')" >/dev/null
for i in $(seq 1 10); do
  "${P[@]}" -d music_test -t -A -c "select 'V:' || coalesce(public.music_brief_valider('$JB', 1, 'brief-v0')->>'error', 'OK')" >> "$TMP/briefs" &
done
for i in $(seq 1 5); do
  "${P[@]}" -d music_test -t -A -c "select 'C:' || coalesce(public.music_brief_corriger('$JB', 1, 'correction $i')->>'error', 'OK')" >> "$TMP/briefs" &
done; wait
OKS=$(grep -c ':OK$' "$TMP/briefs" || true)
[ "$OKS" = 1 ] || { echo "ÉCHEC concurrence brief : $OKS opérations acceptées"; cat "$TMP/briefs"; exit 1; }
ETAT=$("${P[@]}" -d music_test -t -A -c "select o.statut || '|' || (b.validated_at is not null) || '|' || (b.correction_requested_at is not null) from public.music_orders o join public.music_briefs b on b.order_id = o.id where o.reference = '$REF'")
case "$ETAT" in 'BRIEF_VALIDÉ|true|false'|'BRIEF_À_VALIDER|false|true') ;; *) echo "ÉCHEC concurrence brief : état $ETAT"; exit 1;; esac
echo "PASS  concurrence brief : 10 validations + 5 corrections simultanées → 1 seule acceptée, état cohérent ($ETAT)"
