-- ---------------------------------------------------------------------------
-- MIGRATION 2026-10-04 : live co-authoring on a joint sim
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor.
--
-- DEPLOY THE APP FIRST, then run this. The new build tolerates a database
-- without these -- live writing simply never offers itself, because jp_doc()
-- returns no `live` column and the client reads it as false. The OLD build does
-- NOT tolerate jp_list()/jp_doc() gaining a column it does not expect, so
-- running this first would break the sim list for anyone still holding the
-- previous build.
--
-- SAFE TO RE-RUN. Every statement is idempotent, and re-running it cannot
-- revert anything newer: the only functions it defines are the five live-writing
-- ones introduced here, so there is no older `create or replace` to put back
-- over a later definition. (That is the trap CLAUDE.md notes about standalone
-- migration files.) jp_list() and jp_doc() are NOT redefined here -- they are in
-- schema.sql, which is where they gained the `live` column.
--
-- NOTHING CHANGES FOR AN EXISTING SIM. `live` defaults to false, which means the
-- lock and the version check govern it exactly as they always have.

alter table public.jp_docs add column if not exists live boolean not null default false;

comment on column public.jp_docs.live is
  'Opt-in live co-authoring. False means the lock and version check govern this
   sim, as they always have. True means edits flow through jp_updates and the
   CRDT resolves them, so the lock is not consulted.';

-- jp_list() and jp_doc() must also report the column, or the client cannot tell
-- which mode to open a sim in. They live in schema.sql; re-running the whole of
-- that file is the way to pick them up, and is always safe.

-- ---------------------------------------------------------------------------
-- LIVE WRITING (ROADMAP Batch 7)
-- ---------------------------------------------------------------------------
-- Two writers typing into the same joint sim at once, merged by a CRDT rather
-- than by taking turns.
--
-- WHY THIS SITS BESIDE THE TURN-BASED MODEL RATHER THAN REPLACING IT. The lock
-- and the version check in jp_save() remain the whole safety model for a sim
-- that is NOT live, and they remain the offline and fallback path -- a CRDT
-- cannot merge safely with no server, and read-only offline was the right call.
-- So live writing is opt-in PER SIM, off by default, and the owner alone turns
-- it on.
--
-- THE CONTAINMENT, which is deliberate: creating a joint sim at all is limited
-- to super admins by the client (jpCanCreate), and switching one to live is
-- limited to its owner here. So a live sim can only exist where an admin made
-- the sim and its owner chose it.

-- The `live` column itself is added further up, beside the other jp_docs column
-- additions, because jp_list() and jp_doc() select it and this file runs top to
-- bottom. The upgrade replay in supabase/test/run.sh is what caught that.

-- ---------------------------------------------------------------------------
-- jp_updates : the append-only log of CRDT updates
-- ---------------------------------------------------------------------------
-- Append-only on purpose. A Yjs update is a commutative delta: applying the
-- same ones in any order, with duplicates, converges on the same document --
-- which is what lets this travel over POLLING rather than a WebSocket, and is
-- why no SDK is needed here either. test/live_bundle_browser.js proves that
-- property rather than assuming it.
--
-- Base64 text rather than bytea: PostgREST hands bytea back in an escaped form
-- that needs decoding on the client anyway, and base64 is what the browser can
-- produce and consume without a library.
create table if not exists public.jp_updates (
  seq        bigserial primary key,
  doc_id     text not null references public.jp_docs(doc_id) on delete cascade,
  author_uid uuid not null references auth.users(id) on delete cascade,
  payload    text not null,
  created_at timestamptz not null default now()
);

create index if not exists jp_updates_doc_seq_idx
  on public.jp_updates (doc_id, seq);

alter table public.jp_updates enable row level security;

-- NO TABLE PRIVILEGE AT ALL, read or write, for anon or authenticated. Every
-- path in and out is one of the functions below, so membership is checked in one
-- place -- the same discipline as jp_members, one layer stricter.
--
-- There is deliberately NO select policy. A policy without a grant does nothing,
-- and writing one anyway would read as though direct access were intended and
-- invite somebody to add the grant to "fix" it. RLS stays enabled so that a
-- grant added by mistake still lands on a table with no policy, which denies.
revoke all on table public.jp_updates from anon, authenticated;
revoke all on sequence public.jp_updates_seq_seq from anon, authenticated;
drop policy if exists jp_updates_read on public.jp_updates;

