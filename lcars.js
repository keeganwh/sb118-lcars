// ================================================================
// STORAGE
// ================================================================
const ZWS = String.fromCharCode(0x200B); // zero-width space used as caret anchor after marker spans
const SKEY = 'lcars_v1';

const APP_VERSION = '4.23';
const VERSIONS = [
  {
    version: '4.0',
    date: '2026-06-29',
    changes: [
      'Full sim writing editor with contenteditable rich text',
      'Mission / Scene / Sim hierarchy with year grouping (OOC + IC year display)',
      'Script markers: ::Action::, =/\\= Comms =/\\=, oO Thoughts Oo, ((Location)), ((OOC))',
      'Visual Aids toggles to highlight/dim each marker type',
      'Toolbar marker-insertion buttons with two-phase cursor placement',
      'Auto Format: auto-bold names, italic thoughts, bold locations, italic OOCs',
      'Character auto-detection and per-character colour coding',
      'Character Manifest with service record, postings, and ribbons',
      'Sim Templates — save, apply, and manage reusable templates',
      'Revision snapshots with browse and restore',
      'Full-text search across all sims',
      'Dashboard with stats bar, in-progress, recently posted, and quick actions',
      'Academy Mode with restricted formatting rules',
      'Export (JSON backup) and Import (JSON restore + Markdown import)',
      'Dark / Light / LCARS theme switcher',
      'Resizable sidebar panels',
    ]
  },
  {
    version: '4.1',
    date: '2026-06-29',
    changes: [
      'Fixed: italic/highlight formatting persisting past closing marker delimiter when inserted via toolbar buttons',
      'Fixed: comms button cursor landing inside closing =/\\= delimiter',
      'New Mission dialog: renamed "Sim Type" → "Mission Type" and "Stardate Year" → "OOC Year"',
      'Nav hierarchy now shows IC year alongside OOC year (e.g. 2026 (2403 IC))',
      'Migrated to GitHub repository and deployed on GitHub Pages',
      'Added GitHub Gist auto-sync for cross-device personal data (auto-push 60s after save, auto-pull on load)',
      'Added Settings → Cloud Sync section with PAT/Gist ID inputs and manual push/pull buttons',
      'Added Settings → Version section with current version and expandable changelog',
      'Added "Learn How to Use This Tool" button on Dashboard linking to the user guide',
      'Added README.md and CHANGELOG.md to repository',
    ]
  },
  {
    version: '4.2',
    date: '2026-07-14',
    changes: [
      'Fixed: removing a character via the Manifest caused the panel to break — clicking another character required a full page refresh to recover',
      'Added: Google Fonts support — UI font and editor font can be set independently (or linked) via Settings → UI Preferences, with a searchable list of 56 popular Google Fonts',
      'Added: Scene Partner reporting to Mission and Scene detail views — shows which characters your characters appear alongside, with scene and sim counts; add buttons moved to top-right header',
      'Added: Top Scene Partners panel to Character Manifest sidebar — shows top 5 co-occurring characters across all sims',
      'Fixed: Create a new Scene / Write a new Sim cards wrapping to a second row on the Mission detail view',
      'Layout: mission/scene action cards moved inline with title (right-aligned) instead of above it',
      'Fixed: Gist push was double-serializing data (JSON string inside JSON), inflating file size ~2x; now stores data object directly with backward-compat pull for old format',
      'Fixed: importing a Gist file directly via backup/restore now unwraps the Gist sync envelope automatically, with proper error handling for both old and new formats',
      'Fixed: Gist pull failing with "Failed to fetch" on new/different computers — raw_url fetch could be blocked by CORS preflight on fresh browsers; now tries without Authorization header as a middle step (simple GET, no preflight), then falls back to the truncated API content field with a clear error if data is too large',
      'Fixed: marking a sim/scene/mission active, complete, or archived via the context menu now triggers a Gist auto-sync after 5 seconds (previously only editor saves did, after 60 s)',
      'Improved: Link insertion (Ctrl+K / 🔗) now detects when cursor is inside an existing link — opens in Edit mode pre-populated with current URL, with a Remove Link button; new links get target=_blank',
      'Fixed: link insertion was always inserting at the start of the sim — the selection was lost when the modal input took focus; range is now saved before the modal opens and restored before execCommand runs',
      'Fixed: closing the link modal scrolled the sim back to the top; now uses focus({ preventScroll: true })',
      'Fixed: selecting text in the editor would frequently collapse — background timers (normalize 80ms, transform 600ms, bold-names 900ms) called restoreCaret which wiped the selection; timers now bail out if a non-collapsed selection is active in the editor',
      'Fixed: empty lines (blank paragraphs) were sometimes compressed into a single line break when copying to external apps — now preserved with non-breaking space in clipboard HTML',
      'Fixed: copy-paste now preserves bold on ((Location)) markers and italic on ((OOC)) markers when those auto-format settings are enabled',
      'Added: ¶ paragraph marker toggle button — shows a faint ¶ at the end of each paragraph to make line/paragraph structure visible while editing',
      'Layout: moved Auto Format and Visual Aids dropdowns from toolbar row 2 to title row 1 to free up horizontal space in the toolbar',
      'Layout: moved ⚠ title-duplicate warning to left of the title input; moved ✕ close button to rightmost position in the title row',
      'Added: optional "Started" date field to scenes — set via New Scene modal or right-click → Edit Scene; shown in scene detail view; used as the staleness fallback when a scene has no sim activity',
      'Added: scenes in the nav sidebar show a faint amber dot after 2 days or red dot after 3 days of no posting/completion activity, with the day count in small text alongside the dot',
      'Fixed: stale indicator could wrongly suppress for scenes whose sims had been edited recently; now records an explicit completedAt timestamp only when a sim is actually marked complete',
      'Fixed: currently-open sim showing blue title even when marked complete — the CSS override now only applies to active sims; complete sims keep their gold colour while selected',
      'Fixed: opening Settings and saving would silently erase boldLocations and italicOOC prefs set via the Auto Format toolbar; save now merges into existing prefs rather than replacing them',
      'Fixed: right-clicking a scene and choosing + New Sim now correctly pre-selects that scene and its parent mission in the New Sim modal',
      'Added: right-clicking a sim in the sidebar now shows "Move to Scene…" — opens a modal to reassign the sim to any non-archived scene in any non-archived mission, grouped by mission',
      'Added: ↕ Sort button in the sidebar header for scene sort order — 8 options: Sim Posting (recent/last), Due Status (stalest/freshest), Alphabetical (A–Z / Z–A), Scene Start (recent/last); preference persists to profile',
      'Fixed: changing scene sort order now re-renders the sidebar immediately',
      'Fixed: completed scenes no longer compete in Due Status sort orders — they sink to the bottom regardless of start date, since a finished scene cannot be stale',
    ]
  },
  {
    version: '4.21',
    date: '2026-08-12',
    changes: [
      'Fixed: browser tab title was still showing v4.0; updated to v4.2',
      'Changed: Clear Format toolbar button now shows 🧹 icon instead of text; tooltip clarifies that auto-formatting (bold names, locations, etc.) is not affected',
      'Changed: Indent and Outdent buttons now use ⇥ / ⇤ symbols instead of wide →| / |← text',
      'Fixed: Copy button tooltip was misleading; now says "Copy sim to clipboard"',
      'Added: marker insertion buttons replaced by a compact "Insert ▾" dropdown that opens on hover or click; toggle between dropdown and individual buttons in Settings → Toolbar',
      'Added: paste cleanup — extra consecutive blank lines in pasted content are automatically collapsed to one; a dismissible "Extra blank lines removed / Undo" banner appears above the editor for 8 seconds',
      'Layout: moved Auto Format ▾ and Visual Aids ▾ back to toolbar row 2 (right side), clearing row 1 to just title + close; both dropdowns now open on hover as well as click; Insert ▾ moved inline with other row-2 buttons',
      'Removed: ↑ Narrate experimental narration-import button and its modal/logic — unreliable in practice; a more robust multi-sim parsing integration is planned for the roadmap instead',
      'Fixed: "StartFragment"/"EndFragment" text sometimes leaking into copy/pasted output (mostly Discord, occasionally email) — comment nodes are now stripped both when copying out and when pasting in, so they can no longer round-trip through the editor',
      'Fixed: auto-italic oO Thoughts Oo were not copying out italicized (only manual italics survived) — the CSS-only italic on .tm is now converted to a real <em> on copy, matching how ((OOC)) italics are handled',
      'Fixed: the first line of a copied sim (often the ((Location)) line) sometimes pasted in a different font, as though it were a header — bare top-level inline/text nodes are now wrapped in a <div> on copy so every line has the same block structure',
      'Added: Ctrl+S (Cmd+S on Mac) while a sim is open now saves a revision snapshot and immediately syncs to your Gist (if configured), with a brief confirmation toast',
      'Added: stale markers (amber ≥2 days / red ≥3 days since last post or completion) now show in the Mission dashboard SCENES table next to each scene status (Active/Completed), matching the sidebar indicators',
      'Added: "SINCE LAST POST" stat on the Command Dashboard showing days since your most recently posted sim, tinted amber at ≥2 days and red at ≥3 days',
      'Fixed: copying from the editor with Ctrl+C (no manual selection) now works the same as the 📋 button — the copy handler previously bailed out when the selection was collapsed, causing the browser to fall back to its own clipboard with raw markup, losing formatting and blank lines in Discord',
      'Fixed: copy/paste to Discord (and other apps reading text/plain) was losing all line breaks and paragraph spacing — caused by innerText on a detached DOM node having no layout context and silently concatenating all text; now walks block children manually and joins with newlines',
    ]
  },
  {
    version: '4.22',
    date: '2026-08-13',
    changes: [
      'New look: "Delta Prime" is now the default skin — same layout and controls, rebuilt on a new surface, type and shape system (elbow frames, accent-filled section caps, a hero stat strip, ruled tables, Space Grotesk + Public Sans)',
      'Added: Style ▾ menu in the top bar with three independent settings — Duty Post (Command / Science / Operations / Medical accent), Appearance (Light / Dark / System) and Mood (Calm / Epic). Changes apply immediately, no Save button',
      'Added: Calm is warm bone and graphite with solid panels; Epic is a cool deep-space field with duty-lit washes, frosted region surfaces and accent glow. Both share every dimension, radius, font and layout rule',
      'Added: duty post accent resolves per (duty × light/dark × calm/epic) rather than one hex per post, so warm light fields get the muted accent and dark modes get the lighter one',
      'Added: one-time "A new look" introduction on first load after upgrading, with the three style controls live inside it so the app can be previewed behind the window; reopen any time from Style ▾ → What\'s new',
      'Added: the classic 4.21 LCARS look (Dark / Light / High Contrast) is still available and fully supported — switch back via Style ▾ → "Revert to the classic LCARS look", the theme dropdown, or Settings → UI Preferences → Visual Style',
      'Added: style changes animate with a circular reveal expanding from the control you clicked (View Transitions API); skipped automatically when the browser lacks support or the OS requests reduced motion',
      'Added: Appearance → System follows the operating system light/dark setting and re-resolves live when it changes',
      'Changed: the skin is applied from a tiny separate localStorage mirror before first paint, so the app never boots in the wrong look and corrects itself',
      'Changed: Public Sans and Space Grotesk are only fetched when Delta Prime is active — classic users load no extra fonts',
      'Fixed: the UI font chosen in Settings still overrides the skin body font, as it did before',
      'Note: Delta Prime is new and still being tuned — feedback on it, or on staying with Classic LCARS, is welcome',
      'Changed: every emoji in the interface replaced with inline Lucide SVG icons, drawn in the current text colour and sized in em so they scale with the UI font setting and match in both skins. The icon set is an inline <symbol> sprite, so the app stays a single dependency-free file',
      'Fixed: Search / Sort / Details and the panel collapse arrows were nearly invisible in Delta Prime — they sit on the accent-filled panel header and were inheriting a translucent ink colour instead of the accent ink',
      'Fixed: the style-change reveal did not appear to come from the control clicked — it expanded from the control\'s centre, which on a segmented button is up to ~34px from where the pointer actually was. The origin now follows the pointer, falling back to the control centre for keyboard activation. Blending is left at the browser default, which keeps the softer edge',
      'Fixed: the Delta Prime / Classic LCARS buttons in Settings were unreadable in dark mode — they render as outlined buttons on the panel, so they were picking up the dark accent ink meant for solid accent fills',
      'Fixed: dashboard and detail-view titles were tinted cold blue, which clashed with the warm Calm palette — titles are now ink, per the style guide rule that hierarchy is typographic rather than chromatic. Blue and gold stay reserved for active / complete status',
      'Changed: in Epic the editor keeps a flat background instead of the duty-lit gradient, which stays on the dashboards — a gradient behind long-form writing was distracting',
      'Fixed: the sim title in the editor was still cold blue in Delta Prime — it is set as an inline style by status, which no stylesheet rule could override. Active titles now use a --title-active token so each skin decides; Delta Prime keeps them ink, Classic keeps its blue. Complete (gold) and archived (dim) are unchanged in both',
      'Changed: the editor text caret follows the duty accent in Delta Prime rather than the status blue',
      'Fixed: the Style menu\'s revert button showed raw SVG markup as text — the label is rebuilt on every style change and was being written through textContent, which cannot carry markup',
      'Fixed: the Sim Details panel\'s open/close chevron pointed the wrong way — it now mirrors the left sidebar, pointing right to collapse the panel rightwards and left to reopen it',
      'Fixed: modal text was hard to read in Epic — dialogs were being frosted like region surfaces, and a 55% panel over the dimmed backdrop mixed down to a murky grey. Modals are now solid in Epic; blur stays on regions only, per the style guide',
    ]
  },
  {
    version: '4.23',
    date: '2026-08-15',
    changes: [
      'Removed: the "Import Sims" Markdown/Google Docs importer in Settings — exporting a Doc to Markdown and re-importing it was clunky, and better ways to bring sims in are being built. Backup and Restore are unaffected',
      'Changed: revision snapshots now live in your account rather than inside the main data blob. They were ten full copies of each sim being re-uploaded on every save, and were by far the largest part of the payload; they are now fetched only when you open the Snapshots window, and follow you between devices',
      'Changed: Writer ID entry now checks the real ten-character format (ship letter, stardate year and month, two initials, academy digit) and the example shown is a placeholder, not a real writer',
      'Added: accounts. Sign in with your Writer ID and a PIN, and your sims save to your account automatically and follow you to any device — no tokens, no export files. An optional recovery email can be given when creating the account',
      'Added: a first-run choice between signing in and working offline on one device only. Offline sends nothing anywhere; you can switch to an account later from Settings, and your existing work is carried across',
      'Changed: cloud sync now uses a proper database instead of a GitHub Gist. The Gist was capped near 1 MB and this data was close to it; that ceiling is gone. The Personal Access Token and Gist ID fields are removed — nothing to set up any more',
      'Changed: saves reach your account after ~5 seconds instead of ~60, and Ctrl+S still saves a snapshot and syncs immediately',
      'Fixed: restoring a backup did not save to your account — it saved on the device only and would not reach the server until your next edit. Restoring now uploads straight away, which matters most when moving your sims across from the old address',
      'Added: the old GitHub Pages address now shows a moving notice explaining the change, with Move My Stuff (sign in there and your sims and settings upload to your account, ready at the new address), a manual backup download, a link to the new site, and Remind Me Later — which returns on the next load rather than dismissing for good',
      'Added: a Getting Started wizard on first run, with separate routes for writers new to LCARS and writers arriving from the old address \u2014 the latter covering what changed and how to bring sims across, including loading a backup file directly from the wizard. Dismiss it with the \u201cDon\u2019t show this again\u201d button, or reopen it any time from Getting Started on the Dashboard',
      'Added: a Danger Zone in Settings \u2192 Data Management. Erase all sims and characters wipes LCARS clean \u2014 synced to your other devices when signed in \u2014 and, with an account, Delete my account removes your sims, characters and revision history from the server. Both need the action typed out to confirm, and neither can be undone',
      'Changed: the Dashboard\u2019s Ready to get started? cards now sit in two rows \u2014 making things on the first, learning about them on the second',
      'Fixed: the Danger Zone heading was tinted red and became unreadable against the red duty post accent; it now uses the normal text colour',
      'Fixed: reopening the Getting Started wizard from the Dashboard left no way out except Skip, which also stopped it appearing again \u2014 there is now a close button on every step',
      'Fixed: Move My Stuff on the old address uploaded your sims but then left you sitting on the old site. It now confirms the move and forwards you to the new address, with the option to stay. If the upload did not complete it says so and offers to retry or download a backup rather than sending you on',
      'Fixed: restoring a large backup froze the page for over a second — the whole dataset was being written and the sim tree rebuilt inside the click, with a blocking alert on the end. The work now yields a frame first and reports through a toast',
      'Note: if this browser and your account both hold sims, you are asked which copy to keep rather than one silently replacing the other',
      'Changed: the app is now three files — LCARS.html, lcars.css and lcars.js — instead of one. Nothing looks or behaves differently; it is groundwork so Settings and the Character Manifest can become pages of their own. Offline downloads are still a single self-contained file',
      'Added: Settings and the Character Manifest now have their own web addresses — /settings and /manifest. The back and forward buttons move between them, and a link straight to one opens it. They are still part of the same page, so opening the Manifest mid-sim leaves your unsaved typing exactly where it was',
      'Added: Settings \u2192 Data Management now offers Download LCARS for offline use \u2014 one self-contained file you can keep on your own machine and open with no internet at all. The app is built from three files now, and the download puts them back together for you',
      'Fixed: on a first visit the Delta Prime introduction could open on top of a page you had gone straight to, such as /settings, and hide it. It now waits until you are back on the dashboard',
      'Fixed: the downloaded offline copy still offered to sign you in or create an account, neither of which can work from a file on your own machine — the browser blocks it reaching the server. The offline copy now starts straight in offline mode with no sign-in prompt, and Settings and the Getting Started wizard point you at LCARS online instead, noting that a backup taken offline restores straight into it',
      'Changed: Settings is now a page of its own rather than a tall pop-up window. It sits under the same header as the rest of LCARS, at its own address, and the sections are regrouped \u2014 your account first, then how it looks, then how the sim editor behaves, with your data, the danger zone and the version history below. Fonts, sizes, colours and the editor toggles are saved together from the bar at the foot of the page; everything else still applies the moment you click it',
      'Fixed: on a narrow screen the header buttons were cut off with no way to reach them, so there was no way back out of Settings on a phone. The header now scrolls sideways and drops the STARBASE 118 WRITING TOOL strapline rather than clipping',
      'Changed: the Character Manifest is a page of the app now rather than a screen that covered it. It carried a second row of Sim Editor, theme and Settings buttons of its own, which made it read as a separate application; it now sits under the same header as everything else, and that header stays put while you are in it. Opening it mid-sim still leaves your unsaved typing exactly where it was',
      'Changed: the Character Manifest works on a phone \u2014 the character list and the profile stack into one scrolling column instead of being squeezed side by side',
      'Added: account management in Settings. Change your PIN without leaving LCARS \u2014 you enter your current one, then the new one twice. Add, change or remove your recovery email. The Writer ID you are signed in as is now shown plainly at the top of the page rather than buried in a sentence',
      'Changed: everything to do with your account is now in one place at the top of Settings \u2014 who you are signed in as, saving now, signing out, your PIN, your recovery email and closing the account. Deleting your account moved there from the Danger Zone, which now covers erasing your sims and characters only',
      'Fixed: the version number in Settings and the link to LCARS online were asking for a colour that was never defined, so they came out in ordinary body text instead of the accent colour',
      'Note: a forgotten PIN still has to be reset by the maintainer, and deleting your account still leaves the Writer ID registered as a login. Both need a server-side key that cannot safely live in the page, and are being done properly next',
      'Changed: Settings is reordered and regrouped into four sections \u2014 Your Account & Data, LCARS Appearance, LCARS Sim Editor and About LCARS \u2014 with a contents rail down the side to jump between them. On a phone the rail folds away behind a Jump to\u2026 button',
      'Changed: the buttons in Settings now say what they actually do underneath their label, and sit three across a desktop page instead of one per row, wrapping down to one on a phone. \u201cSave now\u201d, for instance, now says it uploads this device\u2019s sims straight away rather than waiting for the automatic save',
      'Changed: Delete my account moved back into the Danger Zone, which is now a marked-off block at the foot of Your Account & Data rather than a section of its own',
      'Added: a display name. Set a friendlier name than your Writer ID from Settings \u2192 Your Account & Data',
      'Changed: About LCARS now gathers the changelog, the link to the full user guide, the Getting Started tour and the note about how the tool was built. That last one has moved off the Dashboard, which was not really the place for it',
      'Changed: Sim Templates is no longer a button in the header. The saved templates live in Settings \u2192 Your Account & Data, where clicking one opens it for editing \u2014 name, default sim title and the template text itself \u2014 rather than only offering rename and delete. Saving the sim you are writing as a template moved to Sim Details, next to Snapshots',
      'Changed: on a phone the Character Manifest no longer gives the top of the screen to the character list. The list folds away behind a Characters button, with its search intact, so the character you are reading gets the room',
      'Changed: editing a sim template now opens it in the sim editor itself, with the full toolbar, markers and auto-formatting, rather than a plain text box in Settings. A banner across the top makes it clear you are editing a template rather than a sim, and the title bar holds the template\u2019s name',
      'Changed: the Settings buttons are smaller and all the same shape, with a one-line explanation each instead of a paragraph. A page of large asymmetric cards repeated a dozen times was more noise than help',
      'Changed: \u201cSave to my account now\u201d is now \u201cSync data now\u201d, and says plainly that it is rarely needed because syncing is automatic',
      'Changed: once you set a display name, Settings reads \u201cSigned in as Jean Luc Picard (V239806K11)\u201d rather than showing the Writer ID alone',
      'Added: Share my contact, in Settings \u2192 Your Account & Data. Shows your name and Writer ID as a small card and copies them in one click, for handing to another writer',
      'Changed: Sim Templates is now its own section in Settings rather than sitting inside Your Account & Data',
      'Changed: About LCARS is tidied \u2014 Getting Started, the full user guide and how the tool was built are three buttons, and the changelog is a small button on the version line rather than a panel of its own',
      'Fixed: a sim template row showed an Edit label that was not clickable \u2014 the whole row now opens the template, which is what it looked like it should do',
      'Changed: finishing with a template, whether by Done or the close button, takes you back to Sim Templates in Settings rather than dropping you on the dashboard',
      'Changed: your display name and Writer ID are now shown at the same size and weight in Settings, rather than the Writer ID trailing in brackets',
      'Changed: the Share my contact card reads \u201cWrite with [name] on LCARS. Writer ID [ID].\u201d and is headed LCARS Writing System',
      'Changed: LCARS Appearance and LCARS Sim Editor use the same buttons and spacing as the rest of Settings \u2014 the style and theme pickers are now buttons with a selected state rather than a row of pills',
      'Fixed: jumping to a section from the Settings contents rail could leave a different section highlighted, because a short section near the end of the page is reached at the very bottom of the scroll where the one below it is equally on screen',
    ],
  },
  {
    version: 'pending',
    date: '2026-08-15',
    changes: [
      'Changed: new icon \u2014 the gold delta \u2014 in the browser tab, and on your home screen if you add LCARS to it from a phone',
      'Added: the delta now sits in the top-left LCARS badge as well, on a dark disc with a fine light ring. The disc is not quite solid, so the duty-post colour tints it \u2014 and it keeps the delta legible even on Operations gold, where the badge is the same colour as the mark',
      'Changed: deleting your account now really removes it. It used to clear your sims but leave the login registered, so the Writer ID could never be used again and signing back in gave you an empty LCARS \u2014 the login itself is now removed too, and the Writer ID becomes free to register again',
      'Added: a 48-hour grace period on account deletion. Nothing is destroyed straight away \u2014 sign in again with your Writer ID and PIN within 48 hours and you can cancel, and everything comes back exactly as it was. Settings shows how long is left',
      'Changed: if the server cannot be reached while deleting an account, the deletion is refused outright rather than wiping the device and leaving the account behind',
      'Removed: the recovery email. Nothing was ever sent to it \u2014 your sign-in address is synthetic and cannot receive mail \u2014 so it was held for identification only and implied a recovery route that did not exist. Creating an account no longer asks for it, and Settings no longer offers it. Linking a Google or Discord account replaces it, and is coming next',
      'Fixed: after confirming an account deletion the reminder about the 48-hour window did not appear if you had deleted from Settings. Opening a view tears down whatever dialog is on screen, and the reminder was raised a moment before that happened \u2014 deleting now returns you to the dashboard, and the reminder is raised after the view has settled',
      'Fixed: signing back in during the 48-hour window did not offer to keep your account. The prompt only appeared if you went looking for it in Settings, which is the one place you would not think to look \u2014 it now comes up as soon as you sign in',
      'Fixed: keeping an account after changing your mind left the Settings tile still showing a countdown until the page was navigated away from and back',
      'Added: Linked accounts, in Settings \u2192 Your Account & Data. You can now link a Google or Discord account to your Writer ID. It is optional, and your Writer ID and PIN keep working exactly as before \u2014 a linked account is a second way in, and the way back in if you forget your PIN',
      'Added: linked accounts can be unlinked again from the same place, with a confirmation first. Your Writer ID login is never listed there, because it is not something you linked and must never look removable',
      'Fixed: unlinking a Google or Discord account failed with \u201cidentity_id must be an UUID\u201d. A linked account carries two different identifiers \u2014 one of its own and one belonging to the provider \u2014 and LCARS was sending the provider\u2019s',
      'Added: sign in with Google or Discord. Once you have linked an account, Continue with Discord or Continue with Google on the sign-in screen takes you straight in \u2014 LCARS works out which Writer ID is yours from the account itself',
      'Added: Forgotten your PIN? on the sign-in screen. Sign in with your linked Google or Discord account and you can set a new PIN there and then, without anyone else being involved. If you never linked an account it says so plainly rather than sending you round in circles \u2014 that case still needs the maintainer',
      'Added: a one-time nudge to link an account, for writers who have not. It explains that a Writer ID and PIN alone leave no way back in if the PIN is forgotten. Declining it is remembered and it does not ask again',
      'Changed: signing in with a Google or Discord account that has not been linked to any Writer ID now says so and offers the Writer ID sign-in, rather than opening an empty LCARS',
      'Fixed: creating an account from Settings appeared to do nothing. The account was made and you were signed in, but the Settings page was still the one drawn for a signed-out writer, so it went on offering to set up an account \u2014 and clicking that reopened the sign-in screen, with no way out of the loop',
      'Fixed: the prompt to link a Google or Discord account never appeared after creating an account. It was opening underneath the Getting Started wizard, which covers the whole screen, so it could be neither seen nor dismissed. It now waits and appears once you have finished with the wizard',
      'Fixed: signing out from Settings left you on the Settings address, so the page you came back to was built around an account you no longer had. Signing out now returns you to the dashboard',
      'Changed: connecting a Google or Discord account is now offered as the last step of creating or signing into an account, in the same window, rather than as a message that appeared afterwards. Writers with an existing account are asked once, the next time they sign in. Both providers are offered and it can be declined',
      'Fixed: that offer no longer appears when you open Settings. It used to be raised on start-up, and start-up happens on every page load \u2014 including going straight to Settings, which is not a moment anyone wants interrupting',
      'Changed: whether the offer has been made is remembered against your account rather than the browser, so it follows you and is asked exactly once no matter which device you next sign in on',
      'Fixed: Academy sims were still auto-formatting some markers \u2014 ((Location)) came out bold and ((OOC)) italic, both on screen and when copied out. Neither shows now, and neither is carried onto the clipboard. The coloured highlights on Actions, Comms and Thoughts stay, since those are only ever visual aids and were never copied out anyway',
      'Fixed: pasting formatted text into an Academy sim kept its bold and italics until the sim was next reopened. Pasted text is now stripped as it goes in',
      'Changed: Academy sims allow more of the toolbar than they used to \u2014 links, source view, paragraph markers and the whole Insert marker menu are all available again. Bold, italic, strikethrough, indenting and the Auto Format toggles stay switched off, which is what the plain-text rule actually asks for',
      'Fixed: in an Academy sim the bold, italic and strikethrough buttons were only dimmed, not disabled, and editing the raw source could put formatting back. Both routes are now closed off',
      'Added: bullet points. The new bullet button in the toolbar (or Ctrl+Shift+8) turns the line you are on into a bullet. Press Enter for the next one and Enter on an empty bullet to finish, so the same button covers a single standalone point and a full list. Pressing it again on a bullet turns it back into an ordinary paragraph. Bullets work in Academy sims too',
      'Fixed: copying a whole bulleted list came out as unbulleted lines, because the list wrapper was left behind — and in plain text apps such as Discord the bullets ran together into one line. Lists now paste out as lists, and as \u2022 one per line where only plain text is accepted',
      'Added: moderators. A writer can now be given a moderator or super admin role, so the fleet can look after its own accounts \u2014 previously anyone who lost their PIN without a linked account had to find the maintainer',
      'Added: Request a PIN reset, on the Forgotten your PIN? screen. If you never linked a Google or Discord account, or they are not working, you can now ask a moderator directly. You give your Writer ID and a note saying how they can check the request really came from you \u2014 a Discord handle or an email address they can reach you at',
      'Added: an Admin panel for moderators, with a count in the header of requests waiting. Every moderator sees the same count, so a request cannot sit unnoticed because one person did not log in',
      'Added: moderators can issue a temporary PIN from the panel, to pass on however that writer asked to be contacted. The PIN is shown once and never stored anywhere readable, the writer\u2019s old PIN and any open sessions stop working immediately, and LCARS makes them choose their own PIN the moment they sign in with it',
      'Added: requests can also be rejected, with a confirmation first. Rejecting only closes the request \u2014 there is nowhere to send a reply, since whoever filed it is locked out \u2014 so a request that might be genuine is better followed up in person',
      'Added: an Archive of every request ever decided, showing who actioned or rejected it and when. Nothing is ever deleted, so a reset can always be accounted for afterwards',
      'Added: super admins can assign roles from the panel, by Writer ID. Moderators only ever see the reset queue \u2014 there is no list of writers and no access to anyone\u2019s sims',
      'Changed: a request filed against a Writer ID with no LCARS account is accepted and quietly dropped, so this cannot be used to find out who has an account. The confirmation says to double-check the Writer ID, because a typo is the one mistake with no other symptom',
      'Fixed: the introduction to the Delta Prime look could paint over a prompt that had to be answered \u2014 including the one asking you to replace a temporary PIN, which has no way to dismiss it. It now waits for the next visit if anything is already on screen',
      'Added: super admins now see a list of every account in the Admin panel \u2014 Writer ID, display name if one is set, when they joined, and their role. It scrolls, and there is a filter box for finding someone by either Writer ID or name',
      'Changed: a role is now set from the row itself rather than by typing a Writer ID into a separate box, which was two chances to promote the wrong person. Changing one asks you to confirm, and says what the new role can do',
      'Added: your own row cannot be changed, because with no super admin left the only way back is a hand-run database statement. Accounts in their 48-hour deletion window are marked as such',
      'Changed: moderators still see no writer list \u2014 the roster is super admins only. It shows who holds an account and what they can do, and nothing about anyone\u2019s sims',
      'Fixed: sims pasted in from Google Docs or Word copied out double spaced. Those apps hand LCARS paragraph blocks, which look right in the editor but carry spacing of their own everywhere else \u2014 so every line, and every blank line, arrived with a gap around it. Copying out now produces the same plain blocks a sim typed in LCARS does. Sims you have already pasted in are fixed too, and nothing about what is stored changes',
      'Fixed: blank lines pasted in from Google Docs could vanish entirely when copied into some apps, while showing as a full blank line in others',
      'Fixed: lines separated by a soft line break ran together into one line when copied as plain text \u2014 in Discord in particular, where only plain text is accepted',
      'Added: indenting now works in Academy sims, on ordinary lines and on bullets alike. Indenting is structure rather than formatting \u2014 the same reason bullets were already allowed \u2014 so the indent and outdent buttons are no longer greyed out there',
      'Fixed: indenting a bullet moved the whole list instead of that one bullet. Each bullet now indents on its own, so a list can have levels within it',
      'Fixed: an indent applied in an Academy sim was silently undone the next time the sim was opened, pasted into, or edited through source view',
      'Added: select across several lines and the indent button now indents all of them at once, rather than only the line you started on. Works on bullets and ordinary lines together, and Ctrl+Z takes the whole lot back in one press',
      'Fixed: Tab and Shift+Tab did not indent in Academy sims even though the buttons did',
      'Changed: the code that renders sims for reading — markers, thoughts, comms, character colours — now lives in one shared file rather than only inside the editor. Nothing looks or behaves differently; it is groundwork for read-only share links, so a shared sim renders exactly as it does here instead of slowly drifting out of step',
      'Added: share links. Sim Details now has a Share Link button that gives you a web address anyone can open — no account needed, nothing they can change. It shows your display name (or your Writer ID if you have not set one), the title, whether the sim is active or complete, and when you last shared it',
      'Added: a share link is a snapshot, not a window. It shows the sim as it was when you shared it, so you can carry on writing without strangers watching the draft change. The dialog tells you when the shared copy has fallen behind, and Update shared copy publishes the current version to the same link',
      'Added: share links can be set to expire — after 24 hours, 7 days, 30 days, or never. Stop sharing kills the link immediately for everyone who has it, and sharing again afterwards makes a new address rather than reviving the old one',
      'Added: shared sims open on a page of their own rather than loading the whole of LCARS, so a link is quick on a phone. It is built for a narrow screen from the start, since that is where these get read',
      'Changed: expired share links are now tidied away automatically, so a link that has run out does not sit around after it has stopped working',
      'Fixed: shared sims were double spaced. The page added a gap under every paragraph on top of the blank lines the sim already contains — it now spaces them exactly as the editor does',
      'Fixed: shared sims showed the coloured marker highlights from the editor. Those are a writing aid for spotting your own markers mid-sim, and have no place in a finished sim someone has been sent a link to — a shared sim now reads the way it does when you copy it out',
      'Fixed: formatting was missing from shared sims. Locations are bold again, and thoughts and OOC notes are italic, following the same preferences the app uses when you copy a sim to the clipboard',
      'Fixed: locations and OOC notes were tinted grey on the share page, which is a colour the app has never given them',
      'Added: a Light / Dark switch on the share page. It follows the reader’s own device setting to begin with and remembers their choice — it used to be dark for everyone, whatever they preferred',
      'Changed: the share page header takes up far less room. The title is smaller and the writer, Writer ID, status and date now sit on one line under it instead of four stacked rows above the sim',
      'Changed: the share page now uses the app’s own colours and header, so a shared sim looks like LCARS instead of a plain web page',
      'Changed: shared sims now open in light mode by default, with the Light / Dark switch still there and still remembered. A sim someone has been sent to read is a document, and a page of prose reads like one — the dark chrome is for the person writing it',
      'Changed: character colours no longer carry over to a shared sim. They are a way of telling your own speakers apart while writing, and mean nothing to a reader who does not know the scheme — copying a sim out has always dropped them, and a share link now matches that exactly',
      'Added: if a share link expires, the page says so at the top — “Shared sim · Read only · Link expires Aug 24, 2:30 PM” — so a reader knows before the link dies rather than after',
    ],
  },
];
function loadState() {
  try { const r = localStorage.getItem(SKEY); if (r) return JSON.parse(r); } catch(e){}
  return { docs:{}, missions:{}, scenes:{}, settings:{zoom:100,myChars:[],theme:'dark',prefs:{}} };
}
const S = loadState();
if (!S.settings) S.settings = {zoom:100,myChars:[],theme:'dark',prefs:{}};
if (!S.settings.prefs) S.settings.prefs = {};
if (!S.settings.myChars) S.settings.myChars = [];
if (!S.settings.confirmedPairs) S.settings.confirmedPairs = [];
if (S.settings.sidebarOpen === undefined) S.settings.sidebarOpen = true;
if (S.settings.charsOpen === undefined) S.settings.charsOpen = true;
if (S.settings.sidebarDetail === undefined) S.settings.sidebarDetail = false;
if (!S.characters) S.characters = {};
// Migrate existing characters to new fields
Object.values(S.characters).forEach(c => {
  if (!c.aliases) c.aliases = [];
  if (c.charType === undefined) c.charType = '';
});
// Migrate existing docs to new fields
Object.values(S.docs || {}).forEach(d => {
  if (!d.charColors) d.charColors = {};
});
if (!S.templates) S.templates = [];
// One-time migration: strip inline color/font styles from all existing sim content
if (!S._pasteCleanV1) {
  Object.values(S.docs || {}).forEach(doc => {
    if (doc.content) doc.content = doc.content
      .replace(/\s*style\s*=\s*"[^"]*"/gi, m => {
        const kept = m.match(/margin-left\s*:\s*[^;"]*/i);
        return kept ? ` style="${kept[0]}"` : '';
      })
      .replace(/\s*style\s*=\s*'[^']*'/gi, m => {
        const kept = m.match(/margin-left\s*:\s*[^;']*/i);
        return kept ? ` style="${kept[0]}"` : '';
      });
  });
  S._pasteCleanV1 = true;
}
// Inline SVG icon reference — see the sprite at the top of <body>.
// `extra` takes size modifiers such as 'ic-sm' / 'ic-lg'.
function ic(name, extra) {
  return `<svg class="ic${extra ? ' ' + extra : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function persist() { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch(e){} }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ================================================================
// APP STATE
// ================================================================
let curId = null;
let curView = null;   // 'mission' | 'scene' | null
let curViewId = null;
let zoom = S.settings.zoom || 100;
let fmts = { action:true, comms:true, thought:true };
let collapsed = {};
let showArchived = false;
let saveTimer = null;
let trTimer = null;
let modalCb = null;
let _editingLink = null;
let _resizing = null;
let _titleWarnMatch = null;
let searchActive = false;
let searchTimer = null;
let _manifestSort = 'type';
let _manifestTypeFilter = '';
let _manifestActiveTab = 'sims'; // 'sims' | 'service' | 'ribbons' | 'edit'
let _srEditMode = false;
let _ribbonEditMode = false;
let _expandedRibbonIdx = -1;
let _curCharId = null;
let _activeRibbonCats = new Set(); // empty = all categories
let _ribbonAddFormOpen = false;
let _sourceMode = false;

// ================================================================
// VISUAL STYLE — Delta Prime skin (v4.22)
//
// Three orthogonal axes produce every appearance: duty post (accent),
// light/dark, and calm/epic (material). State lives in S.settings.style,
// is applied as attributes on <html>, and every component reads CSS custom
// properties — no component knows which skin is active.
//
// Skin 'classic' falls back entirely to the 4.21 Dark/Light/HC themes.
// ================================================================
const STYLE_KEY = 'lcars_style_v1';   // tiny mirror for flash-free first paint
const STYLE_VERSION = '4.22';         // bump to re-show the intro on a future restyle
const DUTY_ACCENTS = {
  command:    { calmLight:'#B4463C', epicLight:'#C0433A', dark:'#F0705F' },
  science:    { calmLight:'#2F7FC9', epicLight:'#2F7FC9', dark:'#5FB2FF' },
  operations: { calmLight:'#C8901C', epicLight:'#C8901C', dark:'#F2B441' },
  medical:    { calmLight:'#1E8E7E', epicLight:'#1E8E7E', dark:'#48D3BE' },
};
const DUTY_ORDER = ['command','science','operations','medical'];
const STYLE_DEFAULTS = { skin:'prime', duty:'command', mode:'system', vibe:'calm' };

function getStyle() { return Object.assign({}, STYLE_DEFAULTS, S.settings.style || {}); }

// Space Grotesk (display) + Public Sans (body). Loaded once, only for Prime —
// classic users never pay for them. Matches the id used by the first-paint script.
function ensurePrimeFonts() {
  if (document.getElementById('gf-delta-prime')) return;
  const l = document.createElement('link');
  l.id = 'gf-delta-prime'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700&family=Space+Grotesk:wght@600;700&display=swap';
  document.head.appendChild(l);
}

// mode 'system' resolves through matchMedia and re-resolves while it stays 'system'
function resolvedMode(st) {
  const s = st || getStyle();
  if (s.mode !== 'system') return s.mode;
  try { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  catch(e) { return 'dark'; }
}

// Accent is (duty, mode, vibe) → hex, never a single hex per duty post.
function resolveAccent(st) {
  const s = st || getStyle();
  const t = DUTY_ACCENTS[s.duty] || DUTY_ACCENTS.command;
  if (resolvedMode(s) === 'dark') return t.dark;
  return s.vibe === 'epic' ? t.epicLight : t.calmLight;
}

function applyStyle() {
  const s = getStyle();
  const mode = resolvedMode(s);
  const r = document.documentElement;
  r.setAttribute('data-skin', s.skin);
  r.setAttribute('data-mode', mode);
  r.setAttribute('data-vibe', s.vibe);
  r.setAttribute('data-duty', s.duty);          // carried for edge cases; styling reads --ac
  r.style.setProperty('--ac', resolveAccent(s));
  if (s.skin === 'prime') {
    ensurePrimeFonts();
    // Classic theme classes would otherwise override the Prime token blocks
    document.body.classList.remove('light','hc');
  } else {
    setTheme(S.settings.theme || 'dark', true);
  }
  try { localStorage.setItem(STYLE_KEY, JSON.stringify(s)); } catch(e){}
  updateStyleMenu();
}

function setStyle(patch, el, ev) {
  const apply = () => {
    S.settings.style = Object.assign(getStyle(), patch);
    persist();
    applyStyle();
  };
  applyWithReveal(el, apply, ev);
}

// Radial reveal from the point that was clicked. Progressive enhancement only —
// without View Transitions (or with reduced motion) the change just applies.
//
// The origin is the pointer position, not the control's centre: on a segmented
// button (62px min-width plus padding) those differ by up to ~30px, which reads
// as the animation starting near the button rather than at it. Keyboard-driven
// clicks report clientX/clientY of 0, so fall back to the element's centre.
function applyWithReveal(el, apply, ev) {
  try {
    let x = null, y = null;
    if (ev && (ev.clientX || ev.clientY)) { x = ev.clientX; y = ev.clientY; }
    else {
      const r = el && el.getBoundingClientRect && el.getBoundingClientRect();
      if (r) { x = r.left + r.width/2; y = r.top + r.height/2; }
    }
    if (x !== null) {
      document.documentElement.style.setProperty('--vtx', x + 'px');
      document.documentElement.style.setProperty('--vty', y + 'px');
    }
  } catch(e){}
  let reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}
  if (!document.startViewTransition || reduced) return apply();
  document.startViewTransition(() => { apply(); });
}

// Re-resolve light/dark when the OS flips, but only while mode is 'system'
try {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStyle().mode === 'system') applyStyle();
  });
} catch(e){}

function toggleStyleMenu(force) {
  const m = document.getElementById('style-menu');
  if (!m) return;
  const open = force !== undefined ? force : !m.classList.contains('open');
  m.classList.toggle('open', open);
  const btn = document.getElementById('btn-style');
  if (btn) btn.setAttribute('aria-expanded', String(open));
  if (open) updateStyleMenu();
}

// Refreshes every live control set — the header menu, the intro modal, and the
// Settings panel can all be showing the same three radio groups at once.
function updateStyleMenu() {
  const s = getStyle();
  const mode = resolvedMode(s);
  ['style-menu','mo-body','sty-settings'].forEach(id => {
    const m = document.getElementById(id);
    if (!m) return;
    m.querySelectorAll('.sty-sw').forEach(b => {
      const t = DUTY_ACCENTS[b.dataset.duty];
      if (!t) return;
      b.style.background = mode === 'dark' ? t.dark : (s.vibe === 'epic' ? t.epicLight : t.calmLight);
      b.setAttribute('aria-checked', String(b.dataset.duty === s.duty));
    });
    m.querySelectorAll('[data-mode-opt]').forEach(b =>
      b.setAttribute('aria-checked', String(b.dataset.modeOpt === s.mode)));
    m.querySelectorAll('[data-vibe-opt]').forEach(b =>
      b.setAttribute('aria-checked', String(b.dataset.vibeOpt === s.vibe)));
  });
  const rev = document.getElementById('sty-revert');
  if (rev) rev.innerHTML = s.skin === 'prime'
    ? ic('chevron-left') + ' Revert to the classic LCARS look'
    : ic('sparkles') + ' Switch to the Delta Prime look';
  const btn = document.getElementById('btn-style');
  if (btn) btn.title = s.skin === 'prime'
    ? `Style: ${s.duty} · ${s.mode} · ${s.vibe}` : 'Style: classic LCARS';
}

function toggleSkin(el, ev) {
  const next = getStyle().skin === 'prime' ? 'classic' : 'prime';
  setStyle({ skin: next }, el, ev);
}

// ================================================================
// "NEW LOOK" INTRODUCTION — one-time, re-openable from the Style menu
// ================================================================
function styleIntroBody() {
  return `
    <div style="font-size:0.87rem;line-height:1.6;margin-bottom:14px">
      LCARS has a new look in v${STYLE_VERSION}, called <strong>Delta Prime</strong> — same layout and
      the same controls, rebuilt on a cleaner surface, type and shape system.
      Try the three settings below and watch the app behind this window change.
    </div>
    ${styleControlsHtml()}
    <div style="font-size:0.73rem;color:var(--dim);line-height:1.55;margin-top:14px">
      Everything here lives under <strong>Style ▾</strong> in the top bar afterwards, alongside
      <em>What's new</em> to reopen this window.
    </div>
    <div style="font-size:0.73rem;color:var(--dim);line-height:1.55;margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
      <strong style="color:var(--amber)">Feedback wanted.</strong> The classic LCARS look is still
      one click away — <em>Revert to the classic LCARS look</em>, in the same menu — and it stays
      supported for now. Which one you prefer, and what feels off in either, is the useful thing
      to report back.
    </div>`;
}

function showStyleIntro() {
  closeStyleMenu();
  openModal('A NEW LOOK — DELTA PRIME', styleIntroBody(), () => {}, { ok:'Got it', noCancel:true });
  // Escape, the backdrop and "Got it" all dismiss, so mark it seen on open —
  // the intro never blocks and never nags twice.
  S.settings.prefs = Object.assign({}, S.settings.prefs, { seenStyleIntro: STYLE_VERSION });
  persist();
  setTimeout(updateStyleMenu, 20);
}

function maybeShowStyleIntro() {
  if ((S.settings.prefs || {}).seenStyleIntro === STYLE_VERSION) return;
  // Deferred, so re-check on fire: a direct hit on /settings or /manifest opens
  // its view in between, and the intro must not steal the modal from under it.
  // The same goes for anything already on screen. Boot raises prompts that must
  // be answered -- the reconcile question, a pending deletion, a temporary PIN
  // that has to be changed -- and every one of them lands after this timer was
  // set. An introduction to the new colours can wait for the next load; those
  // cannot, and showChooseOwnPin() in particular has no cancel button, so
  // painting over it would strand the writer on a PIN someone else has read.
  setTimeout(() => {
    if (_routeView !== 'dash') return;
    if (!document.getElementById('mo').classList.contains('hidden')) return;
    showStyleIntro();
  }, 400);
}

function closeStyleMenu(){ toggleStyleMenu(false); }

// Shared markup for the three controls — header menu, intro modal and Settings
function styleControlsHtml() {
  const swatches = DUTY_ORDER.map(d =>
    `<button class="sty-sw" role="radio" data-duty="${d}" aria-label="${d[0].toUpperCase()+d.slice(1)}"
       title="${d[0].toUpperCase()+d.slice(1)}" onclick="setStyle({duty:'${d}'},this,event)"></button>`).join('');
  const modes = [['light','LIGHT'],['dark','DARK'],['system','SYSTEM']].map(([v,l]) =>
    `<button role="radio" data-mode-opt="${v}" onclick="setStyle({mode:'${v}'},this,event)">${l}</button>`).join('');
  const vibes = [['calm','CALM'],['epic','EPIC']].map(([v,l]) =>
    `<button role="radio" data-vibe-opt="${v}" onclick="setStyle({vibe:'${v}'},this,event)">${l}</button>`).join('');
  return `
    <div class="sty-controls">
      <div class="sty-grp"><div class="sty-lbl">DUTY POST</div>
        <div class="sty-swatches" role="radiogroup" aria-label="Duty post">${swatches}</div></div>
      <div class="sty-grp"><div class="sty-lbl">APPEARANCE</div>
        <div class="sty-seg" role="radiogroup" aria-label="Appearance">${modes}</div></div>
      <div class="sty-grp"><div class="sty-lbl">MOOD</div>
        <div class="sty-seg" role="radiogroup" aria-label="Mood">${vibes}</div>
        <div class="sty-hint">Calm — warm and quiet. Epic — cool, lit, atmospheric.</div></div>
    </div>`;
}

function renderStyleMenu() {
  const m = document.getElementById('style-menu');
  if (!m) return;
  m.innerHTML = styleControlsHtml() + `
    <div class="sty-sep"></div>
    <div class="sty-foot">
      <button id="sty-revert" onclick="toggleSkin(this,event)">${ic('chevron-left')} Revert to the classic LCARS look</button>
      <button onclick="showStyleIntro()">${ic('sparkles')} What's new in ${STYLE_VERSION}</button>
    </div>
    <div class="sty-feedback"><strong>New in ${STYLE_VERSION}</strong> — the classic look stays
      available while this one settles. Feedback on either is welcome.</div>`;
  updateStyleMenu();
}

// ================================================================
// THEME (classic skin only)
// ================================================================
function setTheme(t, keepSkin) {
  const acad = document.body.classList.contains('academy');
  document.body.classList.remove('light','hc');
  if (t !== 'dark') document.body.classList.add(t);
  if (acad) document.body.classList.add('academy');
  S.settings.theme = t;
  // Picking a classic theme from Settings implies wanting the classic skin
  if (!keepSkin && getStyle().skin !== 'classic') {
    S.settings.style = Object.assign(getStyle(), { skin:'classic' });
    try { localStorage.setItem(STYLE_KEY, JSON.stringify(getStyle())); } catch(e){}
    document.documentElement.setAttribute('data-skin','classic');
    updateStyleMenu();
  }
  persist();
  updateThemeBtn();
}
function cycleTheme() {
  const order = ['dark','light','hc'];
  const cur = S.settings.theme || 'dark';
  setTheme(order[(order.indexOf(cur) + 1) % order.length]);
}
function updateThemeBtn() {
  const t = S.settings.theme || 'dark';
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  btn.innerHTML = ic(t === 'light' ? 'sun' : t === 'hc' ? 'contrast' : 'moon');
  btn.title = `Theme: ${t}`;
  document.querySelectorAll('.theme-opt').forEach(o => {
    o.classList.toggle('active', o.dataset.theme === t);
  });
}

// ================================================================
// ACADEMY MODE — per-mission (simType === 'academy')
// ================================================================
function isAcademyDoc(doc) {
  if (!doc || !doc.missionId) return false;
  const m = S.missions[doc.missionId];
  return m ? m.simType === 'academy' : false;
}
// Is the sim currently open in the editor an Academy sim?
function isAcademyActive() {
  return !!(curId && isAcademyDoc(S.docs[curId]));
}

function stripFormattingHtml(html) {
  if (!html) return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // Unwrap rich formatting tags: bold, italic, strikethrough, underline.
  // Links are allowed in Academy sims, so <a> is deliberately left intact.
  tmp.querySelectorAll('strong, b, em, i, s, strike, u').forEach(el => {
    const p = el.parentNode; if (!p) return;
    while (el.firstChild) p.insertBefore(el.firstChild, el);
    p.removeChild(el);
  });
  // Indent classes are deliberately NOT stripped. Indenting is structure, not
  // character formatting -- the same reason bullets are allowed in Academy sims.
  // This ran on open, on paste and on applying source view, so leaving it in
  // would have silently undone an indent the moment the sim was reopened.
  // Unwrap blockquotes
  tmp.querySelectorAll('blockquote').forEach(bq => {
    const p = bq.parentNode; if (!p) return;
    while (bq.firstChild) p.insertBefore(bq.firstChild, bq);
    p.removeChild(bq);
  });
  return tmp.innerHTML;
}

// ================================================================
// PREFERENCES
// ================================================================
const PREF_DEFAULTS = {
  lineSpacing: 1.15,
  editorFontSize: 12,
  uiFontSize: 15,
  uiFont: '',
  editorFont: '',
  editorFontSameAsUI: false,
  actionAccent: '#ff9999',
  commsAccent: '#66cc99',
  thoughtAccent: '#aabbff',
  actionOn: true,
  commsOn: true,
  thoughtOn: true,
  autoBoldNames: false,
  thoughtItalic: true,
  boldLocations: true,
  italicOOC: false,
  navSceneSort: 'recent-first',
  markerLayout: 'dropdown',
};

const GOOGLE_FONTS = [
  'Abril Fatface','Arvo','Barlow','Bebas Neue','Bitter','Cabin','Cantarell',
  'Caveat','Cormorant Garamond','Courier Prime','Crimson Text','Dancing Script',
  'DM Mono','DM Sans','Droid Sans','Droid Serif','EB Garamond','Exo 2',
  'Fira Code','Fira Sans','IBM Plex Mono','Inconsolata','Inter','JetBrains Mono',
  'Josefin Sans','Jost','Karla','Lato','Libre Baskerville','Lora','Merriweather',
  'Montserrat','Mulish','Noto Sans','Noto Serif','Nunito','Open Sans','Oswald',
  'Pacifico','Permanent Marker','Playfair Display','Poppins','PT Serif','Quicksand',
  'Raleway','Roboto','Roboto Mono','Satisfy','Source Code Pro','Source Sans 3',
  'Source Serif 4','Space Mono','Spectral','Titillium Web','Ubuntu','Work Sans',
];

function loadGoogleFont(fontName) {
  if (!fontName) return;
  const id = 'gf-' + fontName.replace(/\s+/g,'-').toLowerCase();
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}&display=swap`;
  document.head.appendChild(link);
}

function getPrefs() { return Object.assign({}, PREF_DEFAULTS, S.settings.prefs); }

function hexToRgba(hex, alpha) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function applyPrefs() {
  const p = getPrefs();
  const u = p.uiFontSize;
  const style = document.getElementById('prefs-style');
  const editorFontName = p.editorFontSameAsUI ? p.uiFont : p.editorFont;
  if (p.uiFont) loadGoogleFont(p.uiFont);
  if (editorFontName && editorFontName !== p.uiFont) loadGoogleFont(editorFontName);
  const bodyFontRule = p.uiFont ? `body { font-family: '${p.uiFont}', sans-serif; }` : '';
  const editorFontDecl = editorFontName ? `font-family: '${editorFontName}', sans-serif;` : '';
  style.textContent = `
    html { font-size: ${u}px; }
    ${bodyFontRule}
    #editor { line-height: ${p.lineSpacing}; font-size: ${p.editorFontSize}pt; ${editorFontDecl} }
    .am { background:${hexToRgba(p.actionAccent,.30)}; }
    .cm { background:${hexToRgba(p.commsAccent,.30)}; }
    .tm { background:${hexToRgba(p.thoughtAccent,.30)}; font-style:${p.thoughtItalic?'italic':'normal'}; }
    .lm { font-weight:${p.boldLocations?'bold':'normal'}; }
    .om { font-style:${p.italicOOC?'italic':'normal'}; }
    #tbb-am.fmt-on { background:${hexToRgba(p.actionAccent,.35)}!important; border-color:${hexToRgba(p.actionAccent,.6)}!important; color:var(--text)!important; }
    #tbb-cm.fmt-on { background:${hexToRgba(p.commsAccent,.35)}!important; border-color:${hexToRgba(p.commsAccent,.6)}!important; color:var(--text)!important; }
    #tbb-th.fmt-on { background:${hexToRgba(p.thoughtAccent,.35)}!important; border-color:${hexToRgba(p.thoughtAccent,.6)}!important; color:var(--text)!important; }
    #tbb-bn.fmt-on { font-weight:bold!important; color:var(--text)!important; border-color:var(--scroll)!important; background:rgba(128,128,128,.1)!important; }
    #tbb-it.fmt-on { font-style:italic!important; color:var(--text)!important; border-color:var(--scroll)!important; background:rgba(128,128,128,.1)!important; }
    #tbb-bl.fmt-on { font-weight:bold!important; color:var(--text)!important; border-color:var(--scroll)!important; background:rgba(128,128,128,.1)!important; }
    #tbb-oi.fmt-on { font-style:italic!important; color:var(--text)!important; border-color:var(--scroll)!important; background:rgba(128,128,128,.1)!important; }
  `;
  // Sync fmts state from saved prefs and update toolbar buttons
  fmts.action = p.actionOn !== false;
  fmts.comms  = p.commsOn  !== false;
  fmts.thought = p.thoughtOn !== false;
  const fmtMap = {action:'tbb-am', comms:'tbb-cm', thought:'tbb-th'};
  Object.entries(fmtMap).forEach(([t, id]) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('fmt-on', fmts[t]);
  });
  updateAutoBoldBtn();
  updateItalicThoughtsBtn();
  updateBoldLocationsBtn();
  updateItalicOOCBtn();
  const r2 = document.querySelector('#dh .dh-r2');
  if (r2) r2.classList.toggle('mkr-expanded', p.markerLayout === 'buttons');
}

function resetPrefsForm() {
  const d = PREF_DEFAULTS;
  document.getElementById('pf-ls').value = d.lineSpacing;
  document.getElementById('pf-efs').value = d.editorFontSize;
  document.getElementById('pf-ufs').value = d.uiFontSize;
  document.getElementById('pf-ac').value = d.actionAccent;
  document.getElementById('pf-cc').value = d.commsAccent;
  document.getElementById('pf-tc').value = d.thoughtAccent;
  document.getElementById('pf-ao').checked = d.actionOn;
  document.getElementById('pf-co').checked = d.commsOn;
  document.getElementById('pf-to').checked = d.thoughtOn;
  document.getElementById('pf-abn').checked = d.autoBoldNames;
  document.getElementById('pf-ti').checked = d.thoughtItalic;
}

// ================================================================
// EXPORT / IMPORT
// ================================================================
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lcars-' + new Date().toISOString().slice(0,10) + '.lcars';
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  document.getElementById('import-file').value = '';
  document.getElementById('import-file').click();
}

let _pendingImport = null;

function onImportFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    let data;
    try {
      data = JSON.parse(ev.target.result);
      // Unwrap Gist sync format: { data: <S or JSON string>, savedAt: <ts> }
      if (data.savedAt && data.data) {
        data = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      }
    } catch(err) { alert('Invalid file — could not parse JSON.'); return; }
    if (!data.docs || !data.missions) { alert('Invalid LCARS save file.'); return; }
    _pendingImport = data;
    const mCount = Object.keys(data.missions||{}).length;
    const scCount = Object.keys(data.scenes||{}).length;
    const dCount = Object.keys(data.docs||{}).length;
    openModal('IMPORT DATA',
      `<p style="color:var(--dim);font-size:0.87rem;line-height:1.6">
        File: <strong style="color:var(--text)">${esc(file.name)}</strong><br>
        Contains: ${mCount} mission(s), ${scCount} scene(s), ${dCount} sim(s).
      </p>
      <p style="color:var(--dim);font-size:0.87rem;line-height:1.6;margin-top:10px">
        <strong style="color:var(--text)">Overwrite</strong> replaces all current data.<br>
        <strong style="color:var(--text)">Merge</strong> adds imported items alongside existing data.
      </p>`,
      () => applyImport('merge'),
      { ok: 'Merge', extra: [{label:ic('alert') + ' Overwrite', cls:'btn-s', fn:"applyImport('overwrite')"}] }
    );
  };
  reader.readAsText(file);
}

function applyImport(mode) {
  const data = _pendingImport; _pendingImport = null;
  if (!data) return;
  closeModal();
  showToast('Restoring…');
  // Yield a frame before the heavy part. persist() stringifies the entire
  // dataset and renderNav rebuilds the whole tree; on a large backup that is
  // over a second of blocked main thread, which reads as the page having frozen.
  setTimeout(() => {
    if (mode === 'overwrite') {
      Object.assign(S, data);
    } else {
      Object.assign(S.missions, data.missions||{});
      Object.assign(S.scenes, data.scenes||{});
      Object.assign(S.docs, data.docs||{});
    }
    persist();
    curId = null; curView = null; curViewId = null;
    setTheme(S.settings.theme||'dark', true);
    applyStyle();
    applyPrefs();
    renderNav();
    showDashboard();
    showToast(isCloud() ? 'Import complete · saving to your account' : 'Import complete');
    // Restoring a backup is exactly when data most needs to reach the account —
    // without this it would sit locally until the next edit, or be lost with the
    // tab. Deferred again so the restored view paints first.
    if (isCloud()) setTimeout(() => { saveToCloud(); backfillSnapshots(); }, 50);
  }, 30);
}

// ================================================================
// CLOUD SYNC (Supabase)
// ================================================================
// Talks to Supabase over plain fetch rather than their CDN client, so the app
// stays a single dependency-free file and still works with no network at all.
// Two independent ideas live here:
//   * mode  — 'cloud' (signed in, data on the server) or 'local' (offline, this
//             browser only). Every network call is gated on mode === 'cloud'.
//   * auth  — the Supabase session, refreshed on demand when a call 401s.
const SUPA_URL  = 'https://nyjpqaelilrqzmnangft.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55anBxYWVsaWxycXptbmFuZ2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzMwMDIsImV4cCI6MjEwMjI0OTAwMn0.uYUMt49TBW3S_LLse5ZreDQgfL74frlf01jSoHa1qkU';
const AUTH_KEY  = 'lcars_auth_v1';
const MODE_KEY  = 'lcars_mode_v1';

let syncTimer = null;
let syncStatus = { state: 'idle', msg: '' }; // 'idle' | 'syncing' | 'ok' | 'error'

function getMode() { try { return localStorage.getItem(MODE_KEY) || ''; } catch(e) { return ''; } }
function setMode(m) { try { localStorage.setItem(MODE_KEY, m); } catch(e) {} }
function isCloud() { return getMode() === 'cloud'; }

// The downloaded offline copy runs from file://, where the browser sends a null
// Origin and every cross-origin request is refused — an account genuinely cannot
// work there, so this copy never offers one.
function isFileCopy() { return location.protocol === 'file:'; }

function getAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || '{}'); } catch(e) { return {}; } }
function saveAuth(a) { try { localStorage.setItem(AUTH_KEY, JSON.stringify(a)); } catch(e) {} }
function clearAuth() { try { localStorage.removeItem(AUTH_KEY); } catch(e) {} }

// A writer ID is ten characters: first letter of the writer's first ship, the
// four-digit stardate year, the two-digit month, the character's first and last
// initials (last becomes 1 for a single-named character), then the academy list
// digit. e.g. A239809JP3.
// The two initial positions are left loose rather than pinned to letters, since
// that is where the format's documented exceptions live.
function normalizeWriterId(s) { return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function validWriterId(s) {
  return /^[A-Z]\d{6}[A-Z0-9]{2}\d$/.test(normalizeWriterId(s));
}
// The auth account's email is derived from the Writer ID, so signing in needs no
// server-side lookup. It is a synthetic address and never receives mail.
function writerEmail(wid) { return normalizeWriterId(wid).toLowerCase() + '@lcars.local'; }

function setSyncStatus(state, msg) {
  syncStatus = { state, msg };
  const el = document.getElementById('sync-status');
  if (el) {
    el.textContent = msg || '';
    el.style.color = state === 'error' ? 'var(--red,#c66)' : state === 'ok' ? 'var(--dim)' : 'var(--dim)';
  }
}

function supaErr(j, fallback) {
  return (j && (j.error_description || j.msg || j.message || j.error)) || fallback;
}

async function refreshSession() {
  const a = getAuth();
  if (!a.refresh_token) return false;
  try {
    const r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SUPA_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: a.refresh_token })
    });
    if (!r.ok) return false;
    const j = await r.json();
    saveAuth({ ...a, access_token: j.access_token, refresh_token: j.refresh_token || a.refresh_token,
               uid: (j.user && j.user.id) || a.uid, expires_at: Date.now() + (j.expires_in || 3600) * 1000 });
    return true;
  } catch(e) { return false; }
}

// Authenticated call against the Supabase REST/Auth API. Retries once through a
// token refresh when the access token has expired.
async function supaFetch(path, opts = {}, retry = true) {
  const a = getAuth();
  const headers = Object.assign({ 'apikey': SUPA_ANON, 'Content-Type': 'application/json' }, opts.headers || {});
  if (a.access_token) headers['Authorization'] = 'Bearer ' + a.access_token;
  const res = await fetch(SUPA_URL + path, Object.assign({}, opts, { headers }));
  if (res.status === 401 && retry && a.refresh_token) {
    if (await refreshSession()) return supaFetch(path, opts, false);
  }
  return res;
}

async function cloudSignUp(wid, pin) {
  const w = normalizeWriterId(wid);
  const r = await fetch(SUPA_URL + '/auth/v1/signup', {
    method: 'POST',
    headers: { 'apikey': SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: writerEmail(w), password: pin })
  });
  const j = await r.json();
  if (!r.ok) {
    if (/already registered/i.test(supaErr(j, ''))) throw new Error('That Writer ID already has an account. Try signing in instead.');
    throw new Error(supaErr(j, 'Could not create the account.'));
  }
  if (!j.access_token) throw new Error('Account created, but no session came back. Check that "Confirm email" is turned off in Supabase → Authentication → Sign In / Providers → Email.');
  saveAuth({ access_token: j.access_token, refresh_token: j.refresh_token, uid: j.user.id,
             writerId: w, expires_at: Date.now() + (j.expires_in || 3600) * 1000 });
  await supaFetch('/rest/v1/writers', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: j.user.id, writer_id: w })
  });
  setMode('cloud');
  return w;
}

async function cloudSignIn(wid, pin) {
  const w = normalizeWriterId(wid);
  const r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: writerEmail(w), password: pin })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(/invalid/i.test(supaErr(j, '')) ? 'Writer ID or PIN not recognised.' : supaErr(j, 'Could not sign in.'));
  saveAuth({ access_token: j.access_token, refresh_token: j.refresh_token, uid: j.user.id,
             writerId: w, expires_at: Date.now() + (j.expires_in || 3600) * 1000 });
  setMode('cloud');
  return w;
}

function cloudSignOut() {
  clearAuth();
  setMode('');
  // Signing out is done from Settings, and a signed-out writer has no settings
  // to be on -- reloading there lands them on a page built around an account
  // they no longer have. Same reason deleteAccount() does this.
  try { syncRoute('dash', true); } catch(e) {}
  location.reload();
}

// ── Account management ────────────────────────────────────────────────────
// The signed-in-already surface only. Resetting a forgotten PIN and removing
// the login itself both need the service_role key, which must never appear in
// a page served to writers — those stay manual until there is a server
// function to do them (see ROADMAP session 3).

// The writers row holds the two things about a writer that are not the sims
// themselves: a display name, and a recovery email kept for identification.
async function fetchWriterProfile() {
  const a = getAuth();
  if (!a.uid) return { display_name: '', deleted_at: null, link_prompt_seen: true };
  const r = await supaFetch('/rest/v1/writers?select=display_name,deleted_at,link_prompt_seen&id=eq.' + encodeURIComponent(a.uid));
  if (!r.ok) throw new Error('Could not read your account details.');
  const row = (await r.json())[0] || {};
  return { display_name: row.display_name || '', deleted_at: row.deleted_at || null,
           link_prompt_seen: !!row.link_prompt_seen };
}

async function patchWriterProfile(patch) {
  const a = getAuth();
  if (!a.uid) throw new Error('You are not signed in.');
  const r = await supaFetch('/rest/v1/writers?id=eq.' + encodeURIComponent(a.uid), {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(patch)
  });
  if (!r.ok) throw new Error(supaErr(await r.json().catch(()=>null), 'Could not save that.'));
}

async function saveDisplayName(name) {
  const v = (name || '').trim();
  if (v.length > 60) throw new Error('That is longer than 60 characters.');
  await patchWriterProfile({ display_name: v || null });
  return v;
}

// The current PIN is checked by signing in with it rather than trusted from
// the session: it gives a clear error when it is wrong, and it hands back a
// fresh token for the change itself.
async function changePin(currentPin, newPin) {
  const a = getAuth();
  if (!a.writerId) throw new Error('You are not signed in.');
  if ((newPin || '').length < 6) throw new Error('The new PIN must be at least 6 characters.');
  if (currentPin === newPin) throw new Error('That is already your PIN.');

  const chk = await fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: writerEmail(a.writerId), password: currentPin })
  });
  const cj = await chk.json();
  if (!chk.ok) throw new Error('That is not your current PIN.');
  saveAuth({ ...a, access_token: cj.access_token, refresh_token: cj.refresh_token || a.refresh_token,
             expires_at: Date.now() + (cj.expires_in || 3600) * 1000 });

  const r = await supaFetch('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password: newPin }) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(supaErr(j, 'Could not change your PIN.'));
}

// ── Linked accounts (Google / Discord) ────────────────────────────────────
// Optional, and deliberately additive: the Writer ID and PIN remain the primary
// sign-in, so deriving the auth address from the Writer ID still needs no server
// lookup. A linked provider is a second identity on the same auth user — a
// faster way in, and the way back in when the PIN is forgotten.
const PROVIDERS = [
  { id: 'discord', label: 'Discord' },
  { id: 'google',  label: 'Google'  },
];

function providerLabel(id) {
  const p = PROVIDERS.find(x => x.id === id);
  return p ? p.label : id;
}

// Why we sent the browser to a provider. The return leg has no other way of
// telling a link apart from a sign-in, and they end very differently.
// sessionStorage rather than localStorage: it survives the redirect round trip
// in this tab and cannot leak into another one.
const OAUTH_INTENT_KEY = 'lcars_oauth_intent_v1';
function setOAuthIntent(v) { try { sessionStorage.setItem(OAUTH_INTENT_KEY, v); } catch(e) {} }
function takeOAuthIntent() {
  let v = '';
  try { v = sessionStorage.getItem(OAUTH_INTENT_KEY) || ''; sessionStorage.removeItem(OAUTH_INTENT_KEY); } catch(e) {}
  return v || 'link';
}

// Must be on the project's allowed redirect list in Supabase, or the provider
// bounces back with a redirect error rather than returning here.
function oauthRedirectTo() {
  return location.origin + (routeUrl('settings') || '/');
}

// The JWT cannot ride on a top-level navigation, which is the whole difficulty
// with linking. skip_http_redirect=true makes the endpoint hand back the
// provider URL as JSON instead of a 302, so the authenticated part happens over
// fetch and only the harmless navigation that follows is a plain one.
async function linkProvider(provider) {
  const a = getAuth();
  if (!a.access_token) { showToast('You are not signed in.'); return; }
  const q = '?provider=' + encodeURIComponent(provider) +
            '&skip_http_redirect=true' +
            '&redirect_to=' + encodeURIComponent(oauthRedirectTo());
  let r, j;
  try {
    r = await supaFetch('/auth/v1/user/identities/authorize' + q);
    j = await r.json().catch(() => null);
  } catch(e) {
    showToast('Could not reach the server — try again.');
    return;
  }
  if (!r.ok || !j || !j.url) {
    showToast(supaErr(j, 'Could not start linking. Manual linking may be turned off for this project.'));
    return;
  }
  location.href = j.url;
}

// A trap worth naming: an identity carries TWO ids. 'identity_id' is the uuid
// GoTrue's own records use, and the only thing the unlink endpoint accepts;
// 'id' is the provider's user id -- a Discord snowflake or a Google subject.
// Passing the wrong one fails with "identity_id must be an UUID".
function identityKey(i) { return (i && (i.identity_id || i.id)) || ''; }

// Signing in with a provider, as opposed to linking one. No JWT exists yet, so
// this is a plain top-level navigation and needs no apikey -- /authorize is a
// browser endpoint.
function signInWithProvider(provider, intent) {
  setOAuthIntent(intent || 'signin');
  location.href = SUPA_URL + '/auth/v1/authorize?provider=' + encodeURIComponent(provider) +
                  '&redirect_to=' + encodeURIComponent(location.origin + '/');
}

// Coming back from a provider sign-in. The fragment proves who the auth user
// is but says nothing about which Writer ID that is, so it is looked up from
// the writers row -- readable under RLS precisely because it is our own.
async function completeProviderSignIn(f, why) {
  saveAuth({ access_token: f.access_token, refresh_token: f.refresh_token,
             expires_at: Date.now() + f.expires_in * 1000 });
  setMode('cloud');

  let uid = '', writerId = '';
  try {
    const ur = await supaFetch('/auth/v1/user');
    if (!ur.ok) throw new Error('user');
    uid = (await ur.json()).id || '';
    saveAuth({ ...getAuth(), uid });
    const wr = await supaFetch('/rest/v1/writers?select=writer_id&id=eq.' + encodeURIComponent(uid));
    if (!wr.ok) throw new Error('writers');
    const row = (await wr.json())[0];
    writerId = (row && row.writer_id) || '';
  } catch(e) {
    clearAuth(); setMode('');
    showAuthGate(false);
    showToast('Could not reach the server \u2014 sign in with your Writer ID and PIN.', 5200);
    return;
  }

  // A provider account nobody has attached to a Writer ID. Signing them into
  // a blank account would be worse than saying so.
  if (!writerId) { clearAuth(); setMode(''); showProviderNotLinked(); return; }

  saveAuth({ ...getAuth(), writerId });
  await cloudBoot();
  refreshAuthDependentViews();
  showToast('Signed in as ' + writerId);
  if (await checkDeletionPending()) return;
  if (why === 'recover') { showSetNewPin(true); return; }
  maybeShowWizard();
}

function showProviderNotLinked() {
  openModal('That account is not linked yet', `
    <div style="font-size:0.87rem;line-height:1.65">
      <p style="margin:0 0 8px">You signed in successfully, but that Google or Discord account has not been
        linked to a Writer ID, so there is nothing for LCARS to open.</p>
      <p style="margin:0">Sign in with your Writer ID and PIN, then link it under
        <strong>Settings \u2192 Your Account &amp; Data \u2192 Linked accounts</strong>. After that you can use it
        to sign in, and to get back in if you forget your PIN.</p>
    </div>`, null, { noCancel: true, extra: [
      { label: 'Sign in with a Writer ID', cls: 'btn-p', fn: 'closeModal();showAuthGate(false)' }] });
}

// Recovery: a session obtained from a linked provider is enough to set a new
// PIN, because the current PIN is exactly what has been lost. changePin() is
// the other path and still demands the old one.
async function setNewPin(newPin) {
  if ((newPin || '').length < 6) throw new Error('Your new PIN must be at least 6 characters.');
  const r = await supaFetch('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password: newPin }) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(supaErr(j, 'Could not set your new PIN.'));
}

function showSetNewPin(afterRecovery) {
  openModal(afterRecovery ? 'Set a new PIN' : 'Set a new PIN', `
    <div style="font-size:0.85rem;line-height:1.6;margin-bottom:12px">
      ${afterRecovery
        ? 'You are back in. Choose a new PIN now \u2014 you will need it next time you sign in with your Writer ID.'
        : 'Choose a new PIN.'}
    </div>
    <div class="mf"><label class="ml">NEW PIN <span style="font-weight:normal;opacity:0.6">(at least 6 characters)</span></label>
      <input class="mi" id="newpin-a" type="password" autocomplete="new-password"></div>
    <div class="mf"><label class="ml">NEW PIN AGAIN</label>
      <input class="mi" id="newpin-b" type="password" autocomplete="new-password"></div>
    <div id="newpin-msg" style="font-size:0.76rem;line-height:1.5;min-height:1.1em;color:var(--red,#c66)"></div>
  `, () => {
    const msg = document.getElementById('newpin-msg');
    const a = document.getElementById('newpin-a').value;
    const b = document.getElementById('newpin-b').value;
    if (a !== b) { msg.textContent = 'The two PINs do not match.'; return false; }
    msg.style.color = 'var(--dim)'; msg.textContent = 'Saving\u2026';
    setNewPin(a)
      .then(() => { closeModal(); showToast('PIN set \u2014 use it next time you sign in'); })
      .catch(e => { msg.style.color = 'var(--red,#c66)'; msg.textContent = e.message; });
    return false;
  }, { ok: 'Set my PIN', noCancel: !!afterRecovery });
}

// Offered from the sign-in form. Only ever a route back in for someone who
// linked an account beforehand -- everyone else needs the maintainer, and the
// copy says so rather than leaving them clicking hopefully.
function showForgotPin() {
  gateClose();
  setTimeout(() => openModal('Forgotten your PIN?', `
    <div style="font-size:0.87rem;line-height:1.65">
      <p style="margin:0 0 10px">If you linked a Google or Discord account, sign in with it and you can set a
        new PIN straight away.</p>
      <p style="margin:0 0 4px;color:var(--dim);font-size:0.8rem">No linked account, or the options above
        are not working? Ask a moderator to reset it for you.</p>
    </div>`, null, { extra: [
      { label: 'Continue with Discord', cls: 'btn-p', fn: "signInWithProvider('discord','recover')" },
      { label: 'Continue with Google', cls: 'btn-p', fn: "signInWithProvider('google','recover')" },
      { label: 'Request a PIN reset', fn: 'showRequestReset()' }] }), 60);
}

async function fetchIdentities() {
  const r = await supaFetch('/auth/v1/user');
  if (!r.ok) throw new Error('Could not read your linked accounts.');
  const u = await r.json();
  // The email identity is the Writer ID login itself — it is not something a
  // writer linked, and it must never look unlinkable.
  return (u.identities || []).filter(i => i.provider !== 'email');
}

async function unlinkProvider(identityId) {
  const r = await supaFetch('/auth/v1/user/identities/' + encodeURIComponent(identityId), { method: 'DELETE' });
  if (!r.ok) throw new Error(supaErr(await r.json().catch(() => null), 'Could not unlink that account.'));
}

function confirmUnlinkProvider(identityId, provider) {
  const label = providerLabel(provider);
  openModal('Unlink ' + label, `
    <div style="font-size:0.87rem;line-height:1.65">
      <p style="margin:0 0 8px">You will no longer be able to sign in with ${esc(label)}, or use it to get
        back in if you forget your PIN.</p>
      <p style="margin:0">Your Writer ID and PIN are unaffected, and nothing is deleted.</p>
    </div>`, () => {
      unlinkProvider(identityId)
        .then(() => { showToast(label + ' unlinked'); loadIdentities(); closeModal(); })
        .catch(e => showToast(prettyOAuthError(e.message), 5200));
      return false;
    }, { ok: 'Unlink' });
}

// The return leg. Supabase sends the browser back to redirect_to with the
// outcome in the URL fragment — tokens on success, an error description on
// failure. The fragment is cleared either way so a reload cannot replay it.
function readOAuthFragment() {
  const h = (location.hash || '').replace(/^#/, '');
  if (!h || h.indexOf('=') === -1) return null;
  const p = new URLSearchParams(h);
  if (!p.get('access_token') && !p.get('error') && !p.get('error_description')) return null;
  try { history.replaceState(null, '', location.pathname + location.search); } catch(e) {}
  return {
    access_token: p.get('access_token'),
    refresh_token: p.get('refresh_token'),
    expires_in: Number(p.get('expires_in') || 3600),
    error: p.get('error_description') || p.get('error'),
  };
}

// Provider errors arrive as machine text; these are the ones a writer can
// actually meet, so they get said in words that suggest what to do.
function prettyOAuthError(msg) {
  const m = String(msg || '');
  if (/already.*linked|identity.*already/i.test(m))
    return 'That account is already linked — to this Writer ID or to another one.';
  if (/manual linking.*disabled|not enabled/i.test(m))
    return 'Account linking is turned off for LCARS right now. Tell the maintainer.';
  if (/redirect/i.test(m))
    return 'That sign-in came back to an address LCARS does not recognise. Tell the maintainer.';
  return m.replace(/\+/g, ' ') || 'That did not work. Please try again.';
}

// Returns 'signin' when a provider sign-in has taken over the rest of boot,
// so the caller knows not to raise the gate or start its own load. 'link' and
// null both leave boot to carry on as normal.
function handleOAuthReturn() {
  const f = readOAuthFragment();
  if (!f) return null;
  const why = takeOAuthIntent();

  if (f.error) {
    setTimeout(() => showToast(prettyOAuthError(f.error), 5200), 500);
    // A failed sign-in must not leave a half-made session behind; a failed
    // link changes nothing, so the existing session stands.
    if (why !== 'link') { clearAuth(); setMode(''); }
    return null;
  }
  if (!f.access_token) return null;

  if (why === 'link') {
    // Same auth user — keep the Writer ID and uid already on file and take
    // only the freshened session.
    const a = getAuth();
    saveAuth({ ...a, access_token: f.access_token, refresh_token: f.refresh_token || a.refresh_token,
               expires_at: Date.now() + f.expires_in * 1000 });
    setMode('cloud');
    setTimeout(() => showToast('Account linked'), 500);
    return 'link';
  }

  completeProviderSignIn(f, why);
  return 'signin';
}

function loadIdentities() {
  const el = document.getElementById('acct-links');
  if (!el || !isCloud()) return;
  fetchIdentities()
    .then(paintIdentities)
    .catch(() => {
      el.innerHTML = '<span class="set-note" style="margin:0;color:var(--red,#c66)">' +
                     'Linked accounts could not be read — check your connection.</span>';
    });
}

function paintIdentities(list) {
  const el = document.getElementById('acct-links');
  if (!el) return;
  el.innerHTML = PROVIDERS.map(p => {
    const found = (list || []).find(i => i.provider === p.id);
    if (!found) {
      return setBtn(`linkProvider('${p.id}')`, 'link', 'Link ' + p.label,
        'Sign in with ' + p.label + ', and use it if you forget your PIN.');
    }
    const d = found.identity_data || {};
    const who = d.email || d.name || d.full_name || d.preferred_username || '';
    return setBtn(`confirmUnlinkProvider('${identityKey(found)}','${p.id}')`, 'link', p.label + ' — linked',
      (who ? esc(who) + '. ' : '') + 'Click to unlink.');
  }).join('');
}

// ── Roles, the reset queue and the admin view ─────────────────────────────
// Writers who linked a provider recover their own PIN. Everyone else has no
// automatic way back in, and this is the human route: they file a request, and
// any moderator can action it without leaving LCARS.
//
// Nothing here is a security boundary. The header button, the view and every
// guard below are conveniences — the real checks are row level security on
// pin_reset_requests and the role tests inside the security definer functions,
// both of which hold whether or not this page cooperates. Typing /admin with a
// writer's account gets you a view that asks the database for the queue and is
// handed nothing back.
let _myRole = 'writer';
let _adminOpen = 0;              // open requests, as of the last count
let _adminTab = 'open';
let _adminTimer = null;

function isModerator() { return _myRole === 'moderator' || _myRole === 'super_admin'; }
function isSuperAdmin() { return _myRole === 'super_admin'; }

// Calls a Postgres function over PostgREST. Errors come back as {message}, and
// the messages these functions raise are written to be shown as they are.
async function supaRpc(fn, args) {
  const r = await supaFetch('/rest/v1/rpc/' + fn, { method: 'POST', body: JSON.stringify(args || {}) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(supaErr(j, 'That did not work.'));
  return j;
}

// The role is read once per boot and cached. It decides what is drawn, never
// what is permitted, so a stale copy costs a wasted click and nothing more.
async function loadMyRole() {
  if (!isCloud()) { _myRole = 'writer'; return _myRole; }
  try { _myRole = (await supaRpc('my_role')) || 'writer'; }
  catch(e) { _myRole = 'writer'; }
  return _myRole;
}

// The badge is the whole point of the panel being in the header: a request is
// no use to anyone if it sits unseen. Every moderator sees the same count,
// because it is a count of the queue rather than of anything assigned.
async function refreshAdminBadge() {
  const btn = document.getElementById('btn-admin');
  const badge = document.getElementById('admin-badge');
  if (!btn || !badge) return;
  btn.classList.toggle('hidden', !isModerator() || !isCloud());
  if (!isModerator() || !isCloud()) return;
  try {
    const r = await supaFetch('/rest/v1/pin_reset_requests?select=id&status=eq.open', {
      method: 'GET', headers: { 'Prefer': 'count=exact', 'Range': '0-0' }
    });
    if (!r.ok) return;
    const cr = r.headers.get('content-range') || '';
    const n = Number((cr.split('/')[1] || '0')) || 0;
    _adminOpen = n;
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.classList.toggle('hidden', n === 0);
    btn.classList.toggle('has-pending', n > 0);
  } catch(e) { /* offline — the count can wait for the next pass */ }
}

// Boot, and then a quiet poll while the app is open. Ten minutes: a PIN reset
// is not urgent to the minute, and every moderator's browser is asking.
async function initAdmin() {
  if (!isCloud()) return;
  await loadMyRole();
  if (!isModerator()) return;
  refreshAdminBadge();
  if (_adminTimer) clearInterval(_adminTimer);
  _adminTimer = setInterval(refreshAdminBadge, 10 * 60 * 1000);
}

async function fetchResetRequests(open) {
  const q = open ? 'status=eq.open&order=created_at.asc'
                 : 'status=neq.open&order=decided_at.desc&limit=100';
  const r = await supaFetch('/rest/v1/pin_reset_requests?select=*&' + q);
  if (!r.ok) throw new Error('Could not read the queue.');
  return await r.json();
}

function openAdmin(fromRoute) { showView('admin', fromRoute); }

function adminTab(tab) { _adminTab = tab; renderAdminView(); }

function renderAdminView() {
  const el = document.getElementById('view-admin');
  if (!el) return;

  if (!isCloud() || !isModerator()) {
    el.innerHTML = `
      <div class="set-wrap">
        <div class="set-card">
          <div class="msec">ADMIN</div>
          <div class="set-block">
            <p style="font-size:0.87rem;line-height:1.65;margin:0">You do not have access to this area.</p>
            <span class="set-note">Moderator tools are for the writers who look after accounts for the fleet.</span>
          </div>
        </div>
      </div>`;
    return;
  }

  const open = _adminTab === 'open';
  el.innerHTML = `
    <div class="set-wrap">
      <div class="set-head">
        <span class="set-sub">MODERATOR TOOLS &middot; signed in as ${esc(getAuth().writerId || '')} (${esc(roleLabel(_myRole))})</span>
      </div>
      <div class="set-card">
        <div class="msec">PIN RESET REQUESTS</div>
        <div class="set-block">
          <div class="adm-tabs">
            <button class="btn ${open ? 'btn-p' : 'btn-s'}" onclick="adminTab('open')">${ic('alert')} Waiting${_adminOpen ? ' (' + _adminOpen + ')' : ''}</button>
            <button class="btn ${open ? 'btn-s' : 'btn-p'}" onclick="adminTab('done')">${ic('archive')} Archive</button>
          </div>
          <div id="adm-list"><span class="set-note">Loading…</span></div>
        </div>
      </div>
      ${isSuperAdmin() ? adminRolesCard() : ''}
    </div>`;

  if (isSuperAdmin()) loadWriters();

  fetchResetRequests(open)
    .then(rows => paintResetRequests(rows, open))
    .catch(() => {
      const l = document.getElementById('adm-list');
      if (l) l.innerHTML = '<span class="set-note" style="color:var(--red,#c66)">The queue could not be read — check your connection.</span>';
    });
  if (open) refreshAdminBadge();
}

function roleLabel(r) {
  return r === 'super_admin' ? 'super admin' : r === 'moderator' ? 'moderator' : 'writer';
}

function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
         ' at ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function paintResetRequests(rows, open) {
  const el = document.getElementById('adm-list');
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<span class="set-note">' +
      (open ? 'Nothing waiting. Requests appear here as they are filed.'
            : 'Nothing decided yet.') + '</span>';
    return;
  }
  el.innerHTML = rows.map(q => `
    <div class="adm-req${open ? '' : ' adm-req-done'}">
      <div class="adm-req-hdr">
        <span class="adm-req-wid">${esc(q.writer_id)}</span>
        <span class="adm-req-when">${esc(fmtWhen(q.created_at))}</span>
        ${open ? '' : `<span class="adm-req-tag adm-${esc(q.status)}">${q.status === 'actioned' ? 'Reset issued' : 'Rejected'}</span>`}
      </div>
      <div class="adm-req-note">${esc(q.note)}</div>
      ${open ? `
      <div class="adm-req-acts">
        <button class="btn btn-p" onclick="confirmActionReset('${q.id}','${esc(q.writer_id)}')">${ic('check')} Issue a temporary PIN</button>
        <button class="btn btn-s" onclick="confirmRejectReset('${q.id}','${esc(q.writer_id)}')">${ic('x')} Reject</button>
      </div>` : `
      <div class="adm-req-foot">${esc(q.status === 'actioned' ? 'Issued by' : 'Rejected by')}
        ${esc(q.decided_by || 'a moderator')} &middot; ${esc(fmtWhen(q.decided_at))}</div>`}
    </div>`).join('');
}

// The whole point of the confirm is that the moderator has read the note and
// satisfied themselves, so the note is in front of them while they decide.
function confirmActionReset(id, wid) {
  openModal('Issue a temporary PIN', `
    <div style="font-size:0.87rem;line-height:1.65">
      <p style="margin:0 0 10px">This will reset the PIN for <strong>${esc(wid)}</strong> and give you a
        temporary one to pass on. Their existing PIN stops working immediately, and they will be made to
        choose a new one as soon as they sign in.</p>
      <p style="margin:0;color:var(--dim);font-size:0.8rem">Only do this once you are satisfied the request
        really came from them — send the temporary PIN back the way they asked to be contacted, never
        anywhere public.</p>
    </div>`, () => {
      supaRpc('admin_action_reset', { p_request_id: id })
        .then(pin => { closeModal(); showTempPin(wid, pin); refreshAdminBadge(); })
        .catch(e => showToast(e.message, 5200));
      return false;
    }, { ok: 'Issue it' });
}

// Shown once and never stored anywhere readable. Losing it before it is passed
// on is not a disaster — action the request again for a fresh one.
function showTempPin(wid, pin) {
  openModal('Temporary PIN for ' + wid, `
    <div style="font-size:0.87rem;line-height:1.65">
      <p style="margin:0 0 10px">Send this to them however they asked to be contacted. It is shown only
        now — LCARS does not keep a readable copy.</p>
      <div class="adm-pin" id="adm-temp-pin">${esc(pin)}</div>
      <p style="margin:10px 0 0;color:var(--dim);font-size:0.8rem">They sign in with their Writer ID and this
        PIN, and LCARS will ask them to choose a new one straight away.</p>
    </div>`, null, { noCancel: true, extra: [
      { label: 'Copy the PIN', cls: 'btn-p', fn: `copyTempPin('${esc(pin)}')` },
      { label: 'Done', fn: 'closeModal();renderAdminView()' }] });
}

function copyTempPin(pin) {
  navigator.clipboard.writeText(pin)
    .then(() => showToast('Temporary PIN copied'))
    .catch(() => showToast('Could not copy — select it and copy by hand', 4000));
}

function confirmRejectReset(id, wid) {
  openModal('Reject this request', `
    <div style="font-size:0.87rem;line-height:1.65">
      <p style="margin:0 0 10px">The request from <strong>${esc(wid)}</strong> will be closed and will stop
        showing in everyone's queue. It stays in the Archive as a record.</p>
      <p style="margin:0;color:var(--dim);font-size:0.8rem">There is no way to reply — whoever filed it is
        locked out, so nothing LCARS sends could reach them. If it might be genuine, contact them yourself
        rather than rejecting it.</p>
    </div>`, () => {
      supaRpc('admin_reject_reset', { p_request_id: id })
        .then(() => { closeModal(); showToast('Request rejected'); refreshAdminBadge(); renderAdminView(); })
        .catch(e => showToast(e.message, 5200));
      return false;
    }, { ok: 'Reject it' });
}

// The roster. Super admins only, and the role is set from the row itself --
// looking someone up and then retyping their Writer ID into a separate box was
// two chances to promote the wrong person.
function adminRolesCard() {
  return `
    <div class="set-card">
      <div class="msec">WRITERS &amp; ROLES</div>
      <div class="set-block">
        <span class="set-note" style="margin:0 0 10px">Moderators see the reset queue and nothing else — no
          writer list, no access to anyone's sims. Super admins can also assign roles.</span>
        <input class="mi" id="adm-w-filter" placeholder="Filter by Writer ID or display name…"
               autocomplete="off" oninput="paintWriters()">
        <div id="adm-writers"><span class="set-note">Loading…</span></div>
      </div>
    </div>`;
}

let _writers = [];

function loadWriters() {
  if (!isSuperAdmin()) return;
  supaRpc('admin_list_writers')
    .then(rows => { _writers = rows || []; paintWriters(); })
    .catch(e => {
      const el = document.getElementById('adm-writers');
      if (el) el.innerHTML = '<span class="set-note" style="color:var(--red,#c66)">' + esc(e.message) + '</span>';
    });
}

const ROLE_OPTS = [
  { v: 'writer',      l: 'Writer' },
  { v: 'moderator',   l: 'Moderator' },
  { v: 'super_admin', l: 'Super admin' },
];

function paintWriters() {
  const el = document.getElementById('adm-writers');
  if (!el) return;
  const f = ((document.getElementById('adm-w-filter') || {}).value || '').trim().toUpperCase();
  const rows = _writers.filter(w =>
    !f || (w.writer_id || '').includes(f) || (w.display_name || '').toUpperCase().includes(f));

  if (!rows.length) {
    el.innerHTML = '<span class="set-note">' +
      (_writers.length ? 'No writer matches that.' : 'No accounts yet.') + '</span>';
    return;
  }

  el.innerHTML = `
    <div class="adm-w-count">${rows.length} of ${_writers.length} account${_writers.length === 1 ? '' : 's'}</div>
    <div class="adm-w-scroll">
      <table class="adm-w-tbl">
        <thead><tr><th>Writer ID</th><th>Display name</th><th>Joined</th><th>Role</th></tr></thead>
        <tbody>
          ${rows.map(w => `
            <tr${w.deleted_at ? ' class="adm-w-going"' : ''}>
              <td class="adm-w-id">${esc(w.writer_id)}${w.is_me ? '<span class="adm-w-you">you</span>' : ''}
                ${w.deleted_at ? '<span class="adm-w-del">deletion pending</span>' : ''}</td>
              <td>${w.display_name ? esc(w.display_name) : '<span class="adm-w-none">not set</span>'}</td>
              <td class="adm-w-when">${esc(fmtJoined(w.created_at))}</td>
              <td>
                <select class="mi adm-w-role" ${w.is_me ? 'disabled title="You cannot change your own role — with no super admin left, the only way back is a hand-run SQL statement"' : ''}
                        onchange="setRoleFromRow('${esc(w.writer_id)}', this)">
                  ${ROLE_OPTS.map(o => `<option value="${o.v}"${w.role === o.v ? ' selected' : ''}>${o.l}</option>`).join('')}
                </select>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div id="adm-w-msg" class="set-note" style="min-height:1.1em"></div>`;
}

function fmtJoined(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Changing a role from a dropdown is one keystroke away from an accident, and
// promoting the wrong person to super admin is not quietly undoable -- they can
// demote you. So a change is confirmed, and the select snaps back if it is not.
function setRoleFromRow(wid, sel) {
  const to = sel.value;
  const was = (_writers.find(w => w.writer_id === wid) || {}).role || 'writer';
  if (to === was) return;
  const revert = () => { sel.value = was; };

  openModal('Change role', `
    <div style="font-size:0.87rem;line-height:1.65">
      <p style="margin:0 0 10px"><strong>${esc(wid)}</strong> becomes a <strong>${esc(roleLabel(to))}</strong>.</p>
      <p style="margin:0;color:var(--dim);font-size:0.8rem">${
        to === 'super_admin'
          ? 'A super admin can see every account, assign roles, and action reset requests — including changing your role.'
          : to === 'moderator'
            ? 'A moderator can see the PIN reset queue and issue temporary PINs. They cannot see this list.'
            : 'They lose access to the reset queue and the moderator tools.'}</p>
    </div>`, () => {
      const msg = document.getElementById('adm-w-msg');
      supaRpc('admin_set_role', { p_writer_id: wid, p_role: to })
        .then(() => {
          closeModal();
          const w = _writers.find(x => x.writer_id === wid);
          if (w) w.role = to;
          showToast(wid + ' is now a ' + roleLabel(to));
          paintWriters();
        })
        .catch(e => {
          closeModal(); revert();
          if (msg) { msg.style.color = 'var(--red,#c66)'; msg.textContent = e.message; }
          else showToast(e.message, 5200);
        });
      return false;
    }, { ok: 'Change it' });
  // openModal has no cancel callback -- Cancel just hides it. Without this, a
  // dismissed confirm would leave the dropdown showing a role that was never
  // set, which reads as though it had been.
  const mo = document.getElementById('mo');
  const watch = setInterval(() => {
    if (mo.classList.contains('hidden')) {
      clearInterval(watch);
      const w = _writers.find(x => x.writer_id === wid);
      if (w && w.role !== sel.value) revert();
    }
  }, 200);
}

// ── Asking for a reset ────────────────────────────────────────────────────
// Filed by someone with no session, so it goes through request_pin_reset()
// rather than a table write. An unknown Writer ID is accepted and dropped on
// the floor — so the confirmation has to tell them to check what they typed,
// since that is the one mistake with no other symptom.
function showRequestReset() {
  closeModal();
  setTimeout(() => openModal('Request a PIN reset', `
    <div style="font-size:0.85rem;line-height:1.6;margin-bottom:12px">
      A moderator will reset your PIN by hand and send you a temporary one. Tell them how to check the
      request really came from you — an email address or Discord handle they can reach you at.
    </div>
    <div class="mf"><label class="ml">YOUR WRITER ID</label>
      <input class="mi" id="rr-wid" placeholder="A239809JP3" autocomplete="off"></div>
    <div class="mf"><label class="ml">HOW CAN WE CONFIRM IT IS YOU?</label>
      <textarea class="mi" id="rr-note" rows="3" style="resize:vertical"
        placeholder="e.g. I'm @name on the SB118 Discord, or email me at name@example.com"></textarea></div>
    <div id="rr-msg" style="font-size:0.76rem;line-height:1.5;min-height:1.1em;color:var(--red,#c66)"></div>
  `, () => {
    const msg = document.getElementById('rr-msg');
    const wid = (document.getElementById('rr-wid').value || '').trim();
    const note = (document.getElementById('rr-note').value || '').trim();
    if (!validWriterId(wid)) { msg.textContent = 'That does not look like a Writer ID — it should be ten characters, like A239809JP3.'; return false; }
    if (note.length < 10) { msg.textContent = 'Please say how a moderator can confirm it is you.'; return false; }
    msg.style.color = 'var(--dim)'; msg.textContent = 'Sending…';
    supaRpc('request_pin_reset', { p_writer_id: normalizeWriterId(wid), p_note: note })
      .then(() => { closeModal(); showResetRequested(normalizeWriterId(wid)); })
      .catch(e => { msg.style.color = 'var(--red,#c66)'; msg.textContent = e.message; });
    return false;
  }, { ok: 'Send the request' }), 60);
}

function showResetRequested(wid) {
  openModal('Request sent', `
    <div style="font-size:0.87rem;line-height:1.65">
      <p style="margin:0 0 10px">A moderator will be in touch using the contact details you gave.</p>
      <p style="margin:0;color:var(--dim);font-size:0.8rem">If you do not hear anything, check you typed your
        Writer ID exactly right — <strong>${esc(wid)}</strong>. A request filed against an ID that has no
        LCARS account cannot reach anyone, and nothing will tell you so.</p>
    </div>`, null, { noCancel: true, extra: [
      { label: 'Back to sign in', cls: 'btn-p', fn: 'closeModal();showAuthGate(false)' }] });
}

// ── The temporary PIN, on the other side ──────────────────────────────────
// A PIN that has been read out over Discord is not a PIN. must_change_pin is
// set when one is issued, and this is what makes it last exactly one sign-in.
async function checkMustChangePin() {
  if (!isCloud()) return false;
  try {
    const a = getAuth();
    if (!a.uid) return false;
    const r = await supaFetch('/rest/v1/writers?select=must_change_pin&id=eq.' + encodeURIComponent(a.uid));
    if (!r.ok) return false;
    const row = (await r.json())[0];
    if (!row || !row.must_change_pin) return false;
    showChooseOwnPin();
    return true;
  } catch(e) { return false; }
}

function showChooseOwnPin() {
  openModal('Choose your own PIN', `
    <div style="font-size:0.85rem;line-height:1.6;margin-bottom:12px">
      You signed in with a temporary PIN issued by a moderator. Someone else has seen it, so choose one of
      your own now — the temporary one stops working as soon as you do.
    </div>
    <div class="mf"><label class="ml">NEW PIN <span style="font-weight:normal;opacity:0.6">(at least 6 characters)</span></label>
      <input class="mi" id="newpin-a" type="password" autocomplete="new-password"></div>
    <div class="mf"><label class="ml">NEW PIN AGAIN</label>
      <input class="mi" id="newpin-b" type="password" autocomplete="new-password"></div>
    <div id="newpin-msg" style="font-size:0.76rem;line-height:1.5;min-height:1.1em;color:var(--red,#c66)"></div>
  `, () => {
    const msg = document.getElementById('newpin-msg');
    const a = document.getElementById('newpin-a').value;
    const b = document.getElementById('newpin-b').value;
    if (a !== b) { msg.textContent = 'The two PINs do not match.'; return false; }
    msg.style.color = 'var(--dim)'; msg.textContent = 'Saving…';
    setNewPin(a)
      .then(() => patchWriterProfile({ must_change_pin: false }))
      .then(() => { closeModal(); showToast('PIN set — that is the one to use from now on'); })
      .catch(e => { msg.style.color = 'var(--red,#c66)'; msg.textContent = e.message; });
    return false;
  }, { ok: 'Set my PIN', noCancel: true });
}

// Snapshots are ten full copies of a sim's HTML apiece. Kept in the main payload
// they dominated its size and were re-uploaded on every single save, so they go
// to their own table and are fetched only when the history modal is opened.
// doc.snapshots stays as the local copy — offline mode needs it, and restoring
// from it is instant.
function cloudPayload() {
  const docs = {};
  for (const k in (S.docs || {})) {
    const { snapshots, ...rest } = S.docs[k];
    docs[k] = rest;
  }
  return { ...S, docs };
}

async function pushSnapshot(docId, snap) {
  if (!isCloud()) return;
  const a = getAuth();
  if (!a.uid) return;
  try {
    const r = await supaFetch('/rest/v1/snapshots', {
      method: 'POST',
      body: JSON.stringify({ writer_uid: a.uid, doc_id: docId, html: snap.content,
                             word_count: snap.wordCount, created_at: new Date(snap.savedAt).toISOString() })
    });
    if (r.ok) await pruneSnapshots(docId);
  } catch(e) { /* local copy still holds it */ }
}

// Keep the server to the same ten-per-sim cap as local.
async function pruneSnapshots(docId) {
  const a = getAuth();
  const q = '/rest/v1/snapshots?writer_uid=eq.' + encodeURIComponent(a.uid) +
            '&doc_id=eq.' + encodeURIComponent(docId);
  const r = await supaFetch(q + '&select=id&order=created_at.desc&limit=200&offset=10');
  if (!r.ok) return;
  const old = await r.json();
  for (const row of old) await supaFetch('/rest/v1/snapshots?id=eq.' + row.id, { method: 'DELETE' });
}

async function fetchSnapshots(docId) {
  const a = getAuth();
  if (!a.uid) return null;
  const r = await supaFetch('/rest/v1/snapshots?writer_uid=eq.' + encodeURIComponent(a.uid) +
                            '&doc_id=eq.' + encodeURIComponent(docId) +
                            '&select=html,word_count,created_at&order=created_at.asc');
  if (!r.ok) return null;
  const rows = await r.json();
  return rows.map(x => ({ content: x.html, wordCount: x.word_count, savedAt: new Date(x.created_at).getTime() }));
}

// One-off: lift snapshots that already existed locally up to the server, so a
// writer's existing history follows them to a new device.
async function backfillSnapshots() {
  if (!isCloud() || S._snapBackfill) return;
  for (const id in (S.docs || {})) {
    for (const snap of (S.docs[id].snapshots || [])) await pushSnapshot(id, snap);
  }
  S._snapBackfill = true;
  persist();
}

// Push the whole state. localStorage keeps its own copy either way, so a failed
// push is a warning rather than data loss.
async function saveToCloud() {
  if (!isCloud()) return;
  const a = getAuth();
  if (!a.uid) return;
  setSyncStatus('syncing', 'Saving…');
  try {
    const r = await supaFetch('/rest/v1/state', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ writer_uid: a.uid, payload: cloudPayload(), updated_at: new Date().toISOString() })
    });
    if (!r.ok) throw new Error((await r.text()).slice(0, 160));
    setSyncStatus('ok', 'Saved ' + new Date().toLocaleTimeString());
  } catch(e) {
    setSyncStatus('error', 'Not saved — kept on this device. ' + (e.message || ''));
  }
}

async function loadFromCloud() {
  const a = getAuth();
  if (!a.uid) return null;
  const r = await supaFetch('/rest/v1/state?writer_uid=eq.' + encodeURIComponent(a.uid) + '&select=payload,updated_at');
  if (!r.ok) throw new Error('Could not reach your saved data.');
  const rows = await r.json();
  return rows && rows[0] ? rows[0] : null;
}

// Debounced auto-save. Name and signature are unchanged from the Gist era so
// every existing call site still works.
function schedSync(delay) {
  if (!isCloud()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(saveToCloud, delay || 5000);
}

function hasLocalData() {
  return !!(S && S.docs && Object.keys(S.docs).length);
}

// Boot path for a signed-in writer: pull the server copy, and reconcile if this
// browser also has local work.
async function cloudBoot() {
  if (!isCloud()) return;
  purgeExpiredDeletions();          // clears out anyone whose grace period lapsed
  purgeExpiredShares();             // and any share link that has run out
  setSyncStatus('syncing', 'Loading…');
  let row;
  try { row = await loadFromCloud(); }
  catch(e) { setSyncStatus('error', 'Working offline — could not reach the server.'); return; }

  if (!row) {                       // nothing on the server yet
    if (hasLocalData()) { await saveToCloud(); await backfillSnapshots(); }
    else setSyncStatus('ok', '');
    return;
  }
  const remote = row.payload || {};
  const remoteDocs = Object.keys(remote.docs || {}).length;

  if (!hasLocalData()) { adoptCloudState(remote); setSyncStatus('ok', ''); return; }
  backfillSnapshots();              // lift any pre-existing local history up once

  // Both sides have data. Same account on a second device is the normal case, so
  // prefer the server, but never silently discard local work.
  const localDocs = Object.keys(S.docs || {}).length;
  if (remoteDocs >= localDocs) { adoptCloudState(remote); setSyncStatus('ok', ''); return; }

  openModal('Which copy is right?',
    `<div style="font-size:0.85rem;line-height:1.6">
      <p>This browser has <strong>${localDocs} sim(s)</strong>, but your account holds <strong>${remoteDocs}</strong>.</p>
      <p>Keeping this device's copy will replace what is stored online. Backup Data first if you are unsure.</p>
     </div>`,
    null,
    { noCancel: true, extra: [
      { label: 'Use my account\'s copy', cls: 'btn-p', fn: 'adoptCloudFromPrompt()' },
      { label: 'Keep this device\'s copy', fn: 'closeModal();saveToCloud()' }
    ] });
  _pendingCloudState = remote;
}

let _pendingCloudState = null;
function adoptCloudFromPrompt() {
  if (_pendingCloudState) adoptCloudState(_pendingCloudState);
  _pendingCloudState = null;
  closeModal();
}

function adoptCloudState(remote) {
  if (!remote || !remote.docs) return;
  Object.assign(S, remote);
  persist();
  curId = null; curView = null; curViewId = null;
  setTheme(S.settings.theme || 'dark', true);
  applyStyle(); applyPrefs(); renderNav(); showDashboard();
}

// ================================================================
// ERASE / DELETE
// ================================================================
// Both paths demand a typed confirmation rather than an OK button, because
// neither can be undone and a backup is the only way back.
function eraseConfirmBody(word, warning) {
  return `<div style="font-size:0.87rem;line-height:1.65">
      ${warning}
      <p style="margin:12px 0 6px">Type <strong>${word}</strong> below to confirm.</p>
      <input class="mi" id="erase-confirm" type="text" autocomplete="off" spellcheck="false" placeholder="${word}">
    </div>`;
}

function confirmEraseData() {
  closeModal();
  setTimeout(() => openModal('Erase all sims and characters',
    eraseConfirmBody('ERASE',
      `<p style="margin:0 0 8px">This removes every mission, scene, sim and character from LCARS.</p>
       <p style="margin:0 0 8px">${isCloud()
         ? 'Your account stays and you remain signed in, but the erase is synced — it will clear on your other devices too.'
         : 'This applies to this browser only.'}</p>
       <p style="margin:0"><strong>There is no undo.</strong> If you have not taken a backup, cancel and do that first.</p>`),
    () => {
      const v = (document.getElementById('erase-confirm').value || '').trim().toUpperCase();
      if (v !== 'ERASE') { showToast('Type ERASE to confirm'); return false; }
      eraseAllData();
    },
    { ok: 'Erase everything' }), 60);
}

async function eraseAllData() {
  S.docs = {}; S.missions = {}; S.scenes = {}; S.characters = {}; S.templates = [];
  persist();
  curId = null; curView = null; curViewId = null;
  renderNav(); showDashboard(); showView('dash');
  showToast('Everything erased');
  if (isCloud()) {
    await saveToCloud();
    const a = getAuth();
    if (a.uid) await supaFetch('/rest/v1/snapshots?writer_uid=eq.' + encodeURIComponent(a.uid), { method: 'DELETE' });
  }
}

// ── Account deletion ──────────────────────────────────────────────────────
// Deletion happens in two stages. Asking for it only stamps deleted_at on the
// writers row and signs the writer out — nothing is destroyed, so a misclick
// costs nothing. Once the grace period has run out, purge_expired_deletions()
// removes the auth.users row, and every table cascades off it. That second
// stage is the one the anon key cannot do, which is why it is a security
// definer function in the database rather than code here.
const DELETION_GRACE_HOURS = 48;
const DELETE_NOTICE_KEY = 'lcars_delete_notice_v1';

function deletionDeadline(deletedAt) {
  return new Date(new Date(deletedAt).getTime() + DELETION_GRACE_HOURS * 3600 * 1000);
}

// Deliberately vague at the low end: "3 hours" is more use to someone deciding
// whether to act now than a countdown to the minute.
function deletionRemaining(deletedAt) {
  const ms = deletionDeadline(deletedAt).getTime() - Date.now();
  if (ms <= 0) return 'any moment now';
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return h + (h === 1 ? ' hour' : ' hours');
  return Math.max(1, Math.round(ms / 60000)) + ' minutes';
}

function confirmDeleteAccount() {
  // Already scheduled: the useful thing to offer is the way out, not a second
  // confirmation of something that has already been asked for.
  if (_writerProfile && _writerProfile.deleted_at) {
    closeModal();
    setTimeout(() => showDeletionPending(_writerProfile.deleted_at), 60);
    return;
  }
  closeModal();
  setTimeout(() => openModal('Delete account and all data',
    eraseConfirmBody('DELETE',
      `<p style="margin:0 0 8px">This removes your sims, characters and revision history, and frees your
        Writer ID to be registered again.</p>
       <p style="margin:0 0 8px"><strong>You have ${DELETION_GRACE_HOURS} hours to change your mind.</strong>
        Nothing is destroyed straight away — sign in again with your Writer ID and PIN before then and
        everything comes back exactly as it was. After that it is gone for good.</p>
       <p style="margin:0">Take a backup first if there is anything you want to keep.</p>`),
    () => {
      const v = (document.getElementById('erase-confirm').value || '').trim().toUpperCase();
      if (v !== 'DELETE') { showToast('Type DELETE to confirm'); return false; }
      deleteAccount();
    },
    { ok: 'Delete my account' }), 60);
}

// Stamping deleted_at is an ordinary update against the writer's own row, so
// the existing RLS policy covers it — no special privileges in this half.
async function deleteAccount() {
  const a = getAuth();
  if (a.uid) {
    try {
      const r = await supaFetch('/rest/v1/writers?id=eq.' + encodeURIComponent(a.uid), {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ deleted_at: new Date().toISOString() })
      });
      if (!r.ok) throw new Error('rejected');
    } catch(e) {
      alert('Could not reach the server, so nothing was deleted. Check your connection and try again.');
      return;
    }
  }
  // The local copy goes now so the device looks signed out and empty, which is
  // what was asked for. The server copy is what a change of mind restores from.
  try { localStorage.setItem(DELETE_NOTICE_KEY, String(Date.now())); } catch(e) {}
  S.docs = {}; S.missions = {}; S.scenes = {}; S.characters = {}; S.templates = [];
  persist();
  clearAuth();
  setMode('');
  // Deleting is done from Settings, but there is no account to have settings
  // for any more — come back on the dashboard.
  try { syncRoute('dash', true); } catch(e) {}
  location.reload();
}

// Shown once, after the reload that follows a deletion request.
function maybeShowDeleteNotice() {
  let stamp = null;
  try { stamp = localStorage.getItem(DELETE_NOTICE_KEY); } catch(e) {}
  if (!stamp) return false;
  try { localStorage.removeItem(DELETE_NOTICE_KEY); } catch(e) {}
  openModal('Your account is scheduled for deletion', `
    <div style="font-size:0.87rem;line-height:1.65">
      <p style="margin:0 0 8px">You have been signed out and this device's copy has been cleared.</p>
      <p style="margin:0 0 8px">Your sims are held on the server for <strong>${DELETION_GRACE_HOURS} hours</strong>.
        Sign in again with your Writer ID and PIN before then and you can cancel the deletion — everything
        comes back.</p>
      <p style="margin:0">After that, your account and everything in it are removed for good, and your
        Writer ID becomes available to register again.</p>
    </div>`, null, { noCancel: true, extra: [
      { label: 'Understood', cls: 'btn-p', fn: 'closeModal();showAuthGate(false)' }] });
  return true;
}

// Offered at boot when a writer signs back in during the grace period.
function showDeletionPending(deletedAt) {
  openModal('This account is scheduled for deletion', `
    <div style="font-size:0.87rem;line-height:1.65">
      <p style="margin:0 0 8px">Everything is still here, but this account and all of its sims will be
        removed in about <strong>${deletionRemaining(deletedAt)}</strong>.</p>
      <p style="margin:0">If you did not mean to delete it, or you have changed your mind, keep it now —
        after the deadline there is nothing anyone can restore.</p>
    </div>`, null, { noCancel: true, extra: [
      { label: 'Keep my account', cls: 'btn-p', fn: 'cancelAccountDeletion()' },
      { label: 'Leave it scheduled', fn: 'closeModal()' }
    ] });
}

async function cancelAccountDeletion() {
  try { await patchWriterProfile({ deleted_at: null }); }
  catch(e) { showToast('Could not reach the server — try again.'); return; }
  _writerProfile.deleted_at = null;
  paintWriterProfile();     // the Settings tile is on screen behind this modal
  closeModal();
  showToast('Deletion cancelled — your account is safe');
}

// Fire and forget. Nothing in the UI waits on it, and at this scale a boot from
// any signed-in writer comes round often enough to stand in for a scheduler.
function purgeExpiredDeletions() {
  supaFetch('/rest/v1/rpc/purge_expired_deletions', { method: 'POST', body: '{}' }).catch(() => {});
}

// Returns true when it put a prompt on screen, so callers can hold back
// anything that would paint over it.
async function checkDeletionPending() {
  // Never steal a modal that is already up — the reconcile prompt has to be
  // answered or the writer's local work is left in limbo. This will come round
  // again on the next boot.
  if (!document.getElementById('mo').classList.contains('hidden')) return false;
  try {
    const pr = await fetchWriterProfile();
    _writerProfile = pr;
    if (pr.deleted_at) { showDeletionPending(pr.deleted_at); return true; }
  } catch(e) { /* offline — the prompt can wait */ }
  return false;
}

// ================================================================
// GETTING STARTED WIZARD
// ================================================================
// Shown once after the first-run gate resolves, and reopenable any time from
// the Dashboard. Two routes through it: writers new to LCARS entirely, and
// writers arriving from the old GitHub Pages version who mainly need to know
// what changed and how to bring their sims across.
let _wizStep = 'welcome';

function wizardSeen() { return !!(S.settings && S.settings.wizardDone); }

function markWizardSeen() {
  if (!S.settings) S.settings = {};
  S.settings.wizardDone = true;
  persist();
  if (isCloud()) schedSync(2000);
}

function maybeShowWizard() {
  if (wizardSeen()) return;
  showWizard();
}

function showWizard() {
  closeWizard();
  const el = document.createElement('div');
  el.id = 'wiz';
  el.style.cssText = 'position:fixed;inset:0;z-index:8800;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.72);overflow:auto';
  el.innerHTML = `
    <div style="position:relative;width:100%;max-width:560px;background:var(--panel,#1b1b1b);border:1px solid var(--border,#333);border-radius:10px;padding:26px 24px;max-height:88vh;overflow:auto">
      <button class="btn btn-s" onclick="wizFinish(false)" title="Close" aria-label="Close"
        style="position:absolute;top:10px;right:10px;padding:2px 8px;line-height:1.4">✕</button>
      <div id="wiz-body"></div>
    </div>`;
  document.body.appendChild(el);
  wizGo('welcome');
}

function closeWizard() {
  const el = document.getElementById('wiz');
  if (el) el.remove();
}

// "Don't show again" is explicit and separate from simply closing, so a writer
// who closes mid-way still gets the wizard back next time.
function wizFinish(remember) {
  if (remember) markWizardSeen();
  closeWizard();
}

function wizFoot(backStep) {
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:20px;padding-top:14px;border-top:1px solid var(--border,#333)">
      ${backStep ? `<button class="btn btn-s" onclick="wizGo('${backStep}')">Back</button>` : ''}
      <div style="flex:1"></div>
      <button class="btn btn-s" onclick="wizFinish(true)">Don't show this again</button>
      <button class="btn btn-s" onclick="wizFinish(false)">Close</button>
    </div>`;
}

function wizGo(step) {
  _wizStep = step;
  const b = document.getElementById('wiz-body');
  if (!b) return;
  b.innerHTML = WIZ[step] ? WIZ[step]() : WIZ.welcome();
  b.parentElement.scrollTop = 0;
}

const WIZ = {
  welcome: () => `
    <div style="font-size:1.15rem;font-weight:700;margin-bottom:10px">Welcome to LCARS</div>
    <p style="font-size:0.87rem;line-height:1.65;color:var(--dim);margin:0 0 8px">
      LCARS is a writing tool for Starbase 118 — somewhere to draft your sims, keep them organised by mission and scene, and track your characters.
    </p>
    <p style="font-size:0.87rem;line-height:1.65;color:var(--dim);margin:0 0 18px">
      Which of these sounds like you?
    </p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-p" style="width:100%;justify-content:center" onclick="wizGo('new1')">I'm new to LCARS</button>
      <button class="btn btn-s" style="width:100%;justify-content:center" onclick="wizGo('ret1')">I've used LCARS before</button>
      <button class="btn btn-s" style="width:100%;justify-content:center" onclick="wizFinish(true)">Skip — let me get on with it</button>
    </div>
    <div style="font-size:0.72rem;color:var(--dim);margin-top:14px;line-height:1.5">
      You can reopen this any time from the Dashboard.
    </div>`,

  // ---------- new writers ----------
  new1: () => `
    <div style="font-size:1.05rem;font-weight:700;margin-bottom:10px">How your writing is organised</div>
    <div style="font-size:0.87rem;line-height:1.7;color:var(--dim)">
      <p style="margin:0 0 10px">Three levels, largest to smallest:</p>
      <p style="margin:0 0 8px"><strong style="color:var(--text)">Missions</strong> — a storyline your ship is playing through.</p>
      <p style="margin:0 0 8px"><strong style="color:var(--text)">Scenes</strong> — a thread within a mission. The bridge, sickbay, an away team.</p>
      <p style="margin:0 0 8px"><strong style="color:var(--text)">Sims</strong> — the individual posts you write. These live inside a scene.</p>
      <p style="margin:10px 0 0">Start a mission, add a scene, then write. You can always move a sim later if you put it in the wrong place.</p>
    </div>
    <div style="margin-top:18px"><button class="btn btn-p" style="width:100%;justify-content:center" onclick="wizGo('new2')">Next</button></div>
    ${wizFoot('welcome')}`,

  new2: () => `
    <div style="font-size:1.05rem;font-weight:700;margin-bottom:10px">Writing a sim</div>
    <div style="font-size:0.87rem;line-height:1.7;color:var(--dim)">
      <p style="margin:0 0 10px">The editor formats sim conventions as you type:</p>
      <p style="margin:0 0 6px"><code>::Action::</code> — an action beat</p>
      <p style="margin:0 0 6px"><code>=/\\= Comms =/\\=</code> — over comms</p>
      <p style="margin:0 0 6px"><code>oO Thoughts Oo</code> — internal thought</p>
      <p style="margin:0 0 6px"><code>((Location))</code> and <code>((OOC))</code></p>
      <p style="margin:10px 0 0">Character names bold themselves once LCARS knows who is in a scene. When you're done, the copy button puts the sim on your clipboard with formatting intact, ready to paste into email or Discord.</p>
    </div>
    <div style="margin-top:18px"><button class="btn btn-p" style="width:100%;justify-content:center" onclick="wizGo('acct')">Next</button></div>
    ${wizFoot('new1')}`,

  // ---------- returning writers ----------
  ret1: () => `
    <div style="font-size:1.05rem;font-weight:700;margin-bottom:10px">What's changed</div>
    <div style="font-size:0.87rem;line-height:1.7;color:var(--dim)">
      <p style="margin:0 0 10px"><strong style="color:var(--text)">LCARS has a new home and accounts.</strong> ${isFileCopy()
        ? `Online at <strong style="color:var(--text)">${NEW_HOME.replace(/^https?:\/\//,'').replace(/\/$/,'')}</strong> you can sign in with your Writer ID and have your sims save automatically to every device. This offline copy keeps everything in this browser instead.`
        : 'Sign in with your Writer ID and your sims save automatically and follow you to any device — no export files, no tokens to set up.'}</p>
      <p style="margin:0 0 10px"><strong style="color:var(--text)">Gist sync is gone.</strong> It capped out around 1 MB. Accounts replace it with no practical limit. Your old Gist is untouched and still on GitHub if you want the file.</p>
      <p style="margin:0 0 10px"><strong style="color:var(--text)">The Google Docs importer is gone.</strong> It was clumsy; better ways to bring sims in are coming.</p>
      ${isFileCopy() ? '' : `<p style="margin:0"><strong style="color:var(--text)">You can still work offline</strong> if you'd rather not have an account — everything stays in this browser and nothing is sent anywhere.</p>`}
    </div>
    <div style="margin-top:18px"><button class="btn btn-p" style="width:100%;justify-content:center" onclick="wizGo('ret2')">Next — bringing my sims across</button></div>
    ${wizFoot('welcome')}`,

  ret2: () => `
    <div style="font-size:1.05rem;font-weight:700;margin-bottom:10px">Bringing your sims across</div>
    <div style="font-size:0.87rem;line-height:1.7;color:var(--dim)">
      <p style="margin:0 0 10px">Your old sims are still on the address you used before. Browsers keep each web address's data separate, so they don't come across on their own.</p>
      ${isFileCopy() ? `<p style="margin:0 0 10px"><strong style="color:var(--text)">With a backup file:</strong> take a backup from the copy that has your sims, then load it here. This offline copy has no network access, so a backup file is the only way in or out.</p>`
      : `<p style="margin:0 0 10px"><strong style="color:var(--text)">The easy way:</strong> go back to the old address and click <em>Move My Stuff</em> in the notice at the bottom. Sign in there, your sims upload, and they'll be waiting when you sign in here.</p>
      <p style="margin:0 0 10px"><strong style="color:var(--text)">Or with a backup file:</strong> if you've already downloaded one, load it now.</p>`}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
      <button class="btn btn-p" style="width:100%;justify-content:center" onclick="wizImportBackup()">Load a backup file</button>
      <button class="btn btn-s" style="width:100%;justify-content:center" onclick="wizGo('acct')">${isCloud() || isFileCopy() ? 'Next' : 'Next — set up an account'}</button>
    </div>
    ${wizFoot('ret1')}`,

  // ---------- shared tail ----------
  acct: () => isCloud() ? `
    <div style="font-size:1.05rem;font-weight:700;margin-bottom:10px">You're all set</div>
    <div style="font-size:0.87rem;line-height:1.7;color:var(--dim)">
      <p style="margin:0 0 10px">You're signed in as <strong style="color:var(--text)">${(getAuth().writerId)||''}</strong>. Your work saves to your account a few seconds after each change, and will be there on any device you sign in on.</p>
      <p style="margin:0">A backup is still worth taking now and then — Settings → Backup Data.</p>
    </div>
    <div style="margin-top:18px"><button class="btn btn-p" style="width:100%;justify-content:center" onclick="wizFinish(true)">Start writing</button></div>
    ${wizFoot(null)}` : isFileCopy() ? `
    <div style="font-size:1.05rem;font-weight:700;margin-bottom:10px">Keep your work safe</div>
    <div style="font-size:0.87rem;line-height:1.7;color:var(--dim)">
      <p style="margin:0 0 10px">This is the offline copy of LCARS, running from a file on your own machine. It never touches the network, so your sims live in this browser alone — clearing your browser data would erase them.</p>
      <p style="margin:0 0 10px">Take a backup regularly from Settings → Backup Data, and keep it somewhere safe.</p>
      <p style="margin:0">If you'd rather have your sims backed up automatically and available on every device, use LCARS online at <strong style="color:var(--text)">${NEW_HOME.replace(/^https?:\/\//,'').replace(/\/$/,'')}</strong> — a backup from here restores straight into it.</p>
    </div>
    <div style="margin-top:18px"><button class="btn btn-p" style="width:100%;justify-content:center" onclick="wizFinish(true)">Start writing</button></div>
    ${wizFoot(null)}` : `
    <div style="font-size:1.05rem;font-weight:700;margin-bottom:10px">Keep your work safe</div>
    <div style="font-size:0.87rem;line-height:1.7;color:var(--dim)">
      <p style="margin:0 0 10px">You're working offline, so your sims live in this browser alone. Clearing your browser data would erase them.</p>
      <p style="margin:0 0 10px">An account fixes that — it needs your SB118 Writer ID and a PIN of your choice, nothing else. Your work on this device comes across with you.</p>
      <p style="margin:0">Prefer to stay offline? That's fine — just take backups from Settings regularly.</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
      <button class="btn btn-p" style="width:100%;justify-content:center" onclick="wizFinish(true);showAuthGate(true)">Set up an account</button>
      <button class="btn btn-s" style="width:100%;justify-content:center" onclick="wizFinish(true)">Stay offline for now</button>
    </div>
    ${wizFoot(null)}`
};

// Reuses the normal restore path, so the file is validated and the
// merge/overwrite choice is the same one Settings offers.
function wizImportBackup() {
  closeWizard();
  markWizardSeen();
  importData();
}

// ================================================================
// MOVED NOTICE — old GitHub Pages address only
// ================================================================
// Pages and Vercel serve the same file from main, so this is keyed off the
// hostname. Sims saved on the Pages address stay in that browser and do not
// follow the move, hence the nudge to back up first.
const NEW_HOME = 'https://sb118-lcars.vercel.app/';

// Add ?moved=1 to any address to preview this banner.
function movedBannerApplies() {
  try { if (new URLSearchParams(location.search).get('moved')) return true; } catch(e) {}
  return /github\.io$/i.test(location.hostname);
}

function showMovedBanner() {
  if (!movedBannerApplies()) return;
  const b = document.createElement('div');
  b.id = 'moved-banner';
  b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:8500;padding:16px;background:var(--panel,#1b1b1b);border-top:2px solid var(--accent,#f80);font-size:0.84rem;line-height:1.6;max-height:65vh;overflow:auto';
  b.innerHTML = `
    <div style="max-width:840px;margin:0 auto">
      <div style="font-size:0.95rem;font-weight:700;margin-bottom:8px">
        LCARS is moving to a new host. The new URL is
        <a href="${NEW_HOME}" style="color:var(--accent,#f80)">sb118-lcars.vercel.app</a>.
      </div>
      <p style="margin:0 0 8px">
        If you're seeing this note, you're still using the GitHub Pages version. This page still works, but your sims and settings live in the browser's local storage, making them more prone to loss and harder to sync across devices.
      </p>
      <p style="margin:0 0 8px">
        We strongly recommend migrating to the new site and bringing your sims and settings with you. The easiest way is to click <strong>Move My Stuff</strong> and set up an account — it just needs your SB118 Writer ID and a PIN of your choice. You can also download a manual backup and import it after creating an account if you prefer.
      </p>
      <p style="margin:0 0 14px;font-size:0.75rem;color:var(--dim)">
        <em>Note: this new version discontinues and replaces Gist Sync, which had very limited space. The new site backs everything up securely on its own database. Your existing Gist is untouched and still accessible at <a href="https://gist.github.com" target="_blank" rel="noopener" style="color:var(--dim);text-decoration:underline">gist.github.com</a>.</em>
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-p" onclick="movedTransfer()">Move My Stuff</button>
        <button class="btn btn-s" onclick="exportData()">Manual Backup Download</button>
        <a class="btn btn-s" href="${NEW_HOME}" style="text-decoration:none">Visit the New Site</a>
        <button class="btn btn-s" onclick="ackMoved()">Remind Me Later</button>
      </div>
    </div>`;
  document.body.appendChild(b);
}

// Signing in from the old address uploads whatever this browser holds, so
// signing in again at the new address brings it all down.
function movedTransfer() {
  ackMoved();
  showAuthGate(true);
}

// Deliberately not remembered — the banner returns on the next page load until
// the writer has actually moved.
function ackMoved() {
  const b = document.getElementById('moved-banner');
  if (b) b.remove();
}

// ================================================================
// AUTH GATE — first-run choice, sign in / create account
// ================================================================
// Shown once on a fresh browser. Everything here is optional: choosing
// "Use offline" sets mode to 'local' and the app never touches the network.
let _gateEl = null;

// A view drawn while signed out is wrong the moment that changes: Settings
// shows an entirely different card offline, so a writer who has just created
// an account is left looking at an invitation to create one, and clicking it
// reopens the gate forever. Rebuilding the view is the whole fix --
// renderSettingsView() reloads the profile and linked accounts on its own.
function refreshAuthDependentViews() {
  if (_routeView === 'settings') renderSettingsView();
  if (_routeView === 'admin') renderAdminView();
  initAdmin();
  updateViewButtons();
}

function gateClose() {
  if (_gateEl) { _gateEl.remove(); _gateEl = null; }
}

function showAuthGate(fromSettings) {
  if (isFileCopy()) return;   // accounts cannot reach the server from a file
  gateClose();
  const el = document.createElement('div');
  _gateEl = el;
  el.id = 'auth-gate';
  el.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg,#111);overflow:auto';
  el.innerHTML = `
    <div style="width:100%;max-width:440px;background:var(--panel,#1b1b1b);border:1px solid var(--border,#333);border-radius:10px;padding:26px 24px">
      <div style="font-size:1.15rem;font-weight:700;letter-spacing:0.04em;margin-bottom:6px">LCARS</div>
      <div id="gate-body"></div>
    </div>`;
  document.body.appendChild(el);
  gateChoice(!!fromSettings);
}

function gateChoice(fromSettings) {
  document.getElementById('gate-body').innerHTML = `
    <div style="font-size:0.85rem;color:var(--dim);line-height:1.65;margin-bottom:18px">
      ${fromSettings
        ? 'Set up an account and your sims on this device will be carried across, then kept in step on every device you sign in on.'
        : 'Sign in to keep your sims backed up and available on any device &mdash; or work offline in this browser alone.'}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-p" style="width:100%;justify-content:center" onclick="gateForm('in')">Sign in with your Writer ID</button>
      <button class="btn btn-s" style="width:100%;justify-content:center" onclick="gateForm('up')">Create an account</button>
      <div style="display:flex;align-items:center;gap:8px;margin:2px 0">
        <span style="flex:1;height:1px;background:var(--dim);opacity:0.3"></span>
        <span style="font-size:0.68rem;color:var(--dim);letter-spacing:0.08em">OR</span>
        <span style="flex:1;height:1px;background:var(--dim);opacity:0.3"></span>
      </div>
      <button class="btn btn-s" style="width:100%;justify-content:center" onclick="signInWithProvider('discord')">Continue with Discord</button>
      <button class="btn btn-s" style="width:100%;justify-content:center" onclick="signInWithProvider('google')">Continue with Google</button>
      ${fromSettings
        ? `<button class="btn btn-s" style="width:100%;justify-content:center" onclick="gateClose()">Not now</button>`
        : `<button class="btn btn-s" style="width:100%;justify-content:center" onclick="gateUseOffline()">Use offline on this device only</button>`}
    </div>
    ${fromSettings ? '' : `<div style="font-size:0.71rem;color:var(--dim);line-height:1.55;margin-top:14px">
      Offline keeps everything in this browser and sends nothing anywhere. Clearing your browser data will erase it, so take backups. You can switch to an account later from Settings.
    </div>`}`;
}

// ── The recovery-account step of the gate ─────────────────────────────────
// Shown in the gate window itself, immediately after an account is created or
// signed into, and nowhere else. Deliberately not on boot: boot runs on every
// page load, so a boot-time prompt appears when you open Settings, which is not
// a moment anyone asked to be interrupted.
//
// Asked once per account, not once per browser -- the flag lives on the writers
// row so it follows the writer to whatever device they next use.
async function shouldOfferLinking() {
  let list, prof;
  try {
    [list, prof] = await Promise.all([fetchIdentities(), fetchWriterProfile()]);
  } catch(e) { return false; }          // unreadable: never block a sign-in over it
  _writerProfile = prof;
  // An account scheduled for deletion has a more urgent conversation waiting
  // in gateFinish(); offering to link one to it would be absurd.
  if (prof.deleted_at) return false;
  return !list.length && !prof.link_prompt_seen;
}

function gateLinkStep(wid) {
  const body = document.getElementById('gate-body');
  if (!body) return;
  body.innerHTML = `
    <div style="font-size:1rem;font-weight:700;margin-bottom:8px">One last thing</div>
    <div style="font-size:0.85rem;color:var(--dim);line-height:1.65;margin-bottom:14px">
      <p style="margin:0 0 10px">Right now your Writer ID and PIN are the only way into your account. If you
        forget the PIN there is no automatic way back in.</p>
      <p style="margin:0">Connecting a Google or Discord account fixes that, and lets you sign in with one
        click. Nothing is posted anywhere, and your Writer ID and PIN keep working exactly as they do now.</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-p" style="width:100%;justify-content:center" onclick="gateLink('discord')">Connect Discord</button>
      <button class="btn btn-p" style="width:100%;justify-content:center" onclick="gateLink('google')">Connect Google</button>
      <button class="btn btn-s" style="width:100%;justify-content:center" onclick="gateSkipLink('${esc(wid)}')">Not now</button>
    </div>
    <div style="font-size:0.71rem;color:var(--dim);line-height:1.55;margin-top:14px">
      You can do this later from Settings &rarr; Your Account &amp; Data. You will not be asked again.
    </div>`;
}

// Recorded before navigating away, because linking leaves LCARS entirely and
// the writer may never come back to this screen.
async function markLinkOffered() {
  try { await patchWriterProfile({ link_prompt_seen: true }); } catch(e) {}
  _writerProfile.link_prompt_seen = true;
}

async function gateLink(provider) {
  await markLinkOffered();
  linkProvider(provider);
}

async function gateSkipLink(wid) {
  await markLinkOffered();
  await gateFinish(wid);
}

function gateUseOffline() {
  setMode('local');
  gateClose();
  maybeShowWizard();
}

function gateForm(kind) {
  const up = kind === 'up';
  document.getElementById('gate-body').innerHTML = `
    <div style="font-size:0.85rem;color:var(--dim);line-height:1.6;margin-bottom:14px">
      ${up ? 'Your Writer ID identifies you; the PIN keeps your work private.' : 'Welcome back.'}
    </div>
    <div class="mf" style="margin-bottom:10px">
      <label class="ml">WRITER ID</label>
      <input class="mi" id="gate-wid" type="text" placeholder="A239809JP3" maxlength="10" autocomplete="username" spellcheck="false" style="text-transform:uppercase">
    </div>
    <div class="mf" style="margin-bottom:10px">
      <label class="ml">PIN <span style="font-weight:normal;opacity:0.6">(at least 6 characters)</span></label>
      <input class="mi" id="gate-pin" type="password" autocomplete="${up ? 'new-password' : 'current-password'}">
    </div>
    <div id="gate-msg" style="font-size:0.76rem;line-height:1.5;min-height:1.1em;margin:6px 0 12px;color:var(--red,#c66)"></div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-p" id="gate-go" style="width:100%;justify-content:center" onclick="gateSubmit('${kind}')">${up ? 'Create account' : 'Sign in'}</button>
      <button class="btn btn-s" style="width:100%;justify-content:center" onclick="gateChoice(${!!getMode()})">Back</button>
    </div>
    ${up ? `<div style="font-size:0.71rem;color:var(--dim);line-height:1.55;margin-top:14px">
      Once you are in, link a Google or Discord account from Settings. It is the only way to reset a
      forgotten PIN yourself &mdash; without one you would have to ask the tool's maintainer.
    </div>` : `<div style="text-align:center;margin-top:14px">
      <button class="btn btn-s" style="font-size:0.74rem;padding:4px 10px" onclick="showForgotPin()">Forgotten your PIN?</button>
    </div>`}`;
  const wid = document.getElementById('gate-wid');
  wid.focus();
  ['gate-wid','gate-pin'].forEach(id => {
    const n = document.getElementById(id);
    if (n) n.addEventListener('keydown', e => { if (e.key === 'Enter') gateSubmit(kind); });
  });
}

// Shown after signing in from the old GitHub Pages address. cloudBoot() has
// already pushed this browser's sims up, so the only thing left is to move the
// writer across. Auto-forwards on the real old address; on a ?moved=1 preview it
// waits for the click so the preview is not navigated away from.
function showTransferDone() {
  gateClose();
  const ok = syncStatus.state !== 'error';
  const el = document.createElement('div');
  _gateEl = el;
  el.id = 'auth-gate';
  el.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg,#111);overflow:auto';
  el.innerHTML = `
    <div style="width:100%;max-width:440px;background:var(--panel,#1b1b1b);border:1px solid var(--border,#333);border-radius:10px;padding:26px 24px">
      <div style="font-size:1.15rem;font-weight:700;margin-bottom:10px">${ok ? 'Your sims are on your account' : 'Signed in — but the upload did not finish'}</div>
      <p style="font-size:0.87rem;line-height:1.65;color:var(--dim);margin:0 0 8px">
        ${ok
          ? 'Everything in this browser has been saved to your account. Carry on at the new address — sign in there with the same Writer ID and PIN and it will all be waiting.'
          : 'Your account is set up, but this browser\'s sims could not be uploaded just now. Stay here and try again in a moment, or download a backup and restore it at the new address.'}
      </p>
      <p style="font-size:0.75rem;color:var(--dim);margin:0 0 16px">This old address stays available, but it will not receive new features.</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <a class="btn btn-p" href="${NEW_HOME}" style="width:100%;justify-content:center;text-decoration:none">Go to the new address</a>
        ${ok ? '' : `<button class="btn btn-s" style="width:100%;justify-content:center" onclick="saveToCloud().then(showTransferDone)">Try the upload again</button>
        <button class="btn btn-s" style="width:100%;justify-content:center" onclick="exportData()">Download a backup</button>`}
        <button class="btn btn-s" style="width:100%;justify-content:center" onclick="gateClose()">Stay here for now</button>
      </div>
      ${ok && /github\.io$/i.test(location.hostname)
        ? '<div style="font-size:0.72rem;color:var(--dim);margin-top:12px">Taking you there automatically…</div>' : ''}
    </div>`;
  document.body.appendChild(el);
  if (ok && /github\.io$/i.test(location.hostname)) {
    setTimeout(() => { if (document.getElementById('auth-gate')) location.href = NEW_HOME; }, 3000);
  }
}

// Everything that happens once the gate is finished with, whichever way it was
// finished with. Split out so the linking step can sit in front of it.
async function gateFinish(wid) {
  const who = normalizeWriterId(wid || getAuth().writerId || '');
  gateClose();
  await cloudBoot();
  refreshAuthDependentViews();
  showToast('Signed in as ' + who);
  // Signing in from the old address is a migration, not a destination — the
  // sims are on the account now, so send them where they should be writing.
  if (movedBannerApplies()) { showTransferDone(); return; }
  // Someone signing in mid-grace-period needs telling here, not only on a
  // later cold boot — this is the moment they came back to change their mind.
  if (await checkDeletionPending()) return;
  // A temporary PIN has been read by a moderator and sent over Discord or
  // email. Trading it for one of their own comes before anything else.
  if (await checkMustChangePin()) return;
  maybeShowWizard();
}

async function gateSubmit(kind) {
  const msg = document.getElementById('gate-msg');
  const btn = document.getElementById('gate-go');
  const wid = (document.getElementById('gate-wid').value || '').trim();
  const pin = document.getElementById('gate-pin').value || '';

  if (!validWriterId(wid)) { msg.textContent = 'That does not look like a Writer ID — it should be ten characters, like A239809JP3.'; return; }
  if (pin.length < 6) { msg.textContent = 'Your PIN needs to be at least 6 characters.'; return; }

  msg.style.color = 'var(--dim)';
  msg.textContent = kind === 'up' ? 'Creating your account…' : 'Signing in…';
  btn.disabled = true;
  try {
    if (kind === 'up') await cloudSignUp(wid, pin);
    else await cloudSignIn(wid, pin);
    // Offer a recovery account as the next step of this same window, before
    // the gate closes. gateFinish() carries on from whichever button is used.
    if (await shouldOfferLinking()) { gateLinkStep(normalizeWriterId(wid)); return; }
    await gateFinish(wid);
  } catch(e) {
    msg.style.color = 'var(--red,#c66)';
    msg.textContent = e.message || 'Something went wrong. Please try again.';
    btn.disabled = false;
  }
}

// ================================================================
// DASHBOARD
// ================================================================
function showDashboard() {
  exitTemplateMode();
  document.body.classList.remove('academy');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  ['dh','ec'].forEach(x=>document.getElementById(x).classList.add('hidden'));
  document.getElementById('sim-details').classList.add('hidden');
  document.getElementById('s-doc').textContent = 'No sim open';
  document.getElementById('chars-list').innerHTML =
    '<div style="padding:10px;font-size:0.8rem;color:var(--dim)">Open a sim to see characters</div>';
  renderDashboard();
}

function closeDoc() {
  const wasTemplate = !!curTmplId;
  flushSave();
  exitTemplateMode();
  curId = null; curView = null; curViewId = null;
  showDashboard();
  renderNav();
  if (wasTemplate) returnToTemplates();
}

// The mark shown wherever LCARS says how it was built. Lives in one place so
// the About page and any future use cannot drift apart.
const AI_LOGO_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.2" opacity=".6"/>
  <circle cx="9" cy="9" r="2.5" fill="currentColor"/>
  <line x1="9" y1="1.5" x2="9" y2="5" stroke="currentColor" stroke-width="1.2"/>
  <line x1="9" y1="13" x2="9" y2="16.5" stroke="currentColor" stroke-width="1.2"/>
  <line x1="1.5" y1="9" x2="5" y2="9" stroke="currentColor" stroke-width="1.2"/>
  <line x1="13" y1="9" x2="16.5" y2="9" stroke="currentColor" stroke-width="1.2"/>
  <line x1="3.4" y1="3.4" x2="5.8" y2="5.8" stroke="currentColor" stroke-width="1.2" opacity=".5"/>
  <line x1="12.2" y1="12.2" x2="14.6" y2="14.6" stroke="currentColor" stroke-width="1.2" opacity=".5"/>
  <line x1="14.6" y1="3.4" x2="12.2" y2="5.8" stroke="currentColor" stroke-width="1.2" opacity=".5"/>
  <line x1="5.8" y1="12.2" x2="3.4" y2="14.6" stroke="currentColor" stroke-width="1.2" opacity=".5"/>
</svg>`;

function renderDashboard() {
  const el = document.getElementById('dashboard');
  const allDocs = Object.values(S.docs);
  const allMissions = Object.values(S.missions);
  // Compute total words across all sims
  let totalWords = 0;
  allDocs.forEach(d => {
    const tmp = document.createElement('div'); tmp.innerHTML = d.content||'';
    totalWords += wc(tmp.innerText||'');
  });
  const totalPosted = allDocs.filter(d=>d.postedAt).length;
  // Days since the most recent posted sim (amber ≥2d, red ≥3d)
  const lastPostMs = allDocs.filter(d=>d.postedAt)
    .map(d=>new Date(d.postedAt).getTime()).filter(t=>!isNaN(t))
    .reduce((a,b)=>Math.max(a,b),0);
  const daysSincePost = lastPostMs ? Math.floor((Date.now()-lastPostMs)/86400000) : null;
  const dspColor = daysSincePost==null ? 'var(--dim)' : daysSincePost>=3 ? '#cc2222' : daysSincePost>=2 ? '#d98c00' : 'inherit';
  const dspVal = daysSincePost==null ? '—' : daysSincePost+'d';
  const dspTip = daysSincePost==null ? 'No posted sims yet' : `${daysSincePost} day${daysSincePost===1?'':'s'} since your last posted sim`;
  const inProgress = allDocs.filter(d=>d.status==='active')
    .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,10);
  const recentPosted = allDocs.filter(d=>d.postedAt)
    .sort((a,b)=>(b.postedAt||'').localeCompare(a.postedAt||'')).slice(0,3);

  el.innerHTML = `
    <div class="dash-header-row">
      <div class="dash-header-left">
        <div class="dash-title">LCARS — COMMAND DASHBOARD</div>
        <div class="dash-stats">
          <div class="dash-stat-item"><div class="dash-stat-num">${allMissions.length}</div><div class="dash-stat-lbl">MISSIONS</div></div>
          <div class="dash-stat-item"><div class="dash-stat-num">${allDocs.length}</div><div class="dash-stat-lbl">SIMS</div></div>
          <div class="dash-stat-item"><div class="dash-stat-num">${totalPosted}</div><div class="dash-stat-lbl">POSTED</div></div>
          <div class="dash-stat-item"><div class="dash-stat-num">${totalWords.toLocaleString()}</div><div class="dash-stat-lbl">WORDS</div></div>
          <div class="dash-stat-item" title="${dspTip}"><div class="dash-stat-num" style="color:${dspColor}">${dspVal}</div><div class="dash-stat-lbl">SINCE LAST POST</div></div>
        </div>
      </div>
    </div>
    ${inProgress.length ? `
      <div class="dash-section">IN PROGRESS</div>
      <table class="dash-table">
        <tr><th>TITLE</th><th>MISSION</th><th>WORDS</th><th>LAST EDITED</th></tr>
        ${inProgress.map(d => {
          const m = d.missionId ? S.missions[d.missionId] : null;
          const tmp = document.createElement('div'); tmp.innerHTML = d.content||'';
          const words = wc(tmp.innerText||'');
          const date = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : '—';
          return `<tr>
            <td><span class="dash-link" onclick="openDoc('${d.id}')">${esc(d.title||'Untitled')}</span></td>
            <td style="color:var(--dim);font-size:0.8rem">${m?esc(m.name):'—'}</td>
            <td style="color:var(--dim);font-size:0.8rem">${words}</td>
            <td style="color:var(--dim);font-size:0.8rem">${date}</td>
          </tr>`;
        }).join('')}
      </table>` : ''}
    ${recentPosted.length ? `
      <div class="dash-section">RECENTLY POSTED</div>
      <table class="dash-table">
        <tr><th>TITLE</th><th>MISSION</th><th>POSTED</th></tr>
        ${recentPosted.map(d => {
          const m = d.missionId ? S.missions[d.missionId] : null;
          return `<tr>
            <td><span class="dash-link" onclick="openDoc('${d.id}')">${esc(d.title||'Untitled')}</span></td>
            <td style="color:var(--dim);font-size:0.8rem">${m?esc(m.name):'—'}</td>
            <td style="color:var(--dim);font-size:0.8rem">${d.postedAt||'—'}</td>
          </tr>`;
        }).join('')}
      </table>` : ''}
    <div class="dash-section">READY TO GET STARTED?</div>
    <div class="dash-actions">
      <button class="dash-action" onclick="showNewMission()">
        <div class="da-icon">${ic('circle-dot')}</div>
        <div class="da-label">Start a new Mission</div>
        <div class="da-hint">Create a mission folder to organise scenes and sims</div>
      </button>
      <button class="dash-action" onclick="showNewScene()">
        <div class="da-icon">${ic('table')}</div>
        <div class="da-label">Create a new Scene</div>
        <div class="da-hint">Add a scene grouping within a mission</div>
      </button>
      <button class="dash-action" onclick="showNewDoc()">
        <div class="da-icon">${ic('pencil')}</div>
        <div class="da-label">Write a new Sim</div>
        <div class="da-hint">Start a new sim post</div>
      </button>
      <button class="dash-action" onclick="openManifest()">
        <div class="da-icon">${ic('user')}</div>
        <div class="da-label">Character Manifest</div>
        <div class="da-hint">View and manage your characters</div>
      </button>
    </div>
    <div class="dash-actions">
      <button class="dash-action" onclick="showWizard()">
        <div class="da-icon">${ic('sparkles')}</div>
        <div class="da-label">Getting Started</div>
        <div class="da-hint">A quick tour, and how to bring old sims across</div>
      </button>
      <button class="dash-action" onclick="window.open('LCARS-Guide-v2.html','_blank')">
        <div class="da-icon">${ic('book-open')}</div>
        <div class="da-label">Learn How to Use This Tool</div>
        <div class="da-hint">Open the full user guide</div>
      </button>
    </div>`;
}


// ================================================================
// COPY POST
// ================================================================
function copyPost() {
  const ed = document.getElementById('editor');
  ed.focus();
  document.execCommand('selectAll');
  document.execCommand('copy');
  const btn = document.getElementById('btn-copy');
  const prev = btn.textContent;
  btn.innerHTML = ic('check') + ' Copied!';
  btn.style.color = 'var(--green)';
  setTimeout(() => { btn.textContent = prev; btn.style.color = ''; }, 1500);
}
function removeFormatting() {
  const ed = document.getElementById('editor');
  ed.focus();
  const sel = window.getSelection();
  const hasSelection = sel && sel.toString().length > 0;
  if (!hasSelection) {
    const block = getCaretBlock();
    if (block) {
      const r = document.createRange(); r.selectNodeContents(block);
      sel.removeAllRanges(); sel.addRange(r);
    } else {
      document.execCommand('selectAll');
    }
  }
  document.execCommand('removeFormat');
  document.execCommand('unlink');
  schedSave();
}

function formatHTMLSource(html) {
  // Insert newlines before/after block-level tags for readability
  const blocks = 'div|p|br|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr|td|th|hr';
  let s = html
    .replace(new RegExp(`(<(?:${blocks})[^>]*>)`, 'gi'), '\n$1')
    .replace(new RegExp(`(</(?:${blocks})>)`, 'gi'), '$1\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s;
}

function toggleSourceView() {
  if (!curId) return;
  const ed = document.getElementById('editor');
  const ec = document.getElementById('ec');
  const btn = document.getElementById('tbb-src');
  if (!ed || !ec) return;

  if (!_sourceMode) {
    // Enter source mode — capture cursor position first via a temporary marker node
    _sourceMode = true;
    const MARK = 'LCARS_CUR_MARK';
    let rawWithMarker = '';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ed.contains(sel.getRangeAt(0).startContainer)) {
      const range = sel.getRangeAt(0).cloneRange();
      range.collapse(true);
      const markerNode = document.createTextNode(MARK);
      range.insertNode(markerNode);
      rawWithMarker = ed.innerHTML;
      markerNode.parentNode.removeChild(markerNode);
    }
    ed.style.display = 'none';
    const ta = document.createElement('textarea');
    ta.id = 'src-mode-ta';
    ta.spellcheck = false;
    ta.value = formatHTMLSource(ed.innerHTML);
    ta.style.cssText = 'display:block;width:100%;min-height:100%;font-family:monospace;font-size:0.78rem;background:var(--bg);color:var(--text);border:none;outline:none;padding:28px 44px;resize:none;box-sizing:border-box;line-height:1.7;tab-size:2';
    ec.appendChild(ta);
    ta.focus();
    // Place cursor at the equivalent source position
    if (rawWithMarker) {
      const fmtWithMarker = formatHTMLSource(rawWithMarker);
      const pos = fmtWithMarker.indexOf(MARK);
      if (pos >= 0) {
        // Measure exact scroll position by truncating to cursor and reading scrollTop
        const fullText = ta.value;
        ta.value = fullText.substring(0, pos);
        ta.scrollTop = Number.MAX_SAFE_INTEGER;
        const targetScroll = ta.scrollTop;
        ta.value = fullText;
        ta.scrollTop = Math.max(0, targetScroll - ta.clientHeight / 2);
        ta.setSelectionRange(pos, pos);
      } else {
        ta.setSelectionRange(0, 0); ta.scrollTop = 0;
      }
    } else {
      ta.setSelectionRange(0, 0); ta.scrollTop = 0;
    }
    if (btn) { btn.classList.add('tbb-active'); btn.title = 'Exit source view (applies changes)'; }
  } else {
    // Exit source mode — apply edits back to editor
    _sourceMode = false;
    const ta = document.getElementById('src-mode-ta');
    if (ta) {
      // Source editing can reintroduce formatting an Academy sim isn't allowed to keep
      ed.innerHTML = isAcademyActive() ? stripFormattingHtml(ta.value) : ta.value;
      ta.remove(); schedSave(); setTimeout(transformNow, 0);
    }
    ed.style.display = '';
    if (btn) { btn.classList.remove('tbb-active'); btn.title = 'View / edit raw HTML source of this sim'; }
  }
}

// ================================================================
// UTILS
// ================================================================
function fmtPostedDate(isoDate) {
  const [y,m,d] = isoDate.split('-');
  return `${y}${m}.${d}`;
}

function toStardate(isoDate) {
  if (!isoDate) return '';
  const [y,m,d] = isoDate.split('-');
  return `${parseInt(y)+376}${m}.${d}`;
}

function showToast(msg, dur=2200) {
  let t = document.getElementById('lcars-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'lcars-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'lcars-toast-show';
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.className=''; }, dur);
}

// Allows <b> <i> <s> <u> <br> through; escapes everything else.
function sanitizeSRHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/&lt;(\/?(b|i|s|u|br)\s*\/?)&gt;/gi,'<$1>');
}

// Converts [[Article]] and [[Article|Label]] to <a> links; safe for display.
function renderWikiLinks(rawText) {
  if (!rawText) return '';
  const parts = []; let last = 0;
  const re = /\[\[([^\]]+?)\]\]/g; let m;
  while ((m = re.exec(rawText)) !== null) {
    parts.push(esc(rawText.slice(last, m.index)));
    const pipe = m[1].indexOf('|');
    const article = pipe >= 0 ? m[1].slice(0, pipe) : m[1];
    const display = pipe >= 0 ? m[1].slice(pipe+1) : m[1];
    const url = 'https://wiki.starbase118.net/wiki/' + encodeURIComponent(article.replace(/ /g,'_'));
    parts.push(`<a href="${url}" target="_blank" rel="noopener">${esc(display)}</a>`);
    last = m.index + m[0].length;
  }
  parts.push(esc(rawText.slice(last)));
  return parts.join('');
}

// Display title: strip leading "Rank Name - " or "Name: " prefixes for cleaner sidebar listing.
// Uses doc.displayTitle override if the user has chosen a specific split.
function getDisplayTitle(doc) {
  if (doc.displayTitle != null) return doc.displayTitle;
  const title = doc.title || 'Untitled';
  const m = title.match(/(?:[-–—]|:)\s+(.+)$/);
  return m ? m[1].trim() : title;
}

// Count separators in a title (for the "choose split" right-click option)
function countTitleSeps(title) {
  return (title.match(/(?:[-–—]|:)\s/g)||[]).length;
}

// Build list of possible title splits at each separator
function getTitleSplitOptions(title) {
  const opts = [];
  const re = /(?:[-–—]|:)\s+/g;
  let m, last = 0;
  const parts = [];
  while ((m = re.exec(title)) !== null) parts.push(m.index + m[0].length);
  parts.forEach(start => opts.push(title.slice(start).trim()));
  opts.push(title); // "Full title" option
  return opts;
}
function todayIso() { return new Date().toISOString().split('T')[0]; }
function wc(t) { return (t.trim().match(/\S+/g)||[]).length; }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

// ================================================================
// LEVENSHTEIN
// ================================================================
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({length:n+1},(_,i)=>i);
  for (let i=1;i<=m;i++) {
    const curr=[i];
    for (let j=1;j<=n;j++)
      curr[j]=a[i-1]===b[j-1]?prev[j-1]:1+Math.min(prev[j-1],prev[j],curr[j-1]);
    prev=curr;
  }
  return prev[n];
}

// ================================================================
// CLEAN COPY
// ================================================================
// ── PASTE HANDLER: strip colors/fonts from pasted content ──
function cleanPasteHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // Recursively unwrap or clean each element
  function processNode(node) {
    if (node.nodeType === 8) { node.parentNode.removeChild(node); return; } // drop comment nodes (StartFragment/EndFragment)
    if (node.nodeType !== 1) return; // text nodes pass through
    const tag = node.tagName.toLowerCase();
    const keep = ['strong','b','em','i','s','strike','del','a',
                  'div','p','br','ul','ol','li','blockquote','h1','h2','h3','h4'];
    if (!keep.includes(tag)) {
      // Unwrap: replace element with its children
      while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
      node.parentNode.removeChild(node);
      return;
    }
    // For kept elements, strip all styles/classes/ids except href on anchors
    [...node.attributes].forEach(attr => {
      if (tag === 'a' && attr.name === 'href') return;
      if (tag === 'a' && attr.name === 'target') return;
      node.removeAttribute(attr.name);
    });
    // Recurse into children (iterate copy since we may mutate)
    [...node.childNodes].forEach(processNode);
  }

  [...tmp.childNodes].forEach(processNode);
  return tmp.innerHTML;
}

function plainToHTML(plain) {
  return plain
    .split(/\r?\n/)
    .map(line => `<div>${line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') || '<br>'}</div>`)
    .join('');
}

// Strip just inline color/font styles from existing stored content (lighter, non-destructive)
function stripInlineStyles(html) {
  // Remove style attributes that contain color, background, or font-related properties
  return html
    .replace(/\s*style\s*=\s*"[^"]*"/gi, m => {
      // Keep only margin-left (for indents), remove everything else
      const kept = m.match(/margin-left\s*:\s*[^;"]*/i);
      return kept ? ` style="${kept[0]}"` : '';
    })
    .replace(/\s*style\s*=\s*'[^']*'/gi, m => {
      const kept = m.match(/margin-left\s*:\s*[^;']*/i);
      return kept ? ` style="${kept[0]}"` : '';
    });
}

let _pasteCleanSnap = null;
function collapsePasteBlankLines(ed) {
  const kids = Array.from(ed.children);
  const toRemove = [];
  let runStart = -1;
  for (let i = 0; i < kids.length; i++) {
    const empty = kids[i].textContent.trim() === '';
    if (empty) {
      if (runStart === -1) runStart = i;
    } else {
      if (runStart !== -1 && i - runStart >= 2)
        for (let k = runStart + 1; k < i; k++) toRemove.push(kids[k]);
      runStart = -1;
    }
  }
  if (runStart !== -1 && kids.length - runStart >= 2)
    for (let k = runStart + 1; k < kids.length; k++) toRemove.push(kids[k]);
  toRemove.forEach(el => el.remove());
  return toRemove.length > 0;
}
function showPasteCleanBanner(snapshot) {
  _pasteCleanSnap = snapshot;
  let b = document.getElementById('paste-clean-banner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'paste-clean-banner';
    b.className = 'paste-clean-banner';
    const ec = document.getElementById('ec');
    ec.insertBefore(b, ec.firstChild);
  }
  b.innerHTML = '<span class="pcb-msg">Extra blank lines removed</span><button class="tbb pcb-undo" onclick="undoPasteClean()">Undo</button><button class="tbb pcb-close" onclick="document.getElementById(\'paste-clean-banner\').remove()">' + ic('x','ic-sm') + '</button>';
  clearTimeout(b._t);
  b._t = setTimeout(() => { if (b.parentElement) b.remove(); }, 8000);
}
function undoPasteClean() {
  if (!_pasteCleanSnap) return;
  document.getElementById('editor').innerHTML = _pasteCleanSnap;
  const b = document.getElementById('paste-clean-banner');
  if (b) b.remove();
  _pasteCleanSnap = null;
  schedSave();
}

function installPasteHandler() {
  document.getElementById('editor').addEventListener('paste', e => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    let cleaned = html ? cleanPasteHTML(html) : plainToHTML(plain);
    // Academy sims accept plain text only — strip formatting as it comes in,
    // rather than leaving it to survive until the doc is next reopened
    if (isAcademyActive()) cleaned = stripFormattingHtml(cleaned);
    const ed = document.getElementById('editor');
    document.execCommand('insertHTML', false, cleaned);
    normalizeEditorContent(ed);
    setTimeout(() => {
      const snap = ed.innerHTML;
      if (collapsePasteBlankLines(ed)) { showPasteCleanBanner(snap); schedSave(); }
    }, 0);
  });
}

function installCopyHandler() {
  document.getElementById('editor').addEventListener('copy', e => {
    let sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    // No selection (cursor only) — select all so the handler always runs cleanly
    if (sel.isCollapsed) {
      document.execCommand('selectAll');
      sel = window.getSelection();
      if (!sel || !sel.rangeCount || sel.isCollapsed) return;
    }
    const frag = sel.getRangeAt(0).cloneContents();
    const tmp = document.createElement('div');
    tmp.appendChild(frag);

    // Strip comment nodes (e.g. <!--StartFragment-->/<!--EndFragment--> that some
    // clipboards/apps inject) so they never leak into pasted text in Discord/email
    (function stripComments(node) {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 8) child.remove();
        else if (child.nodeType === 1) stripComments(child);
      });
    })(tmp);

    // A selection that spans a whole list clones the <li>s without their <ul>,
    // so the bullets would paste out as plain lines — put the wrapper back
    let _liWrap = null;
    [...tmp.childNodes].forEach(node => {
      if (node.nodeType === 1 && node.tagName === 'LI') {
        if (!_liWrap) { _liWrap = document.createElement('ul'); node.parentNode.insertBefore(_liWrap, node); }
        _liWrap.appendChild(node);
      } else if (node.nodeType !== 3 || node.textContent.trim()) {
        _liWrap = null;
      }
    });

    // Convert ind-N classes to inline margin-left before stripping
    [1,2,3,4].forEach(n => {
      tmp.querySelectorAll('.ind-'+n).forEach(el => {
        el.style.marginLeft = (n*2)+'em';
        el.classList.remove('ind-'+n);
      });
    });

    // Unwrap legacy blockquotes (plain margin, no styling)
    tmp.querySelectorAll('blockquote').forEach(bq => {
      bq.style.marginLeft = bq.style.marginLeft || '2em';
      const p = bq.parentNode;
      const span = document.createElement('div');
      span.style.marginLeft = bq.style.marginLeft;
      while (bq.firstChild) span.appendChild(bq.firstChild);
      p.replaceChild(span, bq);
    });

    // Preserve bold on location markers and italic on OOC markers before unwrapping.
    // Academy sims are plain text — no auto-formatting is rendered, so none is copied out.
    const prefs = isAcademyActive() ? {} : getPrefs();
    if (prefs.boldLocations) {
      tmp.querySelectorAll('.lm').forEach(span => {
        const strong = document.createElement('strong');
        while (span.firstChild) strong.appendChild(span.firstChild);
        span.parentNode.replaceChild(strong, span);
      });
    }
    if (prefs.italicOOC) {
      tmp.querySelectorAll('.om').forEach(span => {
        const em = document.createElement('em');
        while (span.firstChild) em.appendChild(span.firstChild);
        span.parentNode.replaceChild(em, span);
      });
    }
    // Auto-italic thoughts are styled via CSS on .tm (no inline <em>), so convert
    // them to real <em> here or the italics would be lost on copy out
    if (prefs.thoughtItalic) {
      tmp.querySelectorAll('.tm').forEach(span => {
        const em = document.createElement('em');
        while (span.firstChild) em.appendChild(span.firstChild);
        span.parentNode.replaceChild(em, span);
      });
    }

    // Unwrap ALL spans — marker spans become plain text
    tmp.querySelectorAll('span').forEach(span => {
      const p = span.parentNode;
      while (span.firstChild) p.insertBefore(span.firstChild, span);
      p.removeChild(span);
    });

    // Strip class/data attributes; keep href, target, and margin-left style only
    tmp.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        if (attr.name === 'style') {
          // Keep only margin-left; strip color and everything else
          const ml = el.style.marginLeft;
          el.removeAttribute('style');
          if (ml) el.style.marginLeft = ml;
        } else if (!['href','target'].includes(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // The first line of a contenteditable is often bare inline/text nodes with no
    // block wrapper, while later lines sit inside <div>s. Pasted into Discord/email
    // that leading bare run gets treated as its own paragraph in a different font
    // (looks like a header). Wrap any run of top-level inline/text nodes in a <div>
    // so every line has identical block structure.
    const isBlockNode = n => n.nodeType === 1 &&
      ['DIV','P','UL','OL','LI','BLOCKQUOTE','H1','H2','H3','H4','TABLE','PRE'].includes(n.tagName);
    let _lineWrap = null;
    [...tmp.childNodes].forEach(node => {
      if (isBlockNode(node)) { _lineWrap = null; return; }
      if (!_lineWrap) { _lineWrap = document.createElement('div'); node.parentNode.insertBefore(_lineWrap, node); }
      _lineWrap.appendChild(node);
    });

    // Capture plain text before modifying tmp for HTML-clipboard compatibility.
    // Walk top-level children manually — innerText on a detached node has no layout
    // context and silently falls back to textContent (no block-level newlines).
    // <br> inside a block is a line break, but textContent drops it silently --
    // which is how a run of <br>-separated lines came out as one long line.
    const plainLine = n => {
      let t;
      if (n.nodeType === 1 && /<br\s*\/?>/i.test(n.innerHTML || '')) {
        const probe = document.createElement('div');
        // A <br> at the very end of a block is a height placeholder holding the
        // line open, not a break -- counting it adds a blank line that is not
        // there. Drop it, then the rest are real breaks.
        probe.innerHTML = (n.innerHTML || '')
          .replace(/(<br\s*\/?>\s*)$/i, '')
          .replace(/<br\s*\/?>/gi, '\n');
        t = probe.textContent || '';
      } else {
        t = n.textContent || '';
      }
      return t.replace(/ /g, ' ');
    };
    const plainText = [...tmp.childNodes].flatMap(n => {
      // Lists are one node holding many lines — expand them, or every bullet
      // would run together into a single line of plain text
      if (n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL')) {
        const ordered = n.tagName === 'OL';
        return [...n.children].map((li, i) =>
          (ordered ? `${i + 1}. ` : '\u2022 ') + plainLine(li));
      }
      return [plainLine(n)];
    }).join('\n');

    // Paste from Google Docs or Word arrives as <p> blocks and is stored that way.
    // LCARS styles p and div identically (#editor p,#editor div{margin:0}) so it
    // looks right here — but <p> carries a default margin everywhere else, so a
    // pasted sim copied into Word or a forum came out double spaced, and every
    // empty <p> became a blank paragraph with margins of its own. Typed sims are
    // <div> and never had the problem. Converting on the way out fixes sims that
    // already exist, and leaves what is stored untouched.
    tmp.querySelectorAll('p').forEach(para => {
      const d = document.createElement('div');
      [...para.attributes].forEach(a => d.setAttribute(a.name, a.value));
      while (para.firstChild) d.appendChild(para.firstChild);
      para.parentNode.replaceChild(d, para);
    });

    // Empty-line blocks use <br> as a height placeholder — replace with NBSP so paste
    // targets (Word, Google Docs, forum editors) render a visible blank line instead of
    // collapsing it to nothing. Blocks pasted from Google Docs are emptier still —
    // no <br>, nothing inside at all — and collapsed to nothing in some targets while
    // showing as a full blank line in others, so they need the same treatment.
    tmp.querySelectorAll('div').forEach(block => {
      const onlyBr = block.childNodes.length === 1 && block.firstChild.nodeName === 'BR';
      const empty  = !block.childNodes.length || !(block.textContent || '').trim();
      if (onlyBr || empty) block.replaceChildren(document.createTextNode(' '));
    });

    e.clipboardData.setData('text/html', tmp.innerHTML);
    e.clipboardData.setData('text/plain', plainText);
    e.preventDefault();
  });
}

// ================================================================
// MARKER TRANSFORM
// ================================================================
// Marker rendering lives in lcars-render.js so share.html renders sims
// identically. This wrapper supplies the editor's current state.
function applyMarkers(html) {
  return lrApplyMarkers(html, {
    fmts,
    thoughtItalic: getPrefs().thoughtItalic,
    academy: isAcademyActive(),
  });
}
function stripMarkers(html) {
  return html
    .replace(/<span class="am">([\s\S]*?)<\/span>/g,'$1')
    .replace(/<span class="cm">([\s\S]*?)<\/span>/g,'$1')
    .replace(/<span class="lm">([\s\S]*?)<\/span>/g,'$1')
    .replace(/<span class="om">([\s\S]*?)<\/span>/g,'$1')
    .replace(/<em>(oO\s[\s\S]*?\sOo)<\/em>/g,'$1')
    .replace(/<span class="tm"><em>([\s\S]*?)<\/em><\/span>/g,'$1')
    .replace(/<span class="tm">([\s\S]*?)<\/span>/g,'$1')
    // Strip char-color spans (cc-nm class) — keep their text
    .replace(/<span class="cc-nm"[^>]*>([\s\S]*?)<\/span>/g,'$1')
    // Strip inline color style from block elements (keep margin-left only)
    .replace(/(<(?:div|p|li|blockquote)[^>]*?)\s+style="[^"]*color[^"]*"/gi, (m, tag) => {
      const ml = m.match(/margin-left\s*:\s*[^;"]*/i);
      return ml ? `${tag} style="${ml[0]}"` : tag;
    })
    // Strip display-only attributes; keep data-char-override (user-set paragraph assignments)
    .replace(/\s+data-char-clr="[^"]*"/g,'')
    .replace(/\s+data-block-id="[^"]*"/g,'')
    .split(ZWS).join('');
}

// ================================================================
// CARET SAVE/RESTORE
// ================================================================
// Block-boundary-aware caret position. Each text character, each <br>, and
// each block boundary (between sibling blocks) counts as one unit — so empty
// lines occupy distinct positions and the caret survives re-serialization
// without snapping back to the end of the previous worded paragraph.
function _ccBlock(n){ return n.nodeType===1 && (n.tagName==='DIV'||n.tagName==='P'||n.tagName==='LI'||n.tagName==='BLOCKQUOTE'); }
function _ccIdx(n){ return Array.prototype.indexOf.call(n.parentNode.childNodes,n); }

function saveCaret(el) {
  const sel = window.getSelection();
  if (!sel||!sel.rangeCount) return null;
  const r=sel.getRangeAt(0), tc=r.endContainer, to=r.endOffset;
  if (tc!==el && !el.contains(tc)) return null;
  let count=0, started=false, done=false;
  function walk(n){
    if(done) return;
    if(n.nodeType===3){
      if(n===tc){ count+=to; done=true; return; }
      count+=n.length; started=true; return;
    }
    if(n.nodeName==='BR'){
      if(tc===n.parentNode && to===_ccIdx(n)){ done=true; return; }
      count+=1; started=true;
      if(tc===n.parentNode && to===_ccIdx(n)+1){ done=true; return; }
      return;
    }
    if(n.nodeType===1){
      if(_ccBlock(n) && started) count+=1;
      if(n===tc){
        const kids=n.childNodes;
        for(let i=0;i<to && i<kids.length;i++){ walk(kids[i]); if(done) return; }
        done=true; return;
      }
      const kids=n.childNodes;
      for(let i=0;i<kids.length;i++){ walk(kids[i]); if(done) return; }
    }
  }
  const kids=el.childNodes;
  for(let i=0;i<kids.length;i++){ walk(kids[i]); if(done) break; }
  return count;
}

function restoreCaret(el,off) {
  if (off==null) return;
  const sel=window.getSelection(), r=document.createRange();
  let count=0, started=false, done=false;
  function place(node,offset){ try{ r.setStart(node,offset); }catch(e){ return; } r.collapse(true); done=true; }
  function walk(n){
    if(done) return;
    if(n.nodeType===3){
      if(count+n.length>=off){ place(n, off-count); return; }
      count+=n.length; started=true; return;
    }
    if(n.nodeName==='BR'){
      if(count>=off){ place(n.parentNode, _ccIdx(n)); return; }
      count+=1; started=true;
      if(count>=off){ place(n.parentNode, _ccIdx(n)+1); return; }
      return;
    }
    if(n.nodeType===1){
      if(_ccBlock(n) && started){ count+=1; if(count>=off){ place(n,0); return; } }
      const kids=n.childNodes;
      for(let i=0;i<kids.length;i++){ walk(kids[i]); if(done) return; }
    }
  }
  const kids=el.childNodes;
  for(let i=0;i<kids.length;i++){ walk(kids[i]); if(done) break; }
  if(!done){ r.selectNodeContents(el); r.collapse(false); }
  if(sel){ sel.removeAllRanges(); sel.addRange(r); }
}

// ================================================================
// CUSTOM INDENT
// ================================================================
function getCaretBlock() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  let node = sel.getRangeAt(0).startContainer;
  const ed = document.getElementById('editor');
  // Walk up to find direct child of editor
  while (node && node.parentNode !== ed) node = node.parentNode;
  return (node && node !== ed) ? node : null;
}

function getIndentLevel(el) {
  for (let i=4;i>=1;i--) { if (el.classList && el.classList.contains('ind-'+i)) return i; }
  return 0;
}

function setIndentLevel(el, n) {
  if (!el || !el.classList) return;
  for (let i=1;i<=4;i++) el.classList.remove('ind-'+i);
  if (n>=1) el.classList.add('ind-'+Math.min(4,n));
}

// Lightweight undo queue for indent/outdent (bypasses native undo stack)
let _indentUndo = [];   // [{el, fromLevel}]

// Indent normally applies to the block the caret sits in, which is a direct
// child of the editor. Inside a list that block is the whole <ul>, so indenting
// one bullet moved the entire list. When the caret is in an <li>, that li is the
// thing to move -- the ind-N rules are descendant selectors and already reach it.
// Every block the selection touches, in document order. A selection that ends
// exactly at the start of a block has not really reached into it -- browsers
// report that boundary as a hit, and indenting a line the writer only brushed
// past is worse than missing one -- so that trailing block is dropped.
function getIndentTargets() {
  const ed = document.getElementById('editor');
  const sel = window.getSelection();
  if (!ed || !sel || !sel.rangeCount) return [];
  const range = sel.getRangeAt(0);
  if (range.collapsed) { const one = getIndentTarget(); return one ? [one] : []; }

  const hits = [];
  [...ed.children].forEach(child => {
    if (!range.intersectsNode(child)) return;
    // A list is a single child of the editor, but its bullets indent one by one.
    if (child.tagName === 'UL' || child.tagName === 'OL') {
      const lis = [...child.children].filter(li => range.intersectsNode(li));
      hits.push(...(lis.length ? lis : [child]));
    } else {
      hits.push(child);
    }
  });

  if (hits.length > 1) {
    const last = hits[hits.length - 1];
    let n = range.endContainer, off = range.endOffset;
    // Walk out to the block, checking we are at the very start of each level.
    while (n && n !== last && off === 0) { off = [...n.parentNode.childNodes].indexOf(n); n = n.parentNode; }
    if (n === last && off === 0) hits.pop();
  }
  return hits;
}

function getIndentTarget() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const ed = document.getElementById('editor');
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== ed) {
      if (node.nodeType === 1 && node.tagName === 'LI') return node;
      node = node.parentNode;
    }
  }
  return getCaretBlock();
}

function doIndent() {
  const blocks = getIndentTargets();
  if (!blocks.length) return;
  // One undo entry for the whole action, so Ctrl+Z takes back what one press
  // did rather than unpicking it a block at a time.
  _indentUndo.push({ items: blocks.map(el => ({ el, fromLevel: getIndentLevel(el) })) });
  if (_indentUndo.length > 50) _indentUndo.shift();
  blocks.forEach(el => { const from = getIndentLevel(el); setIndentLevel(el, from + 1); });
  schedSave();
}

// One button covers both uses: on a single line it makes a standalone bullet,
// and Enter from there continues the list (Enter on an empty bullet ends it).
// Toggling again on an existing bullet turns it back into a plain paragraph.
function toggleBullets() {
  const ed = document.getElementById('editor');
  if (!ed) return;
  ed.focus();
  // Without this the browser wraps the line in <span style="font-size:…"> as it
  // rewrites the block, which then survives as junk markup
  try { document.execCommand('styleWithCSS', false, false); } catch(e){}
  document.execCommand('insertUnorderedList', false, null);
  tidyListToggle(ed);
  normalizeEditorContent(ed);
  updateBulletBtn();
  schedSave();
}

// Un-listing a line hands back a bare inline run plus a <br> rather than a block,
// which breaks everything downstream that keys off direct-child blocks (pilcrows,
// per-character colouring, indent). Put the paragraph structure back.
function tidyListToggle(ed) {
  const pos = saveCaret(ed);
  // Drop the font-size spans execCommand leaves behind
  ed.querySelectorAll('span[style*="font-size"]').forEach(sp => {
    if (sp.className) return;
    const p = sp.parentNode; if (!p) return;
    while (sp.firstChild) p.insertBefore(sp.firstChild, sp);
    p.removeChild(sp);
  });
  // Wrap runs of bare top-level inline/text nodes back into <div> blocks,
  // treating a top-level <br> as the end of a line rather than content
  const isBlock = n => n.nodeType === 1 &&
    ['DIV','P','UL','OL','LI','BLOCKQUOTE','H1','H2','H3','H4','TABLE','PRE'].includes(n.tagName);
  let wrap = null;
  [...ed.childNodes].forEach(node => {
    if (isBlock(node)) { wrap = null; return; }
    if (node.nodeName === 'BR') {
      if (wrap) { node.remove(); wrap = null; }
      else { const d = document.createElement('div'); d.appendChild(document.createElement('br'));
             ed.replaceChild(d, node); }
      return;
    }
    if (!wrap) { wrap = document.createElement('div'); ed.insertBefore(wrap, node); }
    wrap.appendChild(node);
  });
  restoreCaret(ed, pos);
}
function updateBulletBtn() {
  const btn = document.getElementById('tbb-ul');
  if (!btn) return;
  let on = false;
  try { on = document.queryCommandState('insertUnorderedList'); } catch(e){}
  btn.classList.toggle('on', on);
}

function doOutdent() {
  const blocks = getIndentTargets();
  if (!blocks.length) return;
  // One undo entry for the whole action, so Ctrl+Z takes back what one press
  // did rather than unpicking it a block at a time.
  _indentUndo.push({ items: blocks.map(el => ({ el, fromLevel: getIndentLevel(el) })) });
  if (_indentUndo.length > 50) _indentUndo.shift();
  blocks.forEach(el => { const from = getIndentLevel(el); setIndentLevel(el, from - 1); });
  schedSave();
}

// ================================================================
// CHAR DETECTION
// ================================================================
const CREX = /^([A-Z][A-Za-zÀ-ɏ'''\-]{1,}(?:\/[A-Z][A-Za-zÀ-ɏ'''\-]{1,})*):/gm;
function detectChars(text) {
  const s = new Set(); let m; CREX.lastIndex = 0;
  while ((m = CREX.exec(text)) !== null) m[1].split('/').forEach(n => s.add(n.trim()));

  // Second pass: manifest aliases with periods/spaces/initials (e.g. "R. Hopper:")
  // that the single-word regex above can't match.
  const specialAliases = [];
  Object.values(S.characters || {}).forEach(c => {
    getAllNamesForChar(c).forEach(alias => {
      if (alias && /[\s.]/.test(alias)) specialAliases.push(alias);
    });
  });
  if (specialAliases.length) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trimStart();
      for (const alias of specialAliases) {
        if (trimmed.toLowerCase().startsWith((alias + ':').toLowerCase())) {
          s.add(alias);
        }
      }
    }
  }

  // Third pass: auto-detect "Initial. Lastname:" patterns (e.g. R. Hopper:, B. Richards:)
  // without requiring alias registration — extends CREX to handle abbreviated names
  const INIT_CREX = /^([A-Z]\. [A-Z][A-Za-zÀ-ɏ'''\-]+(?:\/[A-Z]\. [A-Z][A-Za-zÀ-ɏ'''\-]+)*):/gm;
  let im; INIT_CREX.lastIndex = 0;
  while ((im = INIT_CREX.exec(text)) !== null) {
    im[1].split('/').forEach(n => s.add(n.trim()));
  }

  return [...s];
}

// Auto-populate doc.myChars from detected names via the manifest alias chain.
// Called on save and on openDoc so the manifest always reflects reality without
// requiring the user to manually untick/retick every character.
function syncDocMyChars(doc) {
  if (!doc.myChars) doc.myChars = [];
  let changed = false;
  (doc.chars || []).forEach(name => {
    if (doc.myChars.includes(name)) return;
    // Direct match in global myChars
    if ((S.settings.myChars || []).includes(name)) {
      doc.myChars.push(name); changed = true; return;
    }
    // Alias match: name resolves to a manifest character that already has
    // at least one of their names in S.settings.myChars
    const char = findCharByAnyName(name);
    if (char) {
      const charNames = getAllNamesForChar(char);
      if (charNames.some(n => (S.settings.myChars || []).includes(n))) {
        doc.myChars.push(name); changed = true;
        // Widen global list so future sims auto-detect this alias too
        if (!S.settings.myChars.includes(name)) S.settings.myChars.push(name);
      }
    }
  });
  return changed;
}

// ================================================================
// CHAR CORPUS + SIMILARITY
// ================================================================
function buildCharCorpus(excludeDocId) {
  const s = new Set();
  Object.values(S.docs).forEach(d => {
    if (d.id === excludeDocId) return;
    (d.chars||[]).forEach(n => s.add(n));
  });
  return s;
}

function findSimilarChar(name, corpus) {
  // Returns first similar name, or null
  const nl = name.toLowerCase();
  for (const other of corpus) {
    const ol = other.toLowerCase();
    if (ol === nl) continue; // exact match — not "similar"
    const dist = levenshtein(nl, ol);
    if (dist <= 2 && Math.abs(name.length - other.length) <= 3) return other;
  }
  return null;
}

function isPairConfirmed(a, b) {
  if (!S.settings.confirmedPairs) return false;
  const pair = [a,b].sort().join('||');
  return S.settings.confirmedPairs.includes(pair);
}

function addConfirmedPair(a, b) {
  if (!S.settings.confirmedPairs) S.settings.confirmedPairs = [];
  const pair = [a,b].sort().join('||');
  if (!S.settings.confirmedPairs.includes(pair)) S.settings.confirmedPairs.push(pair);
  persist();
  if (curId) updateCharsPanel(S.docs[curId]);
}

function replaceCharName(from, to) {
  if (!curId) return;
  const ed = document.getElementById('editor');
  const pos = saveCaret(ed);
  // Replace "From:" prefix in innerHTML (careful with HTML — match only text nodes)
  ed.innerHTML = ed.innerHTML.replace(new RegExp(escRe(from)+'(?=:)', 'g'), to);
  restoreCaret(ed, pos);
  const doc = S.docs[curId];
  if (doc) {
    const di = (doc.myChars||[]).indexOf(from);
    if (di>=0) { doc.myChars.splice(di,1); if (!doc.myChars.includes(to)) doc.myChars.push(to); }
    const gi = S.settings.myChars.indexOf(from);
    if (gi>=0) { S.settings.myChars.splice(gi,1); if (!S.settings.myChars.includes(to)) S.settings.myChars.push(to); }
    doc.chars = detectChars(ed.innerText||'');
  }
  schedSave();
  if (doc) updateCharsPanel(doc);
}

// Stored so modal button fns can reference without encoding issues
let _warnName = null, _warnSimilar = null;
function charWarnModal(name, similar) {
  _warnName = name; _warnSimilar = similar;
  openModal('SIMILAR CHARACTER NAME', `
    <p style="color:var(--dim);font-size:0.87rem;line-height:1.7">
      "<strong style="color:var(--text)">${esc(name)}</strong>" looks similar to
      "<strong style="color:var(--text)">${esc(similar)}</strong>" used in another sim.<br>
      Same character with a different spelling?
    </p>
  `, null, {
    extra: [
      {label:`Use "${esc(similar)}"`, cls:'btn-s', fn:'doWarnReplace()'},
      {label:'Keep spelling', cls:'btn-s', fn:'closeModal()'},
      {label:"They're different", cls:'btn-s', fn:'doWarnConfirm()'},
    ]
  });
}
function doWarnReplace() { if (_warnName&&_warnSimilar) replaceCharName(_warnName,_warnSimilar); closeModal(); }
function doWarnConfirm() { if (_warnName&&_warnSimilar) addConfirmedPair(_warnName,_warnSimilar); closeModal(); }

// ================================================================
// TITLE DUPE DETECTION
// ================================================================
function coreTitleStr(title) {
  // Strip "Rank Character: " or "Rank Character - " prefix
  return (title||'').replace(/^[^:—–\-]+[:—–\-]\s*/,'').trim().toLowerCase();
}

function checkTitleDupe() {
  if (!curId) return;
  const title = document.getElementById('doc-title').value.trim();
  const warn = document.getElementById('title-warn');
  _titleWarnMatch = null;
  if (!title) { warn.classList.add('hidden'); return; }
  const core = coreTitleStr(title);
  if (core.length < 4) { warn.classList.add('hidden'); return; }

  for (const [id, d] of Object.entries(S.docs)) {
    if (id === curId) continue;
    const other = coreTitleStr(d.title||'');
    if (other.length < 4) continue;
    if (other === core || other.includes(core) || core.includes(other) || levenshtein(core, other) <= 3) {
      _titleWarnMatch = d;
      break;
    }
  }
  warn.classList.toggle('hidden', !_titleWarnMatch);
}

function showTitleWarnModal() {
  if (!_titleWarnMatch) return;
  const d = _titleWarnMatch;
  const m = d.missionId ? S.missions[d.missionId] : null;
  openModal('SIMILAR TITLE FOUND', `
    <p style="color:var(--dim);font-size:0.87rem;line-height:1.7">
      A sim with a similar title already exists:<br>
      <strong style="color:var(--text)">${esc(d.title||'Untitled')}</strong>
      ${m ? `<br><span style="color:var(--dim);font-size:0.8rem">in mission: ${esc(m.name)}</span>` : ''}
    </p>
  `, null, {
    extra: [{label:'Go to that sim', cls:'btn-s', fn:`openDoc('${d.id}');closeModal()`}]
  });
}

// ================================================================
// DOCUMENT OPERATIONS
// ================================================================
function openDoc(id) {
  flushSave();
  exitTemplateMode();
  _indentUndo = [];  // clear indent undo when switching docs
  curId = id;
  curView = null; curViewId = null;
  const doc = S.docs[id]; if (!doc) return;
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  ['dh','ec'].forEach(x=>document.getElementById(x).classList.remove('hidden'));
  document.getElementById('sim-details').classList.remove('hidden');
  document.getElementById('doc-title').value = doc.title||'';
  document.getElementById('doc-status').value = doc.status||'active';
  document.getElementById('doc-posttype').value = doc.postType||'';
  const pi = document.getElementById('doc-posted-input');
  pi.value = doc.postedAt||'';
  updatePostedMeta(doc);
  updateTitleColor(doc);
  updateStatusStyle(doc);
  updateShareButton();   // reads the cache only; opening the dialog is what fetches
  // Academy mode is per-mission — strip and apply when opening
  const isAcad = isAcademyDoc(doc);
  document.body.classList.toggle('academy', isAcad);
  if (isAcad) {
    const stripped = stripFormattingHtml(doc.content||'');
    if (stripped !== doc.content) { doc.content = stripped; persist(); }
  }
  const ed = document.getElementById('editor');
  ed.innerHTML = applyCharColors(applyMarkers(doc.content||''));
  normalizeEditorContent(ed);
  applyZoom();
  // Sync doc.myChars from alias chain on open (fixes legacy docs and new sims)
  if (syncDocMyChars(doc)) persist();
  updateMeta(doc);
  updateCharsPanel(doc);
  updateWC();
  updateSB();
  checkTitleDupe();
  renderNav();
  // For a brand-new (empty) sim, drop the caret into the editor so it's obvious
  // where to start writing (the :empty placeholder hint shows until first keystroke).
  if (!doc.content) {
    ed.focus();
    const r=document.createRange(); r.selectNodeContents(ed); r.collapse(true);
    const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
}

// ── Template editing ──────────────────────────────────────────────────────
// A template is a sim body, so it is edited in the sim editor rather than in a
// box of its own — same toolbar, same markers, same auto-formatting.
//
// It rides on curId being null: every sim-specific branch in this file is
// already written as `if (curId)`, so snapshots, character detection, post
// dates, sync of the doc and the rest switch themselves off. Only the positive
// additions live here.
let curTmplId = null;

function curTemplate() {
  return curTmplId ? (S.templates||[]).find(t => t.id === curTmplId) : null;
}

function flushSave() {
  if (curTmplId) return flushTemplateSave();
  if (!curId) return;
  const doc = S.docs[curId]; if (!doc) return;
  const ed = document.getElementById('editor');
  let html = ed.innerHTML;
  html = stripMarkers(html);
  // Auto-snapshot when word delta ≥ 100 since last snapshot
  const curWC = wc(ed.innerText||'');
  if (!doc.snapshots) doc.snapshots = [];
  const lastSnap = doc.snapshots.length ? doc.snapshots[doc.snapshots.length-1] : null;
  const lastSnapWC = lastSnap ? lastSnap.wordCount : 0;
  if (Math.abs(curWC - lastSnapWC) >= 100) {
    const snap = {content:html, savedAt:Date.now(), wordCount:curWC};
    doc.snapshots.push(snap);
    if (doc.snapshots.length > 10) doc.snapshots.shift();
    pushSnapshot(curId, snap);
  }
  doc.content = html;
  doc.title = document.getElementById('doc-title').value;
  const prevStatus = doc.status;
  doc.status = document.getElementById('doc-status').value;
  if (doc.status === 'complete' && prevStatus !== 'complete') doc.completedAt = Date.now();
  else if (doc.status !== 'complete') doc.completedAt = null;
  doc.postType = document.getElementById('doc-posttype').value||null;
  doc.updatedAt = Date.now();
  doc.chars = detectChars(ed.innerText||'');
  // Prune myChars: remove names no longer detected in this sim (prevents ghost characters)
  doc.myChars = (doc.myChars||[]).filter(n => (doc.chars||[]).includes(n));
  syncDocMyChars(doc);   // re-add any that belong via alias chain
  persist();
  schedSync();
  updateMeta(doc);
  updateCharsPanel(doc);
  renderNav();
  // Keep manifest stats live if it's open
  if (_routeView === 'manifest') refreshManifest();
}

function schedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 1200);
}

// The template counterpart of flushSave. Deliberately much smaller: a template
// has no snapshots, status, post date or characters to keep in step.
function flushTemplateSave() {
  const t = curTemplate();
  if (!t) { curTmplId = null; return; }
  const name = document.getElementById('doc-title').value.trim();
  t.name = name || t.name;
  t.content = stripMarkers(document.getElementById('editor').innerHTML);
  t.updatedAt = Date.now();
  persist();
  schedSync();
  updateSB();
  refreshTemplatesBlock();          // no-op unless Settings is the open view
}

function openTemplateInEditor(id) {
  const t = (S.templates||[]).find(x => x.id === id);
  if (!t) return;
  flushSave();                      // whatever was open, sim or template
  _indentUndo = [];
  curId = null; curView = null; curViewId = null;
  curTmplId = id;
  showView('dash');                 // the editor lives in the workspace view

  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  ['dh','ec'].forEach(x => document.getElementById(x).classList.remove('hidden'));
  document.getElementById('tmpl-banner').classList.remove('hidden');
  // Sim Details is all sim — status, post type, snapshots, post date.
  document.getElementById('sim-details').classList.add('hidden');
  document.getElementById('chars-list').innerHTML =
    '<div style="padding:10px;font-size:0.8rem;color:var(--dim)">A template has no characters of its own. ' +
    'Characters are detected in a sim once you start one from this template.</div>';
  document.body.classList.remove('academy');

  const title = document.getElementById('doc-title');
  title.value = t.name || '';
  title.placeholder = 'Template name…';
  document.getElementById('title-warn').classList.add('hidden');

  const ed = document.getElementById('editor');
  ed.innerHTML = applyMarkers(t.content || '');
  normalizeEditorContent(ed);
  applyZoom();
  updateWC();
  updateSB();
  renderNav();
  ed.focus();
}

// Leaves template mode, saving first. Every path out of the editor calls this;
// it is a no-op when a template is not open.
function exitTemplateMode() {
  if (!curTmplId) return;
  flushTemplateSave();
  curTmplId = null;
  document.getElementById('tmpl-banner').classList.add('hidden');
  document.getElementById('doc-title').placeholder = 'Sim Title…';
}

function closeTemplateEditor() {
  exitTemplateMode();
  showDashboard();
  renderNav();
  showToast('Template saved');
  returnToTemplates();
}

// You reached the template editor from Settings, so that is where finishing
// with it puts you back — at the templates, not on the dashboard.
function returnToTemplates() {
  showView('settings');
  requestAnimationFrame(() => gotoSettingsSection('set-sec-templates'));
}

// Ctrl/Cmd+S — flush the current sim, force a revision snapshot (bypassing the
// usual ≥100-word threshold), and push to the Gist immediately if sync is set up.
function manualSaveAndSync() {
  if (curTmplId) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    flushTemplateSave();
    showToast('Template saved');
    return;
  }
  if (!curId || !S.docs[curId]) { showToast('No sim open to save'); return; }
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  flushSave(); // persists content + detects chars + schedules a sync
  const doc = S.docs[curId];
  if (!doc.snapshots) doc.snapshots = [];
  const last = doc.snapshots[doc.snapshots.length - 1];
  if (!last || last.content !== doc.content) {
    const snap = { content: doc.content, savedAt: Date.now(), wordCount: wc(document.getElementById('editor').innerText || '') };
    doc.snapshots.push(snap);
    if (doc.snapshots.length > 10) doc.snapshots.shift();
    persist();
    pushSnapshot(curId, snap);
  }
  if (isCloud()) {
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
    saveToCloud();
    showToast('Snapshot saved · saving to your account');
  } else {
    showToast('Snapshot saved');
  }
}

// ================================================================
// REVISION SNAPSHOTS
// ================================================================
let _histList = [];

async function showHistory() {
  if (!curId) return;
  const doc = S.docs[curId]; if (!doc) return;

  // The server is the durable record once signed in; local is the fallback so
  // history still opens offline or if the request fails.
  let snaps = (doc.snapshots || []).slice();
  if (isCloud()) {
    try { const rows = await fetchSnapshots(curId); if (rows && rows.length) snaps = rows; }
    catch(e) { /* keep the local list */ }
  }
  snaps.sort((a,b) => a.savedAt - b.savedAt);
  _histList = snaps;

  if (!snaps.length) {
    openModal('REVISION SNAPSHOTS',
      `<p style="color:var(--dim);font-size:0.87rem;line-height:1.6">No snapshots yet.<br>
       Snapshots are saved automatically when your word count changes by 100 or more words since the last snapshot.</p>`,
      null);
    return;
  }
  const rows = snaps.slice().reverse().map((s,i) => {
    const ri = snaps.length-1-i;
    const date = new Date(s.savedAt).toLocaleString();
    return `<tr>
      <td style="color:var(--dim);font-size:0.8rem">${date}</td>
      <td style="color:var(--dim);font-size:0.8rem">${s.wordCount} words</td>
      <td><span class="dv-link" onclick="restoreSnapshot(${ri})">Restore</span></td>
    </tr>`;
  }).join('');
  openModal('REVISION SNAPSHOTS', `
    <table class="dv-table">
      <tr><th>SAVED</th><th>WORDS</th><th></th></tr>
      ${rows}
    </table>
    <p style="font-size:0.73rem;color:var(--dim);margin-top:10px">Up to 10 snapshots stored. Oldest removed when limit is reached.${isCloud() ? ' Saved to your account, so they follow you between devices.' : ''}</p>
  `, null);
}

function restoreSnapshot(i) {
  if (!curId) return;
  const doc = S.docs[curId]; if (!doc) return;
  const snap = _histList[i]; if (!snap) return;   // indexes the list showHistory built
  const date = new Date(snap.savedAt).toLocaleString();
  if (!confirm(`Restore this snapshot?\n\n${date} — ${snap.wordCount} words\n\nThis will replace the current editor content.`)) return;
  closeModal();
  const ed = document.getElementById('editor');
  ed.innerHTML = applyMarkers(snap.content);
  doc.content = snap.content;
  doc.updatedAt = Date.now();
  persist();
  updateMeta(doc);
  updateWC();
  renderNav();
}

function mkDoc(title, missionId, sceneId) {
  const id = uid();
  S.docs[id] = {id,title,content:'',missionId:missionId||null,sceneId:sceneId||null,
    chars:[],myChars:[],charColors:{},status:'active',postType:null,postedAt:null,
    createdAt:Date.now(),updatedAt:Date.now()};
  persist(); renderNav(); openDoc(id);
}
function mkMission(name, year, simType) {
  const id = uid();
  S.missions[id] = {id,name,year,simType:simType||null,status:'active',createdAt:Date.now()};
  persist(); renderNav();
}
function mkScene(name, missionId, startedAt) {
  const id = uid();
  S.scenes[id] = {id,name,missionId,status:'active',startedAt:startedAt||null,createdAt:Date.now()};
  persist(); renderNav();
}

function updateTitleColor(doc) {
  const el = document.getElementById('doc-title');
  if (!el || !doc) return;
  if      (doc.status === 'archived') el.style.color = 'var(--dim)';
  else if (doc.status === 'complete') el.style.color = 'var(--gold)';
  // Active titles use a token rather than --blue2 directly, so a skin can
  // decide whether the title is tinted at all (Delta Prime keeps it ink).
  else                                el.style.color = 'var(--title-active)';
}
function updateStatusStyle(doc) {
  const el = document.getElementById('doc-status');
  if (!el || !doc) return;
  el.className = '';
  if      (doc.status === 'archived') el.classList.add('status-archived');
  else if (doc.status === 'complete') el.classList.add('status-complete');
  else                                el.classList.add('status-active');
}
function updateMeta(doc) {
  const el = document.getElementById('dh-date');
  if (!el) return;
  if (doc.postedAt) {
    el.textContent = 'Posted '+fmtPostedDate(doc.postedAt);
    el.className = 'sd-date posted';
  } else {
    el.textContent = doc.updatedAt ? 'Saved '+new Date(doc.updatedAt).toLocaleDateString() : '';
    el.className = 'sd-date';
  }
}
function updatePostedMeta(doc) {
  const btn = document.getElementById('btn-post');
  if (doc.postedAt) {
    btn.innerHTML = ic('calendar') + ' Change';
  } else {
    btn.innerHTML = ic('calendar') + ' Post';
  }
  updateMeta(doc);
}
function updateWC() {
  document.getElementById('s-wc').textContent = wc(document.getElementById('editor').innerText||'') + ' words';
}
function updateSB() {
  const t = curTemplate();
  document.getElementById('s-doc').textContent =
    t ? 'Template: ' + (t.name||'Untitled')
      : (curId && S.docs[curId]) ? (S.docs[curId].title||'Untitled') : 'No sim open';
}

// ================================================================
// POSTED DATE
// ================================================================
function openPostedCal() {
  const pi = document.getElementById('doc-posted-input');
  pi.value = '';
  try { pi.showPicker(); } catch(e) { pi.click(); }
}

function onPostedDateChange() {
  if (!curId) return;
  const doc = S.docs[curId]; if (!doc) return;
  const val = document.getElementById('doc-posted-input').value;
  doc.postedAt = val || null;
  if (val) {
    doc.status = 'complete';
    document.getElementById('doc-status').value = 'complete';
  }
  updatePostedMeta(doc);
  updateTitleColor(doc);
  updateStatusStyle(doc);
  schedSave();
}

// ================================================================
// POST TYPE
// ================================================================
function onPostTypeChange() {
  if (!curId) return;
  S.docs[curId].postType = document.getElementById('doc-posttype').value || null;
  schedSave();
}

// ================================================================
// CHARACTERS PANEL
// ================================================================
// Index-based click handlers avoid HTML-attribute encoding issues with
// names that contain quotes, apostrophes, or other special characters.
let _charList = [];   // populated each time updateCharsPanel runs
let _charWarns = {};  // charList index → similar name

function updateCharsPanel(doc) {
  _charList = [];
  _charWarns = {};
  const list = document.getElementById('chars-list');
  if (!doc||!doc.chars||!doc.chars.length) {
    list.innerHTML = '<div style="padding:10px;font-size:0.8rem;color:var(--dim)">No dialogue characters detected</div>';
    return;
  }
  const corpus = buildCharCorpus(doc.id);
  // Deduplicate: if two detected names belong to the same manifest character, show only one
  const seenCharIds = new Map(); // charId → index in deduped
  const deduped = [];
  (doc.chars||[]).forEach(n => {
    const ch = findCharByAnyName(n);
    if (ch) {
      if (!seenCharIds.has(ch.id)) { seenCharIds.set(ch.id, deduped.length); deduped.push(n); }
      // else: alias of already-listed character — skip
    } else {
      deduped.push(n);
    }
  });
  list.innerHTML = deduped.map((n, i) => {
    _charList.push(n);
    const mine = (doc.myChars||[]).includes(n)||S.settings.myChars.includes(n);
    const similar = findSimilarChar(n, corpus);
    const showWarn = similar && !isPairConfirmed(n, similar);
    if (showWarn) _charWarns[i] = similar;
    const warnHtml = showWarn
      ? `<span class="char-warn" title="Similar to '${esc(similar)}' — click to review" onclick="openCharWarn(${i})">${ic('alert','ic-sm')}</span>`
      : '';
    const charColor = (curId && S.docs[curId]?.charColors?.[n]) || '';
    const colorDotHtml = charColor
      ? `<span class="cc-char-dot" style="background:${charColor}"></span>`
      : '';
    return `<div class="chi ${mine?'mine':'other'}" onclick="toggleMyChar(${i})" oncontextmenu="charCtx(event,${i})">
      <div class="chk">${mine?ic('check','ic-sm'):''}</div><span>${esc(n)}</span>${colorDotHtml}${warnHtml}
    </div>`;
  }).join('');
}

function toggleMyChar(i) {
  const name = _charList[i]; if (!name || !curId) return;
  const doc = S.docs[curId]; if (!doc) return;
  if (!doc.myChars) doc.myChars=[];
  if (!S.settings.myChars) S.settings.myChars=[];
  const di = doc.myChars.indexOf(name);
  const gi = S.settings.myChars.indexOf(name);
  if (di>=0) {
    doc.myChars.splice(di,1);
    if (gi>=0) S.settings.myChars.splice(gi,1);
  } else {
    doc.myChars.push(name);
    if (gi<0) S.settings.myChars.push(name);
  }
  persist(); updateCharsPanel(doc);
  // Keep manifest stats live if it's open
  if (_routeView === 'manifest') refreshManifest();
}

function openCharWarn(i) {
  const name = _charList[i];
  const similar = _charWarns[i];
  if (!name || !similar) return;
  charWarnModal(name, similar);
}

// ── CHARACTER CONTEXT MENU ──
let _ctxCharIdx = -1;
let _ctxCharPairs = []; // "other" names of confirmed pairs for this char

function charCtx(e, i) {
  e.preventDefault(); e.stopPropagation();
  const name = _charList[i]; if (!name) return;
  _ctxCharIdx = i; _ctxCharPairs = [];

  const similar = _charWarns[i]; // active unresolved warning

  // All confirmed pairs that include this character
  const confirmedWith = (S.settings.confirmedPairs||[])
    .filter(p => p.split('||').includes(name))
    .map(p => p.split('||').find(n => n !== name))
    .filter(Boolean);

  const items = [];
  items.push({label:`${ic('pencil')} Rename "${esc(name)}"…`, fn:'doCtxCharRename()'});
  items.push('-');

  if (similar) {
    items.push({label:`⟳ Use "${esc(similar)}" (fix spelling)`, fn:'doCtxCharReplace()'});
    items.push({label:`${ic('check')} They are different people`, fn:'doCtxCharConfirm()'});
    items.push('-');
  }

  confirmedWith.forEach((other, j) => {
    _ctxCharPairs.push(other);
    items.push({label:`${ic('undo')} Un-mark "≠ ${esc(other)}"`, cls:'dim-item', fn:`doUnconfirmPair(${j})`});
  });
  if (confirmedWith.length) items.push('-');

  const doc = curId ? S.docs[curId] : null;
  const mine = doc && ((doc.myChars||[]).includes(name)||S.settings.myChars.includes(name));
  items.push({label: mine ? ic('square') + ' Remove from my characters' : ic('square-check') + ' Mark as my character', fn:`toggleMyChar(${i})`});

  // "View in manifest" if this character has a manifest entry and is marked as mine
  if (mine) {
    const manifestChar = findCharByAnyName(name);
    if (manifestChar) {
      items.push('-');
      items.push({label:ic('circle-dot') + ' View in manifest', fn:`openManifestToChar('${manifestChar.id}')`});
    }
  }

  // Colour coding
  if (curId) {
    const existingColor = (doc && doc.charColors && doc.charColors[name]);
    const colorDot = existingColor ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${existingColor};margin-right:4px;vertical-align:middle"></span>` : '';
    const jsName = name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    items.push('-');
    items.push({label:`${colorDot}${ic('palette')} Set colour…`, fn:`showColorPicker(event,'${jsName}')`});
    if (existingColor) items.push({label:ic('x') + ' Remove colour', fn:`removeCharColor('${jsName}')`});
  }

  showCtx(e, items);
}

function doCtxCharRename() {
  const name = _charList[_ctxCharIdx]; if (!name || !curId) return;
  openModal('RENAME CHARACTER', `
    <div class="mf">
      <label class="ml">NEW NAME</label>
      <input class="mi" id="m-cr" value="${esc(name)}">
    </div>
    <p style="color:var(--dim);font-size:0.8rem;margin-top:8px">Replaces this character name everywhere in the current sim.</p>
  `, () => {
    const newName = document.getElementById('m-cr').value.trim();
    if (!newName || newName === name) return;
    replaceCharName(name, newName);
  });
}
function doCtxCharReplace() {
  const name = _charList[_ctxCharIdx];
  const similar = _charWarns[_ctxCharIdx];
  if (name && similar) { replaceCharName(name, similar); hideCtx(); }
}
function doCtxCharConfirm() {
  const name = _charList[_ctxCharIdx];
  const similar = _charWarns[_ctxCharIdx];
  if (name && similar) addConfirmedPair(name, similar);
  hideCtx();
}
function doUnconfirmPair(j) {
  const name = _charList[_ctxCharIdx];
  const other = _ctxCharPairs[j];
  if (!name || !other) return;
  removeConfirmedPair(name, other);
  hideCtx();
}
function removeConfirmedPair(a, b) {
  if (!S.settings.confirmedPairs) return;
  const pair = [a,b].sort().join('||');
  const idx = S.settings.confirmedPairs.indexOf(pair);
  if (idx >= 0) S.settings.confirmedPairs.splice(idx, 1);
  persist();
  if (curId && S.docs[curId]) updateCharsPanel(S.docs[curId]);
}

// ================================================================
// TOOLBAR ACTIONS
// ================================================================
function ec(cmd) {
  // Bold / italic / strikethrough are unavailable in Academy sims
  if (isAcademyActive() && ['bold','italic','underline','strikeThrough'].includes(cmd)) return;
  document.getElementById('editor').focus(); document.execCommand(cmd,false,null);
}

function doLink() {
  const sel = window.getSelection();
  const selText = sel ? sel.toString() : '';

  // Save the selection range now — focusing the modal input will destroy it
  let savedRange = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).cloneRange() : null;

  // Detect if cursor is inside an existing link
  _editingLink = null;
  if (savedRange) {
    const ed = document.getElementById('editor');
    let node = savedRange.commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;
    while (node && node !== ed) {
      if (node.nodeName === 'A') { _editingLink = node; break; }
      node = node.parentNode;
    }
  }

  const existingUrl = _editingLink ? (_editingLink.getAttribute('href') || '') : '';
  const existingText = _editingLink ? _editingLink.textContent : '';
  const isEdit = !!_editingLink;

  openModal(isEdit ? 'EDIT LINK' : 'INSERT LINK', `
    <div class="mf"><label class="ml">URL</label><input class="mi" id="m-url" placeholder="https://…" value="${esc(existingUrl)}"></div>
    <div class="mf"><label class="ml">DISPLAY TEXT</label><input class="mi" id="m-lt" value="${esc(selText || existingText)}" placeholder="Link text (optional if text is selected)"></div>
  `, () => {
    const url = document.getElementById('m-url').value.trim();
    const lt = document.getElementById('m-lt').value.trim();
    if (!url) return false;
    const ed = document.getElementById('editor');
    ed.focus({ preventScroll: true });
    // Restore the selection that was lost when the modal took focus
    if (savedRange) {
      const rs = window.getSelection();
      rs.removeAllRanges();
      rs.addRange(savedRange);
    }
    if (_editingLink) {
      _editingLink.setAttribute('href', url);
      _editingLink.setAttribute('target', '_blank');
      if (lt) _editingLink.textContent = lt;
    } else if (lt && !selText) {
      document.execCommand('insertHTML', false, `<a href="${esc(url)}" target="_blank">${esc(lt)}</a>`);
    } else {
      document.execCommand('createLink', false, url);
      // Apply target="_blank" to newly created link
      const newSel = window.getSelection();
      if (newSel && newSel.rangeCount > 0) {
        let n = newSel.getRangeAt(0).commonAncestorContainer;
        if (n.nodeType === 3) n = n.parentNode;
        if (n.nodeName === 'A') n.setAttribute('target', '_blank');
      }
    }
    _editingLink = null;
    schedSave();
  }, isEdit ? { extra: [{ cls: 'btn-s', label: 'Remove Link', fn: 'doUnlinkCurrent()' }] } : {});
}

function doUnlinkCurrent() {
  const link = _editingLink;
  _editingLink = null;
  closeModal();
  if (!link) return;
  const ed = document.getElementById('editor');
  ed.focus({ preventScroll: true });
  const sel = window.getSelection();
  const r = document.createRange();
  r.selectNode(link);
  sel.removeAllRanges();
  sel.addRange(r);
  document.execCommand('unlink');
  schedSave();
}

function togglePilcrows() {
  const ed = document.getElementById('editor');
  const btn = document.getElementById('tbb-pil');
  if (!ed) return;
  const on = ed.classList.toggle('show-pilcrows');
  if (btn) btn.classList.toggle('fmt-on', on);
}

// ── EDITOR STRUCTURE NORMALISER ──
// Flattens wrapper divs (divs whose direct children include block elements),
// strips empty style/class attrs, and removes stale data-block-id from non-
// direct-children. Caret position is preserved via saveCaret/restoreCaret.
function normalizeEditorContent(ed) {
  if (!ed) return;
  stripZWSFromEditor(ed);
  const pos = saveCaret(ed);

  // Unwrap any direct-child div/p that itself contains block-level children.
  // These are browser-inserted wrapper containers, not paragraphs.
  // Repeat until stable (handles multiple nesting levels).
  let changed = true;
  while (changed) {
    changed = false;
    for (const child of [...ed.childNodes]) {
      if (child.nodeType !== 1) continue;
      if (child.tagName !== 'DIV' && child.tagName !== 'P') continue;
      const hasBlockChild = [...child.children].some(c =>
        ['DIV','P','BLOCKQUOTE','UL','OL'].includes(c.tagName)
      );
      if (hasBlockChild) {
        while (child.firstChild) ed.insertBefore(child.firstChild, child);
        ed.removeChild(child);
        changed = true;
        break; // restart — DOM was mutated
      }
    }
  }

  // Strip empty style="" and class="" left over from colour apply/remove cycles
  [...ed.children].forEach(el => {
    if (el.getAttribute('style') === '') el.removeAttribute('style');
    if (el.getAttribute('class') === '') el.removeAttribute('class');
  });

  // Remove data-block-id from anything that is no longer a direct child —
  // stale IDs from old outer wrappers would misdirect the colour-override lookup.
  ed.querySelectorAll('[data-block-id]').forEach(el => {
    if (el.parentNode !== ed) el.removeAttribute('data-block-id');
  });

  restoreCaret(ed, pos);
}

// ── BOLD NAMES ──
function boldNames() {
  const ed = document.getElementById('editor');
  const pos = saveCaret(ed);

  // ── Shared helper: normalize bold tags in the block, then re-bold the matching name.
  //   Strips ALL <strong>/<b> tags from the block's HTML first so manual bold,
  //   paste formatting, and prior cn-bolds are all cleared before re-applying.
  function applyBoldToBlock(bl, nameRe) {
    // Step 1: Remove only LCARS auto-bold (cn class) via DOM — preserves any
    // manually applied bold the writer added elsewhere in the paragraph.
    bl.querySelectorAll('strong.cn, b.cn').forEach(s => {
      while (s.firstChild) s.parentNode.insertBefore(s.firstChild, s);
      s.parentNode.removeChild(s);
    });

    // Step 2: Check if the block matches the name pattern
    const txt = bl.textContent || '';
    const m = txt.match(nameRe);
    if (!m) return;
    const matchedName = m[1];

    // Step 3: The first child must be a text node starting with the matched name
    const firstNode = bl.firstChild;
    if (!firstNode || firstNode.nodeType !== 3) return;
    const content = firstNode.textContent;
    if (!content.startsWith(matchedName)) return;

    // Step 4: Split the text node and wrap the name
    const after = content.slice(matchedName.length);
    const strong = document.createElement('strong');
    strong.className = 'cn';
    strong.textContent = matchedName;
    firstNode.textContent = after;
    bl.insertBefore(strong, firstNode);
  }

  // Build all patterns
  const N_PAT = '[A-Z][A-Za-z\\u00C0-\\u024F\'\\u2019\\-]{1,}';
  const CREX_RE = new RegExp(`^((${N_PAT})(?:\\/${N_PAT})*)(:\\s?)`);
  const INIT_RE = /^([A-Z]\. [A-Z][A-Za-zÀ-ɏ'''\-]+(?:\/[A-Z]\. [A-Z][A-Za-zÀ-ɏ'''\-]+)*)(:\s?)/;

  // Build alias list (manifest aliases containing spaces or dots)
  const specialAliases = [];
  Object.values(S.characters || {}).forEach(c => {
    getAllNamesForChar(c).forEach(alias => {
      if (alias && /[\s.]/.test(alias)) specialAliases.push(alias);
    });
  });

  // Only process direct children of the editor — prevents outer wrapper divs
  // from having their entire innerHTML stripped, and stops nested narration
  // divs being double-processed (which could silently lose the name bold).
  const rawBlocks = [...ed.children].filter(el =>
    ['DIV','P','LI','BLOCKQUOTE'].includes(el.tagName)
  );
  // If editor starts with a raw text node (no block wrapper yet), treat editor itself as a block
  if (ed.firstChild?.nodeType === 3) rawBlocks.unshift(ed);
  const blocks = rawBlocks;
  blocks.forEach(bl => {
    const txt = (bl.textContent || '');

    // Pass 1: standard CREX-style names (Hopper:, Name1/Name2:)
    if (CREX_RE.test(txt)) {
      applyBoldToBlock(bl, CREX_RE);
      return; // one pattern per block
    }
    // Pass 2: initial-dot-space names (R. Hopper:, B. Richards:)
    if (INIT_RE.test(txt)) {
      applyBoldToBlock(bl, INIT_RE);
      return;
    }
    // Pass 3: manifest aliases with spaces/dots
    for (const alias of specialAliases) {
      const esc2 = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const aliasRe = new RegExp(`^(${esc2})(:\\s?)`, 'i');
      if (aliasRe.test(txt.trimStart())) {
        applyBoldToBlock(bl, aliasRe);
        break;
      }
    }
  });

  restoreCaret(ed, pos);
  pushCaretOutOfMarkerSpans();
  schedSave();
}

function stripBoldNames() {
  const ed = document.getElementById('editor');
  if (!ed) return;
  const pos = saveCaret(ed);
  ed.querySelectorAll('strong.cn, b.cn').forEach(el => {
    while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
    el.parentNode.removeChild(el);
  });
  restoreCaret(ed, pos);
  pushCaretOutOfMarkerSpans();
  schedSave();
}
function toggleAutoBold() {
  if (curId && isAcademyDoc(S.docs[curId])) return;
  const on = !getPrefs().autoBoldNames;
  S.settings.prefs = Object.assign({}, S.settings.prefs, { autoBoldNames: on });
  persist();
  updateAutoBoldBtn();
  if (on) boldNames(); else stripBoldNames();
}
function updateAutoBoldBtn() {
  const btn = document.getElementById('tbb-bn');
  if (btn) btn.classList.toggle('fmt-on', getPrefs().autoBoldNames);
}
function toggleItalicThoughts() {
  if (curId && isAcademyDoc(S.docs[curId])) return;
  const on = !getPrefs().thoughtItalic;
  S.settings.prefs = Object.assign({}, S.settings.prefs, { thoughtItalic: on });
  persist();
  applyPrefs();
  updateItalicThoughtsBtn();
  if (curId) transformNow();
}
function updateItalicThoughtsBtn() {
  const btn = document.getElementById('tbb-it');
  if (btn) btn.classList.toggle('fmt-on', getPrefs().thoughtItalic);
}
function toggleBoldLocations() {
  const on = !getPrefs().boldLocations;
  S.settings.prefs = Object.assign({}, S.settings.prefs, { boldLocations: on });
  persist(); applyPrefs();
  if (curId) transformNow();
}
function updateBoldLocationsBtn() {
  const btn = document.getElementById('tbb-bl');
  if (btn) btn.classList.toggle('fmt-on', getPrefs().boldLocations);
}
function toggleItalicOOC() {
  const on = !getPrefs().italicOOC;
  S.settings.prefs = Object.assign({}, S.settings.prefs, { italicOOC: on });
  persist(); applyPrefs();
  if (curId) transformNow();
}
function updateItalicOOCBtn() {
  const btn = document.getElementById('tbb-oi');
  if (btn) btn.classList.toggle('fmt-on', getPrefs().italicOOC);
}

function insertMarker(type) {
  const ed = document.getElementById('editor');
  if (!ed) return;
  ed.focus();
  // Comms spaces are included here so inserted text matches applyMarkers output exactly,
  // preventing restoreCaret from miscounting after the space-adding transform.
  const MARKERS = {
    action:   { open: '::', close: '::',       ph: 'Action'    },
    comms:    { open: '=/\\= ', close: ' =/\\=', ph: 'Comms'  },
    thought:  { open: 'oO ', close: ' Oo',     ph: 'Thoughts'  },
    location: { open: '((', close: '))',        ph: 'Location'  },
    ooc:      { open: '((OOC - ', close: '))', ph: ''           },
  };
  const m = MARKERS[type]; if (!m) return;
  const sel = window.getSelection();
  const hasSelection = sel && sel.rangeCount && !sel.getRangeAt(0).collapsed;

  if (hasSelection) {
    document.execCommand('insertText', false, `${m.open}${sel.getRangeAt(0).toString()}${m.close}`);
  } else {
    // Two-phase insert: positions cursor BETWEEN open and placeholder (not after close).
    // This avoids the browser's sticky-formatting inheriting italic/highlight from
    // the adjacent .tm/.cm span that transform will create 600ms later.
    document.execCommand('insertText', false, m.open);
    const posAfterOpen = saveCaret(ed);
    document.execCommand('insertText', false, `${m.ph}${m.close}`);
    restoreCaret(ed, posAfterOpen);
  }

  if (_normTimer) clearTimeout(_normTimer);
  _normTimer = setTimeout(() => normalizeEditorContent(ed), 80);
  if (trTimer) clearTimeout(trTimer);
  trTimer = setTimeout(transformNow, 600);
  schedSave();
}

function toggleTbDropdown(id) {
  const dd = document.getElementById('tb-dd-' + id);
  if (!dd) return;
  const isOpen = dd.classList.contains('open');
  document.querySelectorAll('.tb-dd').forEach(d => d.classList.remove('open'));
  if (!isOpen) dd.classList.add('open');
}
let _tbHoverTimer = null;
function openTbDd(id) {
  clearTimeout(_tbHoverTimer);
  document.querySelectorAll('.tb-dd').forEach(d => d.classList.remove('open'));
  const dd = document.getElementById('tb-dd-' + id);
  if (dd) dd.classList.add('open');
}
function schedCloseTbDd(id) {
  _tbHoverTimer = setTimeout(() => {
    const dd = document.getElementById('tb-dd-' + id);
    if (dd) dd.classList.remove('open');
  }, 200);
}
function cancelCloseTbDd() { clearTimeout(_tbHoverTimer); }
document.addEventListener('click', e => {
  // Close all dropdowns when clicking outside a wrapper, or clicking an item inside a dropdown
  if (!e.target.closest('.tb-dd-wrap') || e.target.closest('.tb-dd'))
    document.querySelectorAll('.tb-dd').forEach(d => d.classList.remove('open'));
}, true);

function setThemeFromSettings(t) {
  setTheme(t);
  document.querySelectorAll('.st-btn').forEach(b =>
    b.classList.toggle('btn-p', b.dataset.theme === t)
  );
}
// Switching skin swaps which controls the panel shows, so re-render it in place
function setStyleFromSettings(skin, el, ev) {
  setStyle({ skin }, el, ev);
  if (_routeView === 'settings') {
    const y = document.getElementById('set-scroll').scrollTop;
    renderSettingsView();
    document.getElementById('set-scroll').scrollTop = y;
  }
}
function toggleFmt(type) {
  fmts[type] = !fmts[type];
  document.getElementById({action:'tbb-am',comms:'tbb-cm',thought:'tbb-th'}[type])
    .classList.toggle('fmt-on',fmts[type]);
  const prefKey = {action:'actionOn',comms:'commsOn',thought:'thoughtOn'}[type];
  S.settings.prefs = Object.assign({}, S.settings.prefs, { [prefKey]: fmts[type] });
  persist();
  if (curId) transformNow();
}

// ================================================================
// AUTO-FORMATTING
// ================================================================
let _panelTimer = null;
function schedPanelRefresh() {
  if (_panelTimer) clearTimeout(_panelTimer);
  _panelTimer = setTimeout(() => {
    if (!curId) return;
    const doc = S.docs[curId]; if (!doc) return;
    const ed = document.getElementById('editor');
    const liveChars = detectChars(ed.innerText || '');
    const tmpDoc = Object.assign({}, doc, {
      chars: liveChars,
      myChars: (doc.myChars||[]).filter(n => liveChars.includes(n))
    });
    updateCharsPanel(tmpDoc);
  }, 400);
}

function hasEditorSel() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
  const ed = document.getElementById('editor');
  return !!ed && ed.contains(sel.getRangeAt(0).commonAncestorContainer);
}

function onEditorInput(e) {
  if (e.inputType==='insertText' && e.data==='-') {
    const sel=window.getSelection();
    if (sel&&sel.rangeCount) {
      const r=sel.getRangeAt(0),node=r.startContainer;
      if (node.nodeType===3) {
        const p=r.startOffset,t=node.textContent;
        if (p>=2&&t[p-2]==='-'&&t[p-1]==='-') {
          node.textContent=t.slice(0,p-2)+'–'+t.slice(p);
          r.setStart(node,p-1);r.collapse(true);
          sel.removeAllRanges();sel.addRange(r);
        }
      }
    }
  }
  if (_normTimer) clearTimeout(_normTimer);
  _normTimer = setTimeout(() => { if (!hasEditorSel()) normalizeEditorContent(document.getElementById('editor')); }, 80);
  if (trTimer) clearTimeout(trTimer);
  trTimer = setTimeout(() => { if (!hasEditorSel()) transformNow(); }, 600);
  if (getPrefs().autoBoldNames && !(curId && isAcademyDoc(S.docs[curId]))) {
    if (_bnTimer) clearTimeout(_bnTimer);
    _bnTimer = setTimeout(() => { if (!hasEditorSel()) boldNames(); }, 900);
  }
  updateWC();
  schedSave();
  schedPanelRefresh();
}
let _bnTimer = null;
let _normTimer = null;

// After transformNow wraps a thought/action/comms marker, the restored caret can
// land inside the trailing edge of the inline span, causing subsequent typing to
// inherit the span's formatting. This moves the caret out if it's at the very end
// of a marker span (but leaves it alone if it's editing text in the middle).
function pushCaretOutOfMarkerSpans() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.getRangeAt(0).collapsed) return;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  const offset = range.startOffset;
  if (node.nodeType !== 3 || offset !== node.length) return;

  let markerSpan = null;
  let el = node.parentElement;
  const ed = document.getElementById('editor');
  while (el && el !== ed) {
    if (el.classList && (el.classList.contains('am') || el.classList.contains('cm') || el.classList.contains('tm'))) {
      markerSpan = el;
      break;
    }
    el = el.parentElement;
  }
  if (!markerSpan) return;

  function lastTextNode(n) {
    if (n.nodeType === 3) return n;
    for (let i = n.childNodes.length - 1; i >= 0; i--) {
      const r = lastTextNode(n.childNodes[i]);
      if (r) return r;
    }
    return null;
  }
  if (lastTextNode(markerSpan) !== node) return;

  try {
    // If there's already a text node after the span, use it — browser won't steal into span.
    // If not, create a ZWS text node so the caret lands in a neutral text context.
    // An element-level position (setStartAfter with no following text node) causes the
    // browser to route the next keystroke back into the adjacent styled span every time.
    const nextSib = markerSpan.nextSibling;
    let targetNode, targetOffset;
    if (nextSib && nextSib.nodeType === 3) {
      targetNode = nextSib;
      targetOffset = 0;
    } else {
      targetNode = document.createTextNode(ZWS);
      markerSpan.parentNode.insertBefore(targetNode, nextSib || null);
      targetOffset = 1;
    }
    const r = document.createRange();
    r.setStart(targetNode, targetOffset);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  } catch(e) {}
}

// Strip ZWS caret-anchor characters inserted by pushCaretOutOfMarkerSpans,
// adjusting the live cursor offset so saveCaret counts are ZWS-free.
function stripZWSFromEditor(ed) {
  const sel = window.getSelection();
  let cn = null, co = 0;
  if (sel && sel.rangeCount) { const r = sel.getRangeAt(0); cn = r.startContainer; co = r.startOffset; }
  const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
  const hits = [];
  let n;
  while ((n = walker.nextNode())) { if (n.textContent.includes(ZWS)) hits.push(n); }
  if (!hits.length) return;
  hits.forEach(n => {
    if (n === cn) co -= (n.textContent.slice(0, co).split(ZWS).length - 1);
    n.textContent = n.textContent.split(ZWS).join('');
  });
  if (cn && sel) {
    try {
      const r = document.createRange();
      r.setStart(cn, Math.max(0, Math.min(co, cn.length)));
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    } catch(e) {}
  }
}

function transformNow() {
  const ed = document.getElementById('editor');
  stripZWSFromEditor(ed);
  const pos = saveCaret(ed);
  let newHtml = applyMarkers(ed.innerHTML);
  if (curId) newHtml = applyCharColors(newHtml);
  if (newHtml!==ed.innerHTML) { ed.innerHTML=newHtml; restoreCaret(ed,pos); pushCaretOutOfMarkerSpans(); }
}

// ================================================================
// CHARACTER COLOUR CODING
// ================================================================
const CC_PRESETS = [
  {name:'Red',    hex:'#b03030'},
  {name:'Gold',   hex:'#b8900b'},
  {name:'Blue',   hex:'#4682b4'},
  {name:'Purple', hex:'#7b22cc'},
  {name:'Green',  hex:'#27ae60'},
];

// Character colouring lives in lcars-render.js; see applyMarkers above.
function applyCharColors(html) {
  if (!curId) return html;
  const doc = S.docs[curId];
  return lrApplyCharColors(html, (doc && doc.charColors) || {});
}

function getCharColor(name) {
  if (!curId) return null;
  const doc = S.docs[curId];
  if (!doc || !doc.charColors) return null;
  // Direct match
  if (doc.charColors[name]) return doc.charColors[name];
  // Case-insensitive + alias check
  const lname = name.toLowerCase();
  for (const [key, clr] of Object.entries(doc.charColors)) {
    if (key.toLowerCase() === lname) return clr;
  }
  return null;
}

function setCharColor(name, hex) {
  if (!curId) return;
  const doc = S.docs[curId]; if (!doc) return;
  if (!doc.charColors) doc.charColors = {};
  if (hex) doc.charColors[name] = hex;
  else delete doc.charColors[name];
  persist();
  transformNow();
  updateCharsPanel(doc);  // refresh color dots in panel
  hideCtx();
}

function removeCharColor(name) {
  setCharColor(name, null);
}

function showColorPicker(e, name) {
  e.preventDefault(); e.stopPropagation();
  const doc = curId ? S.docs[curId] : null;
  const currentColor = (doc && doc.charColors && doc.charColors[name]) || '';
  const jsName = name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");

  const swatches = CC_PRESETS.map(p =>
    `<div class="cc-swatch${currentColor===p.hex?' active':''}" style="background:${p.hex}" title="${p.name}" onclick="setCharColor('${jsName}','${p.hex}')"></div>`
  ).join('');

  const customInput = `<div class="cc-custom" title="Custom colour"><input type="color" value="${currentColor||'#888888'}" onchange="setCharColor('${jsName}',this.value)"></div>`;

  const removeBtn = currentColor
    ? `<div style="font-size:0.67rem;color:var(--dim);cursor:pointer;padding:2px 4px" onclick="removeCharColor('${jsName}')">${ic('x','ic-sm')} Remove</div>`
    : '';

  // Show as a context menu
  showCtx(e, [], `<div style="padding:4px 6px;font-size:0.67rem;color:var(--amber);letter-spacing:1px;border-bottom:1px solid var(--border);margin-bottom:4px">COLOUR — ${esc(name)}</div><div class="cc-palette">${swatches}${customInput}${removeBtn}</div>`);
}

// Editor right-click: assign paragraph to a character's color
function editorCtx(e) {
  // Plain right-click = native browser menu (spell-check). The colour-override
  // menu is reachable via Shift+right-click so it never blocks spell-check.
  if (!e.shiftKey) return;
  e.preventDefault(); e.stopPropagation();
  if (!curId) {
    showCtx(e,[{label:'<span style="font-size:0.73rem;opacity:.6">No sim open</span>',fn:''}]);
    return;
  }
  const doc = S.docs[curId];
  const colors = doc && doc.charColors;
  if (!colors || !Object.keys(colors).length) {
    showCtx(e,[{label:'<span style="font-size:0.73rem;opacity:.6;line-height:1.6">Assign character colours via the<br>Characters panel first (right-click a name)</span>',fn:''}]);
    return;
  }

  const sel = window.getSelection();
  let block = null;
  if (sel && sel.rangeCount) {
    const ed = document.getElementById('editor');
    let node = sel.getRangeAt(0).startContainer;
    // Only resolve a block if the caret is actually inside the editor — a stale
    // selection elsewhere must not walk past the editor up to document (which
    // has no getAttribute and would throw).
    if (ed.contains(node)) {
      while (node && node.parentNode !== ed) node = node.parentNode;
      if (node && node !== ed && node.nodeType === 1) block = node;
    }
  }
  if (!block) {
    showCtx(e,[{label:'<span style="font-size:0.73rem;opacity:.6">Click inside a paragraph first</span>',fn:''}]);
    return;
  }

  // Assign a stable temp ID to this block element for later reference
  if (!block.getAttribute('data-block-id')) block.setAttribute('data-block-id', 'b' + uid());
  const bid = block.getAttribute('data-block-id');
  const overrideChar = block.getAttribute('data-char-override') || null;
  const jsBid = bid.replace(/\\/g,'\\\\').replace(/'/g,"\\'");

  const items = [];
  items.push({label:'<span style="font-size:0.67rem;letter-spacing:1px;opacity:.7">' + ic('palette') + ' ASSIGN PARAGRAPH COLOUR</span>',fn:''});
  Object.entries(colors).forEach(([name, hex]) => {
    const active = overrideChar === name ? ' ' + ic('check') : '';
    const jsName = name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    items.push({label: `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${hex};margin-right:5px;vertical-align:middle"></span>${esc(name)}${active}`,
      fn: `setParaCharOverride(event,'${jsBid}','${jsName}','${hex}')`});
  });
  if (overrideChar) {
    items.push('-');
    items.push({label:ic('x') + ' Remove paragraph override', fn:`clearParaCharOverride(event,'${jsBid}')`});
  }
  showCtx(e, items);
}

function setParaCharOverride(e, blockId, name, hex) {
  const bl = document.querySelector(`[data-block-id="${blockId}"]`);
  if (bl) {
    bl.setAttribute('data-char-override', name);
    bl.setAttribute('data-char-clr','1');
    bl.style.color = hex;
  }
  hideCtx();
  schedSave();
}

function clearParaCharOverride(e, blockId) {
  const bl = document.querySelector(`[data-block-id="${blockId}"]`);
  if (bl) {
    bl.removeAttribute('data-char-override');
    bl.removeAttribute('data-char-clr');
    bl.style.removeProperty('color');
  }
  hideCtx();
  schedSave();
}

// ================================================================
// ZOOM
// ================================================================
function applyZoom() {
  document.getElementById('editor').style.zoom = zoom/100;
  document.getElementById('s-zoom').textContent = zoom+'%';
}
function adjZoom(d) {
  zoom = Math.max(50,Math.min(200,zoom+d));
  S.settings.zoom = zoom;
  applyZoom();
  persist();
}

// ================================================================
// TOOLBAR STATE
// ================================================================
function updateTBState() {
  document.getElementById('tbb-b').classList.toggle('on',document.queryCommandState('bold'));
  document.getElementById('tbb-i').classList.toggle('on',document.queryCommandState('italic'));
  document.getElementById('tbb-s').classList.toggle('on',document.queryCommandState('strikeThrough'));
  updateBulletBtn();
  pushCaretOutOfMarkerSpans();
}

// ================================================================
// SIM TYPE (mission level)
// ================================================================
function setSimType(missionId, simType) {
  const m = S.missions[missionId]; if (!m) return;
  m.simType = simType||null;
  // When tagging as Academy, strip formatting from all docs in this mission
  if (simType === 'academy') {
    Object.values(S.docs).filter(d => d.missionId === missionId).forEach(d => {
      d.content = stripFormattingHtml(d.content||'');
    });
    // Refresh editor if a doc from this mission is currently open
    if (curId && S.docs[curId] && S.docs[curId].missionId === missionId) {
      document.body.classList.add('academy');
      const ed = document.getElementById('editor');
      ed.innerHTML = applyMarkers(S.docs[curId].content||'');
    }
  }
  persist(); renderNav();
}

function docSimType(doc) {
  if (!doc.missionId) return null;
  const m = S.missions[doc.missionId];
  return m ? (m.simType||null) : null;
}

// ================================================================
// NAV HELPERS
// ================================================================
function simTypeTag(st) {
  if (!st) return '';
  if (st==='mission') return `<span class="tag tag-ml">Mission</span>`;
  if (st==='shoreleave') return `<span class="tag tag-sl">Shore Leave</span>`;
  if (st==='academy') return `<span class="tag tag-ac">Academy</span>`;
  return '';
}
function postTypeTag(pt) {
  if (!pt) return '';
  if (pt==='jp') return `<span class="tag tag-jp">JP</span>`;
  if (pt==='solo') return `<span class="tag tag-solo">Solo</span>`;
  return '';
}

// ================================================================
// SCENE PARTNER HELPERS
// ================================================================
function computeScenePartners(docs) {
  const myChars = (S.settings.myChars||[]).map(n=>n.toLowerCase());
  if (!myChars.length) return null; // null = myChars not set
  const partners = {};
  docs.forEach(d => {
    if (!(d.myChars||[]).some(n=>myChars.includes(n.toLowerCase()))) return;
    (d.chars||[]).forEach(name => {
      if (myChars.includes(name.toLowerCase())) return;
      if (!partners[name]) partners[name] = { scenes: new Set(), sims: 0 };
      partners[name].sims++;
      if (d.sceneId) partners[name].scenes.add(d.sceneId);
    });
  });
  return Object.entries(partners)
    .map(([name,{scenes,sims}])=>({name, scenes:scenes.size, sims}))
    .sort((a,b)=>b.sims-a.sims||b.scenes-a.scenes);
}

function computeCharacterPartners(c, topN) {
  const myNames = getAllNamesForChar(c).map(n=>n.toLowerCase());
  const partners = {};
  Object.values(S.docs).forEach(d => {
    if (!(d.chars||[]).some(n=>myNames.includes(n.toLowerCase()))) return;
    (d.chars||[]).forEach(name => {
      if (myNames.includes(name.toLowerCase())) return;
      if (!partners[name]) partners[name] = { scenes: new Set(), sims: 0 };
      partners[name].sims++;
      if (d.sceneId) partners[name].scenes.add(d.sceneId);
    });
  });
  return Object.entries(partners)
    .map(([name,{scenes,sims}])=>({name, scenes:scenes.size, sims}))
    .sort((a,b)=>b.sims-a.sims||b.scenes-a.scenes)
    .slice(0, topN||5);
}

function renderPartnersSection(partners, showScenes, emptyMsg) {
  if (partners === null) return `<div class="dv-section">SCENE PARTNERS</div><div style="font-size:0.8rem;color:var(--dim);margin-bottom:12px">Mark characters as yours (${ic('square-check','ic-sm')} in the character panel) to see scene partner stats.</div>`;
  if (!partners.length) return `<div class="dv-section">SCENE PARTNERS</div><div style="font-size:0.8rem;color:var(--dim);margin-bottom:12px">${emptyMsg||'No scene partners detected.'}</div>`;
  const rows = partners.map(p => {
    const detail = showScenes
      ? `${p.scenes} scene${p.scenes!==1?'s':''}, ${p.sims} sim${p.sims!==1?'s':''}`
      : `${p.sims} sim${p.sims!==1?'s':''}`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:0.82rem;color:var(--text)">${esc(p.name)}</span>
      <span style="font-size:0.78rem;color:var(--dim)">${detail}</span>
    </div>`;
  }).join('');
  return `<div class="dv-section">SCENE PARTNERS</div><div style="margin-bottom:12px">${rows}</div>`;
}

// ================================================================
// DETAIL VIEWS
// ================================================================
function openMission(id) {
  flushSave(); exitTemplateMode(); curId = null;
  curView = 'mission'; curViewId = id;
  document.body.classList.remove('academy');
  ['dh','ec'].forEach(x=>document.getElementById(x).classList.add('hidden'));
  document.getElementById('dashboard').classList.add('hidden');
  const dv = document.getElementById('detail-view');
  dv.innerHTML = renderMissionView(id);
  dv.classList.remove('hidden');
  document.getElementById('s-doc').textContent = S.missions[id]?S.missions[id].name:'';
}

function openScene(id) {
  flushSave(); exitTemplateMode(); curId = null;
  curView = 'scene'; curViewId = id;
  document.body.classList.remove('academy');
  ['dh','ec'].forEach(x=>document.getElementById(x).classList.add('hidden'));
  document.getElementById('dashboard').classList.add('hidden');
  const dv = document.getElementById('detail-view');
  dv.innerHTML = renderSceneView(id);
  dv.classList.remove('hidden');
  document.getElementById('s-doc').textContent = S.scenes[id]?S.scenes[id].name:'';
}

function renderMissionView(id) {
  const m = S.missions[id]; if (!m) return '<p style="color:var(--dim)">Mission not found.</p>';
  const scenes = Object.values(S.scenes).filter(sc=>sc.missionId===id).sort((a,b)=>a.name.localeCompare(b.name));
  const allDocs = Object.values(S.docs).filter(d=>d.missionId===id);
  const unsortedDocs = allDocs.filter(d=>!d.sceneId).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  const posted = allDocs.filter(d=>d.postedAt).length;

  let html = `
    <div class="dv-close"><button class="dv-close-btn" onclick="showDashboard()" title="Back to dashboard">${ic('x')}</button></div>
    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:4px">
      <div style="flex:1;min-width:0">
        <div class="dv-title">${esc(m.name)}</div>
        <div class="dv-meta">
          <span class="sdot ${m.status||'active'}"></span>
          <span>${m.year||''}</span>
          ${simTypeTag(m.simType)}
          <span style="text-transform:capitalize">${m.status||'active'}</span>
        </div>
        <div class="dv-stat">
          <div class="dv-stat-item"><div class="dv-stat-num">${scenes.length}</div><div class="dv-stat-lbl">SCENES</div></div>
          <div class="dv-stat-item"><div class="dv-stat-num">${allDocs.length}</div><div class="dv-stat-lbl">SIMS</div></div>
          <div class="dv-stat-item"><div class="dv-stat-num">${posted}</div><div class="dv-stat-lbl">POSTED</div></div>
        </div>
      </div>
      <div class="dash-actions dv-action-btns" style="flex-shrink:0;margin:0;flex-wrap:nowrap">
        <button class="dash-action" onclick="showNewScene('${id}')">
          <div class="da-icon">${ic('table')}</div>
          <div class="da-label">Create a new Scene</div>
          <div class="da-hint">Add a scene grouping to this mission</div>
        </button>
        <button class="dash-action" onclick="showNewDoc(null,'${id}')">
          <div class="da-icon">${ic('pencil')}</div>
          <div class="da-label">Write a new Sim</div>
          <div class="da-hint">Start a new sim in this mission</div>
        </button>
      </div>
    </div>
  `;

  if (scenes.length) {
    html += `<div class="dv-section">SCENES</div>
    <table class="dv-table">
      <tr><th>SCENE</th><th>SIMS</th><th>STATUS</th></tr>
      ${scenes.map(sc=>{
        const cnt = Object.values(S.docs).filter(d=>d.sceneId===sc.id).length;
        return `<tr>
          <td><span class="dv-link" onclick="openScene('${sc.id}')">${esc(sc.name)}</span></td>
          <td>${cnt}</td>
          <td><span class="sdot ${sc.status||'active'}" style="display:inline-block;margin-right:4px"></span><span style="text-transform:capitalize;font-size:0.8rem;color:var(--dim)">${sc.status||'active'}</span>${staleMarker(sc.id, sc.status)}</td>
        </tr>`;
      }).join('')}
    </table>`;
  }

  if (unsortedDocs.length) {
    html += `<div class="dv-section">UNSCENED SIMS</div>
    <table class="dv-table">
      <tr><th>TITLE</th><th>TYPE</th><th>STATUS</th><th>POSTED</th></tr>
      ${unsortedDocs.map(d=>`<tr>
        <td><span class="dv-link" onclick="openDoc('${d.id}')">${esc(d.title||'Untitled')}</span></td>
        <td>${postTypeTag(d.postType)||'<span style="color:var(--dim)">—</span>'}</td>
        <td><span class="sdot ${d.status||'active'}" style="display:inline-block"></span></td>
        <td style="color:var(--dim);font-size:0.8rem">${d.postedAt||'—'}</td>
      </tr>`).join('')}
    </table>`;
  }

  if (!scenes.length && !allDocs.length) {
    html += `<div style="color:var(--dim);font-size:0.87rem;margin-top:16px">No scenes or sims in this mission yet.</div>`;
  }

  html += renderPartnersSection(computeScenePartners(allDocs), true, 'No character co-occurrences detected in this mission.');

  return html;
}

function renderSceneView(id) {
  const sc = S.scenes[id]; if (!sc) return '<p style="color:var(--dim)">Scene not found.</p>';
  const m = sc.missionId ? S.missions[sc.missionId] : null;
  const docs = Object.values(S.docs).filter(d=>d.sceneId===id).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));

  let html = `
    <div class="dv-close">
      ${m ? `<span class="dv-back" style="margin-right:auto" onclick="openMission('${m.id}')">${ic('chevron-left')} ${esc(m.name)}</span>` : ''}
      <button class="dv-close-btn" onclick="showDashboard()" title="Back to dashboard">${ic('x')}</button>
    </div>
    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:4px">
      <div style="flex:1;min-width:0">
        <div class="dv-title">${esc(sc.name)}</div>
        <div class="dv-meta">
          <span class="sdot ${sc.status||'active'}"></span>
          ${m ? `<span>Mission: <span class="dv-link" onclick="openMission('${m.id}')">${esc(m.name)}</span></span>` : ''}
          <span style="text-transform:capitalize">${sc.status||'active'}</span>
          ${sc.startedAt ? `<span style="color:var(--dim)">Started: ${new Date(sc.startedAt).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}</span>` : ''}
        </div>
        <div class="dv-stat">
          <div class="dv-stat-item"><div class="dv-stat-num">${docs.length}</div><div class="dv-stat-lbl">SIMS</div></div>
          <div class="dv-stat-item"><div class="dv-stat-num">${docs.filter(d=>d.postedAt).length}</div><div class="dv-stat-lbl">POSTED</div></div>
        </div>
      </div>
      <div class="dash-actions dv-action-btns" style="flex-shrink:0;margin:0">
        <button class="dash-action" onclick="showNewDoc('${id}','${sc.missionId||''}')">
          <div class="da-icon">${ic('pencil')}</div>
          <div class="da-label">Write a new Sim</div>
          <div class="da-hint">Start a new sim in this scene</div>
        </button>
      </div>
    </div>
  `;

  if (docs.length) {
    html += `<div class="dv-section">SIMS IN THIS SCENE</div>
    <table class="dv-table">
      <tr><th>TITLE</th><th>TYPE</th><th>MY CHARS</th><th>STATUS</th><th>POSTED</th></tr>
      ${docs.map(d=>`<tr>
        <td><span class="dv-link" onclick="openDoc('${d.id}')">${esc(d.title||'Untitled')}</span></td>
        <td>${postTypeTag(d.postType)||'<span style="color:var(--dim)">—</span>'}</td>
        <td style="color:var(--dim);font-size:0.8rem">${(d.myChars||[]).join(', ')||'—'}</td>
        <td><span class="sdot ${d.status||'active'}" style="display:inline-block"></span></td>
        <td style="color:var(--dim);font-size:0.8rem">${d.postedAt||'—'}</td>
      </tr>`).join('')}
    </table>`;
  } else {
    html += `<div style="color:var(--dim);font-size:0.87rem;margin-top:16px">No sims in this scene yet.</div>`;
  }

  html += renderPartnersSection(computeScenePartners(docs), false, 'No character co-occurrences detected in this scene.');

  return html;
}

// ================================================================
// FULL-TEXT SEARCH
// ================================================================
function toggleSearch() {
  searchActive = !searchActive;
  const bar = document.getElementById('search-bar');
  const btn = document.getElementById('sb-search-btn');
  bar.classList.toggle('hidden', !searchActive);
  btn.classList.toggle('on', searchActive);
  if (searchActive) {
    document.getElementById('search-input').focus();
  } else {
    document.getElementById('search-input').value = '';
    renderNav();
  }
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 300);
}

function clearSearch() {
  searchActive = false;
  const bar = document.getElementById('search-bar');
  bar.classList.add('hidden');
  document.getElementById('sb-search-btn').classList.remove('on');
  document.getElementById('search-input').value = '';
  renderNav();
}

function runSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (query.length < 2) { renderNav(); return; }
  const qL = query.toLowerCase();
  const results = [];
  Object.values(S.docs).forEach(d => {
    const title = d.title||'';
    const tmp = document.createElement('div');
    tmp.innerHTML = d.content||'';
    const text = tmp.innerText||tmp.textContent||'';
    const titleMatch = title.toLowerCase().includes(qL);
    const bodyIdx = text.toLowerCase().indexOf(qL);
    if (titleMatch || bodyIdx>=0) {
      const m = d.missionId ? S.missions[d.missionId] : null;
      let snippet = '';
      if (bodyIdx>=0) {
        const s = Math.max(0,bodyIdx-40), e = Math.min(text.length,bodyIdx+query.length+60);
        const raw = (s>0?'…':'')+text.slice(s,e)+(e<text.length?'…':'');
        snippet = hlMatch(raw, query);
      }
      results.push({d, m, titleHl:hlMatch(title||'Untitled',query), snippet});
    }
  });
  const tree = document.getElementById('nav-tree');
  if (!results.length) {
    tree.innerHTML = `<div class="sr-count">No results for "${esc(query)}"</div>`;
    return;
  }
  tree.innerHTML = `<div class="sr-count">${results.length} result${results.length!==1?'s':''}</div>` +
    results.map(({d,m,titleHl,snippet}) =>
      `<div class="nd${d.id===curId?' cur':''}" onclick="openDoc('${d.id}')" title="${esc(d.title||'Untitled')}">
        <span class="sdot ${d.status||'active'}"></span>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.87rem;white-space:normal;overflow:hidden">${titleHl}</div>
          ${m?`<div style="font-size:0.73rem;color:var(--dim)">${esc(m.name)}</div>`:''}
          ${snippet?`<div style="font-size:0.73rem;color:var(--dim);margin-top:2px;line-height:1.4">${snippet}</div>`:''}
        </div>
      </div>`
    ).join('');
}

function hlMatch(text, query) {
  if (!query) return esc(text);
  return esc(text).replace(new RegExp(escRe(esc(query)), 'gi'), '<mark>$&</mark>');
}

// ================================================================
// NAVIGATION RENDER
// ================================================================
// Returns ms timestamp of last "meaningful" activity in a scene: a sim being posted
// (postedAt set) or marked complete (status='complete', using updatedAt as proxy).
// Falls back to scene.createdAt when no qualifying sims exist.
function sceneLastActivityMs(sceneId) {
  const docs = Object.values(S.docs).filter(d => d.sceneId === sceneId);
  let best = 0;
  docs.forEach(d => {
    if (d.postedAt) {
      const t = new Date(d.postedAt).getTime();
      if (!isNaN(t) && t > best) best = t;
    }
    if (d.completedAt && d.completedAt > best) best = d.completedAt;
  });
  return best || (S.scenes[sceneId]?.startedAt) || (S.scenes[sceneId]?.createdAt) || Date.now();
}

// Stale marker (amber ≥2d / red ≥3d since last post/completion) for a scene.
// Returns '' for non-active scenes (a finished scene can't be stale) or fresh ones.
function staleMarker(sceneId, status) {
  if ((status || 'active') !== 'active') return '';
  const daysSince = (Date.now() - sceneLastActivityMs(sceneId)) / 86400000;
  const d = Math.floor(daysSince);
  const tip = `${d} days since last post/completion`;
  const cls = daysSince >= 3 ? 'stale-red' : daysSince >= 2 ? 'stale-amber' : '';
  if (!cls) return '';
  return `<span class="stale-label" style="margin-left:6px;display:inline-flex" title="${tip}"><span style="font-size:0.7rem;opacity:0.6">${d}d</span><span class="stale-dot ${cls}"></span></span>`;
}

// Returns the timestamp of the most recently posted (or updated) sim matching the filter fn
// postedAt takes priority so missions sort chronologically by actual post history
function newestSimDate(filterFn) {
  const docs = Object.values(S.docs).filter(filterFn);
  if (!docs.length) return Date.now(); // brand-new container = treat as newest
  const postTimes = docs.filter(d => d.postedAt)
    .map(d => new Date(d.postedAt).getTime()).filter(t => !isNaN(t) && t > 0);
  if (postTimes.length) return Math.max(...postTimes);
  return Math.max(...docs.map(d => d.updatedAt || d.createdAt || 0));
}
// Returns a sort value for a sim: posted sims by postedAt, active sims float to top by updatedAt
// Active (unposted) sims always appear above posted sims in the list
function simSortKey(d) {
  if (!d.postedAt) {
    // Active/in-progress: float to top; add a large offset so they sort above any posted date
    return 2e15 + (d.updatedAt || d.createdAt || 0);
  }
  const t = new Date(d.postedAt).getTime();
  return isNaN(t) ? (d.updatedAt || 0) : t;
}

function renderNav() {
  if (searchActive) return; // don't clobber active search results
  const tree = document.getElementById('nav-tree');
  const byYear = {};
  Object.values(S.missions).forEach(m => {
    if (!showArchived&&m.status==='archived') return;
    const y=m.year||'Unknown';
    if (!byYear[y]) byYear[y]={};
    byYear[y][m.id]={...m,scenes:{},unsorted:[]};
  });
  Object.values(S.scenes).forEach(sc => {
    if (!showArchived&&sc.status==='archived') return;
    const m=S.missions[sc.missionId]; if (!m) return;
    if (!showArchived&&m.status==='archived') return;
    const y=m.year||'Unknown';
    if (byYear[y]&&byYear[y][sc.missionId])
      byYear[y][sc.missionId].scenes[sc.id]={...sc,docs:[]};
  });
  Object.values(S.docs).forEach(d => {
    if (!showArchived&&d.status==='archived') return;
    const m=S.missions[d.missionId]; if (!m) return;
    if (!showArchived&&m.status==='archived') return;
    const y=m.year||'Unknown';
    if (!byYear[y]||!byYear[y][d.missionId]) return;
    if (d.sceneId&&byYear[y][d.missionId].scenes[d.sceneId])
      byYear[y][d.missionId].scenes[d.sceneId].docs.push(d);
    else byYear[y][d.missionId].unsorted.push(d);
  });

  const years = Object.keys(byYear).sort().reverse();
  if (!years.length) {
    tree.innerHTML='<div style="padding:14px;font-size:0.8rem;color:var(--dim);text-align:center">No missions yet.<br>Click + Mission above.</div>';
    return;
  }

  function docItem(d) {
    const active = d.id===curId?' cur':'';
    const st = d.status||'active';
    const dispTitle = getDisplayTitle(d);
    // Metadata: date + characters
    let metaParts = [];
    if (d.postedAt) {
      const [py,pm,pd] = d.postedAt.split('-');
      metaParts.push(`<span class="nd-posted">${ic('check','ic-sm')} ${py}${pm}.${pd}</span>`);
    } else if (d.updatedAt) metaParts.push(new Date(d.updatedAt).toLocaleDateString());
    const chars = (d.myChars||[]);
    if (chars.length) {
      // Collapse aliases of the same manifest character to primary name
      const seenIds = new Set();
      const dedupedChars = [];
      chars.forEach(n => {
        const ch = findCharByAnyName(n);
        const key = ch ? ch.id : n;
        if (!seenIds.has(key)) { seenIds.add(key); dedupedChars.push(ch ? ch.name : n); }
      });
      const charStr = dedupedChars.slice(0,2).join(', ') + (dedupedChars.length>2?' +'+(dedupedChars.length-2):'');
      metaParts.push(esc(charStr));
    }
    const metaHtml = metaParts.length ? `<div class="nd-meta">${metaParts.join(' · ')}</div>` : '';
    return `<div class="nd nd-s-${st}${active}" onclick="openDoc('${d.id}')" oncontextmenu="ctxDoc(event,'${d.id}')" title="${esc(d.title||'Untitled')}">
      <span class="sdot ${st}"></span>
      <div class="nd-inner">
        <div class="nd-title">${esc(dispTitle)}</div>
        ${metaHtml}
      </div>
      ${postTypeTag(d.postType)}
    </div>`;
  }

  let html='';
  years.forEach(y => {
    const yc=collapsed['y_'+y];
    const yNum = parseInt(y, 10);
    const yDisp = isNaN(yNum) ? y : `${y} <span class="ny-ic">(${yNum + 377} IC)</span>`;
    html+=`<div><div class="ny-hdr" oncontextmenu="ctxYear(event,'${esc(y)}')">
      <span class="caret" onclick="tog('y_${y}')">${ic(yc?'chevron-right':'chevron-down')}</span><span>${yDisp}</span>
    </div>`;
    if (!yc) {
      html+=`<div class="ny-ch">`;
      Object.values(byYear[y]).sort((a,b)=>newestSimDate(d=>d.missionId===b.id)-newestSimDate(d=>d.missionId===a.id)).forEach(m => {
        const mc=collapsed['m_'+m.id]!==undefined?collapsed['m_'+m.id]:(m.status==='archived'||m.status==='complete');
        const isViewedM = curView==='mission'&&curViewId===m.id;
        html+=`<div><div class="nm-hdr" oncontextmenu="ctxMission(event,'${m.id}')">
          <span class="caret" onclick="tog('m_${m.id}')">${ic(mc?'chevron-right':'chevron-down')}</span>
          <span class="sdot ${m.status||'active'}"></span>
          <span class="lbl${isViewedM?' cur':''}" onclick="openMission('${m.id}')" title="${esc(m.name)}">${esc(m.name)}</span>
          ${simTypeTag(m.simType)}
        </div>`;
        if (!mc) {
          html+=`<div class="nm-ch">`;
          const _nss = getPrefs().navSceneSort||'recent-first';
          const _sceneSorted = Object.values(m.scenes).slice().sort((a,b) => {
            if (_nss==='alpha-az')     return a.name.localeCompare(b.name);
            if (_nss==='alpha-za')     return b.name.localeCompare(a.name);
            if (_nss==='stale-first' || _nss==='stale-last') {
              const aC=a.status==='complete', bC=b.status==='complete';
              if (aC!==bC) return aC?1:-1;
              if (aC) return a.name.localeCompare(b.name);
              return _nss==='stale-first'?sceneLastActivityMs(a.id)-sceneLastActivityMs(b.id):sceneLastActivityMs(b.id)-sceneLastActivityMs(a.id);
            }
            if (_nss==='recent-last')  return newestSimDate(doc=>doc.sceneId===a.id)-newestSimDate(doc=>doc.sceneId===b.id);
            if (_nss==='started-first')return (b.startedAt||b.createdAt||0)-(a.startedAt||a.createdAt||0);
            if (_nss==='started-last') return (a.startedAt||a.createdAt||0)-(b.startedAt||b.createdAt||0);
            return newestSimDate(doc=>doc.sceneId===b.id)-newestSimDate(doc=>doc.sceneId===a.id); // 'recent-first'
          });
          _sceneSorted.forEach(sc => {
            const sc2=S.scenes[sc.id]; if (!sc2) return;
            const sc2status=S.scenes[sc.id]&&S.scenes[sc.id].status;
            const scc=collapsed['sc_'+sc.id]!==undefined?collapsed['sc_'+sc.id]:(sc2status==='archived'||sc2status==='complete');
            const isViewedSc = curView==='scene'&&curViewId===sc.id;
            let staleDot = '';
            if ((sc2status||'active')==='active') {
              const daysSince = (Date.now() - sceneLastActivityMs(sc.id)) / 86400000;
              const d = Math.floor(daysSince);
              const tip = `${d} days since last post/completion`;
              if (daysSince >= 3) staleDot = `<span class="stale-label" title="${tip}"><span style="font-size:0.7rem;opacity:0.6">${d}d</span><span class="stale-dot stale-red"></span></span>`;
              else if (daysSince >= 2) staleDot = `<span class="stale-label" title="${tip}"><span style="font-size:0.7rem;opacity:0.6">${d}d</span><span class="stale-dot stale-amber"></span></span>`;
            }
            html+=`<div><div class="ns-hdr ns-s-${sc2status||'active'}" oncontextmenu="ctxScene(event,'${sc.id}')">
              <span class="caret" onclick="tog('sc_${sc.id}')">${ic(scc?'chevron-right':'chevron-down')}</span>
              <span class="sdot ${sc2.status||'active'}"></span>
              <span class="lbl${isViewedSc?' cur':''}" onclick="openScene('${sc.id}')" title="${esc(sc2.name)}">${esc(sc2.name)}</span>
              ${staleDot}
            </div>`;
            if (!scc) html+=`<div class="ns-ch">${sc.docs.slice().sort((a,b)=>simSortKey(b)-simSortKey(a)).map(docItem).join('')}</div>`;
            html+=`</div>`;
          });
          m.unsorted.slice().sort((a,b)=>simSortKey(b)-simSortKey(a)).forEach(d=>{html+=docItem(d);});
          html+=`</div>`;
        }
        html+=`</div>`;
      });
      html+=`</div>`;
    }
    html+=`</div>`;
  });
  tree.innerHTML=html;
}

function tog(k){collapsed[k]=!collapsed[k];renderNav();}

// ================================================================
// SIDEBAR RESIZE + TOGGLE
// ================================================================
function toggleSidebar() {
  S.settings.sidebarOpen = !S.settings.sidebarOpen;
  const sb = document.getElementById('sidebar');
  sb.classList.toggle('collapsed', !S.settings.sidebarOpen);
  document.getElementById('sb-toggle').innerHTML = ic(S.settings.sidebarOpen ? 'chevron-left' : 'chevron-right');
  persist();
}
function toggleSidebarDetail() {
  S.settings.sidebarDetail = !S.settings.sidebarDetail;
  document.getElementById('sidebar').classList.toggle('sidebar-detail', !!S.settings.sidebarDetail);
  document.getElementById('sb-detail-btn').innerHTML = ic('list') + ' Details';
  persist();
}

const SORT_OPTIONS = [
  { val:'recent-first',  label:'Sim Posting (Recent First)' },
  { val:'recent-last',   label:'Sim Posting (Recent Last)' },
  { val:'stale-first',   label:'Due Status (Stalest First)' },
  { val:'stale-last',    label:'Due Status (Freshest First)' },
  { val:'alpha-az',      label:'Alphabetical (A – Z)' },
  { val:'alpha-za',      label:'Alphabetical (Z – A)' },
  { val:'started-first', label:'Scene Start (Recent First)' },
  { val:'started-last',  label:'Scene Start (Recent Last)' },
];
function showSortMenu(e) {
  e.stopPropagation();
  const existing = document.getElementById('sort-menu');
  if (existing) { existing.remove(); return; }
  const cur = getPrefs().navSceneSort || 'recent-first';
  const menu = document.createElement('div');
  menu.id = 'sort-menu';
  SORT_OPTIONS.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'sm-item' + (opt.val === cur ? ' sm-cur' : '');
    item.innerHTML = (opt.val === cur ? ic('check') : '<span style="display:inline-block;width:1.05em"></span>') + ' ' + esc(opt.label);
    item.onclick = ev => {
      ev.stopPropagation();
      S.settings.prefs = Object.assign({}, S.settings.prefs, { navSceneSort: opt.val });
      persist();
      renderNav();
      menu.remove();
    };
    menu.appendChild(item);
  });
  document.body.appendChild(menu);
  const btn = document.getElementById('sb-sort-btn');
  const r = btn.getBoundingClientRect();
  menu.style.top = (r.bottom + 4) + 'px';
  menu.style.left = r.left + 'px';
  document.addEventListener('click', function h() { menu.remove(); document.removeEventListener('click', h); }, { once: true });
}

function toggleCharsPanel() {
  S.settings.charsOpen = !S.settings.charsOpen;
  const cp = document.getElementById('cp');
  cp.classList.toggle('collapsed', !S.settings.charsOpen);
  document.getElementById('cp-toggle').innerHTML = ic(S.settings.charsOpen ? 'chevron-right' : 'chevron-left');
  persist();
}

function startResize(e, side) {
  e.preventDefault();
  const el = document.getElementById(side==='left'?'sidebar':'cp');
  if (el.classList.contains('collapsed')) return;
  _resizing = {side, startX:e.clientX, startW:el.offsetWidth};
  document.getElementById('rh-'+side).classList.add('rh-active');
  document.body.style.cursor='col-resize';
  document.body.style.userSelect='none';
}

document.addEventListener('mousemove', e => {
  if (!_resizing) return;
  const dx = e.clientX - _resizing.startX;
  if (_resizing.side==='left') {
    const w = Math.max(140, Math.min(480, _resizing.startW + dx));
    document.documentElement.style.setProperty('--sidebar-w', w+'px');
  } else {
    const w = Math.max(120, Math.min(380, _resizing.startW - dx));
    document.documentElement.style.setProperty('--chars-w', w+'px');
  }
});

document.addEventListener('mouseup', () => {
  if (!_resizing) return;
  const side = _resizing.side;
  document.getElementById('rh-'+side).classList.remove('rh-active');
  if (side==='left') {
    S.settings.sidebarW = document.getElementById('sidebar').offsetWidth || 270;
  } else {
    S.settings.charsW = document.getElementById('cp').offsetWidth || 190;
  }
  _resizing = null;
  document.body.style.cursor='';
  document.body.style.userSelect='';
  persist();
});

// ================================================================
// CONTEXT MENUS
// ================================================================
function hideCtx(){document.getElementById('ctx').classList.add('hidden');}
function showCtx(e,items,extraHtml){
  e.preventDefault();e.stopPropagation();
  const m=document.getElementById('ctx');
  m.innerHTML=(extraHtml||'')+items.map(it=>
    it==='-'?'<div class="csep"></div>':
    `<div class="ci ${it.cls||''}" onclick="${it.fn||''}">${it.label}</div>`
  ).join('');
  const x=Math.min(e.clientX,window.innerWidth-220);
  m.style.left=x+'px';
  m.style.top=e.clientY+'px';
  m.classList.remove('hidden');
  requestAnimationFrame(()=>{
    const rect=m.getBoundingClientRect();
    if(rect.bottom>window.innerHeight-4){
      m.style.top=Math.max(e.clientY-rect.height,4)+'px';
    }
  });
}

function ctxYear(e,y){
  showCtx(e,[
    {label:'+ New Mission in '+y, fn:`showNewMission('${esc(y)}');hideCtx()`},
    '-',
    {label:`${ic('trash')} Delete Year ${y}…`, cls:'dng', fn:`delYear('${esc(y)}');hideCtx()`},
  ]);
}

function delYear(y) {
  const missions = Object.values(S.missions).filter(m=>(m.year||'Unknown')===y);
  const mIds = new Set(missions.map(m=>m.id));
  const scenes = Object.values(S.scenes).filter(sc=>mIds.has(sc.missionId));
  const docs = Object.values(S.docs).filter(d=>mIds.has(d.missionId));

  const missionList = missions.map(m=>`<li style="color:var(--amber)">• ${esc(m.name)}</li>`).join('');

  // First confirmation — modal with full breakdown
  openModal(`DELETE YEAR ${y}`, `
    <p style="color:var(--dim);font-size:0.87rem;line-height:1.7">
      This will permanently delete <strong style="color:var(--text)">all content</strong> for the year <strong style="color:var(--amber)">${esc(y)}</strong>:
    </p>
    <ul style="font-size:0.87rem;line-height:1.9;list-style:none;padding:6px 0 6px 8px;margin:8px 0;border-left:2px solid var(--border)">
      ${missionList}
    </ul>
    <div style="font-size:0.8rem;color:var(--dim);margin-bottom:4px">${scenes.length} scene(s) · ${docs.length} sim(s) total</div>
    <p style="color:var(--red);font-size:0.8rem;font-weight:bold;margin-top:10px">This cannot be undone. A second confirmation will follow.</p>
  `, () => {
    // Second confirmation — native dialog as the hard gate
    if (!confirm(`FINAL CONFIRMATION\n\nPermanently delete everything in year ${y}?\n(${missions.length} mission(s), ${scenes.length} scene(s), ${docs.length} sim(s))\n\nThis cannot be undone.`)) return false;

    docs.forEach(d => delete S.docs[d.id]);
    scenes.forEach(sc => delete S.scenes[sc.id]);
    missions.forEach(m => delete S.missions[m.id]);

    if ((curId && !S.docs[curId]) || (curViewId && (mIds.has(curViewId) || mIds.has(S.scenes[curViewId]?.missionId)))) {
      curId = null; curView = null; curViewId = null;
      showDashboard();
    }
    persist(); renderNav();
  }, {ok:`Delete Year ${y}`});
}
function ctxMission(e,id){
  const m=S.missions[id]; if (!m) return;
  const st=m.simType;
  showCtx(e,[
    {label:'+ New Scene',fn:`showNewScene('${id}');hideCtx()`},
    {label:'+ New Sim',fn:`showNewDoc(null,'${id}');hideCtx()`},
    '-',
    {label:st==='mission'?ic('check') + ' Mission type':'  Tag: Mission',cls:st==='mission'?'':'dim-item',
      fn:`setSimType('${id}','mission');hideCtx()`},
    {label:st==='shoreleave'?ic('check') + ' Shore Leave':'  Tag: Shore Leave',cls:st==='shoreleave'?'':'dim-item',
      fn:`setSimType('${id}','shoreleave');hideCtx()`},
    {label:st==='academy'?ic('check') + ' Academy':'  Tag: Academy',cls:st==='academy'?'':'dim-item',
      fn:`setSimType('${id}','academy');hideCtx()`},
    {label:(!st)?ic('check') + ' Regular (default)':'  Clear tag',cls:(!st)?'':'dim-item',
      fn:`setSimType('${id}',null);hideCtx()`},
    '-',
    {label:m.status==='complete'?ic('circle') + ' Mark Active':ic('check') + ' Mark Complete',
      fn:`setStatus('mission','${id}','${m.status==='complete'?'active':'complete'}');hideCtx()`},
    {label:m.status==='archived'?ic('undo') + ' Unarchive':ic('archive') + ' Archive',
      fn:`setStatus('mission','${id}','${m.status==='archived'?'active':'archived'}');hideCtx()`},
    '-',
    {label:ic('pencil') + ' Rename',fn:`renameItem('mission','${id}');hideCtx()`},
    '-',
    {label:ic('trash') + ' Delete Mission',cls:'dng',fn:`delMission('${id}');hideCtx()`},
  ]);
}
function ctxScene(e,id){
  const sc=S.scenes[id]; if (!sc) return;
  showCtx(e,[
    {label:'+ New Sim',fn:`showNewDoc('${id}',null);hideCtx()`},
    '-',
    {label:sc.status==='complete'?ic('circle') + ' Mark Active':ic('check') + ' Mark Complete',
      fn:`setStatus('scene','${id}','${sc.status==='complete'?'active':'complete'}');hideCtx()`},
    {label:sc.status==='archived'?ic('undo') + ' Unarchive':ic('archive') + ' Archive',
      fn:`setStatus('scene','${id}','${sc.status==='archived'?'active':'archived'}');hideCtx()`},
    '-',
    {label:ic('pencil') + ' Edit Scene',fn:`editScene('${id}');hideCtx()`},
    '-',
    {label:ic('trash') + ' Delete Scene',cls:'dng',fn:`delScene('${id}');hideCtx()`},
  ]);
}
function ctxDoc(e,id){
  const d=S.docs[id]; if (!d) return;
  const items = [
    {label:d.status==='complete'?ic('circle') + ' Mark Active':ic('check') + ' Mark Complete',
      fn:`setStatus('doc','${id}','${d.status==='complete'?'active':'complete'}');hideCtx()`},
    {label:d.status==='archived'?ic('undo') + ' Unarchive':ic('archive') + ' Archive',
      fn:`setStatus('doc','${id}','${d.status==='archived'?'active':'archived'}');hideCtx()`},
  ];
  // If title has multiple separators, offer display-title chooser
  const title = d.title||'';
  if (countTitleSeps(title) > 1 || d.displayTitle != null) {
    items.push('-');
    const opts = getTitleSplitOptions(title);
    opts.forEach(opt => {
      const label = opt === title ? ic('file-text') + ' Show full title' : `${ic('file-text')} Show: "${esc(opt.length>36?opt.slice(0,33)+'…':opt)}"`;
      const safeOpt = opt.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      items.push({label, fn:`setDocDisplayTitle('${id}','${safeOpt}');hideCtx()`});
    });
  }
  items.push('-');
  items.push({label:ic('move-right') + ' Move to Scene…',fn:`moveDocToScene('${id}');hideCtx()`});
  items.push('-');
  items.push({label:ic('trash') + ' Delete Sim',cls:'dng',fn:`delDoc('${id}');hideCtx()`});
  showCtx(e, items);
}

function moveDocToScene(id) {
  const d = S.docs[id]; if (!d) return;
  let opts = `<option value="">— No scene (unsorted within mission) —</option>`;
  Object.values(S.missions)
    .filter(m => m.status !== 'archived')
    .sort((a,b) => a.name.localeCompare(b.name))
    .forEach(m => {
      const scenes = Object.values(S.scenes)
        .filter(sc => sc.missionId === m.id && sc.status !== 'archived' && sc.id !== d.sceneId)
        .sort((a,b) => a.name.localeCompare(b.name));
      if (!scenes.length) return;
      opts += `<optgroup label="${esc(m.name)} (${m.year})">`;
      scenes.forEach(sc => { opts += `<option value="${sc.id}">${esc(sc.name)}</option>`; });
      opts += `</optgroup>`;
    });
  openModal('MOVE SIM TO SCENE', `
    <div style="font-size:0.8rem;color:var(--dim);margin-bottom:10px">"${esc((d.title||'Untitled').slice(0,60))}"</div>
    <div class="mf"><label class="ml">TARGET SCENE</label><select class="ms" id="m-mv-sc">${opts}</select></div>
  `, () => {
    const sceneId = document.getElementById('m-mv-sc').value || null;
    d.sceneId = sceneId;
    if (sceneId) d.missionId = S.scenes[sceneId].missionId;
    persist(); renderNav();
  });
}

function setDocDisplayTitle(id, val) {
  const d = S.docs[id]; if (!d) return;
  // "Full title" option stores null (auto)
  d.displayTitle = (val === (d.title||'')) ? null : val;
  persist(); renderNav();
}

// ── STATUS WITH CASCADE ──
function setStatus(type,id,status){
  const now=Date.now();
  function stampDoc(d){
    d.status=status;
    if(status==='complete') d.completedAt=now;
    else if(status==='active'||status==='archived') d.completedAt=null;
  }
  if (type==='mission'){
    S.missions[id].status=status;
    Object.values(S.scenes).filter(sc=>sc.missionId===id).forEach(sc=>{
      sc.status=status;
      Object.values(S.docs).filter(d=>d.sceneId===sc.id).forEach(stampDoc);
    });
    Object.values(S.docs).filter(d=>d.missionId===id&&!d.sceneId).forEach(stampDoc);
  } else if (type==='scene'){
    S.scenes[id].status=status;
    Object.values(S.docs).filter(d=>d.sceneId===id).forEach(stampDoc);
  } else {
    stampDoc(S.docs[id]);
  }
  if (type==='doc'&&id===curId) document.getElementById('doc-status').value=status;
  persist(); renderNav(); schedSync(5000);
}

function renameItem(type,id){
  const obj=type==='mission'?S.missions[id]:S.scenes[id]; if(!obj) return;
  openModal('RENAME',`<div class="mf"><label class="ml">NAME</label><input class="mi" id="m-rn" value="${esc(obj.name)}"></div>`,()=>{
    const v=document.getElementById('m-rn').value.trim();
    if(!v) return false;
    obj.name=v; persist(); renderNav();
  });
}
function editScene(id){
  const sc=S.scenes[id]; if(!sc) return;
  const existingDate=sc.startedAt?new Date(sc.startedAt).toISOString().slice(0,10):'';
  openModal('EDIT SCENE',`
    <div class="mf"><label class="ml">SCENE NAME</label><input class="mi" id="sc-en" value="${esc(sc.name)}"></div>
    <div class="mf"><label class="ml">STARTED (optional)</label><input class="mi" id="sc-ed" type="date" value="${existingDate}" placeholder="Leave blank if unknown"></div>
  `,()=>{
    const n=document.getElementById('sc-en').value.trim();
    if(!n){alert('Please enter a scene name.');return false;}
    const dv=document.getElementById('sc-ed').value;
    const ts=dv?new Date(dv+'T00:00:00').getTime():null;
    sc.name=n;
    sc.startedAt=ts||null;
    persist(); renderNav();
    if(curView==='scene'&&curViewId===id) openScene(id);
  });
}
function delMission(id){
  const m = S.missions[id]; if(!m) return;
  const scIds = Object.values(S.scenes).filter(sc=>sc.missionId===id).map(sc=>sc.id);
  const dIds = Object.values(S.docs).filter(d=>d.missionId===id).map(d=>d.id);
  let msg = `Delete mission "${m.name}"? This cannot be undone.`;
  if(scIds.length||dIds.length) msg += `\n\nThis will also permanently delete ${scIds.length} scene(s) and ${dIds.length} sim(s).`;
  if(!confirm(msg)) return;
  dIds.forEach(did=>{ delete S.docs[did]; });
  scIds.forEach(sid=>{ delete S.scenes[sid]; });
  delete S.missions[id];
  if((curId && !S.docs[curId])||(curViewId===id)){
    curId=null; curView=null; curViewId=null;
    showDashboard();
  }
  persist(); renderNav();
}

function delScene(id){
  const sc = S.scenes[id]; if(!sc) return;
  const dIds = Object.values(S.docs).filter(d=>d.sceneId===id).map(d=>d.id);
  let msg = `Delete scene "${sc.name}"? This cannot be undone.`;
  if(dIds.length) msg += `\n\nThis will also permanently delete ${dIds.length} sim(s).`;
  if(!confirm(msg)) return;
  dIds.forEach(did=>{ delete S.docs[did]; });
  delete S.scenes[id];
  if((curId && !S.docs[curId])||(curViewId===id)){
    curId=null; curView=null; curViewId=null;
    showDashboard();
  }
  persist(); renderNav();
}

function delDoc(id){
  if(!confirm('Delete this sim? This cannot be undone.')) return;
  if(curId===id){ curId=null; curView=null; curViewId=null; showDashboard(); }
  delete S.docs[id]; persist(); renderNav();
}

// ================================================================
// MODAL
// ================================================================
function openModal(title, body, cb, opts={}) {
  // Modals no longer carry routes of their own — Settings and the Manifest are
  // real views — so a confirm raised from either leaves the URL where it is.
  document.getElementById('mo-title').textContent = title;
  document.getElementById('mo-body').innerHTML = body;
  document.getElementById('mo').classList.remove('hidden');
  modalCb = cb;
  const ma = document.getElementById('mo-actions');
  let btns = opts.noCancel ? '' : `<button class="btn btn-s" onclick="closeModal()">Cancel</button>`;
  (opts.extra||[]).forEach(b => {
    btns += `<button class="btn ${b.cls||'btn-s'}" onclick="${b.fn}">${b.label}</button>`;
  });
  if (cb) btns += `<button class="btn btn-p" onclick="doModal()">${opts.ok||'OK'}</button>`;
  ma.innerHTML = btns;
  setTimeout(()=>{const f=document.querySelector('#mo-body input,#mo-body select');if(f)f.focus();},60);
  // Style radio groups can appear in the intro modal or Settings — sync their state
  if (body.indexOf('sty-sw') !== -1) setTimeout(updateStyleMenu, 0);
}
function closeModal(){
  document.getElementById('mo').classList.add('hidden');
  modalCb=null;
}
function doModal(){if(modalCb&&modalCb()===false)return;closeModal();}

// ================================================================
// NEW ITEM MODALS
// ================================================================
function showNewMission(preYear){
  const y=preYear||new Date().getFullYear();
  openModal('NEW MISSION',`
    <div class="mf"><label class="ml">MISSION NAME</label><input class="mi" id="m-n" placeholder="e.g. The Artemis Initiative"></div>
    <div class="mf"><label class="ml">OOC YEAR</label><input class="mi" id="m-y" value="${y}" placeholder="e.g. 2026"></div>
    <div class="mf"><label class="ml">MISSION TYPE</label>
      <select class="ms" id="m-st">
        <option value="">Regular (default)</option>
        <option value="mission">Mission</option>
        <option value="shoreleave">Shore Leave</option>
        <option value="academy">Academy</option>
      </select>
    </div>
  `,()=>{
    const n=document.getElementById('m-n').value.trim();
    const yr=document.getElementById('m-y').value.trim()||String(new Date().getFullYear());
    const st=document.getElementById('m-st').value;
    if(!n){alert('Please enter a mission name.');return false;}
    mkMission(n,yr,st||null);
  });
}
function showNewScene(missionId){
  const opts=Object.values(S.missions).map(m=>
    `<option value="${m.id}" ${m.id===missionId?'selected':''}>${esc(m.name)} (${m.year})</option>`
  ).join('');
  if(!opts){openModal('NO MISSIONS','<p style="color:var(--dim);font-size:0.87rem">Create a mission first.</p>',()=>{});return;}
  openModal('NEW SCENE',`
    <div class="mf"><label class="ml">SCENE NAME</label><input class="mi" id="sc-n" placeholder="e.g. First Contact"></div>
    <div class="mf"><label class="ml">MISSION</label><select class="ms" id="sc-m">${opts}</select></div>
    <div class="mf"><label class="ml">STARTED (optional)</label><input class="mi" id="sc-d" type="date" placeholder="Leave blank if unknown"></div>
  `,()=>{
    const n=document.getElementById('sc-n').value.trim();
    const m=document.getElementById('sc-m').value;
    const dv=document.getElementById('sc-d').value;
    if(!n){alert('Please enter a scene name.');return false;}
    const ts=dv?new Date(dv+'T00:00:00').getTime():null;
    mkScene(n,m,ts||null);
  });
}
function _newDocMissionOpts(selectedId) {
  return Object.values(S.missions)
    .filter(m => m.status !== 'archived')
    .sort((a,b) => a.name.localeCompare(b.name))
    .map(m=>`<option value="${m.id}" ${m.id===selectedId?'selected':''}>${esc(m.name)} (${m.year})</option>`)
    .join('') + '<option value="__new_mission__">+ Create new mission…</option>';
}
function _newDocSceneOpts(selectedId, missionId) {
  // Only show scenes belonging to the selected mission (not archived)
  const scenes = missionId
    ? Object.values(S.scenes).filter(sc => sc.missionId === missionId && sc.status !== 'archived')
    : [];
  return '<option value="">— None —</option>' +
    scenes.sort((a,b) => a.name.localeCompare(b.name))
      .map(sc => `<option value="${sc.id}" ${sc.id===selectedId?'selected':''}>${esc(sc.name)}</option>`)
      .join('') + '<option value="__new_scene__">+ Create new scene…</option>';
}
function _onNewDocMissionChange(sel) {
  if (sel.value === '__new_mission__') {
    const name = prompt('Mission name:','');
    if (!name) { sel.value = Object.keys(S.missions).find(id => S.missions[id].status !== 'archived') || ''; }
    else {
      const year = prompt('Year (e.g. 2401):','2401') || '2401';
      mkMission(name.trim(), year.trim());
      const newId = Object.keys(S.missions).slice(-1)[0];
      sel.innerHTML = _newDocMissionOpts(newId);
      sel.value = newId;
    }
  }
  // Always refresh scene list to match selected mission
  const mId = sel.value;
  const scSel = document.getElementById('d-s'); if (!scSel) return;
  scSel.innerHTML = _newDocSceneOpts('', mId);
}
function _onNewDocSceneChange(sel) {
  if (sel.value !== '__new_scene__') return;
  const mId = document.getElementById('d-m')?.value || '';
  const name = prompt('Scene name:','');
  if (!name) { sel.value = ''; return; }
  mkScene(name.trim(), mId || null);
  const newId = Object.keys(S.scenes).slice(-1)[0];
  sel.innerHTML = _newDocSceneOpts(newId, mId);
  sel.value = newId;
}
function showNewDoc(sceneId,missionId,preTagCharId){
  // Infer mission from scene when not supplied (e.g. right-click context menu)
  const defaultMission = missionId || (sceneId && S.scenes[sceneId]?.missionId) || Object.values(S.missions).find(m=>m.status!=='archived')?.id || '';
  const mOpts = _newDocMissionOpts(defaultMission);
  const scOpts = _newDocSceneOpts(sceneId, defaultMission);
  const tmplOpts='<option value="">— Blank sim —</option>'+(S.templates||[]).map(t=>
    `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  openModal('NEW SIM',`
    <div class="mf"><label class="ml">SIM TITLE</label><input class="mi" id="d-t" placeholder="e.g. JP: The Briefing"></div>
    <div class="mf"><label class="ml">MISSION</label><select class="ms" id="d-m" onchange="_onNewDocMissionChange(this)">${mOpts||'<option value="__new_mission__">+ Create new mission…</option>'}</select></div>
    <div class="mf"><label class="ml">SCENE (optional)</label><select class="ms" id="d-s" onchange="_onNewDocSceneChange(this)">${scOpts}</select></div>
    <div class="mf"><label class="ml">POST TYPE</label>
      <select class="ms" id="d-pt">
        <option value="">Regular</option>
        <option value="jp">JP (Joint Post)</option>
        <option value="solo">Solo</option>
      </select>
    </div>
    <div class="mf"><label class="ml">FROM TEMPLATE (optional)</label><select class="ms" id="d-tmpl" onchange="_onTmplChange(this)">${tmplOpts}</select></div>
  `,()=>{
    const t=document.getElementById('d-t').value.trim() || 'Character - Title';
    const m=document.getElementById('d-m').value;
    const sc=document.getElementById('d-s').value;
    const pt=document.getElementById('d-pt').value;
    const tmplId=document.getElementById('d-tmpl').value;
    const tmpl=(S.templates||[]).find(x=>x.id===tmplId);
    if(m==='__new_mission__'||m===''){alert('Please select or create a mission first.');return false;}
    const id=uid();
    const preChar = preTagCharId && S.characters ? S.characters[preTagCharId] : null;
    const initMyChars = preChar ? [preChar.name] : [];
    if (preChar) {
      if (!S.settings.myChars) S.settings.myChars = [];
      if (!S.settings.myChars.includes(preChar.name)) S.settings.myChars.push(preChar.name);
    }
    S.docs[id]={id,title:t,content:tmpl?tmpl.content:'',missionId:m||null,sceneId:(sc&&sc!=='__new_scene__')?sc:null,
      chars:[],myChars:initMyChars,charColors:{},status:'active',postType:pt||null,postedAt:null,
      snapshots:[],createdAt:Date.now(),updatedAt:Date.now()};
    persist(); renderNav(); openDoc(id);
  });
}
function _onTmplChange(sel) {
  const tmpl = (S.templates||[]).find(x=>x.id===sel.value);
  const titleInput = document.getElementById('d-t');
  if (tmpl && tmpl.title && titleInput) titleInput.value = tmpl.title;
}
function onStatusChange(){
  if(!curId) return;
  const doc = S.docs[curId]; if(!doc) return;
  const newStatus = document.getElementById('doc-status').value;
  doc.status = newStatus;
  if (newStatus === 'active' && doc.postedAt) {
    doc.postedAt = null;
    document.getElementById('doc-posted-input').value = '';
    updatePostedMeta(doc);
  }
  persist(); renderNav();
  updateTitleColor(doc);
  updateStatusStyle(doc);
}

// ================================================================
// SETTINGS
// ================================================================
function renderVersionHistory() {
  return VERSIONS.slice().reverse().map(v => {
    const isPending = v.version === 'pending';
    const label = isPending ? `Since v${APP_VERSION} — Unreleased` : `v${v.version} — ${v.date}`;
    return `<div style="margin-bottom:14px">
      <div style="font-size:0.73rem;font-weight:bold;color:${isPending?'var(--amber2)':'var(--text)'};margin-bottom:4px">${label}</div>
      <ul style="margin:0;padding-left:16px;font-size:0.72rem;color:var(--dim);line-height:1.7">
        ${v.changes.map(c=>`<li>${c}</li>`).join('')}
      </ul>
    </div>`;
  }).join('');
}

// Downloads the app itself, not the data: /api/download re-inlines lcars.css and
// lcars.js back into LCARS.html so the offline copy stays a single file. Only
// the hosted site can build it, so opened from a file there is nothing to fetch.
function downloadOfflineCopy() {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') {
    alert('You are already running LCARS from a file on this machine — this copy is the offline copy.');
    return;
  }
  location.href = new URL('/api/download', location.origin).href;
}

// ================================================================
// VIEWS
// ================================================================
// The dashboard/editor workspace, Settings and the Character Manifest are
// sibling views under the one app header. Switching between them swaps which
// is on screen and nothing else — the editor is never torn down, so an open
// sim and its unsaved keystrokes survive a trip to Settings and back.
//
// Every view change goes through showView, which is also what keeps the URL
// honest: it is the one place syncRoute is called from.
const VIEW_IDS = { dash: 'workspace', settings: 'view-settings', manifest: 'view-manifest', admin: 'view-admin' };

function showView(view, fromRoute) {
  if (!VIEW_IDS[view]) view = 'dash';
  if (view === 'settings') renderSettingsView();
  else if (view === 'manifest') prepManifest();
  else if (view === 'admin') renderAdminView();

  // Hiding a view leaves it mounted — the editor and its unsaved keystrokes
  // are still there, untouched, when the dashboard comes back.
  Object.entries(VIEW_IDS).forEach(([v, id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', v !== view);
  });

  _routeView = view;
  updateViewButtons();
  if (!fromRoute) syncRoute(view);
  if (view === 'settings') { const sc = document.getElementById('set-scroll'); if (sc) sc.scrollTop = 0; }
}

// Header buttons double as the view indicator: the manifest button flips to
// "Sim Editor" while the manifest is up, and Settings shows as active.
function updateViewButtons() {
  const mb = document.getElementById('btn-manifest-toggle');
  if (mb) {
    const on = _routeView === 'manifest';
    mb.innerHTML = on ? ic('pencil') + ' Sim Editor' : ic('user') + ' Character Manifest';
    mb.onclick = () => showView(on ? 'dash' : 'manifest');
  }
  const ab = document.getElementById('btn-admin');
  if (ab) {
    const on = _routeView === 'admin';
    ab.classList.toggle('btn-p', on);
    ab.classList.toggle('btn-s', !on);
    ab.onclick = () => showView(on ? 'dash' : 'admin');
  }
  const sb = document.getElementById('btn-settings');
  if (sb) {
    const on = _routeView === 'settings';
    sb.classList.toggle('btn-p', on);
    sb.classList.toggle('btn-s', !on);
    sb.innerHTML = ic('settings') + (on ? ' Close Settings' : ' Settings');
    sb.onclick = () => showView(on ? 'dash' : 'settings');
  }
}

function openSettings(fromRoute) { showView('settings', fromRoute); }
function closeSettings() { if (_routeView === 'settings') showView('dash'); }

// ================================================================
// SETTINGS VIEW
// ================================================================
// Regrouped on the way out of the modal: the things a writer changes often
// (their account, how it looks, how the editor behaves) come first, with the
// rarely-touched data, danger and version blocks below them.
//
// Most controls here act the moment they are clicked. Only the typed
// preference fields need an explicit save, which is what the bar at the foot
// of the page is for.
// The settings page is long enough to need a contents rail. Kept in step with
// the cards by id, so adding a section is one entry here plus the card itself.
const SET_SECTIONS = [
  { id: 'set-sec-account',    icon: 'user',        label: 'Your Account & Data' },
  { id: 'set-sec-appearance', icon: 'palette',     label: 'LCARS Appearance' },
  { id: 'set-sec-editor',     icon: 'pencil',      label: 'LCARS Sim Editor' },
  { id: 'set-sec-templates',  icon: 'hexagon',     label: 'Sim Templates' },
  { id: 'set-sec-about',      icon: 'file-text',   label: 'About LCARS' },
];

function renderSettingsView() {
  const el = document.getElementById('view-settings');
  if (!el) return;
  el.innerHTML = `
    <div id="set-toc">
      <div class="cm-hdr"><span>SETTINGS</span></div>
      <nav id="set-toc-list">
        ${SET_SECTIONS.map(s => `
          <button class="set-toc-link" data-sec="${s.id}" onclick="gotoSettingsSection('${s.id}')">
            ${ic(s.icon)} <span>${s.label}</span>
          </button>`).join('')}
      </nav>
    </div>
    <div id="set-scroll">
      <div class="set-wrap">
        <div class="set-head">
          <button class="btn btn-s" id="set-toc-btn" onclick="toggleSettingsToc()">${ic('list')} Jump to…</button>
          <span class="set-sub">LCARS SB118 Writing Tool &middot; v${APP_VERSION}</span>
        </div>
        ${settingsAccountCard()}
        ${settingsAppearanceCard()}
        ${settingsEditorCard()}
        ${settingsTemplatesCard()}
        ${settingsAboutCard()}
        <div class="set-bar">
          <span class="set-note">Fonts, sizes, colours and the editor toggles above are saved together.</span>
          <button class="btn btn-s" onclick="resetPrefsForm()">Reset to defaults</button>
          <button class="btn btn-p" onclick="saveSettingsPrefs()">Save preferences</button>
        </div>
      </div>
    </div>`;
  // The Delta Prime radio groups render their own selected state.
  setTimeout(updateStyleMenu, 0);
  if (isCloud()) loadWriterProfile();
  const sc = document.getElementById('set-scroll');
  sc.addEventListener('scroll', markSettingsSection, { passive: true });
  // Scrolling under your own steam releases the pin; a smooth scroll started by
  // gotoSettingsSection fires 'scroll' but none of these.
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(ev =>
    sc.addEventListener(ev, () => { _setSecPinned = null; }, { passive: true }));
  _setSecPinned = null;
  // Deferred: this runs while the view is still hidden, so nothing has a box
  // to measure until showView has revealed it.
  requestAnimationFrame(markSettingsSection);
}

// offsetTop is measured against whichever ancestor happens to be positioned,
// and that changes between breakpoints — the mobile rules make #view-settings
// relative. Measure against the scroller itself instead.
function settingsSectionTop(el, sc) {
  return el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
}

// Set when a rail link is used, cleared the moment you scroll yourself. Scroll
// position alone cannot always answer "which section am I looking at": a short
// section near the end of the page is reached at maximum scroll, where the
// section below it is equally on screen. If you asked for a section, that is
// the answer, until you go somewhere else.
let _setSecPinned = null;

function gotoSettingsSection(id) {
  const sec = document.getElementById(id);
  const sc = document.getElementById('set-scroll');
  if (!sec || !sc) return;
  _setSecPinned = id;
  paintSettingsSection(id);
  sc.scrollTo({ top: settingsSectionTop(sec, sc) - 12, behavior: 'smooth' });
  closeSettingsToc();                      // on a phone the rail is covering the page
}

function paintSettingsSection(id) {
  document.querySelectorAll('.set-toc-link').forEach(b =>
    b.classList.toggle('on', b.dataset.sec === id));
}

// Whichever section's top has most recently passed the top of the viewport is
// the one you are reading — except at the very bottom, where the scroller runs
// out before the last section reaches the top and it could never be marked.
function markSettingsSection() {
  const sc = document.getElementById('set-scroll');
  if (!sc || sc.clientHeight === 0) return;   // still hidden; nothing to measure
  if (_setSecPinned) return;                  // you asked for a section; keep it
  let active = SET_SECTIONS[0].id;
  if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) {
    active = SET_SECTIONS[SET_SECTIONS.length - 1].id;
  } else {
    SET_SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el && settingsSectionTop(el, sc) - 80 <= sc.scrollTop) active = s.id;
    });
  }
  paintSettingsSection(active);
}

function toggleSettingsToc() {
  const t = document.getElementById('set-toc');
  if (t) t.classList.toggle('toc-open');
}
function closeSettingsToc() {
  const t = document.getElementById('set-toc');
  if (t) t.classList.remove('toc-open');
}

// A settings action: icon, name, one short line saying what it does.
function setBtn(onclick, icon, label, desc, opts = {}) {
  return `<button class="set-btn${opts.danger?' set-btn-danger':''}${opts.on?' on':''}"${opts.id?` id="${opts.id}"`:''} onclick="${onclick}">
      <span class="set-btn-t">${ic(icon)}${label}</span>
      <span class="set-btn-d"${opts.descId?` id="${opts.descId}"`:''}>${desc}</span>
    </button>`;
}

function settingsAccountCard() {
  return `
    <div class="set-card" id="set-sec-account">
      <div class="msec">YOUR ACCOUNT &amp; DATA</div>
      ${isCloud() ? `
      <div class="set-block">
        <div class="set-writerid">
          <span class="set-writerid-lbl">SIGNED IN AS</span>
          <span class="set-writerid-val" id="acct-who">${esc(getAuth().writerId||'')}</span>
          <span class="set-note" style="margin:0" id="sync-status">${esc(syncStatus.msg||'')}</span>
        </div>
        <div class="set-tiles" style="margin-top:10px">
          ${setBtn('showDisplayName()', 'user', 'Display name', 'Helps friends find you, not for logins.', {id:'acct-dn-tile'})}
          ${setBtn('showChangePin()', 'hexagon', 'Change my PIN', 'Requires your current PIN to change.')}
          ${setBtn('showShareContact()', 'copy', 'Share my contact', 'Copy + paste to connect with other writers.')}
          ${setBtn('saveToCloud()', 'arrow-up', 'Sync data now', 'Push/sync manually (for those who like pushing buttons).')}
          ${setBtn('cloudSignOut()', 'move-right', 'Sign out', 'Signs out in this browser. Nothing is deleted.')}
        </div>
      </div>

      <div class="set-block">
        <div class="ml">LINKED ACCOUNTS</div>
        <div class="set-note">Optional. Link Google or Discord to sign in with one click &mdash; and to get
          back into your account if you ever forget your PIN. Your Writer ID and PIN keep working either way.</div>
        <div class="set-tiles" style="margin-top:6px" id="acct-links">
          <span class="set-note" style="margin:0">Loading&hellip;</span>
        </div>
      </div>
      ` : isFileCopy() ? `
      <div class="set-block">
        <div style="font-size:0.85rem;line-height:1.7">
          This is the <strong>offline copy</strong>, running from a file on this machine. It never touches
          the network, and your sims live in this browser alone &mdash; clearing browser data will erase
          them, so keep taking backups.
        </div>
        <div class="set-note">
          Accounts are only available in LCARS online at
          <a href="${NEW_HOME}" target="_blank" rel="noopener" style="color:var(--amber)">${NEW_HOME.replace(/^https?:\/\//,'').replace(/\/$/,'')}</a>.
          A backup taken here restores straight into it.
        </div>
      </div>
      ` : `
      <div class="set-block">
        <div style="font-size:0.85rem;line-height:1.7">
          You are working <strong>offline on this device only</strong>. Nothing is sent anywhere, and your
          sims live in this browser alone &mdash; clearing browser data will erase them, so keep taking backups.
        </div>
        <div class="set-tiles" style="margin-top:10px">
          ${setBtn('showAuthGate(true)', 'user', 'Set up an account', 'Back up your sims and use them on any device.')}
        </div>
        <div class="set-note"><span id="sync-status"></span></div>
      </div>
      `}

      <div class="set-block">
        <div class="ml">BACKUPS &amp; THE OFFLINE COPY</div>
        <div class="set-tiles" style="margin-top:6px">
          ${setBtn('exportData()', 'download', 'Back up my data', 'Downloads one file holding everything.')}
          ${setBtn('importData()', 'upload', 'Restore from a backup', 'Replaces everything currently in LCARS.')}
          ${setBtn('downloadOfflineCopy()', 'archive', 'Download LCARS', 'One HTML file that runs with no internet.')}
        </div>
      </div>

      <div class="set-block set-danger-block">
        <div class="ml" style="color:var(--red,#c66)">DANGER ZONE</div>
        <div class="set-note">Neither can be undone. Back up first.</div>
        <div class="set-tiles" style="margin-top:6px">
          ${setBtn('confirmEraseData()', 'trash', 'Erase my sims and characters',
            isCloud() ? 'Empties LCARS on all your devices.' : 'Empties LCARS in this browser.', {danger:true})}
          ${isCloud() ? setBtn('confirmDeleteAccount()', 'alert', 'Delete my account',
            `Removes everything after ${DELETION_GRACE_HOURS} hours. Reversible until then.`,
            {danger:true, id:'acct-del-tile', descId:'acct-del-hint'}) : ''}
        </div>
      </div>
    </div>`;
}

function settingsAppearanceCard() {
  const p = getPrefs();
  const theme = S.settings.theme || 'dark';
  const skin = getStyle().skin;
  // The style and theme pickers are choices, so they use the same button as the
  // actions elsewhere on the page with a selected state rather than a row of
  // pill buttons that look like nothing else here.
  const pick = (on, onclick, icon, label, desc) =>
    setBtn(onclick, icon, label, desc, { on });
  return `
    <div class="set-card" id="set-sec-appearance">
      <div class="msec">LCARS APPEARANCE</div>

      <div class="set-block">
        <div class="ml">VISUAL STYLE</div>
        <div class="set-tiles" style="margin-top:6px">
          ${pick(skin==='prime', "setStyleFromSettings('prime',this,event)", 'sparkles',
            `Delta Prime (${STYLE_VERSION})`, 'The current look. Still being tuned.')}
          ${pick(skin==='classic', "setStyleFromSettings('classic',this,event)", 'layout-grid',
            'Classic LCARS (4.21)', 'The original look, kept available.')}
        </div>
        ${skin==='prime' ? `
        <div id="sty-settings" style="margin-top:12px">${styleControlsHtml()}</div>` : `
        <div class="ml" style="margin-top:14px">THEME</div>
        <div class="set-tiles" style="margin-top:6px">
          ${pick(theme==='dark', "setThemeFromSettings('dark')", 'moon', 'Dark', 'Light text on a dark panel.')}
          ${pick(theme==='light', "setThemeFromSettings('light')", 'sun', 'Light', 'Dark text on a light panel.')}
          ${pick(theme==='hc', "setThemeFromSettings('hc')", 'contrast', 'High Contrast', 'Maximum separation, for readability.')}
        </div>`}
      </div>

      <div class="set-block">
        <div class="ml">TEXT SIZE</div>
        <div class="set-grid" style="margin-top:6px">
          <div class="mf" style="margin:0">
            <label class="ml" for="pf-ls">LINE SPACING</label>
            <input class="mi" id="pf-ls" type="number" min="1" max="3" step="0.05" value="${p.lineSpacing}">
          </div>
          <div class="mf" style="margin:0">
            <label class="ml" for="pf-efs">EDITOR FONT (pt)</label>
            <input class="mi" id="pf-efs" type="number" min="8" max="24" step="1" value="${p.editorFontSize}">
          </div>
          <div class="mf" style="margin:0">
            <label class="ml" for="pf-ufs">UI FONT (px)</label>
            <input class="mi" id="pf-ufs" type="number" min="10" max="22" step="1" value="${p.uiFontSize}">
          </div>
        </div>
      </div>

      <div class="set-block">
        <div class="ml">TYPEFACE</div>
        <div class="set-grid" style="margin-top:6px">
          <div class="mf" style="margin:0">
            <label class="ml" for="pf-uifont">UI FONT</label>
            <select class="mi" id="pf-uifont">
              <option value="">Default (system font)</option>
              ${GOOGLE_FONTS.map(f=>`<option value="${f}"${p.uiFont===f?' selected':''}>${f}</option>`).join('')}
            </select>
          </div>
          <div class="mf" style="margin:0">
            <label class="ml" for="pf-editorfont">EDITOR FONT</label>
            <select class="mi" id="pf-editorfont" ${p.editorFontSameAsUI?'disabled':''}>
              <option value="">Default (system font)</option>
              ${GOOGLE_FONTS.map(f=>`<option value="${f}"${(!p.editorFontSameAsUI&&p.editorFont===f)?' selected':''}>${f}</option>`).join('')}
            </select>
          </div>
        </div>
        <label class="set-check" style="margin-top:10px;cursor:pointer">
          <input type="checkbox" id="pf-ef-same" ${p.editorFontSameAsUI?'checked':''}
                 onchange="document.getElementById('pf-editorfont').disabled=this.checked;">
          <span class="set-btn-d">Use the UI font in the editor too.</span>
        </label>
      </div>
    </div>`;
}

function settingsEditorCard() {
  const p = getPrefs();
  const aid = (id, cid, on, colour, title, code, note) => `
    <label class="set-check" style="cursor:pointer">
      <input type="checkbox" id="${id}" ${on?'checked':''}>
      <span style="flex:1;min-width:0">
        <span class="set-btn-t">${title} <code>${code}</code>
          <input class="mi-color-sm" id="${cid}" type="color" value="${colour}"
                 onclick="event.stopPropagation()"></span>
        <span class="set-btn-d" style="display:block;margin-top:2px">${note}</span>
      </span>
    </label>`;
  const toggle = (id, on, title, note) => `
    <label class="set-check" style="cursor:pointer">
      <input type="checkbox" id="${id}" ${on?'checked':''}>
      <span>
        <span class="set-btn-t">${title}</span>
        <span class="set-btn-d" style="display:block;margin-top:2px">${note}</span>
      </span>
    </label>`;
  return `
    <div class="set-card" id="set-sec-editor">
      <div class="msec">LCARS SIM EDITOR</div>

      <div class="set-block">
        <div class="ml">VISUAL AIDS</div>
        <div class="set-note">Colour-highlight special lines while you write. Also on the toolbar.</div>
        <div class="set-checks">
          ${aid('pf-ao','pf-ac',p.actionOn!==false,p.actionAccent,'Action lines','::text::',
                'Stage directions and action beats.')}
          ${aid('pf-co','pf-cc',p.commsOn!==false,p.commsAccent,'Comms lines','=/\\=text=/\\=',
                'Communications and transmissions.')}
          ${aid('pf-to','pf-tc',p.thoughtOn!==false,p.thoughtAccent,'Thought lines','oO text Oo',
                'Italicised too when auto-formatting is on.')}
        </div>
      </div>

      <div class="set-block">
        <div class="ml">AUTO-FORMATTING</div>
        <div class="set-note">Applied as you type, and kept when you copy the sim out.</div>
        <div class="set-checks">
          ${toggle('pf-abn', p.autoBoldNames, 'Bold names',
            'Bolds a character name at the start of a line.')}
          ${toggle('pf-ti', p.thoughtItalic, 'Italicize thoughts',
            'Italicises lines marked with oO\u2026Oo.')}
        </div>
      </div>

      <div class="set-block">
        <div class="ml">MARKER BUTTONS</div>
        <div class="set-note">How the marker buttons are laid out on the editor toolbar.</div>
        <div class="mf" style="margin:6px 0 0;max-width:340px">
          <select class="ms" id="pf-ml" aria-label="Marker button layout">
            <option value="dropdown" ${p.markerLayout!=='buttons'?'selected':''}>Insert \u25be dropdown (compact)</option>
            <option value="buttons"  ${p.markerLayout==='buttons'?'selected':''}>Individual buttons (expanded)</option>
          </select>
        </div>
      </div>
    </div>`;
}

function settingsTemplatesCard() {
  return `
    <div class="set-card" id="set-sec-templates">
      <div class="msec">SIM TEMPLATES</div>
      <div class="set-block" id="set-templates">${settingsTemplatesInner()}</div>
    </div>`;
}

function refreshTemplatesBlock() {
  const el = document.getElementById('set-templates');
  if (el) el.innerHTML = settingsTemplatesInner();
}

function settingsTemplatesInner() {
  const list = S.templates || [];
  return `
    <div class="set-note" style="margin-top:0">Saved sim bodies to start a new sim from, offered in the
      New Sim window. Open one to edit it in the sim editor. To make a new one, use Save as Template in
      Sim Details while a sim is open.</div>
    ${list.length ? `<div class="set-tmpl-list">${list.map(t => settingsTemplateRow(t)).join('')}</div>`
      : `<div class="set-note" style="margin-top:8px">No templates saved yet.</div>`}`;
}

function settingsTemplateRow(t) {
  const tmp = document.createElement('div');
  tmp.innerHTML = t.content || '';
  const words = wc(tmp.innerText || '');
  // The whole row opens the template — Edit is the row's job, not a separate
  // target sitting next to it.
  return `<div class="set-tmpl-row">
      <button class="set-tmpl-open-btn" onclick="openTemplateInEditor('${t.id}')"
              title="Open this template in the sim editor">
        <span class="set-tmpl-info">
          <span class="set-tmpl-name">${esc(t.name)}</span>
          <span class="set-tmpl-meta">${words} word${words===1?'':'s'}${t.title?' \u00b7 ' + esc(t.title):''}</span>
        </span>
        <span class="set-tmpl-edit">${ic('pencil')} Edit</span>
      </button>
      <button class="set-tmpl-del" onclick="deleteTemplateById('${t.id}')"
              title="Delete this template" aria-label="Delete ${esc(t.name)}">${ic('trash')}</button>
    </div>`;
}

function deleteTemplateById(id) {
  const t = (S.templates||[]).find(x => x.id === id);
  if (!t) return;
  if (!confirm(`Delete the template "${t.name}"? This cannot be undone.`)) return;
  // If it is the one open in the editor, leave first so the exit save cannot
  // write it straight back.
  if (curTmplId === id) {
    curTmplId = null;
    document.getElementById('tmpl-banner').classList.add('hidden');
    document.getElementById('doc-title').placeholder = 'Sim Title…';
    closeDoc();
  }
  S.templates = (S.templates||[]).filter(x => x.id !== id);
  persist();
  schedSync();
  refreshTemplatesBlock();
  showToast('Template deleted');
}

// Saving the sim you are writing as a template belongs with the sim, not in
// Settings — Settings manages the ones you already have.
function saveCurrentAsTemplate() {
  if (!curId) return;
  openModal('SAVE AS TEMPLATE', `
    <div class="mf"><label class="ml">TEMPLATE NAME</label>
      <input class="mi" id="t-save-name" placeholder="e.g. JP Opening Scene"></div>
    <div class="set-note">Saves this sim's text as a starting point for future sims. You can edit it later
      in Settings, under Your Account &amp; Data.</div>
  `, () => {
    const name = document.getElementById('t-save-name').value.trim();
    if (!name) { alert('Enter a template name.'); return false; }
    if (!S.templates) S.templates = [];
    S.templates.push({ id: uid(), name, title: S.docs[curId]?.title || '',
      content: document.getElementById('editor').innerHTML, createdAt: Date.now() });
    persist();
    showToast(`Template "${name}" saved`);
  }, { ok: 'Save template' });
}

// ── Account controls ──────────────────────────────────────────────────────
// The recovery email lives on the server, so its button renders saying
// "In case you forget your PIN." and swaps in the address when the row arrives.
let _writerProfile = { display_name: '', deleted_at: null, link_prompt_seen: true };

function loadWriterProfile() {
  // Anchored on the Writer ID line, which is present for every signed-in
  // writer. It used to key off the recovery-email tile, so removing that tile
  // would have silently taken the display name and the deletion countdown with
  // it -- exactly the kind of quiet breakage this codebase specialises in.
  if (!document.getElementById('acct-who')) return;
  loadIdentities();
  fetchWriterProfile().then(pr => {
    _writerProfile = pr;
    paintWriterProfile();
  }).catch(() => {
    const el = document.getElementById('acct-del-hint');
    if (el) el.innerHTML = '<span style="color:var(--red,#c66)">Account details could not be read \u2014 check your connection.</span>';
  });
}

function paintWriterProfile() {
  const del = document.getElementById('acct-del-hint');
  if (del) del.innerHTML = _writerProfile.deleted_at
    ? '<strong style="color:var(--red,#c66)">Scheduled — about ' + esc(deletionRemaining(_writerProfile.deleted_at)) +
      ' left.</strong> Open this to keep your account.'
    : `Removes everything after ${DELETION_GRACE_HOURS} hours. Reversible until then.`;

  // The display name and the Writer ID carry equal weight — one is what people
  // call you, the other is what the fleet calls you.
  const who = document.getElementById('acct-who');
  if (who) {
    const wid = getAuth().writerId || '';
    who.innerHTML = _writerProfile.display_name
      ? esc(_writerProfile.display_name) + '<span class="set-writerid-sep">\u00b7</span>' + esc(wid)
      : esc(wid);
  }
}

// Both fields are one text box against one column, so they share a dialog.
function showWriterField(key, title, label, placeholder, note, saver) {
  openModal(title, `
    <div class="mf"><label class="ml">${label}</label>
      <input class="mi" id="wf-val" type="text" spellcheck="false"
             placeholder="${placeholder}" value="${esc(_writerProfile[key]||'')}"></div>
    <div id="wf-msg" style="font-size:0.76rem;line-height:1.5;min-height:1.1em;color:var(--red,#c66)"></div>
    <div class="set-note">${note}</div>
  `, () => {
    const msg = document.getElementById('wf-msg');
    msg.style.color = 'var(--dim)';
    msg.textContent = 'Saving\u2026';
    saver(document.getElementById('wf-val').value)
      .then(v => {
        _writerProfile[key] = v;
        paintWriterProfile();
        closeModal();
        showToast(v ? title + ' saved' : title + ' removed');
      })
      .catch(e => { msg.style.color = 'var(--red,#c66)'; msg.textContent = e.message; });
    return false;                          // closes on success, not on click
  }, { ok: 'Save' });
}

function showDisplayName() {
  showWriterField('display_name', 'Display name', 'DISPLAY NAME', 'e.g. Jean Luc Picard',
    'A friendlier name than your Writer ID. Leave it empty to remove it.', saveDisplayName);
}

// Handing your Writer ID to another writer is a real errand \u2014 joint posts and
// invitations start with it. A small chit to copy, rather than making people
// hunt for it in a settings field.
function contactText() {
  const wid = getAuth().writerId || '';
  const dn = _writerProfile.display_name;
  return dn ? `Write with ${dn} on LCARS. Writer ID ${wid}.`
            : `Write with me on LCARS. Writer ID ${wid}.`;
}

function showShareContact() {
  const wid = getAuth().writerId || '';
  const dn = _writerProfile.display_name;
  openModal('SHARE MY CONTACT', `
    <div class="contact-card">
      <div class="contact-card-bar">LCARS WRITING SYSTEM</div>
      <div class="contact-card-body">
        <div class="contact-card-line">Write with ${dn ? `<strong>${esc(dn)}</strong>` : '<strong>me</strong>'} on LCARS.</div>
        <div class="contact-card-lbl">WRITER ID</div>
        <div class="contact-card-id">${esc(wid)}</div>
      </div>
    </div>
    <div class="set-note" style="margin-top:12px">Give this to another writer so they can find you \u2014
      for a joint post, or to be added to a scene.</div>
  `, () => {
    navigator.clipboard.writeText(contactText())
      .then(() => showToast('Contact copied'))
      .catch(() => showToast('Copy failed \u2014 check clipboard permissions.'));
    return false;                          // stays open so it can be copied again
  }, { ok: ic('copy') + ' Copy' });
}

function showChangePin() {
  openModal('CHANGE YOUR PIN', `
    <div class="mf"><label class="ml">CURRENT PIN</label>
      <input class="mi" id="pin-old" type="password" autocomplete="current-password"></div>
    <div class="mf"><label class="ml">NEW PIN <span style="font-weight:normal;opacity:0.6">(at least 6 characters)</span></label>
      <input class="mi" id="pin-new" type="password" autocomplete="new-password"></div>
    <div class="mf"><label class="ml">NEW PIN AGAIN</label>
      <input class="mi" id="pin-new2" type="password" autocomplete="new-password"></div>
    <div id="pin-msg" style="font-size:0.76rem;line-height:1.5;min-height:1.1em;color:var(--red,#c66)"></div>
    <div class="set-note">Your sims are not affected. You stay signed in on this device; other devices
      will ask for the new PIN next time they sign in.</div>
  `, () => {
    const msg = document.getElementById('pin-msg');
    const oldP = document.getElementById('pin-old').value;
    const newP = document.getElementById('pin-new').value;
    const new2 = document.getElementById('pin-new2').value;
    if (newP !== new2) { msg.textContent = 'The two new PINs do not match.'; return false; }
    msg.style.color = 'var(--dim)';
    msg.textContent = 'Changing…';
    changePin(oldP, newP)
      .then(() => { closeModal(); showToast('PIN changed'); })
      .catch(e => { msg.style.color = 'var(--red,#c66)'; msg.textContent = e.message; });
    return false;                          // the modal closes on success, not on click
  }, { ok: 'Change PIN' });
}

function settingsAboutCard() {
  return `
    <div class="set-card" id="set-sec-about">
      <div class="msec">ABOUT LCARS</div>

      <div class="set-block">
        <div class="set-writerid">
          <span class="set-writerid-lbl">VERSION</span>
          <span class="set-writerid-val">v${APP_VERSION}</span>
          <button class="btn btn-s btn-sm" onclick="document.getElementById('ver-hist').classList.toggle('hidden')">
            ${ic('chevron-down')} Changelog</button>
        </div>
        <div id="ver-hist" class="hidden set-changelog">${renderVersionHistory()}</div>
        <div class="set-tiles" style="margin-top:12px">
          ${setBtn('showWizard()', 'sparkles', 'Getting Started', 'The quick tour of how LCARS works.')}
          ${setBtn("window.open('LCARS-Guide-v2.html','_blank')", 'book-open', 'Full user guide', 'Every part of the tool, in detail.')}
          ${setBtn('showBuiltWith()', 'circle-dot', 'Built with Claude Code', 'How this tool was made, and what it does not do.')}
        </div>
      </div>
    </div>`;
}

function showBuiltWith() {
  openModal('BUILT WITH CLAUDE CODE', `
    <div class="set-ai-logo" style="margin-bottom:10px">${AI_LOGO_SVG}<strong>Built with Claude Code AI</strong></div>
    <div style="font-size:0.85rem;line-height:1.7">
      LCARS was written with the help of Claude Code, an AI coding tool.
    </div>
    <div style="font-size:0.85rem;line-height:1.7;margin-top:10px">
      The tool itself uses <strong>no AI to run</strong>, and your writing is never sent to or touched by
      any AI. Your sims live in this browser${isCloud() ? ' and in your own account' : ''}, and nothing
      else reads them.
    </div>
    <div class="set-note" style="margin-top:10px">Fonts load from Google Fonts the first time, and an
      account needs a connection. Writing itself needs neither.</div>
  `, () => {}, { ok: 'Close', noCancel: true });
}

// Reads the preference fields out of the settings view and commits them.
function saveSettingsPrefs() {
  const g = id => document.getElementById(id);
  if (!g('pf-ls')) return;
  const ls = parseFloat(g('pf-ls').value);
  const efs = parseInt(g('pf-efs').value);
  const ufs = parseInt(g('pf-ufs').value);
  if (isNaN(ls)||isNaN(efs)||isNaN(ufs)) { alert('Please enter valid numbers for the sizes.'); return; }
  const efSame = g('pf-ef-same').checked;
  // Merge, so toggles set outside this page (boldLocations, italicOOC, etc.) survive
  S.settings.prefs = Object.assign({}, S.settings.prefs, {
    lineSpacing: ls, editorFontSize: efs, uiFontSize: ufs,
    uiFont: g('pf-uifont').value.trim(),
    editorFont: efSame ? '' : g('pf-editorfont').value.trim(),
    editorFontSameAsUI: efSame,
    actionAccent: g('pf-ac').value, commsAccent: g('pf-cc').value, thoughtAccent: g('pf-tc').value,
    actionOn: g('pf-ao').checked, commsOn: g('pf-co').checked, thoughtOn: g('pf-to').checked,
    autoBoldNames: g('pf-abn').checked, thoughtItalic: g('pf-ti').checked,
    markerLayout: g('pf-ml').value
  });
  applyPrefs();
  persist();
  if (curId) transformNow();
  showToast('Preferences saved');
}

// ================================================================
// ARCHIVE TOGGLE
// ================================================================
function toggleShowArchived(){
  showArchived=!showArchived;
  const btn=document.getElementById('btn-archive-toggle');
  btn.classList.toggle('btn-p',showArchived);
  btn.classList.toggle('btn-s',!showArchived);
  renderNav();
}

// ================================================================
// KEYBOARD SHORTCUTS
// ================================================================
document.addEventListener('keydown',e=>{
  const inEditor=e.target.id==='editor';
  if(e.key==='Escape'){
    closeModal();hideCtx();
    closeManifest();
    return;
  }
  if(e.key==='Enter'&&!document.getElementById('mo').classList.contains('hidden')){
    if(!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){doModal();e.preventDefault();}
    return;
  }
  // Ctrl/Cmd+S — save a snapshot + sync (works whenever a sim is open, not just editor focus)
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&(e.key==='s'||e.key==='S')){
    if(curId||curTmplId){e.preventDefault();manualSaveAndSync();}
    return;
  }
  if(!inEditor) return;
  // Tab = indent / Shift+Tab = outdent. Allowed in Academy sims like the buttons
  // are -- indenting is structure, not formatting.
  const acad = curId && isAcademyDoc(S.docs[curId]);
  if(e.key==='Tab'){
    e.preventDefault();
    if(e.shiftKey) doOutdent(); else doIndent();
    return;
  }
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='8'||e.key==='*')){
    e.preventDefault(); toggleBullets(); return;
  }
  if(e.ctrlKey&&!e.shiftKey){
    if(e.key==='b'){e.preventDefault();if(!acad)ec('bold');}
    if(e.key==='i'){e.preventDefault();if(!acad)ec('italic');}
    if(e.key==='k'){e.preventDefault();doLink();}
    // Intercept Ctrl+Z when there are pending indent undo entries
    if(e.key==='z'&&_indentUndo.length){
      const entry = _indentUndo.pop();
      // Verify each block is still in the editor before applying
      const ed = document.getElementById('editor');
      const live = (entry.items || []).filter(it => it.el && ed.contains(it.el));
      if(live.length){
        e.preventDefault();
        live.forEach(it => setIndentLevel(it.el, it.fromLevel));
        schedSave();
      }
    }
  }
});

// ================================================================
// CHARACTER MANIFEST
// ================================================================
const TYPE_ORDER = {'Primary':0,'Secondary':1,'PNPC':2,'MSPNPC':3,'NPC':4,'':5};
const TYPE_CSS   = {'Primary':'cmt-primary','Secondary':'cmt-secondary','PNPC':'cmt-pnpc','MSPNPC':'cmt-mspnpc','NPC':'cmt-npc'};

const DIVISION_COLORS = {
  'Command':'#cc2233','Operations':'#ffaa00','Security/Tactical':'#ffaa00',
  'Science':'#3366cc','Medical':'#3366cc','Diplomat':'#8844bb',
  'Marines':'#3cb521','Other':'#667788'
};

const RIBBON_CATALOG = {
  'General': [
    {name:'Purple Heart',img:'Awards ServiceRibbons PurpleHeart 2011.jpg'},
    {name:'Prisoner of War Ribbon',img:'Awards ServiceRibbons POW 2011.jpg'},
    {name:"Captain's Commendation",img:'Awards ServiceRibbons Commendation.jpg'},
    {name:"Explorer's Ribbon",img:'Awards ServiceRibbons Explorers 2011.jpg'},
    {name:'Scientific Discovery Ribbon',img:'Scientific Discovery Ribbon.png'},
    {name:'Medical Science Ribbon',img:'Awards ServiceRibbons medicalscience 2013.jpg'},
    {name:'Diplomacy Ribbon',img:'Awards ServiceRibbons diplomacyribbon 2014.jpg'},
    {name:'Innovation Ribbon',img:'Awards ServiceRibbons Innovationribbon 2014.jpg'},
    {name:'Leadership Excellence Ribbon',img:'Leadership Excellence Ribbon.png'},
    {name:'Defense of Temporal Flow Ribbon',img:'Awards ServiceRibbons TemporalFlow 2011.jpg'},
    {name:'Joint Meritorious Unit Award',img:'Awards ServiceRibbons JointMeritoriousUnit 2011.jpg'},
    {name:'First Contact Ribbon',img:'Awards ServiceRibbons FirstContact 2011.jpg'},
    {name:'Extended Service Ribbon',img:'Awards ServiceRibbons ExtendedService 2011.jpg'},
    {name:'Peacekeeper Service Ribbon',img:'Awards ServiceRibbons Peacekeeper 2011.jpg'},
    {name:'Intelligence Star',img:'Intelligence Star.png'},
    {name:'Recovery Ribbon',img:'Ribbon-Recovery Ribbon.png'},
    {name:'Unity Ribbon',img:'Unity Ribbon.png'},
    {name:'Starfleet Investigation Ribbon',img:'Starfleet Investigation Ribbon.png'},
    {name:'Superior Support Ribbon',img:'Superior Support Ribbon.png'},
    {name:'Excellence In Adaptability Ribbon',img:'Excellence In Adaptability Ribbon.png'},
    {name:'Spliced Mainbrace Distinction',img:'Spliced Mainbrace Distinction.png'},
    {name:'Wilderness Deployment Ribbon',img:'Wilderness Deployment Ribbon.png'},
    {name:'Caretaker of the Prime Directive Ribbon',img:'Caretaker of the Prime Directive Ribbon.png'},
    {name:'Cultural Harmony Ribbon',img:'Cultural Harmony Ribbon.png'},
  ],
  'Service Milestones': [
    {name:'Starfleet Academy Graduate Ribbon',img:'Awards ServiceRibbons Graduate.jpg'},
    {name:'Maiden Voyage Ribbon',img:'Maiden Voyage Ribbon.png'},
    {name:'Legacy Ribbon',img:'Legacy Ribbon.png'},
    {name:'Department Chief Ribbon',img:'Awards ServiceRibbons DepartmentChief.jpg'},
    {name:'First Officer Ribbon',img:'First Officer Ribbon.png'},
    {name:'Starship Commander Ribbon',img:'Awards ServiceRibbons Starship Commander.jpg'},
  ],
  'Gallantry & Heroism': [
    {name:'Federation Cross',img:'Awards ServiceRibbons FederationCross 2011.jpg'},
    {name:'Starfleet Medal of Valour',img:'Starfleet Medal of Valour.png'},
    {name:'Distinguished Service Ribbon',img:'Awards ServiceRibbons DistinguishedService 2011.jpg'},
    {name:'Starfleet Medal of Commendation',img:'Starfleet Medal of Commendation.png'},
    {name:'Silver Star',img:'Awards ServiceRibbons SilverStar 2011.jpg'},
    {name:'Good Conduct Ribbon',img:'Awards ServiceRibbons GoodConduct 2011.jpg'},
    {name:'Legion of Merit',img:'Awards ServiceRibbons LegionOfMerit 2011.jpg'},
    {name:'UFP Medal of Freedom',img:'Awards ServiceRibbons MedalOfFreedom 2011.jpg'},
  ],
  'Lifesaving': [
    {name:'Gold Lifesaving Ribbon',img:'Awards ServiceRibbons LifesavingGold 2011.jpg'},
    {name:'Silver Lifesaving Ribbon',img:'Awards ServiceRibbons LifesavingSilver 2011.jpg'},
    {name:'Lifesaving Ribbon',img:'Awards ServiceRibbons LifesavingBasic 2011.jpg'},
    {name:'Trauma Support Advocate',img:'Ribbon-Trauma Support Advocate.png'},
  ],
  'Campaign': [
    {name:'Quantum Reality Service Ribbon',img:'Quantum Reality Service Ribbon.png'},
    {name:'Galactic War with the Borg Service Medal',img:'Awards ServiceRibbons WarWithBorg 2011.jpg'},
    {name:'Changeling Campaign Ribbon',img:'Changeling Campaign Ribbon.png'},
    {name:'Frontier Day Ribbon',img:'Frontier Day Ribbon.png'},
    {name:'Ithassa Region Campaign Medal',img:'Awards ServiceRibbons Ithassa 2011.jpg'},
    {name:'Romulan Campaign Medal',img:'Awards ServiceRibbons RomulanCampaign 2011.jpg'},
    {name:'Tholian Campaign Ribbon',img:'Tholian Campaign Ribbon.png'},
    {name:'Gorn Campaign Ribbon',img:'Awards ServiceRibbons GornCampaign 2011.jpg'},
    {name:'Maquis Reborn Service Medal',img:'Awards ServiceRibbons Maquis Reborn.jpg'},
    {name:'Orion Syndicate Service Medal',img:'Orion Syndicate Service Medal.png'},
    {name:'Operation Safe Harbor Service Medal',img:'Operation Safe Harbor Service Medal.png'},
    {name:"Par'tha Expanse Colonization Ribbon",img:"Par'tha Expanse Colonization Ribbon.png"},
    {name:'Defense of The Isles',img:'Defense of The Isles.png'},
    {name:'Vaadwaur Invasion Campaign Ribbon',img:'Awards-ServiceRibbon-VaadwaurInvasion.jpg'},
    {name:'Hobus Heroism Ribbon',img:'Awards ServiceRibbons HobusHeroism 2011.jpg'},
    {name:'Klingon Invasion Ribbon',img:'KlingonInvasion.jpg'},
    {name:'Prometheus Ribbon',img:'Awards ServiceRibbons Prometheus Incident 2014.jpg'},
    {name:'War of Shadows Ribbon',img:'Awards ServiceRibbons War of Shadows 2016.png'},
    {name:'Warp XV Drive Pioneer',img:'Warp XV Drive Pioneer.png'},
    {name:'Denali Invitational Ribbon',img:'Denali Invitational Ribbon.png'},
    {name:'Gorn Invasion Ribbon',img:'GornInvasion.jpg'},
    {name:'Grendellai Operations Ribbon',img:'GrendellaiRibbon.jpg'},
    {name:'Bajoran Campaign Ribbon',img:'Awards ServiceRibbons battleforbajor 2011.jpg'},
    {name:'Gateway Ribbon',img:'Gateway.jpg'},
    {name:'Project Capstone Ribbon',img:'Project Capstone Ribbon.png'},
  ],
};
const RIBBON_IMG_BASE = 'https://wiki.starbase118.net/wiki/Special:FilePath/';
const SR_RANKS = [
  '','Cadet, 4th Class','Cadet, 3rd Class','Cadet, 2nd Class','Cadet, 1st Class',
  'Crewman','Petty Officer','Chief Petty Officer',
  'Ensign','Lieutenant JG','Lieutenant','Lt. Commander',
  'Commander','Captain','Fleet Captain','Commodore',
  'Rear Admiral','Vice Admiral','Admiral','Fleet Admiral','Civilian'
];
const SR_DIVISIONS = ['Black','Blue','Gold','Green','Red','Silver','Teal'];
const SR_RANK_CODE = {
  'Cadet, 4th Class':'cadet1','Cadet, 3rd Class':'cadet2',
  'Cadet, 2nd Class':'cadet3','Cadet, 1st Class':'cadet4',
  'Crewman':'crew1','Petty Officer':'po1','Chief Petty Officer':'cpo',
  'Ensign':'ens','Lieutenant JG':'ltjg','Lieutenant':'lt',
  'Lt. Commander':'ltcmdr','Commander':'cmdr','Captain':'cpt',
  'Fleet Captain':'fcpt','Commodore':'cdore',
  'Rear Admiral':'radm','Vice Admiral':'vadm',
  'Admiral':'adm','Fleet Admiral':'fadm',
};
function srRankImgFile(rank, division) {
  const code = SR_RANK_CODE[rank];
  if (!code) return '';
  return `PICstyle-${code}_${(division || 'Red').toLowerCase()}.png`;
}
const SR_INSIGNIA_MAP = {
  'Cadet, 4th Class':'Cadet Fourth Class','Cadet, 3rd Class':'Cadet Third Class',
  'Cadet, 2nd Class':'Cadet Second Class','Cadet, 1st Class':'Cadet First Class',
  'Lt. Commander':'Lieutenant Commander','Fleet Admiral':'Fleet Admiral',
};
function srInsigniaName(rank) { return SR_INSIGNIA_MAP[rank] || rank; }

const RANK_PIPS = {
  'Civilian':[],'Cadet':[],
  'Crewman':[],'Petty Officer':[],'Chief Petty Officer':[],
  'Ensign':[{t:'full'}],
  'Lieutenant JG':[{t:'hollow'},{t:'full'}],
  'Lieutenant':[{t:'full'},{t:'full'}],
  'Lt. Commander':[{t:'hollow'},{t:'full'},{t:'full'}],
  'Commander':[{t:'full'},{t:'full'},{t:'full'}],
  'Captain':[{t:'full'},{t:'full'},{t:'full'},{t:'full'}],
  'Fleet Captain':[{t:'full'},{t:'full'},{t:'full'},{t:'full'}],
  'Commodore':[{t:'full'},{t:'full'},{t:'full'},{t:'full'}],
  'Admiral':[{t:'full'},{t:'full'},{t:'full'},{t:'full'}],
  'Fleet Admiral':[{t:'full'},{t:'full'},{t:'full'},{t:'full'}],
};

function renderPips(rank) {
  const pips = RANK_PIPS[rank];
  if (!pips || !pips.length) return '';
  const useBox = rank==='Admiral'||rank==='Fleet Admiral';
  const inner = pips.map(p=>`<span class="pip ${p.t}"></span>`).join('');
  return useBox
    ? `<span class="pip-box">${inner}</span>`
    : `<span class="pip-row">${inner}</span>`;
}

function getDivColor(c) {
  if (c.divisionColor) return c.divisionColor;
  return DIVISION_COLORS[c.division]||'#667788';
}

function getCharInitials(name) {
  return (name||'').split(/\s+/).map(w=>w[0]||'').slice(0,2).join('').toUpperCase();
}

// Everything the manifest needs before it is shown. Called by showView, which
// owns the actual display and the URL.
function prepManifest() {
  flushSave(); // prune stale myChars before auto-seeding manifest
  if (!S.characters) S.characters = {};
  // Auto-seed from myChars (checks primary name + aliases)
  (S.settings.myChars||[]).forEach(name => {
    if (!findCharByAnyName(name)) {
      const id = uid();
      S.characters[id] = {id, name, aliases:[], charType:'', rank:'', division:'', divisionColor:'',
        species:'', pictureDataUrl:null, wikiUrl:'', notes:'', addedAt:Date.now(), updatedAt:Date.now()};
    }
  });
  persist();
  _manifestActiveTab = 'sims';
  _srEditMode = false;
  _ribbonEditMode = false;
  renderManifestList();
  // Auto-open the alphabetically first Primary character
  const firstPrimary = Object.values(S.characters)
    .filter(c => c.charType === 'Primary')
    .sort((a, b) => a.name.localeCompare(b.name))[0];
  if (firstPrimary) selectCharacter(firstPrimary.id);
  setManifestList(false);
  updateManifestBar();
}

function openManifest(fromRoute) { showView('manifest', fromRoute); }
function closeManifest() { if (_routeView === 'manifest') showView('dash'); }

function openManifestToChar(charId) {
  openManifest();
  if (S.characters && S.characters[charId]) {
    _curCharId = charId;
    _manifestActiveTab = 'sims';
    _srEditMode = false;
    _ribbonEditMode = false;
    renderManifestList();  // re-render to show active state
    renderCharProfile(charId);
  }
}

function refreshManifest() {
  renderManifestList();
  if (_curCharId) renderCharProfile(_curCharId);
}

// ── Helpers ──

function getAllNamesForChar(c) {
  return [c.name, ...(c.aliases||[])].filter(Boolean);
}

function findCharByAnyName(name) {
  const nl = name.toLowerCase();
  return Object.values(S.characters||{}).find(c =>
    getAllNamesForChar(c).some(n => n.toLowerCase()===nl)
  );
}

function charDocsForChar(c) {
  const names = getAllNamesForChar(c).map(n=>n.toLowerCase());
  return Object.values(S.docs).filter(d =>
    (d.myChars||[]).some(n => names.includes(n.toLowerCase()))
  );
}

function charSimCount(c) {
  if (typeof c === 'string') return Object.values(S.docs).filter(d=>(d.myChars||[]).includes(c)).length;
  return charDocsForChar(c).length;
}

// ── List ──

function addNewCharacter() {
  openModal('NEW CHARACTER',`
    <div class="mf"><label class="ml">CHARACTER NAME</label><input class="mi" id="cm-new-name" placeholder="e.g. Skyfire Cade"></div>
    <div class="mf"><label class="ml">TYPE</label>
      <select class="mi" id="cm-new-type">
        <option value="">— Select type —</option>
        <option value="Primary">Primary</option>
        <option value="Secondary">Secondary</option>
        <option value="PNPC">PNPC (Personal NPC)</option>
        <option value="MSPNPC">MSPNPC (Mission-specific PNPC)</option>
        <option value="NPC">NPC</option>
      </select>
    </div>
  `,()=>{
    const name = document.getElementById('cm-new-name').value.trim();
    if (!name) { alert('Please enter a name.'); return false; }
    if (!S.characters) S.characters = {};
    const id = uid();
    const charType = document.getElementById('cm-new-type').value;
    S.characters[id] = {id, name, aliases:[], charType, rank:'', division:'', divisionColor:'',
      species:'', pictureDataUrl:null, wikiUrl:'', notes:'', addedAt:Date.now(), updatedAt:Date.now()};
    persist();
    renderManifestList();
    selectCharacter(id);
  });
}

function setTypeFilter(type) {
  _manifestTypeFilter = type;
  document.querySelectorAll('#cm-type-chips .cmtc').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.type === type);
  });
  renderManifestList();
}

function setManifestSort(s) {
  _manifestSort = s;
  renderManifestList();
}

function detectAliasCollisions() {
  const nameMap = {};
  Object.values(S.characters || {}).forEach(c => {
    getAllNamesForChar(c).forEach(n => {
      const key = n.toLowerCase();
      if (!nameMap[key]) nameMap[key] = [];
      if (!nameMap[key].includes(c.id)) nameMap[key].push(c.id);
    });
  });
  const result = {};
  Object.entries(nameMap).forEach(([name, ids]) => {
    if (ids.length > 1) {
      ids.forEach(id => {
        if (!result[id]) result[id] = [];
        result[id].push({ name, clashWith: ids.filter(i => i !== id) });
      });
    }
  });
  return result;
}

function renderManifestList() {
  if (!S.characters) S.characters = {};
  const filterEl = document.getElementById('cm-filter-input');
  const fl = filterEl ? filterEl.value.toLowerCase() : '';
  let chars = Object.values(S.characters);
  if (_manifestTypeFilter) chars = chars.filter(c=>(c.charType||'')===_manifestTypeFilter);
  if (fl) chars = chars.filter(c=>getAllNamesForChar(c).some(n=>n.toLowerCase().includes(fl)));
  if (_manifestSort==='sims') {
    chars.sort((a,b)=>charSimCount(b)-charSimCount(a)||a.name.localeCompare(b.name));
  } else if (_manifestSort==='recent') {
    const lastDate = c => {
      const docs = charDocsForChar(c);
      if (!docs.length) return 0;
      return Math.max(...docs.map(d => d.postedAt ? new Date(d.postedAt).getTime() : (d.updatedAt||0)));
    };
    chars.sort((a,b)=>lastDate(b)-lastDate(a)||a.name.localeCompare(b.name));
  } else if (_manifestSort==='name') {
    chars.sort((a,b)=>a.name.localeCompare(b.name));
  } else {
    chars.sort((a,b)=>(TYPE_ORDER[a.charType||'']??5)-(TYPE_ORDER[b.charType||'']??5)||a.name.localeCompare(b.name));
  }
  const collisions = detectAliasCollisions();
  const list = document.getElementById('cm-char-list');
  if (!chars.length) {
    list.innerHTML = `<div style="padding:12px;font-size:0.8rem;color:var(--dim);text-align:center">${fl||_manifestTypeFilter?'No matching characters.':'No characters yet.<br>Click + Add to create one.'}</div>`;
    return;
  }
  list.innerHTML = chars.map(c => {
    const active = c.id===_curCharId ? ' active' : '';
    const clr = getDivColor(c);
    const initials = getCharInitials(c.name);
    const avatarContent = c.pictureDataUrl
      ? `<img src="${c.pictureDataUrl}" alt="${esc(c.name)}">`
      : initials;
    const avatarBg = c.pictureDataUrl ? '' : `background:${clr}`;
    const pips = renderPips(c.rank);
    const typeCss = TYPE_CSS[c.charType||''] || '';
    const typeBadge = c.charType ? `<span class="cm-type-tag ${typeCss}">${esc(c.charType)}</span>` : '';
    const simCnt = charSimCount(c);
    const hasCollision = !!collisions[c.id];
    return `<div class="cm-char-item${active}" onclick="selectCharacter('${c.id}')">
      <div class="cm-avatar" style="${avatarBg}">${avatarContent}</div>
      <div class="cm-char-info">
        <div class="cm-char-name">${esc(c.name)}${hasCollision?` <span class="cm-alias-warn" title="Alias collision detected — click to view">${ic('alert','ic-sm')}</span>`:''}</div>
        <div class="cm-char-sub">
          ${c.division?`<span class="cm-div-dot" style="background:${clr}"></span>`:''}
          <span>${esc(c.rank||'')}</span>
          ${pips?`<span style="color:${clr}">${pips}</span>`:''}
          ${typeBadge}
          ${simCnt?`<span style="margin-left:auto;color:var(--dim);font-size:0.67rem">${simCnt} sim${simCnt!==1?'s':''}</span>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function selectCharacter(id) {
  _curCharId = id;
  if (_manifestActiveTab === 'edit') _manifestActiveTab = 'sims';
  _srEditMode = false;
  _ribbonEditMode = false;
  renderManifestList();
  renderCharProfile(id);
  // On a phone the list is a drop-down over the profile; picking from it is
  // the request to go and read that profile.
  setManifestList(false);
  updateManifestBar();
}

// ── The manifest's narrow-screen character picker ──
// Desktop keeps the list permanently beside the profile; below the breakpoint
// it collapses behind this bar so the character being read has the screen.
function setManifestList(open) {
  const v = document.getElementById('view-manifest');
  if (v) v.classList.toggle('cm-list-open', open);
  const b = document.getElementById('cm-list-btn');
  if (b) b.classList.toggle('btn-p', open);
}

function toggleManifestList() {
  const v = document.getElementById('view-manifest');
  if (!v) return;
  const opening = !v.classList.contains('cm-list-open');
  setManifestList(opening);
  if (opening) {
    const f = document.getElementById('cm-filter-input');
    if (f) f.focus();                      // the search bar is why you opened it
  }
}

function updateManifestBar() {
  const el = document.getElementById('cm-current-name');
  if (!el) return;
  const c = _curCharId && S.characters ? S.characters[_curCharId] : null;
  el.textContent = c ? c.name : 'No character selected';
}

// ── Profile ──

function renderCharProfile(id) {
  const right = document.getElementById('cm-profile');
  right.className = '';
  if (!S.characters) { right.innerHTML = '<div class="cm-empty-msg" style="margin-top:60px;text-align:center">No characters.</div>'; return; }
  const c = S.characters[id];
  if (!c) { right.innerHTML = '<div class="cm-empty-msg" style="margin-top:60px;text-align:center">Character not found.</div>'; return; }

  const myDocs = charDocsForChar(c).sort((a,b)=>simSortKey(b)-simSortKey(a));
  const allDocCount = Object.values(S.docs).filter(d=>{
    const names = getAllNamesForChar(c).map(n=>n.toLowerCase());
    return (d.chars||[]).some(n=>names.includes(n.toLowerCase()));
  }).length;
  let totalW = 0;
  myDocs.forEach(d=>{const tmp=document.createElement('div');tmp.innerHTML=d.content||'';totalW+=wc(tmp.innerText||'');});
  const avgW = myDocs.length ? Math.round(totalW/myDocs.length) : 0;
  const lastDoc = myDocs[0];
  const clr = getDivColor(c);
  const initials = getCharInitials(c.name);
  const typeCss = TYPE_CSS[c.charType||''] || 'cmt-npc';

  if (_manifestActiveTab === 'edit') {
    right.innerHTML = renderEditMode(c, clr, initials);
  } else {
    const bioHtml = renderBioCol(c, clr, initials, myDocs, allDocCount, avgW, lastDoc, typeCss);
    let tabContent = '';
    if (_manifestActiveTab === 'service') tabContent = renderServiceTab(c, myDocs);
    else if (_manifestActiveTab === 'ribbons') tabContent = renderRibbonsTab(c);
    else tabContent = renderSimsTab(c, myDocs);
    right.innerHTML = `<div id="cm-profile-wrap">${bioHtml}<div id="cm-sims-col">${renderTabBar()}${tabContent}</div></div>`;
  }
}

function renderEditMode(c, clr, initials) {
  const rankOpts = ['','Civilian','Cadet','Crewman','Petty Officer','Chief Petty Officer',
    'Ensign','Lieutenant JG','Lieutenant','Lt. Commander',
    'Commander','Captain','Fleet Captain','Commodore','Admiral','Fleet Admiral']
    .map(r=>`<option value="${r}" ${c.rank===r?'selected':''}>${r||'— Select rank —'}</option>`).join('');
  const divOpts = ['','Command','Operations','Security/Tactical','Science','Medical','Diplomat','Marines','Other']
    .map(d=>`<option value="${d}" ${c.division===d?'selected':''}>${d||'— None —'}</option>`).join('')
    + `<option value="__custom__">Custom…</option>`;
  const typeOpts = ['','Primary','Secondary','PNPC','MSPNPC','NPC']
    .map(t=>`<option value="${t}" ${(c.charType||'')===t?'selected':''}>${t||'— Type —'}</option>`).join('');

  const avatarHtml = c.pictureDataUrl
    ? `<img src="${c.pictureDataUrl}" alt="${esc(c.name)}">`
    : `<span>${initials}</span>`;

  const aliasesHtml = (c.aliases||[]).map((a,i)=>`
    <div class="cm-alias-row">
      <input type="text" value="${esc(a)}" placeholder="Alias or alternate name…" onblur="saveAlias(${i},this.value)">
      <button class="cm-alias-del" onclick="removeAlias(${i})" title="Remove alias">${ic('x','ic-sm')}</button>
    </div>`).join('');

  return `<div id="cm-profile-wrap">
    <div id="cm-bio-col">
      <div class="cm-bio-avatar" style="${c.pictureDataUrl?'':'background:'+clr}" onclick="document.getElementById('cm-pic-file-e').click()" title="Click to change photo">${avatarHtml}</div>
      <input type="file" id="cm-pic-file-e" class="cm-pic-file" accept="image/*" onchange="onCharPicFile(event)">
      <div class="cm-pic-controls" style="margin-top:6px">
        <div class="cm-pic-urlrow">
          <input type="text" id="cm-pic-url" placeholder="Image URL…">
          <button onclick="loadCharPicFromUrl()">Load</button>
        </div>
        ${c.pictureDataUrl?`<button class="cm-pic-file-btn" onclick="removeCharPic()">${ic('x','ic-sm')} Remove photo</button>`:''}
      </div>
      <div class="cm-edit-section">IDENTITY</div>
      <label class="cm-label">PRIMARY NAME</label>
      <input class="cm-input" id="cm-e-name" value="${esc(c.name)}" placeholder="Character name" onblur="saveCharField('name',this.value)">
      <label class="cm-label">TYPE</label>
      <select class="cm-select" id="cm-e-type" onchange="saveCharField('charType',this.value)">${typeOpts}</select>
      <label class="cm-label">RANK</label>
      <select class="cm-select" id="cm-e-rank" onchange="saveCharField('rank',this.value)">${rankOpts}</select>
      <label class="cm-label">DIVISION</label>
      <select class="cm-select" id="cm-e-division" onchange="saveCharDivision(this.value)">${divOpts}</select>
      <label class="cm-label">SPECIES</label>
      <input class="cm-input" id="cm-e-species" value="${esc(c.species||'')}" placeholder="e.g. Vulcan" onblur="saveCharField('species',this.value)">
      <label class="cm-label">WIKI URL</label>
      <input class="cm-input" id="cm-e-wiki" value="${esc(c.wikiUrl||'')}" placeholder="https://wiki.starbase118.net/…" onblur="saveCharField('wikiUrl',this.value)">
      <div class="cm-edit-section">ALIASES</div>
      <div style="font-size:0.73rem;color:var(--dim);margin-bottom:6px">Names this character also goes by (all are matched when tagging in sims).</div>
      <div id="cm-aliases-list">${aliasesHtml}</div>
      <button class="cm-alias-add" onclick="addAlias()">+ Add alias</button>
      <label class="cm-label" style="margin-top:10px">NOTES</label>
      <textarea class="cm-input" id="cm-e-notes" rows="3" placeholder="Brief notes…" onblur="saveCharField('notes',this.value)">${esc(c.notes||'')}</textarea>
      <button class="cm-done-btn" onclick="exitEditMode()">${ic('check')} Done Editing</button>
    </div>
    <div id="cm-sims-col" style="display:flex;align-items:center;justify-content:center">
      <div style="color:var(--dim);font-size:0.8rem;text-align:center;line-height:1.6">Editing profile.<br>Click <strong>Done Editing</strong> to<br>return to the sims view.</div>
    </div>
  </div>`;
}

function enterEditMode() {
  _manifestActiveTab = 'edit';
  if (_curCharId) renderCharProfile(_curCharId);
}

function exitEditMode() {
  _manifestActiveTab = 'sims';
  if (_curCharId) renderCharProfile(_curCharId);
}

// Re-render while preserving scroll. #cm-right has overflow:hidden;
// the actual scrolling element is #cm-sims-col which lives inside it.
// We save its scrollTop before replacing innerHTML, then restore on the
// newly-created element after the render.
function _rerenderKeepScroll(charId) {
  const col = document.getElementById('cm-sims-col');
  const scroll = col ? col.scrollTop : 0;
  renderCharProfile(charId);
  const newCol = document.getElementById('cm-sims-col');
  if (newCol && scroll) newCol.scrollTop = scroll;
}

function switchManifestTab(tab) {
  _manifestActiveTab = tab;
  _srEditMode = false;
  _ribbonEditMode = false;
  _ribbonAddFormOpen = false;
  _expandedRibbonIdx = -1;
  _activeRibbonCats.clear();
  if (_curCharId) renderCharProfile(_curCharId);
}

// ── Tab bar ──

function renderTabBar() {
  const tabs = [['sims','Sims'],['service','Service History'],['ribbons','Ribbons']];
  return `<div class="cm-tabs">${tabs.map(([t,lbl])=>`<button class="cm-tab${_manifestActiveTab===t?' cm-tab-active':''}" onclick="switchManifestTab('${t}')">${lbl}</button>`).join('')}</div>`;
}

// ── Bio column (shared across all view tabs) ──

function renderBioCol(c, clr, initials, myDocs, allDocCount, avgW, lastDoc, typeCss) {
  const pips = renderPips(c.rank);
  const aliasStr = (c.aliases||[]).filter(Boolean).join(', ');
  const wikiDisplay = c.wikiUrl ? c.name + ' (118 Wiki)' : '';
  const avatarHtml = c.pictureDataUrl
    ? `<img src="${c.pictureDataUrl}" alt="${esc(c.name)}">`
    : `<span>${initials}</span>`;
  const col = detectAliasCollisions()[c.id];
  const collisionHtml = (col&&col.length)
    ? (()=>{const lines=col.map(({name,clashWith})=>{const others=clashWith.map(id=>S.characters[id]?.name||id).join(', ');return`<span style="color:var(--text)">"${esc(name)}"</span> also used by <strong>${esc(others)}</strong>`;});return`<div class="cm-collision-warn">⚠ Alias collision: ${lines.join('; ')}. Sims may be misattributed — edit aliases to resolve.</div>`;})()
    : '';
  return `<div id="cm-bio-col">
    <div class="cm-bio-avatar" style="${c.pictureDataUrl?'':'background:'+clr}" onclick="document.getElementById('cm-pic-file-v')&&document.getElementById('cm-pic-file-v').click()">${avatarHtml}</div>
    <input type="file" id="cm-pic-file-v" class="cm-pic-file" accept="image/*" onchange="onCharPicFile(event)">
    <div class="cm-bio-name">${esc(c.name)}</div>
    <div class="cm-bio-rank">
      ${c.rank?`<span>${esc(c.rank)}</span>`:''}
      ${pips?`<span style="color:${clr}">${pips}</span>`:''}
      ${!c.rank&&!pips?'<span style="color:var(--dim);font-size:0.73rem">No rank</span>':''}
    </div>
    ${c.charType?`<div class="cm-bio-type"><span class="cm-type-tag ${typeCss}">${esc(c.charType)}</span></div>`:''}
    <hr class="cm-bio-divider">
    ${c.division?`<div class="cm-bio-row"><span class="cm-bio-lbl">DIVISION</span><span class="cm-bio-val"><span class="cm-div-dot" style="background:${clr};vertical-align:middle;margin-right:4px;display:inline-block"></span>${esc(c.division)}</span></div>`:''}
    ${c.species?`<div class="cm-bio-row"><span class="cm-bio-lbl">SPECIES</span><span class="cm-bio-val">${esc(c.species)}</span></div>`:''}
    ${aliasStr?`<div class="cm-bio-row"><span class="cm-bio-lbl">ALIASES</span><span class="cm-bio-val">${esc(aliasStr)}</span></div>`:''}
    ${c.wikiUrl?`<div class="cm-bio-row"><span class="cm-bio-lbl">WIKI</span><span class="cm-bio-val"><a href="${esc(c.wikiUrl)}" target="_blank" rel="noopener">${esc(wikiDisplay)}</a></span></div>`:''}
    ${c.notes?`<div class="cm-bio-notes">${esc(c.notes)}</div>`:''}
    ${collisionHtml}
    <div class="cm-mini-stats">
      <div class="cm-mini-stat"><div class="cm-mini-num">${myDocs.length}</div><div class="cm-mini-lbl">MY SIMS</div></div>
      <div class="cm-mini-stat"><div class="cm-mini-num">${allDocCount}</div><div class="cm-mini-lbl">ALL SIMS</div></div>
      <div class="cm-mini-stat"><div class="cm-mini-num">${avgW||'—'}</div><div class="cm-mini-lbl">AVG WORDS</div></div>
      <div class="cm-mini-stat"><div class="cm-mini-num" style="font-size:0.73rem">${lastDoc?new Date(lastDoc.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—'}</div><div class="cm-mini-lbl">LAST SIM</div></div>
    </div>
    <button class="cm-new-sim-btn" onclick="closeManifest();showNewDoc(null,null,'${c.id}')">+ New Sim</button>
    <button class="cm-edit-btn" onclick="enterEditMode()">${ic('pencil')} Edit Profile</button>
    <button class="cm-del-btn" onclick="deleteCharacter('${c.id}')">${ic('trash')} Remove</button>
    ${(()=>{const top=computeCharacterPartners(c,5);if(!top.length)return'';return`<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:10px"><div style="font-size:0.67rem;font-weight:bold;letter-spacing:1px;color:var(--dim);margin-bottom:6px">TOP SCENE PARTNERS</div>${top.map(p=>`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.78rem"><span style="color:var(--text)">${esc(p.name)}</span><span style="color:var(--dim)">${p.scenes}sc / ${p.sims}sim</span></div>`).join('')}</div>`;})()}
  </div>`;
}

// ── Sims tab ──

function renderSimsTab(c, myDocs) {
  if (!myDocs.length) {
    return `<div style="color:var(--dim);font-size:0.8rem;padding:16px 0">No sims recorded yet. Tag this character using the Characters panel while editing a sim.</div>`;
  }
  // Group by mission
  const missionMap = new Map(); // missionId -> { mission, docs }
  const noMissionDocs = [];
  myDocs.forEach(d => {
    if (!d.missionId) { noMissionDocs.push(d); return; }
    if (!missionMap.has(d.missionId)) missionMap.set(d.missionId, { mission: S.missions[d.missionId]||null, docs: [] });
    missionMap.get(d.missionId).docs.push(d);
  });
  // Sort missions by most recent sim
  const missionGroups = [...missionMap.values()].sort((a,b) => {
    const aDate = Math.max(...a.docs.map(d=>new Date(d.postedAt||d.updatedAt||0).getTime()));
    const bDate = Math.max(...b.docs.map(d=>new Date(d.postedAt||d.updatedAt||0).getTime()));
    return bDate - aDate;
  });
  if (noMissionDocs.length) missionGroups.push({ mission: null, docs: noMissionDocs });

  function renderSceneGroup(docs, sceneLabel) {
    const sorted = [...docs].sort((a,b)=>{
      const ad = new Date(a.postedAt||a.updatedAt||0).getTime();
      const bd = new Date(b.postedAt||b.updatedAt||0).getTime();
      return bd - ad;
    });
    return sorted.map(d => {
      const tmp = document.createElement('div'); tmp.innerHTML = d.content||''; const w = wc(tmp.innerText||'');
      const posted = d.postedAt ? fmtPostedDate(d.postedAt) : '—';
      return `<div class="cm-sim-row" onclick="closeManifest();openDoc('${d.id}')">
        <span class="cm-sim-title">${esc(d.title||'Untitled')}</span>
        <span class="cm-sim-meta">${posted}</span>
        <span class="cm-sim-wc">${w}</span>
      </div>`;
    }).join('');
  }

  let html = `<div class="cm-sim-col-hdr"><span>TITLE</span><span>POSTED</span><span>WORDS</span></div>`;
  missionGroups.forEach(({ mission, docs }) => {
    const mName = mission ? mission.name : 'No Mission';
    // Group by scene
    const sceneMap = new Map();
    const noSceneDocs = [];
    docs.forEach(d => {
      if (!d.sceneId) { noSceneDocs.push(d); return; }
      if (!sceneMap.has(d.sceneId)) sceneMap.set(d.sceneId, { scene: S.scenes[d.sceneId]||null, docs: [] });
      sceneMap.get(d.sceneId).docs.push(d);
    });
    const sceneGroups = [...sceneMap.values()].sort((a,b) => {
      const aDate = Math.max(...a.docs.map(d=>new Date(d.postedAt||d.updatedAt||0).getTime()));
      const bDate = Math.max(...b.docs.map(d=>new Date(d.postedAt||d.updatedAt||0).getTime()));
      return bDate - aDate;
    });

    html += `<div class="cm-mission-group">
      <div class="cm-mission-hdr">${esc(mName)} <span class="cm-mission-count">${docs.length} sim${docs.length!==1?'s':''}</span></div>`;
    if (noSceneDocs.length) html += renderSceneGroup(noSceneDocs, null);
    sceneGroups.forEach(({ scene, docs: sDocs }) => {
      const sName = scene ? scene.name : 'Unknown Scene';
      html += `<div class="cm-scene-label">${esc(sName)}</div>${renderSceneGroup(sDocs, sName)}`;
    });
    html += `</div>`;
  });
  return html;
}

// ── Service Record tab ──

function renderServiceTab(c, myDocs) {
  c.serviceRecord = c.serviceRecord || [];
  c.missionNotes = c.missionNotes || {};
  c.srMissionSortDesc = c.srMissionSortDesc !== false;

  const topBar = `<div class="cm-tab-toolbar">
    <span class="cm-section-title" style="margin:0;margin-right:auto">SERVICE RECORD</span>
    <button class="cm-tab-action" onclick="copySRWikitext('${c.id}')">${ic('copy')} Copy Wikitext</button>
    <button class="cm-tab-action" onclick="toggleSREditMode('${c.id}')">${_srEditMode?ic('check') + ' Done Editing':ic('pencil') + ' Edit'}</button>
  </div>`;

  let srSection = '';
  if (_srEditMode) {
    srSection = renderSREditTable(c);
  } else {
    if (!c.serviceRecord.length) {
      srSection = `<div class="cm-tab-empty">No service record entries yet. Click <strong>Edit</strong> to add rows.</div>`;
    } else {
      const sr = c.serviceRecord;
      const rankSpans    = computeSpans(sr, 'rank');
      const postingSpans = computeSpans(sr, 'posting');
      const assignSpans  = computeSpans(sr, 'assignment');
      const rows = sr.map((r,i) => {
        const rs = rankSpans[i], ps = postingSpans[i], as_ = assignSpans[i];
        const rankImgFile = rs !== null ? srRankImgFile(r.rank, r.division) : '';
        const rankImg = rankImgFile ? `<img src="${RIBBON_IMG_BASE}${rankImgFile}" style="height:28px;width:auto;display:block;margin:0 auto 3px" alt="" onerror="this.style.display='none'">` : '';
        return `<tr>
          ${rs!==null ? `<td${rs>1?` rowspan="${rs}"`:''}>${rankImg}<div style="font-size:0.78rem">${esc(r.rank||'')}</div></td>` : ''}
          <td style="white-space:nowrap;font-size:0.73rem;color:var(--dim)">${esc(r.startDate||'')}${r.endDate?' – '+esc(r.endDate):''}</td>
          ${ps!==null ? `<td${ps>1?` rowspan="${ps}"`:''} class="cm-sr-posting">${r.postingLogoFile?`<img src="${RIBBON_IMG_BASE}${r.postingLogoFile}" class="cm-sr-logo" alt="" onerror="this.style.display='none'"><br>`:''}${esc(r.posting||'')}</td>` : ''}
          ${as_!==null ? `<td${as_>1?` rowspan="${as_}"`:''} class="cm-sr-assign">${sanitizeSRHtml(r.assignment||'')}</td>` : ''}
        </tr>`;
      }).join('');
      srSection = `<table class="cm-sr-table"><tr><th>RANK</th><th>DATES</th><th>POSTING</th><th>ASSIGNMENT</th></tr>${rows}</table>`;
    }
  }

  const missionLogHtml = renderMissionLog(c, myDocs);
  return `${topBar}${srSection}${missionLogHtml}`;
}

function renderSREditTable(c) {
  const sr = c.serviceRecord;
  let html = `<div class="cm-sr-edit-list" id="cm-sr-edit-list">`;
  sr.forEach((r,i) => {
    const rankOpts = SR_RANKS.map(rk=>`<option value="${rk}" ${r.rank===rk?'selected':''}>${rk||'— Rank —'}</option>`).join('');
    const divOpts = `<option value="">— Division Colour —</option>` + SR_DIVISIONS.map(dv=>`<option value="${dv}" ${r.division===dv?'selected':''}>${dv}</option>`).join('');
    const prevPosting = i>0 ? sr[i-1].posting||'' : '';
    const prevLogo = i>0 ? sr[i-1].postingLogoFile||'' : '';
    const prevAssign = i>0 ? sr[i-1].assignment||'' : '';
    html += `<div class="cm-sr-edit-row" data-idx="${i}">
      <div class="cm-sr-edit-controls">
        <button onclick="moveSRRow('${c.id}',${i},-1)" ${i===0?'disabled':''}>${ic('arrow-up','ic-sm')}</button>
        <button onclick="moveSRRow('${c.id}',${i},1)" ${i===sr.length-1?'disabled':''}>${ic('arrow-down','ic-sm')}</button>
        <button class="cm-sr-del" onclick="deleteSRRow('${c.id}',${i})">${ic('x','ic-sm')}</button>
      </div>
      <div class="cm-sr-edit-fields">
        <select class="cm-sr-f" onchange="saveSRField('${c.id}',${i},'rank',this.value)">${rankOpts}</select>
        <select class="cm-sr-f" onchange="saveSRField('${c.id}',${i},'division',this.value)">${divOpts}</select>
        <input class="cm-sr-f" placeholder="Start stardate" value="${esc(r.startDate||'')}" onblur="saveSRField('${c.id}',${i},'startDate',this.value)">
        <input class="cm-sr-f" placeholder="End stardate (or Present)" value="${esc(r.endDate||'')}" onblur="saveSRField('${c.id}',${i},'endDate',this.value)">
        <div class="cm-sr-field-row">
          <input class="cm-sr-f" placeholder="Posting (ship/station name)" value="${esc(r.posting||'')}" onblur="saveSRField('${c.id}',${i},'posting',this.value)" id="sr-posting-${i}">
          ${i>0?`<button class="cm-sr-copy-btn" title="Copy posting from row above" onclick="copySRFieldFromAbove('${c.id}',${i},'posting','postingLogoFile')">${ic('arrow-up','ic-sm')} same</button>`:''}
        </div>
        <input class="cm-sr-f" placeholder="Logo file (e.g. USS Ship-logo.png) — leave blank if none" value="${esc(r.postingLogoFile||'')}" onblur="saveSRField('${c.id}',${i},'postingLogoFile',this.value)" id="sr-logo-${i}">
        <div class="cm-sr-field-row">
          <textarea class="cm-sr-f" rows="2" placeholder="Assignment / duty post (HTML allowed: &lt;b&gt; &lt;i&gt; &lt;br&gt;)" onblur="saveSRField('${c.id}',${i},'assignment',this.value)" id="sr-assign-${i}">${esc(r.assignment||'')}</textarea>
          ${i>0?`<button class="cm-sr-copy-btn" title="Copy assignment from row above" onclick="copySRFieldFromAbove('${c.id}',${i},'assignment')">${ic('arrow-up','ic-sm')} same</button>`:''}
        </div>
      </div>
    </div>`;
  });
  html += `</div><button class="cm-tab-add-btn" onclick="addSRRow('${c.id}')">+ Add Row</button>`;
  return html;
}

function toggleSREditMode(charId) {
  _srEditMode = !_srEditMode;
  if (charId === _curCharId) _rerenderKeepScroll(charId);
}

function saveSRField(charId, idx, field, value) {
  const c = S.characters[charId]; if (!c) return;
  c.serviceRecord = c.serviceRecord || [];
  if (!c.serviceRecord[idx]) return;
  c.serviceRecord[idx][field] = value;
  persist();
}

function addSRRow(charId) {
  const c = S.characters[charId]; if (!c) return;
  c.serviceRecord = c.serviceRecord || [];
  c.serviceRecord.push({ id: uid(), rank:'', division:'', startDate:'', endDate:'', posting:'', postingLogoFile:'', assignment:'' });
  persist();
  _rerenderKeepScroll(charId);
}

function copySRFieldFromAbove(charId, idx, ...fields) {
  const c = S.characters[charId]; if (!c) return;
  const sr = c.serviceRecord; if (!sr || idx < 1) return;
  fields.forEach(f => { sr[idx][f] = sr[idx-1][f] || ''; });
  persist();
  _rerenderKeepScroll(charId);
}

function deleteSRRow(charId, idx) {
  const c = S.characters[charId]; if (!c) return;
  c.serviceRecord = c.serviceRecord || [];
  c.serviceRecord.splice(idx, 1);
  persist();
  _rerenderKeepScroll(charId);
}

function moveSRRow(charId, idx, dir) {
  const c = S.characters[charId]; if (!c) return;
  const sr = c.serviceRecord || [];
  const ni = idx + dir;
  if (ni < 0 || ni >= sr.length) return;
  [sr[idx], sr[ni]] = [sr[ni], sr[idx]];
  persist();
  _rerenderKeepScroll(charId);
}

function copySRWikitext(charId) {
  const c = S.characters[charId]; if (!c) return;
  const sr = c.serviceRecord || [];
  if (!sr.length) { showToast('No service record entries to export.'); return; }
  const lines = ['{{Service Record}}'];
  const rankSpans    = computeSpans(sr, 'rank');
  const postingSpans = computeSpans(sr, 'posting');
  const assignSpans  = computeSpans(sr, 'assignment');
  sr.forEach((r, i) => {
    if (i > 0) lines.push('|-');
    // Insignia & Rank only on first row of a rank span
    if (rankSpans[i] !== null) {
      const rs = rankSpans[i] > 1 ? `|ROWS=${rankSpans[i]}` : '';
      lines.push(`{{SR Insignia|${srInsigniaName(r.rank||'')}|${r.division||''}|STYLE=PIC${rs}}}`);
      lines.push(`{{SR Rank|${r.rank||''}${rs}}}`);
    }
    lines.push(`{{SR Dates|<small>${r.startDate||''} - ${r.endDate||'Present'}</small>}}`);
    // Posting only on first row of a posting span
    if (postingSpans[i] !== null) {
      const ps = postingSpans[i] > 1 ? `|ROWS=${postingSpans[i]}` : '';
      const logoStr = r.postingLogoFile ? `[[File:${r.postingLogoFile}|60px|none]]` : '';
      const postingName = r.posting ? `[[${r.posting}]]` : '';
      if (logoStr || postingName) {
        lines.push(`{{SR Posting|\n${logoStr}${postingName}${ps}}}`);
      }
    }
    // Assignment only on first row of an assignment span
    if (assignSpans[i] !== null) {
      const as = assignSpans[i] > 1 ? `|ROWS=${assignSpans[i]}` : '';
      lines.push(`{{SR Assignment|${r.assignment||''}|${r.division||''}${as}}}`);
    }
  });
  lines.push('{{Service Record End}}');
  navigator.clipboard.writeText(lines.join('\n')).then(()=>showToast('Service Record wikitext copied!')).catch(()=>showToast('Copy failed — check clipboard permissions.'));
}

function computeSpans(arr, field) {
  // Returns array where index i = span size if this is the START of a run, null if mid-run, 1 if no run
  const result = new Array(arr.length).fill(1);
  let i = 0;
  while (i < arr.length) {
    let j = i + 1;
    while (j < arr.length && arr[j][field] === arr[i][field] && arr[j][field]) j++;
    const span = j - i;
    result[i] = span;
    for (let k = i+1; k < j; k++) result[k] = null;
    i = j;
  }
  return result;
}

// ── Mission Log (part of Service tab) ──

function renderMissionLog(c, myDocs) {
  c.missionNotes = c.missionNotes || {};
  c.srMissionSortDesc = c.srMissionSortDesc !== false;

  if (!myDocs.length) return '';

  // Group docs by mission
  const mMap = new Map();
  myDocs.forEach(d => {
    const mid = d.missionId || '__none__';
    if (!mMap.has(mid)) mMap.set(mid, { mission: d.missionId?(S.missions[d.missionId]||null):null, docs:[] });
    mMap.get(mid).docs.push(d);
  });

  let groups = [...mMap.values()].map(g => {
    const dates = g.docs.map(d=>d.postedAt).filter(Boolean).sort();
    return { ...g, earliest: dates[0]||'', latest: dates[dates.length-1]||'' };
  });

  groups.sort((a,b) => {
    const ad = a.latest||a.earliest||'';
    const bd = b.latest||b.earliest||'';
    return c.srMissionSortDesc ? bd.localeCompare(ad) : ad.localeCompare(bd);
  });

  const mids = [...mMap.keys()];
  const sortLabel = c.srMissionSortDesc ? 'Newest first' : 'Oldest first';

  let rows = groups.map(g => {
    const mid = g.mission ? g.mission.id : '__none__';
    const mName = g.mission ? g.mission.name : 'No Mission';
    const sd1 = g.earliest ? toStardate(g.earliest) : '—';
    const sd2 = g.latest && g.latest !== g.earliest ? toStardate(g.latest) : '';
    const dateStr = sd2 ? `${sd1} – ${sd2}` : sd1;
    const note = c.missionNotes[mid] || '';
    return `<div class="cm-mlog-row">
      <div class="cm-mlog-header">
        <span class="cm-mlog-name">${esc(mName)}</span>
        <span class="cm-mlog-dates">${dateStr}</span>
        <span class="cm-mlog-count">${g.docs.length} sim${g.docs.length!==1?'s':''}</span>
      </div>
      <textarea class="cm-mlog-note" placeholder="Mission notes…" onblur="saveMissionNote('${c.id}','${mid}',this.value)">${esc(note)}</textarea>
    </div>`;
  }).join('');

  return `<div class="cm-mission-log">
    <div class="cm-mlog-toolbar">
      <span class="cm-mlog-title">MISSION LOG</span>
      <button class="cm-tab-action" onclick="toggleMissionLogSort('${c.id}')">${sortLabel}</button>
      <button class="cm-tab-action" onclick="copyMissionLogWikitext('${c.id}')">${ic('copy')} Copy Wikitext</button>
    </div>
    ${rows}
  </div>`;
}

function saveMissionNote(charId, missionId, value) {
  const c = S.characters[charId]; if (!c) return;
  c.missionNotes = c.missionNotes || {};
  c.missionNotes[missionId] = value;
  persist();
}

function toggleMissionLogSort(charId) {
  const c = S.characters[charId]; if (!c) return;
  c.srMissionSortDesc = !c.srMissionSortDesc;
  persist();
  renderCharProfile(charId);
}

function copyMissionLogWikitext(charId) {
  const c = S.characters[charId]; if (!c) return;
  const myDocs = charDocsForChar(c);
  if (!myDocs.length) { showToast('No missions to export.'); return; }
  const mMap = new Map();
  myDocs.forEach(d => {
    const mid = d.missionId || '__none__';
    if (!mMap.has(mid)) mMap.set(mid, { mission: d.missionId?(S.missions[d.missionId]||null):null, docs:[] });
    mMap.get(mid).docs.push(d);
  });
  const groups = [...mMap.values()].map(g => {
    const dates = g.docs.map(d=>d.postedAt).filter(Boolean).sort();
    return { ...g, earliest: dates[0]||'', latest: dates[dates.length-1]||'' };
  }).sort((a,b)=>{
    const ad = a.latest||a.earliest||'';
    const bd = b.latest||b.earliest||'';
    return c.srMissionSortDesc ? bd.localeCompare(ad) : ad.localeCompare(bd);
  });
  const lines = ['== Mission History ==',''];
  groups.forEach(g => {
    const mid = g.mission ? g.mission.id : '__none__';
    const mName = g.mission ? g.mission.name : 'No Mission';
    const sd1 = g.earliest ? toStardate(g.earliest) : '—';
    const sd2 = g.latest && g.latest !== g.earliest ? toStardate(g.latest) : '';
    const dateStr = sd2 ? `${sd1} – ${sd2}` : sd1;
    const note = (c.missionNotes||{})[mid] || '';
    lines.push(`=== ${mName} ===`);
    lines.push(`''${dateStr}''`);
    if (note) lines.push('', note);
    lines.push('');
  });
  navigator.clipboard.writeText(lines.join('\n')).then(()=>showToast('Mission log wikitext copied!')).catch(()=>showToast('Copy failed.'));
}

// ── Ribbons tab ──

// Build a flat name→{img,category} lookup for the ribbon search
function buildRibbonLookup() {
  const map = {};
  Object.entries(RIBBON_CATALOG).forEach(([cat, entries]) => {
    entries.forEach(e => { map[e.name] = { img: e.img, category: cat }; });
  });
  return map;
}

// MediaWiki-safe URL. Checks user-saved overrides first (stored in S.settings.ribbonFileOverrides).
function ribbonImgUrl(imageFile) {
  if (!imageFile) return '';
  const overrides = S.settings?.ribbonFileOverrides || {};
  const file = overrides[imageFile] || imageFile;
  return RIBBON_IMG_BASE + file.replace(/ /g, '_');
}

function saveRibbonFileOverride(origFile, newFile) {
  if (!S.settings) S.settings = {};
  if (!S.settings.ribbonFileOverrides) S.settings.ribbonFileOverrides = {};
  if (newFile && newFile !== origFile) {
    S.settings.ribbonFileOverrides[origFile] = newFile.trim();
  } else {
    delete S.settings.ribbonFileOverrides[origFile];
  }
  persist();
  showToast('Filename override saved.');
}

function ribbonSortedList(c) {
  const ribbons = [...(c.ribbons || [])];
  const order = c.ribbonSortOrder || 'oldest';
  if (order === 'alpha') ribbons.sort((a,b)=>(a.ribbonName||'').localeCompare(b.ribbonName||''));
  else if (order === 'newest') ribbons.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  else if (order === 'oldest') ribbons.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  // 'default' keeps insertion order
  return ribbons;
}

function renderRibbonsTab(c) {
  c.ribbons = c.ribbons || [];
  c.ribbonSortOrder = c.ribbonSortOrder || 'oldest';

  const sortOrder = c.ribbonSortOrder;
  const sortBtns = ['oldest','newest','alpha','custom'].map(s => {
    const labels = {oldest:'Oldest first', newest:'Newest first', alpha:'A → Z', custom:'Custom'};
    const active = sortOrder === s ? ' cm-tab-sort-active' : '';
    return `<button class="cm-tab-action${active}" onclick="setRibbonSort('${c.id}','${s}')">${labels[s]}</button>`;
  }).join('');

  const topBar = `<div class="cm-tab-toolbar">
    ${sortBtns}
    <button class="cm-tab-action" onclick="copyRibbonsWikitext('${c.id}')">${ic('copy')} Copy Wikitext</button>
    <button class="cm-tab-action" onclick="toggleRibbonEditMode('${c.id}')">${_ribbonEditMode?ic('check') + ' Done Editing':ic('pencil') + ' Edit'}</button>
  </div>`;

  if (_ribbonEditMode) return topBar + renderRibbonsEditMode(c);

  if (!c.ribbons.length) {
    return topBar + `<div class="cm-tab-empty">No ribbons yet. Click <strong>Edit</strong> to add ribbons.</div>`;
  }
  const sorted = ribbonSortedList(c);
  const rows = sorted.map(r => {
    const imgUrl = ribbonImgUrl(r.imageFile||'');
    return `<tr>
      <td class="cm-rib-img-cell"><img src="${imgUrl}" class="cm-rib-img" alt="${esc(r.ribbonName||'')}" onerror="this.outerHTML='<span class=cm-rib-noimg>[No Internet]</span>'"></td>
      <td><strong>${esc(r.ribbonName||'')}</strong><div style="font-size:0.72rem;color:var(--dim)">${esc(r.category||'')}</div></td>
      <td style="font-size:0.73rem;color:var(--dim);white-space:nowrap">${esc(r.date||'')}${r.assignment?'<br>'+esc(r.assignment):''}</td>
      <td style="font-size:0.73rem">${renderWikiLinks(r.citation||'')}</td>
    </tr>`;
  }).join('');
  return topBar + `<table class="cm-ribbon-table"><tr><th></th><th>RIBBON</th><th>DATE / POSTING</th><th>CITATION</th></tr>${rows}</table>`;
}

function renderRibbonsEditMode(c) {
  const ribbons = c.ribbons || [];
  // Collect existing assignments for autocomplete
  const usedAssignments = [...new Set(ribbons.map(r=>r.assignment).filter(Boolean))];
  const assignOpts = usedAssignments.map(a=>`<option value="${esc(a)}">`).join('');

  let html = `<div class="cm-rib-edit-list">`;
  ribbons.forEach((r,i) => {
    const imgUrl = ribbonImgUrl(r.imageFile||'');
    const imgTag = `<img src="${imgUrl}" class="cm-rib-img" alt="" onerror="this.outerHTML='<span class=cm-rib-noimg>[img]</span>'">`;
    if (i === _expandedRibbonIdx) {
      html += `<div class="cm-rib-edit-row">
        <div class="cm-rib-edit-preview">${imgTag}</div>
        <div class="cm-rib-edit-fields">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
            <strong style="font-size:0.82rem">${esc(r.ribbonName||'Unknown')}</strong>
            <button onclick="collapseRibbonEdit('${c.id}')" style="background:transparent;border:1px solid var(--border);color:var(--dim);border-radius:3px;padding:2px 8px;font-size:0.75rem;cursor:pointer">${ic('check','ic-sm')} Done</button>
          </div>
          <input class="cm-sr-f" placeholder="Date (stardate)" value="${esc(r.date||'')}" onblur="saveRibbonField('${c.id}',${i},'date',this.value)">
          <input class="cm-sr-f" list="rib-edit-assign-list" placeholder="Assignment / posting" value="${esc(r.assignment||'')}" onblur="saveRibbonField('${c.id}',${i},'assignment',this.value)">
          <datalist id="rib-edit-assign-list">${assignOpts}</datalist>
          <textarea class="cm-sr-f" rows="2" placeholder="Citation… use [[Article]] for wiki links" onblur="saveRibbonField('${c.id}',${i},'citation',this.value)">${esc(r.citation||'')}</textarea>
        </div>
        <div class="cm-rib-edit-ctrl">
          <button onclick="moveRibbon('${c.id}',${i},-1)" ${i===0?'disabled':''}>${ic('arrow-up','ic-sm')}</button>
          <button onclick="moveRibbon('${c.id}',${i},1)" ${i===ribbons.length-1?'disabled':''}>${ic('arrow-down','ic-sm')}</button>
          <button class="cm-sr-del" onclick="deleteRibbon('${c.id}',${i})">${ic('x','ic-sm')}</button>
        </div>
      </div>`;
    } else {
      const meta = [r.date, r.assignment].filter(Boolean).join(' · ');
      html += `<div class="cm-rib-edit-row cm-rib-row-collapsed">
        <div class="cm-rib-edit-preview">${imgTag}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;font-weight:600">${esc(r.ribbonName||'Unknown')}</div>
          ${meta?`<div style="font-size:0.72rem;color:var(--dim)">${esc(meta)}</div>`:''}
        </div>
        <div class="cm-rib-edit-ctrl">
          <button onclick="expandRibbonEdit('${c.id}',${i})" title="Edit details">${ic('pencil','ic-sm')}</button>
          <button onclick="moveRibbon('${c.id}',${i},-1)" ${i===0?'disabled':''}>${ic('arrow-up','ic-sm')}</button>
          <button onclick="moveRibbon('${c.id}',${i},1)" ${i===ribbons.length-1?'disabled':''}>${ic('arrow-down','ic-sm')}</button>
          <button class="cm-sr-del" onclick="deleteRibbon('${c.id}',${i})">${ic('x','ic-sm')}</button>
        </div>
      </div>`;
    }
  });
  html += `</div>`;

  // Category toggle buttons (multiple can be active)
  const cats = Object.keys(RIBBON_CATALOG);
  const catBtns = cats.map(cat => {
    const active = _activeRibbonCats.has(cat) ? ' rib-cat-active' : '';
    return `<button class="rib-cat-btn${active}" onclick="toggleRibbonCat('${esc(cat)}')">${esc(cat)}</button>`;
  }).join('');

  if (_ribbonAddFormOpen) {
    html += `<div class="cm-rib-add-form" id="rib-add-form">
      <div class="cm-rib-add-title">ADD RIBBON</div>
      <div class="cm-rib-add-body">
        <div class="cm-rib-add-fields">
          <div class="cm-rib-cat-label">Filter by Category:</div>
          <div class="cm-rib-cat-btns">${catBtns}</div>
          <input id="rib-search" class="cm-sr-f" list="rib-datalist" placeholder="Search ribbon name…" oninput="onRibbonSearchInput()" autocomplete="off">
          <datalist id="rib-datalist"></datalist>
          <input id="rib-date" class="cm-sr-f" placeholder="Date (stardate)">
          <input id="rib-assign" class="cm-sr-f" list="rib-assign-list" placeholder="Assignment / posting">
          <datalist id="rib-assign-list">${assignOpts}</datalist>
          <textarea id="rib-citation" class="cm-sr-f" rows="2" placeholder="Citation… use [[Article]] for wiki links"></textarea>
          <div style="display:flex;gap:6px;margin-top:2px">
            <button class="cm-tab-add-btn" onclick="addRibbon('${c.id}')">+ Add</button>
            <button class="cm-tab-add-btn" onclick="cancelRibbonAdd('${c.id}')">Cancel</button>
          </div>
        </div>
        <div class="cm-rib-add-side">
          <div id="rib-preview" class="cm-rib-add-preview"></div>
          <div id="rib-selected-name" class="cm-rib-add-catname"></div>
        </div>
      </div>
    </div>`;
  } else {
    html += `<button class="cm-tab-add-btn" style="margin-top:8px" onclick="openRibbonAddForm('${c.id}')">+ Add Ribbon</button>`;
  }

  return html;
}

function toggleRibbonCat(cat) {
  if (_activeRibbonCats.has(cat)) _activeRibbonCats.delete(cat);
  else _activeRibbonCats.add(cat);
  // Update button styles without re-rendering the whole panel
  document.querySelectorAll('.rib-cat-btn').forEach(b => {
    b.classList.toggle('rib-cat-active', _activeRibbonCats.has(b.textContent));
  });
  // Re-filter the datalist with the current search text
  onRibbonSearchInput();
}

function onRibbonSearchInput() {
  const val = (document.getElementById('rib-search')?.value || '').trim();
  const dl = document.getElementById('rib-datalist');
  const prev = document.getElementById('rib-preview');
  const nameEl = document.getElementById('rib-selected-name');

  // Only populate datalist once typing starts
  if (dl) {
    if (val.length === 0) {
      dl.innerHTML = '';
    } else {
      const activeCats = _activeRibbonCats.size > 0 ? [..._activeRibbonCats] : Object.keys(RIBBON_CATALOG);
      const names = activeCats.flatMap(cat => (RIBBON_CATALOG[cat]||[]).map(r=>r.name));
      dl.innerHTML = names.map(n=>`<option value="${esc(n)}">`).join('');
    }
  }

  // Update preview if exact match found
  const lookup = buildRibbonLookup();
  const entry = lookup[val];
  if (entry) {
    const url = ribbonImgUrl(entry.img);
    if (prev) prev.innerHTML = `<img src="${url}" class="cm-rib-img" alt="" onerror="this.outerHTML='<span class=cm-rib-noimg>[No Internet]</span>'">`;
    if (nameEl) nameEl.textContent = entry.category;
  } else {
    if (prev) prev.innerHTML = '';
    if (nameEl) nameEl.textContent = '';
  }
}

function toggleRibbonEditMode(charId) {
  _ribbonEditMode = !_ribbonEditMode;
  _ribbonAddFormOpen = false;
  _expandedRibbonIdx = -1;
  _activeRibbonCats.clear();
  if (charId === _curCharId) _rerenderKeepScroll(charId);
}

function setRibbonSort(charId, order) {
  const c = S.characters[charId]; if (!c) return;
  if (order === 'custom') c.ribbons = ribbonSortedList(c); // snapshot current display order
  c.ribbonSortOrder = order;
  persist();
  _rerenderKeepScroll(charId);
}

function addRibbon(charId) {
  const ribbonName = document.getElementById('rib-search')?.value.trim() || '';
  if (!ribbonName) { showToast('Type or select a ribbon name first.'); return; }
  const lookup = buildRibbonLookup();
  const entry = lookup[ribbonName];
  const imgFile = entry?.img || ribbonName.replace(/ /g,'_') + '.png';
  const category = entry?.category || '';
  const date = document.getElementById('rib-date')?.value || '';
  const assignment = document.getElementById('rib-assign')?.value || '';
  const citation = document.getElementById('rib-citation')?.value || '';
  const c = S.characters[charId]; if (!c) return;
  c.ribbons = c.ribbons || [];
  c.ribbons.push({ id: uid(), category, ribbonName, imageFile: imgFile, date, assignment, citation });
  persist();
  _ribbonAddFormOpen = false;
  _activeRibbonCats.clear();
  _rerenderKeepScroll(charId);
}

function openRibbonAddForm(charId) {
  _ribbonAddFormOpen = true;
  _activeRibbonCats.clear();
  _rerenderKeepScroll(charId);
  setTimeout(() => {
    document.getElementById('rib-add-form')?.scrollIntoView({behavior:'smooth', block:'nearest'});
  }, 50);
}

function expandRibbonEdit(charId, idx) {
  _expandedRibbonIdx = idx;
  _rerenderKeepScroll(charId);
}

function collapseRibbonEdit(charId) {
  _expandedRibbonIdx = -1;
  _rerenderKeepScroll(charId);
}

function cancelRibbonAdd(charId) {
  _ribbonAddFormOpen = false;
  _activeRibbonCats.clear();
  if (charId && charId === _curCharId) _rerenderKeepScroll(charId);
}

function saveRibbonField(charId, idx, field, value) {
  const c = S.characters[charId]; if (!c) return;
  c.ribbons = c.ribbons || [];
  if (!c.ribbons[idx]) return;
  c.ribbons[idx][field] = value;
  persist();
}

function deleteRibbon(charId, idx) {
  const c = S.characters[charId]; if (!c) return;
  c.ribbons = c.ribbons || [];
  c.ribbons.splice(idx, 1);
  persist();
  _rerenderKeepScroll(charId);
}

function moveRibbon(charId, idx, dir) {
  const c = S.characters[charId]; if (!c) return;
  // Snapshot current display order into array before reordering
  if ((c.ribbonSortOrder || 'oldest') !== 'custom') c.ribbons = ribbonSortedList(c);
  c.ribbonSortOrder = 'custom';
  const rb = c.ribbons;
  const ni = idx + dir;
  if (ni < 0 || ni >= rb.length) return;
  [rb[idx], rb[ni]] = [rb[ni], rb[idx]];
  persist();
  _rerenderKeepScroll(charId);
}


function copyRibbonsWikitext(charId) {
  const c = S.characters[charId]; if (!c) return;
  if (!(c.ribbons||[]).length) { showToast('No ribbons to export.'); return; }
  // Export in current display sort order; count per name for |2, |3 suffixes
  const sorted = ribbonSortedList(c);
  const nameCount = {};
  const lines = ['{{Ribbons Display|ALIGN=left|COLOR=grey}}','{{Service Ribbons Header}}'];
  sorted.forEach(r => {
    const n = r.ribbonName || '';
    nameCount[n] = (nameCount[n] || 0) + 1;
    const suffix = nameCount[n] > 1 ? `|${nameCount[n]}` : '';
    // Citation may contain [[wiki links]] — export raw so wikitext is valid
    lines.push(`{{Citation|${n}|${r.date||''}|${r.assignment||''}|${r.citation||''}${suffix}}}`);
  });
  lines.push('{{Ribbons Display End}}');
  navigator.clipboard.writeText(lines.join('\n')).then(()=>showToast('Ribbons wikitext copied!')).catch(()=>showToast('Copy failed.'));
}

// ── Field saves ──

function saveCharField(field, value) {
  if (!_curCharId || !S.characters) return;
  const c = S.characters[_curCharId]; if (!c) return;
  c[field] = value;
  c.updatedAt = Date.now();
  persist();
  renderManifestList();
}

function saveCharDivision(value) {
  if (value==='__custom__') {
    const sel = document.getElementById('cm-e-division');
    const c = _curCharId && S.characters ? S.characters[_curCharId] : null;
    if (sel && c) sel.value = c.division||'';
    openModal('CUSTOM DIVISION',`
      <div class="mf"><label class="ml">DIVISION NAME</label><input class="mi" id="cm-div-n" placeholder="e.g. Engineering"></div>
      <div class="mf" style="display:flex;align-items:center;gap:10px">
        <input type="color" class="mi-color" id="cm-div-c" value="#667788">
        <div><label class="ml">BADGE COLOUR</label></div>
      </div>
    `,()=>{
      const n=document.getElementById('cm-div-n').value.trim();
      const col=document.getElementById('cm-div-c').value;
      if (!n) return false;
      saveCharField('division',n);
      saveCharField('divisionColor',col);
    });
    return;
  }
  saveCharField('division', value);
  saveCharField('divisionColor', DIVISION_COLORS[value]||'');
}

function saveAlias(idx, value) {
  if (!_curCharId || !S.characters) return;
  const c = S.characters[_curCharId]; if (!c) return;
  if (!c.aliases) c.aliases = [];
  c.aliases[idx] = value.trim();
  c.updatedAt = Date.now();
  persist();
  renderManifestList();
}

function addAlias() {
  if (!_curCharId || !S.characters) return;
  const c = S.characters[_curCharId]; if (!c) return;
  if (!c.aliases) c.aliases = [];
  c.aliases.push('');
  c.updatedAt = Date.now();
  persist();
  renderCharProfile(_curCharId);
  setTimeout(()=>{
    const inputs = document.querySelectorAll('#cm-aliases-list input');
    if (inputs.length) inputs[inputs.length-1].focus();
  },50);
}

function removeAlias(idx) {
  if (!_curCharId || !S.characters) return;
  const c = S.characters[_curCharId]; if (!c || !c.aliases) return;
  c.aliases.splice(idx, 1);
  c.updatedAt = Date.now();
  persist();
  renderManifestList();
  renderCharProfile(_curCharId);
}

function deleteCharacter(id) {
  const c = S.characters ? S.characters[id] : null; if (!c) return;
  if (!confirm(`Remove "${c.name}" from the Manifest?\n\nSim data is not affected.`)) return;
  delete S.characters[id];
  persist();
  if (_curCharId===id) {
    _curCharId = null;
    _manifestActiveTab = 'sims';
    _srEditMode = false;
    _ribbonEditMode = false;
    const _cmProfile = document.getElementById('cm-profile');
    if (_cmProfile) { _cmProfile.className = 'cm-empty-msg'; _cmProfile.innerHTML = 'Select a character to view their profile.'; }
  }
  renderManifestList();
}

function onCharPicFile(e) {
  const file = e.target.files[0]; if (!file) return;
  resizePicture(file, dataUrl => {
    if (!_curCharId || !S.characters) return;
    const c = S.characters[_curCharId]; if (!c) return;
    c.pictureDataUrl = dataUrl; c.updatedAt = Date.now();
    persist(); renderManifestList(); renderCharProfile(_curCharId);
  });
  e.target.value = '';
}

function removeCharPic() {
  if (!_curCharId || !S.characters) return;
  const c = S.characters[_curCharId]; if (!c) return;
  c.pictureDataUrl = null; c.updatedAt = Date.now();
  persist(); renderManifestList(); renderCharProfile(_curCharId);
}

function loadCharPicFromUrl() {
  const urlInput = document.getElementById('cm-pic-url');
  const url = urlInput ? urlInput.value.trim() : '';
  if (!url) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const min = Math.min(img.width, img.height);
    const sx = (img.width-min)/2, sy = (img.height-min)/2;
    ctx.drawImage(img, sx, sy, min, min, 0, 0, 200, 200);
    if (!_curCharId || !S.characters) return;
    const c = S.characters[_curCharId]; if (!c) return;
    c.pictureDataUrl = canvas.toDataURL('image/jpeg', 0.82);
    c.updatedAt = Date.now();
    persist(); renderManifestList(); renderCharProfile(_curCharId);
  };
  img.onerror = () => alert('Could not load image from that URL.\nSome sites block cross-origin image requests.');
  img.src = url;
}

function resizePicture(file, cb) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const min = Math.min(img.width, img.height);
    const sx = (img.width-min)/2, sy = (img.height-min)/2;
    ctx.drawImage(img, sx, sy, min, min, 0, 0, 200, 200);
    URL.revokeObjectURL(url);
    cb(canvas.toDataURL('image/jpeg', 0.82));
  };
  img.src = url;
}

// ================================================================
// SIM TEMPLATES
// ================================================================

// ================================================================
// ROUTING (History API)
// ================================================================
// Settings and the Character Manifest get real URLs — /settings and
// /manifest — while staying views inside the one app, so navigating to them
// mid-sim never tears the editor down or re-runs the auth gate.
//
// Routing only engages when the app is served from a clean path (Vercel,
// which rewrites /settings and /manifest to LCARS.html). Opened as a file, or
// served as .../LCARS.html on GitHub Pages where there are no rewrites, there
// is no path to push to — ROUTES stays off, every view opens exactly as it did
// before, and the routes degrade to the dashboard.
const ROUTE_VIEWS = ['settings', 'manifest', 'admin'];
let _routeView = 'dash';

// Returns {base, view} when the current URL is one this app can route, else
// null (routing disabled).
function routeContext() {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return null;
  if (/\.github\.io$/i.test(location.hostname)) return null;   // Pages has no rewrites
  const m = location.pathname.match(/^(.*\/)([^\/]*)$/);
  if (!m) return null;
  const dir = m[1], last = m[2];
  if (/\.html?$/i.test(last)) return null;          // served as a named file
  if (last === '') return { base: dir, view: 'dash' };
  if (ROUTE_VIEWS.includes(last)) return { base: dir, view: last };
  return null;                                      // some other deep path
}

function routingOn() { return routeContext() !== null; }

function routeUrl(view) {
  const ctx = routeContext();
  if (!ctx) return null;
  return ctx.base + (view === 'dash' ? '' : view);
}

// Record a view change in the URL without re-opening anything. Called by the
// open/close functions themselves, so every route in the app — button, link,
// keyboard — keeps the address bar honest.
function syncRoute(view, replace) {
  _routeView = view;
  const url = routeUrl(view);
  if (!url) return;
  if (location.pathname === url && !replace) return;
  history[replace ? 'replaceState' : 'pushState']({ view }, '', url);
}

// Open the view a URL asks for. Never pushes history itself — showView is told
// the change came from the route, so it swaps the view without touching the
// address bar the browser has already moved.
function applyRoute(view) {
  closeModal();
  showView(ROUTE_VIEWS.includes(view) ? view : 'dash', true);
}

function bootRoute() {
  const ctx = routeContext();
  if (!ctx) return;                                  // no routing here
  history.replaceState({ view: ctx.view }, '', routeUrl(ctx.view));
  window.addEventListener('popstate', e => {
    const c = routeContext();
    applyRoute((e.state && e.state.view) || (c && c.view) || 'dash');
  });
  if (ctx.view !== 'dash') applyRoute(ctx.view);
}


// ================================================================
// SHARE LINKS
// ================================================================
// A share is a SNAPSHOT. Pressing Share copies the sim into public.shared_docs
// and hands back a link; later edits stay private until it is published again.
// That is deliberate -- see the schema comment for why -- and it is also what
// makes the panel below honest about "Update shared copy".
//
// Sims only. Scenes are out of scope.

let _shareCache = {};   // docId -> share row, or null for "not shared"

// Housekeeping, not a security control -- get_shared_doc() already refuses an
// expired row, so this only stops dead rows accumulating. Which is exactly why
// it can ride along on any signed-in boot instead of needing a scheduler, the
// same arrangement purgeExpiredDeletions() uses.
function purgeExpiredShares() {
  if (!isCloud()) return;
  supaFetch('/rest/v1/rpc/purge_expired_shares', { method: 'POST', body: '{}' }).catch(() => {});
}

const SHARE_EXPIRY = [
  { label: 'No expiry',  hours: null },
  { label: '24 hours',   hours: 24 },
  { label: '7 days',     hours: 24 * 7 },
  { label: '30 days',    hours: 24 * 30 },
];

// Share links are served by a vercel.json rewrite of /s/<token>. GitHub Pages
// has no rewrites and a file:// copy has no server at all, so a link built
// anywhere but the real deployment is a link that 404s. Better to say so than
// to hand someone a URL that quietly does not work.
function canShare() {
  if (!isCloud()) return false;
  return location.protocol === 'https:' && !/\.github\.io$/i.test(location.hostname);
}

function shareUrl(token) { return location.origin + '/s/' + token; }

function shareWhyNot() {
  if (!isCloud()) return 'Share links need an account — this browser is in offline-only mode.';
  if (location.protocol !== 'https:') return 'Share links only work from the LCARS website, not from a downloaded copy.';
  return 'Share links only work at sb118-lcars.vercel.app. This copy is served from GitHub Pages, which cannot handle the link address.';
}

// What gets published. Everything the viewer needs to render the sim the way
// the writer sees it, and deliberately nothing else -- no mission, no scene, no
// word count, no snapshot history.
function sharePayload(doc) {
  const p = getPrefs();
  return {
    doc_id:         doc.id,
    owner_uid:      getAuth().uid,
    title:          doc.title || 'Untitled sim',
    authors:        [{ writer_id: getAuth().writerId || '',
                       display_name: _writerProfile.display_name || null }],
    status:         doc.status || 'active',
    doc_updated_at: new Date().toISOString(),
    content:        doc.content || '',
    academy:        isAcademyDoc(doc),
    // The formatting a READER should see -- the same set the copy handler puts
    // on the clipboard. Deliberately not the Visual Aids toggles: those tint
    // markers so a writer can spot them mid-sim, and have no business in a
    // finished sim someone has been sent a link to. Character colours are left
    // out for the same reason copy-out drops them: they are a way of telling
    // your own speakers apart while writing, and mean nothing to a reader.
    format:         { boldLocations: !!p.boldLocations,
                      italicOOC:     !!p.italicOOC,
                      thoughtItalic: !!p.thoughtItalic },
  };
}

// _writerProfile is filled in when the Settings view renders, which means a
// writer who has never opened Settings would publish a share with no display
// name on it -- and the byline would fall back to their Writer ID even though
// they had set a name. So the dialog makes sure of the profile before it
// publishes anything. It refetches when the name is empty, which is cheap and
// is the only case that could be wrong.
async function ensureWriterProfile() {
  if (!isCloud() || _writerProfile.display_name) return;
  try { _writerProfile = await fetchWriterProfile(); } catch (e) {}
}

async function fetchShare(docId) {
  if (!canShare()) return null;
  const r = await supaFetch('/rest/v1/shared_docs?select=*&doc_id=eq.' + encodeURIComponent(docId));
  if (!r.ok) throw new Error('Could not check whether this sim is shared.');
  const rows = await r.json();
  const row = (rows && rows[0]) || null;
  _shareCache[docId] = row;
  return row;
}

// Upsert rather than insert-or-update by hand, so re-publishing keeps the SAME
// token and any link already sent out stays valid. token is absent from the
// payload, which is what stops the merge overwriting it.
async function publishShare(doc, hours) {
  const body = sharePayload(doc);
  body.expires_at = hours == null ? null : new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const r = await supaFetch('/rest/v1/shared_docs?on_conflict=doc_id', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(supaErr(j, 'Could not share this sim.'));
  const row = (j && j[0]) || null;
  _shareCache[doc.id] = row;
  return row;
}

async function revokeShare(docId) {
  const r = await supaFetch('/rest/v1/shared_docs?doc_id=eq.' + encodeURIComponent(docId), { method: 'DELETE' });
  if (!r.ok) throw new Error('Could not stop sharing this sim.');
  _shareCache[docId] = null;
}

function shareExpiryText(row) {
  if (!row.expires_at) return 'This link does not expire.';
  const ms = new Date(row.expires_at) - Date.now();
  if (ms <= 0) return 'This link has expired. Share again to make a new one.';
  const hrs = Math.round(ms / 3600000);
  if (hrs < 48) return `Expires in about ${hrs} hour${hrs === 1 ? '' : 's'}.`;
  return `Expires in about ${Math.round(hrs / 24)} days.`;
}

function shareStaleNote(doc, row) {
  const same = (row.content || '') === (doc.content || '') &&
               (row.title || '') === (doc.title || '') &&
               (row.status || '') === (doc.status || 'active');
  return same
    ? '<p class="sh-note">The shared copy matches this sim.</p>'
    : '<p class="sh-note sh-stale">You have edited this sim since you shared it. Readers still see the older copy until you update it.</p>';
}

// ---------------------------------------------------------------
// The dialog
// ---------------------------------------------------------------
async function openShareDialog() {
  if (!curId) { showToast('Open a sim first.'); return; }
  if (!canShare()) { openModal('SHARE THIS SIM', `<p>${esc(shareWhyNot())}</p>`, null, { ok:'OK' }); return; }

  openModal('SHARE THIS SIM', '<p class="sh-note">Checking…</p>', null);
  try { await Promise.all([fetchShare(curId), ensureWriterProfile()]); }
  catch (e) { document.getElementById('mo-body').innerHTML = `<p class="sh-note">${esc(e.message)}</p>`; return; }
  if (document.getElementById('mo').classList.contains('hidden')) return;  // closed while we waited
  drawShareDialog();
}

function drawShareDialog() {
  const doc = S.docs[curId]; if (!doc) return;
  const row = _shareCache[curId];
  const body = document.getElementById('mo-body');
  const acts = document.getElementById('mo-actions');
  if (!body || !acts) return;

  if (!row) {
    body.innerHTML = `
      <p class="sh-note">Anyone with the link can read this sim. They will not need an account,
      and they will not be able to change anything.</p>
      <p class="sh-note">A link shows the sim <strong>as it is now</strong>. Keep writing and readers
      keep seeing this version until you share again.</p>
      <div class="mf"><label class="ml">LINK LASTS FOR</label>
        <select class="ms" id="sh-exp">
          ${SHARE_EXPIRY.map((o,i)=>`<option value="${i}">${o.label}</option>`).join('')}
        </select>
      </div>
      <p class="sh-note sh-dim">Shared as ${esc(_writerProfile.display_name || getAuth().writerId || 'you')}.</p>`;
    acts.innerHTML = `<button class="btn btn-s" onclick="closeModal()">Cancel</button>
                      <button class="btn btn-p" onclick="onShareCreate()">Create link</button>`;
    return;
  }

  const url = shareUrl(row.token);
  body.innerHTML = `
    <div class="mf"><label class="ml">SHARE LINK</label>
      <input class="mi" id="sh-url" readonly value="${esc(url)}" onclick="this.select()"></div>
    <p class="sh-note">${esc(shareExpiryText(row))}</p>
    ${shareStaleNote(doc, row)}`;
  acts.innerHTML = `
    <button class="btn btn-s" onclick="closeModal()">Close</button>
    <button class="btn btn-s sh-stop" onclick="onShareStop()">Stop sharing</button>
    <button class="btn btn-s" onclick="onShareUpdate()">Update shared copy</button>
    <button class="btn btn-p" onclick="onShareCopy()">Copy link</button>`;
}

async function onShareCreate() {
  const sel = document.getElementById('sh-exp');
  const hours = SHARE_EXPIRY[Number(sel ? sel.value : 0)].hours;
  const doc = S.docs[curId]; if (!doc) return;
  try {
    await publishShare(doc, hours);
    drawShareDialog();
    updateShareButton();
    onShareCopy();
  } catch (e) { showToast(e.message); }
}

async function onShareUpdate() {
  const doc = S.docs[curId], row = _shareCache[curId];
  if (!doc || !row) return;
  // Keep whatever expiry is already running rather than silently restarting it.
  const hours = row.expires_at
    ? Math.max(1, Math.round((new Date(row.expires_at) - Date.now()) / 3600000))
    : null;
  try {
    await publishShare(doc, hours);
    drawShareDialog();
    showToast('Shared copy updated.');
  } catch (e) { showToast(e.message); }
}

// Stop sharing is the only protection anyone has if a link escapes, so it
// confirms first and says plainly that the link dies rather than pausing.
function onShareStop() {
  const id = curId;
  openModal('STOP SHARING', `
    <p>The link stops working immediately, for everyone who has it.</p>
    <p class="sh-note">Sharing again later makes a <strong>new</strong> link — the old one will not come back.</p>`,
    async () => {
      try { await revokeShare(id); showToast('Sharing stopped.'); updateShareButton(); }
      catch (e) { showToast(e.message); }
    }, { ok: 'Stop sharing' });
}

function onShareCopy() {
  const url = _shareCache[curId] ? shareUrl(_shareCache[curId].token) : '';
  if (!url) return;
  navigator.clipboard.writeText(url)
    .then(() => showToast('Link copied.'))
    .catch(() => showToast('Copy the link from the box above.'));
}

// The button says whether the open sim is shared, so nobody has to open the
// dialog to find out. It reads the cache only -- boot must not fire a request
// per sim -- and fetchShare fills the cache when the dialog is opened.
function updateShareButton() {
  const btn = document.getElementById('btn-share');
  if (!btn) return;
  btn.classList.toggle('hidden', !canShare());
  const row = curId ? _shareCache[curId] : null;
  btn.classList.toggle('sh-on', !!row);
  btn.title = row ? 'This sim is shared — open to copy or stop the link' : 'Create a read-only link to this sim';
}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded',()=>{
  setTheme(S.settings.theme||'dark', true);
  updateThemeBtn();
  renderStyleMenu();
  applyStyle();
  applyPrefs();
  updateAutoBoldBtn();
  updateItalicThoughtsBtn();

  // Style menu: click-outside and Escape close it, focus returns to the trigger
  document.addEventListener('click', e => {
    const p = document.getElementById('style-picker');
    if (p && !p.contains(e.target)) closeStyleMenu();
  });
  document.getElementById('style-menu').addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeStyleMenu(); document.getElementById('btn-style').focus(); }
  });

  // Sidebar states
  if (S.settings.sidebarOpen === false) {
    document.getElementById('sidebar').classList.add('collapsed');
    document.getElementById('sb-toggle').innerHTML=ic('chevron-right');
  }
  if (S.settings.charsOpen === false) {
    document.getElementById('cp').classList.add('collapsed');
    document.getElementById('cp-toggle').innerHTML=ic('chevron-left');
  }
  if (S.settings.sidebarDetail) {
    document.getElementById('sidebar').classList.add('sidebar-detail');
    document.getElementById('sb-detail-btn').innerHTML=ic('list') + ' Details';
  }

  // Saved sidebar widths
  if (S.settings.sidebarW) document.documentElement.style.setProperty('--sidebar-w', S.settings.sidebarW+'px');
  if (S.settings.charsW) document.documentElement.style.setProperty('--chars-w', S.settings.charsW+'px');

  const ed=document.getElementById('editor');
  ed.addEventListener('input',onEditorInput);
  ed.addEventListener('keyup',updateTBState);
  ed.addEventListener('mouseup',updateTBState);
  document.getElementById('doc-title').addEventListener('input',schedSave);
  document.getElementById('s-zoom').textContent=zoom+'%';
  installCopyHandler();
  installPasteHandler();
  document.addEventListener('click',e=>{
    if(!e.target.closest('#ctx')) hideCtx();
  });
  renderNav();
  showDashboard();
  updateViewButtons();
  // The header mark reuses the icon already inlined in <head>, so the ~11 KB of
  // base64 is carried once rather than once per place it appears.
  const mark = document.getElementById('hdr-mark');
  const icon = document.querySelector('link[rel=icon]');
  if (mark && icon) mark.src = icon.href;
  showMovedBanner();                  // only appears on the old GitHub Pages address

  // Coming back from Google or Discord. Runs before the mode checks below,
  // because a successful return may be what puts this browser into cloud mode.
  const oauthOutcome = handleOAuthReturn();
  // A return from a real provider is a cross-origin navigation, so the line
  // above catches it on load. This is insurance for the case where the browser
  // treats the return as a same-document fragment change and never reloads.
  window.addEventListener('hashchange', handleOAuthReturn);

  // Routing is settled BEFORE anything raises a modal. applyRoute() begins with
  // closeModal(), so a gate or notice opened first was torn down again the
  // moment the route resolved — which only showed up when the reload landed on
  // /settings or /manifest rather than the dashboard.
  bootRoute();

  if (oauthOutcome === 'signin') {
    // completeProviderSignIn() owns the rest of boot: it resolves the Writer
    // ID, pulls the account and decides what to show.
  } else if (isFileCopy() && !getMode()) {
    setMode('local');                   // the offline copy has only one mode
    maybeShowStyleIntro();
    maybeShowWizard();
  } else if (!getMode()) {
    // Someone who has just asked to delete their account lands here signed out.
    // Tell them what happens next before the gate invites them to sign in.
    if (!maybeShowDeleteNotice()) showAuthGate(false);   // first visit — wizard follows once resolved
  } else {
    // The deletion check runs after the boot pull so it never races the
    // reconcile prompt for the one modal slot.
    // Nothing here ever asks about linking an account. That is a step of the
    // gate, and boot runs on every page load -- which is how opening Settings
    // ended up prompting.
    // initAdmin() only reads a role and a count -- it raises nothing, so it is
    // safe on every load. checkMustChangePin() does raise a modal, but only for
    // someone who signed in with a temporary PIN a moderator issued, and only
    // when the deletion prompt has not already claimed the slot.
    if (isCloud()) {
      cloudBoot()
        .then(checkDeletionPending)
        .then(busy => { if (!busy) return checkMustChangePin(); });
      initAdmin();
    }
    maybeShowStyleIntro();              // held back behind the gate on a first visit
    maybeShowWizard();
  }
});
