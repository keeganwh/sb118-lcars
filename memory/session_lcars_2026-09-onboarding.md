# Session — onboarding, What's New and What's Planned (2026-09-10)

_ROADMAP **Batch 5B**, all three items, plus a character-claiming fix the batch
turned up. **Merged to `main` and live 2026-09-12.** **Not cut as a version** —
the entries sit pending in the `VERSIONS` array alongside Batch 5's._

Read alongside `session_lcars_2026-09-mobile.md` (the phone toolbar moves
controls rather than copying them; `.hdr-right` IS the app menu) and
`session_lcars_2026-09-feedback-tool.md` (the side-panel pattern reused here).

## What shipped

| Area | Outcome |
|---|---|
| First-run tour | A spotlight overlay over the live UI, thirteen steps, replacing the modal wizard |
| Example sim | Created on start, not on skip; kept or deleted at the end |
| Who sees it | Genuinely new writers only — **no sims AND no characters** |
| Removed | `WIZ.ret1`/`ret2`, `wizImportBackup`, and the whole `showStyleIntro()`/`STYLE_VERSION` mechanism |
| What's New | `#wn-panel`, a side panel on the App Feedback pattern, two tabs |
| Badge | A dot on a Dashboard button, `prefs.seenWhatsNew` vs `APP_VERSION` |

## Decisions — do not re-litigate

- **"New" is emptiness, not an unset flag.** `isNewWriter()` asks whether
  `S.docs` and `S.characters` are both empty. A returning writer signing in on
  a new device has an empty `wizardDone` and a full account, and being greeted
  with an introduction to an app they already use is the failure this fixes.
- **The returning-writer fork was deleted, not rewritten.** It was entirely the
  August 2026 platform move — Gist sync, the Docs importer, "go back to the old
  address and press Move My Stuff" — a one-time message that had become the
  permanent second option on the welcome screen. The Pages moved-banner covers
  stragglers on its own and Settings still has backup import.
- **The account pitch at the tail went too.** The first-run gate already offers
  an account; repeating it as the last word of an introduction read as a
  sign-up funnel.
- **`HIGHLIGHTS` is hand-written, never generated from `VERSIONS`.** The
  changelog in Settings → About is the complete record and is meant to be.
  There is no field in a changelog entry that says "this one mattered", so a
  generated list would just be that changelog a second time, which is exactly
  what this must not become. Five features, each with the date it launched.
  **Fixes and adjustments do not belong here.**
- **`PLANNED` carries no dates.** A date on a roadmap item is a promise.
- **A badge, not a boot popup.** It waits to be noticed rather than joining the
  queue of things boot raises on a timer.
- **It lives on the Dashboard, upper right**, where the AI disclaimer used to
  be — deliberately not in the header, which already carries eight controls.
- **`showStyleIntro()`/`STYLE_VERSION` were folded in, not left beside it.**
  `STYLE_VERSION` had been stuck at 4.22 for three releases while the app went
  to 4.25, so the second what's-new mechanism had quietly stopped announcing
  anything. The Style menu's button now opens the panel; the intro modal's
  style controls were already in that same menu, so nothing was lost.
- **The example sim is an ORDINARY doc in `S.docs`**, under a real mission and
  a real scene. A synthetic one would not be in the sims tree, would not be
  counted by the dashboard and would not be found by search — every place a
  special case goes quietly wrong. Deleting it goes through `delDoc` (which
  gained a `noConfirm` flag), so a joint sim, the sync and the nav are handled
  the way they are everywhere else.
- **Closing the tour halfway KEEPS the example.** By then it is a real doc, and
  throwing away a writer's work without asking is not what a Close button does.
- **The copy is the user's, not mine.** They reviewed every step and supplied
  replacements, applied as written apart from four corrections where the text
  described behaviour the app does not have. Titles are Title Case; spelling is
  British throughout, matching the rest of the app.
- **"Return Home" closes the example sim first**, so the Dashboard is really
  behind the card rather than asked for on faith — and it gives the three steps
  after it a real Dashboard to sit on. That is what `tourEnsureSim()` is for:
  walking BACK past it would otherwise find every earlier step's target
  boxless and skip the lot.
- **`softTarget`** lights a target if it is on screen and shows a centred card
  otherwise. App Feedback is hidden for a writer who is not signed in, and the
  last step carries the keep-or-delete choice, so it must never be the step
  that gets skipped.

## The spotlight, and what it cost

The mask is **one absolutely-positioned box wearing a 9999px spread
`box-shadow`** — no SVG, no `clip-path`, no dependency. `#tour` is a
transparent click-swallowing sheet above it at `z-index:8900` (over the
drawer at 600, the modal at 1000 and the context menu at 2000, under the
toast at 9999).

Three things that were not obvious:

1. **The overlay had to `stopPropagation()` on click.** There is a
   document-level handler that closes the toolbar dropdowns on any click
   outside `.tb-dd-wrap`. Every press of *Next* fired it and shut the panel the
   step was pointing at.
2. **A step that opens something must wait before measuring.** The sims drawer
   and the app menu slide in on a `transform`. Measuring on the same tick put
   the spotlight where the panel *had* been — off the right-hand edge, 0px wide
   — which then read as "not on screen" and made the step skip itself. 320ms.
3. **Off-screen has to count as absent.** `tourRect()` rejects a box that does
   not intersect the viewport, not merely one with no width. A hole punched
   past the edge of the window lights nothing.

Mobile is handled per step with a `before()` that opens the container the
target lives in, and a target with no box is skipped rather than pointed at.
`mobSyncChrome()` only **moves** controls, so ids are stable and it is
**visibility, not identity**, that needed handling — as the mobile session
said it would be.

