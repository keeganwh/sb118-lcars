# Session log — 2026-08-14 — Platform replanning

_Planning session only. No code changed. Read this before starting any of the phases in `ROADMAP.md`._

## State

- Current version **4.22**, deployed on GitHub Pages from `main`.
- No pending changelog entries; working tree was clean at session start.
- Planning was done on branch `claude/project-planning-features-xoyh2t`.

## What happened

The user asked for a feasibility pass across five areas: hosting, data sync, Google Groups import, character/wiki management, and a friend's sim-parsing project. The outcome is a full platform shift, now written into `ROADMAP.md` as Phases 1–6.

## Decisions locked in

| Question | Decision |
|---|---|
| Hosting | **Vercel.** Code stays on GitHub; push still deploys. |
| Data + auth | **Supabase** — Postgres, auth and file storage in one free tier. |
| Login | **Writer ID + PIN as primary**, Google/Discord one-click alongside. Both, because Supabase Auth makes the second nearly free config work. |
| Offline | **A no-account path stays.** Download the single file, run local, export/import only. Some writers want ultra-private. |
| Joint Posts | **Yes — turn-based with live presence.** Explicitly *not* simultaneous typing. |
| Share links | **Sims only.** Not scenes. |
| Character Manager | **Keep**, justified by adding wikitext/URL import. |
| Google Groups | **Browser extension.** Iframe was ruled out. |
| Google Docs import | **Delete.** |
| Gist sync | **Delete**, PAT and all. |

## Reasoning worth not re-deriving

- **Why not Vercel alone?** Vercel hosts, it doesn't store or authenticate. "Just Vercel" still means bolting on a database and hand-rolling login. Supabase free tier (~500 MB db, ~1 GB files) covers roughly 250–500 writers at ~1–2 MB each.
- **Why the Gist ceiling work was dropped.** The old roadmap Phase 1 (chunking or compressing the Gist payload) was the right fix for the Gist architecture. A database removes the ceiling instead of working around it. Those items are recoverable from git history if Phase 2 is ever abandoned.
- **Snapshots are the real size problem.** `doc.snapshots[]` holds **10 full HTML copies of every sim**, and they ride along in every `persist()` and every sync. Extracting them to their own table is most of the win. Diffs were considered and deliberately deferred — they add a failure mode where one corrupted diff breaks the whole reconstruction chain.
- **Why an iframe can't grab Google Groups.** Google sends `X-Frame-Options` on Groups; the browser refuses to render it inside another site. A bookmarklet is fragile against their CSP. An MV3 extension is the only durable route.
- **Why not simultaneous typing in JPs.** Two cursors in one paragraph needs CRDT/OT conflict resolution layered onto a hand-rolled `contenteditable` editor — the largest and riskiest work available in this project, for a workflow that PBEM doesn't really need.
- **File splitting conflicts with the offline promise.** Three files break "download one file and run it." Resolved by splitting for development and adding a serverless route that inlines them back for the download. Sequenced *after* Phases 1–2 so it doesn't complicate everything else.

## Key code locations (from this session's exploration)

Sync layer to replace:
- `getSyncConfig` / `saveSyncConfig` — `LCARS.html:2044-2050`; PAT stored in plaintext `localStorage`
- `pushToGist` — `2060-2093`; `pullFromGist` + three-tier fallback — `2094-2154`
- `schedSync` — `2155-2159` (60 s debounce)
- Call sites to preserve: `flushSave` → `3477`, `setStatus` → `5384`, Ctrl+S → `3507`, boot pull → `7357`
- Settings → Cloud Sync UI — `5665-5690`

Storage:
- `SKEY = 'lcars_v1'` — `1350`; `loadState` — `1479-1482`; `persist` — `1523` (swallows quota errors silently)
- Snapshots live *inside* each doc; written at `3449-3489` and `3492-3516`, capped at 10; browsed by `showHistory` — `3517`
- Character pictures: `pictureDataUrl`, base64 JPEG 200×200 — `7196-7254`

Google Docs importer to delete:
- Hidden input `1339`; `markdownToHtml` through `createImportedSim` — `2168-2450`; Settings entry `5659-5661`
- **Keep** `cleanPasteHTML` (`2801`) — shared with the editor

Character manager (~1,500 lines, `5902-7252`):
- Wikitext generators (one-way today): `copySRWikitext` `6644-6678`, `copyMissionLogWikitext` `6766-6798`, `copyRibbonsWikitext` `7093-7109`
- `RIBBON_CATALOG` `5914-5991`, `ribbonImgUrl` `6812`, `buildRibbonLookup` `6803`
- Known bugs: array editors are index-addressed despite rows carrying stable `id`s (`6572-6588`, `6900-6918`, `7146-7170`); `moveRibbon` (`7079`) reorders the raw array while the view may be sorted (`6831`)

## Landmines

- Data is still ~913 KB against the ~1 MB Gist ceiling **until Phase 2 ships**. Keep taking manual `.lcars` backups until then.
- Phases 2 and 3 are large and multi-commit — branch `claude/cloud-sync`, do not develop on `main`.
- Don't recreate the `main-ikuxoc` branch.
- `LCARS.html` is 7,362 lines — read targeted ranges, not the whole file.

## Next up

Phase 1 (Vercel deploy) is small and self-contained — good next session. Phase 4 (character wiki import) is independent of the platform work and can jump the queue if a quick win is wanted.

**Needed from the user before Phase 1:** a Vercel account connected to the repo, and a decision on the domain name.
**Needed before Phase 2:** a Supabase account and project.
