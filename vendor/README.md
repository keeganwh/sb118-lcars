# `vendor/` — how `live-bundle.js` is made

`../live-bundle.js` is **committed library code, not something anyone builds to
run LCARS.** It is the one exception to the no-build-step rule, decided
2026-10-04 (see `ROADMAP.md` → Decisions on record, and `CLAUDE.md` → What not
to touch).

**You do not need node, npm, or anything in this folder to work on LCARS.** The
app loads the built file with an ordinary `<script>` tag, exactly as it loads
`lcars-render.js`. Open the files and it works. That is the whole point.

## Why it exists

Live co-authoring on a joint sim needs a CRDT — the thing that lets two people
type into the same sim at once and merge the result without losing words. Yjs is
the solved, well-tested answer and **must not be hand-rolled**; the failure mode
of a home-made one is a lost sim, which is the single thing this app must never
do.

Yjs ships as npm packages, and this project deliberately has no npm and no build
step. So the packages are assembled **once, outside the project**, and the single
plain `.js` file that comes out is committed like any other file.

## What is in it

One global, `window.LCARSLive`, holding Yjs, its ProseMirror binding, and the
ProseMirror editor pieces. `live-bundle.entry.js` is the exact source — it names
every library that goes in and every name that comes out, so the bundle is
reproducible rather than a mystery blob.

Pinned versions live in `build.sh`. As built 2026-10-04:

| package | version |
|---|---|
| `yjs` | 13.6.33 |
| `y-prosemirror` | 1.3.7 |
| `y-protocols` | 1.0.7 |
| `prosemirror-model` | 1.25.12 |
| `prosemirror-state` | 1.4.4 |
| `prosemirror-view` | 1.42.6 |
| `prosemirror-keymap` | 1.2.3 |
| `prosemirror-commands` | 1.7.2 |
| `prosemirror-history` | 1.5.1 |
| `esbuild` (build tool only) | 0.28.2 |

~317 KB minified. It is served with the same `must-revalidate` cache header as
the hand-written scripts, so a rebuild reaches browsers immediately; an unchanged
file costs a 304 rather than a re-download.

## Rebuilding it — the deliberate cost

This is the errand accepted when the decision was made. It is **not** part of
anyone's normal workflow.

```
vendor/build.sh                                    # needs node + npm
NODE_PATH=/opt/node22/lib/node_modules node test/live_bundle_browser.js
```

`build.sh` installs into a throwaway directory **outside the repo**, so no
`package.json` or `node_modules` can end up committed. Then commit the changed
`../live-bundle.js` and say in the commit message which versions moved and why.

## Reviewing it

Nobody can read 317 KB of minified output, so the test stands in for reading it.
`test/live_bundle_browser.js` loads the **real committed file** in a real browser
and makes it prove:

- it attaches `LCARSLive` and leaks no other global except Yjs's own load guard;
- loaded into the real `LCARS.html`, it overwrites none of the app's own globals
  and raises no error;
- two documents edited independently **converge on the same text**, and neither
  side loses what the other typed;
- updates applied out of order, with a duplicate thrown in, give the same result
  — the property that lets updates travel over polling instead of a WebSocket;
- an editor mounts, and what is typed reaches both the DOM and the shared
  document.

Run it after every rebuild. A bundle that cannot pass it must not be committed.
