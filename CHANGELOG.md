# LCARS SB118 Writing Tool — Changelog

## v4.22 — 2026-08-13

- New look: **Delta Prime** is now the default skin — same layout and controls, rebuilt on a new surface, type and shape system (elbow frames, accent-filled section caps, a hero stat strip, ruled tables, Space Grotesk + Public Sans)
- Added: **Style ▾** menu in the top bar with three independent settings — Duty Post (Command / Science / Operations / Medical accent), Appearance (Light / Dark / System) and Mood (Calm / Epic). Changes apply immediately, no Save button
- Added: Calm is warm bone and graphite with solid panels; Epic is a cool deep-space field with duty-lit washes, frosted region surfaces and accent glow. Both share every dimension, radius, font and layout rule
- Added: the duty post accent resolves per (duty × light/dark × calm/epic) rather than one hex per post, so warm light fields get the muted accent and dark modes get the lighter one
- Added: one-time "A new look" introduction on first load after upgrading, with the three style controls live inside it so the app can be previewed behind the window; reopen any time from Style ▾ → *What's new*
- Added: the classic 4.21 LCARS look (Dark / Light / High Contrast) is still available and fully supported — switch back via Style ▾ → *Revert to the classic LCARS look*, the theme dropdown, or Settings → UI Preferences → Visual Style
- Added: style changes animate with a circular reveal expanding from the control you clicked (View Transitions API); skipped automatically when the browser lacks support or the OS requests reduced motion
- Added: Appearance → System follows the operating system light/dark setting and re-resolves live when it changes
- Changed: the skin is applied from a tiny separate `localStorage` mirror before first paint, so the app never boots in the wrong look and corrects itself
- Changed: Public Sans and Space Grotesk are only fetched when Delta Prime is active — classic users load no extra fonts
- Fixed: the UI font chosen in Settings still overrides the skin body font, as it did before
- Note: Delta Prime is new and still being tuned — feedback on it, or on staying with Classic LCARS, is welcome
- Changed: every emoji in the interface replaced with inline **Lucide** SVG icons, drawn in the current text colour and sized in `em` so they scale with the UI font setting and match in both skins. The icon set is an inline `<symbol>` sprite, so the app stays a single dependency-free file
- Fixed: Search / Sort / Details and the panel collapse arrows were nearly invisible in Delta Prime — they sit on the accent-filled panel header and were inheriting a translucent ink colour instead of the accent ink
- Fixed: the style-change reveal did not appear to come from the control clicked — it expanded from the control's centre, which on a segmented button is up to ~34px from where the pointer actually was. The origin now follows the pointer, falling back to the control centre for keyboard activation. Blending is left at the browser default, which keeps the softer edge
- Fixed: the Delta Prime / Classic LCARS buttons in Settings were unreadable in dark mode — they render as outlined buttons on the panel, so they were picking up the dark accent ink meant for solid accent fills
- Fixed: dashboard and detail-view titles were tinted cold blue, which clashed with the warm Calm palette — titles are now ink, per the style guide rule that hierarchy is typographic rather than chromatic. Blue and gold stay reserved for active / complete status
- Changed: in Epic the editor keeps a flat background instead of the duty-lit gradient, which stays on the dashboards — a gradient behind long-form writing was distracting
- Fixed: the sim title in the editor was still cold blue in Delta Prime — it is set as an inline style by status, which no stylesheet rule could override. Active titles now use a `--title-active` token so each skin decides; Delta Prime keeps them ink, Classic keeps its blue. Complete (gold) and archived (dim) are unchanged in both
- Changed: the editor text caret follows the duty accent in Delta Prime rather than the status blue
- Fixed: the Style menu's revert button showed raw SVG markup as text — the label is rebuilt on every style change and was being written through `textContent`, which cannot carry markup
- Fixed: the Sim Details panel's open/close chevron pointed the wrong way — it now mirrors the left sidebar, pointing right to collapse the panel rightwards and left to reopen it
- Fixed: modal text was hard to read in Epic — dialogs were being frosted like region surfaces, and a 55% panel over the dimmed backdrop mixed down to a murky grey. Modals are now solid in Epic; blur stays on regions only, per the style guide

## v4.21 — 2026-08-12

- Fixed: browser tab title was still showing v4.0; updated to reflect the current version
- Changed: Clear Format toolbar button now shows a 🧹 icon instead of text; tooltip clarifies that auto-formatting (bold names, locations, etc.) is not affected
- Changed: Indent and Outdent buttons now use ⇥ / ⇤ symbols instead of wide →| / |← text
- Fixed: Copy button tooltip was misleading; now says "Copy sim to clipboard"
- Added: marker insertion buttons replaced by a compact "Insert ▾" dropdown that opens on hover or click; toggle between dropdown and individual buttons in Settings → Toolbar
- Added: paste cleanup — extra consecutive blank lines in pasted content are automatically collapsed to one; a dismissible "Extra blank lines removed / Undo" banner appears above the editor for 8 seconds
- Layout: moved Auto Format ▾ and Visual Aids ▾ back to toolbar row 2 (right side), clearing row 1 to just title + close; both dropdowns now open on hover as well as click; Insert ▾ moved inline with other row-2 buttons
- Removed: ↑ Narrate experimental narration-import button and its modal/logic — unreliable in practice; a more robust multi-sim parsing integration is planned instead
- Fixed: "StartFragment"/"EndFragment" text sometimes leaking into copy/pasted output (mostly Discord, occasionally email) — comment nodes are now stripped both when copying out and when pasting in, so they can no longer round-trip through the editor
- Fixed: auto-italic `oO Thoughts Oo` were not copying out italicized (only manual italics survived) — the CSS-only italic on `.tm` is now converted to a real `<em>` on copy, matching how `((OOC))` italics are handled
- Fixed: the first line of a copied sim (often the `((Location))` line) sometimes pasted in a different font, as though it were a header — bare top-level inline/text nodes are now wrapped in a `<div>` on copy so every line has the same block structure
- Added: Ctrl+S (Cmd+S on Mac) while a sim is open now saves a revision snapshot and immediately syncs to your Gist (if configured), with a brief confirmation toast
- Added: stale markers (amber ≥2 days / red ≥3 days since last post or completion) now show in the Mission dashboard SCENES table next to each scene status (Active/Completed), matching the sidebar indicators
- Added: "SINCE LAST POST" stat on the Command Dashboard showing days since your most recently posted sim, tinted amber at ≥2 days and red at ≥3 days
- Fixed: copying from the editor with Ctrl+C (no manual selection) now works the same as the 📋 button — the copy handler previously bailed out when the selection was collapsed, causing the browser to fall back to its own clipboard with raw markup, losing formatting and blank lines in Discord
- Fixed: copy/paste to Discord (and other apps reading text/plain) was losing all line breaks and paragraph spacing — caused by innerText on a detached DOM node having no layout context and silently concatenating all text; now walks block children manually and joins with newlines

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
