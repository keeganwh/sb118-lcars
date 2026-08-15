-- LCARS SB118 — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent.
--
-- Design notes
--   * Auth identity is Supabase's own auth.users. Every table keys off auth.uid().
--   * Writer-ID login works without a server lookup: the account's email is always
--     derived as '<writerid>@lcars.local', so the client can compute it from the
--     typed Writer ID alone. recovery_email is stored for support/identification
--     only -- self-serve PIN reset needs an Edge Function and is deliberately
--     deferred (see ROADMAP Phase 2).
--   * Snapshots live in their own table rather than inside the state payload.
--     They were 10 full HTML copies per sim riding along in every save and sync,
--     which is what pushed the old Gist payload towards its 1 MB ceiling.

-- ---------------------------------------------------------------------------
-- writers : one row per person, links an auth user to their Writer ID
-- ---------------------------------------------------------------------------
create table if not exists public.writers (
  id             uuid primary key references auth.users(id) on delete cascade,
  writer_id      text not null unique,
  display_name   text,
  recovery_email text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column public.writers.writer_id is
  'Normalised Writer ID, e.g. A239809JP3 -- uppercased, non-alphanumerics stripped.';

-- ---------------------------------------------------------------------------
-- state : the main LCARS payload (docs, missions, scenes, characters, settings)
-- ---------------------------------------------------------------------------
create table if not exists public.state (
  writer_uid uuid primary key references auth.users(id) on delete cascade,
  payload    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- snapshots : per-sim revision history, fetched on demand
-- ---------------------------------------------------------------------------
create table if not exists public.snapshots (
  id         uuid primary key default gen_random_uuid(),
  writer_uid uuid not null references auth.users(id) on delete cascade,
  doc_id     text not null,
  html       text not null,
  word_count integer,
  created_at timestamptz not null default now()
);

create index if not exists snapshots_writer_doc_idx
  on public.snapshots (writer_uid, doc_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security : a writer can only ever touch their own rows
-- ---------------------------------------------------------------------------
alter table public.writers   enable row level security;
alter table public.state     enable row level security;
alter table public.snapshots enable row level security;

drop policy if exists writers_own on public.writers;
create policy writers_own on public.writers
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists state_own on public.state;
create policy state_own on public.state
  for all using (auth.uid() = writer_uid) with check (auth.uid() = writer_uid);

drop policy if exists snapshots_own on public.snapshots;
create policy snapshots_own on public.snapshots
  for all using (auth.uid() = writer_uid) with check (auth.uid() = writer_uid);

-- ---------------------------------------------------------------------------
-- Keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists writers_touch on public.writers;
create trigger writers_touch before update on public.writers
  for each row execute function public.touch_updated_at();

drop trigger if exists state_touch on public.state;
create trigger state_touch before update on public.state
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- recovery_email : removed
-- ---------------------------------------------------------------------------
-- It was collected for identification and nothing was ever sent to it -- the
-- auth address is synthetic and cannot receive mail. A linked Google or Discord
-- account replaces it and gives a real, verified address for free, so the
-- column and the addresses in it go rather than sitting there implying a
-- recovery route that does not exist.
--
-- ORDER MATTERS: only run this once the app version that stopped selecting the
-- column is live. PostgREST errors on a select naming a column that is gone, so
-- dropping it while an older build is still deployed breaks sign-in for
-- everyone.
alter table public.writers drop column if exists recovery_email;

-- ---------------------------------------------------------------------------
-- Account deletion : soft delete now, real removal after a grace period
-- ---------------------------------------------------------------------------
--   * Asking for deletion only stamps deleted_at. That is an ordinary update
--     against the writer's own row, so the existing writers_own policy already
--     allows it -- no elevated privileges are involved in the reversible half.
--   * Actually removing the login is the part the anon key cannot do, so it
--     lives in a security definer function below.
alter table public.writers add column if not exists deleted_at timestamptz;

comment on column public.writers.deleted_at is
  'Set when a writer asks to delete their account. Nothing is destroyed until the
   grace period runs out, so a change of mind -- or a misclick -- is recoverable.';

create index if not exists writers_deleted_idx
  on public.writers (deleted_at) where deleted_at is not null;

-- Deleting an auth.users row is what frees the Writer ID to be registered
-- again, and it needs privileges the anon key does not have. This runs as the
-- function owner instead. It takes no arguments and only ever touches rows
-- whose grace period has already expired, so there is no input to abuse: the
-- worst a caller can do is make a deletion happen that was going to happen
-- anyway. Every other table cascades off auth.users.
create or replace function public.purge_expired_deletions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare purged integer;
begin
  with gone as (
    delete from auth.users u
     using public.writers w
     where w.id = u.id
       and w.deleted_at is not null
       and w.deleted_at < now() - interval '48 hours'
    returning u.id
  )
  select count(*) into purged from gone;
  return purged;
end $$;

-- Callable by a signed-in writer only. The app calls it on boot, which is
-- often enough at this scale -- there is no scheduler to depend on.
revoke all on function public.purge_expired_deletions() from public, anon;
grant execute on function public.purge_expired_deletions() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for character pictures (replaces base64 pictureDataUrl)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('character-pics', 'character-pics', true)
on conflict (id) do nothing;

drop policy if exists charpics_read on storage.objects;
create policy charpics_read on storage.objects
  for select using (bucket_id = 'character-pics');

drop policy if exists charpics_write on storage.objects;
create policy charpics_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'character-pics'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists charpics_update on storage.objects;
create policy charpics_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'character-pics'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists charpics_delete on storage.objects;
create policy charpics_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'character-pics'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
