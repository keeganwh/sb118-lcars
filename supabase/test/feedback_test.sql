-- Feedback reports and the usage overview: behaviour tests for the database half.
--
-- The role checks and the RLS policy are the whole boundary here -- the app's
-- own guards are cosmetic -- and none of it can be exercised from a browser
-- without a second account and a super admin. Run with supabase/test/run.sh.
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- --- fixtures ---------------------------------------------------------------
delete from public.feedback_reports;
delete from public.jp_docs;
delete from public.writers;
delete from auth.users;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@lcars.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@lcars.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@lcars.local');
insert into public.writers (id, writer_id, role) values
  ('00000000-0000-0000-0000-00000000000a', 'A111', 'writer'),
  ('00000000-0000-0000-0000-00000000000b', 'B222', 'moderator'),
  ('00000000-0000-0000-0000-00000000000c', 'C333', 'super_admin');

create or replace function pg_temp.be(p text) returns void language sql as $$
  select set_config('test.uid', '00000000-0000-0000-0000-00000000000' || p, false)::void
$$;
create or replace function pg_temp.ok(cond boolean, label text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end $$;
set client_min_messages = notice;

-- --- filing -----------------------------------------------------------------
select pg_temp.be('a');
select public.feedback_submit(
  '11111111-1111-1111-1111-111111111111', 'bug', '  The toolbar vanished.  ',
  '4.25', '{"view":"workspace"}'::jsonb,
  '00000000-0000-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/page.html',
  null);

select pg_temp.ok((select body from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111') = 'The toolbar vanished.',
                  'a writer can file a report, and the body is trimmed');
select pg_temp.ok((select status from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111') = 'new',
                  'a fresh report starts as new, not as unactioned-looking ignored');

-- An empty body is not a report.
do $$ begin
  perform public.feedback_submit('22222222-2222-2222-2222-222222222222', 'bug', '   ',
                                 '4.25', '{}'::jsonb, null, null);
  raise exception 'FAIL: an empty report was accepted';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok(true, 'an empty description is refused');

-- A capture path outside the caller's own folder is refused. This is the check
-- that stops one writer naming another writer's stored capture as their own.
do $$ begin
  perform public.feedback_submit('22222222-2222-2222-2222-222222222222', 'bug', 'hi',
    '4.25', '{}'::jsonb,
    '00000000-0000-0000-0000-00000000000b/22222222-2222-2222-2222-222222222222/page.html',
    null);
  raise exception 'FAIL: a capture path under another writer was accepted';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok(true, 'a capture path under another writer is refused');

-- A report id cannot be reused, so one writer cannot overwrite another's row.
select pg_temp.be('b');
do $$ begin
  perform public.feedback_submit('11111111-1111-1111-1111-111111111111', 'bug', 'mine now',
                                 '4.25', '{}'::jsonb, null, null);
  raise exception 'FAIL: an existing report id was reused';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok((select writer_uid from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111')
                  = '00000000-0000-0000-0000-00000000000a',
                  'a report id cannot be reused to overwrite somebody else''s report');

-- --- reading ----------------------------------------------------------------
set role authenticated;
select pg_temp.be('b');
select pg_temp.ok((select count(*) from public.feedback_reports) = 0,
                  'RLS: another writer cannot see a report that is not theirs');
select pg_temp.be('a');
select pg_temp.ok((select count(*) from public.feedback_reports) = 1,
                  'RLS: a writer can see their own report');

-- Nobody writes to the table directly, from any role. Filing and actioning go
-- through the functions, which is what makes the caps unsidesteppable.
select pg_temp.be('a');
do $$ begin
  update public.feedback_reports set status = 'in_development';
  raise exception 'FAIL: a writer updated a report directly';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok(true, 'RLS: a writer cannot update their report after filing it');
reset role;

-- --- the queue --------------------------------------------------------------
-- A moderator is not a super admin. They action the PIN queue; a feedback
-- report can contain unposted sim text, so they do not see this one.
select pg_temp.be('b');
do $$ begin
  perform public.admin_list_feedback();
  raise exception 'FAIL: a moderator read the feedback queue';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok(true, 'a moderator cannot read the feedback queue');

select pg_temp.be('a');
do $$ begin
  perform public.admin_list_feedback();
  raise exception 'FAIL: an ordinary writer read the feedback queue';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok(true, 'an ordinary writer cannot read the feedback queue');

select pg_temp.be('c');
select pg_temp.ok((select count(*) from public.admin_list_feedback()) = 1,
                  'a super admin reads the queue');
select pg_temp.ok((select writer_id from public.admin_list_feedback()) = 'A111',
                  'the queue names the writer who filed the report');

-- --- actioning --------------------------------------------------------------
select public.admin_feedback_status('11111111-1111-1111-1111-111111111111',
                                    'implementing', 'Good catch -- fixing it.');
select pg_temp.ok((select status from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111') = 'implementing'
              and (select admin_note from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111') is not null
              and (select status_by from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111') = 'C333',
                  'a super admin sets a status and writes a note back');

-- A status change without a note leaves the note alone.
select public.admin_feedback_status('11111111-1111-1111-1111-111111111111', 'will_revisit');
select pg_temp.ok((select admin_note from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111')
                  = 'Good catch -- fixing it.',
                  'correcting a status does not wipe the reply already sent');

-- The writer sees the reply, and marking it seen clears the badge.
select pg_temp.be('a');
select pg_temp.ok((select writer_seen_at from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111') is null,
                  'a new reply is unread, so the writer gets a badge');
select public.feedback_mark_seen();
select pg_temp.ok((select writer_seen_at from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111') is not null,
                  'reading the panel marks the reply seen');

select pg_temp.be('a');
do $$ begin
  perform public.admin_feedback_status('11111111-1111-1111-1111-111111111111', 'rejected');
  raise exception 'FAIL: a writer actioned their own report';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok(true, 'a writer cannot action their own report');

-- --- withdrawing ------------------------------------------------------------
-- A writer can take their own report back. It goes entirely: half-deleting it
-- would leave the sim text in the database, which is the thing most likely to
-- be the reason for withdrawing.
select pg_temp.be('a');
select public.feedback_submit('33333333-3333-3333-3333-333333333333', 'feature',
  'An idea I have thought better of.', '4.25', '{}'::jsonb, null, null);
select pg_temp.ok((select count(*) from public.feedback_reports
                    where id = '33333333-3333-3333-3333-333333333333') = 1,
                  'a second report is filed');

-- Not somebody else's, though.
select pg_temp.be('b');
do $$ begin
  perform public.feedback_withdraw('33333333-3333-3333-3333-333333333333');
  raise exception 'FAIL: another writer withdrew a report that was not theirs';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok((select count(*) from public.feedback_reports
                    where id = '33333333-3333-3333-3333-333333333333') = 1,
                  'another writer cannot withdraw a report that is not theirs');

select pg_temp.be('a');
select public.feedback_withdraw('33333333-3333-3333-3333-333333333333');
select pg_temp.ok((select count(*) from public.feedback_reports
                    where id = '33333333-3333-3333-3333-333333333333') = 0,
                  'the writer can withdraw their own report, and the row goes entirely');

-- Withdrawing works whatever the team has done with it: it is their writing,
-- and a status is not a claim on it.
select public.feedback_submit('44444444-4444-4444-4444-444444444444', 'bug',
  'Filed then withdrawn after actioning.', '4.25', '{}'::jsonb, null, null);
select pg_temp.be('c');
select public.admin_feedback_status('44444444-4444-4444-4444-444444444444',
                                    'implementing', 'On it.');
select pg_temp.be('a');
select public.feedback_withdraw('44444444-4444-4444-4444-444444444444');
select pg_temp.ok((select count(*) from public.feedback_reports
                    where id = '44444444-4444-4444-4444-444444444444') = 0,
                  'and can withdraw one the team has already actioned');

-- --- archiving and deleting -------------------------------------------------
select pg_temp.be('c');
select public.admin_feedback_archive('11111111-1111-1111-1111-111111111111');
select pg_temp.ok((select capture_page from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111') is null
              and (select capture_purged_at from public.feedback_reports
                    where id = '11111111-1111-1111-1111-111111111111') is not null,
                  'archiving destroys the capture and stamps the purge');
select pg_temp.ok((select count(*) from public.admin_list_feedback()) = 0
              and (select count(*) from public.admin_list_feedback(true)) = 1,
                  'an archived report leaves the queue but is still there to find');

select public.admin_feedback_delete('11111111-1111-1111-1111-111111111111');
select pg_temp.ok((select count(*) from public.feedback_reports) = 0,
                  'a super admin can delete a report outright');

-- --- usage overview ---------------------------------------------------------
-- S.docs IS AN OBJECT KEYED BY SIM ID. The first version of this fixture used
-- an array, which is the only reason the shipped function -- which called
-- jsonb_array_length() on it -- passed these checks while failing on every real
-- account with 'cannot get array length of a non-array'. The object shape is
-- the one the app actually writes, so it is the one tested first.
insert into public.state (writer_uid, payload) values
  ('00000000-0000-0000-0000-00000000000a',
   '{"docs":{"d1":{"t":"one"},"d2":{"t":"two"},"d3":{"t":"three"}}}'::jsonb),
  ('00000000-0000-0000-0000-00000000000b',
   '{"docs":[{"id":"d1"},{"id":"d2"}]}'::jsonb),
  ('00000000-0000-0000-0000-00000000000c',
   '{"docs":null}'::jsonb);
insert into storage.objects (bucket_id, name, metadata) values
  ('character-pics', '00000000-0000-0000-0000-00000000000a/pic.png',
   '{"size": 5000}'::jsonb);

select pg_temp.be('a');
do $$ begin
  perform public.admin_usage_overview();
  raise exception 'FAIL: an ordinary writer read the usage overview';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok(true, 'an ordinary writer cannot read the usage overview');

select pg_temp.be('c');
select pg_temp.ok((select doc_count from public.admin_usage_overview()
                    where writer_id = 'A111') = 3,
                  'the usage overview counts sims out of the payload blob');
select pg_temp.ok((select doc_count from public.admin_usage_overview()
                    where writer_id = 'B222') = 2,
                  'and reads an array-shaped payload too, rather than failing');
select pg_temp.ok((select doc_count from public.admin_usage_overview()
                    where writer_id = 'C333') = 0,
                  'and counts a payload that is neither as nothing');
select pg_temp.ok((select file_bytes from public.admin_usage_overview()
                    where writer_id = 'A111') = 5000,
                  'and counts the writer''s stored files');
select pg_temp.ok((select bytes from public.admin_usage_overview()
                    where writer_id = 'A111') > 5000,
                  'total bytes include the payload as well as the files');
select pg_temp.ok((select count(*) from public.admin_usage_overview()) = 3,
                  'every writer appears, including the ones storing nothing');

-- --- the capacity totals -----------------------------------------------------
select pg_temp.be('a');
do $$ begin
  perform public.admin_storage_totals();
  raise exception 'FAIL: an ordinary writer read the storage totals';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok(true, 'an ordinary writer cannot read the storage totals');

select pg_temp.be('c');
select pg_temp.ok((select doc_n from public.admin_storage_totals()) = 5,
                  'the totals count every sim across every payload, object or array');
select pg_temp.ok((select pic_bytes from public.admin_storage_totals()) = 5000,
                  'and the character pictures separately from the database');
select pg_temp.ok((select doc_bytes from public.admin_storage_totals()) > 0,
                  'the payload blobs have a size of their own');
-- The whole database is what the allowance is measured against, so it has to be
-- larger than the app's own rows rather than equal to them.
select pg_temp.ok((select db_bytes from public.admin_storage_totals())
                  > (select doc_bytes + snapshot_bytes + joint_bytes
                       from public.admin_storage_totals()),
                  'db_bytes is the whole database, not just the app''s own tables');
select pg_temp.ok((select writer_n from public.admin_storage_totals()) = 3,
                  'and every account is counted');

-- --- tickets: a number and a headline -------------------------------------
select pg_temp.be('a');
select public.feedback_submit('33333333-3333-3333-3333-333333333333', 'bug',
       'The editor ate my sim.', '4.3', '{}'::jsonb, null, null,
       'Editor loses text on paste');
select public.feedback_submit('44444444-4444-4444-4444-444444444444', 'feature',
       'Please add a dark mode for the manifest.', '4.3', '{}'::jsonb, null, null, null);

select pg_temp.ok((select title from public.feedback_reports
                    where id = '33333333-3333-3333-3333-333333333333')
                  = 'Editor loses text on paste',
                  'a report carries the headline it was filed with');
select pg_temp.ok((select title from public.feedback_reports
                    where id = '44444444-4444-4444-4444-444444444444') is null,
                  'and a report filed without one is left null for the app to stand in for');
select pg_temp.ok((select ticket_no from public.feedback_reports
                    where id = '44444444-4444-4444-4444-444444444444')
                  > (select ticket_no from public.feedback_reports
                      where id = '33333333-3333-3333-3333-333333333333'),
                  'ticket numbers are handed out in the order reports arrive');

do $$ begin
  perform public.feedback_submit('55555555-5555-5555-5555-555555555555', 'bug',
          'x', '4.3', '{}'::jsonb, null, null, repeat('y', 101));
  raise exception 'FAIL: a 101-character headline was accepted';
exception when others then
  if position('FAIL:' in sqlerrm) = 1 then raise; end if;
end $$;
select pg_temp.ok(true, 'a headline over 100 characters is refused');

select pg_temp.be('c');
select pg_temp.ok((select title from public.admin_list_feedback()
                    where id = '33333333-3333-3333-3333-333333333333')
                  = 'Editor loses text on paste',
                  'the queue hands the headline to the admin panel');
select pg_temp.ok((select ticket_no from public.admin_list_feedback()
                    where id = '33333333-3333-3333-3333-333333333333') is not null,
                  'and the ticket number with it');

-- The note box in the panel is prefilled and editable, so an empty box has to
-- mean "deleted" rather than "unchanged" -- which is the one thing a null on
-- its own could not say.
select public.admin_feedback_status('33333333-3333-3333-3333-333333333333',
       'implementing', 'Looking at it now.');
select public.admin_feedback_status('33333333-3333-3333-3333-333333333333',
       'implementing', 'Fixed in the next version.');
select pg_temp.ok((select admin_note from public.feedback_reports
                    where id = '33333333-3333-3333-3333-333333333333')
                  = 'Fixed in the next version.',
                  'an admin can edit the note they already sent');
select public.admin_feedback_status('33333333-3333-3333-3333-333333333333',
       'implementing', null, true);
select pg_temp.ok((select admin_note from public.feedback_reports
                    where id = '33333333-3333-3333-3333-333333333333') is null,
                  'and can clear it outright with p_clear_note');
select public.admin_feedback_status('33333333-3333-3333-3333-333333333333',
       'will_revisit', null);
select pg_temp.ok((select status from public.feedback_reports
                    where id = '33333333-3333-3333-3333-333333333333') = 'will_revisit',
                  'while a plain null still leaves the note alone');

reset role;
\echo '--- all feedback database checks passed ---'
