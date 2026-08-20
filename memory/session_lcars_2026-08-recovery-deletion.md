# Session 3 — account recovery and true deletion (2026-08-19)

_Follows `session_lcars_2026-08-platform-plan.md` (hosting, storage, sync) and
`session_lcars_2026-08-views.md` (the view layer). Read both first — their
landmines all still apply._

Merged to `main` and live. **Not cut as a version** — the changelog has an
Unreleased block in `CHANGELOG.md` and a `pending` entry in the `VERSIONS`
array. Version bumps stay the user's to trigger.

## The decision that shaped everything

How a writer who lost their PIN gets back in, given the auth address is
synthetic (`<writerid>@lcars.local`) and cannot receive mail.

**Settled: no Edge Function, no email provider, no domain, no secrets.**

| Need | Mechanism |
|---|---|
| Remove a login — the anon key cannot | `security definer` Postgres function in `supabase/schema.sql` |
| Recover a forgotten PIN | a linked Google or Discord identity on the same auth user |

Two findings did the work, both verified against sources rather than assumed:

1. **"Server-side" did not have to mean an Edge Function.** A `security definer`
   Postgres function runs as the database owner, is callable over PostgREST with
   the anon key, lives in the schema file the user already applies by hand, and
   travels with the database if the fleet ever takes over hosting.
2. **Supabase's built-in mailer only delivers to project team members**, not
   just rate-limited. That killed "use the built-in reset flow" outright, and
   with it the case for making a real email the auth identity.

Rejected, with reasons — **do not re-litigate**:

- **Resend + Edge Function.** Needs a verified domain, so it needs money. The
  user will not pay anything.
- **Real email as the auth identity.** Costs the no-lookup sign-in and leaks a
  Writer-ID→email oracle, and still needs a paid sender. Strictly worse.
- **One-time recovery code.** User's words: "feels sloppy". Retention is poor
  anyway — plan for single-digit percent.

## What shipped

| Area | Outcome |
|---|---|
| Deletion | Two-stage. Asking stamps `writers.deleted_at`; the login goes only after a **48-hour grace period**, via `purge_expired_deletions()`. Cancelling restores everything. |
| Purge | Lazy — runs on any signed-in boot. No scheduler, no `pg_cron`. |
| Linking | Google and Discord, from Settings → Your Account & Data → Linked accounts. Optional and additive. |
| Sign-in | "Continue with Discord / Google" on the gate. Writer ID resolved from the writers row under RLS. |
| Recovery | "Forgotten your PIN?" → provider sign-in → set a new PIN from that session. |
| The offer | A **step of the gate**, shown once per account after signup or sign-in. |
| Removed | `recovery_email` entirely — column dropped, UI gone. Nothing was ever sent to it. |

## Architecture — do not re-derive

- **Linking is additive, deliberately.** The provider is a second identity on the
  same auth user. Writer ID + PIN stays primary, so the auth address is still
  derived from the typed Writer ID with no server lookup. That is the whole
  reason this beats changing the auth identity.
- **Linking without `supabase-js`.** The hard part is that linking needs the JWT,
  which cannot ride on a top-level navigation. `GET /auth/v1/user/identities/authorize`
  with **`skip_http_redirect=true`** returns `{"url": ...}` as JSON instead of a
  302, so the authenticated call goes over `fetch` and only the navigation after
  it is plain. Confirmed in `supabase/auth`'s `internal/api/identity.go`.
- **An identity has two ids and the naming is inverted.** `identity_id` is the
  uuid the unlink endpoint accepts; `id` is the *provider's* user id (a Discord
  snowflake). Sending `id` fails with "identity_id must be an UUID". See
  `identityKey()`.
- **`sessionStorage` carries the OAuth intent** (`link` / `signin` / `recover`)
  across the redirect. The return leg has no other way to tell a link from a
  sign-in, and they end very differently.
- **The reversible half of deletion needs no privileges.** Stamping `deleted_at`
  is an ordinary update under the existing `writers_own` policy. Only the purge
  is elevated, and it takes no arguments — the worst a caller can do is hasten a
  deletion already due.
- **`link_prompt_seen` lives on the writers row, not in localStorage**, so the
  offer follows the writer and is made exactly once across devices.

## Landmines — added this session

- **`applyRoute()` begins with `closeModal()`, and `bootRoute()` runs at boot.**
  Anything raised before routing settles is torn down the instant the route
  resolves. Cost an hour: the post-deletion notice worked from the dashboard and
  vanished when deleted from `/settings`. `bootRoute()` now runs *before*
  anything raises a modal.
- **`#wiz` is z-index 8800; `#mo` is 1000.** A modal opened while the wizard is
  up is not merely ugly — it is invisible, and a prompt nobody can see is a
  prompt nobody can dismiss.
- **A view drawn while signed out is wrong the moment that changes.** Settings
  renders an entirely different card offline, and nothing redrew it after
  sign-in, so a writer who had just created an account was still being invited
  to create one — and that button reopens the gate. An inescapable loop. See
  `refreshAuthDependentViews()`.
