-- ---------------------------------------------------------------------------
-- MIGRATION 2026-09-09 : feedback statuses, and letting a writer withdraw
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor. It follows 2026-09-07-feedback.sql.
--
-- ORDER DOES NOT MATTER for this one, unusually: the status constraint accepts
-- the old names as well as the new ones, on purpose, so neither the old build
-- nor the new one can write a value the column refuses. Run it before or after
-- the deploy.
--
-- Re-runnable, like everything else here.

-- ---------------------------------------------------------------------------
-- feedback: the status vocabulary, revised
-- ---------------------------------------------------------------------------
-- 'responded' described the mechanism rather than an outcome: any note an
-- admin writes reaches the writer whatever the status is, so a status meaning
-- "I replied" said nothing the note did not already say. The set now names
-- what will HAPPEN to the report.
--
--   new           nobody has looked at it yet
--   implementing  it is being built            (was in_development)
--   will_revisit  not now, but not refused     (was later)
--   rejected      it will not be done          (was ignored)
--
-- THE CONSTRAINT DELIBERATELY STILL ACCEPTS THE OLD NAMES. A check that took
-- only the new ones would break in whichever order this shipped: migrate first
-- and the deployed app writes 'in_development' into a column that refuses it;
-- deploy first and the new app writes 'implementing' into a column that has
-- not learned it yet. Accepting both makes the order not matter, which is the
-- only version of this that is safe to run against a live database.
do $$ begin
  alter table public.feedback_reports drop constraint if exists feedback_reports_status_check;
exception when undefined_table then null;
end $$;

do $$ begin
  alter table public.feedback_reports add constraint feedback_reports_status_check
    check (status in ('new', 'implementing', 'will_revisit', 'rejected',
                      'in_development', 'later', 'ignored', 'responded'));
exception when duplicate_object then null;
     when undefined_table then null;
end $$;

-- Existing rows move to the new vocabulary. 'responded' has no equivalent --
-- it never named an outcome -- so it lands on will_revisit, the option that
-- promises least.
update public.feedback_reports set status = case status
  when 'in_development' then 'implementing'
  when 'later'          then 'will_revisit'
  when 'ignored'        then 'rejected'
  when 'responded'      then 'will_revisit'
  else status end
 where status in ('in_development', 'later', 'ignored', 'responded');

-- ---------------------------------------------------------------------------
-- feedback_withdraw() : the writer takes their report back
-- ---------------------------------------------------------------------------
-- Their words and, in the capture, possibly their unposted sim -- so they can
-- have it back, at any status. The row goes entirely rather than being marked
-- withdrawn: a report nobody can act on is not a record worth keeping, and
-- half-deleting it would leave the sim text sitting in the database, which is
-- the thing they are most likely to be withdrawing.
--
-- Like every other purge here, the STORAGE OBJECTS GO FIRST, from the browser,
-- because Postgres cannot delete one. This clears the row afterwards.
select public.jp_drop_overloads('feedback_withdraw');
create or replace function public.feedback_withdraw(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.feedback_reports
   where id = p_id and writer_uid = auth.uid();
  if not found then
    raise exception 'That report is not yours, or is already gone.';
  end if;
end $$;

revoke all on function public.feedback_withdraw(uuid) from public, anon;
grant execute on function public.feedback_withdraw(uuid) to authenticated;

-- admin_feedback_status() learns the new vocabulary. It still accepts the old
-- names for the same ordering reason as the constraint above.
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
