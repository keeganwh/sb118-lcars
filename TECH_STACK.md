# LCARS SB118 Writing Tool — Tech Stack

```stack
data:supabase
backend:vercel-serverless
lib:none
```

_The whole stack at a glance. Current app version: **4.24**._

## The short version

A **dependency-free vanilla web app** — no framework, no bundler, no npm, no transpiler. It ships as four files that share one codebase (`LCARS.html`, `lcars.css`, `lcars.js`, `lcars-render.js`), hosted on Vercel, with Supabase behind it for accounts and cross-device sync. Every network call is made with plain `fetch`.

**The single-file offline download is frozen at v4.24** (decided 2026-08-24; landed 2026-08-26, verified booting clean from `file://` at `21d8aec` — v4.24 plus the changes pending for the next version). It is no longer the constraint it was: features that need the server are deliberately not carried into it, and a purpose-built simplified "LCARS Lite" is the preferred future answer rather than a bigger inliner. **This is what unblocks a build step** — a bundler no longer costs the one-file copy, because the one-file copy has stopped growing. The no-dependency design still stands on its own merits and is not up for grabs.

Live at **https://sb118-lcars.vercel.app/**. GitHub Pages still serves the same `main` behind a notice pointing people at the new address.

## Layers

| Layer | Choice | Notes |
|-------|--------|-------|
| **Framework** | None (vanilla JS) | Plain DOM APIs. No React/Vue/jQuery, no transpiler. |
| **Build / tooling** | None | No bundler, no `package.json`, no CI build. Edit, commit, done. |
| **Views / routing** | History API | One app, four views (`#workspace`, `#view-settings`, `#view-manifest`, `#view-admin`) under one header. `showView()` is the only place a view changes. Views are hidden, never torn down, so an open sim survives navigation. _`#view-manifest` is being renamed to Characters — `ROADMAP.md` → Batch 1._ |
| **Editor** | Native `contenteditable` | The `#editor` div. Rich text via `document.execCommand` plus custom debounced transform passes (markers, name-bolding, character colouring). |
| **Local storage** | `localStorage` | The local cache and the offline source of truth. `lcars_v1` (`SKEY`) data, `lcars_style_v1` skin mirror, `lcars_auth_v1` / `lcars_mode_v1` session. Per-origin, so previews hold separate data. |
| **Accounts & sync** | Supabase | Project `nyjpqaelilrqzmnangft`. Tables `writers`, `state`, `snapshots`, all under RLS. Reached over plain `fetch` — no SDK, no CDN script. Sign-in is Writer ID + PIN; the auth email is derived as `<writerid>@lcars.local` so sign-in needs no server lookup. |
| **Recovery** | Linked OAuth identity | A Google or Discord account can be linked to the same auth user — a second way in, and the way back from a forgotten PIN. No email is involved anywhere; the synthetic address cannot receive mail and Supabase's built-in mailer only delivers to project team members. |
| **Privileged operations** | `security definer` Postgres functions | Removing a login and purging an expired deletion are beyond the anon key. They run as database-owner functions declared in `supabase/schema.sql` and called over PostgREST — deliberately **not** Edge Functions, so there are no server secrets and nothing to deploy separately. |
| **Account deletion** | Two-stage, 48-hour grace | Asking stamps `writers.deleted_at`; the login goes only after the window, via `purge_expired_deletions()`. Signing back in within 48 hours cancels it and restores everything. |
| **Snapshots** | Own Supabase table | Fetched on demand rather than carried in the synced payload, capped at ten per sim on both sides. |
| **Offline** | First-class mode | The first-run gate offers an account or offline-only. Every network call is gated on `isCloud()`. |
| **Hosting** | Vercel | `vercel.json` rewrites `/`, `/settings`, `/manifest` to `LCARS.html` and `/guide` to the guide, and sets no-cache headers on the three app files. |
| **Serverless** | `api/download.js` | Re-inlines the app files into one self-contained `LCARS.html` on demand. **Frozen at v4.24 — do not extend, and do not add a fourth inline.** Refuses to build if a new shared file lands, rather than silently shipping a copy missing it. |
| **Styling / UI** | Hand-written CSS | LCARS-inspired. Classic skin (Dark / Light / High-contrast) plus the Delta Prime skin, via CSS variables. Resizable sidebar panels. |
| **Fonts** | Google Fonts | Droid Sans preloaded. UI and editor fonts user-selectable from ~56 families, loaded dynamically by injecting a `<link>`. |
| **Auth secrets** | Anon key only | The Supabase anon key is embedded in the page and safe there — RLS protects the data. The `service_role` key must never appear in this repo or the app. |

