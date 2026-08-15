# Session 2 — views, Settings, account management (2026-08-15)

_Follows `session_lcars_2026-08-platform-plan.md`, which still holds for hosting, storage and sync. This file covers the view layer and the Settings page._

Merged to `main` and live. Shipped in **4.23** (2026-08-15); the changelog is clean, no pending block.

## What shipped

| Area | Outcome |
|---|---|
| View layer | `showView(view, fromRoute)` is the single place a view changes and the single place `syncRoute()` is called. Views are siblings under one `#hdr`: `#workspace`, `#view-settings`, `#view-manifest`. |
| Settings | A real `/settings` page, not a modal. Four sections + a contents rail. |
| Manifest | A real `/manifest` view. Its second header bar is gone. |
| Accounts | Change PIN, recovery email, display name, Share my contact, sign out, delete account. |
| Templates | Edited in the sim editor, listed in their own Settings section. |
| Responsive | Header, Settings and Manifest work to 390px. Editor/toolbar/sidebars still to do. |

## Architecture — do not re-derive

- **Views are never torn down, only hidden.** That is why an open sim and its unsaved keystrokes survive a trip to Settings or the Manifest. Verified against mid-debounce typing: the editor HTML comes back byte-identical.
- **Template editing rides on `curId === null`.** Every sim-specific branch is already written `if (curId)`, so snapshots, character detection, post dates, academy mode and doc sync switch themselves off for free. `curTmplId` holds the template; `flushSave()` dispatches to `flushTemplateSave()`. Only positive additions were needed.
- **There are exactly four paths out of the editor** — `showDashboard`, `openDoc`, `openMission`, `openScene`. Each flushes and calls `exitTemplateMode()`. Any new path out must do the same or template edits are lost.
- **Responsive rules live in one `RESPONSIVE` section at the foot of `lcars.css`,** after the skin overrides. Rules placed earlier are silently outranked by the `:root[data-skin="prime"]` blocks — this cost a debugging round. Breakpoint is 820px.
- **`.set-btn` is deliberately not `.dash-action`.** The dashboard tile is big and asymmetric by design; repeated a dozen times down Settings it read as noise.
- **`--accent` is defined nowhere in the codebase.** Bare `var(--accent)` renders as inherited text colour. Use `var(--amber)`. Two uses with `#f80` fallbacks remain in the moved-notice code.

## Landmines confirmed and added

- **The splice landmine bit again.** Rebuilding a function by `s.index('function A')` → `s.index('function B')` deleted the eight account-control functions that sat between them. It parsed, and the offline browser pass was green, because it only threw for *signed-in* users. **Never splice by two function-name boundaries without checking what lies between.** A function-inventory diff against the previous commit catches it:
  ```
  git show HEAD:lcars.js | grep -oE "^(async )?function [a-zA-Z_$][a-zA-Z0-9_$]*" | sort > old
  grep -oE "^(async )?function [a-zA-Z_$][a-zA-Z0-9_$]*" lcars.js | sort > new
  comm -23 old new   # anything here was removed
  ```
- **Test the signed-in path, not just offline.** The above only broke in cloud mode. `account-check.js` intercepts Supabase so the real fetch code runs.
- **`offsetTop` is measured against the nearest *positioned* ancestor,** which changes between breakpoints — the mobile rules make `#view-settings` relative. Measure against the scroll container with `getBoundingClientRect`.
- **Anything measured inside `renderSettingsView` has no box yet** — it runs while the view is still `.hidden`. Defer with `requestAnimationFrame`.

## Test harness (rebuild it, it pays for itself)

In the scratchpad, not committed:

- `server.js` — emulates the `vercel.json` rewrites plus `/api/download`. Launch Chromium with `args:['--no-proxy-server']` and unset `HTTP(S)_PROXY` or it cannot reach 127.0.0.1.
- `walk.js <url> [--routing] [--offline-file]` — the full flow: gate, wizard, mission/scene/sim, typing, manifest, settings, snapshots, reload, overflow at three widths. Run it on `file://`, on HTTP with `--routing`, and on the `/api/download` output with `--offline-file`.
- `account-check.js` — signed-in surface with Supabase intercepted.
- `settings2-check.js`, `tmpl-check.js`, `manifest-check.js`, `styles.js` (computed-style diff vs a worktree at the previous commit).

The Delta Prime intro modal fires on first run and blocks everything — dismiss it before driving any flow.

## Decisions

- **Display name has no viewer yet.** The column is set from Settings, but nothing shows one writer's name to another. Share links (session 4) are the first surface that could. User chose to ship it now without a caveat in the copy.
- **Escape leaves the Manifest but not Settings.** The Manifest was an overlay, so Escape kept its old meaning; Settings is a page and Escape does not navigate.
- **Saving a sim as a template lives in Sim Details,** not Settings — you are in the sim when you want it. Settings manages the ones that exist.
- **The Delta Prime duty/mood controls were left alone** in the Settings restyle; `styleControlsHtml()` is shared with the header's Style menu.

## Not verified

Anything on a real phone; the signed-in path against real Supabase (intercepted only); PIN change against a real account.
