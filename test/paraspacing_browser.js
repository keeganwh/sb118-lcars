// Space between paragraphs: shown as a margin in the editor, copied out as a
// real blank line, and never doubled for a writer who also types blank lines.
//
//   python3 -m http.server 8131 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/paraspacing_browser.js
//
const { chromium } = require('playwright');

(async () => {
  const pass = [], fail = [], errors = [];
  const ok = (c, l) => (c ? pass : fail).push(l);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  try {
    const c = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const p = await c.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto('http://127.0.0.1:8131/LCARS.html');
    await p.evaluate(() => localStorage.setItem('lcars_mode_v1', 'local'));
    await p.goto('http://127.0.0.1:8131/LCARS.html');
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      if (typeof tourEnd === 'function' && document.getElementById('tour')) tourEnd(true);
      if (typeof closeModal === 'function') closeModal();
      mkDoc('Spacing', null, null);
    });
    await p.waitForTimeout(300);
    // Three paragraphs; the writer typed a blank line of their own between the
    // second and third.
    await p.evaluate(() => {
      document.getElementById('editor').innerHTML =
        '<div>First paragraph.</div><div>Second paragraph.</div><div><br></div><div>Third paragraph.</div>';
      flushSave();
    });

    const setGap = v => p.evaluate(v => { S.settings.prefs = Object.assign({}, S.settings.prefs, { paraSpacing: v }); applyPrefs(); }, v);
    const copied = async () => {
      await p.evaluate(() => copyPost());
      await p.waitForTimeout(250);
      return p.evaluate(async () => {
        const items = await navigator.clipboard.read();
        const html = await (await items[0].getType('text/html')).text();
        const text = await (await items[0].getType('text/plain')).text();
        return { html, text };
      });
    };
    const gapPx = () => p.evaluate(() => parseFloat(getComputedStyle(document.querySelectorAll('#editor > div')[1]).marginTop));
    const lineTops = () => p.evaluate(() => [...document.querySelectorAll('#editor > div')].map(d => Math.round(d.getBoundingClientRect().top)));

    // --- the default is unchanged --------------------------------------------
    const t0 = await lineTops();
    ok((await gapPx()) === 0, 'by default there is no gap between paragraphs');
    const c0 = await copied();
    ok(c0.text === 'First paragraph.\nSecond paragraph.\n\nThird paragraph.', 'and copying out is exactly as typed');

    // --- a full line ----------------------------------------------------------
    await setGap('full');
    const g = await gapPx();
    const fs = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('editor')).fontSize));
    ok(Math.abs(g - fs * 1.15) < 1, 'a full line puts one line’s height between paragraphs (' + g.toFixed(1) + 'px)');
    const t1 = await lineTops();
    ok(t1[1] - t1[0] > (t0[1] - t0[0]) + fs, 'and the second paragraph actually moves down');
    const c1 = await copied();
    ok(c1.text === 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.',
       'copying out turns each gap into a blank line — and adds none where the writer already typed one');
    const blanks = (c1.html.match(/<div>( |&nbsp;)<\/div>/g) || []).length;
    ok(blanks === 2, 'the HTML that reaches a mail client carries two real blank lines (' + blanks + ')');
    ok(Math.abs((t1[3] - t1[1]) - (t0[3] - t0[1])) <= 1, 'and a blank line the writer typed is not padded on top of');
    if (process.env.SHOT_DIR) await p.locator('#editor').screenshot({ path: process.env.SHOT_DIR + '/para-full.png' });

    // --- half a line ----------------------------------------------------------
    await setGap('half');
    ok(Math.abs((await gapPx()) - fs * 0.575) < 1, 'half a line is half that gap in the editor');
    ok((await copied()).text === 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.',
       'and still one whole blank line on the way out, since an email has no half lines');

    // --- the setting is saved from the Settings page --------------------------
    await p.evaluate(() => openSettings && openSettings());
    await p.waitForTimeout(400);
    const hasSel = await p.evaluate(() => !!document.getElementById('pf-ps'));
    ok(hasSel, 'Settings has the control');
    if (hasSel) {
      await p.selectOption('#pf-ps', 'none');
      await p.evaluate(() => saveSettingsPrefs());
      ok(await p.evaluate(() => getPrefs().paraSpacing === 'none'
                               && JSON.parse(localStorage.getItem('lcars_v1')).settings.prefs.paraSpacing === 'none'),
         'and saving it there sticks');
    }
  } catch (e) {
    fail.push('the run stopped early: ' + e.message.split('\n')[0]);
  }
  await browser.close();
  pass.forEach(l => console.log('PASS: ' + l));
  fail.forEach(l => console.log('FAIL: ' + l));
  errors.forEach(e => console.log('PAGE ERROR: ' + e));
  console.log('\n' + pass.length + ' passed, ' + fail.length + ' failed, ' + errors.length + ' page errors.');
  process.exit(fail.length || errors.length ? 1 : 0);
})();
