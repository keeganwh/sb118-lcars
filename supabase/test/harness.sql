-- Local stand-ins for the parts of Supabase a plain Postgres does not have.
-- Enough to run schema.sql end to end and exercise its logic; NOT a simulation
-- of Supabase. In particular auth.uid() reads a session GUC here instead of a
-- JWT, which is what lets a test switch writers with set_config().
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to public;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;

create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text, name text, owner uuid
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(t text) returns text[]
  language sql immutable as $$ select string_to_array(t, '/') $$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
grant usage on schema public, auth, extensions, storage to anon, authenticated;
grant all on storage.objects, storage.buckets to anon, authenticated;
