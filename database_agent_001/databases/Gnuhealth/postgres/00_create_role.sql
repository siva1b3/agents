DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'gnuhealth') THEN
    CREATE ROLE gnuhealth WITH LOGIN PASSWORD 'gnuhealth';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE gnuhealth_app_db TO gnuhealth;