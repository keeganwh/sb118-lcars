# LCARS SB118 Writing Tool — Changelog

## v1.1 — 2026-06-29

- Fixed: italic/highlight formatting persisting past closing marker delimiter when inserted via toolbar buttons
- Fixed: comms button cursor landing inside closing `=/\=` delimiter
- New Mission dialog: renamed "Sim Type" → "Mission Type" and "Stardate Year" → "OOC Year"
- Nav hierarchy now shows IC year alongside OOC year (e.g. `2026 (2403 IC)`)
- Migrated to GitHub repository and deployed on GitHub Pages
- Added GitHub Gist auto-sync for cross-device personal data (auto-push 60s after save, auto-pull on load)
- Added Settings → Cloud Sync section with PAT/Gist ID inputs and manual push/pull buttons
- Added Settings → Version section with current version and expandable changelog
- Added "Learn How to Use This Tool" button on Dashboard linking to the user guide
- Added README.md and CHANGELOG.md to repository

## v1.0 — 2026-06-29

Initial release.

- Full sim writing editor with contenteditable rich text
- Mission / Scene / Sim hierarchy with year grouping (OOC + IC year display)
- Script markers: `::Action::`, `=/\= Comms =/\=`, `oO Thoughts Oo`, `((Location))`, `((OOC))`
- Visual Aids toggles to highlight/dim each marker type
- Toolbar marker-insertion buttons with two-phase cursor placement
- Auto Format: auto-bold names, italic thoughts, bold locations, italic OOCs
- Character auto-detection and per-character colour coding
- Character Manifest with service record, postings, and ribbons
- Sim Templates — save, apply, and manage reusable templates
- Revision snapshots with browse and restore
- Full-text search across all sims
- Dashboard with stats bar, in-progress, recently posted, and quick actions
- Academy Mode with restricted formatting rules
- Export (JSON backup) and Import (JSON restore + Markdown import)
- Dark / Light / LCARS theme switcher
- Resizable sidebar panels
