// Deleting an account while the server is unreachable.
//
// The dangerous shape here is a half-done deletion: the local copy wiped and
// the writer signed out, while the server still holds an account that was never
// marked for deletion. That leaves a writer with nothing on the device and
// nothing scheduled -- the worst of both, and unrecoverable-looking.
// deleteAccount() is meant to refuse outright when it cannot reach the server.
//
//   python3 -m http.server 8132 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/account_offline_browser.js
//
const { chromium } = require('playwright');

const ME = { uid: 'uid-off', wid: 'D444' };

(async () => {
  const errors = [];
  const pass = [], fail = [];
  const ok = (c, l) => (c ? pass : fail).push(l);
  const browser = await chromium.launch({ args: ['--no-sandbox'],
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const c = await browser.newContext();

  // Reachable to begin with, so the app boots as a signed-in writer.
  let serverUp = true;
  await c.route('**/*', async route => {
    const url = route.request().url();
    if (!/supabase|SUPA/i.test(url) && !url.includes('/rest/v1') && !url.includes('/auth/v1'))
      return route.continue();
    if (!serverUp) return route.abort('internetdisconnected');
    if (url.includes('/rest/v1/writers') && route.request().method() === 'GET')
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify([{ display_name: 'Ensign Offline', deleted_at: null, link_prompt_seen: true }]) });
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  const p = await c.newPage();
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await p.goto('http://127.0.0.1:8132/LCARS.html');
  await p.evaluate(w => {
    localStorage.setItem('lcars_mode_v1', 'cloud');
    localStorage.setItem('lcars_auth_v1', JSON.stringify({ uid: w.uid, writerId: w.wid,
                                                           access_token: 't', refresh_token: 'r' }));
  }, ME);
  await p.goto('http://127.0.0.1:8132/LCARS.html');
  await p.waitForTimeout(800);

  // A sim to lose.
  await p.evaluate(() => { mkDoc('Something worth keeping', null, null); });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => Object.keys(S.docs).length === 1), 'the writer is signed in with a sim to lose');

  // Now the server goes away, and the writer asks to delete their account.
  serverUp = false;
  const alerts = [];
  p.on('dialog', d => { alerts.push(d.message()); d.dismiss().catch(() => {}); });
  await p.evaluate(() => { const m = document.getElementById('mo'); if (m) m.classList.add('hidden'); });
  await p.evaluate(() => confirmDeleteAccount());
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => /Delete account/i.test(document.getElementById('mo-title').textContent)),
     'the delete dialog opens');

  // Typing the wrong word is refused before anything is attempted.
  await p.evaluate(() => { document.getElementById('erase-confirm').value = 'delete me'; doModal(); });
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.getElementById('mo').classList.contains('hidden')),
     'a mistyped confirmation leaves the dialog open');

  await p.evaluate(() => { document.getElementById('erase-confirm').value = 'DELETE'; doModal(); });
  await p.waitForTimeout(1200);

  ok(alerts.some(m => /could not reach the server/i.test(m)),
     'with the server unreachable the writer is told nothing was deleted');
  ok(await p.evaluate(() => Object.keys(S.docs).length === 1),
     'and their sims are still there');
  ok(await p.evaluate(() => !!(JSON.parse(localStorage.getItem('lcars_auth_v1') || '{}').uid)),
     'and they are still signed in, rather than locked out of an account that was never marked');
  ok(await p.evaluate(() => !localStorage.getItem('lcars_delete_notice_v1')),
     'and no "your account is being deleted" notice is left behind to greet them');

  // Back online, the same action goes through.
  serverUp = true;
  await p.evaluate(() => { const m = document.getElementById('mo'); if (m) m.classList.add('hidden'); });
  let patched = null;
  await c.route('**/rest/v1/writers**', async route => {
    if (route.request().method() === 'PATCH') { patched = route.request().postData();
      return route.fulfill({ status: 204, body: '' }); }
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify([{ display_name: 'Ensign Offline', deleted_at: null, link_prompt_seen: true }]) });
  });
  await p.evaluate(() => deleteAccount());
  await p.waitForTimeout(1500);
  ok(!!patched && /deleted_at/.test(patched), 'reconnected, the deletion is stamped on the account');

  console.log('\n--- account deletion, offline ---');
  pass.forEach(l => console.log('PASS: ' + l));
  fail.forEach(l => console.log('FAIL: ' + l));
  if (errors.length) { console.log('\nPAGE ERRORS:'); [...new Set(errors)].slice(0, 10).forEach(e => console.log('  ' + e)); }
  console.log('\n' + pass.length + ' passed, ' + fail.length + ' failed');
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
