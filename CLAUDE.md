# LCARS SB118 Writing Tool — Project Instructions

Browser-based Play-by-Email writing tool for Starbase 118. Read this every session.
For more depth: `TECH_STACK.md` (stack), `ROADMAP.md` (what's next), `USER_PROTOCOLS.md` (the user's routine).

## Stack & versions (see TECH_STACK.md for detail)

- **Single-file vanilla web app** — all HTML/CSS/JS inline in `LCARS.html` (~6,850 lines). No framework, no build step, no npm, no server.
- Current app version: **4.2**. `APP_VERSION` + `VERSIONS` array live near the top of the script, right after `const SKEY` (~line 981).

## Architecture in brief

- **Editor** — native `contenteditable` `#editor` div; markers and name-bolding applied by debounced transform passes on input.
- **Storage** — `localStorage`: main data under `lcars_v1` (`SKEY`), sync config under `lcars_sync_v1` (`SYNC_KEY`). Per-browser, nothing shared between users.
- **Cloud sync** — optional GitHub Gist API (user PAT + Gist ID). Auto-push ~60s after save, ~5s after status change; auto-pull on load. **Data is ~913 KB, near the 1 MB Gist ceiling — watch this.**
- **UI** — hand-written LCARS CSS, Dark/Light/LCARS themes via CSS variables. Fonts from Google Fonts (loaded dynamically).
- **Hosting** — GitHub Pages, auto-deploys from `main` (~30s).

## Hard rules (never break these)

1. **Changelog, same commit.** After **every** code change to `LCARS.html`, append a pending entry to the `VERSIONS` array in the *same* commit — never defer. If a `pending` entry exists, add to its `changes` array instead of duplicating.
2. **Trailing commas.** Every object in the `VERSIONS` array needs a trailing comma — a missing one is a fatal JS syntax error that breaks the whole app.
3. **Never bump the version unasked.** `APP_VERSION` / `CHANGELOG.md` only change when the user says "save new version X.Y".
4. **Don't batch unrelated changes.** Commit + push after each change.
5. **`main` only, and it's live.** Push to `main` (never `main-ikuxoc` — it's deleted, don't recreate it). Pushing to `main` deploys to production.

### Pending changelog entry format

```js
{
  version: 'pending',
  date: 'YYYY-MM-DD',
  changes: ['Short description of what changed and why'],
},
```

## Version workflow

- `CHANGELOG.md` mirrors the `VERSIONS` array in Markdown — keep them in sync.
- On "save new version X.Y": roll all pending entries into a clean versioned entry, update `APP_VERSION`, update `CHANGELOG.md`, then commit.

## Run / test

- No build, no server. **To run:** open `LCARS.html` in any modern browser.
- **To test a change:** open the file locally and exercise the affected flow by hand (there is no automated test suite). For user-facing fixes, verify on the live Pages URL after the deploy.

## Git workflow

- Before every commit, run: `git config user.email noreply@anthropic.com && git config user.name Claude` — required for CCR commit signing; skipping it produces unsigned commits the stop hook rejects.
- Commit and push after each change: `git push origin main`.

## What not to touch

- Don't edit `CHANGELOG.md` or `APP_VERSION` except on an explicit version bump.
- Don't recreate the `main-ikuxoc` branch.
- Don't refactor the single-file structure into modules/a build system — the zero-dependency single file is intentional.

## Key files

- `LCARS.html` — the entire app.
- `LCARS-Guide-v2.html` — user guide (opened from the Dashboard).
- `CHANGELOG.md` — human-readable version history.
- `TECH_STACK.md` · `ROADMAP.md` · `USER_PROTOCOLS.md` — stack, outstanding work, and the user's routine.

## Project memory

Cross-session memory lives in `memory/` (committed to GitHub). At session start, read `memory/MEMORY.md` for the index, then load relevant files. This replaces the local `~/.claude/projects/` memory so context is portable across machines.
