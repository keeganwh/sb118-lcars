# LCARS SB118 Writing Tool

A browser-based sim writing tool for [Starbase 118](https://www.starbase118.net/) — built specifically for the SB118 Play-by-Email (PBEM) format.

## Features

- **Hierarchy** — organise your writing into Missions → Scenes → Sims
- **Script markers** — `::Action::`, `=/\= Comms =/\=`, `oO Thoughts Oo`, `((Location))`, `((OOC))` with colour-coded highlighting
- **Character detection** — auto-detects character names and colour-codes them per sim
- **Character Manifest** — full character profiles with service records, postings, and ribbons
- **Sim Templates** — save and reuse common sim formats
- **Revision history** — snapshots on every save with restore
- **Full-text search** — across all sims
- **Academy Mode** — restricted formatting for training sims
- **Export / Import** — full JSON backup and Markdown import from Google Docs

## How to Use

Open `LCARS.html` in any modern browser — no installation, no server required.

For the full user guide, open `LCARS-Guide-v2.html`.

## Data Storage

All data is stored in your browser's `localStorage`. Use **Settings → Backup Data** regularly to keep a copy outside the browser.

Each person who opens the app gets their own isolated data — nothing is shared between users.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
