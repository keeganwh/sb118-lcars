-- Joint Posts: behaviour tests for the database half.
--
-- These exist because the lock and the version check are the whole safety model
-- and neither can be exercised from a browser without two real accounts. Run
-- them with supabase/test/run.sh. Every check raises on failure, so a clean run
-- printing PASS lines is the pass condition.
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- --- fixtures ---------------------------------------------------------------
delete from public.jp_docs;
delete from public.writers;
delete from auth.users;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@lcars.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@lcars.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@lcars.local');
insert into public.writers (id, writer_id) values
  ('00000000-0000-0000-0000-00000000000a', 'A111'),
  ('00000000-0000-0000-0000-00000000000b', 'B222'),
  ('00000000-0000-0000-0000-00000000000c', 'C333');

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

-- --- creating ---------------------------------------------------------------
select pg_temp.be('a');
insert into public.jp_docs (doc_id, owner_uid, title, content)
  values ('doc1', '00000000-0000-0000-0000-00000000000a', 'Away Team', '<div>one</div>');

select pg_temp.ok(
  (select role from public.jp_members
    where doc_id = 'doc1' and member_uid = '00000000-0000-0000-0000-00000000000a') = 'owner',
  'creating a joint sim makes the owner a member of it');

-- --- inviting ---------------------------------------------------------------
select public.jp_invite('doc1', 'b-222');   -- punctuation is normalised away
select pg_temp.ok((select count(*) from public.jp_invitations
                    where doc_id = 'doc1' and writer_id = 'B222' and status = 'open') = 1,
                  'an invitation by Writer ID reaches the right account');

select public.jp_invite('doc1', 'NOSUCHID');
select pg_temp.ok((select count(*) from public.jp_invitations where doc_id = 'doc1') = 1,
                  'an unknown Writer ID is accepted silently and writes nothing');

-- A non-owner cannot invite.
select pg_temp.be('c');
do $$ begin
  perform public.jp_invite('doc1', 'A111');
  raise exception 'FAIL: a non-owner was allowed to invite';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
end $$;
select pg_temp.ok(true, 'a non-owner cannot invite to somebody else''s joint sim');

-- --- a non-member sees nothing ---------------------------------------------
select pg_temp.ok((select count(*) from public.jp_doc('doc1')) = 0,
                  'a non-member reading the doc gets no row at all');
select pg_temp.ok((select count(*) from public.jp_list()) = 0,
                  'a non-member does not see the sim in their list');

-- --- accepting --------------------------------------------------------------
select pg_temp.be('b');
select pg_temp.ok((select count(*) from public.jp_my_invites()) = 1,
                  'the invited writer sees their invitation');
select public.jp_accept_invite((select id from public.jp_my_invites() limit 1));
select pg_temp.ok((select count(*) from public.jp_list() where doc_id = 'doc1') = 1,
                  'after accepting, the sim appears in the member''s list');
select pg_temp.ok((select member_count from public.jp_list() where doc_id = 'doc1') = 2,
                  'the roster now holds two writers');

-- C is still nobody.
select pg_temp.be('c');
select pg_temp.ok((select count(*) from public.jp_doc('doc1')) = 0,
                  'an uninvited writer still cannot load the doc');

-- --- the lock ---------------------------------------------------------------
select pg_temp.be('a');
select pg_temp.ok((select got from public.jp_take_lock('doc1')),
                  'the first writer to ask gets the lock');

select pg_temp.be('b');
select pg_temp.ok(not (select got from public.jp_take_lock('doc1')),
                  'the second writer is refused while the lock is fresh');
select pg_temp.ok((select lock_wid from public.jp_list() where doc_id = 'doc1') = 'A111',
                  'and is told who is holding it, by Writer ID');

-- A saves; the version moves.
select pg_temp.be('a');
select pg_temp.ok(
  public.jp_save('doc1', (select version from public.jp_doc('doc1')),
                 '<div>one</div><div>two</div>', null, null, null) = 2,
  'the lock holder can save, and the version advances');

