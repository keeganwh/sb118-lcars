// Serves a single self-contained LCARS.html.
//
// The app ships as three files so its views can share code, but the offline
// promise is "download one file and run it with no network at all". This route
// puts the three back together on demand: the stylesheet link becomes an inline
// <style>, the script tag becomes an inline <script>, and the result is byte-for
// byte the app that used to be committed as one file.
//
// The three sources are fetched from this same deployment rather than read off
// disk, so no bundling configuration is needed and the download always matches
// what is actually live.

const LINK_TAG = '<link rel="stylesheet" href="lcars.css">';
const SCRIPT_TAG = '<script src="lcars.js"></script>';

module.exports = async (req, res) => {
  const fwd = req.headers['x-forwarded-proto'];
  const proto = fwd ? fwd.split(',')[0].trim()
                    : (req.socket && req.socket.encrypted ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `${proto}://${host}`;

  try {
    const [html, css, js] = await Promise.all(
      ['/LCARS.html', '/lcars.css', '/lcars.js'].map(async p => {
        const r = await fetch(origin + p);
        if (!r.ok) throw new Error(`${p} responded ${r.status}`);
        return r.text();
      })
    );

    if (!html.includes(LINK_TAG) || !html.includes(SCRIPT_TAG)) {
      throw new Error('LCARS.html no longer has the expected link/script tags to inline');
    }
    // A literal </script> or </style> in the payload would close the tag early.
    // Neither file contains one today; refuse rather than emit a broken app.
    if (/<\/script/i.test(js) || /<\/style/i.test(css)) {
      throw new Error('source contains a closing tag that cannot be inlined safely');
    }

    // Replacer functions, not replacement strings: the app's own source contains
    // `$&` (in a regex-escaping helper), which String.replace would expand into
    // the matched tag and corrupt the inlined script.
    const out = html
      .replace(LINK_TAG, () => `<style>\n${css}</style>`)
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
