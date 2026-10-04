#!/usr/bin/env bash
# Rebuild ../live-bundle.js
#
# THIS IS NOT A BUILD STEP FOR THE APP. The app never runs this, and nobody
# needs it installed to work on LCARS -- `live-bundle.js` is committed. This is
# the one-off errand you run only when a library version needs to change, and
# the deliberate cost of the decision recorded in ROADMAP.md (2026-10-04).
#
# Needs node and npm, which the repo otherwise has no use for. It installs into
# a throwaway directory OUTSIDE the repo so no node_modules or package.json can
# end up committed.
#
#   vendor/build.sh
#
# Then commit the changed ../live-bundle.js, and say in the commit message which
# versions moved and why.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../live-bundle.js"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Pinned exactly. Bump a version here, run this, commit the result.
PKGS=(
  yjs@13.6.33
  y-prosemirror@1.3.7
  y-protocols@1.0.7
  prosemirror-model@1.25.12
  prosemirror-state@1.4.4
  prosemirror-view@1.42.6
  prosemirror-keymap@1.2.3
  prosemirror-commands@1.7.2
  prosemirror-history@1.5.1
  esbuild@0.28.2
)

echo "· installing into $WORK (outside the repo, thrown away after)"
printf '{ "name": "lcars-live-bundle-build", "private": true, "type": "module" }\n' > "$WORK/package.json"
( cd "$WORK" && npm install --silent --no-audit --no-fund "${PKGS[@]}" )

cp "$HERE/live-bundle.entry.js" "$WORK/entry.js"
echo "· bundling"
"$WORK/node_modules/.bin/esbuild" "$WORK/entry.js" \
  --bundle --format=iife --minify --target=es2019 \
  --outfile="$OUT"

echo "· wrote $OUT ($(wc -c < "$OUT") bytes)"
echo "· now run: test/live_bundle_browser.js   (proves it loads and merges)"