-- B cannot save while A holds it.
select pg_temp.be('b');
do $$ begin
  perform public.jp_save('doc1', 2, '<div>B was here</div>', null, null, null);
  raise exception 'FAIL: a non-holder was allowed to save';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if sqlerrm <> 'JP_LOCKED' then raise exception 'FAIL: wrong error %', sqlerrm; end if;
end $$;
select pg_temp.ok(true, 'a writer without the lock cannot save over the holder');

-- --- expiry, and the case the lock cannot catch -----------------------------
-- Pin the boundary rather than stepping miles over it: a lock just INSIDE the
-- window is still held, and one just outside it is not. Aging by half an hour
-- would pass whatever jp_lock_minutes() returned.
update public.jp_docs set locked_at = now() - make_interval(mins => public.jp_lock_minutes() - 1)
 where doc_id = 'doc1';
select pg_temp.be('b');
select pg_temp.ok(not (select got from public.jp_take_lock('doc1')),
                  'a lock inside the window is still the holder''s');

-- Now age it just past the limit. B may take it -- this is the handover.
update public.jp_docs set locked_at = now() - make_interval(mins => public.jp_lock_minutes() + 1)
 where doc_id = 'doc1';
select pg_temp.be('b');
select pg_temp.ok((select got from public.jp_take_lock('doc1')),
                  'an expired lock can be taken by the next writer');
select pg_temp.ok(public.jp_save('doc1', 2, '<div>B''s turn</div>', null, null, null) = 3,
                  'the new holder saves, and the version advances again');

-- THE DANGEROUS CASE. A's lock lapsed and A's browser never noticed. A is
-- holding version 2 and is about to save over B's work. The lock cannot stop
-- this -- A is not the holder any more, but if A's tab still believed it was,
-- only the version check stands between B's writing and oblivion.
select pg_temp.be('a');
do $$ begin
  perform public.jp_save('doc1', 2, '<div>A clobbers B</div>', null, null, null);
  raise exception 'FAIL: a stale save was applied';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if sqlerrm not in ('JP_STALE', 'JP_LOCKED') then
    raise exception 'FAIL: wrong error %', sqlerrm;
  end if;
end $$;
select pg_temp.ok(
  (select content from public.jp_doc('doc1')) = '<div>B''s turn</div>',
  'a lapsed writer cannot clobber the next holder''s work');

-- And with the lock genuinely free, a stale version is STILL refused.
select public.jp_release_lock('doc1');
select pg_temp.be('a');
do $$ begin
  perform public.jp_save('doc1', 2, '<div>A clobbers B</div>', null, null, null);
  raise exception 'FAIL: a stale save was applied with the lock free';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if sqlerrm <> 'JP_STALE' then raise exception 'FAIL: wrong error %', sqlerrm; end if;
end $$;
select pg_temp.ok(true, 'a stale version is refused even when nobody holds the lock');

-- --- the owner can break a stuck lock ---------------------------------------
select pg_temp.be('b');
select public.jp_take_lock('doc1');
select pg_temp.be('a');
select public.jp_release_lock('doc1');
select pg_temp.ok((select locked_by from public.jp_docs where doc_id = 'doc1') is null,
                  'the owner can break a lock somebody else is holding');

-- A member cannot break someone else's lock.
select pg_temp.be('a');
select public.jp_take_lock('doc1');
select pg_temp.be('b');
select public.jp_release_lock('doc1');
select pg_temp.ok((select locked_by from public.jp_docs where doc_id = 'doc1') is not null,
                  'a member cannot break the owner''s lock');

-- --- removal ----------------------------------------------------------------
-- Removing the lock holder must free the lock, or the sim is left held by
-- somebody who is no longer on it.
select pg_temp.be('a');
select public.jp_release_lock('doc1');
select pg_temp.be('b');
select public.jp_take_lock('doc1');
select pg_temp.be('a');
select public.jp_remove_member('doc1', '00000000-0000-0000-0000-00000000000b');
select pg_temp.ok((select locked_by from public.jp_docs where doc_id = 'doc1') is null,
                  'removing the lock holder frees the lock');
select pg_temp.be('b');
select pg_temp.ok((select count(*) from public.jp_list()) = 0,
                  'a removed member loses sight of the sim');

