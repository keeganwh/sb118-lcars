# Platform shift — planned and shipped 2026-08-14

_Read this before starting any `ROADMAP.md` phase. Supersedes the July session log for anything to do with hosting, storage or sync._

## State as of end of session

- **Live at https://sb118-lcars.vercel.app/** — Vercel serves `LCARS.html` at the root via `vercel.json`.
- GitHub Pages still live, serving the same `main`, now showing a moving notice.
- All work merged to `main`. Version still **4.22** with a long pending changelog block — **not yet cut as a release.**
- Supabase project `nyjpqaelilrqzmnangft`. Schema in `supabase/schema.sql`, setup steps in `supabase/README.md`.

## What shipped

| Area | Outcome |
|---|---|
| Hosting | Vercel. `vercel.json` rewrites `/` → `/LCARS.html`, `/guide` → the guide. `LCARS-prototype.html` deleted. |
| Accounts | Writer ID + PIN. Auth email derived as `<writerid>@lcars.local`, so sign-in needs no server lookup. Optional recovery email. |
| Sync | Supabase over plain `fetch` — no CDN client, so the file stays single and dependency-free. `saveToCloud`/`loadFromCloud`. `schedSync` kept its old name and signature, so call sites were untouched. |
| Offline | First-run gate offers account or offline-only. Every network call gated on `isCloud()`. |
| Snapshots | Moved to their own table, fetched on demand, ten-per-sim cap both sides, one-time backfill of existing local history. |
| Migration | Old address gets a notice with **Move My Stuff** — sign in there, sims upload, then forwarded to the new address. Restoring a backup also uploads immediately. |
| Onboarding | Getting Started wizard, two routes (new writer / arriving from the old version), reopenable from the Dashboard. |
| Danger zone | Erase all data; delete account (signed in only). Both need the word typed out. |
| Removed | Gist sync entirely (PAT + Gist ID), Google Docs / Markdown importer. |

## Decisions and why — do not re-derive

- **Supabase, not Vercel alone.** Vercel hosts; it does not store or authenticate. Free tier (~500 MB db, ~1 GB files) covers ~250–500 writers at 1–2 MB each.
- **Google/Discord sign-in dropped.** Writer ID + PIN is enough, and the fleet's own SSO is the likely long-term route — building OAuth now would mean building it twice.
- **Plain `fetch`, not `@supabase/supabase-js`.** A CDN script would break the offline promise and the single-file principle.
- **Writer ID format is exactly ten characters** — ship letter, four-digit stardate year, two-digit month, two initials, academy digit. `validWriterId` enforces `^[A-Z]\d{6}[A-Z0-9]{2}\d$`. The two initial positions stay loose because that is where the documented exceptions live.
- **Auth user deletion needs the service_role key**, which must never be in a page served to writers. So "delete account" removes all data rows but leaves the login registered; the copy says so. Full removal is manual, or an Edge Function later.
- **PIN reset is not self-serve** for the same reason — the synthetic email cannot receive mail. Reset by hand from Supabase → Authentication → Users.
- **Snapshot diffs deferred.** Moving them out of the payload was most of the win; diffs add a failure mode where one corrupt diff breaks the chain.
- **File splitting deferred.** Three files break "download one file and run it offline". Would need a serverless route that re-inlines them for the download.
- **Simultaneous typing in JPs is explicitly not being built** — CRDT/OT on a hand-rolled `contenteditable` is the largest and riskiest work available, for something PBEM does not need.
- **An iframe cannot grab Google Groups** — `X-Frame-Options`. Extension is the only durable route.

## Key code locations

- Cloud module: search `// CLOUD SYNC (Supabase)` — `SUPA_URL`, `getMode`/`isCloud`, `getAuth`, `supaFetch`, `cloudSignUp`/`cloudSignIn`, `saveToCloud`/`loadFromCloud`, `cloudPayload`, `pushSnapshot`/`fetchSnapshots`/`backfillSnapshots`, `cloudBoot`, `schedSync`.
- Auth gate: `showAuthGate`, `gateChoice`, `gateForm`, `gateSubmit`, `showTransferDone`.
- Moving notice: `showMovedBanner`, `movedBannerApplies` (honours `?moved=1`), `movedTransfer`.
- Wizard: `showWizard`, `WIZ` object, `maybeShowWizard`, `markWizardSeen`.
- Danger zone: `confirmEraseData`/`eraseAllData`, `confirmDeleteAccount`/`deleteAccount`.
- Storage unchanged: `SKEY = 'lcars_v1'`, `loadState`, `persist` (still the local cache and offline source of truth).

## Landmines

- **Never splice `LCARS.html` by searching for a marker without checking what lies between.** Rewriting `applyImport` with the "MOVED NOTICE" comment as the end boundary silently deleted the entire cloud module — a syntax check cannot see a valid block going missing. Verify in a browser after any structural edit.
- **A headless browser is available here** — Playwright at `/opt/node22/lib/node_modules/playwright`, Chromium pre-installed. Load `file:///home/user/sb118-lcars/LCARS.html`, listen for `pageerror`. This is how the deleted-module bug was found; use it after any non-trivial change.
- **Changelog strings are single-quoted** — an unescaped apostrophe is a fatal syntax error. Write entries from a Python file, not an inline heredoc.
- **`localStorage` is per-origin.** Pages, the Vercel production URL and each Vercel preview URL all have separate data. Use the stable branch preview URL when testing so data survives pushes.
- Supabase free tier pauses a project after ~1 week idle; it resumes from the dashboard.
- Don't recreate the `main-ikuxoc` branch.
- `LCARS.html` is ~7,500 lines — read targeted ranges.

## Verified / not verified

Verified in a headless browser: gate, both validation paths, offline route, wizard routes and dismissal, dashboard rows, danger zone gating, moving notice, transfer-done screen (both success and failure variants).

Verified by the user: account creation, `writers` and `state` rows populating, offline mode, backup restore, Move My Stuff uploading.

**Not verified:** snapshot history on a genuinely different device; the reconcile prompt (local and account both holding sims) in real use; anything on mobile.

## Next up

`ROADMAP.md` is current. Mobile and the reconcile prompt are the two most likely sources of early tester feedback.
