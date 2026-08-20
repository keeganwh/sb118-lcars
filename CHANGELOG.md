# LCARS SB118 Writing Tool — Changelog

## Unreleased

_On `main` and live, not yet cut as a version._

- Changed: new icon — the gold delta — in the browser tab, and on your home screen if you add LCARS to it from a phone
- Added: the delta now sits in the top-left LCARS badge as well, on a dark disc with a fine light ring. The disc is not quite solid, so the duty-post colour tints it — and it keeps the delta legible even on Operations gold, where the badge is the same colour as the mark
- Changed: deleting your account now really removes it. It used to clear your sims but leave the login registered, so the Writer ID could never be used again and signing back in gave you an empty LCARS — the login itself is now removed too, and the Writer ID becomes free to register again
- Added: a 48-hour grace period on account deletion. Nothing is destroyed straight away — sign in again with your Writer ID and PIN within 48 hours and you can cancel, and everything comes back exactly as it was. Settings shows how long is left
- Changed: if the server cannot be reached while deleting an account, the deletion is refused outright rather than wiping the device and leaving the account behind
- Removed: the recovery email. Nothing was ever sent to it — your sign-in address is synthetic and cannot receive mail — so it was held for identification only and implied a recovery route that did not exist. Creating an account no longer asks for it, and Settings no longer offers it. Linking a Google or Discord account replaces it, and is coming next
- Fixed: after confirming an account deletion the reminder about the 48-hour window did not appear if you had deleted from Settings. Opening a view tears down whatever dialog is on screen, and the reminder was raised a moment before that happened — deleting now returns you to the dashboard, and the reminder is raised after the view has settled
- Fixed: signing back in during the 48-hour window did not offer to keep your account. The prompt only appeared if you went looking for it in Settings, which is the one place you would not think to look — it now comes up as soon as you sign in
- Fixed: keeping an account after changing your mind left the Settings tile still showing a countdown until the page was navigated away from and back
- Added: Linked accounts, in Settings → Your Account & Data. You can now link a Google or Discord account to your Writer ID. It is optional, and your Writer ID and PIN keep working exactly as before — a linked account is a second way in, and the way back in if you forget your PIN
- Added: linked accounts can be unlinked again from the same place, with a confirmation first. Your Writer ID login is never listed there, because it is not something you linked and must never look removable
- Fixed: unlinking a Google or Discord account failed with “identity_id must be an UUID”. A linked account carries two different identifiers — one of its own and one belonging to the provider — and LCARS was sending the provider’s
- Added: sign in with Google or Discord. Once you have linked an account, Continue with Discord or Continue with Google on the sign-in screen takes you straight in — LCARS works out which Writer ID is yours from the account itself
- Added: Forgotten your PIN? on the sign-in screen. Sign in with your linked Google or Discord account and you can set a new PIN there and then, without anyone else being involved. If you never linked an account it says so plainly rather than sending you round in circles — that case still needs the maintainer
- Added: a one-time nudge to link an account, for writers who have not. It explains that a Writer ID and PIN alone leave no way back in if the PIN is forgotten. Declining it is remembered and it does not ask again
- Changed: signing in with a Google or Discord account that has not been linked to any Writer ID now says so and offers the Writer ID sign-in, rather than opening an empty LCARS
- Fixed: creating an account from Settings appeared to do nothing. The account was made and you were signed in, but the Settings page was still the one drawn for a signed-out writer, so it went on offering to set up an account — and clicking that reopened the sign-in screen, with no way out of the loop
- Fixed: the prompt to link a Google or Discord account never appeared after creating an account. It was opening underneath the Getting Started wizard, which covers the whole screen, so it could be neither seen nor dismissed. It now waits and appears once you have finished with the wizard
- Fixed: signing out from Settings left you on the Settings address, so the page you came back to was built around an account you no longer had. Signing out now returns you to the dashboard
- Changed: connecting a Google or Discord account is now offered as the last step of creating or signing into an account, in the same window, rather than as a message that appeared afterwards. Writers with an existing account are asked once, the next time they sign in. Both providers are offered and it can be declined
- Fixed: that offer no longer appears when you open Settings. It used to be raised on start-up, and start-up happens on every page load — including going straight to Settings, which is not a moment anyone wants interrupting
- Changed: whether the offer has been made is remembered against your account rather than the browser, so it follows you and is asked exactly once no matter which device you next sign in on
- Fixed: Academy sims were still auto-formatting some markers — ((Location)) came out bold and ((OOC)) italic, both on screen and when copied out. Neither shows now, and neither is carried onto the clipboard. The coloured highlights on Actions, Comms and Thoughts stay, since those are only ever visual aids and were never copied out anyway
- Fixed: pasting formatted text into an Academy sim kept its bold and italics until the sim was next reopened. Pasted text is now stripped as it goes in
- Changed: Academy sims allow more of the toolbar than they used to — links, source view, paragraph markers and the whole Insert marker menu are all available again. Bold, italic, strikethrough, indenting and the Auto Format toggles stay switched off, which is what the plain-text rule actually asks for
- Fixed: in an Academy sim the bold, italic and strikethrough buttons were only dimmed, not disabled, and editing the raw source could put formatting back. Both routes are now closed off
- Added: bullet points. The new bullet button in the toolbar (or Ctrl+Shift+8) turns the line you are on into a bullet. Press Enter for the next one and Enter on an empty bullet to finish, so the same button covers a single standalone point and a full list. Pressing it again on a bullet turns it back into an ordinary paragraph. Bullets work in Academy sims too
- Fixed: copying a whole bulleted list came out as unbulleted lines, because the list wrapper was left behind — and in plain text apps such as Discord the bullets ran together into one line. Lists now paste out as lists, and as • one per line where only plain text is accepted
- Added: moderators. A writer can now be given a moderator or super admin role, so the fleet can look after its own accounts — previously anyone who lost their PIN without a linked account had to find the maintainer
- Added: Request a PIN reset, on the Forgotten your PIN? screen. If you never linked a Google or Discord account, or they are not working, you can now ask a moderator directly. You give your Writer ID and a note saying how they can check the request really came from you — a Discord handle or an email address they can reach you at
- Added: an Admin panel for moderators, with a count in the header of requests waiting. Every moderator sees the same count, so a request cannot sit unnoticed because one person did not log in
- Added: moderators can issue a temporary PIN from the panel, to pass on however that writer asked to be contacted. The PIN is shown once and never stored anywhere readable, the writer's old PIN and any open sessions stop working immediately, and LCARS makes them choose their own PIN the moment they sign in with it
- Added: requests can also be rejected, with a confirmation first. Rejecting only closes the request — there is nowhere to send a reply, since whoever filed it is locked out — so a request that might be genuine is better followed up in person
- Added: an Archive of every request ever decided, showing who actioned or rejected it and when. Nothing is ever deleted, so a reset can always be accounted for afterwards
- Added: super admins can assign roles from the panel, by Writer ID. Moderators only ever see the reset queue — there is no list of writers and no access to anyone's sims
- Changed: a request filed against a Writer ID with no LCARS account is accepted and quietly dropped, so this cannot be used to find out who has an account. The confirmation says to double-check the Writer ID, because a typo is the one mistake with no other symptom
- Fixed: the introduction to the Delta Prime look could paint over a prompt that had to be answered — including the one asking you to replace a temporary PIN, which has no way to dismiss it. It now waits for the next visit if anything is already on screen
- Added: super admins now see a list of every account in the Admin panel — Writer ID, display name if one is set, when they joined, and their role. It scrolls, and there is a filter box for finding someone by either Writer ID or name
- Changed: a role is now set from the row itself rather than by typing a Writer ID into a separate box, which was two chances to promote the wrong person. Changing one asks you to confirm, and says what the new role can do
- Added: your own row cannot be changed, because with no super admin left the only way back is a hand-run database statement. Accounts in their 48-hour deletion window are marked as such
- Changed: moderators still see no writer list — the roster is super admins only. It shows who holds an account and what they can do, and nothing about anyone's sims
- Fixed: sims pasted in from Google Docs or Word copied out double spaced. Those apps hand LCARS paragraph blocks, which look right in the editor but carry spacing of their own everywhere else — so every line, and every blank line, arrived with a gap around it. Copying out now produces the same plain blocks a sim typed in LCARS does. Sims you have already pasted in are fixed too, and nothing about what is stored changes
- Fixed: blank lines pasted in from Google Docs could vanish entirely when copied into some apps, while showing as a full blank line in others
- Fixed: lines separated by a soft line break ran together into one line when copied as plain text — in Discord in particular, where only plain text is accepted
- Added: indenting now works in Academy sims, on ordinary lines and on bullets alike. Indenting is structure rather than formatting — the same reason bullets were already allowed — so the indent and outdent buttons are no longer greyed out there
- Fixed: indenting a bullet moved the whole list instead of that one bullet. Each bullet now indents on its own, so a list can have levels within it
- Fixed: an indent applied in an Academy sim was silently undone the next time the sim was opened, pasted into, or edited through source view
- Added: select across several lines and the indent button now indents all of them at once, rather than only the line you started on. Works on bullets and ordinary lines together, and Ctrl+Z takes the whole lot back in one press
- Fixed: Tab and Shift+Tab did not indent in Academy sims even though the buttons did
- Changed: the code that renders sims for reading — markers, thoughts, comms, character colours — now lives in one shared file rather than only inside the editor. Nothing looks or behaves differently; it is groundwork for read-only share links, so a shared sim renders exactly as it does here instead of slowly drifting out of step