-- The owner cannot be removed from their own sim.
select pg_temp.be('a');
do $$ begin
  perform public.jp_remove_member('doc1', '00000000-0000-0000-0000-00000000000a');
  raise exception 'FAIL: the owner was removed from their own sim';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
end $$;
select pg_temp.ok(true, 'the owner cannot be removed from their own joint sim');

-- --- deletion transfers ownership rather than destroying the sim ------------
select pg_temp.be('a');
select public.jp_invite('doc1', 'B222');
select pg_temp.be('b');
select public.jp_accept_invite((select id from public.jp_my_invites() limit 1));
select pg_temp.be('a');
select public.jp_invite('doc1', 'C333');
select pg_temp.be('c');
select public.jp_accept_invite((select id from public.jp_my_invites() limit 1));

-- A solo joint sim -- nobody else on it -- goes with its owner as expected.
select pg_temp.be('a');
insert into public.jp_docs (doc_id, owner_uid, title)
  values ('solo', '00000000-0000-0000-0000-00000000000a', 'Nobody else');

update public.writers set deleted_at = now() - interval '49 hours'
 where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.ok(public.purge_expired_deletions() = 1, 'the expired account is purged');

select pg_temp.ok((select count(*) from public.jp_docs where doc_id = 'doc1') = 1,
                  'a joint sim with other members survives its owner leaving');
select pg_temp.ok(
  (select owner_uid from public.jp_docs where doc_id = 'doc1')
    = '00000000-0000-0000-0000-00000000000b',
  'ownership passes to the longest-standing remaining member');
select pg_temp.ok(
  (select role from public.jp_members
    where doc_id = 'doc1' and member_uid = '00000000-0000-0000-0000-00000000000b') = 'owner',
  'and that member is marked owner in the roster');
select pg_temp.ok((select count(*) from public.jp_docs where doc_id = 'solo') = 0,
                  'a joint sim with nobody else on it goes with its owner');

-- The new owner can actually own it.
select pg_temp.be('b');
select public.jp_remove_member('doc1', '00000000-0000-0000-0000-00000000000c');
select pg_temp.ok((select member_count from public.jp_list() where doc_id = 'doc1') = 1,
                  'the new owner can manage the roster');

-- --- RLS, tested as an ordinary writer -------------------------------------
-- Everything above ran as the superuser, which BYPASSES row level security --
-- so it proved the functions, not the policies. RLS is the actual boundary
-- (the client-side guards are cosmetic), so it gets tested from inside the
-- `authenticated` role, the way PostgREST reaches it.
reset role;
-- The deletion tests above purged writer A, deliberately. Rebuild the cast.
delete from public.jp_docs;
delete from public.writers;
delete from auth.users;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@lcars.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@lcars.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@lcars.local');
insert into public.writers (id, writer_id) values
  ('00000000-0000-0000-0000-00000000000a', 'A111'),
  ('00000000-0000-0000-0000-00000000000b', 'B222'),
  ('00000000-0000-0000-0000-00000000000c', 'C333');
select pg_temp.be('a');
insert into public.jp_docs (doc_id, owner_uid, title, content)
  values ('rls1', '00000000-0000-0000-0000-00000000000a', 'Policy check', 'secret');

set role authenticated;
select pg_temp.be('a');
select pg_temp.ok((select count(*) from public.jp_docs where doc_id = 'rls1') = 1,
                  'RLS: the owner can read their own joint sim directly');

select pg_temp.be('c');
select pg_temp.ok((select count(*) from public.jp_docs where doc_id = 'rls1') = 0,
                  'RLS: a non-member reading the table directly gets no row');

-- The important one: a member must NOT be able to PATCH the row directly,
-- because that would route straight past the lock and the version check.
reset role;
select pg_temp.be('a');
select public.jp_invite('rls1', 'C333');
select pg_temp.be('c');
select public.jp_accept_invite((select id from public.jp_my_invites() limit 1));

set role authenticated;
select pg_temp.be('c');
select pg_temp.ok((select count(*) from public.jp_docs where doc_id = 'rls1') = 1,
                  'RLS: a member can read the sim directly');
