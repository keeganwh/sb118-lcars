// Links in the editor: the Google Docs-style bubble.
//
// Driven with real clicks and real keys, because the whole feature is about
// where the caret lands. Checks that a click in a link opens the bubble under
// it, that its address opens and copies, that Edit, Ctrl+K and Remove work
// from it, that arrowing out closes it, and that a javascript: link is never
// followed.
//
//   python3 -m http.server 8131 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/links_browser.js
//
const { chromium } = require('playwright');

(async () => {
  const pass = [], fail = [], errors = [];
  const ok = (c, l) => (c ? pass : fail).push(l);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  try {
    const c = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8131' });
    await c.route(/^https:\/\/(starbase118\.net|example\.org)\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>away</p>' }));
    const p = await c.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto('http://127.0.0.1:8131/LCARS.html');
    await p.evaluate(() => localStorage.setItem('lcars_mode_v1', 'local'));
    await p.goto('http://127.0.0.1:8131/LCARS.html');
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      if (typeof tourEnd === 'function' && document.getElementById('tour')) tourEnd(true);
      if (typeof closeModal === 'function') closeModal();
      mkDoc('Link test', null, null);
    });
    await p.waitForTimeout(300);
    await p.evaluate(() => {
      document.getElementById('editor').innerHTML =
        '<div>See <a href="https://starbase118.net/" target="_blank">the fleet site</a> for more.</div>' +
        '<div>Plain words here to link.</div>' +
        '<div>A <a href="javascript:alert(1)">bad link</a> pasted in.</div>';
      flushSave();
    });
    const bub = () => p.evaluate(() => {
      const b = document.getElementById('link-bub');
      if (!b || b.classList.contains('hidden')) return null;
      const r = b.getBoundingClientRect();
      return { text: b.textContent.replace(/\s+/g, ' ').trim(), top: r.top, left: r.left, right: r.right, bottom: r.bottom,
               form: !!b.querySelector('.lb-form') };
    });
    const link1 = p.locator('#editor a', { hasText: 'the fleet site' });

    // --- clicking a link opens the bubble ------------------------------------
    await link1.click();
    await p.waitForTimeout(150);
    let b = await bub();
    const lr = await link1.boundingBox();
    ok(!!b && /starbase118\.net/.test(b.text), 'clicking a link opens a bubble showing its address');
    ok(!!b && b.top >= lr.y + lr.height && b.top - (lr.y + lr.height) < 20, 'and the bubble sits just under the link');
    ok(await p.evaluate(() => !document.getElementById('mo') || document.getElementById('mo').classList.contains('hidden')),
       'with no dialog over the sim');

    // --- open, copy ----------------------------------------------------------
    const [tab] = await Promise.all([c.waitForEvent('page', { timeout: 3000 }), p.click('#link-bub .lb-url a')]);
    ok(!!tab && /starbase118\.net/.test(tab.url()), 'clicking the address opens it in a new tab');
    await tab.close();
    await link1.click();
    await p.waitForTimeout(100);
    await p.click('#link-bub button[title="Copy the address"]');
    await p.waitForTimeout(150);
    ok((await p.evaluate(() => navigator.clipboard.readText())) === 'https://starbase118.net/', 'Copy puts the address on the clipboard');

    // --- arrowing out closes it ---------------------------------------------
    await link1.click();
    await p.keyboard.press('End');
    await p.waitForTimeout(150);
    ok(!(await bub()), 'moving the caret out of the link closes the bubble');
    await p.keyboard.press('Home');
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(150);
    ok(/starbase118/.test((await bub() || {}).text || ''), 'and arrowing into a link opens it, the same as a click');

    // --- Ctrl+click ----------------------------------------------------------
    await p.keyboard.press('Escape');
    const [tab2] = await Promise.all([c.waitForEvent('page', { timeout: 3000 }),
                                      link1.click({ modifiers: ['Control'] })]);
    ok(!!tab2 && /starbase118/.test(tab2.url()), 'Ctrl+click opens the link straight away');
    await tab2.close();

    // --- edit from the bubble ------------------------------------------------
    await link1.click();
    await p.waitForTimeout(100);
    await p.click('#link-bub button[title^="Edit link"]');
    b = await bub();
    ok(!!b && b.form && await p.evaluate(() => document.activeElement.id === 'lb-url'),
       'Edit turns the bubble into a form, with the address ready to type over');
    await p.keyboard.type('example.org/page');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => !!document.querySelector('#editor a[href="https://example.org/page"]')
                              && document.querySelector('#editor a[href="https://example.org/page"]').textContent === 'the fleet site'),
       'Enter applies it, and a bare address becomes a working https link with its text kept');

    // --- Ctrl+K on a selection ----------------------------------------------
    await p.evaluate(() => {
      const t = [...document.querySelectorAll('#editor div')][1].firstChild;
      const at = t.textContent.indexOf('words');
      const r = document.createRange(); r.setStart(t, at); r.setEnd(t, at + 5);
      document.getElementById('editor').focus();
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    await p.keyboard.press('Control+k');
    await p.waitForTimeout(150);
    b = await bub();
    ok(!!b && b.form && await p.evaluate(() => document.getElementById('lb-text').disabled
                                             && document.getElementById('lb-text').value === 'words'),
       'Ctrl+K on a selection opens the form beside it, using the selected words');
    await p.keyboard.type('https://example.org/words');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => { const a = document.querySelector('#editor a[href="https://example.org/words"]');
                                return !!a && a.textContent === 'words'; }), 'and links exactly that text');

    // --- Ctrl+K with nothing selected ---------------------------------------
    await p.evaluate(() => {
      const t = [...document.querySelectorAll('#editor div')][1].lastChild;
      const r = document.createRange(); r.setStart(t, t.textContent.length); r.collapse(true);
      document.getElementById('editor').focus();
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    await p.keyboard.press('Control+k');
    await p.waitForTimeout(150);
    await p.fill('#lb-text', ' the guide');
    await p.fill('#lb-url', 'https://example.org/guide');
    await p.click('#link-bub .btn-p');
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => /the guide/.test((document.querySelector('#editor a[href="https://example.org/guide"]') || {}).textContent || '')),
       'with nothing selected, it inserts a new link with the text given');

    // --- Escape cancels a form without changing anything --------------------
    const before = await p.evaluate(() => document.getElementById('editor').innerHTML);
    await p.locator('#editor a', { hasText: 'words' }).click();
    await p.keyboard.press('Control+k');
    await p.waitForTimeout(100);
    await p.keyboard.type('zzz');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(150);
    ok(!(await bub()) && (await p.evaluate(() => document.getElementById('editor').innerHTML)) === before,
       'Escape closes the form and changes nothing');

    // --- remove ---------------------------------------------------------------
    await p.locator('#editor a', { hasText: 'words' }).click();
    await p.waitForTimeout(100);
    await p.click('#link-bub button[title="Remove link"]');
    await p.waitForTimeout(150);
    ok(await p.evaluate(() => !document.querySelector('#editor a[href="https://example.org/words"]')
                              && /Plain words here/.test(document.getElementById('editor').textContent)),
       'Remove takes the link off and keeps the words');

    // --- a javascript: link is shown, never followed ------------------------
    await p.locator('#editor a', { hasText: 'bad link' }).click();
    await p.waitForTimeout(100);
    ok(await p.evaluate(() => !document.querySelector('#link-bub .lb-url a') && /javascript:/.test(document.getElementById('link-bub').textContent)),
       'a javascript: link shows its address as text, not as something to click');
    let opened = false;
    c.once('page', () => { opened = true; });
    await p.locator('#editor a', { hasText: 'bad link' }).click({ modifiers: ['Control'] });
    await p.waitForTimeout(400);
    ok(!opened, 'and Ctrl+click will not follow it');

    // --- saved -----------------------------------------------------------------
    await p.waitForTimeout(1500);
    ok(await p.evaluate(() => /example\.org\/page/.test(S.docs[curId].content) && /example\.org\/guide/.test(S.docs[curId].content)),
       'the changes are saved into the sim');

    // --- on a phone, the bubble stays on screen ------------------------------
    await p.setViewportSize({ width: 390, height: 700 });
    await p.waitForTimeout(300);
    await p.locator('#editor a', { hasText: 'the fleet site' }).click();
    await p.waitForTimeout(150);
    b = await bub();
    ok(!!b && b.left >= 0 && b.right <= 390 && b.bottom <= 700, 'on a phone the bubble fits the screen');
    if (process.env.SHOT_DIR) await p.screenshot({ path: process.env.SHOT_DIR + '/link-phone.png' });
    await p.setViewportSize({ width: 1280, height: 860 });
    await p.waitForTimeout(300);
    await p.locator('#editor a', { hasText: 'the fleet site' }).click();
    await p.waitForTimeout(150);
    ok(/example\.org\/page/.test((await bub() || {}).text || ''),
       'clicking a link where the caret already is still opens the bubble');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(100);
    await p.locator('#editor a', { hasText: 'the fleet site' }).click();
    await p.waitForTimeout(150);
    ok(!!(await bub()), 'including straight after Escape closed it');
    if (process.env.SHOT_DIR) await p.screenshot({ path: process.env.SHOT_DIR + '/link-desk.png' });
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
