# LCARS SB118 Writing Tool — Roadmap

_Outstanding work only, in the user's priority order. Current version: **4.23**, released 2026-08-15. There are unreleased pending changelog entries in `VERSIONS` awaiting the next bump._

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

## Session 2 — Settings page and account management ✅ _shipped 2026-08-15_

All three items done, plus additions from review: a display name, Share my
contact, sim templates edited in the sim editor, and the "built with Claude
Code" note moved off the Dashboard into About LCARS.


- [x] **Move Settings out of the modal to the `/settings` view.**
      The panel is overstuffed. Regroup it while moving. Build it responsive from the start so the later mobile session does not have to redo it.
      _Done when: settings is its own view with its own URL, every existing setting still works, and it is usable on a phone._

- [x] **Make the Manifest a full view rather than an overlay.**
      Same treatment: its own URL at `/manifest`, responsive from the start. The open sim must survive navigating to it and back.
      It currently carries a header of its own — a second Sim Editor / Settings bar inside `#char-manifest` — so it looks like a different application. It should sit under the same app header as every other view.
      _Done when: the Manifest has its own URL, wears the same header as the rest of the app, and opening it mid-sim leaves the editor exactly as it was._

- [x] **Account management.**
      Change PIN, update or add a recovery email, see which Writer ID you are signed in as, sign out, delete account. Gathers the scattered account bits into one place.
      _Done when: a writer can change their PIN and recovery email without leaving LCARS._

---

## Session 3 — Account recovery and true deletion

**Method settled 2026-08-19, do not re-litigate.** No Edge Function, no email
provider, no domain, no secrets. Two mechanisms carry the whole session:

| Need | How |
|---|---|
| Remove a login (anon key cannot) | `security definer` Postgres function in `supabase/schema.sql` |
| Recover a forgotten PIN | a linked Google or Discord identity on the same auth user |

Options weighed and rejected: emailing `writers.recovery_email` via Resend (needs
a paid domain and a vendor), making the real email the auth identity (costs the
no-lookup sign-in and leaks a Writer-ID→email oracle — and Supabase's built-in
mailer only delivers to project team members anyway, so it was never an option),
and a one-time recovery code (the user found it sloppy, and retention is poor).

- [x] **Self-serve PIN reset.**
      Writer ID + PIN stays the primary sign-in, so the auth address is still
      derived from the Writer ID with no server lookup. A linked provider is an
      *additional* identity on the same auth user — a faster way in, and the way
      back in. "Forgotten your PIN?" → sign in with the linked account → set a
      new PIN from that session. `recovery_email` is gone entirely.
      _Done when: a writer who has lost their PIN can get back into their account without the maintainer._
      _Caveat: only for writers who linked something. Everyone else still needs
      the maintainer — that gap is what the admin panel below closes._

- [x] **True account deletion.**
      `purge_expired_deletions()` does what the anon key cannot. Deletion is
      two-stage: asking stamps `writers.deleted_at` (an ordinary update under the
      existing RLS policy — nothing privileged in the reversible half), and the
      login goes only once a **48-hour grace period** lapses. Purge runs lazily
      on any signed-in boot rather than depending on a scheduler.
      _Done when: deleting an account also removes the login, freeing the Writer ID to be registered again._

### Still open — next session

- [ ] **Roles and the admin panel.**
      For writers with nothing linked, who are the ones who actually need help.
      `writers.role` of `writer` / `moderator` / `super_admin`. A "Forgotten your
      PIN?" route for the unlinked files a request; moderators action the queue,
      super admins also assign roles. Bootstrapping the first super admin is one
      hand-run SQL statement — **the maintainer's real Writer ID is needed for
      it and was never given, so ask.**
      Agreed scope: moderators see the request queue only, not a writer list.
      A reset hands the moderator a temporary PIN to pass on however they
      already talk to that person; the writer changes it on next sign-in.
      _Done when: a writer with no linked account can ask for a PIN reset, and any moderator can action it without leaving LCARS._
      _The temporary-PIN half writes `auth.users.encrypted_password` via `crypt()`
      in a `security definer` function. That is the one unsupported thing in any
      of this — it touches Supabase's internal schema and would break if they
      change password hashing. Recoverable (fix the function, reset again), but
      decide deliberately rather than by accident._

- [ ] **Two edge cases never exercised against the live project.**
      1. Linking a provider account already linked to a *different* Writer ID.
         Should refuse with "That account is already linked". The translation
         exists in `prettyOAuthError`, but the live refusal text has never been
         seen, so the match may not fire.
      2. Deleting an account while the server is unreachable. Covered by
         `account-check.js offline`, never done by hand.

- [ ] **Orphaned auth users.** Logins whose `writers` row was deleted by hand
      still hold their Writer ID. Find with a left join from `auth.users`; delete
      from the dashboard or with a `created_at` guard so an in-progress signup is
      never caught. Historical only — deletion through LCARS no longer does this.

---

## Session 4 — Read-only share links

- [ ] **Shareable sim links — sims only.**
      `share_token` on a doc plus a `/s/<token>` route served by `share.html` — a minimal page with no auth and no editor, so a share link does not drag the whole app down with it. Scenes explicitly out of scope. Responsive from the start — these will be opened on phones constantly.
      _Done when: a share URL opens in a logged-out private window, renders the sim, and nothing is editable._
      _`writers.display_name` now exists and is set from Settings, but nothing displays it to anyone yet. This is the first surface that could — a share link showing "by <display name>" rather than a Writer ID._

---

## Session 5 — Guide rewrite

- [x] **Cut a release.** 4.23 shipped 2026-08-15 — fifty entries covering accounts, Supabase, the file split, routing, the Settings page and the Manifest view. _Version bumps stay the user's to trigger; never bump unasked._
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
      Deliberately after the feature reworks so it covers them. Settings, the Manifest and the app header were done in session 2, leaving **the editor, the toolbar and the two resizable sidebars** as the remaining work — the whole workspace view, in other words.
      _The responsive rules live in one `RESPONSIVE` section at the foot of `lcars.css`, after the skin overrides, deliberately: rules placed earlier are silently outranked by the Delta Prime blocks. Breakpoint in use is 820px._

      **Observed on a real phone, v4.23:** the reworked pages are usable, but two
      problems run across the whole app.
      1. *The page zooms in when a field is focused.* Almost certainly iOS Safari's
         auto-zoom, which fires on any focused input under 16px. `.mi` / `.ms` are
         `0.87rem` and `#search-input` is `0.8rem` against a 15px UI base — about
         13px and 12px. Fix is to floor form controls at 16px on coarse pointers
         rather than to disable zoom with `maximum-scale`, which breaks pinch-zoom
         for everyone. Not verified on device, so confirm before building on it.
      2. *Buttons do not all fit.* Expected — only the header, Settings and the
         Manifest were made responsive in session 2. The editor toolbar, the sim
         details panel and the two resizable sidebars were never touched.
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
