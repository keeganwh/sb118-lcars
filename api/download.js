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
//     lands, this route keeps serving what it can and the offline copy simply
//     stops gaining features; it does not grow a fourth inline.
//   * If the tags it looks for stop matching, it fails loudly rather than
//     emitting a broken app. That is the intended end state, not a bug to fix
//     by growing this file.
//
// If a genuinely offline LCARS is wanted later, the agreed answer is a
// purpose-built, deliberately simplified "LCARS Lite" — not a bigger inliner.
// See ROADMAP.md -> Batch 3 and TECH_STACK.md.

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

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="LCARS.html"');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.status(200).send(out);
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send('Could not build the offline copy: ' + e.message);
  }
};
