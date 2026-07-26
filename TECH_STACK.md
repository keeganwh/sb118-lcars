# LCARS SB118 Writing Tool — Tech Stack

_The whole stack at a glance. Current app version: **4.2**._

## The short version

A **single-file, zero-dependency web app**. Everything — HTML, CSS, and JavaScript — lives inline in `LCARS.html` (~6,850 lines). No framework, no build step, no server, no npm. Open the file in a browser and it runs.

## Layers

| Layer | Choice | Notes |
|-------|--------|-------|
| **Framework** | None (vanilla JS) | Plain DOM APIs. No React/Vue/jQuery. No transpiler. |
| **Build / tooling** | None | No bundler, no package.json, no CI build. Edit the file, commit, done. |
| **Editor** | Native `contenteditable` | The `#editor` div. Rich text via `document.execCommand` + custom transform passes (markers, name-bolding). |
| **Data / storage** | `localStorage` | Primary data under key `lcars_v1` (`SKEY`). Sync config under `lcars_sync_v1` (`SYNC_KEY`). Per-browser, per-origin — no data shared between users. |
| **Cloud sync** | GitHub Gist API | Optional cross-device personal sync via a user-supplied PAT + Gist ID. Auto-push ~60s after an editor save, ~5s after a status change; auto-pull on load when the Gist is newer. PAT is **not** synced — re-entered per device. |
| **Styling / UI** | Hand-written CSS (inline) | LCARS-inspired theming. Dark / Light / LCARS theme switcher via CSS variables (`--accent`, etc.). Resizable sidebar panels. |
| **Fonts** | Google Fonts | Droid Sans preloaded in `<head>`. UI and editor fonts are user-selectable from ~56 Google Fonts, loaded dynamically by injecting a `<link>` (see `LCARS.html:1246`). |
| **Hosting** | GitHub Pages | Auto-deploys from the `main` branch (~30s). `.nojekyll` present so Pages serves files as-is. |
| **Auth** | None | No accounts, no login. "Identity" is just whichever browser/localStorage you're in. Gist sync uses the user's own GitHub PAT, stored locally. |

## Key files

| File | Role |
|------|------|
| `LCARS.html` | The entire app — all HTML/CSS/JS inline. |
| `LCARS-Guide-v2.html` | Standalone user guide, opened from the Dashboard. |
| `CHANGELOG.md` | Human-readable version history (mirrors the `VERSIONS` array). |
| `README.md` | Public-facing overview + feature list. |
| `memory/` | Cross-session project memory (committed to GitHub). |

## Versioning

- `APP_VERSION` and the `VERSIONS` array live near the top of the script in `LCARS.html` (right after `const SKEY`, ~line 981).
- `CHANGELOG.md` mirrors `VERSIONS` in Markdown — the two are kept in sync.
- Version bumps are **user-triggered only**.

## External dependencies at runtime

Only two outbound calls, both optional to the core experience:

1. **fonts.googleapis.com / fonts.gstatic.com** — Google Fonts. App still works offline with system fallbacks.
2. **api.github.com / gist.githubusercontent.com** — only if the user has configured Gist cloud sync.

Everything else is self-contained in the one file.

## Still to decide / watch

- **Gist 1 MB ceiling.** User data is ~913 KB and the GitHub API content field truncates near 1 MB. No decision yet on the long-term fix — candidates are chunking across multiple Gist files or compressing the payload. See `ROADMAP.md`.
- **Storage backend.** `localStorage` has its own (~5–10 MB) per-origin cap. If data keeps growing, IndexedDB is the natural upgrade path — not yet needed, not yet decided.
