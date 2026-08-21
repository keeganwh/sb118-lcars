# Session log — Joint Posts (ROADMAP session 5)

_2026-08-21. Supersedes `session_lcars_2026-08-joint-posts-brief.md`, which was
the plan going in. Read the platform-plan and views files first; this assumes
them. Built on `claude/joint-posts-gu3h9b`._

**Status: built and tested locally, NOT yet proven against real Supabase.** The
schema has not been applied to the live project. See "What is left" at the end.

---

## The four questions, as settled with the user

1. **Joint docs get their own table; solo docs stay in the payload blob.**
   Option B, not the full restructure. The user accepted the recommendation and
   explicitly framed it as "for NOW joint posts only go on a row, then later we
   can migrate all sims" — so A is *scheduled*, not rejected.
2. **A joint sim is read-only offline**, and says so in a banner rather than
   silently refusing. The user's own framing: "reflects how a shared Google Doc
   would function."
3. **A joint sim appears in every member's list**, marked JOINT.
4. **Account deletion transfers a joint sim** to its longest-standing remaining
   member. A joint sim with nobody else on it goes with its owner.

### What I got wrong first time, and the user corrected

I gave the A-vs-B trade-off as mostly a risk argument, and the user pushed back
asking what A's *upsides* and non-risk costs were. That was the right question
and the answer changed the framing: A is not merely "tidier", it fixes a real
and worsening problem — `saveToCloud()` POSTs the whole payload on every save,
so **the cost of saving one sentence scales with how much you have ever
written.** It also fixes two-tabs-of-your-own-account clobbering, and it is the
reason a share link has to be a snapshot copy.

The other thing I under-sold: A can be made safe with a **staged** rollout
(add table → dual-write → flip reads behind a flag → stop writing the blob),
each step reversible. My original "one irreversible cutover I cannot verify" was
a false constraint. That plan is now written into ROADMAP.

**If A comes up again: the answer is not "too risky", it is "staged, and the
hard part is offline."** Per-doc sync needs a real outbox — dirty flags, a
replay queue, and a policy for a queued edit that conflicts with a newer server
version. That is the piece to design first.

---

## Architecture as built

`jp_docs` (one row per joint sim, keyed by the same `doc_id` the app already
uses, matching `shared_docs`), `jp_members`, `jp_invitations`. All the
privileged work is `security definer` functions, following `my_role()`.

### Three things worth not rediscovering

- **The version check, not the lock, is what makes writes safe.** The dangerous
  case is not two people typing — the lock covers that. It is one writer whose
  turn quietly expired, whose browser has not noticed, saving over the next
  holder. A lock cannot catch that. `jp_save()` takes the version the client
  loaded and refuses anything else. Both test suites exercise exactly this.
- **The recursion trap is real and the schema already solved it twice.** A
  policy on `jp_docs` that reads `jp_members`, whose policy reads `jp_docs`,
  fails at run time as infinite recursion. `is_jp_member()` /`is_jp_owner()` are
  `security definer` for that reason. Do not invent a second pattern.
- **Members deliberately have no direct UPDATE on `jp_docs`.** A member who
  could PATCH the row would route straight past the lock and the version check.
  Content changes go through `jp_save()` only; the owner keeps a direct update
  path for non-content things. There is an RLS test for this.

### Where the doc lives on the client, and the three-branch rule

A joint sim is kept **in `S.docs` alongside the solo ones**, marked
`docType:'joint'` — *not* in a second collection. That way every existing pass
over `S.docs` (nav, dashboard, manifest, character detection, search) works on
joint sims unchanged. The branch is confined to three places and must stay there:

1. `cloudPayload()` strips joint sims, so they never reach the blob;
2. `adoptCloudState()` carries them back, since the server copy has no idea they
   exist — without this, adopting a cloud copy silently drops every joint sim;
3. `flushSave()` routes them to `jpSave()` rather than `schedSync()`.

**A fourth branch is the signal this arrangement has stopped paying.**

### Presence is polling, and that was a decision

The roadmap said "via Supabase Realtime". Realtime is a Phoenix-channel
WebSocket protocol normally reached through `supabase-js` — no SDK, no bundler
and no npm here, deliberately, because that is what keeps the one-file offline
download working. Polling `jp_list()` every 8 seconds while a joint sim is open
is ~20 lines and no new failure mode. **Do not add `supabase-js` for latency
PBEM does not need.**

---

## Testing — and the harness that is now worth keeping

The sandbox cannot reach Supabase, but it turned out **Postgres 16 is installed
locally**, which the brief did not know. That changed the testing story a lot.

- `supabase/test/run.sh` — stands up a throwaway Postgres, stubs the
  Supabase-only bits (`auth.users`, `auth.uid()` as a session GUC, `storage`),
  applies `schema.sql` **twice** (it must be re-runnable), then runs 38 checks:
  the lock, expiry, the stale-write refusal, the ownership transfer, and the RLS
  policies from inside the `authenticated` role.
  **The RLS half matters: the first pass ran as superuser, which bypasses RLS
  entirely — it proved the functions and nothing about the policies.**
- `test/jp_browser.js` — two browser contexts, two Writer IDs, one shared mock
  of `jp_docs` that keeps state between them. 23 checks. A single context proves
  nothing about clobbering, which is the whole feature.

Both are cheap to run and were run after every change. Neither touches real
Supabase.

---

## What is left, in order

1. **Deploy the app, THEN apply the schema.** Not the other way round. New code
   tolerates columns it does not use; old code does not tolerate columns that
   have appeared or vanished. This bit the share-links session.
2. **Exercise it with two real accounts.** The user is the only route to this
   and it has found real bugs every session. Budget a round.
3. **Drop the rollout gate.** `jpCanCreate()` limits *starting* a joint sim to
   super admins; anyone invited can already join and write. Lifting it is making
   that function return true, and deleting the roadmap paragraph.

Deferred items — per-member filing, the missing notification on transfer or
removal, no way back to solo, per-writer snapshots on a shared sim, untested
share links on a joint sim — are all listed in ROADMAP under "the follow-ups it
deliberately left".

## Housekeeping done this session

Thirteen finished `claude/*` branches were retired. Five divergent ones
(pre-platform-shift) were preserved first as `archive/*` branches — **tag pushes
are blocked with a 403 in this environment, branch pushes are not**, which is
why they are branches rather than tags. The user deleted the originals; branch
deletion is blocked by the sandbox's permission classifier.
