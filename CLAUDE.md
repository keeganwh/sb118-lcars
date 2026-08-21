# LCARS SB118 Writing Tool — Project Instructions

Browser-based Play-by-Email writing tool for Starbase 118. Read this every session.
For more depth: `TECH_STACK.md` (stack), `ROADMAP.md` (what's next), `USER_PROTOCOLS.md` (the user's routine).

**Live at https://sb118-lcars.vercel.app/.** GitHub Pages still serves the same `main` behind a notice pointing people at the new address; retiring it is on the roadmap.

## Stack & versions (see TECH_STACK.md for detail)

- **Vanilla web app, no build step, no npm, no framework.** The app is `LCARS.html` (~415 lines of markup), `lcars.css` (~1,240) and `lcars.js` (~8,500). `lcars-render.js` holds the sim render pass and is loaded by the app *and* by `share.html`, the standalone read-only viewer (with its own `share.js`) served at `/s/<token>`.
- **Vercel** hosts it; **Supabase** holds accounts and synced data. Both are reached over plain `fetch` — no SDK, no CDN script.
- Current app version: **4.23**. `APP_VERSION` and the `VERSIONS` array are at the top of `lcars.js`, right after `const SKEY` (line ~5).

## Architecture in brief

- **One app, several views.** `#workspace`, `#view-settings`, `#view-manifest` and `#view-admin` are siblings under one header. `showView(view, fromRoute)` is the only place a view changes and the only caller of `syncRoute()`. **Views are hidden, never torn down** — that is why an open sim survives a trip to Settings and back.
- **Routing** — History API. `/`, `/settings`, `/manifest`, `/admin`, `/guide`, rewritten to the app by `vercel.json`. On Pages, which has no rewrites, the routes degrade to the dashboard.
- **Editor** — native `contenteditable` `#editor` div. Markers, name-bolding and character colouring are applied by debounced transform passes on input.
- **Storage** — `localStorage` is the local cache and the offline source of truth: `lcars_v1` (`SKEY`) for data, `lcars_style_v1` for the skin mirror (read before `<body>` for a flash-free first paint), `lcars_auth_v1` and `lcars_mode_v1` for the session.
- **Cloud** — Supabase tables `writers`, `state`, `snapshots`, all under RLS. Sign-in is Writer ID + PIN, with the auth email derived as `<writerid>@lcars.local` so it needs no server lookup. A Google or Discord identity can be linked to the same auth user, which is both a second way in and the route back from a forgotten PIN. Snapshots live in their own table, fetched on demand, capped at ten per sim. Every network call is gated on `isCloud()`; offline-only is a first-class mode.
- **Privileged operations** — anything the anon key cannot do (removing a login, purging an expired deletion, resetting somebody else's PIN, reading the writer roster) is a `security definer` Postgres function in `supabase/schema.sql`, called over PostgREST. **There are deliberately no Edge Functions and no server secrets** — see the recovery/deletion memory file for why.
- **Roles and moderation** — `writers.role` is `writer` / `moderator` / `super_admin`. Moderators action the PIN reset queue at `/admin`; super admins also see the writer roster and assign roles. **The client-side guards are cosmetic** — RLS on `pin_reset_requests` and the role checks inside the functions are the boundary, so never move a check up into the page.
- **Offline download** — `api/download.js` re-inlines the three files into one self-contained `LCARS.html` on demand, so "download one file and run it with no network" still holds.
- **UI** — hand-written LCARS CSS. Classic skin (Dark/Light/High-contrast) plus the Delta Prime skin, via CSS variables. Fonts from Google Fonts, loaded dynamically.

## Hard rules (never break these)

1. **Changelog, same commit.** After **every** code change to `lcars.js`, `lcars.css` or `LCARS.html`, append a pending entry to the `VERSIONS` array in the *same* commit — never defer. If a `pending` entry exists, add to its `changes` array instead of starting another.
2. **Trailing commas.** Every object in the `VERSIONS` array needs a trailing comma — a missing one is a fatal JS syntax error that breaks the whole app.
3. **Changelog strings are single-quoted.** An unescaped apostrophe is a fatal syntax error. Write entries from a Python file, not an inline shell heredoc.
4. **Never bump the version unasked.** `APP_VERSION` / `CHANGELOG.md` only change when the user says "save new version X.Y".
5. **Don't batch unrelated changes.** Commit and push after each change.
6. **Verify in a browser.** There is no test suite, and a syntax check cannot see a valid block going missing — see the landmines below.
7. **Ask questions in plain text, never in a modal.** The user has asked for this explicitly. Put decisions to them as prose in your reply — do not use `AskUserQuestion` or any other pop-up chooser on this project.

### Pending changelog entry format

```js
{
  version: 'pending',
  date: 'YYYY-MM-DD',
  changes: ['Short description of what changed and why'],
},
```

Entries are read by writers, not developers. Write them in plain language, saying what is different and why it matters, not which function moved.

## Version workflow

- `CHANGELOG.md` mirrors the `VERSIONS` array in Markdown — keep them in sync.
- On "save new version X.Y": roll all pending entries into a clean versioned entry, update `APP_VERSION`, update `CHANGELOG.md`, then commit.

## Run / test

- No build, no server needed for the basics: open `LCARS.html` in any browser, or serve the folder (`python3 -m http.server -d .`) to exercise routing.
- **A headless browser is the real test.** Playwright is available and Chromium is pre-installed at `/opt/pw-browsers/chromium`. Drive the affected flow and listen for `pageerror`. Use it after any non-trivial change.
- For user-facing fixes, verify on the live Vercel URL after the deploy.

## Landmines

- **Never splice a file by searching for two boundaries without reading what lies between.** This has silently deleted whole modules twice — once the entire cloud module, once eight account-control functions. Both parsed cleanly. After a structural edit, diff the function inventory:
  ```
  git show HEAD:lcars.js | grep -oE "^(async )?function [a-zA-Z_$][a-zA-Z0-9_$]*" | sort > /tmp/old
  grep -oE "^(async )?function [a-zA-Z_$][a-zA-Z0-9_$]*" lcars.js | sort > /tmp/new
  comm -23 /tmp/old /tmp/new   # anything listed was removed
  ```
- **Test the signed-in path, not just offline.** The account-controls deletion above was invisible in an offline browser pass. Intercept Supabase so the real fetch code runs.
- **Responsive rules go in the one `RESPONSIVE` section at the foot of `lcars.css`,** after the skin overrides. Anything earlier is silently outranked by the `:root[data-skin="prime"]` blocks. Breakpoint is 820px.
- **`--accent` is defined nowhere.** Bare `var(--accent)` renders as inherited text colour. Use `var(--amber)`.
- **`localStorage` is per-origin** — Pages, Vercel production and every Vercel preview URL hold separate data. Test on a stable URL so data survives a push.
- **Supabase free tier pauses a project after ~1 week idle.** It resumes from the dashboard.
- **`lcars.js` is ~7,200 lines** — read targeted ranges, not the whole file.
- **`<p>` and `<div>` are not interchangeable outside the editor.** `#editor p,#editor div{margin:0}` flattens both, so pasted content (Google Docs and Word give `<p>`) looks identical to typed content (`<div>`) while writing — and then copies out double spaced, because `<p>` carries a margin everywhere else. The copy handler normalises `<p>`→`<div>` on the way to the clipboard. Normalise on the way *out*, not at paste time: it fixes sims that already exist and leaves stored content untouched.
- **A mode restriction lives in more than one place.** Academy mode blocks things in three: the CSS that greys the button out, the guard inside the command (`doIndent`), and the keyboard handler. Changing a rule means changing all three — twice now a button has started working while its keyboard shortcut silently did not.
- **`stripFormattingHtml()` runs on open, on paste and on applying source view.** Anything it strips is removed repeatedly, not once, so a structural feature it touches will appear to work and then quietly revert the next time the sim is opened.
- **Boot raises prompts on a timer, and they fight.** The reconcile question, a pending deletion, a temporary PIN that must be changed and the Delta Prime intro have now collided three times, twice invisibly. Any new boot-time prompt must check `#mo` is hidden before it paints.
- **`admin_action_reset()` writes `auth.users.encrypted_password` via `crypt()`** — the one thing in the schema Supabase does not support. If temporary PINs ever stop working, that is why; the fallback is written into the function's own comment.
- **Deploy before running a schema migration, never after.** New app code tolerates columns it no longer uses; old app code does not tolerate columns that have vanished. Applying a migration while a browser still holds the previous build gives a raw PostgREST error about a missing column. There is a friendly `PGRST204` message in `publishShare`, but the ordering is the real fix.
- **The editor's render pass is not the reader's.** `applyMarkers` tints markers so a *writer* can spot them mid-sim. Anything showing a finished sim to someone else wants what the editor's **`copy` handler** produces: locations bold, OOC and thoughts italic, markers plain, and no colour at all — character colours included. `lrToReadingHtml()` in `lcars-render.js` is that pass; use it rather than writing a third answer.
- **A new shared file means updating `api/download.js` AND the `vercel.json` cache-header list.** Miss the first and the offline download breaks; miss the second and a fix never reaches anyone's browser.
- Don't recreate the `main-ikuxoc` branch.

## Git workflow

- Before every commit, run: `git config user.email noreply@anthropic.com && git config user.name Claude` — required for CCR commit signing; skipping it produces unsigned commits the stop hook rejects.
- **Pushing to `main` deploys to production.** Small, safe, self-contained changes can go straight there; anything large, risky or experimental belongs on a `claude/<short-topic>` branch, merged to `main` once it is proven. When a session has been given a branch to work on, use it.
- Commit and push after each change.

## What not to touch

- Don't edit `CHANGELOG.md` or `APP_VERSION` except on an explicit version bump.
- Don't add a build step, a bundler or npm dependencies — the zero-dependency, plain-`fetch` design is deliberate, and it is what keeps the offline download working.
- Don't put the Supabase `service_role` key anywhere in this repo or the app. The anon key is fine; RLS is what protects the data, and privileged work goes through `security definer` functions instead.
- Don't reintroduce a recovery email or an Edge Function for account recovery. Both were considered at length and rejected — the reasoning is in `memory/session_lcars_2026-08-recovery-deletion.md`.
- Don't recreate the `main-ikuxoc` branch.

## Key files

- `LCARS.html` · `lcars.css` · `lcars.js` — the app.
- `lcars-render.js` — the sim render pass, shared by the app and the share viewer. Loaded **before** `lcars.js`.
- `share.html` · `share.js` — the standalone read-only viewer at `/s/<token>`.
- `api/download.js` — serverless route that rebuilds the three into one offline file.
- `supabase/schema.sql` · `supabase/README.md` — database schema and setup steps.
- `vercel.json` — route rewrites and cache headers.
- `LCARS-Guide-v2.html` — user guide, served at `/guide`. Predates accounts; a rewrite is on the roadmap.
- `CHANGELOG.md` — human-readable version history.
- `TECH_STACK.md` · `ROADMAP.md` · `USER_PROTOCOLS.md` — stack, outstanding work, and the user's routine.

## Project memory

Cross-session memory lives in `memory/` (committed to GitHub). At session start, read `memory/MEMORY.md` for the index, then load relevant files. **Read `memory/session_lcars_2026-08-platform-plan.md`, `memory/session_lcars_2026-08-views.md` and `memory/session_lcars_2026-08-recovery-deletion.md` before starting any roadmap phase** (the last one before touching accounts, auth or boot in particular) — they hold the decisions behind the current architecture, so they don't get re-litigated.
