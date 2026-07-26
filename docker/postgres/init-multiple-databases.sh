#!/bin/sh
set -eu

create_database() {
  database_name="$1"
  if [ -z "$database_name" ]; then
    return
  fi
  database_exists="$(psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --tuples-only --no-align \
    --set database_name="$database_name" \
    --command "SELECT 1 FROM pg_database WHERE datname = :'database_name'")"
  if [ "$database_exists" != "1" ]; then
    psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
      --set database_name="$database_name" \
      --command 'CREATE DATABASE :"database_name"'
  fi
}

create_database "${LEAD_DB_NAME:-aisales_leads}"
create_database "${BUSINESS_DB_NAME:-aisales_businesses}"
