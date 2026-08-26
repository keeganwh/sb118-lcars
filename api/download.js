// Serves a single self-contained LCARS.html.
//
// The app ships as several files so its pages can share code, but the offline
// promise is "download one file and run it with no network at all". This route
// puts them back together on demand: the stylesheet link becomes an inline
// <style>, each script tag becomes an inline <script>, and the result is
// byte-for-byte the app that used to be committed as one file.
//
// The sources are fetched from this same deployment rather than read off disk,
// so no bundling configuration is needed and the download always matches what
// is actually live.
//
// FROZEN AT v4.24 (decided 2026-08-24). Verified booting clean from file:// at
// 21d8aec, which is v4.24 plus the changes pending for the next version.
//
// This route is finished. It is not to be extended, and no feature is to be
// contorted to keep it working:
//   * Anything that needs the server is deliberately absent from the offline
//     copy — Joint Posts, share links, accounts, anything SB118 HQ.
//   * A new shared file is NOT to be added to the inline list below. If one
//     lands, this route REFUSES rather than growing a fourth inline. The
//     check at the end is what enforces that: without it the build succeeds
//     and silently ships an offline copy missing the new file, which is the
//     one failure nobody would notice.
//   * Failing is the intended end state, not a bug to fix by growing this
//     file. When it starts refusing, that is the signal to build LCARS Offline.
//
// If a genuinely offline LCARS is wanted later, the agreed answer is a
// purpose-built, deliberately pared-back "LCARS Offline" — not a bigger inliner.
// See ROADMAP.md -> Batch 12 (deferred, low priority) and TECH_STACK.md.
//
// Standing rule from 2026-08-26: LCARS Offline gets no NEW features, whatever
// lands online. Fixes and tweaks are fine.

const LINK_TAG = '<link rel="stylesheet" href="lcars.css">';
const RENDER_TAG = '<script src="lcars-render.js"></script>';
const SCRIPT_TAG = '<script src="lcars.js"></script>';

module.exports = async (req, res) => {
  const fwd = req.headers['x-forwarded-proto'];
  const proto = fwd ? fwd.split(',')[0].trim()
                    : (req.socket && req.socket.encrypted ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `${proto}://${host}`;

  try {
    const [html, css, render, js] = await Promise.all(
      ['/LCARS.html', '/lcars.css', '/lcars-render.js', '/lcars.js'].map(async p => {
        const r = await fetch(origin + p);
        if (!r.ok) throw new Error(`${p} responded ${r.status}`);
        return r.text();
      })
    );

    if (!html.includes(LINK_TAG) || !html.includes(RENDER_TAG) || !html.includes(SCRIPT_TAG)) {
      throw new Error('LCARS.html no longer has the expected link/script tags to inline');
    }
    // A literal </script> or </style> in the payload would close the tag early.
    // Neither file contains one today; refuse rather than emit a broken app.
    if (/<\/script/i.test(js) || /<\/script/i.test(render) || /<\/style/i.test(css)) {
      throw new Error('source contains a closing tag that cannot be inlined safely');
    }

    // Replacer functions, not replacement strings: the app's own source contains
    // `$&` (in a regex-escaping helper), which String.replace would expand into
    // the matched tag and corrupt the inlined script.
    const out = html
      .replace(LINK_TAG, () => `<style>\n${css}</style>`)
      .replace(RENDER_TAG, () => `<script>\n${render}</script>`)
      .replace(SCRIPT_TAG, () => `<script>\n${js}</script>`);

    // Nothing may be left pointing at a file that will not be next to the
    // download. Absolute URLs are fine (the fonts, which are meant to be
    // absent offline) and so is the data: favicon; a relative path is not.
    const dangling = [...out.matchAll(/<(?:script[^>]*\ssrc|link[^>]*\shref)=["']([^"']+)["']/gi)]
      .map(m => m[1])
      .filter(u => !/^(https?:)?\/\//i.test(u) && !/^data:/i.test(u));
    if (dangling.length) {
      throw new Error(
        'the offline copy would be missing ' + dangling.join(', ') + '. ' +
        'This route is frozen and does not grow a new inline — see the note at the top of this file.'
      );
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="LCARS.html"');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.status(200).send(out);
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send('Could not build the offline copy: ' + e.message);
  }
};
