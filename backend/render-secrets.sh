#!/bin/zsh
#
# Prints the environment variables Render asks for when creating the
# blueprint, already named the way each service expects them.
#
# The values come from local user-secrets and are never committed. Run this
# in your own terminal and paste into Render's form — don't paste the output
# into a chat, an issue, or a commit.
#
#   ./backend/render-secrets.sh

set -e
cd "$(dirname "$0")/Pricely.Api"

secrets=$(dotnet user-secrets list)
get() { echo "$secrets" | sed -n "s/^$1 = //p"; }

CONN=$(get "ConnectionStrings:Default")
JWT=$(get "Jwt:SigningKey")
FROM=$(get "Email:FromAddress")
SMTP=$(get "Email:SmtpPassword")

if [ -z "$CONN" ]; then
  echo "No connection string found in user-secrets. Are you in the right repo?" >&2
  exit 1
fi

cat <<EOF

──────────────────────────────────────────────────────────────
 Service: pricely-api        (auth + admin back office)
──────────────────────────────────────────────────────────────
ConnectionStrings__Default
$CONN

Jwt__SigningKey
$JWT

Email__FromAddress
$FROM

Email__SmtpPassword
$SMTP

──────────────────────────────────────────────────────────────
 Service: pricely-scraper    (browse, search, scrapers)
──────────────────────────────────────────────────────────────
ConnectionStrings__DefaultConnection
$CONN

──────────────────────────────────────────────────────────────
Note the double underscores: that is how .NET maps a flat
environment variable onto nested configuration.
EOF
