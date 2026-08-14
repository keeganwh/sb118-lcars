# LCARS SB118 Writing Tool — Roadmap

_Outstanding work only, grouped in phases. Current version: **4.22**._

Each item has a **Done when…** so any session can pick it up and run without asking. Check items off (`- [x]`) as they ship, and delete them once they're rolled into a released version's changelog. This is a living doc — add new outstanding work here rather than in scattered notes.

> **Planned 2026-08-14.** A major platform shift was scoped this session: move off GitHub Pages + Gist onto Vercel + Supabase, with real logins keyed to Writer IDs, automatic cloud sync, Joint Posts, and a Google Groups browser extension. The phases below replace the old Phase 1 Gist-ceiling work — the ceiling stops existing once data moves to a database. Full plan detail lives in `memory/session_lcars_2026-08-platform-plan.md`.

---

## Phase 1 — Hosting move (do first, low risk)

- [ ] **Deploy from Vercel instead of GitHub Pages.**
      Connect the repo to Vercel, add `vercel.json` rewriting `/` → `/LCARS.html`, point a domain at it. Keep Pages live in parallel for a grace period with a banner pointing at the new URL.
      _Done when: the new URL serves the current app, existing `localStorage` data is untouched, Gist sync still works, and pushing to `main` still auto-deploys._

---

## Phase 2 — Accounts and cloud data (the main work)

Branch `claude/cloud-sync`. Large and multi-commit — do not develop this on `main`.

- [ ] **Supabase schema + row-level security.**
      Tables: `writers`, `state` (the JSON payload), `snapshots` (extracted from inside each doc). Character pictures move from base64 `pictureDataUrl` into Supabase Storage. RLS so a writer reads/writes only their own rows.
      _Done when: a writer's data round-trips through the database and a second writer's session cannot read it._

- [ ] **Auth: Writer ID + PIN, plus Google/Discord.**
      Writer ID path via synthetic email (`<writerid>@lcars.local`) so standard session machinery is reused. OAuth providers enabled in Supabase; first OAuth login prompts once for the Writer ID.
      _Done when: signing in on a fresh browser by either route restores the writer's sims with no tokens, files, or manual steps._

- [ ] **Replace the Gist sync layer.**
      `pushToGist`/`pullFromGist` → `saveToCloud`/`loadFromCloud`, preserving existing call sites (`flushSave`, `setStatus`, Ctrl+S, boot). Debounce tightens 60 s → ~5 s. The three-tier pull fallback is deleted — it only ever worked around Gist CORS and truncation. `persist()` keeps writing `localStorage` as an offline cache, reconciled by `updated_at`.
      _Done when: edits appear on a second device within seconds, and pulling the plug mid-session loses nothing._

- [ ] **One-time migration.**
      On first login, if `lcars_v1` exists locally and the cloud is empty, upload and confirm. Also accept a `.lcars` file via the existing `onImportFile`.
      _Done when: the real ~913 KB dataset migrates with nothing truncated._

- [ ] **Offline / no-account path.**
      First screen offers *Sign in* or *Use offline*. Offline downloads `LCARS.html` and runs local — no account, no network calls, export/import only. Gated by `S.settings.mode = 'local' | 'cloud'`.
      _Done when: the downloaded file opens from disk with the network off, edits and exports normally, and logs no errors from absent cloud calls._

- [ ] **Removals.**
      Delete the Google Docs / Markdown importer (hidden input, `markdownToHtml` through `createImportedSim`, and the Settings entry) — keep the shared `cleanPasteHTML`. Delete the Gist PAT field and its instructions. **Keep** `exportData`/import as a manual escape hatch, demoted in the UI.
      _Done when: no PAT or Google Docs copy remains anywhere in the UI, and manual backup still works._

- [ ] **Read-only share links — sims only.**
      `share_token` on a doc plus a `/s/<token>` route. Scenes are explicitly out of scope.
      _Done when: a share URL opens in a logged-out private window, renders the sim, and nothing is editable._

---

## Phase 3 — Joint Posts (depends on Phase 2)

- [ ] **New sim class: JP, turn-based with live presence.**
      Owner creates a JP, invites writers by Writer ID, they accept, it appears in their sidebar. One writer holds a soft edit lock at a time; others see "X is writing…" and receive changes on save, via Supabase Realtime. New tables `jp_members`, `jp_lock`, `invitations`; docs gain `docType: 'sim' | 'jp'`; RLS widens to "own rows OR rows you're a member of."
      _Done when: two browsers with two Writer IDs can invite, accept, hand the lock back and forth without clobbering each other, and a non-member cannot load the doc._

