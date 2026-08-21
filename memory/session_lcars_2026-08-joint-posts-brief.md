# Brief — Joint Posts (ROADMAP "Next priority")

_Written 2026-08-21 at the end of the share-links session. Read
`session_lcars_2026-08-platform-plan.md` and `session_lcars_2026-08-views.md`
first; this assumes them. The share-links work that just shipped is described in
ROADMAP Session 4 — read that too, because this feature inherits two of its
decisions._

**Everything before this is shipped and verified live**: accounts, sync, linking,
recovery, deletion, roles, the reset queue, the admin panel, the writer roster,
and read-only share links. Nothing is half-finished behind you.

---

## The goal, from ROADMAP

Turn-based joint sims with live presence. Invite by Writer ID, accept, **one
soft edit lock at a time**, others see "X is writing…". Tables `jp_members`,
`jp_lock`, `invitations`; docs gain `docType`; RLS widens to "own rows OR rows
you're a member of".

_Done when: two browsers with two Writer IDs can invite, accept and hand the
lock back and forth without clobbering each other, and a non-member cannot load
the doc._

**Explicitly NOT building: simultaneous typing.** CRDT/OT on a hand-rolled
`contenteditable` is the largest and riskiest work available, for something PBEM
does not need. This was settled and should not be reopened.

---

## Two findings that change the plan

I told the user during the share-links session that Joint Posts "opens with the
docs restructure". Having read the sync path properly, that is half right and
half wrong. Both corrections matter enough to lead with.

### 1. The blob is not just a storage choice — it actively forbids sharing a doc

`saveToCloud()` (`lcars.js` ~1836) POSTs **the entire `S` payload** — every doc,
mission, scene, character and setting — to one row, debounced at 2–5 seconds via
`schedSync()`. `cloudPayload()` strips only snapshots.

So if a joint sim lived in the payload, two writers editing it would each be
writing their own **whole document set** every few seconds. Last write wins, and
it wins over *everything*, not just the shared sim. There is no merge, no field
granularity, nothing to reconcile against. A joint doc in the blob is not
"racy" — it is unbuildable.

**A joint doc must be its own row.** That part is not negotiable.

### 2. But you do NOT have to migrate every doc to get there

This is where I was wrong. The full restructure — all docs out of the blob into
a `docs` table — drags in the sync path, the reconcile prompt, offline mode,
snapshots, and a data migration for every existing writer. It is the largest and
riskiest change available, and the sandbox cannot reach Supabase, so the user is
the only verification route for all of it at once.

**Recommended: joint docs live in their own table from day one; solo docs stay
in the payload.** The dashboard reads two sources and merges them for display.

| | Move everything (A) | Joint docs only (B) |
|---|---|---|
| Migration of existing data | every writer | none |
| Sync path rewritten | yes | no — untouched for solo docs |
| Offline mode | must be redesigned | unchanged for solo docs |
| Reconcile prompt | must be redesigned | unchanged |
| Permanent cost | none | two code paths for "a doc" |
| Can ship in one session | no | yes |

B's cost is real and should be named: `S.docs[id]` stops being the only way to
reach a doc, and every place that iterates docs needs to know which kind it has.
Keep that surface small — one accessor that returns a doc regardless of where it
lives, and one that lists them — rather than letting the `if` spread.

If the full restructure is ever wanted, B is a step towards it, not away from
it: the table, the RLS helpers and the membership model are exactly what A needs.

---

## Settle these with the user before writing code

The user wants methods argued through first, with costs named, **in plain text —
never in a modal** (hard rule 7 in `CLAUDE.md`).

1. **B or A?** Recommend B above. This is the session-shaping decision.
2. **What happens to a joint sim offline?** Recommend **read-only offline**. A
   joint doc's whole safety model is the lock, and a lock cannot be held without
   the server. Editing offline and reconciling later is exactly the clobbering
   the lock exists to prevent. Say so in the UI rather than silently refusing.
3. **Does a JP appear in the owner's sim list only, or everyone's?** Recommend
   everyone's, marked as joint, since a member who cannot find it cannot write
   it.
4. **What happens when the owner deletes their account?** The 48-hour deletion
   already cascades from `auth.users`. A joint sim with other members should
   probably not evaporate — decide deliberately, because the cascade will do it
   by default if nobody says otherwise.

---

## Architecture

### Tables

`jp_docs` — one row per joint sim. Keyed by **`doc_id`** (text), matching
`shared_docs`, so a joint sim can be shared read-only with no special casing.
Holds title, content, status, the mission/scene it belongs to, `updated_at`, and
a monotonic **`version` integer** (see the lock section).

`jp_members` — `(doc_id, member_uid, role, joined_at)`. `role` is `owner` or
`writer`; owner can remove members and delete the sim.

`jp_invitations` — `(id, doc_id, writer_id, invited_by, status, created_at)`.
Keyed by **Writer ID text, not uid**, because the inviter cannot look up someone
else's uid (see below).

### RLS, and the recursion trap

The policy is "own rows OR rows you're a member of". Written naively, the policy
on `jp_docs` reads `jp_members`, whose own policy reads `jp_docs`, and Postgres
fails the query at run time as infinite recursion.

**The schema already solves this exact problem twice** — see `my_role()` and
`is_moderator()` in `supabase/schema.sql`, and the comment above them explaining
it. Do the same: a `security definer` `is_jp_member(p_doc_id text)` that reads
membership with RLS bypassed and answers only about `auth.uid()`. Policies call
that. Do not invent a second pattern.

