# Mobile optimisation — planned, built and shipped (2026-09-04/05)

_**SHIPPED.** Designed by mockup, tested on a real phone over four rounds, then
built and taken through six rounds of on-device review. Read before touching
anything in the `RESPONSIVE` section of `lcars.css`, the phone toolbar, or the
header._

The mockups did their job and were deleted with the build; they are in git
history at `test/mobile-mockups/` if the reasoning is ever wanted (branch
`claude/mobile-optimization-planning-my6upp`, before the final commits).

**Still outstanding from Batch 4: the sim details panel reorder.** It is a
field-order decision the user has not made yet, and nothing in the mobile
layout depends on it.

## The framing that matters

The app already works on a phone. The user writes on it today and calls it
"okay, not perfect". This is an **optimisation of what exists, not a rescue** —
which is why the answer is a layout pass and not a separate mobile app, and why
"LCARS Lite" is not what this is.

Two problems, in the user's words: the UI takes too much room, and the controls
are more limited than they need to be. The workspace is a three-column desktop
layout (`#sidebar` · `#rh-left` · `#ep` · `#rh-right` · `#cp`) with **no
responsive rules at all** — session 2 did the header, Settings and the Manifest
and stopped there.

Scope is phones **and** tablets. Tablets are not a separate design: they keep
something close to the desktop layout and mainly need the writing window to
work.

## Decided — do not re-litigate

| | Decision | Why |
|---|---|---|
| Toolbar position | **Top.** Not a setting. | At the bottom the software keyboard covers it. Tested; nothing styles around that. |
| Toolbar structure | **Grouped: Copy, Bold, Italic, Insert, Format, Tools.** | Bold and italic stay one tap away; the rest go behind named panels. Mirrors the separator groups and two dropdowns already in `dh-r2`, so it is a re-presentation, not a redesign. |
| Hiding the controls | **One persistent button, top corner, in the rail's column. Never automatic.** | Auto-hide was built and rejected: anything that moves while your thumb is mid-sentence is a liability. The button never moves, resizes or changes glyph; it is *not* part of the toolbar, so it survives the toolbar being hidden; it sits below the scrim so an open drawer covers it. It hides the header, the toolbar **and the sims rail** — the writing view leaves nothing but the sim. |
| Sidebars | **Both rails become one drawer**, tabbed Sims / Sim Details, opened from a **rail on the right-hand edge that occupies layout space**. | A handle floating over the text was rejected, and so was one in the header — the drawer covered it. The rail is the desktop collapsed sidebar (24px) at thumb scale. Its tab **rides on the drawer's outer edge**, so opening the drawer moves the handle instead of burying it. |
| The rail tab | **Chevron over the word "SIMS", set vertically.** | The chevron says it opens, the word says what. A bare chevron was tried and rejected: people do not know what they are opening. Costs no writing width. |
| Look | **"One bar"** — header and sim title merge into a single dark bar, accent surviving as one slim block on its leading edge; toolbar unboxed text and icons; rail reduced to nothing but its tab. | Three bands of furniture become two; the sim starts ~54px higher. The rule is **one filled accent shape on screen, nothing else outlined.** The rejected draft mixed four button languages at once — filled badge, outlined circles, boxed toggle, outlined pills — which is what read as clunky. |
| Desktop vs mobile view | **No in-app switch.** | The browser's own "Request Desktop Website" already works, because our layout switches on screen **width** (Safari renders desktop-site at ~980px, over the 820px breakpoint) and it is remembered per site. |
| Skins | All three main skins and their light/dark variants get styled. None is exempt. | |

### The consequence of the desktop-view decision

**All layout rules must stay width-based.** If a layout rule keys off
`pointer:coarse` instead, the browser's desktop-site toggle stops having any
effect and the choice is taken away from the user. Touch detection is limited
to things that should apply regardless of width: tap-target size (44px) and the
16px font floor. **Never `maximum-scale`** — it takes pinch-zoom from everyone,
including people who need it.

## Landmines found while mocking this up

