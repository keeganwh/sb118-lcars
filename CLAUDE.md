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
- When the user says "save new version X.Y", roll all pending entries into a clean versioned entry, update `APP_VERSION`, update `CHANGELOG.md`, then commit

## Version Workflow

- `APP_VERSION` and `VERSIONS` array live near the top of `LCARS.html` (after `const SKEY`)
- `CHANGELOG.md` mirrors the same data in Markdown — keep them in sync
- Version bumps are **user-triggered only** — never bump without being asked

## Git Workflow

- Commit and push after every change — do not batch unrelated fixes into one commit
- Credentials are cached; `git push` from Bash works without user intervention
- Target branch: `main` → auto-deploys to GitHub Pages

## Key Files

- `D:\Claude Work\LCARS.html` — entire app (single file, all JS/CSS/HTML inline)
- `D:\Claude Work\LCARS-Guide-v2.html` — user guide (opened via Dashboard button)
- `D:\Claude Work\CHANGELOG.md` — human-readable version history