### Inviting by Writer ID needs a function

`writers` is `auth.uid() = id` — a writer cannot read anyone else's row, so the
client **cannot** resolve a Writer ID to a uid. Invitation must be a
`security definer` function (`jp_invite(p_doc_id, p_writer_id)`) that does the
lookup server-side, checks the caller owns the doc, and writes the invitation.

Mirror `request_pin_reset()`'s discipline while you are there: an unknown Writer
ID should not be distinguishable from a known one, or the function becomes a way
to enumerate which Writer IDs hold LCARS accounts.

### The lock

`jp_docs.locked_by uuid`, `locked_at timestamptz`. Three things it must do that
a naive implementation will not:

1. **Expire.** Someone will close their laptop holding the lock. A lock older
   than N minutes is free to take. Enforce the expiry **in the database**, in
   the take-lock function — a client-side timer is not a lock.
2. **Reject stale writes.** The dangerous case is not two people typing; it is
   one person whose lock lapsed, whose browser has not noticed, saving over the
   next holder's work. This is why `version` exists: a save sends the version it
   loaded, and the update is `where version = $expected`. Zero rows updated means
   "you are stale" — reload rather than overwrite. Do **not** rely on the lock
   alone to make writes safe.
3. **Be releasable by the owner.** If a lock is stuck and the holder is asleep,
   the sim owner needs a way out that does not involve waiting.

### Presence — and a constraint the roadmap does not mention

**The roadmap says "via Supabase Realtime". That is not free here.** Supabase
Realtime is a WebSocket protocol (Phoenix channels) normally reached through
`supabase-js`, and this project has **no SDK, no bundler and no npm** — that is
deliberate and it is what keeps the one-file offline download working
(`api/download.js`). There is no WebSocket code in `lcars.js` today; I checked.

Two honest options:

- **Poll.** Every 5–10 seconds while a joint sim is open, read the lock row.
  Perhaps 20 lines, no new dependency, no new failure mode, and PBEM is measured
  in hours — nobody needs sub-second presence. **Recommended.**
- **Hand-roll the Realtime WebSocket client.** Possible, and a meaningful amount
  of protocol work to maintain forever, for latency this feature does not need.

Do not add `supabase-js` to get Realtime. That trade — a bundler and the offline
download — is much larger than the feature.

---

## Things that will bite

- **`stripFormattingHtml()` runs on open, on paste and on applying source view.**
  Anything it strips is removed *repeatedly*. If joint sims gain any structural
  markup, it will appear to work and then quietly revert.
- **A mode restriction lives in more than one place** — the CSS, the command
  guard, and the keyboard handler. If a JP disables editing for non-holders,
  all three need it, or the button will grey out while the shortcut still writes.
- **Boot raises prompts on a timer, and they fight.** The reconcile question, a
  pending deletion, a temporary PIN and the Delta Prime intro have collided three
  times. A JP invitation prompt is a fourth — check `#mo` is hidden before
  painting.
- **Never splice a file between two boundaries without reading what lies
  between.** Two whole modules have been silently deleted this way, both parsing
  cleanly afterwards. Diff the function inventory after any structural edit; the
  command is in `CLAUDE.md`.
- **Responsive rules go in the one `RESPONSIVE` section at the foot of
  `lcars.css`**, after the skin overrides, or Delta Prime silently outranks them.
- **Deploy before running schema, not after.** Learned the hard way this session:
  the schema was applied while the browser still had the previous build, and the
  app wrote a column the database had just dropped. New app code tolerates old
  columns; old app code does not tolerate their absence. There is now a friendly
  message for `PGRST204` in `publishShare`, but the ordering is the real fix.

## What you can reuse

- `lcars-render.js` — the shared render pass and `lrExpiresIn`. Already loaded by
  both `LCARS.html` and `share.html`; a JP viewer gets it free.
- `shared_docs` is keyed by `doc_id` and stores `authors` as a **list**
  specifically so a joint sim can be shared with several bylines and no schema
  change. That was built ahead for this.
- The `security definer` pattern for everything the anon key cannot do, and the
  "table privileges are the outer gate, the policy the inner one" discipline in
  `supabase/schema.sql`.

## Testing

- **The sandbox blocks every outbound host**, so all testing is against an
  intercepted Supabase. The user is the only route to real verification, and it
  has found real bugs every session. Budget a round.
- Playwright is available; Chromium is at `/opt/pw-browsers/chromium`. Serve the
  folder with `python3 -m http.server 8129 -d .` and drive the flow, listening
  for `pageerror`.
- **Two browser contexts with two Writer IDs is the actual test** for this
  feature, the way a logged-out private window was the actual test for share
  links. A single context proves nothing about clobbering.
- Worth building once and keeping: a mock that holds `jp_docs` state across two
  contexts, so lock hand-off can be exercised without a server.

## Changelog rules, which are strict here

Every code change to `lcars.js` / `lcars.css` / `LCARS.html` appends to the
`pending` entry in `VERSIONS` **in the same commit**, and `CHANGELOG.md` mirrors
it. Single-quoted strings, trailing commas, written from a Python file rather
than a shell heredoc. Both were verified in sync at the end of this session —
68 entries each, matching exactly — so any drift from here is new.
