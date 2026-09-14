-- ---------------------------------------------------------------------------
-- MIGRATION 2026-09-14 : feedback becomes a ticket queue
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor. It follows 2026-09-14-usage-fix.sql.
--
-- RUN IT AFTER THE DEPLOY, not before. Nothing here breaks the older build --
-- every new argument has a default, so a browser still holding the previous
-- version keeps filing reports exactly as it did.
--
-- WHAT IT DOES.
--   * feedback_reports gains `title` (a headline, 100 characters) and
--     `ticket_no` (a number a person can quote).
--   * Everything already filed is numbered, oldest first, and the two reports
--     sent before the form asked for a headline are given one.
--   * feedback_submit() takes the headline.
--   * admin_list_feedback() returns both, so the Admin panel can draw the queue
--     as a list of tickets that open on click.
--   * admin_feedback_status() takes p_clear_note, because the note box in the
--     panel is now prefilled and editable: an empty box there means the admin
--     deleted the reply, which a null on its own could not say.
--
-- Re-runnable, like everything else here.

-- ---------------------------------------------------------------------------
-- Columns, the ticket sequence, and the backfill
-- ---------------------------------------------------------------------------
-- Added after the fact, so the table above may already exist without them.
alter table public.feedback_reports add column if not exists title text;
alter table public.feedback_reports add column if not exists ticket_no bigint;
do $$ begin
  alter table public.feedback_reports
    add constraint feedback_title_len check (title is null or length(title) <= 100);
exception when duplicate_object then null; end $$;

create sequence if not exists public.feedback_ticket_seq owned by public.feedback_reports.ticket_no;

-- Everything already in the table gets a number, oldest first, so the numbering
-- matches the order they arrived in. The numbers are computed rather than drawn
-- from the sequence, because nextval() in an UPDATE is not handed out in the
-- order of the ORDER BY. Only rows without a number are touched, so this is
-- safe to run again.
update public.feedback_reports f
   set ticket_no = nb.n + (select coalesce(max(ticket_no), 0) from public.feedback_reports)
  from (select id, row_number() over (order by created_at) as n
          from public.feedback_reports where ticket_no is null) nb
 where f.id = nb.id;

-- And the sequence picks up above them. The third argument is `is_called`: on
-- an empty table this leaves the first ticket as #1 rather than #2.
select setval('public.feedback_ticket_seq',
              greatest(coalesce((select max(ticket_no) from public.feedback_reports), 0), 1),
              coalesce((select max(ticket_no) from public.feedback_reports), 0) > 0);

-- The two reports filed before the form asked for a headline, given real ones.
-- Matched on a phrase from the body rather than on an id, and only where the
-- headline is still empty, so re-running this cannot overwrite an edit.
update public.feedback_reports
   set title = 'Adding a picture to a character fails on the image URL'
 where title is null and kind = 'bug' and body like '%add a picture%';
update public.feedback_reports
   set title = 'Clickable links, adjustable line spacing, and pulling in a previous post'
 where title is null and kind = 'feature' and body like '%change the pace%';

create unique index if not exists feedback_ticket_no_idx
  on public.feedback_reports (ticket_no);

-- ---------------------------------------------------------------------------
-- feedback_submit() : now takes the headline
-- ---------------------------------------------------------------------------
--
-- p_title DEFAULTS TO NULL on purpose. A build deployed before this migration
-- is run calls the function without it, and the default is what lets the old
-- call and the new one reach the same function.
select public.jp_drop_overloads('feedback_submit');
create or replace function public.feedback_submit(
  p_id           uuid,
  p_kind         text,
  p_body         text,
  p_app_version  text,
  p_context      jsonb,
  p_capture_page text,
  p_capture_shot text,
  p_title        text default null
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
  if p_title is not null and length(btrim(p_title)) > 100 then
    raise exception 'That headline is too long (100 characters maximum).';
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
    (id, writer_uid, kind, title, body, app_version, context,
     capture_page, capture_shot, ticket_no)
  values
    (p_id, uid, p_kind, nullif(btrim(coalesce(p_title, '')), ''),
     btrim(p_body), p_app_version,
     coalesce(p_context, '{}'::jsonb), p_capture_page, p_capture_shot,
     nextval('public.feedback_ticket_seq'));

  return p_id;
end $$;

revoke all on function public.feedback_submit(uuid, text, text, text, jsonb, text, text, text) from public, anon;
grant execute on function public.feedback_submit(uuid, text, text, text, jsonb, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_feedback() : returns the number and the headline
-- ---------------------------------------------------------------------------
select public.jp_drop_overloads('admin_list_feedback');
create or replace function public.admin_list_feedback(p_include_archived boolean default false)
returns table (
  id                uuid,
  ticket_no         bigint,
  writer_id         text,
  display_name      text,
  kind              text,
  title             text,
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
    select f.id, f.ticket_no, w.writer_id,
           nullif(btrim(coalesce(w.display_name, '')), ''),
           f.kind, f.title, f.body, f.app_version, f.context,
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
-- admin_feedback_status() : a note that can be edited, and cleared
-- ---------------------------------------------------------------------------
-- admin_feedback_status() learns the new vocabulary. It still accepts the old
-- names for the same ordering reason as the constraint above.
--
-- AND IT LEARNS p_clear_note. The admin panel now prefills the note box with
-- the reply already sent, so it is edited rather than written once -- and an
-- empty box there means the admin deleted the note, not "leave it alone". A
-- null cannot tell those apart, so the caller says which it meant. It defaults
-- to false, which is exactly what a build deployed before this migration means.
select public.jp_drop_overloads('admin_feedback_status');
create or replace function public.admin_feedback_status(
  p_id         uuid,
  p_status     text,
  p_note       text default null,
  p_clear_note boolean default false
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
  if p_status not in ('new', 'implementing', 'will_revisit', 'rejected',
                      'in_development', 'later', 'ignored', 'responded') then
    raise exception 'Unknown status: %', p_status;
  end if;
  if p_note is not null and length(p_note) > 2000 then
    raise exception 'That note is too long (2000 characters maximum).';
  end if;
  select writer_id into me from public.writers where id = auth.uid();

  update public.feedback_reports
     set status     = p_status,
         admin_note = case when coalesce(p_clear_note, false) then null
                      else coalesce(nullif(btrim(coalesce(p_note, '')), ''), admin_note) end,
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

revoke all on function public.admin_feedback_status(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_feedback_status(uuid, text, text, boolean) to authenticated;
