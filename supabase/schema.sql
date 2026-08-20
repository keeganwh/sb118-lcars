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
-- link_prompt_seen : the offer of a recovery account has been made once
-- ---------------------------------------------------------------------------
-- Kept on the account rather than in the browser so the offer follows the
-- writer: asked once, on any device, and never again -- whether they accepted,
-- declined, or linked something later from Settings.
alter table public.writers
  add column if not exists link_prompt_seen boolean not null default false;

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

-- ---------------------------------------------------------------------------
-- Roles : writer / moderator / super_admin
-- ---------------------------------------------------------------------------
-- Writers who linked a Google or Discord account can recover their own PIN.
-- Everyone else has no way back in without a human, and this is that human.
--
--   writer       the default; can only ever see their own rows
--   moderator    sees the PIN reset queue and can action or reject a request
--   super_admin  the above, plus assigning roles
--
-- Moderators deliberately do NOT get a list of writers. The queue is the whole
-- surface: they see requests that came to them, and nothing else.
alter table public.writers
  add column if not exists role text not null default 'writer';

do $$ begin
  alter table public.writers add constraint writers_role_valid
    check (role in ('writer', 'moderator', 'super_admin'));
exception when duplicate_object then null;
end $$;

-- BOOTSTRAP -- run this by hand, once, in the SQL Editor. There is deliberately
-- no path to the first super admin from inside the app: something has to be
-- trusted first, and a hand-run statement against your own database is it.
--
--   update public.writers set role = 'super_admin' where writer_id = 'V239806K11';
--
-- After that, super admins assign every other role from Settings -> Admin.

-- Set when a moderator issues a temporary PIN. The writer is made to choose
-- their own the moment they sign in with it, so a PIN that passed through a
-- third party never stays valid for longer than one sign-in.
alter table public.writers
  add column if not exists must_change_pin boolean not null default false;

-- ---------------------------------------------------------------------------
-- my_role() : the caller's role, read outside RLS
-- ---------------------------------------------------------------------------
-- The queue's policy needs to ask "what is my role?", which means reading
-- public.writers -- which has a policy of its own, which would ask again.
-- Postgres detects that as infinite recursion and fails the query at run time.
-- A security definer function reads the row with RLS bypassed, breaking the
-- loop. It exposes only the caller's own role, so it hands out nothing they
-- could not already see.
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.writers where id = auth.uid()), 'writer');
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.my_role() in ('moderator', 'super_admin');
$$;

grant execute on function public.my_role()      to authenticated;
grant execute on function public.is_moderator() to authenticated;

