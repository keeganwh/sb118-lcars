# LCARS SB118 Writing Tool

A browser-based sim writing tool for [Starbase 118](https://www.starbase118.net/) — built specifically for the SB118 Play-by-Email (PBEM) format.

**Live at <https://sb118-lcars.vercel.app/>.**

## Features

- **Hierarchy** — organise your writing into Missions → Scenes → Sims
- **Script markers** — `::Action::`, `=/\= Comms =/\=`, `oO Thoughts Oo`, `((Location))`, `((OOC))` with colour-coded highlighting
- **Auto-formatting** — bold character names, bold locations, italic thoughts and OOCs, all optional
- **Character detection** — auto-detects character names and colour-codes them per sim
- **Character Manifest** — full character profiles with service records, postings, and ribbons
- **Sim Templates** — save and reuse common sim formats
- **Revision history** — snapshots on every save with restore
- **Full-text search** — across all sims
- **Academy Mode** — plain-text sims for training missions
- **Copy out clean** — a sim goes to the clipboard formatted and ready to paste into email or Discord
- **Accounts and sync** — sign in with your Writer ID and your sims follow you between devices
- **Offline mode** — use it with no account and no network at all
- **Backup** — full JSON export and restore

## How to Use

Open <https://sb118-lcars.vercel.app/> and either sign in with your Writer ID or choose offline-only.

Prefer to keep it on your own machine? **Settings → Download LCARS for offline use** gives you one self-contained file that works with no internet.

The user guide is at [/guide](https://sb118-lcars.vercel.app/guide).

## Data Storage

Your sims live in your browser, and — if you have an account — in the tool's own database so they follow you between devices. Nothing is shared between writers.

Use **Settings → Your Account & Data** to export a JSON backup now and then regardless.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