update public.jp_docs set content = 'member wrote this' where doc_id = 'rls1';
select pg_temp.ok((select content from public.jp_doc('rls1')) = 'secret',
                  'RLS: a member cannot PATCH the row past the lock and version check');

-- Nor can a member forge a roster entry or an invitation.
do $$ begin
  insert into public.jp_members (doc_id, member_uid, role)
       values ('rls1', '00000000-0000-0000-0000-00000000000b', 'writer');
  raise exception 'FAIL: a member inserted into the roster directly';
exception when insufficient_privilege then null;
  when others then if sqlerrm like 'FAIL:%' then raise; end if;
end $$;
select pg_temp.ok(true, 'RLS: nobody can add themselves or others to a roster directly');

do $$ begin
  insert into public.jp_invitations (doc_id, writer_id, invited_by)
       values ('rls1', 'B222', '00000000-0000-0000-0000-00000000000c');
  raise exception 'FAIL: an invitation was written directly';
exception when insufficient_privilege then null;
  when others then if sqlerrm like 'FAIL:%' then raise; end if;
end $$;
select pg_temp.ok(true, 'RLS: invitations can only be written by jp_invite()');

-- Leaving is the one roster change a member may make for themselves.
delete from public.jp_members
 where doc_id = 'rls1' and member_uid = '00000000-0000-0000-0000-00000000000c';
reset role;
select pg_temp.ok((select count(*) from public.jp_members
                    where doc_id = 'rls1'
                      and member_uid = '00000000-0000-0000-0000-00000000000c') = 0,
                  'RLS: a member can leave a joint sim themselves');

-- But cannot throw anybody else off it.
set role authenticated;
select pg_temp.be('c');
delete from public.jp_members
 where doc_id = 'rls1' and member_uid = '00000000-0000-0000-0000-00000000000a';
reset role;
select pg_temp.ok((select count(*) from public.jp_members
                    where doc_id = 'rls1'
                      and member_uid = '00000000-0000-0000-0000-00000000000a') = 1,
                  'RLS: a member cannot remove the owner from the roster');


-- ---------------------------------------------------------------------------
-- A share link on a joint sim
-- ---------------------------------------------------------------------------
-- shared_docs is keyed by doc_id and carries authors as a list precisely so a
-- joint sim can be shared once, by whoever gets there first, and managed by
-- everyone on it. The original policy asked only `auth.uid() = owner_uid`,
-- which made the row invisible to every other member: the dialog told them the
-- sim was not shared, and publishing it upserted onto a row they could not
-- update, so it failed with nothing useful to say.
reset role;
insert into public.jp_docs (doc_id, owner_uid, title, content)
  values ('rls2', '00000000-0000-0000-0000-00000000000a', 'Shared JP', 'text');
select pg_temp.be('a');
select public.jp_invite('rls2', 'B222');
select pg_temp.be('b');
select public.jp_accept_invite((select id from public.jp_my_invites() where doc_id = 'rls2' limit 1));

set role authenticated;
select pg_temp.be('a');
insert into public.shared_docs (doc_id, owner_uid, title, content)
  values ('rls2', '00000000-0000-0000-0000-00000000000a', 'Shared JP', 'text');
select pg_temp.ok((select count(*) from public.shared_docs where doc_id = 'rls2') = 1,
                  'RLS: the writer who publishes a joint sim sees their own share');

select pg_temp.be('b');
select pg_temp.ok((select count(*) from public.shared_docs where doc_id = 'rls2') = 1,
                  'RLS: every member of a joint sim can see its share link');
update public.shared_docs set content = 'republished by b' where doc_id = 'rls2';
reset role;
select pg_temp.ok((select content from public.shared_docs where doc_id = 'rls2') = 'republished by b',
                  'RLS: and can republish it, so the link stays one link');

-- A non-member still gets nothing, share or no share.
set role authenticated;
select pg_temp.be('c');
select pg_temp.ok((select count(*) from public.shared_docs where doc_id = 'rls2') = 0,
                  'RLS: somebody not on the joint sim sees no share row');

reset role;
\echo '--- all joint-post database checks passed ---'
