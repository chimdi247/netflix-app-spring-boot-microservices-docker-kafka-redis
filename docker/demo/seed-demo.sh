#!/bin/sh
# =============================================================================
# One-shot job (service "demo-seed"): puts a few playable movies into an empty catalog, so the app is not
# empty on the first start. It uses the real API: log in as admin, create movies, upload the sample clip.
# The upload goes through the whole pipeline (video-service -> Kafka -> encoding-service -> MinIO -> Kafka
# -> content/streaming-service), which also produces the first traces, logs and metrics in Grafana.
#
# Skips itself when the catalog already has movies. Disable with SEED_DEMO_MOVIES=false.
# =============================================================================
set -u

API="${API_URL:-http://frontend}"
EMAIL="${ADMIN_EMAIL:-admin@example.com}"
PASSWORD="${ADMIN_PASSWORD:-password123}"
SAMPLE="${SAMPLE_VIDEO:-/seed/sample.mp4}"

if [ "${SEED_DEMO_MOVIES:-true}" != "true" ]; then
  echo "SEED_DEMO_MOVIES is not true, nothing to do"; exit 0
fi

echo "Waiting for the application at ${API} ..."
TOKEN=""
i=0
while [ -z "$TOKEN" ]; do
  i=$((i + 1)); [ $i -gt 120 ] && { echo "Giving up: could not log in"; exit 1; }
  TOKEN=$(curl -s -X POST "$API/api/v1/auth/login" -H 'Content-Type: application/json' \
            -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
          | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  [ -z "$TOKEN" ] && sleep 3
done
echo "Logged in as $EMAIL"

AUTH="Authorization: Bearer $TOKEN"

if curl -s -H "$AUTH" "$API/api/v1/movies" | grep -q '"title"'; then
  echo "The catalog already has movies, skipping the demo data"; exit 0
fi

# title | genre | director | cast | year | rating | minutes | description
add_movie() {
  title="$1"; genre="$2"; director="$3"; cast="$4"; year="$5"; rating="$6"; minutes="$7"; description="$8"
  body="{\"title\":\"$title\",\"genre\":\"$genre\",\"director\":\"$director\",\"cast\":\"$cast\",\"releaseYear\":$year,\"rating\":$rating,\"durationMinutes\":$minutes,\"description\":\"$description\"}"
  id=$(curl -s -X POST "$API/api/v1/movies" -H "$AUTH" -H 'Content-Type: application/json' -d "$body" \
       | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
  if [ -z "$id" ]; then echo "Could not create '$title'"; return 1; fi
  echo "Created '$title' ($id), uploading the sample video ..."
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/videos/upload/$id" -H "$AUTH" \
         -F "file=@${SAMPLE};type=video/mp4")
  echo "  upload answered HTTP $code (encoding continues in the background)"
}

add_movie "Neon Horizon"   "SCI_FI"   "Mira Okafor"  "Jon Hale, Priya Raman, Leo Strand"  2024 8.4 118 "A courier crosses a flooded megacity at night to deliver a message that could end a corporate war."
add_movie "Paper Lanterns" "DRAMA"    "Tomas Lind"   "Aiko Mori, Daniel Reyes"             2023 7.9 104 "Three generations of one family meet for a festival and finally say what they have never said."
add_movie "Static Bloom"   "THRILLER" "Ines Duarte"  "Sam Whitlock, Noor Haddad"          2022 7.6  97 "A radio engineer starts to hear tomorrow's news in the static of an abandoned relay tower."

echo "Done. The movies become playable once encoding has finished (about a minute each); progress is shown in the app."
