# Roadmap restructure — 2026-08-24

_No code changed. This session restructured `ROADMAP.md` and the supporting docs. Read it before proposing a change to how work is organised, or before re-opening any decision listed at the bottom._

## What changed

The roadmap was a flat list ordered by loose priority, with items accumulating in "Next priority" and "Low priority" buckets. It now has three layers:

**1. Categories.** Every item is a New Component, a Component Revision, an External Connection, a Future Integration, or Testing. The point is not tidiness — it is that "is this a revision or a new thing" turned out to be the question that settled several arguments about what to build.

**2. A points score.** +3 fixing something broken now; +3 removing something we don't want; +2 a revision to something we have; +2 closes a gap or loop in the design; +2 foundational to other items; −1 costly; −2 marked for testing; −2 a future integration.

**3. Batches, grouped by code locality.** This is the substantive change. Work is bundled by which functions, view or schema migration it touches, because the expensive part of a session here is loading context on a subsystem, not typing the change. Batches are ordered by their highest-scoring member, and the user reprioritises freely.

## Why batching by locality rather than by priority

Three concrete savings drove it:

- **Batch 1** fixes alias detection *and* deletes half the character record. Both touch `S.characters` / `getAllNamesForChar` and the two detection passes. Split, you load the same code twice and the removal can silently undo the fix.
- **Batch 4** reorganises the sim details panel *and* makes the workspace responsive. Split, you lay the panel out twice.
- **Batch 5** adds the bug-report tool *and* the admin usage overview. Both need a new table, a new `security definer` function and a panel in `#view-admin` — **one schema migration instead of two**, which matters because migrations here carry a deploy-ordering rule.

## Decisions made this session

- **The single-file offline download is frozen at v4.24.** It stops absorbing features rather than being contorted to carry server-dependent ones. A purpose-built simplified "LCARS Lite" is the preferred future answer over a bigger inliner. **Consequence worth noting: this settles the build-step question that was gating real-time writing.** A bundler no longer costs the one-file copy, because the one-file copy has stopped growing. The roadmap previously wanted that question opened as a session-blocking prompt; it no longer is.
- **The character wiki import is scrapped**, along with the service record and ribbon data it would have filled. SB118 HQ already tracks character data; duplicating it creates redundancy that makes a later integration harder. This is the first decision made explicitly on HQ's behalf, and it is the template for others.
- **Whole-sim wikitext export is dropped**, replaced by "select a portion, export as a quote with a citation" — and that is itself blocked on the sim archive link existing. People should link to the archive rather than copying whole sims onto the wiki.
- **Real-time writing is a revision to Joint Posts, not a new component.** Rescored to +5 by the user (+2 revision, +2 closes a loop, +2 foundational, −1 cost).
- **The positioning & pitch document is a parallel process**, not a batch. User-triggered, like a version bump.

## A bug found while reviewing, not yet fixed

**Alias detection registers aliases in two places and both filter the same wrong way.** `detectChars` (~line 3601) and `applyNameBold` (~line 4567) each build their special-alias list as `if (alias && /[\s.]/.test(alias))` — **only aliases containing a space or a period are registered.** A single-word alias never enters that pass and falls through to `CREX`, which matches any capitalised word followed by a colon. So it usually *bolds*, which is why the bug reads as absent, while attribution, colouring and `myChars` quietly miss. Anything not starting `[A-Z]` (`d'Ihnn`, a lowercase nickname) or containing a digit fails every pass.

This is Batch 1, item 1, and it is the highest-scored item on the board (+7). The user reported it as "aliases don't consistently get picked up" and suspected it was the index-addressing issue in the alias editor — **it is not.** That is a separate, real, smaller bug in `removeAlias(i)` / `updateAlias(i)`, fixed in the same batch because the file is open anyway.

## Things confirmed as already working

Worth recording so they don't get rebuilt:

- **The reconcile prompt already shows what is mismatched.** `cloudBoot()` (~line 1950) lists, by title and date, the sims that exist only on this device and only in the account, under two headings naming exactly which set each choice loses. It also only raises the prompt when the device is *ahead* of the account. Only the "I'm not sure" merge option was ever missing, and that is now a decide-or-delete item.
- **Per-member mission/scene filing on joint sims looks done.** There is a long comment at `lcars.js:9488` explaining that filing lives in each writer's own payload precisely because missions are private per writer. Needs confirming, not building.
- **Joint Posts is limited only at creation.** `jpCanCreate()` at `lcars.js:9486` is `return isCloud() && isSuperAdmin();`. Anyone invited can already join, take turns and write. Three call sites read it: the convert path (~4183), button visibility (~9334) and the create guard (~9465).

## Docs updated in the same commit

`ROADMAP.md` (rewritten), `CLAUDE.md` (batch pointer, the download freeze as a hard rule, the alias landmine, two new "what not to touch" entries), `TECH_STACK.md` (version, the four-file reality, the freeze and what it unblocks, an expanded watch list), `USER_PROTOCOLS.md` (pick a batch not an item, parallel processes, standing decisions).