- **The title on the dark bar hits the skin-precedence trap.**
  `:root[data-skin="prime"] body #doc-title{color:var(--ink)}` (`lcars.css:795`)
  outranks a bare `#doc-title`, so a light colour written plainly *silently
  loses* — the title rendered dark-on-dark in Prime light and was unreadable.
  The override has to be written at skin specificity. Classic light also needs
  its bar given a dark surface of its own.
- **The drawer must travel its own width plus its tab.** The tab hangs 34px
  past the drawer's outer edge, so `translateX(-103%)` leaves it poking back
  onto the screen. Use `calc(-100% - 40px)`.
- **`[hidden]` loses to `display:flex`.** A toolbar row hidden by the attribute
  stayed visible until an explicit `[hidden]{display:none}` rule was added.
- `startResize()` is bound `onmousedown` only, so the resize handles are
  already inert on touch — hide them rather than adding touch handlers.
- Toolbar menus (`toggleTbDropdown` / `openTbDd` / `schedCloseTbDd`) are
  click-driven with hover as an enhancement, so they should survive touch; the
  close-on-leave timing still wants checking on a real device.
- `100vh` under a mobile URL bar is taller than the screen. Size in `dvh` with
  `vh` as the fallback, and add `viewport-fit=cover` for the safe areas.
- `.mi`/`.ms` are 0.87rem and `#search-input` 0.8rem against a 15px base —
  ~13px and ~12px, under iOS Safari's 16px auto-zoom threshold.

## What the build actually took, beyond the design

The design was right; the cost was elsewhere. Six of the review rounds were
CSS specificity and one class of untested state:

- **Skin specificity beat "last in the file" six times.** The sim title
  rendered dark-on-dark, the app menu's labels went white-on-white, the stat
  strip refused to wrap, and once the drawer stopped opening entirely because a
  `transform` was folded into a skin-specificity rule and outranked
  `body.mob-sims #sidebar`. That last one still passed its colour assertion —
  it was measuring an element that never appeared. **A screenshot caught what
  the assertion could not.**
- **`data-vibe` is a third axis nobody was sweeping.** The sims drawer looked
  dark grey instead of white, intermittently. Cause: Epic gives `#sidebar` and
  `#cp` a 55% translucent background over `backdrop-filter: blur(18px)`
  (`lcars.css:765`), so as a drawer it frosted the 50% black scrim behind it.
  Every skin test ran in Calm. I gave the user a confident wrong diagnosis
  twice before finding it.
- **The 16px zoom floor lost to an id.** `#cm-filter input` at 0.8rem outranked
  a bare `input`, and the Manifest's Characters button focuses that field — so
  opening the character list zoomed the page. It is now
  `input,select,textarea{font-size:16px!important}` under `pointer:coarse`,
  deliberately blunt: this is a device constraint, and enumerating selectors is
  what failed. A sweep asserts every visible control in every view clears 16px.
- **Moving the sim title row out of `#dh` broke what was hiding it.** `#dh`
  carries `.hidden` with no sim open, so an empty "Sim Title…" box appeared on
  the dashboard. It now asks `#dh` directly via `:has()` rather than tracking a
  second copy of "is a sim open".
- **Phone-only furniture needs an explicit default `display:none`.** Without
  it the rail, scrim, tab strip and toggle rendered as stray controls in the
  desktop header. Caught by screenshotting desktop, not by any assertion.

## Still open

- **The Tools panel is nine items behind a vague word** — auto-format toggles,
  visual aids, source view and paragraph markers. The weakest grouping in the
  design. A naming and membership question, not a layout one.
- Which side the rail ends up on, if the right-hand edge wears badly in use.

## How it was verified

Playwright at 390px and 1280px on every round: the node moves and their restore
on resize, the drawer, both toolbar menus, the header menu, the hide control,
typing, and no horizontal overflow. Plus sweeps for control font size, and for
surface colour across `skin × mode × vibe`. The four suites — fidelity 24,
panels 5, templates 10, copy button 4 — were run on every commit that touched
the app.

**The lesson worth carrying: assertions confirmed things that were visibly
broken.** Screenshot the result as well as measuring it.
