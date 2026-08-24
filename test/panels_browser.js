// The left sidebar booted collapsed however often it was opened.
//
// The panel toggles persisted locally but never synced, and adoptCloudState()
// replaces S.settings wholesale from the account -- so a stale value on the
// server was re-imposed on every load. The account always won, and the account
// was never told.
//
//   python3 -m http.server 8129 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/panels_browser.js
const { chromium } = require('playwright');
const SERVER = { settings: { sidebarOpen: false, charsOpen: true, theme: 'dark', prefs: {}, myChars: [] },
                 docs: { d1: { id:'d1', title:'A sim', content:'', chars:[], myChars:[], charColors:{}, status:'active' } },
                 missions: {}, scenes: {}, characters: {} };
(async () => {
  const pass = [], fail = [], errs = [];
  const ok = (c,l)=>(c?pass:fail).push(l);
  const b = await chromium.launch({ args:['--no-sandbox'], executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext();
  let lastPush = null;
  await ctx.route('**/*', async route => {
    const url = route.request().url();
    if (!url.includes('/rest/v1') && !url.includes('/auth/v1')) return route.continue();
    let out = [];
    if (url.includes('/rest/v1/state')) {
      if (route.request().method() === 'GET') out = [{ payload: SERVER, updated_at: new Date().toISOString() }];
      else { lastPush = JSON.parse(route.request().postData()).payload; out = {}; }
    } else if (url.includes('/rpc/')) out = null;
    await route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(out) });
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto('http://127.0.0.1:8129/LCARS.html');
  await p.evaluate(() => {
    localStorage.setItem('lcars_mode_v1','cloud');
    localStorage.setItem('lcars_auth_v1', JSON.stringify({uid:'u1',writerId:'A111',access_token:'t',refresh_token:'r'}));
  });
  await p.goto('http://127.0.0.1:8129/LCARS.html');
  await p.waitForTimeout(1800);
  await p.evaluate(()=>{const m=document.getElementById('mo'); if(m) m.classList.add('hidden');});

  ok(await p.evaluate(() => S.settings.sidebarOpen === false),
     'the account copy of the setting wins over this browser (the cause)');

  // Open it, as the user does.
  await p.evaluate(() => { if (!S.settings.sidebarOpen) toggleSidebar(); });
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => S.settings.sidebarOpen === true), 'opening it sets the flag');
  ok(await p.evaluate(() => !document.getElementById('sidebar').classList.contains('collapsed')),
     'and the sidebar is open on screen');

  // Does that choice reach the account?
  await p.waitForTimeout(6000);
  ok(lastPush && lastPush.settings && lastPush.settings.sidebarOpen === true,
     'and opening the sidebar reaches the account, so it is not undone on the next load');

  // And the panel state should follow an adopt without needing a reload.
  await p.evaluate(() => adoptCloudState({ ...JSON.parse(JSON.stringify(S)),
                                           settings: { ...S.settings, sidebarOpen: false } }));
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('sidebar').classList.contains('collapsed')),
     'adopting an account copy repaints the panels rather than waiting for a reload');

  pass.forEach(l=>console.log('PASS: '+l));
  fail.forEach(l=>console.log('FAIL: '+l));
  if (errs.length) console.log([...new Set(errs)].join('\n'));
  console.log('\n'+pass.length+' passed, '+fail.length+' failed');
  await b.close();
  process.exit(fail.length?1:0);
})();