Boot raise takes `maybeShowStyleIntro()`'s defence verbatim: a 400ms defer, a
check that `_routeView === 'dash'`, a check that `#mo` is hidden. A tour is
worse than a modal at boot because it points at elements that may not exist
yet, so its **first card targets nothing and measures nothing**.

## The character-claiming fix (a second commit, outside the batch)

The user asked what `S.characters`, `doc.chars`, `doc.myChars` and
`S.settings.myChars` are each for, and whether they need to be separate.

| | Holds | Read by |
|---|---|---|
| `S.characters` | The character RECORDS — name, aliases, colour, picture. The only one with structure | `getRegisteredAliases()` → `charsFromTitle()`. **This is what makes a name catch in a title** |
| `doc.chars` | Who is in THIS sim | The Characters panel, colouring, name-bolding |
| `doc.myChars` | Which of this sim's characters are yours | Stats, search, sim counts |
| `S.settings.myChars` | Names you have claimed, globally | `syncDocMyChars()`, to pre-tick them next time |

Three of the four earn their place. `doc.myChars` has to be per-sim for a
reason that is not obvious: **a joint sim holds your characters and somebody
else's in the same document**, and `jpRememberMyChars()` keeps your selection
local so the other writer's save cannot overwrite it.

**`S.settings.myChars` is the redundant one** — a cache of "names that should
be mine", derived from ticks and consumed to pre-tick, storing NAMES rather
than ids, which is why `syncDocMyChars` has to walk the alias chain to match.
If everything in `S.characters` is yours by definition (it is: it is your
character list) it is derivable. Collapsing it touches eight-plus read sites
including stats, search and the dashboard — **a roadmap item, not a
drive-by.**

**The bug, and the wrong diagnosis I gave first.** I told the user ticking a
character never reached `S.characters`. That was wrong: `prepManifest()` has
always seeded records from `S.settings.myChars` — but it is called from
exactly one place, `showView('characters')`. So a ticked name became a real
character the next time the writer opened the Characters view, **and not
before**. The bug was timing, not absence; the symptom was identical, which
is why the wrong diagnosis survived a read of `toggleMyChar`. **Grep for
every caller before saying a write never happens.**

`claimChar(name, charType)` is now the one place a name becomes one of your
characters and writes both halves together. Three callers: the tick, the
add-a-character dialog, and `prepManifest()`, which keeps its sweep as a
backstop for anything claimed before this existed. Both directions now work.

**Unticking deliberately does NOT delete the record.** Untick means "not in
this sim"; destroying a character's colour, aliases and picture over it would
be data loss nobody asked for.

## The one layout bug, and how it was found

Adding a second column to `.dash-header-row` collapsed `.dash-header-left`
under 820px: its `flex:1` left it a narrow strip, the title broke over two
lines, the five-item stat grid lost its columns and the button rendered *on top
of* the title. Wrapping the flex row did not fix it; making the row
`display:block` on a phone did.

**Every assertion in that run was green.** The panel opened, the badge cleared,
there was no horizontal overflow, five items rendered. A screenshot at 390px is
what showed it — the same lesson the mobile session ended on, confirmed again.

**And a third time, in a new shape.** A "press Back four times" check passed
while doing nothing at all: the click targeted a Back button the final step did
not have, `.catch()` swallowed the failure, and the step counter still reading
13 afterwards looked like a pass. The gap was real — the end of the tour was
one-way — and the test that was supposed to find it reported success.
**A swallowed interaction and a satisfied assertion look the same. Assert that
the thing MOVED, not that it ended up somewhere.**

## Verified

Playwright at 1280px and 390px: the tour end to end on both — thirteen steps
forward AND thirteen back — every step's hole and tooltip measured inside the
viewport, the example sim reopening when Back passes "Return Home", the skip path (no example sim
created), the Escape path (example kept), keep and delete at the end (docs,
missions and scenes all back to zero on delete), the badge appearing once and
clearing, reopening from the Dashboard and from Settings, and the Style menu
route into the panel. Colour swept across `skin × mode × vibe` — Prime
dark/light × calm/epic and Classic — for the panel, the card and the button.
Four existing suites re-run: fidelity 24, copy button 4, panels 5, templates 10.

**Not verified:** anything on a real phone; the signed-in path against real
Supabase (`prefs.seenWhatsNew` syncing between two devices in particular).

## Where things are

- `lcars.js` — `TOUR`, `TOUR_EXAMPLE_HTML`, `tourStart()`/`tourGo()`/`tourPaint()`
  and `tourFinishExample()`; `HIGHLIGHTS`, `PLANNED`, `wnOpen()`/`wnTab()`;
  `isNewWriter()`, `maybeShowWizard()`.
- `LCARS.html` — `#wn-panel`, beside `#fb-panel`.
- `lcars.css` — `#tour`/`#tour-hole`/`#tour-tip` and `.dash-wn` near the
  dashboard rules; `#wn-panel` shares `#fb-panel`'s chrome; the phone rules are
  in the one `RESPONSIVE` section at the foot.

## Left for next time

- **`HIGHLIGHTS` and `PLANNED` need curating on every release.** Nothing updates
  them automatically and nothing will complain if they go stale — which is
  precisely how `STYLE_VERSION` ended up three versions behind. Add it to the
  version-bump routine.
- **Neither Batch 5 nor 5B is cut as a version.** Both sit as pending entries.
- **The icon review is ROADMAP Batch 5C**, raised by this session but not done
  here.