## v4.23 — 2026-08-15

- Removed: the "Import Sims" Markdown/Google Docs importer in Settings — exporting a Doc to Markdown and re-importing it was clunky, and better ways to bring sims in are being built. Backup and Restore are unaffected
- Changed: revision snapshots now live in your account rather than inside the main data blob. They were ten full copies of each sim being re-uploaded on every save, and were by far the largest part of the payload; they are now fetched only when you open the Snapshots window, and follow you between devices
- Changed: Writer ID entry now checks the real ten-character format (ship letter, stardate year and month, two initials, academy digit) and the example shown is a placeholder, not a real writer
- Added: accounts. Sign in with your Writer ID and a PIN, and your sims save to your account automatically and follow you to any device — no tokens, no export files. An optional recovery email can be given when creating the account
- Added: a first-run choice between signing in and working offline on one device only. Offline sends nothing anywhere; you can switch to an account later from Settings, and your existing work is carried across
- Changed: cloud sync now uses a proper database instead of a GitHub Gist. The Gist was capped near 1 MB and this data was close to it; that ceiling is gone. The Personal Access Token and Gist ID fields are removed — nothing to set up any more
- Changed: saves reach your account after ~5 seconds instead of ~60, and Ctrl+S still saves a snapshot and syncs immediately
- Fixed: restoring a backup did not save to your account — it saved on the device only and would not reach the server until your next edit. Restoring now uploads straight away, which matters most when moving your sims across from the old address
- Added: the old GitHub Pages address now shows a moving notice explaining the change, with Move My Stuff (sign in there and your sims and settings upload to your account, ready at the new address), a manual backup download, a link to the new site, and Remind Me Later — which returns on the next load rather than dismissing for good
- Added: a Getting Started wizard on first run, with separate routes for writers new to LCARS and writers arriving from the old address — the latter covering what changed and how to bring sims across, including loading a backup file directly from the wizard. Dismiss it with the “Don’t show this again” button, or reopen it any time from Getting Started on the Dashboard
- Added: a Danger Zone in Settings → Data Management. Erase all sims and characters wipes LCARS clean — synced to your other devices when signed in — and, with an account, Delete my account removes your sims, characters and revision history from the server. Both need the action typed out to confirm, and neither can be undone
- Changed: the Dashboard’s Ready to get started? cards now sit in two rows — making things on the first, learning about them on the second
- Fixed: the Danger Zone heading was tinted red and became unreadable against the red duty post accent; it now uses the normal text colour
- Fixed: reopening the Getting Started wizard from the Dashboard left no way out except Skip, which also stopped it appearing again — there is now a close button on every step
- Fixed: Move My Stuff on the old address uploaded your sims but then left you sitting on the old site. It now confirms the move and forwards you to the new address, with the option to stay. If the upload did not complete it says so and offers to retry or download a backup rather than sending you on
- Fixed: restoring a large backup froze the page for over a second — the whole dataset was being written and the sim tree rebuilt inside the click, with a blocking alert on the end. The work now yields a frame first and reports through a toast
- Note: if this browser and your account both hold sims, you are asked which copy to keep rather than one silently replacing the other
- Changed: the app is now three files — LCARS.html, lcars.css and lcars.js — instead of one. Nothing looks or behaves differently; it is groundwork so Settings and the Character Manifest can become pages of their own. Offline downloads are still a single self-contained file
- Added: Settings and the Character Manifest now have their own web addresses — /settings and /manifest. The back and forward buttons move between them, and a link straight to one opens it. They are still part of the same page, so opening the Manifest mid-sim leaves your unsaved typing exactly where it was
- Added: Settings → Data Management now offers Download LCARS for offline use — one self-contained file you can keep on your own machine and open with no internet at all. The app is built from three files now, and the download puts them back together for you
- Fixed: on a first visit the Delta Prime introduction could open on top of a page you had gone straight to, such as /settings, and hide it. It now waits until you are back on the dashboard
- Fixed: the downloaded offline copy still offered to sign you in or create an account, neither of which can work from a file on your own machine — the browser blocks it reaching the server. The offline copy now starts straight in offline mode with no sign-in prompt, and Settings and the Getting Started wizard point you at LCARS online instead, noting that a backup taken offline restores straight into it
- Changed: Settings is now a page of its own rather than a tall pop-up window. It sits under the same header as the rest of LCARS, at its own address, and the sections are regrouped — your account first, then how it looks, then how the sim editor behaves, with your data, the danger zone and the version history below. Fonts, sizes, colours and the editor toggles are saved together from the bar at the foot of the page; everything else still applies the moment you click it
- Fixed: on a narrow screen the header buttons were cut off with no way to reach them, so there was no way back out of Settings on a phone. The header now scrolls sideways and drops the STARBASE 118 WRITING TOOL strapline rather than clipping
- Changed: the Character Manifest is a page of the app now rather than a screen that covered it. It carried a second row of Sim Editor, theme and Settings buttons of its own, which made it read as a separate application; it now sits under the same header as everything else, and that header stays put while you are in it. Opening it mid-sim still leaves your unsaved typing exactly where it was
- Changed: the Character Manifest works on a phone — the character list and the profile stack into one scrolling column instead of being squeezed side by side
- Added: account management in Settings. Change your PIN without leaving LCARS — you enter your current one, then the new one twice. Add, change or remove your recovery email. The Writer ID you are signed in as is now shown plainly at the top of the page rather than buried in a sentence
- Changed: everything to do with your account is now in one place at the top of Settings — who you are signed in as, saving now, signing out, your PIN, your recovery email and closing the account. Deleting your account moved there from the Danger Zone, which now covers erasing your sims and characters only
- Fixed: the version number in Settings and the link to LCARS online were asking for a colour that was never defined, so they came out in ordinary body text instead of the accent colour
- Note: a forgotten PIN still has to be reset by the maintainer, and deleting your account still leaves the Writer ID registered as a login. Both need a server-side key that cannot safely live in the page, and are being done properly next
- Changed: Settings is reordered and regrouped into four sections — Your Account & Data, LCARS Appearance, LCARS Sim Editor and About LCARS — with a contents rail down the side to jump between them. On a phone the rail folds away behind a Jump to… button
- Changed: the buttons in Settings now say what they actually do underneath their label, and sit three across a desktop page instead of one per row, wrapping down to one on a phone. “Save now”, for instance, now says it uploads this device’s sims straight away rather than waiting for the automatic save
- Changed: Delete my account moved back into the Danger Zone, which is now a marked-off block at the foot of Your Account & Data rather than a section of its own
- Added: a display name. Set a friendlier name than your Writer ID from Settings → Your Account & Data
- Changed: About LCARS now gathers the changelog, the link to the full user guide, the Getting Started tour and the note about how the tool was built. That last one has moved off the Dashboard, which was not really the place for it
- Changed: Sim Templates is no longer a button in the header. The saved templates live in Settings → Your Account & Data, where clicking one opens it for editing — name, default sim title and the template text itself — rather than only offering rename and delete. Saving the sim you are writing as a template moved to Sim Details, next to Snapshots
- Changed: on a phone the Character Manifest no longer gives the top of the screen to the character list. The list folds away behind a Characters button, with its search intact, so the character you are reading gets the room
- Changed: editing a sim template now opens it in the sim editor itself, with the full toolbar, markers and auto-formatting, rather than a plain text box in Settings. A banner across the top makes it clear you are editing a template rather than a sim, and the title bar holds the template’s name
- Changed: the Settings buttons are smaller and all the same shape, with a one-line explanation each instead of a paragraph. A page of large asymmetric cards repeated a dozen times was more noise than help
- Changed: “Save to my account now” is now “Sync data now”, and says plainly that it is rarely needed because syncing is automatic
- Changed: once you set a display name, Settings reads “Signed in as Jean Luc Picard (V239806K11)” rather than showing the Writer ID alone
- Added: Share my contact, in Settings → Your Account & Data. Shows your name and Writer ID as a small card and copies them in one click, for handing to another writer
- Changed: Sim Templates is now its own section in Settings rather than sitting inside Your Account & Data
- Changed: About LCARS is tidied — Getting Started, the full user guide and how the tool was built are three buttons, and the changelog is a small button on the version line rather than a panel of its own
- Fixed: a sim template row showed an Edit label that was not clickable — the whole row now opens the template, which is what it looked like it should do
- Changed: finishing with a template, whether by Done or the close button, takes you back to Sim Templates in Settings rather than dropping you on the dashboard
- Changed: your display name and Writer ID are now shown at the same size and weight in Settings, rather than the Writer ID trailing in brackets
- Changed: the Share my contact card reads “Write with [name] on LCARS. Writer ID [ID].” and is headed LCARS Writing System
- Changed: LCARS Appearance and LCARS Sim Editor use the same buttons and spacing as the rest of Settings — the style and theme pickers are now buttons with a selected state rather than a row of pills
- Fixed: jumping to a section from the Settings contents rail could leave a different section highlighted, because a short section near the end of the page is reached at the very bottom of the scroll where the one below it is equally on screen

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
