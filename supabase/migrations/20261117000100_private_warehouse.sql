-- Backend-only storage. Run as the database owner before deploying Spring Boot.
-- Do not add "warehouse" to Supabase's exposed Data API schemas.
-- This migration creates no inventory, orders, or demo activity.
begin;
create schema if not exists warehouse;
revoke all on schema warehouse from public;
revoke all on all tables in schema warehouse from public;
revoke all on all sequences in schema warehouse from public;
alter default privileges in schema warehouse revoke all on tables from public;
alter default privileges in schema warehouse revoke all on sequences from public;

-- The role checks also allow this migration to be verified on ordinary Postgres.
do $$
declare api_role text;
begin
  foreach api_role in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      execute format('revoke all on schema warehouse from %I', api_role);
      execute format('revoke all on all tables in schema warehouse from %I', api_role);
      execute format('revoke all on all sequences in schema warehouse from %I', api_role);
      execute format('alter default privileges in schema warehouse revoke all on tables from %I', api_role);
      execute format('alter default privileges in schema warehouse revoke all on sequences from %I', api_role);
    end if;
  end loop;
end $$;
commit;
