-- MIGRATION 2026-10-08 : dismissing a Done report, and withdrawal leaving a tombstone.
-- Safe in either order with the deploy, and safe to run more than once.

-- ---------------------------------------------------------------------------
-- Dismissing a finished report  (2026-10-08)
-- ---------------------------------------------------------------------------
-- Once a report is Done, the writer can clear it from their own list. Unlike
-- withdrawing, nothing is deleted: the row stays for the admin queue and the
-- record, and only the writer stops seeing it. A new reply from an admin
-- brings it back, because a reply is news.
alter table public.feedback_reports add column if not exists writer_dismissed_at timestamptz;
alter table public.feedback_reports add column if not exists withdrawn_at timestamptz;

select public.jp_drop_overloads('feedback_dismiss');
create or replace function public.feedback_dismiss(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.feedback_reports
     set writer_dismissed_at = now(),
         writer_seen_at      = coalesce(writer_seen_at, now())
   where id = p_id and writer_uid = auth.uid() and status = 'done';
  if not found then
    raise exception 'Only a report marked Done can be dismissed.';
  end if;
end $$;

revoke all on function public.feedback_dismiss(uuid) from public, anon;
grant execute on function public.feedback_dismiss(uuid) to authenticated;

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
  if p_status not in ('new', 'implementing', 'will_revisit', 'rejected', 'done',
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
         writer_seen_at = case
           when nullif(btrim(coalesce(p_note, '')), '') is not null then null
           else writer_seen_at end,
         writer_dismissed_at = case
           when nullif(btrim(coalesce(p_note, '')), '') is not null then null
           else writer_dismissed_at end
   where id = p_id and withdrawn_at is null;

  if not found then
    raise exception 'That report no longer exists.';
  end if;
end $$;

revoke all on function public.admin_feedback_status(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_feedback_status(uuid, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Withdrawing leaves a tombstone  (2026-10-08)
-- ---------------------------------------------------------------------------
-- Withdrawing used to delete the row outright. It now keeps a stub -- the
-- ticket number, kind, headline, who filed it and when it was withdrawn -- so
-- the admin queue shows that a report existed and was taken back. What the
-- writer WROTE is still destroyed: the body, the technical context and the
-- screenshot paths, because a report can hold unposted sim text. The client
-- deletes the stored screenshot first, as with every purge here.
--
-- The stub is archived, so it leaves the open queue, and is marked read and
-- dismissed so it never badges the writer. Their own list hides it.
alter table public.feedback_reports add column if not exists withdrawn_at timestamptz;

select public.jp_drop_overloads('feedback_withdraw');
create or replace function public.feedback_withdraw(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.feedback_reports
     set body              = '',
         context           = '{}'::jsonb,
         capture_page      = null,
         capture_shot      = null,
         capture_purged_at = coalesce(capture_purged_at, now()),
         withdrawn_at      = now(),
         archived_at       = coalesce(archived_at, now()),
         writer_seen_at    = coalesce(writer_seen_at, now()),
         writer_dismissed_at = coalesce(writer_dismissed_at, now())
   where id = p_id and writer_uid = auth.uid() and withdrawn_at is null;
  if not found then
    raise exception 'That report is not yours, or is already gone.';
  end if;
end $$;

revoke all on function public.feedback_withdraw(uuid) from public, anon;
grant execute on function public.feedback_withdraw(uuid) to authenticated;

select public.jp_drop_overloads('admin_list_feedback');
create or replace function public.admin_list_feedback(p_include_archived boolean default false)
returns table (
  id                  uuid,
  ticket_no           bigint,
  writer_id           text,
  display_name        text,
  kind                text,
  title               text,
  body                text,
  app_version         text,
  context             jsonb,
  capture_page        text,
  capture_shot        text,
  status              text,
  admin_note          text,
  status_at           timestamptz,
  status_by           text,
  archived_at         timestamptz,
  capture_purged_at   timestamptz,
  created_at          timestamptz,
  parent_id           uuid,
  parent_ticket       bigint,
  writer_dismissed_at timestamptz,
  withdrawn_at        timestamptz
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
           f.archived_at, f.capture_purged_at, f.created_at,
           f.parent_id, par.ticket_no, f.writer_dismissed_at, f.withdrawn_at
      from public.feedback_reports f
      left join public.writers w on w.id = f.writer_uid
      left join public.feedback_reports par on par.id = f.parent_id
     where p_include_archived or f.archived_at is null
     order by f.created_at desc;
end $$;

revoke all on function public.admin_list_feedback(boolean) from public, anon;
grant execute on function public.admin_list_feedback(boolean) to authenticated;
