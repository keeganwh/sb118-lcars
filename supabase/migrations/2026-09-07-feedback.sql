-- ---------------------------------------------------------------------------
-- MIGRATION 2026-09-07 : App Feedback + the admin usage overview
-- ---------------------------------------------------------------------------
-- Run this ONCE in the Supabase SQL editor, AFTER the app build that uses it
-- is deployed. It is the tail of supabase/schema.sql, lifted out so it can be
-- applied on its own -- running the whole schema file again does exactly the
-- same thing, and either is safe: every statement here is re-runnable.
--
-- It depends on my_role(), which already exists.

-- ---------------------------------------------------------------------------
-- feedback_reports : bug reports and feature requests filed from inside the app
-- ---------------------------------------------------------------------------
-- A writer files a report from a side panel without leaving what they were
-- doing. Super admins read the queue, action it, and can write one note back.
-- The note lands on the writer's own copy of their report -- there is no
-- notification surface in this app, so the reply goes where the writer already
-- has a reason to look, rather than waiting on a system that does not exist.
--
-- WHAT IS AND IS NOT IN HERE. The row holds the writer's words and a small
-- context blob (app version, which view, skin/mode/vibe, viewport, whether the
-- open sim is joint). The CAPTURE -- a serialised copy of the open view, and
-- optionally an image the writer attached -- lives in the `app-feedback`
-- storage bucket, never in a column. That is the character-pics precedent at
-- the top of this file, for the same reason: bytes in jsonb are bytes in every
-- backup and every row read.
--
-- Nothing here is written directly. Table privileges grant select only, so
-- filing, actioning and archiving all go through the functions below, and the
-- caps and role checks inside them cannot be sidestepped.
create table if not exists public.feedback_reports (
  id                uuid primary key,
  writer_uid        uuid not null references auth.users(id) on delete cascade,
  kind              text not null check (kind in ('bug', 'feature')),
  body              text not null,
  app_version       text,
  context           jsonb not null default '{}'::jsonb,
  -- Storage object paths, not bytes. Null once purged.
  capture_page      text,
  capture_shot      text,
  status            text not null default 'new'
                      check (status in ('new', 'ignored', 'responded',
                                        'in_development', 'later')),
  admin_note        text,
  status_at         timestamptz,
  status_by         text,
  -- Archiving is a timestamp, not a status: a report can be archived in any
  -- state, and folding it into `status` would lose the state it was in.
  archived_at       timestamptz,
  -- Stamped when the storage objects for this report have been removed. The
  -- purge is a two-step -- the client deletes the objects, then calls the
  -- function that clears the row -- because Postgres cannot delete a storage
  -- object. This column is what makes a half-finished purge visible and
  -- re-runnable instead of silently leaving bytes behind.
  capture_purged_at timestamptz,
  writer_seen_at    timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists feedback_mine_idx
  on public.feedback_reports (writer_uid, created_at desc);
create index if not exists feedback_queue_idx
  on public.feedback_reports (created_at desc) where archived_at is null;

alter table public.feedback_reports enable row level security;

-- A writer reads their own reports and nobody else's. Super admins do NOT read
-- the queue through a widened policy here -- they read it through
-- admin_list_feedback() below, for the same reason admin_list_writers() exists.
drop policy if exists feedback_own on public.feedback_reports;
create policy feedback_own on public.feedback_reports
  for select using (auth.uid() = writer_uid);

revoke all on table public.feedback_reports from anon, authenticated;
grant select on table public.feedback_reports to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for feedback captures
-- ---------------------------------------------------------------------------
-- PRIVATE, unlike character-pics. A capture can contain the writer's own
-- unposted sim -- and on a joint sim, somebody else's -- so it is never served
-- from a guessable public URL. Admins read it over a signed URL.
--
-- Path shape: <auth.uid()>/<report id>/page.html and .../shot.<ext>. The first
-- folder being the uid is what the write policy checks, exactly as charpics
-- does; the second being the report id is what lets a purge delete everything
-- belonging to one report by prefix.
insert into storage.buckets (id, name, public)
values ('app-feedback', 'app-feedback', false)
on conflict (id) do nothing;

drop policy if exists feedback_obj_write on storage.objects;
create policy feedback_obj_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'app-feedback'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists feedback_obj_read on storage.objects;
create policy feedback_obj_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'app-feedback'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.my_role() = 'super_admin')
  );

-- Both the writer and a super admin can delete: the writer because it is their
-- own file, the admin because "delete or archive destroys the capture" is a
-- promise that has to hold for reports the admin is clearing out.
drop policy if exists feedback_obj_delete on storage.objects;
create policy feedback_obj_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'app-feedback'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.my_role() = 'super_admin')
  );

