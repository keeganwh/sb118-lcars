# LCARS SB118 Writing Tool — Roadmap

_Outstanding work only, in the user's priority order. Current version: **4.22** (unreleased changes pending)._

Each item has a **Done when…** so any session can pick it up and run without asking. Check items off (`- [x]`) as they ship, and delete them once they're rolled into a released version's changelog.

> **Context.** The platform shift shipped 2026-08-14: Vercel hosting, Supabase accounts keyed to Writer IDs, automatic sync, an offline path, an onboarding wizard and a migration flow off GitHub Pages. What shipped, why, and the landmines are in `memory/session_lcars_2026-08-platform-plan.md` — **read that first.**

Live at **https://sb118-lcars.vercel.app/**. GitHub Pages still serves the same `main` with a moving notice.

---

## Session 1 — Foundation: split the file and add routing

Not a tidy-up done first — it is what `/settings`, `/manifest` and `/s/<token>` are built on. Multiple views cannot share 7,500 lines without it.

**Decided architecture** (settled 2026-08-14, do not re-litigate):

| File | Role |
|---|---|
| `lcars.css` / `lcars.js` | shared by every page |
| `LCARS.html` | the app — dashboard, editor, **settings**, **manifest**, each with its own URL |
| `share.html` | minimal read-only sim viewer for `/s/<token>` — no auth, no editor |
| `guide.html` | standalone, rewritten in session 5 |

Settings and Manifest become **routed views inside the one app**, not separate HTML files. They get real URLs, are bookmarkable and work with the back button, but the app shell is not torn down — so popping open the Manifest mid-sim leaves the editor and its unsaved keystrokes intact, and the auth gate does not re-run on every navigation. Share links are the opposite case: a genuinely separate minimal page, so someone clicking a link does not download the whole application.

- [x] **Split `LCARS.html` into `LCARS.html` + `lcars.css` + `lcars.js`.**
      Relative paths, so the app still runs on GitHub Pages and from a local folder. No behaviour change of any kind.
      _Done when: the app loads from three files with no visible difference, and a full browser pass (gate, wizard, editor, manifest, settings, sync) shows no console errors._

- [x] **Add History API routing.**
      `/` dashboard, `/settings`, `/manifest`. Back and forward work; a direct hit on `/settings` loads straight there. `vercel.json` rewrites the routes to `LCARS.html`; on GitHub Pages, which has no rewrites, the app still works from the root and the routes degrade to the dashboard.
      _Done when: each view has its own URL, the back button moves between them, and reloading on any of them lands in the right place._

- [x] **Keep the offline download a single file.**
      A Vercel serverless route that inlines the three back together on demand, so "download and run offline" still means one file. The Settings download button points at it.
      _Done when: the downloaded file opens from disk with the network off and works fully._

> **Landmine:** structural edits to this file have already silently deleted an entire module once — a syntax check cannot see a valid block going missing. Verify in the headless browser after every step (Playwright at `/opt/node22/lib/node_modules/playwright`; watch `pageerror`).

---

## Session 2 — Settings page and account management

- [ ] **Move Settings out of the modal to the `/settings` view.**
      The panel is overstuffed. Regroup it while moving. Build it responsive from the start so the later mobile session does not have to redo it.
      _Done when: settings is its own view with its own URL, every existing setting still works, and it is usable on a phone._

- [ ] **Make the Manifest a full view rather than an overlay.**
      Same treatment: its own URL at `/manifest`, responsive from the start. The open sim must survive navigating to it and back.
      _Done when: the Manifest has its own URL, and opening it mid-sim leaves the editor exactly as it was._

- [ ] **Account management.**
      Change PIN, update or add a recovery email, see which Writer ID you are signed in as, sign out, delete account. Gathers the scattered account bits into one place.
      _Done when: a writer can change their PIN and recovery email without leaving LCARS._

---

## Session 3 — Server functions (one Edge Function, two features)

Both are blocked on the same thing: the `service_role` key, which must never be in a page served to writers. Do them together.

- [ ] **Self-serve PIN reset.**
      Distinct from the recovery email we already store — that is currently just text for identification, nothing sends to it. Needs the function plus an email sender, keyed off `writers.recovery_email`.
      _Done when: a writer who gave a recovery email can reset their own PIN without the maintainer._

- [ ] **True account deletion.**
      Today "delete account" removes every data row but leaves the login registered, because the anon key cannot delete an auth user. The function closes that gap.
      _Done when: deleting an account also removes the login, freeing the Writer ID to be registered again._

---

## Session 4 — Read-only share links

