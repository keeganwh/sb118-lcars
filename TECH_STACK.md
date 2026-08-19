# LCARS SB118 Writing Tool — Tech Stack

```stack
data:supabase
backend:vercel-serverless
lib:none
```

_The whole stack at a glance. Current app version: **4.23**._

## The short version

A **dependency-free vanilla web app** — no framework, no bundler, no npm, no transpiler. It ships as three files that share one codebase (`LCARS.html`, `lcars.css`, `lcars.js`), hosted on Vercel, with Supabase behind it for accounts and cross-device sync. Every network call is made with plain `fetch`, so the app can still be collapsed back into a single self-contained file and run offline with no network at all.

Live at **https://sb118-lcars.vercel.app/**. GitHub Pages still serves the same `main` behind a notice pointing people at the new address.

## Layers

| Layer | Choice | Notes |
|-------|--------|-------|
| **Framework** | None (vanilla JS) | Plain DOM APIs. No React/Vue/jQuery, no transpiler. |
| **Build / tooling** | None | No bundler, no `package.json`, no CI build. Edit, commit, done. |
| **Views / routing** | History API | One app, three views (`#workspace`, `#view-settings`, `#view-manifest`) under one header. `showView()` is the only place a view changes. Views are hidden, never torn down, so an open sim survives navigation. |
| **Editor** | Native `contenteditable` | The `#editor` div. Rich text via `document.execCommand` plus custom debounced transform passes (markers, name-bolding, character colouring). |
| **Local storage** | `localStorage` | The local cache and the offline source of truth. `lcars_v1` (`SKEY`) data, `lcars_style_v1` skin mirror, `lcars_auth_v1` / `lcars_mode_v1` session. Per-origin, so previews hold separate data. |
| **Accounts & sync** | Supabase | Project `nyjpqaelilrqzmnangft`. Tables `writers`, `state`, `snapshots`, all under RLS. Reached over plain `fetch` — no SDK, no CDN script. Sign-in is Writer ID + PIN; the auth email is derived as `<writerid>@lcars.local` so sign-in needs no server lookup. |
| **Snapshots** | Own Supabase table | Fetched on demand rather than carried in the synced payload, capped at ten per sim on both sides. |
| **Offline** | First-class mode | The first-run gate offers an account or offline-only. Every network call is gated on `isCloud()`. |
| **Hosting** | Vercel | `vercel.json` rewrites `/`, `/settings`, `/manifest` to `LCARS.html` and `/guide` to the guide, and sets no-cache headers on the three app files. |
| **Serverless** | `api/download.js` | Re-inlines the three files into one self-contained `LCARS.html` on demand, so "download one file and run it offline" still holds. |
| **Styling / UI** | Hand-written CSS | LCARS-inspired. Classic skin (Dark / Light / High-contrast) plus the Delta Prime skin, via CSS variables. Resizable sidebar panels. |
| **Fonts** | Google Fonts | Droid Sans preloaded. UI and editor fonts user-selectable from ~56 families, loaded dynamically by injecting a `<link>`. |
| **Auth secrets** | Anon key only | The Supabase anon key is embedded in the page and safe there — RLS protects the data. The `service_role` key must never appear in this repo or the app. |

## Key files

| File | Role |
|------|------|
| `LCARS.html` | Markup and the pre-paint skin script (~400 lines). |
| `lcars.css` | All styling (~1,100 lines). The `RESPONSIVE` section at the foot must stay last. |
| `lcars.js` | All behaviour (~7,200 lines), including `APP_VERSION` and `VERSIONS`. |
| `api/download.js` | Serverless route rebuilding the single offline file. |
| `supabase/schema.sql`, `supabase/README.md` | Database schema and setup steps. |
| `vercel.json` | Route rewrites and cache headers. |
| `LCARS-Guide-v2.html` | User guide, served at `/guide`. Predates accounts; rewrite is on the roadmap. |
| `CHANGELOG.md` | Human-readable version history (mirrors the `VERSIONS` array). |
| `memory/` | Cross-session project memory (committed to GitHub). |

## Versioning

- `APP_VERSION` and the `VERSIONS` array are at the top of `lcars.js`, right after `const SKEY` (line ~5).
- `CHANGELOG.md` mirrors `VERSIONS` in Markdown — the two are kept in sync.
- Version bumps are **user-triggered only**.

## External dependencies at runtime

1. **fonts.googleapis.com / fonts.gstatic.com** — Google Fonts. The app still works offline with system fallbacks.
2. **nyjpqaelilrqzmnangft.supabase.co** — accounts and sync. Skipped entirely in offline mode.

No third-party JavaScript is loaded, ever. That is what keeps the single-file offline download honest.

## Still to decide / watch

- **PIN reset is not self-serve.** The synthetic auth email cannot receive mail, so the built-in reset flow has nowhere to send. Method is unsettled — see `ROADMAP.md` session 3.
- **True account deletion** needs the `service_role` key, so it needs an Edge Function. Today "delete account" clears the data rows but leaves the login registered.
- **Supabase free tier** is ~500 MB of database, enough for roughly 250–500 writers at 1–2 MB each, and pauses a project after ~1 week idle.
- **Mobile** — the header, Settings and the Manifest are responsive; the editor, toolbar and the two resizable sidebars are not yet.