-- ---------------------------------------------------------------------------
-- feedback_submit() : file a report
-- ---------------------------------------------------------------------------
-- The id is generated by the CLIENT and passed in, because the capture is
-- uploaded to <uid>/<id>/ before the row exists -- the path needs the id first.
-- The function refuses an id that is already taken, so a client cannot write
-- over somebody else's report by guessing one.
--
-- The limits live here rather than in a check constraint so they can say
-- something useful when they fire:
--   * five reports an hour per writer, so the table cannot be used as storage;
--   * the body is required and capped at 4000 characters;
--   * capture paths must start with the caller's own uid folder.
select public.jp_drop_overloads('feedback_submit');
create or replace function public.feedback_submit(
  p_id           uuid,
  p_kind         text,
  p_body         text,
  p_app_version  text,
  p_context      jsonb,
  p_capture_page text,
  p_capture_shot text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  prefix text;
begin
  if uid is null then
    raise exception 'Sign in to send feedback.';
  end if;
  if p_kind not in ('bug', 'feature') then
    raise exception 'A report is either a bug or a feature request.';
  end if;
  if coalesce(btrim(p_body), '') = '' then
    raise exception 'Tell us what happened -- the description cannot be empty.';
  end if;
  if length(p_body) > 4000 then
    raise exception 'That description is too long (4000 characters maximum).';
  end if;
  if (select count(*) from public.feedback_reports
       where writer_uid = uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You have sent several reports in the last hour. Please try again shortly.';
  end if;
  if exists (select 1 from public.feedback_reports where id = p_id) then
    raise exception 'That report has already been filed.';
  end if;

  prefix := uid::text || '/';
  if p_capture_page is not null and left(p_capture_page, length(prefix)) <> prefix then
    raise exception 'A capture must be stored under your own folder.';
  end if;
  if p_capture_shot is not null and left(p_capture_shot, length(prefix)) <> prefix then
    raise exception 'A capture must be stored under your own folder.';
  end if;

  insert into public.feedback_reports
    (id, writer_uid, kind, body, app_version, context, capture_page, capture_shot)
  values
    (p_id, uid, p_kind, btrim(p_body), p_app_version,
     coalesce(p_context, '{}'::jsonb), p_capture_page, p_capture_shot);

  return p_id;
end $$;

revoke all on function public.feedback_submit(uuid, text, text, text, jsonb, text, text) from public, anon;
grant execute on function public.feedback_submit(uuid, text, text, text, jsonb, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- feedback_mark_seen() : the writer has read the replies on their reports
-- ---------------------------------------------------------------------------
-- Drives the badge on the feedback button. A status change with a note is the
-- only thing a writer is told about, and this is how the app knows they have
-- been told. Not an update policy on the table: an update policy would let a
-- writer rewrite their own body or status after an admin had read it.
select public.jp_drop_overloads('feedback_mark_seen');
create or replace function public.feedback_mark_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.feedback_reports
     set writer_seen_at = now()
   where writer_uid = auth.uid();
$$;

revoke all on function public.feedback_mark_seen() from public, anon;
grant execute on function public.feedback_mark_seen() to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_feedback() : the queue, for super admins only
-- ---------------------------------------------------------------------------
-- Moderators are excluded deliberately, matching admin_list_writers(): they
-- exist to action the PIN queue, and a report can contain a writer's unposted
-- sim text.
select public.jp_drop_overloads('admin_list_feedback');
create or replace function public.admin_list_feedback(p_include_archived boolean default false)
returns table (
  id                uuid,
  writer_id         text,
  display_name      text,
  kind              text,
  body              text,
  app_version       text,
  context           jsonb,
  capture_page      text,
  capture_shot      text,
  status            text,
  admin_note        text,
  status_at         timestamptz,
  status_by         text,
  archived_at       timestamptz,
  capture_purged_at timestamptz,
  created_at        timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'Only a super admin can read the feedback queue.';
  end if;
  return query
    select f.id, w.writer_id,
           nullif(btrim(coalesce(w.display_name, '')), ''),
           f.kind, f.body, f.app_version, f.context,
           f.capture_page, f.capture_shot,
           f.status, f.admin_note, f.status_at, f.status_by,
           f.archived_at, f.capture_purged_at, f.created_at
      from public.feedback_reports f
      left join public.writers w on w.id = f.writer_uid
     where p_include_archived or f.archived_at is null
     order by f.created_at desc;
end $$;

revoke all on function public.admin_list_feedback(boolean) from public, anon;
grant execute on function public.admin_list_feedback(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_feedback_status() : action a report, optionally with a note back
-- ---------------------------------------------------------------------------
-- The note replaces whatever was there before rather than appending -- this is
-- a status line to the writer, not a conversation. Passing null leaves the
-- existing note alone, so a status can be corrected without wiping the reply.
select public.jp_drop_overloads('admin_feedback_status');
create or replace function public.admin_feedback_status(
  p_id     uuid,
  p_status text,
  p_note   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare me text;
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'Only a super admin can action feedback.';
  end if;
  if p_status not in ('new', 'ignored', 'responded', 'in_development', 'later') then
    raise exception 'Unknown status: %', p_status;
  end if;
  if p_note is not null and length(p_note) > 2000 then
    raise exception 'That note is too long (2000 characters maximum).';
  end if;
  select writer_id into me from public.writers where id = auth.uid();

  update public.feedback_reports
     set status     = p_status,
         admin_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), admin_note),
         status_at  = now(),
         status_by  = me,
         -- A new note is unread again, so the writer's badge comes back.
         writer_seen_at = case
           when nullif(btrim(coalesce(p_note, '')), '') is not null then null
           else writer_seen_at end
   where id = p_id;

  if not found then
    raise exception 'That report no longer exists.';
  end if;
end $$;

revoke all on function public.admin_feedback_status(uuid, text, text) from public, anon;
grant execute on function public.admin_feedback_status(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_feedback_archive() / admin_feedback_delete() : and the capture goes
-- ---------------------------------------------------------------------------
-- Both destroy the capture, which is the promise made to the writer. The
-- storage objects are removed by the CLIENT first -- Postgres cannot delete
-- one -- and then one of these clears the row. Archive keeps the words and the
-- decision; delete keeps nothing.
--
-- Archiving nulls the capture paths and stamps capture_purged_at, so a row
-- whose objects were removed but whose call did not land is distinguishable
-- from one that was never purged: it still names its paths.
select public.jp_drop_overloads('admin_feedback_archive');
create or replace function public.admin_feedback_archive(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'Only a super admin can archive feedback.';
  end if;
  update public.feedback_reports
     set archived_at       = coalesce(archived_at, now()),
         capture_page      = null,
         capture_shot      = null,
         capture_purged_at = coalesce(capture_purged_at, now())
   where id = p_id;
  if not found then
    raise exception 'That report no longer exists.';
  end if;
end $$;

select public.jp_drop_overloads('admin_feedback_delete');
create or replace function public.admin_feedback_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'Only a super admin can delete feedback.';
  end if;
  delete from public.feedback_reports where id = p_id;
  if not found then
    raise exception 'That report no longer exists.';
  end if;
end $$;

revoke all on function public.admin_feedback_archive(uuid) from public, anon;
revoke all on function public.admin_feedback_delete(uuid)  from public, anon;
grant execute on function public.admin_feedback_archive(uuid) to authenticated;
grant execute on function public.admin_feedback_delete(uuid)  to authenticated;

-- ---------------------------------------------------------------------------
-- admin_usage_overview() : who is using the storage, for super admins only
-- ---------------------------------------------------------------------------
-- Ships in the same migration as the feedback table on purpose. Applying a
-- migration here has a deploy-ordering rule attached to it, so two migrations
-- cost more than twice one.
--
-- `bytes` is what the writer's data costs the database: the payload blob, their
-- snapshots, the joint sims they own, and the files they have in the two
-- buckets. pg_column_size() reads the COMPRESSED, stored size, which is the
-- honest number for "what is this costing" -- expect it to be well under the
-- length of the JSON.
--
-- Like admin_list_writers(), this is a function rather than a policy: writers
-- is read by every writer on every boot and does not get widened.
select public.jp_drop_overloads('admin_usage_overview');
create or replace function public.admin_usage_overview()
returns table (
  writer_id      text,
  display_name   text,
  role           text,
  last_active    timestamptz,
  doc_count      integer,
  snapshot_count integer,
  joint_count    integer,
  file_bytes     bigint,
  bytes          bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'Only a super admin can view usage.';
  end if;
  return query
    select w.writer_id,
           nullif(btrim(coalesce(w.display_name, '')), ''),
           w.role,
           greatest(w.updated_at, s.updated_at)                      as last_active,
           -- Solo sims live in the payload blob, so the count comes out of the
           -- JSON rather than a table. A joint sim is an ordinary doc in there
           -- too, which is why it is counted separately below rather than
           -- assumed to be absent.
           coalesce(jsonb_array_length(s.payload -> 'docs'), 0)::int as doc_count,
           coalesce(sn.n, 0)::int                                    as snapshot_count,
           coalesce(jp.n, 0)::int                                    as joint_count,
           coalesce(ob.b, 0)::bigint                                 as file_bytes,
           (coalesce(pg_column_size(s.payload), 0)
            + coalesce(sn.b, 0)
            + coalesce(jp.b, 0)
            + coalesce(ob.b, 0))::bigint                             as bytes
      from public.writers w
      left join public.state s on s.writer_uid = w.id
      left join lateral (
        select count(*) n, sum(pg_column_size(x.html))::bigint b
          from public.snapshots x where x.writer_uid = w.id
      ) sn on true
      left join lateral (
        select count(*) n,
               sum(pg_column_size(d.content) + pg_column_size(d.meta))::bigint b
          from public.jp_docs d where d.owner_uid = w.id
      ) jp on true
      left join lateral (
        select sum(coalesce((o.metadata ->> 'size')::bigint, 0))::bigint b
          from storage.objects o
         where o.bucket_id in ('character-pics', 'app-feedback')
           and (storage.foldername(o.name))[1] = w.id::text
      ) ob on true
     order by bytes desc nulls last;
end $$;

revoke all on function public.admin_usage_overview() from public, anon;
grant execute on function public.admin_usage_overview() to authenticated;
