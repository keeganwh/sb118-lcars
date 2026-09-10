# Session — onboarding, What's New and What's Planned (2026-09-10)

_ROADMAP **Batch 5B**, all three items. Built on
`claude/onboarding-whats-new-akf1s2`. **Not cut as a version** — the entries
sit pending in the `VERSIONS` array alongside Batch 5's._

Read alongside `session_lcars_2026-09-mobile.md` (the phone toolbar moves
controls rather than copying them; `.hdr-right` IS the app menu) and
`session_lcars_2026-09-feedback-tool.md` (the side-panel pattern reused here).

## What shipped

| Area | Outcome |
|---|---|
| First-run tour | A spotlight overlay over the live UI, nine steps, replacing the modal wizard |
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

## The one layout bug, and how it was found

Adding a second column to `.dash-header-row` collapsed `.dash-header-left`
under 820px: its `flex:1` left it a narrow strip, the title broke over two
lines, the five-item stat grid lost its columns and the button rendered *on top
of* the title. Wrapping the flex row did not fix it; making the row
`display:block` on a phone did.

**Every assertion in that run was green.** The panel opened, the badge cleared,
there was no horizontal overflow, five items rendered. A screenshot at 390px is
what showed it — the same lesson the mobile session ended on, confirmed again.

## Verified

Playwright at 1280px and 390px: the tour end to end on both, every step's hole
and tooltip measured inside the viewport, the skip path (no example sim
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

- **`HIGHLIGHTS` and `PLANNED` need curating on every release.** Nothing
  updates them automatically and nothing will complain if they go stale — which
  is precisely how `STYLE_VERSION` ended up three versions behind. Add it to
  the version-bump routine.
