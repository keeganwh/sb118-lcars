-- ---------------------------------------------------------------------------
-- MIGRATION 2026-10-07 : jp_list() and jp_doc() report the `live` column
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor, AFTER 2026-10-04-live-coauthoring.sql.
--
-- WHY THIS EXISTS AS A SEPARATE FILE. The live-writing migration added
-- jp_docs.live, but the two functions the client reads a sim through live in
-- schema.sql -- so the instruction was "re-run schema.sql". That file is 110 KB
-- and 2,448 lines, and pasting it into the SQL editor is where that went wrong:
-- a truncated paste hands the server a statement starting part-way through a
-- function, which fails as `syntax error at or near "returns"` reported at
-- `LINE 1`. LINE 1 is the tell -- it means the `create or replace function` line
-- above it never arrived. schema.sql has seventeen functions whose `returns` sits
-- on its own line, so the split can land almost anywhere.
--
-- This is the small version: those two functions and nothing else. Re-running the
-- whole of schema.sql is still correct and still safe; it is just needlessly hard
-- to paste.
--
-- CARE REQUIRED, unlike the other migration files here: these ARE
-- `create or replace` definitions, so running an OLD copy of this file over a
-- NEWER schema.sql would put the old versions back. That is the clobbering
-- CLAUDE.md warns about. If in doubt, take these two functions from the current
-- schema.sql, which always ends in the current state.
--
-- WITHOUT THIS, live writing is invisible rather than broken: jp_doc returns no
-- `live` column, the client reads that as "the server has not been migrated", and
-- the owner's switch stays hidden. Nothing else is affected.

-- ---------------------------------------------------------------------------
-- jp_list() : every joint sim this writer is on, for the sim list and presence
-- ---------------------------------------------------------------------------
select public.jp_drop_overloads('jp_list');

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
  live        boolean,
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
         d.mission_name, d.scene_name, d.live,
         d.updated_at
    from public.jp_docs d
    join public.jp_members m on m.doc_id = d.doc_id and m.member_uid = auth.uid()
    left join public.writers ow on ow.id = d.owner_uid
    left join public.writers lw on lw.id = d.locked_by
   order by d.updated_at desc;
$$;

-- ---------------------------------------------------------------------------
-- jp_doc() : one joint sim in full, content included
-- ---------------------------------------------------------------------------
select public.jp_drop_overloads('jp_doc');
create or replace function public.jp_doc(p_doc_id text)
returns table (
  doc_id text, owner_uid uuid, title text, content text, status text,
  post_type text, posted_at timestamptz, academy boolean, format jsonb,
  meta jsonb, version integer, locked_by uuid, lock_wid text, lock_name text,
  lock_active boolean, mission_name text, scene_name text, live boolean,
  updated_at timestamptz
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
         d.mission_name, d.scene_name, d.live,
         d.updated_at
    from public.jp_docs d
    left join public.writers lw on lw.id = d.locked_by
   where d.doc_id = p_doc_id and public.is_jp_member(p_doc_id);
$$;

revoke all on function public.jp_list()    from public, anon;
revoke all on function public.jp_doc(text) from public, anon;
grant execute on function public.jp_list()    to authenticated;
grant execute on function public.jp_doc(text) to authenticated;
