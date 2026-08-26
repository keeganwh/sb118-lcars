# USER_PROTOCOLS.md — My Operating Routine

_My personal playbook for working on LCARS with Claude. This is for **me** (the human), not for Claude. It's the repeatable routine so I don't have to re-figure-out my own process every time._

---

## 1. Services & accounts to have set up

Before a work session, make sure these are in place:

- **GitHub repo** — `keeganwh/sb118-lcars`. Pushing to `main` deploys to production.
- **Vercel** — the live app, at <https://sb118-lcars.vercel.app/>. GitHub Pages still serves the same `main` behind a notice pointing people at the new address.
- **Supabase** — project `nyjpqaelilrqzmnangft`, holding accounts and synced sims. Dashboard access still matters for the one case that isn't self-serve: a writer who forgot their PIN and never linked a Google or Discord account (Authentication → Users). The free tier pauses a project after ~1 week idle, so it may need waking after a quiet stretch.
- **My own LCARS account** — Writer ID + PIN. Nothing to configure per device any more; signing in is the whole setup.
- **A backup habit** — Settings → Your Account & Data exports a JSON file. Sync means my sims are no longer only in one browser, but a local backup is still the thing that survives an account problem.

---

## 2. What to hand Claude, and how

Start each session by pointing Claude at the docs, in this order:

1. **CLAUDE.md** — the hard rules and basics (Claude reads this automatically, but I confirm it's current).
2. **memory/MEMORY.md** → then the linked memory files — the running project state.
3. **ROADMAP.md** — what's outstanding. **Pick a batch, not a stray item.** Since 2026-08-24 the roadmap groups work into numbered batches by *code locality*, so one session loads one subsystem instead of three. Batches are ordered by score, but that order is a default — I reprioritise freely, and saying "let's do Batch 5 instead" is a normal thing to say.
4. **TECH_STACK.md** — only when the task touches architecture.

The August 2026 memory files hold the decisions behind the current architecture. Point Claude at them before any batch so they don't get re-argued from scratch — the platform plan and the views session always, plus recovery/deletion before anything touching accounts, auth or boot, Joint Posts before anything touching joint sims or the payload blob, and the real-time brief before simultaneous editing.

When I ask for a change, I hand over:

- **The symptom, not my guess at the cause** — e.g. "selecting text collapses after a second," not "fix restoreCaret." Claude can find the cause; I just describe what I see.
- **Where I saw it** — which view/panel, which button, what I clicked.
- **What "done" looks like** — the behaviour I expect afterward.

For anything visual, a screenshot beats a paragraph.

---

## 3. Keeping sessions lean / when to branch

- **One batch per session.** That's what the batches are for. Editor bugs OR sync work OR a new feature — not all three. Long mixed sessions bloat context and make commits messy.
- **A batch is a unit of context, not a contract.** If a batch turns out bigger than it looked, split it and say so in the handoff. If item one of a batch turns out gnarlier than expected, shipping it alone is better than dragging the rest along.
- **Commit after every change**, never batch unrelated fixes. This is already a hard rule (see CLAUDE.md) and it keeps history bisectable.
- **Work on `main` for small, safe, self-contained changes** — quick fixes I want live straight away.
- **Branch for anything else.** Large or multi-commit work, anything risky enough that I don't want it auto-deployed half-finished, and anything experimental. Branch name pattern: `claude/<short-topic>`; merge to `main` once it's proven. Sessions started from the web arrive on a branch already — that's the normal case now, not the exception.
- **Cut a version deliberately.** Version bumps are mine to trigger. When a batch of work is stable, I say "save new version X.Y" and Claude rolls the pending changelog entries into a clean release, bumps `APP_VERSION`, and updates `CHANGELOG.md`.

---

## 4. Writing good next-steps (end of session)

Before I stop, I leave the next session a clean runway. A good handoff note has:

- **State** — current version, whether there are pending (unreleased) changelog entries, what's deployed.
- **What just shipped** — one line each, most recent first.
- **What's next** — the specific task to pick up, with enough detail to start cold (this is what ROADMAP.md's "Done when…" is for).
- **Any landmine** — the thing that'll bite the next session if they don't know it. The standing ones are in `CLAUDE.md`; add anything new this session found.

I keep these in `memory/` (see the session log for the format) so they're portable across machines and committed to GitHub — not trapped in a local `~/.claude` folder.

---

## 5. Quick pre-flight checklist

- [ ] On `main` (or a deliberate `claude/*` branch)?
- [ ] Working tree clean before starting?
- [ ] Recent JSON backup exists?
- [ ] Session has one clear theme — ideally one batch?
- [ ] Batch picked, and its "read this first" memory files loaded?
- [ ] Every item in it has a "Done when…"?

---

## 6. Quick post-flight checklist

- [ ] Change committed (with the pending changelog entry, same commit)?
- [ ] Pushed to `main` (or the branch)?
- [ ] Verified in a browser — and on the live Vercel URL if it was a user-facing fix?
- [ ] Roadmap items checked off in the same commit as the change?
- [ ] Handoff note updated in `memory/` if the session did meaningful work?

---

## 7. Things that are mine to trigger, not Claude's

Some work sits outside the development queue and runs when I say so:

- **Version bumps.** "Save new version X.Y" — never unasked.
- **The positioning & pitch document.** Documenting LCARS's features and benefits against what people currently use to write sims (Google Docs, plain Gmail, Word), with the pushback I expect and my answers to it. Parallel to development and important, but not part of the batch queue. It feeds the SB118 HQ pitch and the guide's opening page.
- **Reprioritising batches.** The roadmap's order is a default. Reordering it is a normal Tuesday, not a re-plan.

---

## 8. Standing decisions I shouldn't have to re-explain

If Claude proposes any of these, point at the roadmap's "Decisions on record" rather than arguing it out again:

- The **single-file offline download is frozen** at v4.24. Don't shoehorn server-dependent features into it. A simplified "LCARS Lite" is the preferred future answer.
- **No character wiki import, no service record, no ribbons.** SB118 HQ owns character data; duplicating it makes integration harder.
- **No Edge Functions, no recovery email, no `service_role` key** in the repo or the app.
- **Writer ID + PIN stays the primary sign-in.** Google/Discord are a linked identity for recovery only; the fleet's own SSO is the likely long-term route.
