# LCARS SB118 Writing Tool — Changelog

## v4.2 — 2026-07-14

- Fixed: removing a character via the Manifest caused the panel to break — clicking another character required a full page refresh to recover
- Added: Google Fonts support — UI font and editor font can be set independently (or linked) via Settings → UI Preferences, with a searchable list of 56 popular Google Fonts
- Added: Scene Partner reporting to Mission and Scene detail views — shows which characters your characters appear alongside, with scene and sim counts
- Added: Top Scene Partners panel to Character Manifest sidebar — shows top 5 co-occurring characters across all sims
- Fixed: Create a new Scene / Write a new Sim cards wrapping to a second row on the Mission detail view
- Layout: mission/scene action cards moved inline with title (right-aligned) instead of above it
- Fixed: Gist push was double-serializing data (JSON string inside JSON), inflating file size ~2x
- Fixed: importing a Gist file directly via backup/restore now unwraps the Gist sync envelope automatically
- Fixed: Gist pull failing with "Failed to fetch" on new/different computers — CORS preflight issue on `gist.githubusercontent.com`; now tries without Authorization header as a middle step, then falls back to the API content field with a clear error if data is too large
- Fixed: marking a sim/scene/mission active, complete, or archived via the context menu now triggers a Gist auto-sync after 5 seconds (previously only editor saves did, after 60 s)
- Improved: Link insertion (Ctrl+K / 🔗) now detects when cursor is inside an existing link — opens in Edit mode pre-populated with current URL, with a Remove Link button; new links get `target=_blank`
- Fixed: link insertion was always inserting at the start of the sim — selection was lost when the modal input took focus; range is now saved before the modal opens and restored before execCommand runs
- Fixed: closing the link modal scrolled the sim back to the top
- Fixed: selecting text in the editor would frequently collapse — background timers called `restoreCaret` which wiped the selection; timers now bail out if a non-collapsed selection is active
- Fixed: empty lines (blank paragraphs) sometimes compressed into a single line break when copying to external apps
- Fixed: copy-paste now preserves bold on `((Location))` markers and italic on `((OOC))` markers when those auto-format settings are enabled
- Added: ¶ paragraph marker toggle button — shows a faint ¶ at the end of each paragraph to make structure visible while editing
- Layout: moved Auto Format and Visual Aids dropdowns from toolbar row 2 to title row 1 to free up horizontal space
- Layout: moved ⚠ title-duplicate warning to left of the title input; ✕ close button now rightmost in title row
- Added: optional "Started" date field to scenes — set via New Scene modal or right-click → Edit Scene; shown in scene detail view; used as the staleness fallback when a scene has no sim activity
- Added: scenes in the nav sidebar show a faint amber dot after 2 days or red dot after 3 days of no posting/completion activity, with day count in small text alongside the dot
- Fixed: stale indicator could wrongly suppress for scenes whose sims had been recently edited; now records an explicit `completedAt` timestamp only on actual status transition to complete
- Fixed: currently-open sim showing blue title even when marked complete — CSS override now only applies to active sims
- Fixed: opening Settings and saving would silently erase `boldLocations` and `italicOOC` prefs set via the Auto Format toolbar
- Fixed: right-clicking a scene and choosing + New Sim now correctly pre-selects that scene and its parent mission in the New Sim modal
- Added: right-clicking a sim in the sidebar now shows "Move to Scene…" — reassign to any non-archived scene/mission, grouped by mission
- Added: ↕ Sort button in the sidebar header for scene sort order — 8 options: Sim Posting (recent/last), Due Status (stalest/freshest), Alphabetical (A–Z / Z–A), Scene Start (recent/last); persists to profile
- Fixed: changing scene sort order now re-renders the sidebar immediately
- Fixed: completed scenes no longer compete in Due Status sort orders — they sink to the bottom regardless of start date

## v4.1 — 2026-06-29

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

## v4.0 — 2026-06-29

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
