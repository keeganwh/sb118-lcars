-- MIGRATION 2026-10-08 : writers can dismiss a report marked Done.
-- Safe in either order with the deploy, and safe to run more than once.

-- ---------------------------------------------------------------------------
-- Dismissing a finished report  (2026-10-08)
-- ---------------------------------------------------------------------------
-- Once a report is Done, the writer can clear it from their own list. Unlike
-- withdrawing, nothing is deleted: the row stays for the admin queue and the
-- record, and only the writer stops seeing it. A new reply from an admin
-- brings it back, because a reply is news.
alter table public.feedback_reports add column if not exists writer_dismissed_at timestamptz;

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
   where id = p_id;

  if not found then
    raise exception 'That report no longer exists.';
  end if;
end $$;

revoke all on function public.admin_feedback_status(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_feedback_status(uuid, text, text, boolean) to authenticated;