- **Never raise a prompt from boot.** Boot runs on *every* page load, including
  a direct hit on `/settings`. Three attempts at the linking offer failed on
  this before it moved into the gate, which owns the screen at that moment.
- **The gate element is `#auth-gate`, not `#gate`,** and `gateClose()` removes it
  rather than hiding it. Assertions against `#gate` pass vacuously.

## Test harness

Rebuilt in the scratchpad, **not committed**. Rebuild it; it earns its keep
every session.

- `run.sh` — starts the server, waits for it, runs its argument, tears down.
  Background servers do not survive between tool calls; always go through this.
- `suite.sh` — all sixteen scenarios in one command.
- `lib.js` — launch, `dismissIntro`, `ok`, `report`. Filters sandbox noise
  (external hosts are blocked, so Google Fonts always fails).
- `smoke.js` — boot + a function-presence list. The guard against the splice
  landmine, since a deleted block still parses.
- `account-check.js` — `normal | pending | offline | signin`
- `oauth-check.js` — `link | error | unlink | prompt`
- `recover-check.js` — `signin | recover | orphan | denied`
- `signup-check.js` — `from-gate | from-settings | already-asked | already-linked | signout`
- `notice.js`, `route-check.js`
- `fninv.sh <ref>` — function-inventory diff. Run before every commit.

Harness traps found the hard way, all fixed but worth knowing:

- `dismissIntro` **marks the wizard seen**. Any test about first-run behaviour
  must not use it.
- `page.addInitScript` **re-runs on every navigation**, so seeding a session
  there puts it back after a sign-out reload. Guard with `sessionStorage`.
- Playwright's **glob route matcher does not handle a scheme wildcard** and
  silently matches nothing, which hangs the run. Use a URL predicate.
- **A mock is only your model of the API.** The single-`id` identity mock passed
  happily while every real unlink failed. When something breaks live, fix the
  mock first, then prove it goes red before fixing the code.

## What I could not test, and it matters

**The sandbox blocks all outbound hosts** — `supabase.com`, `*.supabase.co`,
`discord.com`, even the app's own Vercel URL, all return `403 CONNECT tunnel
failed`. Every check runs against an intercepted Supabase. Docs were read from
the `supabase/supabase` and `supabase/auth` repos on GitHub raw, which is
reachable.

So the user is the only route to real verification, and it found four real bugs
the harness could not: the unlink id, the settings loop, the invisible prompt,
and the boot-time interruption. Budget for a test round after every step.

## Not verified

- Linking a provider account already linked to a **different** Writer ID.
  `prettyOAuthError` has a translation for it, but the live refusal text has
  never been seen, so the match may not fire.
- Deleting an account while the server is unreachable — harness only.
- Anything on a phone.
- Supabase's *Require reauthentication for password change* setting is assumed
  off (the user has not touched it). If it is ever turned on, PIN recovery from
  a provider session stops working.

## Next session — roles and the admin panel

Everything is in `ROADMAP.md` under Session 3 → "Still open". The short version:

Writers who linked nothing still need the maintainer, and that gap is what the
panel closes. `writers.role` of `writer` / `moderator` / `super_admin`; the
unlinked "Forgotten your PIN?" route files a request; moderators action the
queue; super admins also assign roles.

Two things to settle at the start:

1. **The maintainer's real Writer ID.** Needed for the one-line SQL that makes
   the first super admin. Asked for twice, never given — ask again.
2. **The temporary-PIN mechanism writes `auth.users.encrypted_password` via
   `crypt()`** in a `security definer` function. It is the one unsupported thing
   in any of this: it touches Supabase's internal schema and breaks if they
   change password hashing. Recoverable, but decide it deliberately.

Agreed scope, already discussed: moderators see the request queue only, not a
writer list. A reset hands the moderator a temporary PIN to pass on however they
already talk to that person; the writer changes it on next sign-in.

## Working notes on the user

- Wants the method argued through **before** any code, with costs named. Says so
  explicitly and means it.
- Will not spend money. Free tiers only, and no new services to operate.
- Tests carefully on the Vercel preview and reports precisely. Trust the reports.
- Prefers fewer moving parts over more capability.
- Sends corrections mid-turn; read them as they arrive.

---

# Session 4 — roles and the admin panel (2026-08-19)

Built, committed, **not yet applied to the live project and not verified
against it.** The sandbox blocks every outbound host, so all of it was proved
against an intercepted Supabase — same limitation as session 3, same
consequence: the user is the only route to real verification.

## Settled with the user, do not re-litigate

- **The temporary PIN writes `auth.users.encrypted_password` via `crypt()`.**
  Chosen with the cost named: it is the one unsupported thing in the schema,
  and if Supabase changes password hashing the issued PIN simply will not work.
  The fallback — approval mints a one-time token, the writer sets their own PIN
  through the supported API — is written into `admin_action_reset()`'s comment
  so it does not have to be re-derived.
- **The maintainer's Writer ID is `V239806K11`.** Asked for across three
  sessions; it is now in the schema's bootstrap comment.
- **The oracle question is moot** — Writer IDs are already public. Unknown IDs
  are still dropped silently, but the reason is "do not reveal who holds an
  account", not the IDs themselves.
- **Moderators see the queue only.** No writer list, no access to sims.
- **Every request is kept forever.** Archive tab, with who decided and when.
- **Rejecting takes a confirmation.**
- **"Request a PIN reset" is offered to everyone**, not only the unlinked. The
  user's point: someone whose linked account is misbehaving needs the same
  door, and making people diagnose themselves before they can ask for help is
  the wrong shape.

## Architecture

- **`my_role()` exists to break an RLS recursion.** The queue's policy needs the
  caller's role, which lives in `writers`, whose own policy would ask again —
  Postgres calls that infinite recursion and fails at query time, not deploy
  time. A `security definer` read breaks the loop.
- **Client-side guards are cosmetic and the code says so.** The header button,
  the view, `isModerator()` — all conveniences. RLS on `pin_reset_requests` and
  the role tests inside the functions are the boundary. `/admin` as a writer
  draws a refusal card rather than an empty queue.
- **`request_pin_reset()` is the schema's only anonymous write** — necessarily,
  the requester has no session. Rate limit (one open request per ID, none
  within an hour) and note validation live inside the function, not in a policy.
- **`must_change_pin` makes a temporary PIN last exactly one sign-in.** A PIN
  read out over Discord is not a PIN.
- **Actioning deletes the target's `auth.sessions`.** If the reason for the
  reset was that somebody else got in, leaving their session alive defeats it.
- **`admin_set_role()` refuses to demote yourself.** With no super admin left
  the only way back is another hand-run statement.

## Landmines — added this session

- **The Delta Prime intro fires on a 400ms timer and painted over whatever boot
  had raised.** Found by the harness, not by reading. It was covering the
  choose-your-own-PIN prompt, which is `noCancel` — so a writer would have
  carried on using a PIN a moderator had read. `maybeShowStyleIntro()` now
  checks `#mo` is hidden as well as the route. Any *new* boot-time prompt needs
  the same thought: this is the third bug in this family.
