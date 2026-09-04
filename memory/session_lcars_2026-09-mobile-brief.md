# Mobile optimisation — the brief going in (2026-09-04)

_Planning session. **No app code was changed.** Everything here was settled by
building mockups and testing them on a real phone, so treat it as decided
rather than as suggestions. Read before starting `ROADMAP.md` Batch 4._

The mockups are on branch `claude/mobile-optimization-planning-my6upp` at
`test/mobile-mockups/` — `index.html` is the working design, `looks.html` the
look book that records why it looks the way it does. **Both are throwaway:
delete the folder when the real work ships.**

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

## Still open (neither blocks the build)

- **The Tools panel is nine items behind a vague word** — auto-format toggles,
  visual aids, source view and paragraph markers. The weakest grouping in the
  design. A naming and membership question, not a layout one.
- Which side the rail ends up on, if the right-hand edge wears badly in use.

## The order of work

The user's instruction: do the **sim details panel reorder first**, then the
mobile pass over the new structure — same session, per Batch 4's own reasoning
that doing them apart means laying that panel out twice. The reorder is a
field-order decision, not a structural one, so nothing in this brief depends on
its outcome.
