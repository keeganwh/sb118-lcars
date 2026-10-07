-- MIGRATION 2026-10-07 : the Done status for feedback reports.
-- Safe in either order with the deploy, and safe to run more than once.

-- ---------------------------------------------------------------------------
-- The Done status  (2026-10-07)
-- ---------------------------------------------------------------------------
-- There was no way to tell a writer their report had actually been fixed or
-- built. Done is that outcome. The constraint keeps every older name as well,
-- so the order of deploy and migration does not matter.
do $$ begin
  alter table public.feedback_reports drop constraint if exists feedback_reports_status_check;
  alter table public.feedback_reports add constraint feedback_reports_status_check
    check (status in ('new', 'implementing', 'will_revisit', 'rejected', 'done',
                      'in_development', 'later', 'ignored', 'responded'));
exception when undefined_table then null;
end $$;

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
           else writer_seen_at end
   where id = p_id;

  if not found then
    raise exception 'That report no longer exists.';
  end if;
end $$;

revoke all on function public.admin_feedback_status(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_feedback_status(uuid, text, text, boolean) to authenticated;