- **`Content-Range` is a cross-origin header and is invisible unless exposed.**
  The badge count reads it. Real Supabase names it in
  `Access-Control-Expose-Headers`; the first mock did not, which is what made
  the count go red. Fix the mock first — it was right to.
- **Routing is off when served as `/LCARS.html`**, so a back-button assertion
  passes or fails for the wrong reason. Test `applyRoute()` directly.

## Test harness

Rebuilt in the scratchpad, **not committed** — `lib.js`, `run.sh`, `suite.sh`,
`smoke.js`, `regress.js`, `admin-check.js` with modes
`moderator | writer | action | reject | roles | request | temppin | route`.
`smoke.js` carries the function-presence list, which is the guard against the
splice landmine. All green at commit d4adc47.

Traps, on top of session 3's: seeding `seenStyleIntro` with a value that does
not match `STYLE_VERSION` raises the intro over everything; and the belt-and-
braces `closeModal()` after boot will tear down the very prompt a test is
about — `temppin` has to skip it.

## Added after the first round, at the user's request

The roster. They asked for a writer list rather than the typed lookup I
recommended, having seen the panel: Writer ID, display name, join date, role,
scrollable, filterable, with the role set from its own row.

- **`admin_list_writers()`, not a widened policy on `writers`.** Loosening
  `writers_own` would put a role test on the table every writer reads on every
  boot, and a mistake there would be a mistake in everyone's boot path. The
  function is the same permission narrowed to one role and six columns. Nothing
  about anyone's sims, no auth identities.
- **Setting the role from the row removed the retyping step**, which was the
  real risk in the first version — looking someone up and then typing their
  Writer ID into a separate box is two chances to promote the wrong person.
- **`openModal` has no cancel callback.** Cancel just hides it. A dropdown left
  showing a role that was never set reads as though it had been, so
  `setRoleFromRow()` watches `#mo` and snaps the select back.
- Own row disabled (the function refuses self-demotion anyway); accounts inside
  their deletion window are marked and dimmed.

## Live status, 2026-08-20

Schema applied, bootstrap run, **the panel and the roster are confirmed working
against the real project by the user.** So `my_role()`, the RLS on
`pin_reset_requests`, and `admin_list_writers()` are all proven live.

**Still unproven: the `crypt()` call.** Nobody has yet issued a temporary PIN
and signed in with it. That is the one part of the design that could turn out
not to work at all, and the fallback is in `admin_action_reset()`'s comment.

## Merging with main, 2026-08-20

Main gained bullets and an Academy rework while this branch was open. One
conflict, in the pending changelog entry, both sides appending — kept both.
Main's six entries had reached the `VERSIONS` array but never `CHANGELOG.md`;
mirrored across during the merge. **Worth checking that mirror on any merge** —
the rule is easy to half-keep.

## Next

1. **Prove the temporary PIN end to end.** File a request against a spare Writer
   ID, action it, sign in with what comes out.
2. Session 4 of the roadmap — read-only share links — is next in priority order.
