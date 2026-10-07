-- ---------------------------------------------------------------------------
-- MIGRATION 2026-10-07 : splitting one feedback report into several tickets
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor. It follows 2026-10-04-live-coauthoring.sql.
--
-- EITHER ORDER IS SAFE, but deploy first as usual. The older build ignores the
-- two new columns admin_list_feedback() returns; the newer build, before this
-- has run, simply gets an error from the Split button and nothing else changes.
--
-- WHAT IT DOES.
--   * feedback_reports gains `parent_id`: a split-off ticket points at the
--     report it came from.
--   * admin_list_feedback() also returns parent_id and the parent's ticket
--     number, so the queue can say "from #2".
--   * admin_feedback_split() is new: it files the pieces under the original
--     writer, moves any screenshot to the first piece, and archives the
--     original with an unread note naming the new numbers.
--
-- Re-runnable. If in doubt, run supabase/schema.sql instead, which always ends
-- in the current state.

alter table public.feedback_reports add column if not exists parent_id uuid
  references public.feedback_reports(id) on delete set null;

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
  created_at        timestamptz,
  parent_id         uuid,
  parent_ticket     bigint
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
           f.parent_id, par.ticket_no
      from public.feedback_reports f
      left join public.writers w on w.id = f.writer_uid
      left join public.feedback_reports par on par.id = f.parent_id
     where p_include_archived or f.archived_at is null
     order by f.created_at desc;
end $$;

revoke all on function public.admin_list_feedback(boolean) from public, anon;
grant execute on function public.admin_list_feedback(boolean) to authenticated;

select public.jp_drop_overloads('admin_feedback_split');
create or replace function public.admin_feedback_split(
  p_id    uuid,
  p_parts jsonb,
  p_note  text default null
)
returns table (id uuid, ticket_no bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  par   public.feedback_reports;
  me    text;
  part  jsonb;
  n     int := 0;
  nid   uuid;
  nno   bigint;
  nums  text[] := '{}';
  ttl   text;
  bod   text;
  knd   text;
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'Only a super admin can split feedback.';
  end if;
  select * into par from public.feedback_reports f where f.id = p_id for update;
  if not found then
    raise exception 'That report no longer exists.';
  end if;
  if par.archived_at is not null then
    raise exception 'That report is archived. Only an open report can be split.';
  end if;
  if jsonb_typeof(p_parts) <> 'array' or jsonb_array_length(p_parts) < 2 then
    raise exception 'A split needs at least two pieces.';
  end if;
  if jsonb_array_length(p_parts) > 20 then
    raise exception 'That is more than twenty pieces.';
  end if;
  if p_note is not null and length(p_note) > 2000 then
    raise exception 'That note is too long (2000 characters maximum).';
  end if;
  select w.writer_id into me from public.writers w where w.id = auth.uid();

  for part in select * from jsonb_array_elements(p_parts) loop
    n   := n + 1;
    ttl := nullif(btrim(coalesce(part ->> 'title', '')), '');
    bod := nullif(btrim(coalesce(part ->> 'body',  '')), '');
    knd := coalesce(part ->> 'kind', par.kind);
    if ttl is null then raise exception 'Piece % needs a headline.', n; end if;
    if length(ttl) > 100 then raise exception 'The headline of piece % is over 100 characters.', n; end if;
    if bod is null then raise exception 'Piece % has no text.', n; end if;
    if knd not in ('bug', 'feature') then raise exception 'Piece % has an unknown kind: %', n, knd; end if;

    nid := gen_random_uuid();
    nno := nextval('public.feedback_ticket_seq');
    insert into public.feedback_reports
      (id, writer_uid, kind, title, body, ticket_no, app_version, context,
       capture_shot, parent_id, created_at)
    values
      (nid, par.writer_uid, knd, ttl, bod, nno, par.app_version, par.context,
       case when n = 1 then par.capture_shot end, par.id, par.created_at);
    nums := nums || ('#' || nno);
    id := nid; ticket_no := nno;
    return next;
  end loop;

  update public.feedback_reports f
     set archived_at    = now(),
         capture_shot   = null,
         -- A page copy from before 2026-09-09 is purged by the client first,
         -- as with any archive; the row just records that it is gone.
         capture_page   = null,
         capture_purged_at = case when par.capture_page is not null then now()
                                  else f.capture_purged_at end,
         admin_note     = coalesce(nullif(btrim(coalesce(p_note, '')), ''),
                            'Thank you. This held several separate things, so it has been split into '
                            || 'tickets that can each be tracked and finished on their own:')
                          || ' ' || array_to_string(nums, ', ') || '.',
         status_at      = now(),
         status_by      = me,
         writer_seen_at = null
   where f.id = par.id;
end $$;

revoke all on function public.admin_feedback_split(uuid, jsonb, text) from public, anon;
grant execute on function public.admin_feedback_split(uuid, jsonb, text) to authenticated;
