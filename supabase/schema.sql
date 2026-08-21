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
-- what the render pass needs: the academy flag, and `format` -- the writer's
-- bold-locations / italic-OOC / italic-thoughts preferences. share.html runs
-- the same lcars-render.js the app runs.
--
-- The rule for what a reader sees is exactly what the app puts on the
-- CLIPBOARD: locations bold, OOC and thoughts italic, marker punctuation left
-- as plain text, and no colour of any kind. So the Visual Aids toggles are not
-- carried (they tint markers for a writer mid-sim, and are noise in a finished
-- sim), and neither are character colours -- copy-out drops those too, keeping
-- only margin-left. There is no char_colors column for the same reason there is
-- no mission or word count: a share carries what was deliberately published and
-- nothing more.
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
  format         jsonb not null default '{}'::jsonb,
  academy        boolean not null default false,
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
-- shared_docs : fmts/thought_italic -> format
-- ---------------------------------------------------------------------------
-- The first cut of this table stored the editor's Visual Aids toggles and
-- rendered shared sims with the marker highlights switched on. That was the
-- wrong pass: the highlights are a writing aid, and a reader wants the sim as
-- it goes out -- locations bold, OOC and thoughts italic, markers plain. The
-- replacement column carries those preferences instead.
--
-- create table if not exists leaves an existing table alone, so a project that
-- ran the first version needs these. They are no-ops everywhere else.
alter table public.shared_docs add column if not exists format jsonb not null default '{}'::jsonb;
alter table public.shared_docs drop column if exists fmts;
alter table public.shared_docs drop column if exists thought_italic;
-- Character colours went the same way, and for the same reason: copy-out drops
-- them, so a shared sim carrying them did not match what the app produces.
alter table public.shared_docs drop column if exists char_colors;

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
-- Dropped first, not just replaced: the return type changed when `fmts` and
-- `thought_italic` became `format` and `char_colors` went, and create or
-- replace cannot change a return type.
drop function if exists public.get_shared_doc(text);
create or replace function public.get_shared_doc(p_token text)
returns table (
  title          text,
  authors        jsonb,
  status         text,
  doc_updated_at timestamptz,
  content        text,
  format         jsonb,
  academy        boolean,
  expires_at     timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.title, s.authors, s.status, s.doc_updated_at, s.content,
         s.format, s.academy, s.expires_at
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

-- ===========================================================================
-- JOINT POSTS
-- ===========================================================================
-- A joint sim is a sim two or more writers take turns on. One soft lock at a
-- time, handed back and forth; there is deliberately no simultaneous typing.
--
-- WHY THESE ROWS EXIST AT ALL. Every solo sim lives inside one jsonb blob,
-- public.state.payload, which the app POSTs *in its entirety* every few seconds
-- while you type. Two writers sharing a sim in that blob would each be writing
-- their whole document set over the other's, every few seconds, with no field
-- granularity to reconcile against. A joint sim in the payload is not racy --
-- it is unbuildable. So it gets a row of its own.
--
-- WHY ONLY JOINT SIMS MOVE. Lifting *every* doc out of the blob is the right
-- long-term shape (saving one sentence currently re-uploads your whole
-- archive), but it drags in the sync path, the reconcile prompt, offline mode
-- and a data migration for every existing writer. That is a separate, staged
-- piece of work -- add the table, dual-write, flip reads behind a flag, then
-- stop writing the blob -- and it is tracked in ROADMAP. Everything below is
-- built so that migration inherits it rather than replacing it.
--
-- doc_id is text and is the same id the app already uses locally, matching
-- public.shared_docs, so a joint sim can be shared read-only with no special
-- casing at all.

-- ---------------------------------------------------------------------------
-- jp_docs : one row per joint sim
-- ---------------------------------------------------------------------------
-- `version` is the whole safety model for writes. Every save sends the version
-- it loaded and updates `where version = $expected`; zero rows updated means
-- "somebody else moved it under you", and the app reloads instead of
-- overwriting. This is NOT belt-and-braces on top of the lock -- it is the part
-- that actually works. The dangerous case is not two people typing at once; it
-- is one person whose lock quietly expired, whose browser has not noticed,
-- saving over the next holder's work. A lock cannot catch that. A version can.
--
-- mission_id / scene_id are the OWNER's filing. Missions and scenes still live
-- in each writer's own payload blob, so those ids mean nothing to anybody else
-- -- a member sees the sim in a Joint Posts group rather than under a mission
-- of theirs. Per-member local filing is a follow-up, noted in ROADMAP.
create table if not exists public.jp_docs (
  doc_id       text primary key,
  owner_uid    uuid not null references auth.users(id) on delete cascade,
  title        text not null default '',
  content      text not null default '',
  status       text not null default 'active',
  post_type    text,
  posted_at    timestamptz,
  mission_id   text,
  scene_id     text,
  academy      boolean not null default false,
  format       jsonb  not null default '{}'::jsonb,
  meta         jsonb  not null default '{}'::jsonb,
  version      integer not null default 1,
  locked_by    uuid references auth.users(id) on delete set null,
  locked_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.jp_docs.version is
  'Bumped on every accepted save. A save that names a stale version is refused
   rather than applied -- see jp_save().';
comment on column public.jp_docs.meta is
  'chars / myChars / charColors, the parts of a doc the render pass needs but
   nothing queries on.';

create index if not exists jp_docs_owner_idx on public.jp_docs (owner_uid);

drop trigger if exists jp_docs_touch on public.jp_docs;
create trigger jp_docs_touch before update on public.jp_docs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- jp_members : who is on a joint sim
-- ---------------------------------------------------------------------------
create table if not exists public.jp_members (
  doc_id     text not null references public.jp_docs(doc_id) on delete cascade,
  member_uid uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'writer' check (role in ('owner', 'writer')),
  joined_at  timestamptz not null default now(),
  primary key (doc_id, member_uid)
);

create index if not exists jp_members_uid_idx on public.jp_members (member_uid);

-- ---------------------------------------------------------------------------
-- jp_invitations : keyed by Writer ID text, not uid
-- ---------------------------------------------------------------------------
-- Deliberately text. public.writers is `auth.uid() = id`, so a writer cannot
-- read anyone else's row and therefore CANNOT resolve a Writer ID to a uid from
-- the client. The lookup has to happen server-side, in jp_invite() below.
create table if not exists public.jp_invitations (
  id         uuid primary key default gen_random_uuid(),
  doc_id     text not null references public.jp_docs(doc_id) on delete cascade,
  writer_id  text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'open'
               check (status in ('open', 'accepted', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create unique index if not exists jp_invitations_open_idx
  on public.jp_invitations (doc_id, writer_id) where status = 'open';
create index if not exists jp_invitations_writer_idx
  on public.jp_invitations (writer_id) where status = 'open';

-- ---------------------------------------------------------------------------
-- is_jp_member() / is_jp_owner() : membership read outside RLS
-- ---------------------------------------------------------------------------
-- THE RECURSION TRAP, and it is the same one my_role() exists to solve. The
-- policy on jp_docs wants to ask "am I a member?", which reads jp_members,
-- whose own policy wants to ask "can I see that doc?", which reads jp_docs.
-- Postgres detects the loop and fails the query at run time.
--
-- These read with RLS bypassed and answer only about auth.uid(), so they hand
-- out nothing the caller could not already establish about themselves.
create or replace function public.is_jp_member(p_doc_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.jp_members
                  where doc_id = p_doc_id and member_uid = auth.uid());
$$;

create or replace function public.is_jp_owner(p_doc_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.jp_docs
                  where doc_id = p_doc_id and owner_uid = auth.uid());
$$;

grant execute on function public.is_jp_member(text) to authenticated;
grant execute on function public.is_jp_owner(text)  to authenticated;

-- ---------------------------------------------------------------------------
-- Joint Posts RLS
-- ---------------------------------------------------------------------------
alter table public.jp_docs        enable row level security;
alter table public.jp_members     enable row level security;
alter table public.jp_invitations enable row level security;

-- Read: owner or member. Anyone else gets nothing -- not a permission error on
-- a doc they can see the shape of, but no row at all.
drop policy if exists jp_docs_read on public.jp_docs;
create policy jp_docs_read on public.jp_docs
  for select using (owner_uid = auth.uid() or public.is_jp_member(doc_id));

-- Create: you can only ever create a joint sim you own.
drop policy if exists jp_docs_insert on public.jp_docs;
create policy jp_docs_insert on public.jp_docs
  for insert with check (owner_uid = auth.uid());

-- Direct updates are NOT granted to members. Content changes go through
-- jp_save(), which is where the lock and the version check live; letting a
-- member PATCH the row would route straight past both. The owner keeps a direct
-- update path for the things that are not content -- renaming, refiling.
drop policy if exists jp_docs_update on public.jp_docs;
create policy jp_docs_update on public.jp_docs
  for update using (owner_uid = auth.uid()) with check (owner_uid = auth.uid());

drop policy if exists jp_docs_delete on public.jp_docs;
create policy jp_docs_delete on public.jp_docs
  for delete using (owner_uid = auth.uid());

-- Members: everyone on a sim can see who else is on it. Changing the roster is
-- the owner's alone, and goes through the functions below -- except leaving,
-- which anybody may do for themselves.
drop policy if exists jp_members_read on public.jp_members;
create policy jp_members_read on public.jp_members
  for select using (member_uid = auth.uid() or public.is_jp_member(doc_id));

drop policy if exists jp_members_leave on public.jp_members;
create policy jp_members_leave on public.jp_members
  for delete using (member_uid = auth.uid() and role <> 'owner');

-- Invitations: you see the ones addressed to you, and the ones on a sim you
-- own. Writing them is jp_invite()'s job only.
drop policy if exists jp_invitations_read on public.jp_invitations;
create policy jp_invitations_read on public.jp_invitations
  for select using (
    public.is_jp_owner(doc_id)
    or writer_id = (select writer_id from public.writers where id = auth.uid())
  );

-- Table privileges are the outer gate, the policy the inner one -- the same
-- discipline as pin_reset_requests. No direct insert on members or invitations
-- from any role, so a mistake in a policy still cannot open a write path.
revoke all on table public.jp_docs        from anon, authenticated;
revoke all on table public.jp_members     from anon, authenticated;
revoke all on table public.jp_invitations from anon, authenticated;
grant select, insert, update, delete on table public.jp_docs to authenticated;
grant select, delete                 on table public.jp_members to authenticated;
grant select                         on table public.jp_invitations to authenticated;

-- ---------------------------------------------------------------------------
-- The owner is a member of their own sim, always
-- ---------------------------------------------------------------------------
-- Written by a trigger rather than by the client, because jp_members has no
-- insert privilege at all -- and because "owner exists in the roster" is an
-- invariant the rest of this section leans on, not a step a caller can forget.
create or replace function public.jp_add_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.jp_members (doc_id, member_uid, role)
       values (new.doc_id, new.owner_uid, 'owner')
  on conflict (doc_id, member_uid) do update set role = 'owner';
  return new;
end $$;

drop trigger if exists jp_docs_owner_member on public.jp_docs;
create trigger jp_docs_owner_member after insert on public.jp_docs
  for each row execute function public.jp_add_owner_member();

-- ---------------------------------------------------------------------------
-- jp_invite() : invite by Writer ID
-- ---------------------------------------------------------------------------
-- Must be security definer: the caller cannot read public.writers to turn a
-- Writer ID into a uid, and should not be able to.
--
-- It borrows request_pin_reset()'s discipline about unknown IDs. An ID that
-- holds no account is accepted silently and nothing is written, so this cannot
-- be used to enumerate which Writer IDs have LCARS accounts. The cost is the
-- same one: mistype a colleague's ID and you get a cheerful confirmation and no
-- invitation, so the app says to check it. The owner can see the pending list,
-- which is the honest way to notice a typo.
create or replace function public.jp_invite(p_doc_id text, p_writer_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wid    text := upper(regexp_replace(coalesce(p_writer_id, ''), '[^A-Za-z0-9]', '', 'g'));
  target uuid;
begin
  if not public.is_jp_owner(p_doc_id) then
    raise exception 'Only the owner of a joint sim can invite people to it.';
  end if;
  if wid = '' then
    raise exception 'Please enter a Writer ID.';
  end if;

  select id into target from public.writers
   where writer_id = wid and deleted_at is null;

  -- Unknown, or already on the sim: say nothing, do nothing.
  if target is null then return; end if;
  if exists (select 1 from public.jp_members
              where doc_id = p_doc_id and member_uid = target) then return; end if;

  insert into public.jp_invitations (doc_id, writer_id, invited_by)
       values (p_doc_id, wid, auth.uid())
  on conflict do nothing;
end $$;

revoke all on function public.jp_invite(text, text) from public, anon;
grant execute on function public.jp_invite(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- jp_accept_invite() / jp_decline_invite()
-- ---------------------------------------------------------------------------
-- Accepting is the only path that writes jp_members, which is why that table
-- grants no insert to anybody. The invitation is matched on the caller's OWN
-- Writer ID, read here rather than passed in, so an id from the client cannot
-- be used to accept somebody else's invitation.
create or replace function public.jp_accept_invite(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me  text := (select writer_id from public.writers where id = auth.uid());
  inv public.jp_invitations%rowtype;
begin
  select * into inv from public.jp_invitations
   where id = p_id and writer_id = me and status = 'open';
  if inv.id is null then
    raise exception 'That invitation is no longer open.';
  end if;

  insert into public.jp_members (doc_id, member_uid, role)
       values (inv.doc_id, auth.uid(), 'writer')
  on conflict (doc_id, member_uid) do nothing;

  update public.jp_invitations
     set status = 'accepted', decided_at = now()
   where id = p_id;

  return inv.doc_id;
end $$;

create or replace function public.jp_decline_invite(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare me text := (select writer_id from public.writers where id = auth.uid());
begin
  update public.jp_invitations
     set status = 'declined', decided_at = now()
   where id = p_id and writer_id = me and status = 'open';
end $$;

revoke all on function public.jp_accept_invite(uuid)  from public, anon;
revoke all on function public.jp_decline_invite(uuid) from public, anon;
grant execute on function public.jp_accept_invite(uuid)  to authenticated;
grant execute on function public.jp_decline_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- jp_revoke_invite() / jp_remove_member() : the owner's side of the roster
-- ---------------------------------------------------------------------------
create or replace function public.jp_revoke_invite(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare d text;
begin
  select doc_id into d from public.jp_invitations where id = p_id;
  if d is null or not public.is_jp_owner(d) then
    raise exception 'Only the owner of a joint sim can withdraw its invitations.';
  end if;
  update public.jp_invitations
     set status = 'revoked', decided_at = now()
   where id = p_id and status = 'open';
end $$;

-- Removing the person who currently holds the lock also frees it, or the sim
-- would be left locked by somebody who is no longer on it.
create or replace function public.jp_remove_member(p_doc_id text, p_member uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_jp_owner(p_doc_id) then
    raise exception 'Only the owner of a joint sim can remove people from it.';
  end if;
  if p_member = auth.uid() then
    raise exception 'The owner cannot be removed from their own joint sim.';
  end if;

  delete from public.jp_members
   where doc_id = p_doc_id and member_uid = p_member;

  update public.jp_docs
     set locked_by = null, locked_at = null
   where doc_id = p_doc_id and locked_by = p_member;
end $$;

revoke all on function public.jp_revoke_invite(uuid)        from public, anon;
revoke all on function public.jp_remove_member(text, uuid)  from public, anon;
grant execute on function public.jp_revoke_invite(uuid)       to authenticated;
grant execute on function public.jp_remove_member(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The lock
-- ---------------------------------------------------------------------------
-- Three things a naive lock gets wrong, all of them handled here rather than in
-- the browser:
--
--   1. IT MUST EXPIRE. Somebody will close their laptop holding it. A lock
--      older than jp_lock_minutes() is free for the taking. The expiry is
--      evaluated HERE, against now() in the database -- a countdown running in
--      a tab is not a lock, it is a wish.
--      Five minutes reads short for a form of writing measured in hours, and it
--      is only safe because saving RENEWS the turn (see jp_save) and the app
--      autosaves a couple of seconds after a keystroke. So the clock measures
--      genuine idleness, not thinking-while-typing. Someone who stares at the
--      screen for six minutes without touching the keyboard can lose the turn --
--      they take it back with one press, and nothing they typed is lost, because
--      a stale save is refused rather than applied.
--   2. IT MUST NOT BE THE ONLY GUARD. See jp_save(): a lapsed holder whose
--      browser has not noticed is the actual danger, and only the version
--      check catches that one.
--   3. THE OWNER MUST BE ABLE TO BREAK IT. If a lock is stuck and the holder is
--      asleep, waiting is not a plan.
create or replace function public.jp_lock_minutes()
returns integer language sql immutable as $$ select 5 $$;

-- Returns the row as it stands after the attempt, so one round trip tells the
-- app both whether it got the lock and who has it if not.
create or replace function public.jp_take_lock(p_doc_id text)
returns table (locked_by uuid, locked_at timestamptz, got boolean)
language plpgsql
security definer
set search_path = public
as $$
declare cur public.jp_docs%rowtype;
begin
  if not public.is_jp_member(p_doc_id) then
    raise exception 'That joint sim is not one of yours.';
  end if;

  -- Row lock for the duration of the transaction, so two writers pressing the
  -- button in the same instant cannot both read "free" and both take it.
  select * into cur from public.jp_docs where doc_id = p_doc_id for update;
  if cur.doc_id is null then
    raise exception 'That joint sim no longer exists.';
  end if;

  if cur.locked_by is not null
     and cur.locked_by <> auth.uid()
     and cur.locked_at > now() - make_interval(mins => public.jp_lock_minutes()) then
    return query select cur.locked_by, cur.locked_at, false;
    return;
  end if;

  update public.jp_docs
     set locked_by = auth.uid(), locked_at = now()
   where doc_id = p_doc_id;

  return query select auth.uid(), now()::timestamptz, true;
end $$;

create or replace function public.jp_release_lock(p_doc_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The holder releases their own; the owner can break anybody's.
  update public.jp_docs
     set locked_by = null, locked_at = null
   where doc_id = p_doc_id
     and (locked_by = auth.uid() or owner_uid = auth.uid());
end $$;

revoke all on function public.jp_take_lock(text)    from public, anon;
revoke all on function public.jp_release_lock(text) from public, anon;
grant execute on function public.jp_take_lock(text)    to authenticated;
grant execute on function public.jp_release_lock(text) to authenticated;

-- ---------------------------------------------------------------------------
-- jp_save() : the only way content changes
-- ---------------------------------------------------------------------------
-- Refuses on THREE separate grounds, and each one catches a case the others
-- miss:
--
--   * not a member         -- the ordinary access check;
--   * lock held by someone else, unexpired -- the ordinary turn-taking check;
--   * p_version is not the current version -- the one that matters. A writer
--     whose lock lapsed while they were typing, and whose browser has not
--     caught up, will pass the first two checks and still be about to
--     obliterate the next holder's work. This is where they are stopped.
--
-- Returns the new version on success. Raises with a recognisable message on a
-- stale write, so the app can offer a reload rather than a shrug.
create or replace function public.jp_save(
  p_doc_id  text,
  p_version integer,
  p_content text,
  p_title   text,
  p_status  text,
  p_meta    jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare cur public.jp_docs%rowtype;
begin
  if not public.is_jp_member(p_doc_id) then
    raise exception 'That joint sim is not one of yours.';
  end if;

  select * into cur from public.jp_docs where doc_id = p_doc_id for update;
  if cur.doc_id is null then
    raise exception 'That joint sim no longer exists.';
  end if;

  if cur.locked_by is not null
     and cur.locked_by <> auth.uid()
     and cur.locked_at > now() - make_interval(mins => public.jp_lock_minutes()) then
    raise exception 'JP_LOCKED';
  end if;

  if cur.version <> p_version then
    raise exception 'JP_STALE';
  end if;

  update public.jp_docs
     set content = coalesce(p_content, content),
         title   = coalesce(p_title, title),
         status  = coalesce(p_status, status),
         meta    = coalesce(p_meta, meta),
         version = cur.version + 1,
         -- Saving is proof you are still here, so it renews your turn.
         locked_by = auth.uid(),
         locked_at = now()
   where doc_id = p_doc_id;

  return cur.version + 1;
end $$;

revoke all on function public.jp_save(text, integer, text, text, text, jsonb) from public, anon;
grant execute on function public.jp_save(text, integer, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- jp_my_invites() : open invitations addressed to the caller
-- ---------------------------------------------------------------------------
create or replace function public.jp_my_invites()
returns table (id uuid, doc_id text, title text, from_wid text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.doc_id, d.title, w.writer_id, i.created_at
    from public.jp_invitations i
    join public.jp_docs d on d.doc_id = i.doc_id
    left join public.writers w on w.id = i.invited_by
   where i.status = 'open'
     and i.writer_id = (select writer_id from public.writers where id = auth.uid())
   order by i.created_at;
$$;

revoke all on function public.jp_my_invites() from public, anon;
grant execute on function public.jp_my_invites() to authenticated;

-- ---------------------------------------------------------------------------
-- Account deletion must not take other people's writing with it
-- ---------------------------------------------------------------------------
-- jp_docs.owner_uid cascades from auth.users, so the DEFAULT behaviour of the
-- 48-hour purge is that an owner leaving silently destroys every joint sim they
-- started -- including the halves other people wrote. That is the worst
-- available outcome and it is the one that happens if nobody says otherwise.
--
-- So: transfer, don't cascade. Ownership passes to the longest-standing
-- remaining member. A joint sim with nobody else on it is a solo sim in all but
-- name and goes with its owner, as expected.
--
-- The alternatives were weighed and rejected. Blocking deletion until the
-- writer hands over would make account deletion refusable, and the recovery and
-- deletion work is emphatic that leaving must always be honourable. Orphaning
-- the sim (owner null, members keep access) destroys nothing but leaves an
-- object nobody can invite to, remove from or delete -- permanently
-- unmanageable, for no gain over transferring it.
--
-- KNOWN GAP: the new owner is not told. There is no notification surface in the
-- app yet, and building one inside Joint Posts would be the tail wagging the
-- dog. Tracked in ROADMAP.
create or replace function public.jp_transfer_orphans(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.jp_docs%rowtype;
  heir uuid;
begin
  for d in select * from public.jp_docs where owner_uid = p_uid loop
    select member_uid into heir
      from public.jp_members
     where doc_id = d.doc_id and member_uid <> p_uid
     order by joined_at
     limit 1;

    -- Nobody else on it: it is solo in all but name, let the cascade have it.
    if heir is null then continue; end if;

    update public.jp_docs set owner_uid = heir where doc_id = d.doc_id;
    update public.jp_members set role = 'owner'
     where doc_id = d.doc_id and member_uid = heir;
    -- Their own membership row goes with the cascade; the lock must not linger.
    update public.jp_docs set locked_by = null, locked_at = null
     where doc_id = d.doc_id and locked_by = p_uid;
  end loop;
end $$;

revoke all on function public.jp_transfer_orphans(uuid) from public, anon, authenticated;

-- Re-stated with the transfer wired in. ORDER IS THE WHOLE POINT: the handover
-- has to happen while the rows still exist, so it runs before the delete rather
-- than after it.
create or replace function public.purge_expired_deletions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  purged integer;
  victim uuid;
begin
  for victim in
    select w.id from public.writers w
     where w.deleted_at is not null
       and w.deleted_at < now() - interval '48 hours'
  loop
    perform public.jp_transfer_orphans(victim);
  end loop;

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

revoke all on function public.purge_expired_deletions() from public, anon;
grant execute on function public.purge_expired_deletions() to authenticated;

-- ---------------------------------------------------------------------------
-- Joint Posts, second pass: display names, and the owner's filing by name
-- ---------------------------------------------------------------------------
-- WHY NAMES AND NOT IDS. Missions and scenes live in each writer's own payload
-- blob, so the owner's mission_id means nothing to anybody else -- a member
-- cannot resolve it, and should not be filed by it either, since two writers
-- may organise the same sim quite differently. Filing is therefore per writer
-- and lives in their own blob. These two columns carry only the owner's NAMES,
-- as a hint: a member who happens to have a mission of the same name gets the
-- sim filed there automatically, and otherwise files it themselves.
alter table public.jp_docs add column if not exists mission_name text;
alter table public.jp_docs add column if not exists scene_name   text;

-- Writer IDs are an identifier, not a name. "A239809JP3 is writing" tells you
-- nothing at a glance; the display name is what people actually know each other
-- by. Both are returned -- the ID stays as the unambiguous handle for invites
-- and for the roster, where two people could share a display name.
drop function if exists public.jp_list();
create or replace function public.jp_list()
returns table (
  doc_id      text,
  owner_uid   uuid,
  owner_wid   text,
  owner_name  text,
  title       text,
  status      text,
  post_type   text,
  posted_at   timestamptz,
  academy     boolean,
  version     integer,
  locked_by   uuid,
  lock_wid    text,
  lock_name   text,
  lock_active boolean,
  member_count integer,
  mission_name text,
  scene_name   text,
  updated_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select d.doc_id, d.owner_uid, ow.writer_id, nullif(btrim(coalesce(ow.display_name, '')), ''),
         d.title, d.status, d.post_type, d.posted_at, d.academy, d.version,
         d.locked_by, lw.writer_id, nullif(btrim(coalesce(lw.display_name, '')), ''),
         (d.locked_by is not null
           and d.locked_at > now() - make_interval(mins => public.jp_lock_minutes())),
         (select count(*)::integer from public.jp_members m2 where m2.doc_id = d.doc_id),
         d.mission_name, d.scene_name,
         d.updated_at
    from public.jp_docs d
    join public.jp_members m on m.doc_id = d.doc_id and m.member_uid = auth.uid()
    left join public.writers ow on ow.id = d.owner_uid
    left join public.writers lw on lw.id = d.locked_by
   order by d.updated_at desc;
$$;

drop function if exists public.jp_doc(text);
create or replace function public.jp_doc(p_doc_id text)
returns table (
  doc_id text, owner_uid uuid, title text, content text, status text,
  post_type text, posted_at timestamptz, academy boolean, format jsonb,
  meta jsonb, version integer, locked_by uuid, lock_wid text, lock_name text,
  lock_active boolean, mission_name text, scene_name text, updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select d.doc_id, d.owner_uid, d.title, d.content, d.status, d.post_type,
         d.posted_at, d.academy, d.format, d.meta, d.version, d.locked_by,
         lw.writer_id, nullif(btrim(coalesce(lw.display_name, '')), ''),
         (d.locked_by is not null
           and d.locked_at > now() - make_interval(mins => public.jp_lock_minutes())),
         d.mission_name, d.scene_name,
         d.updated_at
    from public.jp_docs d
    left join public.writers lw on lw.id = d.locked_by
   where d.doc_id = p_doc_id and public.is_jp_member(p_doc_id);
$$;

drop function if exists public.jp_roster(text);
create or replace function public.jp_roster(p_doc_id text)
returns table (member_uid uuid, writer_id text, display_name text, role text, joined_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.member_uid, w.writer_id,
         nullif(btrim(coalesce(w.display_name, '')), ''),
         m.role, m.joined_at
    from public.jp_members m
    left join public.writers w on w.id = m.member_uid
   where m.doc_id = p_doc_id and public.is_jp_member(p_doc_id)
   -- Owner first, then by when they joined. NOT `order by role desc`: that
   -- sorts the text, and 'writer' comes after 'owner', so it did the reverse.
   order by (m.role = 'owner') desc, m.joined_at;
$$;

revoke all on function public.jp_list()       from public, anon;
revoke all on function public.jp_doc(text)    from public, anon;
revoke all on function public.jp_roster(text) from public, anon;
grant execute on function public.jp_list()       to authenticated;
grant execute on function public.jp_doc(text)    to authenticated;
grant execute on function public.jp_roster(text) to authenticated;
