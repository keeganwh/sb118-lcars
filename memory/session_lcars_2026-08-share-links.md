# Session log — read-only share links (ROADMAP session 4)

_2026-08-21. Branch `claude/charming-ptolemy-4phvvv`, merged to `main`.
Supersedes `session_lcars_2026-08-share-links-brief.md`, which was the plan going
in; this is what was actually built and why._

## What shipped

A `/s/<token>` route served by `share.html` — no auth, no editor, no sync, no
`localStorage` beyond a theme preference. Sharing is done from **Sim Details →
Share Link**. Verified live by the user on desktop and phone.

New files: `lcars-render.js` (shared render pass, loaded by both pages),
`share.html`, `share.js`. `api/download.js` and `vercel.json` updated for the new
files — a fourth and fifth shared file means updating both, including the
cache-header list, or a marker fix never reaches anyone.

## Decisions, with the reasoning

**A share is a snapshot, not a live window.** The user chose this over live, and
it turned out to be load-bearing rather than cosmetic: because the shared copy is
a *copy*, it does not care where the live doc lives, so the whole feature is
insulated from the docs-out-of-the-blob restructure that Joint Posts forces. Had
it been live, the read path would have needed a function reaching into
`state.payload` on every anonymous request — and that function would be thrown
away by the restructure.

**Why a copy at all.** Every doc lives inside one `state.payload` jsonb blob per
writer, under `auth.uid() = writer_uid`. A policy on that row is all-or-nothing
over the whole payload: grant a stranger one sim and you have granted them every
sim, character and setting that writer owns. A `shared_docs` row holds only what
was deliberately published.

**No anon select policy.** `using (true)` sounds right until you notice it makes
every *token* readable too — one request returns a key to every shared sim on the
service. Anonymous reads go through `get_shared_doc(token)`, one row at a time.
Unknown, revoked and expired tokens return the same nothing, so a stale link
cannot be used to work out whether a sim ever existed.

**Expiry in the read path, not a cleanup job**, so a lapsed link dies the moment
it lapses. `purge_expired_shares()` is housekeeping only and rides along on a
signed-in boot, like `purge_expired_deletions()`.

**Keyed by `doc_id`, `authors` as a list.** Both deliberately forward-looking:
the table survives docs becoming rows of their own, and a Joint Post has several
bylines. Migrating a text column to an array after real links exist in the wild
is the kind of change that breaks them.

## The mistake worth remembering

**I used the editor's render pass for the reader.** `applyMarkers` tints action,
comms and thought markers so a *writer* can spot them mid-sim. Shared sims came
out covered in highlight blocks, with locations and OOC unformatted — and tinted
a dim grey I had invented, which the app has never done to them.

The right pass already existed and I had walked past it: **the editor's `copy`
handler**. That is the definition of "what a reader sees" — locations bold, OOC
and thoughts italic, marker punctuation plain, every marker span unwrapped, and
**no colour of any kind**, character colours included (copy-out keeps only
`margin-left`).

`lrToReadingHtml()` in `lcars-render.js` now does exactly that, and it runs
*through* `lrApplyMarkers` to find the markers rather than re-implementing the
patterns — so the editor pass and the reading pass cannot drift apart.

**The general lesson:** when adding a second surface for existing content, find
where the app already answers "what does this look like outside the editor"
before writing a new answer. Copy-out, print and export are all that question.

## Other user-driven corrections

- **Spacing.** `#body div{margin:0 0 1em}` double-spaced everything, because sims
  separate paragraphs with **empty divs of their own**. Block margins are zero,
  exactly as `#editor` has them.
- **Light by default**, not the reader's system setting. A shared sim is a
  document someone was sent to read; the dark chrome is for the writer. Toggle
  remembered per browser.
- **Header compaction.** Title smaller, and writer · Writer ID · status · date on
  one wrapped line rather than four stacked rows.
- **Relative expiry, never a clock time.** An absolute time renders in the
  reader's timezone, so "expires 2:30 PM" meant different moments to the writer
  and the reader. `lrExpiresIn()` lives in `lcars-render.js` so the writer's
  dialog and the reader's page cannot word or round it differently. It ticks once
  a minute — a frozen countdown looks live and is not.

## Security

Content is **sanitised on the read side**, allow-list not block-list. Not at
publish time: a row could be written straight to PostgREST with a session and a
crafted payload, so the guard has to be where it cannot be skipped. Style
survives only as `margin-left`, matching copy-out exactly, which means colour
cannot re-enter that way either. The page carries a CSP, which is why its script
is a file rather than inline. Six hostile payloads (script, onclick, img onerror,
`javascript:` href, iframe, `url()` in style) verified inert in every render pass.

## Landmine found this session

**Deploy before running the schema, never after.** The user applied the migration
while the browser still held the previous build; the app wrote a column the
database had just dropped, and PostgREST's raw message ("Could not find the
'char_colors' column … in the schema cache") told a writer nothing actionable.
New app code tolerates old columns; old app code does not tolerate their absence.
`publishShare` now translates `PGRST204` into "reload the page", but the ordering
is the real fix.

## State at merge

`CHANGELOG.md` and the `VERSIONS` array verified in sync — 68 pending entries
each, matching exactly, after normalising three straight apostrophes in the
Markdown. Worth re-checking on any future merge; it has drifted before.

`APP_VERSION` is untouched at 4.23. All of this is pending and awaiting the next
bump, which stays the user's call.
