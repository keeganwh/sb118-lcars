# LCARS SB118 Writing Tool — Roadmap

_Outstanding work only, grouped in phases. Current version: **4.22**._

Each item has a **Done when…** so any session can pick it up and run without asking. Check items off (`- [x]`) as they ship, and delete them once they're rolled into a released version's changelog. This is a living doc — add new outstanding work here rather than in scattered notes.

> **Planned 2026-08-14.** A major platform shift was scoped this session: move off GitHub Pages + Gist onto Vercel + Supabase, with real logins keyed to Writer IDs, automatic cloud sync, Joint Posts, and a Google Groups browser extension. The phases below replace the old Phase 1 Gist-ceiling work — the ceiling stops existing once data moves to a database. Full plan detail lives in `memory/session_lcars_2026-08-platform-plan.md`.

---

## Phase 1 — Hosting move (do first, low risk)

- [x] **Deploy from Vercel instead of GitHub Pages.** — _done 2026-08-14._
      Live at **https://sb118-lcars.vercel.app/**. `vercel.json` rewrites `/` → `/LCARS.html` and `/guide` → the user guide; `LCARS.html` is served `must-revalidate` so deploys reach users on next load. `LCARS-prototype.html` removed from the repo (was being served publicly, nothing referenced it).

- [ ] **Grace period on GitHub Pages.**
      Pages is still live and still auto-deploys from `main`. Add a banner on the Pages build pointing at the Vercel URL, then retire Pages once writers have moved.
      _Done when: Pages either shows the banner or is switched off, and no one is landing on the old URL unaware._

- [ ] **Custom domain (optional).**
      Can be added in Vercel settings at any time without redoing anything.
      _Done when: decided — a domain is pointed at the deployment, or this is explicitly dropped in favour of the `.vercel.app` subdomain._

> **Origin change caveat:** `localStorage` is per-origin, so data on the Pages URL does **not** appear on the Vercel URL. Until Phase 2 lands, moving between them needs a Backup Data export + Import, or a Gist pull. Phase 2 removes this problem permanently.

---

## Phase 2 — Accounts and cloud data

Branch `claude/cloud-sync`. **Built and testing; not yet merged to `main`.**

- [x] **Supabase schema + row-level security.** — `supabase/schema.sql`, run 2026-08-14.
- [x] **Auth: Writer ID + PIN.** Account email derived as `<writerid>@lcars.local`, so signing in needs no server lookup. Optional recovery email stored.
- [x] **Replace the Gist sync layer.** `saveToCloud`/`loadFromCloud` over plain fetch — no CDN client, so the file stays single and dependency-free. `schedSync` kept its name and signature. PAT and Gist ID fields removed.
- [x] **Offline / no-account path.** First-run gate offers an account or offline-on-this-device. Every network call gated on `isCloud()`.
- [x] **Snapshots moved out of the synced payload** into their own table, fetched on demand, with a one-time backfill of existing local history.
- [x] **Migration.** Restoring a backup now uploads immediately.
- [x] **Removals.** Google Docs / Markdown importer, Gist PAT UI.

- [ ] **Cross-device verification.** _Deferred — no second device to hand._ Incognito sign-in confirmed data is served from the account rather than local storage, which covers the core promise. Still unverified: snapshot history fetched on a genuinely different device.
      _Done when: a sim written on device A shows its full snapshot history on device B._

- [ ] **Read-only share links — sims only.**
      `share_token` on a doc plus a `/s/<token>` route. Scenes explicitly out of scope.
      _Done when: a share URL opens in a logged-out private window, renders the sim, and nothing is editable._

- [ ] **Self-serve PIN reset.**
      Currently a forgotten PIN is reset by hand from the Supabase dashboard, because the auth email is synthetic and cannot receive mail. Needs an Edge Function plus an email sender, keyed off `writers.recovery_email`.
      _Done when: a writer who gave a recovery email can reset their own PIN without the maintainer._

- [ ] **Retire the GitHub Pages address.**
      Pages now shows a dismissible notice pointing at the Vercel URL. Switch Pages off once writers have moved.
      _Done when: Pages is disabled and nobody is landing on the old URL._

**Dropped: Google / Discord sign-in.** Writer ID + PIN is sufficient, and the fleet's own SSO is the likely long-term route — building OAuth now would mean building it twice.

---

## Phase 2.5 — Onboarding and the guide

Needed before this is shared with anyone else.

- [ ] **Intro wizard on first run.**
      Three audiences: writers new to LCARS entirely, existing writers meeting the online version for the first time (what changed, what an account gets them, that their old data needs a backup and restore), and anyone who wants to skip straight in.
      _Done when: a first-time visitor reaches a written sim without asking anyone how, and the skip option is always one click away._

- [ ] **Rewrite the user guide.**
      `LCARS-Guide-v2.html` predates accounts, the Delta Prime skin and the importer removal. Starting fresh is likely cleaner than patching it.
      _Done when: the guide matches the shipped app, with no references to Gist, PATs or the Markdown importer._

---

## Phase 2.6 — Mobile

Flagged as important, not urgent. Needs the user's testing and feedback to drive it.

- [ ] **Make the app usable on a phone.**
      The layout assumes a wide screen with two resizable sidebars, and the editor toolbar is dense. Expect real work in the sidebars, the toolbar and the editor itself.
      _Done when: a sim can be read, written and copied out on a phone without pinch-zooming._

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
