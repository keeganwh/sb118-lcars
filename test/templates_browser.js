// Making a template without first making a sim.
//
// The flow this covers used to be: start a sim you did not want, pick a
// mission and scene for it, write the body, convert it, delete the sim. The
// checks below are mostly about what should NOT happen -- no stray sim, no
// leftover state from whatever was open before.
//
//   python3 -m http.server 8129 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/templates_browser.js
//
const { chromium } = require('playwright');
(async () => {
  const errs = [], pass = [], fail = [];
  const ok = (c, l) => (c ? pass : fail).push(l);
  const b = await chromium.launch({ args:['--no-sandbox'], executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto('http://127.0.0.1:8129/LCARS.html');
  await p.evaluate(() => localStorage.setItem('lcars_mode_v1','local'));
  await p.goto('http://127.0.0.1:8129/LCARS.html');
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const m=document.getElementById('mo'); if(m) m.classList.add('hidden'); });

  // The button exists in Settings, with no sim open and none ever created.
  await p.evaluate(() => openSettings());
  await p.waitForTimeout(600);
  const btn = await p.evaluate(() => {
    const el = [...document.querySelectorAll('#set-templates button')]
      .find(b => /New Template/.test(b.textContent));
    return el ? { visible: !!el.offsetParent, text: el.textContent.trim() } : null;
  });
  ok(btn && btn.visible, 'Settings offers a New Template button');

  // Making one does not require a sim, a mission or a scene.
  const before = await p.evaluate(() => ({ tmpl: (S.templates||[]).length, docs: Object.keys(S.docs).length }));
  await p.evaluate(() => newTemplate());
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    document.getElementById('t-new-name').value = 'JP Opening Scene';
    document.getElementById('t-new-title').value = 'Untitled JP';
    doModal();
  });
  await p.waitForTimeout(700);
  const after = await p.evaluate(() => ({ tmpl: (S.templates||[]).length, docs: Object.keys(S.docs).length }));
  ok(after.tmpl === before.tmpl + 1, 'a template is created');
  ok(after.docs === before.docs, 'and no throwaway sim is created to carry it');

  // It opens in the sim editor, ready to write.
  ok(await p.evaluate(() => !!curTmplId && !curId), 'it opens in the sim editor as a template');
  ok(await p.evaluate(() => !document.getElementById('tmpl-banner').classList.contains('hidden')),
     'the template banner shows');
  ok(await p.evaluate(() => document.getElementById('doc-title').value === 'JP Opening Scene'),
     'named as given');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'editor'),
     'with the caret already in the editor');
  ok(await p.evaluate(() => document.getElementById('jp-bar').classList.contains('hidden')),
     'and no joint-sim turn bar left over');

  // Writing into it saves, and it comes back.
  await p.evaluate(() => { document.getElementById('editor').innerHTML = '<div>((Bridge))</div>'; flushSave(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => closeDoc());
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => (S.templates||[]).some(t => /Bridge/.test(t.content || ''))),
     'what you write into it is saved to the template');

  // And it is offered when starting a sim.
  await p.evaluate(() => showNewDoc());
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => /JP Opening Scene/.test(document.getElementById('mo-body').innerText)),
     'and the new template is offered in the New Sim window');

  pass.forEach(l => console.log('PASS: ' + l));
  fail.forEach(l => console.log('FAIL: ' + l));
  if (errs.length) console.log([...new Set(errs)].join('\n'));
  console.log('\n' + pass.length + ' passed, ' + fail.length + ' failed');
  await b.close();
  process.exit(fail.length || errs.length ? 1 : 0);
})();
