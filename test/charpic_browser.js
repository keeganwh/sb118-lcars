// Character pictures from a web address.
//
// Four hosts, intercepted: one that allows copying (CORS), one that only allows
// DISPLAYING -- the SB118 wiki's case, which used to fail outright -- one that
// refuses everything, and a web page rather than an image. Each must end in the
// right place: a stored copy, a link, or an explanation that says what to do.
//
//   python3 -m http.server 8131 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/charpic_browser.js
//
const { chromium } = require('playwright');

// A 2x2 PNG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const pass = [], fail = [], errors = [];
  const ok = (c, l) => (c ? pass : fail).push(l);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const referers = [];
  try {
    const c = await browser.newContext();
    await c.route(/https:\/\/(cors|blocked|page)\.example\//, route => {
      const u = new URL(route.request().url());
      referers.push(route.request().headers()['referer'] || '');
      if (u.host === 'cors.example')   return route.fulfill({ status: 200, contentType: 'image/png', body: PNG, headers: { 'access-control-allow-origin': '*' } });
      // (Playwright adds CORS to whatever it fulfils, so nocors is served for real below.)
      if (u.host === 'blocked.example') return route.fulfill({ status: 403, contentType: 'text/plain', body: 'no' });
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<html>a page</html>' });
    });
    const p = await c.newPage();
    p.on('pageerror', e => errors.push(e.message));
    const alerts = [];
    p.on('dialog', d => { alerts.push(d.message()); d.dismiss(); });
    await p.goto('http://127.0.0.1:8131/LCARS.html');
    await p.evaluate(() => localStorage.setItem('lcars_mode_v1', 'local'));
    await p.goto('http://127.0.0.1:8131/LCARS.html');
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      if (typeof tourEnd === 'function' && document.getElementById('tour')) tourEnd(true);
      if (typeof closeModal === 'function') closeModal();
      const ch = claimChar('Jaxa Rell'); persist();
      openManifest(); selectCharacter(ch.id); _manifestActiveTab = 'edit'; renderCharProfile(ch.id);
    });
    await p.waitForTimeout(400);

    const tryUrl = async url => {
      alerts.length = 0;
      await p.evaluate(() => { _manifestActiveTab = 'edit'; renderCharProfile(_curCharId); });
      await p.fill('#cm-pic-url', url);
      await p.click('.cm-pic-urlrow button');
      await p.waitForTimeout(900);
      return p.evaluate(() => {
        const ch = S.characters[_curCharId];
        const im = document.querySelector('.cm-bio-avatar img');
        return { stored: ch.pictureDataUrl || '', shown: !!im && im.complete && im.naturalWidth > 0,
                 noRef: !!im && im.getAttribute('referrerpolicy') === 'no-referrer' };
      });
    };

    const a = await tryUrl('https://cors.example/a.png');
    ok(a.stored.startsWith('data:image/jpeg'), 'a host that allows copying: the picture is resized and stored');
    ok(a.shown, 'and it shows, decoded, in the profile');

    await p.evaluate(() => removeCharPic());
    // Served by a real server on another origin, with no CORS header. A routed
    // response cannot stand in here: Playwright satisfies CORS for anything it
    // fulfils, so the copy would succeed and the test would prove nothing.
    const NOCORS = 'http://localhost:8132/img/character.webp';
    const b = await tryUrl(NOCORS);
    ok(b.stored === NOCORS, 'a host that only allows displaying — the wiki case — is linked rather than refused');
    ok(b.shown, 'and the linked picture actually decodes and shows');
    ok(b.noRef, 'sent with no referrer, which is what hotlink protection usually keys on');
    ok(!alerts.length && /linked from where it lives/.test(await p.evaluate(() => document.getElementById('lcars-toast').textContent)),
       'the writer is told it is a link, and what that means');
    

    await p.evaluate(() => removeCharPic());
    await tryUrl('https://blocked.example/c.jpg');
    ok(/Upload instead/.test(alerts.join()) && /block/.test(alerts.join()), 'a host that refuses everything gets an explanation and a way forward');
    ok(await p.evaluate(() => !S.characters[_curCharId].pictureDataUrl), 'and nothing is stored');
    ok(referers.length >= 2 && referers.every(r => !r), 'no request for a picture carried a referrer (' + referers.length + ' checked)');

    await tryUrl('https://page.example/wiki/Jaxa_Rell');
    ok(/web page, not a picture/.test(alerts.join()) && /Copy image address/.test(alerts.join()),
       'a web page address is recognised as one, and the writer told how to get the image address');

    await tryUrl('javascript:alert(1)');
    ok(/does not look like a web address/.test(alerts.join()), 'anything that is not http(s) is refused before loading');
    ok(await p.evaluate(() => { S.characters[_curCharId].pictureDataUrl = 'javascript:alert(1)'; return charPicSrc(S.characters[_curCharId]) === ''; }),
       'and a bad value already in stored data is never rendered as an image source');
  } catch (e) {
    fail.push('the run stopped early: ' + e.message);
  }
  await browser.close();
  pass.forEach(l => console.log('PASS: ' + l));
  fail.forEach(l => console.log('FAIL: ' + l));
  errors.forEach(e => console.log('PAGE ERROR: ' + e));
  console.log('\n' + pass.length + ' passed, ' + fail.length + ' failed, ' + errors.length + ' page errors.');
  process.exit(fail.length || errors.length ? 1 : 0);
})();
