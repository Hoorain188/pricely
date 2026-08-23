#!/bin/zsh
#
# Opens psql against the Neon database, using the connection string already
# in Pricely.Api's user-secrets — so there is no password to look up or paste.
#
#   ./backend/db.sh                       interactive session
#   ./backend/db.sh -c "SELECT ..."       run one query and exit
#
# This is the live database. The deployed app reads the same rows, so an
# UPDATE or DELETE here changes what real users see immediately.

set -e
cd "$(dirname "$0")/Pricely.Api"

CONN=$(dotnet user-secrets list 2>/dev/null | sed -n 's/^ConnectionStrings:Default = //p')

if [ -z "$CONN" ]; then
  echo "No connection string in user-secrets for Pricely.Api." >&2
  exit 1
fi

HOST=$(echo "$CONN" | sed -n 's/.*Host=\([^;]*\).*/\1/p')
DB=$(echo   "$CONN" | sed -n 's/.*Database=\([^;]*\).*/\1/p')
USER=$(echo "$CONN" | sed -n 's/.*Username=\([^;]*\).*/\1/p')
PW=$(echo   "$CONN" | sed -n 's/.*Password=\([^;]*\).*/\1/p')

PGPASSWORD="$PW" psql "sslmode=require host=$HOST dbname=$DB user=$USER" "$@"
