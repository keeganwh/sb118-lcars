// Blank lines and paste: a paste no longer collapses blank lines anywhere on
// its own. It offers to tidy what was pasted, and only that; the Tidy button
// does the whole sim when asked. Both can be undone.
//
//   python3 -m http.server 8131 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/tidy_browser.js
//
const { chromium } = require('playwright');

(async () => {
  const pass = [], fail = [], errors = [];
  const ok = (c, l) => (c ? pass : fail).push(l);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  try {
    const c = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const p = await c.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto('http://127.0.0.1:8131/LCARS.html');
    await p.evaluate(() => localStorage.setItem('lcars_mode_v1', 'local'));
    await p.goto('http://127.0.0.1:8131/LCARS.html');
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      if (typeof tourEnd === 'function' && document.getElementById('tour')) tourEnd(true);
      if (typeof closeModal === 'function') closeModal();
      mkDoc('Tidy', null, null);
    });
    await p.waitForTimeout(300);
    // A deliberate double blank line between A and B.
    await p.evaluate(() => {
      document.getElementById('editor').innerHTML =
        '<div>Alpha line.</div><div><br></div><div><br></div><div>Bravo line.</div>';
      flushSave();
    });
    const lines = () => p.evaluate(() => [...document.getElementById('editor').children]
      .map(d => (d.textContent || '').trim() || '_').join('|'));
    const paste = html => p.evaluate(h => {
      const ed = document.getElementById('editor');
      const ec = document.getElementById('ec'), top = ec.scrollTop;
      ed.focus({ preventScroll: true });
      ec.scrollTop = top;
      const r = document.createRange(); r.selectNodeContents(ed.lastElementChild); r.collapse(false);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      const dt = new DataTransfer();
      dt.setData('text/html', h); dt.setData('text/plain', 'x');
      ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, html);
    const banner = () => p.evaluate(() => { const b = document.getElementById('paste-clean-banner'); return b ? b.textContent.trim() : ''; });

    // --- a paste with no runs: nothing offered, nothing changed --------------
    await paste('<p>Charlie line.</p>');
    await p.waitForTimeout(200);
    ok((await lines()) === 'Alpha line.|_|_|Bravo line.Charlie line.' || /Alpha line\.\|_\|_\|Bravo/.test(await lines()),
       'a paste leaves the writer’s own double blank line alone: ' + await lines());
    ok(!(await banner()), 'and a paste with no extra blank lines offers nothing');

    // --- a paste WITH runs: offered, not done --------------------------------
    await paste('<p>((Ten Forward)) Delta.</p><p></p><p></p><p></p><p>::Echo nods:: Echo.</p>');
    await p.waitForTimeout(200);
    const afterPaste = await lines();
    ok(/Delta\.\|_\|_\|_\|::Echo nods:: Echo\./.test(afterPaste), 'pasted blank lines arrive as they were, not silently removed: ' + afterPaste);
    ok(/extra blank lines/.test(await banner()) && /Tidy them/.test(await banner()), 'and LCARS offers to tidy them');

    // Wait as a person would. The formatting pass rebuilds the editor's
    // elements about half a second after a paste; clicking straight away, as
    // this test first did, never saw the bug where Tidy them then did nothing.
    // The formatting pass waits until the caret leaves the editor, which is
    // exactly what reaching for the banner does.
    await p.evaluate(() => { getSelection().removeAllRanges(); document.getElementById('editor').blur(); });
    await p.waitForTimeout(1500);
    const look = await p.evaluate(() => {
      const b = document.getElementById('paste-clean-banner'), ec = document.getElementById('ec');
      const r = b.getBoundingClientRect(), e = ec.getBoundingClientRect();
      const cs = getComputedStyle(b), root = getComputedStyle(document.documentElement);
      return { nearBottom: r.bottom > innerHeight - 140 && r.bottom < innerHeight,
               centred: Math.abs((r.left + r.width / 2) - (e.left + e.width / 2)) < 4,
               ink: cs.color, wantInk: root.getPropertyValue('--on-ac').trim() };
    });
    if (process.env.SHOT_DIR) await p.screenshot({ path: process.env.SHOT_DIR + '/tidy-bar.png' });
    ok(look.nearBottom && look.centred, 'the offer is a standalone bar near the bottom, centred on the editor');
    ok(!!look.wantInk, 'and its text uses the accent’s own ink colour (' + look.ink + ')');
    await p.click('#paste-clean-banner button:has-text("Tidy them")');
    await p.waitForTimeout(200);
    const tidied = await lines();
    ok(/Delta\.\|_\|::Echo nods:: Echo\./.test(tidied), 'Tidy them collapses the pasted run to one blank line: ' + tidied);
    ok(/^Alpha line\.\|_\|_\|Bravo/.test(tidied), 'and leaves the writer’s own double blank line, outside the paste, alone');
    ok(/tidied/.test(await banner()) && /Undo/.test(await banner()), 'with an Undo on offer');
    await p.click('#paste-clean-banner .pcb-undo');
    await p.waitForTimeout(200);
    ok((await lines()) === afterPaste, 'and Undo puts it back exactly');

    // --- the whole-sim Tidy button -------------------------------------------
    await p.click('#tbb-tidy');
    await p.waitForTimeout(200);
    const all = await lines();
    ok(!/_\|_/.test(all), 'the Tidy button collapses every run in the sim: ' + all);
    await p.waitForTimeout(1500);
    ok(await p.evaluate(() => !/<div><br><\/div><div><br><\/div>/.test(S.docs[curId].content)), 'and the tidied sim is saved');
    await p.click('#tbb-tidy');
    await p.waitForTimeout(200);
    ok(/No extra blank lines/.test(await p.evaluate(() => (document.getElementById('lcars-toast') || {}).textContent || '')),
       'pressing it again says there is nothing to tidy');

    // --- in a long sim, scrolled down: the banner must still be SEEN ---------
    // The bug a real test found: the banner lived inside the scrolling area,
    // so pasting far down a sim put it above the visible part.
    await p.evaluate(() => {
      const ed = document.getElementById('editor');
      ed.innerHTML = Array.from({ length: 120 }, (_, i) => '<div>Line ' + i + ' of a long sim.</div>').join('');
      const ec = document.getElementById('ec'); ec.scrollTop = ec.scrollHeight;
    });
    await paste('<p>Foxtrot.</p><p></p><p></p><p></p><p>Golf.</p>');
    await p.waitForTimeout(250);
    const seen = await p.evaluate(() => {
      const b = document.getElementById('paste-clean-banner'); if (!b) return 'no banner';
      const r = b.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + 10, r.top + r.height / 2);
      return (r.top >= 0 && r.bottom <= innerHeight && r.height > 0 && b.contains(hit)) ? 'visible' : 'off-screen ' + Math.round(r.top);
    });
    ok(seen === 'visible', 'scrolled to the bottom of a long sim, the offer is on screen and clickable: ' + seen);
    ok(await p.evaluate(() => document.getElementById('ec').scrollTop > 500), 'and the sim is still scrolled where the writer was');
    if (process.env.SHOT_DIR) await p.screenshot({ path: process.env.SHOT_DIR + '/tidy-long.png' });

    // --- Ctrl+Z undoes a tidy -------------------------------------------------
    await p.click('#tbb-tidy');
    await p.waitForTimeout(200);
    const tidiedLong = await lines();
    ok(!/Foxtrot\.\|_\|_/.test(tidiedLong), 'Tidy collapses the pasted run');
    await p.evaluate(() => document.getElementById('editor').focus());
    await p.keyboard.press('Control+z');
    await p.waitForTimeout(200);
    ok(/Foxtrot\.\|_\|_\|_\|Golf\./.test(await lines()), 'and Ctrl+Z brings the blank lines back');

    // --- a stale undo can never restore old text ------------------------------
    await p.click('#tbb-tidy');
    await p.waitForTimeout(200);
    await p.evaluate(() => {
      const ed = document.getElementById('editor');
      const r = document.createRange(); r.selectNodeContents(ed.lastElementChild); r.collapse(false);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    await p.keyboard.type(' typed after');
    await p.waitForTimeout(150);
    ok(await p.evaluate(() => !document.getElementById('paste-clean-banner') && !_pasteCleanSnap),
       'typing after a tidy drops its undo, so it cannot throw the typing away');
    await p.keyboard.press('Control+z');
    await p.waitForTimeout(200);
    ok(!/Foxtrot\.\|_\|_\|_/.test(await lines()), 'and Ctrl+Z then goes back to being the ordinary undo');
    const otherId = await p.evaluate(() => {
      document.getElementById('editor').innerHTML = '<div>a</div><div><br></div><div><br></div><div>b</div>';
      tidyBlankLines(); const first = curId; mkDoc('Other sim', null, null); return first;
    });
    await p.waitForTimeout(300);
    await p.evaluate(() => undoPasteClean());
    ok(await p.evaluate(id => !/<div>a<\/div>/.test(document.getElementById('editor').innerHTML) && curId !== id, otherId),
       'and an undo left over from another sim is never applied to this one');

    // --- on a phone, it lives in the Format panel ----------------------------
    await p.setViewportSize({ width: 390, height: 700 });
    await p.waitForTimeout(400);
    ok(await p.evaluate(() => !!document.querySelector('#tb-dd-fmt #tbb-tidy')
                              && /Tidy blank lines/.test(document.getElementById('tbb-tidy').textContent)
                              && document.querySelectorAll('#tbb-tidy').length === 1),
       'on a phone the one Tidy button moves into the Format panel, labelled');
    await p.setViewportSize({ width: 1280, height: 860 });
    await p.waitForTimeout(400);
    ok(await p.evaluate(() => !document.querySelector('#tb-dd-fmt #tbb-tidy')
                              && document.getElementById('tbb-tidy').textContent.trim() === 'Tidy'),
       'and goes back to the toolbar on a computer');
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
