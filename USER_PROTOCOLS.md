# USER_PROTOCOLS.md — My Operating Routine

_My personal playbook for working on LCARS with Claude. This is for **me** (the human), not for Claude. It's the repeatable routine so I don't have to re-figure-out my own process every time._

---

## 1. Services & accounts to have set up

Before a work session, make sure these are in place:

- **GitHub repo** — `keeganwh/sb118-lcars`. `main` auto-deploys to GitHub Pages, so anything I push to `main` goes live in ~30 seconds. Treat `main` as production.
- **GitHub Pages** — the live app. Confirm it's serving from `main`.
- **A GitHub Personal Access Token (PAT)** — for Gist cloud sync inside the app. It's stored per-browser and is **not** synced, so I re-enter it on each new device. Keep the token and the Gist ID somewhere I can find them (password manager).
- **A backup habit** — Settings → Backup Data exports a JSON file. Do this regularly; localStorage can be wiped by a browser clear. My live dataset is close to the ~1 MB Gist ceiling, so an off-Gist backup matters.

---

## 2. What to hand Claude, and how

Start each session by pointing Claude at the docs, in this order:

1. **CLAUDE.md** — the hard rules and basics (Claude reads this automatically, but I confirm it's current).
2. **memory/MEMORY.md** → then the linked memory files — the running project state.
3. **ROADMAP.md** — what's outstanding, so we pick the next real task.
4. **TECH_STACK.md** — only when the task touches architecture.

When I ask for a change, I hand over:

- **The symptom, not my guess at the cause** — e.g. "selecting text collapses after a second," not "fix restoreCaret." Claude can find the cause; I just describe what I see.
- **Where I saw it** — which view/panel, which button, what I clicked.
- **What "done" looks like** — the behaviour I expect afterward.

For anything visual, a screenshot beats a paragraph.

---

## 3. Keeping sessions lean / when to branch

- **One theme per session.** Editor bugs OR sync work OR a new feature — not all three. Long mixed sessions bloat context and make commits messy.
- **Commit after every change**, never batch unrelated fixes. This is already a hard rule (see CLAUDE.md) and it keeps history bisectable.
- **Work on `main` for small, safe, self-contained changes** — the normal flow, since I want them live fast.
- **Branch when** a change is (a) large or multi-commit, (b) risky enough that I don't want it auto-deployed half-finished, or (c) experimental and might get thrown away. Branch name pattern: `claude/<short-topic>`. Merge to `main` only when it's proven.
- **Cut a version deliberately.** Version bumps are mine to trigger. When a batch of work is stable, I say "save new version X.Y" and Claude rolls the pending changelog entries into a clean release, bumps `APP_VERSION`, and updates `CHANGELOG.md`.

---

## 4. Writing good next-steps (end of session)

Before I stop, I leave the next session a clean runway. A good handoff note has:

- **State** — current version, whether there are pending (unreleased) changelog entries, what's deployed.
- **What just shipped** — one line each, most recent first.
- **What's next** — the specific task to pick up, with enough detail to start cold (this is what ROADMAP.md's "Done when…" is for).
- **Any landmine** — the thing that'll bite the next session if they don't know it (e.g. "data is near the 1 MB Gist limit," "don't recreate the `main-ikuxoc` branch").

I keep these in `memory/` (see the session log for the format) so they're portable across machines and committed to GitHub — not trapped in a local `~/.claude` folder.

---

## 5. Quick pre-flight checklist

- [ ] On `main` (or a deliberate `claude/*` branch)?
- [ ] Working tree clean before starting?
- [ ] Recent JSON backup exists?
- [ ] Session has one clear theme?
- [ ] Roadmap item picked, with a "Done when…"?

---

## 6. Quick post-flight checklist

- [ ] Change committed (with the pending changelog entry, same commit)?
- [ ] Pushed to `main` (or the branch)?
- [ ] Pages deploy verified live if it was a user-facing fix?
- [ ] Handoff note updated in `memory/` if the session did meaningful work?
