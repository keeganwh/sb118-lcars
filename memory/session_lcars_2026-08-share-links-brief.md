# Brief — read-only share links (ROADMAP session 4)

_Written 2026-08-20 at the end of the roles/admin-panel session, for whoever
picks this up next. Read `session_lcars_2026-08-platform-plan.md` and
`session_lcars_2026-08-views.md` first; this brief assumes them._

**Everything before this is shipped and verified live** — accounts, sync,
linking, recovery, deletion, roles, the reset queue, the admin panel and the
writer roster. Nothing is half-finished behind you.

## The goal, from ROADMAP

`share_token` on a doc plus a `/s/<token>` route served by `share.html` — a
minimal page with no auth and no editor, so a share link does not drag the whole
application down with it. **Sims only; scenes are explicitly out of scope.**
Responsive from the start, because these will be opened on phones constantly.

_Done when: a share URL opens in a logged-out private window, renders the sim,
and nothing is editable._

`writers.display_name` already exists and is set from Settings, but nothing
shows it to anyone yet. A share link reading "by <display name>" rather than a
Writer ID is the first surface that could.

## Settle these with the user before writing code

The user wants the method argued through first, with costs named. Two real
questions here, and one is a design decision only they can make.

1. **Is a share link live, or a snapshot?** This is the important one. If it is
   live, every keystroke you save becomes publicly visible immediately — share
   a draft, keep writing, and strangers watch it change. If it is a snapshot,
   the link shows the sim as it was when shared, and re-sharing updates it.
   Snapshot is the safer default and matches how people think about "share this
   post"; live is less to explain. **Ask.**
2. **Does revoking need to be obvious?** A token that cannot be turned off is a
   permanent public URL. Suggest: the doc's share panel shows the link, a copy
   button, and "Stop sharing", which nulls the token. Cheap to build, and the
   only protection anyone has if a link escapes.

## The architectural problem — read this before designing anything

**Docs are not rows.** The entire LCARS payload — every doc, mission, scene and
character — lives in a single `jsonb` blob: `state.payload`, one row per writer,
keyed `writer_uid`. RLS on that row is `auth.uid() = writer_uid`.

That means **there is no way to grant a stranger access to one sim by writing a
policy.** A policy on `state` is all-or-nothing over the whole payload — grant
it and you have published every sim that writer owns, plus their characters and
their settings. This is the single biggest constraint on the session and it is
not obvious from the roadmap entry.

Three ways out, in the order I would consider them:

**A. `security definer` function returning exactly one doc.**
`get_shared_doc(token)`, granted to `anon`, which finds the payload holding a
doc with that `share_token` and returns only that doc's fields plus the owner's
`display_name`. One source of truth, no duplication, revocation is instant
(null the token and the function stops finding it). Costs: it scans `state`
rows with `jsonb_each` per request — fine at this scale, and indexable later if
it ever is not. This follows the pattern the whole account layer already uses,
and I would start here.

**B. A `shared_docs` table holding a published copy.** Sharing writes the doc's
HTML into its own row; RLS is a trivial `using (true)` on a table containing
only things deliberately published. Cleanest possible read path and no chance
of leaking a neighbouring doc. Costs: the content exists twice and has to be
kept in step — which is *free* if the answer to question 1 is "snapshot",
because a snapshot is exactly a copy taken at share time. **If the user picks
snapshot, B is probably better than A.**

**C. Restructure docs into their own table.** The right long-term shape and far
too large for this session. Not now.

## share.html, and a trap worth designing around

The page must be minimal — that is the whole point of it being separate. But a
sim is not plain HTML: `doc.content` is stored with markers **stripped**, and
the display pass applies them. Rendering a sim faithfully needs `applyMarkers()`
and `applyCharColors()` (`lcars.js:3185` and `:4679`), and the marker CSS.

So there is a fork:

- Pull in `lcars.js` — trivial, and drags 7,700 lines into a page whose selling
  point is that it does not.
- Copy the two functions into `share.js` — small, and **guarantees the two
  renderers drift apart.** The next marker change will be made in one and not
  the other, and nobody will notice until a shared sim renders wrongly.
- **Extract the render pass into `lcars-render.js`, loaded by both.** No build
  step, no bundler, just another `<script>` — consistent with the project's
  zero-dependency rule. This is the one I would take, and doing it *first*, as
  its own commit with the app still working, is cheaper than retrofitting it.

`api/download.js` re-inlines the three files into one offline `LCARS.html`; a
fourth file means updating it. Check that in the same commit.

## Mechanics

- **Token:** generate in the database, not the client. Long and URL-safe;
  `encode(extensions.gen_random_bytes(16), 'hex')` is fine. Never derive it from
  the doc id.
- **Route:** `/s/<token>` needs a `vercel.json` rewrite to `share.html`. Note
  the existing rewrites are exact paths — this one needs a wildcard segment.
  The app's own `routeContext()` (`lcars.js`, ROUTING section) returns `null`
  for any unrecognised deep path, so `/s/...` will not confuse the main app.
- **GitHub Pages has no rewrites**, so share links only work on Vercel. Fine —
  Pages is a forwarding notice now — but do not let the app offer a share URL
  when running from Pages or from a file.
- **Academy sims** have their own formatting rules (`isAcademyDoc()`); whatever
  the viewer does must respect them or a shared Academy sim will render with
  formatting the mode exists to forbid.
- **What to show:** title, the sim body, and "by <display name>" if set. Decide
  deliberately whether posted date and mission/scene names go too — they are
  more context than some people will expect to publish.

## Carried-forward landmines

- **The sandbox blocks every outbound host**, so all testing is against an
  intercepted Supabase. The user is the only route to real verification, and it
  has found real bugs every session. Budget a test round.
- **Rebuild the test harness** in the scratchpad — `run.sh`, `lib.js`,
  `smoke.js` with the function-presence list. It earns its keep every time; it
  found a genuine overlay bug last session. Details in the session-3 file.
- **Never splice a file between two boundaries without reading what lies
  between.** Two whole modules have been silently deleted this way, both parsing
  cleanly afterwards. Diff the function inventory after any structural edit —
  the command is in `CLAUDE.md`.
- **Responsive rules go in the one `RESPONSIVE` section at the foot of
  `lcars.css`**, after the skin overrides, or Delta Prime silently outranks
  them. Breakpoint 820px. `share.html` will need its own rules there — and
  since these get opened on phones constantly, build it responsive from the
  start rather than bolting it on.
- **`localStorage` is per-origin**, so every Vercel preview URL is a fresh
  browser as far as data is concerned.
- **A logged-out private window is the actual test.** Anything else is signed
  in as you and proves nothing about what a stranger sees.

## Changelog rules, which are strict here

Every code change to `lcars.js` / `lcars.css` / `LCARS.html` appends to the
`pending` entry in `VERSIONS` **in the same commit**, and `CHANGELOG.md` mirrors
it. Single-quoted strings, trailing commas, write them from a Python file not a
shell heredoc. Main drifted on the mirror last time — entries reached `VERSIONS`
but not `CHANGELOG.md` — so check both when merging.
