-- One-time DBA bootstrap for a dedicated application database, before Flyway.
-- Run with psql -X -v ON_ERROR_STOP=1. Existing role names abort the transaction.
BEGIN;
CREATE ROLE fortylove_migrator LOGIN;
CREATE ROLE fortylove_app LOGIN;
CREATE ROLE fortylove_claim_writer NOLOGIN;
GRANT fortylove_claim_writer TO fortylove_migrator WITH INHERIT FALSE, SET TRUE;

-- PostgreSQL grants TEMP and CONNECT to PUBLIC by default.
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database()) \gexec
SELECT format('GRANT CONNECT, TEMPORARY ON DATABASE %I TO fortylove_migrator', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO fortylove_app', current_database()) \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO fortylove_app, fortylove_migrator, fortylove_claim_writer;
GRANT CREATE ON SCHEMA public TO fortylove_migrator WITH GRANT OPTION;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
COMMIT;
