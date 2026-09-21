-- ---------------------------------------------------------------------------
-- MIGRATION 2026-09-21 : a share link on a joint sim belongs to everyone on it
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor.
--
-- ORDER DOES NOT MATTER for this one. The change is additive in both
-- directions:
--   * old build, new policy -- another member now SEES the share row where
--     before they saw none, which is what the dialog was always written to
--     handle;
--   * new build, old policy -- share links on a joint sim behave exactly as
--     they did before, which is to say badly, but no worse.
-- So it is safe before or after the deploy. The app went out first regardless.
--
-- SAFE TO RE-RUN, and safe to run out of order against a newer database: it
-- defines no functions, so it cannot put an older `create or replace` back over
-- a newer one. That is the trap noted in CLAUDE.md about standalone migration
-- files, and this one does not have it.
--
-- This is already in `supabase/schema.sql`; re-running that whole file has the
-- same effect and is equally safe.

-- ---------------------------------------------------------------------------
-- shared_docs, on a joint sim
-- ---------------------------------------------------------------------------
-- shared_docs is keyed by doc_id and carries `authors` as a list precisely so
-- a joint sim is shared once, as one sim, rather than once per writer. The
-- original policy asked only `auth.uid() = owner_uid`, which made the row
-- invisible to everyone else on the sim: their dialog said the sim was not
-- shared, and publishing it upserted onto a row they were not allowed to
-- update -- which failed with nothing they could act on.
--
-- Every member can now see the share, republish it and stop it: the same
-- rights they have over the sim itself.
--
-- owner_uid stays whoever published. It is the audit trail and the cascade,
-- not the permission.
--
-- Nothing changes for a solo sim: is_jp_member() is false for a doc_id that is
-- not a joint sim, so the policy reduces to exactly what it was.
--
-- is_jp_member() is `security definer` and is defined in schema.sql well above
-- this point. It has to be -- a policy on shared_docs that read jp_members
-- directly would be the recursion trap my_role() exists to solve.
drop policy if exists shared_docs_own on public.shared_docs;
create policy shared_docs_own on public.shared_docs
  for all using      (auth.uid() = owner_uid or public.is_jp_member(doc_id))
      with check (auth.uid() = owner_uid or public.is_jp_member(doc_id));