## Key files

| File | Role |
|------|------|
| `LCARS.html` | Markup and the pre-paint skin script (~400 lines). |
| `lcars.css` | All styling (~1,240 lines). The `RESPONSIVE` section at the foot must stay last. |
| `lcars.js` | All behaviour (~9,500 lines), including `APP_VERSION` and `VERSIONS`. |
| `lcars-render.js` | The sim render pass (`lrToReadingHtml()`), shared by the app and the share viewer. Loaded **before** `lcars.js`. |
| `share.html`, `share.js` | The standalone read-only viewer at `/s/<token>`. |
| `api/download.js` | Serverless route rebuilding the single offline file. **Frozen — finished, not maintained.** |
| `supabase/schema.sql`, `supabase/README.md` | Database schema and setup steps. |
| `vercel.json` | Route rewrites and cache headers. |
| `LCARS-Guide-v2.html` | User guide, served at `/guide`. Predates accounts, Joint Posts and share links; ground-up rebuild is Batch 9. |
| `CHANGELOG.md` | Human-readable version history (mirrors the `VERSIONS` array). |
| `memory/` | Cross-session project memory (committed to GitHub). |
| `ROADMAP.md` | Outstanding work, scored and grouped into **batches** by code locality. |

## Versioning

- `APP_VERSION` and the `VERSIONS` array are at the top of `lcars.js`, right after `const SKEY` (line ~5).
- `CHANGELOG.md` mirrors `VERSIONS` in Markdown — the two are kept in sync.
- Version bumps are **user-triggered only**.

## External dependencies at runtime

1. **fonts.googleapis.com / fonts.gstatic.com** — Google Fonts. The app still works offline with system fallbacks.
2. **nyjpqaelilrqzmnangft.supabase.co** — accounts and sync. Skipped entirely in offline mode.

No third-party JavaScript is loaded, ever. That is what keeps the single-file offline download honest.

## Still to decide / watch

- **A writer who never linked an account and forgets their PIN still needs the maintainer.** That is the accepted residual case, and the `/admin` PIN-reset queue is what narrows it; linking is nudged once, and retention is expected to be low.
- **Supabase free tier** is ~500 MB of database, enough for roughly 250–500 writers at 1–2 MB each, and pauses a project after ~1 week idle. An admin usage overview is Batch 5, which is what will make this measurable rather than estimated.
- **Mobile** — the header, Settings and the Manifest are responsive; the editor, toolbar and the two resizable sidebars are not yet. Batch 4.
- **The payload blob is the central structural constraint.** `saveToCloud()` POSTs the entire payload on every save, so the cost of one sentence scales with everything ever written. It is why share links are snapshot copies, why two tabs of one account clobber each other, and why the Google Groups extension is blocked. The staged migration out of it is Batch 6.
- **SB118 HQ is the shape of the future.** It owns accounts and character data. LCARS should not duplicate what HQ tracks — that is why the character wiki import was scrapped and why Service History and Ribbons are being removed. Keep an identity seam for HQ SSO; that is also why Google/Discord were rejected as a primary sign-in.
- **A build step is now permitted in principle**, given the frozen download. It is still not wanted casually — the zero-dependency design is deliberate — but Yjs no longer has to be vendored to protect a file that has stopped changing.