- [ ] **Shareable sim links — sims only.**
      `share_token` on a doc plus a `/s/<token>` route served by `share.html` — a minimal page with no auth and no editor, so a share link does not drag the whole app down with it. Scenes explicitly out of scope. Responsive from the start — these will be opened on phones constantly.
      _Done when: a share URL opens in a logged-out private window, renders the sim, and nothing is editable._

---

## Session 5 — Version cut and guide rewrite

- [ ] **Cut a release.** A large pending changelog block has built up under 4.22. **Ask the user before cutting** — version bumps are theirs to trigger.
- [ ] **Rewrite the guide.**
      `LCARS-Guide-v2.html` predates accounts, Delta Prime and the importer removal. Start fresh and fundamentally rethink the format rather than patching.
      _Done when: the guide matches the shipped app, with no references to Gist, PATs or the Markdown importer._

---

## Next priority

- [ ] **Google Groups extension.**
      New `extension/` directory, MV3, content script scoped to `groups.google.com`, porting the existing dev-console script into a "Send to LCARS" button. Writes to Supabase as an inbox row so LCARS need not be open. Loaded unpacked.
      _Done when: a real thread can be grabbed and appears in the LCARS inbox with formatting intact._
      _An iframe cannot work — Google sends `X-Frame-Options`. A bookmarklet is fragile against their CSP._

- [ ] **Mobile optimisation.**
      Deliberately after the feature reworks so it covers them. New pages built in sessions 2 and 4 should already be responsive, leaving the editor, toolbar and the two resizable sidebars as the real work.
      _Done when: a sim can be read, written and copied out on a phone without pinch-zooming._

- [ ] **Joint Posts.**
      Turn-based with live presence: invite by Writer ID, accept, one soft edit lock at a time, others see "X is writing…" via Supabase Realtime. Tables `jp_members`, `jp_lock`, `invitations`; docs gain `docType`; RLS widens to "own rows OR rows you're a member of."
      _Done when: two browsers with two Writer IDs can invite, accept and hand the lock back and forth without clobbering each other, and a non-member cannot load the doc._
      _Explicitly NOT building: simultaneous typing. CRDT/OT on a hand-rolled `contenteditable` is the largest and riskiest work available, for something PBEM does not need._

---

## Low priority

- [ ] **Reconcile prompt — add an "I'm not sure" option.**
      When this browser and the account both hold sims, offer a third choice that merges the two (union of missions, scenes and docs) rather than picking a winner. Safest default for anyone unsure.
      _Done when: choosing it keeps every sim from both copies._

- [ ] **Character wiki import.**
      `parseServiceRecordWikitext()` / `parseRibbonsWikitext()` as inverses of the existing `copySRWikitext` / `copyRibbonsWikitext` / `copyMissionLogWikitext`. Fetch by URL via the MediaWiki API through a serverless proxy for CORS; also accept pasted wikitext. Match against `RIBBON_CATALOG` / `buildRibbonLookup`, surfacing unmatched names rather than guessing filenames. Preview → confirm → merge, never blind overwrite.
      _Done when: a known character's wiki page imports with service record and ribbons matching the page._
      _While in here: the service-record, ribbon and alias editors are index-addressed in inline handlers despite rows carrying stable `id`s, and `moveRibbon` reorders the raw array while the view may be sorted._

---

## Remind me later

- [ ] **Cross-device snapshot check.** Probably works; fix surgically if not. _Done when: a sim written on device A shows its full snapshot history on device B._
- [ ] **Retire GitHub Pages.** No harm in it running while it actively forwards people to Vercel. _Done when: Pages is switched off._
- [ ] **Sim-parsing integration** _(friend's side project)._ Copy/paste multiple sims, parse the components, recombine. Overlaps conceptually with Joint Posts — compare notes before building either.

---

## Decided against

- **Snapshot diffs.** Dropped 2026-08-14. The benefit disappeared when snapshots moved out of the synced payload — they are no longer re-uploaded on every save, and the table has no practical size limit at this scale. Diffs would add a failure mode (one corrupt diff breaks the reconstruction chain) to solve a problem that no longer exists.
- **Custom domain.** Not happening; the `.vercel.app` subdomain stands.
- **Google / Discord sign-in.** Writer ID + PIN is sufficient, and the fleet's own SSO is the likely long-term route — building OAuth now would mean building it twice.

---

## How to use this file

1. Work top-down. Sessions 1–5 are ordered by dependency as well as priority.
2. When you finish an item, check it off in the same commit as the code change.
3. When a version is cut, move the shipped items' descriptions into `CHANGELOG.md` and delete them here.
4. Never let an item sit without a **Done when…** — if you can't write one, it's not ready to be on the roadmap.
