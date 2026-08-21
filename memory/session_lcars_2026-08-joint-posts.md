# Session log — Joint Posts (ROADMAP session 5)

_2026-08-21. Supersedes `session_lcars_2026-08-joint-posts-brief.md`, which was
the plan going in. Read the platform-plan and views files first; this assumes
them. Built on `claude/joint-posts-gu3h9b`._

**Status: SHIPPED in v4.24, 2026-08-21.** Applied to the live Supabase project
and used in earnest by two writers over three rounds of feedback. Everything
below the line held up; what real use broke is at the end, and it is the most
useful part of this file.

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

---

## What real use broke, and what it taught

Three rounds of feedback on a feature that had 61 passing checks. Every bug
below was in a gap the tests could not see, not in something they got wrong.

### The bugs, and the shape they share

1. **Handing back inside the save debounce wiped the turn.** `doc.content` is
   only refreshed by `flushSave()`, so the hand-off sent the older, often empty
   version. Worst on a short first line — the exact case a writer tries first.
2. **The poll replaced unsaved text on screen** whenever this browser was not
   the lock holder. That is precisely the writer whose turn lapsed mid-sentence.
   The fix needed a subtlety: a REFUSED save still updates `doc.content`
   locally, so "editor differs from content" is not the question. Track what the
   SERVER has confirmed (`jpSavedContent`).
3. **The hand-off undid itself.** Releasing flushes the editor, which re-armed
   the debounced save, which fired two seconds later — and `jp_save()` claims the
   turn for whoever saves.
4. **The reconcile prompt fired on every single load.** Joint sims are stripped
   from the payload but were still counted locally, so the browser looked
   permanently ahead of its own account. Choosing "use my account's copy" could
   not settle it, because joint sims are deliberately carried across an adopt.
5. **`jpApplyRow` replaced the doc object in `S.docs`.** Anything holding a
   reference across an await or an open dialog was left mutating an orphan —
   which is why filing a joint sim updated Sim Details but not the sim list.
   **Fixed by mutating in place; do not reintroduce the replacement.**
6. **A joint sim could not be deleted.** `delDoc` only removed `S.docs[id]`, so
   the shared row survived and the next refresh brought it back. (`delDoc` also
   never called `schedSync()` — an ordinary sim's deletion sat in localStorage
   while the account still held it. Same shape, one layer down.)
7. **The owner sorted to the BOTTOM of the roster.** `order by role desc` sorts
   text, and 'writer' follows 'owner'.

**The shared shape: a joint sim is the same object as a solo sim in `S.docs`,
so every function that already handled "a doc" silently handled it wrong.** The
three-branch rule (`cloudPayload`, `adoptCloudState`, `flushSave`) was right
about where joint sims differ in the SYNC path, and wrong to imply nothing else
needed to know. `delDoc`, the reconcile count and `jpApplyRow`'s object identity
were all outside those three and all broken. **When touching anything that
iterates or removes docs, ask what it does to a joint one.**

### What the tests could not see, and now can

- **The database harness only ever built a database FROM SCRATCH.** That cannot
  see the failure that matters — applying `schema.sql` to a database that has
  already run an earlier version, which is every real database. `run.sh` now
  replays each earlier version individually, from clean, with the current file
  on top. *Individually* matters: replaying them in sequence leaves the newest
  prior already at the current shape, so the upgrade under test is a no-op and
  the check passes while proving nothing.
- **`create or replace` cannot change a function's OUT parameters**, and
  `drop function if exists f();` only matches that one exact signature.
  `jp_drop_overloads()` clears every overload by name; use it before any
  redefinition whose shape may change.
- **The test runner was piping schema errors to `/dev/null`.** A schema that
  would not apply looked exactly like one that did. It fails loudly now, and
  caught duplicate `jp_list`/`jp_doc`/`jp_roster` definitions the moment it did.
- **Writing each reported symptom down as a test found a bug the user had not
  hit yet** (number 2 above). Worth doing every time rather than fixing
  directly.

### One false alarm worth recognising again

`cannot change return type of existing function`, three times over, is Postgres
refusing a **downgrade** — an older copy of `schema.sql` run over a database
already holding a newer one. Nothing is damaged; the newer functions are left
intact. It is alarming and the cause is not obvious, so it is noted in
`supabase/README.md` too.

### Decisions real use changed

- **Filing is per writer**, in their own blob, and a new member is always ASKED
  where to file — not guessed from the owner's mission names. Guessing is right
  often enough to be trusted and wrong often enough to misfile quietly.
- **Auto Format settles locally.** Bold names is the only pass baked into stored
  HTML (locations, OOC and thoughts are CSS classes driven by each reader's
  prefs), so it is re-run on load to the local reader's setting.
- **Deleting a joint sim is two actions**: the owner destroys it for everyone
  and is told so; anybody else is leaving a sim that carries on.
- **The turn expiry is 5 minutes, not 15** — safe only because saving renews the
  turn and the app autosaves seconds after a keystroke, so the clock measures
  genuine idleness.