-- ---------------------------------------------------------------------------
-- jp_set_live() : the owner turns live writing on or off for one sim
-- ---------------------------------------------------------------------------
-- Owner only, and it says so rather than failing quietly. Turning it OFF clears
-- the update log: the sim falls back to the turn-based model with jp_docs.content
-- as the record, and a stale CRDT history would otherwise be replayed over it
-- the next time somebody switched live back on.
create or replace function public.jp_set_live(p_doc_id text, p_live boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_jp_owner(p_doc_id) then
    raise exception 'Only the owner of a joint sim can turn live writing on or off.';
  end if;
  update public.jp_docs set live = coalesce(p_live, false) where doc_id = p_doc_id;
  if not coalesce(p_live, false) then
    delete from public.jp_updates where doc_id = p_doc_id;
  end if;
end $$;

revoke all on function public.jp_set_live(text, boolean) from public, anon;
grant execute on function public.jp_set_live(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- jp_live_push() : add one CRDT update, and say what sequence it got
-- ---------------------------------------------------------------------------
-- Refuses on a sim that is not live, so a client running ahead of the owner's
-- choice cannot start filling the log.
create or replace function public.jp_live_push(p_doc_id text, p_payload text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_seq bigint;
begin
  if not public.is_jp_member(p_doc_id) then
    raise exception 'You are not on that joint sim.';
  end if;
  if not exists (select 1 from public.jp_docs where doc_id = p_doc_id and live) then
    raise exception 'Live writing is not switched on for that sim.';
  end if;
  if p_payload is null or length(p_payload) = 0 then
    return null;
  end if;
  insert into public.jp_updates (doc_id, author_uid, payload)
       values (p_doc_id, auth.uid(), p_payload)
    returning seq into new_seq;
  return new_seq;
end $$;

revoke all on function public.jp_live_push(text, text) from public, anon;
grant execute on function public.jp_live_push(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- jp_live_pull() : everything after the sequence this client already has
-- ---------------------------------------------------------------------------
-- author_uid comes back so a client can skip its own updates. It does not have
-- to -- applying your own update again is a no-op, which is the point of a CRDT
-- -- but it saves the work.
select public.jp_drop_overloads('jp_live_pull');
create or replace function public.jp_live_pull(p_doc_id text, p_since bigint)
returns table (seq bigint, author_uid uuid, payload text)
language sql
stable
security definer
set search_path = public
as $$
  select u.seq, u.author_uid, u.payload
    from public.jp_updates u
   where u.doc_id = p_doc_id
     and u.seq > coalesce(p_since, 0)
     and public.is_jp_member(p_doc_id)
   order by u.seq;
$$;

revoke all on function public.jp_live_pull(text, bigint) from public, anon;
grant execute on function public.jp_live_pull(text, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- jp_live_flush() : write the rendered sim back to jp_docs.content
-- ---------------------------------------------------------------------------
-- WHY THIS EXISTS AT ALL. The CRDT is the live working copy, but
-- jp_docs.content is what every other part of the app reads: the sim list, the
-- dashboard, search, a share link, copy-out, the read-only offline view, and the
-- turn-based path this falls back to. Flushing the rendered HTML back keeps all
-- of that working unchanged instead of teaching each one about CRDTs.
--
-- WHY IT DOES NOT TAKE THE LOCK, which is the one thing to understand here.
-- jp_save() refuses a write from anyone who does not hold the lock, and refuses
-- a stale version -- and that is right when turns are what prevents two people
-- overwriting each other. In live mode the CRDT is what prevents that, every
-- member is writing at once by design, and there is no holder to be. So this
-- writes without the lock, and is allowed ONLY while live is true. On a sim that
-- is not live it refuses outright, which keeps jp_save() the only content path
-- there and leaves the turn-based safety model exactly as it was.
--
-- The version still advances, so a turn-based client that polls in sees the sim
-- has moved and reloads.
create or replace function public.jp_live_flush(p_doc_id text, p_content text, p_meta jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_version integer;
begin
  if not public.is_jp_member(p_doc_id) then
    raise exception 'You are not on that joint sim.';
  end if;
  if not exists (select 1 from public.jp_docs where doc_id = p_doc_id and live) then
    raise exception 'That sim is not in live writing mode.';
  end if;
  update public.jp_docs
     set content = coalesce(p_content, content),
         meta    = coalesce(p_meta, meta),
         version = version + 1
   where doc_id = p_doc_id
  returning version into new_version;
  return new_version;
end $$;

revoke all on function public.jp_live_flush(text, text, jsonb) from public, anon;
grant execute on function public.jp_live_flush(text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- jp_live_trim() : keep the update log from growing forever
-- ---------------------------------------------------------------------------
-- NOT compaction, and does not pretend to be. A Yjs document that is never
-- compacted grows with every keystroke ever typed, and the real answer is to
-- store a compacted state and replay from it. That is a deliberate follow-up.
--
-- What this does is bound the damage in the meantime: once a flush has written
-- the rendered sim into jp_docs.content, updates older than the newest ones are
-- no longer needed to reconstruct it from that content, so the tail is dropped.
-- A client that has been away longer than the retained tail reloads from
-- jp_docs.content instead, which is why the flush has to happen first.
create or replace function public.jp_live_trim(p_doc_id text, p_keep integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare cutoff bigint; removed integer;
begin
  if not public.is_jp_member(p_doc_id) then
    raise exception 'You are not on that joint sim.';
  end if;
  select seq into cutoff from public.jp_updates
   where doc_id = p_doc_id
   order by seq desc
   offset greatest(coalesce(p_keep, 200), 1) - 1
   limit 1;
  if cutoff is null then return 0; end if;
  with gone as (
    delete from public.jp_updates
     where doc_id = p_doc_id and seq < cutoff
    returning seq
  )
  select count(*)::integer into removed from gone;
  return removed;
end $$;

revoke all on function public.jp_live_trim(text, integer) from public, anon;
grant execute on function public.jp_live_trim(text, integer) to authenticated;