- [ ] **Explicitly NOT building: simultaneous typing.**
      Two cursors in one paragraph needs CRDT/OT layered onto a hand-rolled `contenteditable` — the largest and riskiest piece of work available. Revisit only if turn-based proves insufficient in practice.

---

## Phase 4 — Character wiki import (independent — can run early)

Currently one-way: three generators emit MediaWiki markup, nothing reads it.

- [ ] **Parse wikitext back in.**
      `parseServiceRecordWikitext()` and `parseRibbonsWikitext()` as inverses of the existing `copySRWikitext` / `copyRibbonsWikitext` / `copyMissionLogWikitext`. Fetch by URL via the MediaWiki API (`?action=raw`) through a small Vercel serverless proxy for CORS; also accept pasted wikitext. Match ribbon names against the existing `RIBBON_CATALOG` / `buildRibbonLookup`; surface unmatched names for manual pairing rather than guessing a filename. Import preview → confirm → merge, never blind overwrite.
      _Done when: a known character's wiki page imports with service record and ribbons matching the page, and exporting back produces equivalent wikitext._

- [ ] **Fix the array editors while in here.**
      Switch the service-record, ribbon and alias editors from index-addressed inline handlers to the stable `id`s the rows already carry. Fix `moveRibbon`, which reorders the raw array while the view may be sorted, so display and stored order can diverge.
      _Done when: deleting or reordering a row mid-edit no longer mis-targets a neighbouring row._

---

## Phase 5 — Google Groups extension (self-contained, own session)

- [ ] **Small MV3 browser extension.**
      New `extension/` directory. Content script scoped to `groups.google.com`, porting the existing dev-console script into a "Send to LCARS" button on a thread. Extracts author, date, subject, body; writes to Supabase as an inbox row so LCARS need not be open. LCARS grows an "Incoming sims" tray. Loaded unpacked — no store submission.
      _Done when: a real thread can be grabbed and appears in the LCARS inbox with formatting intact._
      _Note: an iframe cannot work — Google sends `X-Frame-Options` on Groups. A bookmarklet is fragile against their CSP. The extension is the only durable approach._

---

## Phase 6 — Backlog / later

- [ ] **Split `LCARS.html` into `LCARS.html` + `lcars.css` + `lcars.js`.**
      Vercel serves static siblings with no build step. **Catch:** the offline path promises one downloadable file, so this needs a serverless route that inlines the three back together on demand. Do this *after* Phases 1–2 — the gain is developer velocity, not user-facing function.
      _Done when: the site loads from three files and the offline download is still a single working file._

- [ ] **Snapshot diffs — only if still needed.**
      Moving snapshots into their own table (Phase 2) takes them out of the hot path and captures most of the benefit. Diffs shrink storage further but add a failure mode where one corrupted diff breaks reconstruction.
      _Done when: a decision is recorded here — implement or explicitly defer, with measured sizes as the reason._

- [ ] **Multi-sim parsing integration** _(friend's side project)._
      Copy/paste multiple sims, parse the components, recombine into one document. Tested as integrating well with LCARS. Overlaps conceptually with Joint Posts — compare notes before building either.
      _Done when: the side-developed approach is ready to integrate, then wired into the editor._

- [ ] **Delta Prime follow-ups.**
      - [ ] Gather feedback on Delta Prime vs Classic, then decide whether Classic stays supported long-term or is retired.
      - [ ] Test Epic mood on integrated graphics before considering it as a default — `backdrop-filter` on region surfaces is the one real performance risk (StyleHandoff §7).

- [ ] _Add real feature requests here as they come up._ Keep each one to a one-line description plus a **Done when…** so it's pickup-ready.

---

## Superseded

The old Phase 1 (data-size indicator, solving the 1 MB Gist ceiling, hardening the three-tier pull fallback) is **dropped, not forgotten** — moving to a database removes the ceiling entirely rather than working around it. If Phase 2 stalls or is abandoned, restore those items from git history; they were the correct fix for the Gist architecture.

Documentation (old Phase 2) is complete: `ROADMAP.md`, `TECH_STACK.md`, `USER_PROTOCOLS.md`, `CLAUDE.md` all current.

---

## How to use this file

1. Work top-down by phase; Phase 1 first. Phase 4 is independent and can jump the queue.
2. When you finish an item, check it off in the same commit as the code change.
3. When a version is cut ("save new version X.Y"), move the shipped items' descriptions into `CHANGELOG.md` and delete them here.
4. Never let an item sit without a **Done when…** — if you can't write one, it's not ready to be on the roadmap.
