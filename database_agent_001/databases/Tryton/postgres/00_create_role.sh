#!/bin/bash
set -e

psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tryton') THEN
      CREATE ROLE tryton WITH LOGIN PASSWORD 'tryton';
    END IF;
  END
  \$\$;
  GRANT ALL PRIVILEGES ON DATABASE "$POSTGRES_DB" TO tryton;
EOSQL