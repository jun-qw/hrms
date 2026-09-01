#!/bin/sh
# Prepares the database, then hands over to the application server.
#
# Both steps are idempotent, so restarting or scaling the container is safe:
# migrations skip what is already applied and the seed only fills gaps.
set -e

fail() {
  echo "hrms: $1" >&2
  exit 1
}

[ -n "$DATABASE_URL" ] || fail "DATABASE_URL is not set."

case "$SESSION_SECRET" in
  '' ) fail "SESSION_SECRET is not set. Generate one with: openssl rand -hex 32" ;;
  change-me* ) fail "SESSION_SECRET still holds the example value. Generate one with: openssl rand -hex 32" ;;
esac

# Retrying the migration doubles as the wait for the database, which compose
# starts alongside this container.
echo "hrms: applying migrations ..."
attempt=0
until node scripts/migrate.js; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || fail "database was not reachable after $attempt attempts."
  echo "hrms: database not ready yet, retrying in 2s ($attempt/30) ..."
  sleep 2
done

echo "hrms: seeding defaults ..."
node scripts/seed.js

# Optional demo organisation, for evaluation installs only.
if [ "$SEED_DEMO_DATA" = "true" ]; then
  echo "hrms: loading demo data ..."
  node scripts/seed-demo.js
fi

echo "hrms: starting server on port ${PORT:-3000}"
exec su-exec nextjs "$@"
