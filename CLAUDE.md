# LCARS SB118 Writing Tool — Project Instructions

## Changelog Rule (CRITICAL)

After **every code change** to `LCARS.html`, immediately append a pending entry to the `VERSIONS` array near the top of the script:

```js
{
  version: 'pending',
  date: 'YYYY-MM-DD',
  changes: ['Short description of what changed and why']
}
```

- Do this **as part of the same commit** as the code change — never defer it
- If a pending entry already exists, **add to its `changes` array** rather than creating a duplicate
- **Always put a trailing comma after every object in the VERSIONS array** — missing commas cause a fatal JS syntax error that breaks the entire app
- When the user says "save new version X.Y", roll all pending entries into a clean versioned entry, update `APP_VERSION`, update `CHANGELOG.md`, then commit

## Version Workflow

- `APP_VERSION` and `VERSIONS` array live near the top of `LCARS.html` (after `const SKEY`)
- `CHANGELOG.md` mirrors the same data in Markdown — keep them in sync
- Version bumps are **user-triggered only** — never bump without being asked

## Git Workflow

- Commit and push after every change — do not batch unrelated fixes into one commit
- **Before every commit**, run: `git config user.email noreply@anthropic.com && git config user.name Claude` — this is required for the CCR signing infrastructure to sign the commit; skipping it produces unsigned commits that the stop hook rejects
- Always push to `main` only: `git push origin HEAD:main`
- Target branch: `main` → auto-deploys to GitHub Pages

## Key Files

- `D:\Claude Work\LCARS.html` — entire app (single file, all JS/CSS/HTML inline)
- `D:\Claude Work\LCARS-Guide-v2.html` — user guide (opened via Dashboard button)
- `D:\Claude Work\CHANGELOG.md` — human-readable version history

## Project Memory

Cross-session memory lives in `memory/` at the repo root (committed to GitHub). At the start of each session, read `memory/MEMORY.md` for the index, then load relevant files. This replaces the local `~/.claude/projects/` memory system so context is portable across machines.