-- ---------------------------------------------------------------------------
-- pin_reset_requests : the queue
-- ---------------------------------------------------------------------------
-- Rows are never deleted. A request moves from 'open' to 'actioned' or
-- 'rejected' and stays as a permanent record of who decided what, when, and
-- what the requester offered as proof of identity -- which is the only thing
-- anyone could go back to if a reset is ever disputed.
create table if not exists public.pin_reset_requests (
  id          uuid primary key default gen_random_uuid(),
  writer_id   text not null,
  note        text not null,
  status      text not null default 'open'
                check (status in ('open', 'actioned', 'rejected')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  text
);

create index if not exists pin_reset_open_idx
  on public.pin_reset_requests (created_at desc) where status = 'open';

alter table public.pin_reset_requests enable row level security;

-- Moderators read the queue. Nobody writes to it directly, from any role --
-- filing and deciding both go through the functions below, which is what keeps
-- the rate limit and the role checks impossible to sidestep.
drop policy if exists pin_reset_read on public.pin_reset_requests;
create policy pin_reset_read on public.pin_reset_requests
  for select using (public.is_moderator());

-- Table privileges are the outer gate, the policy the inner one. Only select is
-- granted at all, so even a bug in a policy cannot open a direct write path.
revoke all on table public.pin_reset_requests from anon, authenticated;
grant select on table public.pin_reset_requests to authenticated;

-- ---------------------------------------------------------------------------
-- request_pin_reset() : filed by someone who cannot sign in
-- ---------------------------------------------------------------------------
-- Callable by anon, necessarily: the whole point is that the person has lost
-- their PIN and has no session. That makes it the one anonymous write in the
-- schema, so the limits live inside it --
--
--   * one open request per Writer ID, and none within an hour of the last,
--     so the queue cannot be flooded from one ID;
--   * the note is required and capped, so a row cannot be used as storage;
--   * an unknown Writer ID is accepted and silently dropped.
--
-- That last one is not about secrecy -- Writer IDs are public -- it is about
-- not turning this into a way to find out which of them hold LCARS accounts.
-- The cost is that someone who mistypes their own ID gets a cheerful
-- confirmation and no help, so the app tells them to check it carefully.
create or replace function public.request_pin_reset(p_writer_id text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wid text := upper(regexp_replace(coalesce(p_writer_id, ''), '[^A-Za-z0-9]', '', 'g'));
  nte text := btrim(coalesce(p_note, ''));
begin
  if length(nte) < 10 then
    raise exception 'Please say how we can confirm it is you -- an email address or Discord handle we can reach you at.';
  end if;
  if length(nte) > 500 then
    nte := left(nte, 500);
  end if;
  if wid = '' then
    raise exception 'Please enter your Writer ID.';
  end if;

  -- Unknown ID: say nothing, do nothing. Indistinguishable from success.
  if not exists (select 1 from public.writers
                  where writer_id = wid and deleted_at is null) then
    return;
  end if;

  if exists (select 1 from public.pin_reset_requests
              where writer_id = wid
                and (status = 'open' or created_at > now() - interval '1 hour')) then
    return;
  end if;

  insert into public.pin_reset_requests (writer_id, note) values (wid, nte);
end $$;

revoke all on function public.request_pin_reset(text, text) from public;
grant execute on function public.request_pin_reset(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_action_reset() : issue a temporary PIN
-- ---------------------------------------------------------------------------
-- THE ONE UNSUPPORTED THING IN THIS SCHEMA. Everything else here uses an API
-- Supabase documents. This writes auth.users.encrypted_password directly,
-- because the hosted service offers no other way for one account to reset
-- another's -- the key that would authorise it must never reach a browser.
--
-- If Supabase ever changes how passwords are hashed, this silently starts
-- writing something their login cannot read: the moderator issues a temporary
-- PIN and the writer finds it does not work. Nothing is lost or corrupted --
-- the account, its data and the old PIN are untouched -- and the failure is
-- immediate and obvious rather than quiet.
--
-- THE FALLBACK, if that day comes: stop writing the password here. Instead
-- have this function mint a short-lived one-time token on the writers row, and
-- have the writer redeem it in LCARS to set their own PIN through Supabase's
-- supported password-update API -- the same call changePin() already makes.
-- The queue, the roles, the moderator flow and the whole admin view stay
-- exactly as they are; only this function and the handoff copy change.
create or replace function public.admin_action_reset(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  req    public.pin_reset_requests;
  target uuid;
  me     text;
  pin    text := '';
  alpha  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- no I/O/0/1 to mistake
  i      integer;
begin
  if not public.is_moderator() then
    raise exception 'You do not have permission to action reset requests.';
  end if;

  select * into req from public.pin_reset_requests where id = p_request_id;
  if not found then raise exception 'That request no longer exists.'; end if;
  if req.status <> 'open' then raise exception 'That request has already been decided.'; end if;

  select id into target from public.writers
   where writer_id = req.writer_id and deleted_at is null;
  if target is null then raise exception 'That Writer ID no longer has an account.'; end if;

  for i in 1..10 loop
    pin := pin || substr(alpha, 1 + floor(random() * length(alpha))::int, 1);
  end loop;

  update auth.users
     set encrypted_password = extensions.crypt(pin, extensions.gen_salt('bf')),
         updated_at = now()
   where id = target;

  -- Any session opened with the old PIN goes. If the reason for the reset was
  -- that someone else got in, leaving their session alive would defeat it.
  delete from auth.sessions where user_id = target;

  update public.writers set must_change_pin = true where id = target;

  select writer_id into me from public.writers where id = auth.uid();
  update public.pin_reset_requests
     set status = 'actioned', decided_at = now(), decided_by = me
   where id = p_request_id;

  return pin;
end $$;

revoke all on function public.admin_action_reset(uuid) from public, anon;
grant execute on function public.admin_action_reset(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_reject_reset() : close a request without acting on it
-- ---------------------------------------------------------------------------
-- There is nowhere to send a reply -- the requester has no session and the
-- auth address is synthetic -- so rejecting only closes the row. It exists so
-- an obviously bogus request stops sitting in the queue inflating every
-- moderator's badge, not as a way to communicate.
create or replace function public.admin_reject_reset(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare me text;
begin
  if not public.is_moderator() then
    raise exception 'You do not have permission to reject reset requests.';
  end if;
  select writer_id into me from public.writers where id = auth.uid();
  update public.pin_reset_requests
     set status = 'rejected', decided_at = now(), decided_by = me
   where id = p_request_id and status = 'open';
  if not found then raise exception 'That request has already been decided.'; end if;
end $$;

revoke all on function public.admin_reject_reset(uuid) from public, anon;
grant execute on function public.admin_reject_reset(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_set_role() : super admins only
-- ---------------------------------------------------------------------------
-- Addressed by Writer ID rather than by browsing a list, so promoting someone
-- means already knowing who they are. Demoting yourself is refused: with no
-- super admin left, the only way back is another hand-run SQL statement, and
-- one misclick should not cost that.
create or replace function public.admin_set_role(p_writer_id text, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wid text := upper(regexp_replace(coalesce(p_writer_id, ''), '[^A-Za-z0-9]', '', 'g'));
  target uuid;
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'Only a super admin can assign roles.';
  end if;
  if p_role not in ('writer', 'moderator', 'super_admin') then
    raise exception 'Unknown role.';
  end if;

  select id into target from public.writers
   where writer_id = wid and deleted_at is null;
  if target is null then raise exception 'No account with that Writer ID.'; end if;

  if target = auth.uid() and p_role <> 'super_admin' then
    raise exception 'You cannot remove your own super admin role.';
  end if;

  update public.writers set role = p_role where id = target;
end $$;

revoke all on function public.admin_set_role(text, text) from public, anon;
grant execute on function public.admin_set_role(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_writers() : the roster, for super admins only
-- ---------------------------------------------------------------------------
-- Deliberately not a policy on public.writers. Widening writers_own would mean
-- every query against that table carries a role test forever, and a mistake in
-- it would be a mistake in the table every writer reads on every boot. A
-- function is the narrow version of the same permission: it returns four
-- columns, to one role, and the rest of the app is untouched.
--
-- Note what is NOT returned -- nothing about anyone's sims, and no auth
-- identity. This answers "who holds an account and what can they do", which is
-- what assigning a role needs, and nothing further.
--
-- Moderators are excluded on purpose. They exist to action a queue; a roster
-- would make a compromised moderator account worth more without making the
-- queue work any better.
create or replace function public.admin_list_writers()
returns table (
  writer_id    text,
  display_name text,
  role         text,
  created_at   timestamptz,
  deleted_at   timestamptz,
  is_me        boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'Only a super admin can view the writer list.';
  end if;
  return query
    select w.writer_id, w.display_name, w.role, w.created_at, w.deleted_at,
           (w.id = auth.uid()) as is_me
      from public.writers w
     order by w.created_at;
end $$;

revoke all on function public.admin_list_writers() from public, anon;
grant execute on function public.admin_list_writers() to authenticated;

-- ---------------------------------------------------------------------------
-- shared_docs : read-only share links
-- ---------------------------------------------------------------------------
-- A share is a SNAPSHOT, not a window. Pressing Share copies the sim into this
-- table; later edits stay private until the writer publishes again. That is the
-- behaviour people expect from "share this post" -- share a draft, keep writing,
-- and strangers are not watching it change -- and it is also what makes the
-- read path safe to expose.
--
-- The reason it has to be a copy at all: every doc a writer owns lives inside
-- one jsonb blob, public.state.payload, under a policy of auth.uid() =
-- writer_uid. A policy on that row is all-or-nothing over the whole payload,
-- so there is no way to grant a stranger access to a single sim by writing one
-- -- grant it and you have published every sim, character and setting the
-- writer owns. A row here holds exactly what was deliberately published and
-- nothing adjacent to it.
--
-- Content is stored as the editor stores it, with markers stripped, alongside
-- the settings the render pass needs (fmts, academy, thought_italic,
-- char_colors). share.html runs the same lcars-render.js the app runs, so a
-- shared sim renders identically rather than approximately.
--
-- authors is a list from the outset even though a sim has one writer today.
-- Joint Posts will have several, and migrating a text column to an array after
-- real links exist in the wild is the kind of change that breaks them.
-- doc_id is the primary key, not a generated id of its own, so a share is
-- addressed as "this doc, published" rather than "this writer's shared thing".
-- When docs eventually move out of the payload blob into rows of their own --
-- which Joint Posts requires -- this table and share.html carry over untouched.
create table if not exists public.shared_docs (
  doc_id         text primary key,
  owner_uid      uuid not null references auth.users(id) on delete cascade,
  token          text not null unique
                   default encode(extensions.gen_random_bytes(16), 'hex'),
  title          text not null default '',
  authors        jsonb not null default '[]'::jsonb,
  status         text,
  doc_updated_at timestamptz,
  content        text not null default '',
  char_colors    jsonb not null default '{}'::jsonb,
  fmts           jsonb not null default '{}'::jsonb,
  academy        boolean not null default false,
  thought_italic boolean not null default false,
  expires_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists shared_docs_owner_idx on public.shared_docs (owner_uid);
create index if not exists shared_docs_expiry_idx
  on public.shared_docs (expires_at) where expires_at is not null;

drop trigger if exists shared_docs_touch on public.shared_docs;
create trigger shared_docs_touch before update on public.shared_docs
  for each row execute function public.touch_updated_at();

alter table public.shared_docs enable row level security;

-- Owners see and manage their own shares -- the app needs this to show the
-- link, its expiry, and a Stop sharing button.
--
-- There is deliberately NO anon policy. A `using (true)` select policy would
-- make every share readable, which sounds right until you notice it also makes
-- every TOKEN readable: one request returns the whole table and with it a key
-- to every shared sim on the service. Anonymous reads go through
-- get_shared_doc(token) below, which returns one row and only to someone who
-- already holds its token.
drop policy if exists shared_docs_own on public.shared_docs;
create policy shared_docs_own on public.shared_docs
  for all using (auth.uid() = owner_uid) with check (auth.uid() = owner_uid);

revoke all on table public.shared_docs from anon, authenticated;
grant select, insert, update, delete on table public.shared_docs to authenticated;

-- ---------------------------------------------------------------------------
-- get_shared_doc() : the anonymous read path
-- ---------------------------------------------------------------------------
-- The only thing on this table anon can call. Takes a token, returns one row,
-- and returns nothing at all for a token that is unknown, revoked or expired --
-- the three cases are indistinguishable from outside on purpose, so a stale
-- link cannot be used to work out whether a sim ever existed.
--
-- Expiry is enforced HERE rather than by a cleanup job, so a lapsed link stops
-- working the moment it lapses even if its row is still sitting in the table.
-- owner_uid is never returned; the byline comes from the published authors
-- list, which holds only what the writer chose to publish.
create or replace function public.get_shared_doc(p_token text)
returns table (
  title          text,
  authors        jsonb,
  status         text,
  doc_updated_at timestamptz,
  content        text,
  char_colors    jsonb,
  fmts           jsonb,
  academy        boolean,
  thought_italic boolean,
  expires_at     timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.title, s.authors, s.status, s.doc_updated_at, s.content,
         s.char_colors, s.fmts, s.academy, s.thought_italic, s.expires_at
    from public.shared_docs s
   where s.token = p_token
     and (s.expires_at is null or s.expires_at > now());
$$;

revoke all on function public.get_shared_doc(text) from public;
grant execute on function public.get_shared_doc(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- purge_expired_shares() : lazy cleanup
-- ---------------------------------------------------------------------------
-- get_shared_doc() already refuses an expired row, so this is housekeeping and
-- not a security control -- which is exactly why it can run lazily on any
-- signed-in boot rather than needing a scheduler, the same arrangement
-- purge_expired_deletions() uses.
create or replace function public.purge_expired_shares()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.shared_docs
   where expires_at is not null and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.purge_expired_shares() from public, anon;
grant execute on function public.purge_expired_shares() to authenticated;
