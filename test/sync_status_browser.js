// Status changes sync at once, and the status bar says whether they did.
//
// A status change used to stop at persist(): the account heard about it on the
// writer's next keystroke, and nothing on screen said either way. This drives
// the three ways a status changes -- the editor's Status dropdown, the posted
// date, and the sidebar's context menu -- against an intercepted Supabase, so
// the real fetch code runs, and checks that the blob reached the server with
// the new status in it, and that the writer was told so.
//
//   python3 -m http.server 8131 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/sync_status_browser.js
//
const { chromium } = require('playwright');

const ME = { uid: 'uid-sync', wid: 'Y123' };

async function ctxFor(browser, net, errors, cloud) {
  const c = await browser.newContext();
  await c.route('**/*', async route => {
    const url = route.request().url();
    if (!url.includes('/rest/v1') && !url.includes('/auth/v1') && !url.includes('/storage/v1')) return route.continue();
    const m = route.request().method();
    if (url.includes('/rest/v1/state') && m === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      if (net.down) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Service unavailable"}' });
      net.posts.push(body.payload);
      return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    const out = url.includes('/rpc/my_role') ? '"writer"' : '[]';
    return route.fulfill({ status: 200, contentType: 'application/json', body: out });
  });
  const p = await c.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('http://127.0.0.1:8131/LCARS.html');
  await p.evaluate(([w, cloud]) => {
    localStorage.setItem('lcars_mode_v1', cloud ? 'cloud' : 'local');
    if (cloud) localStorage.setItem('lcars_auth_v1', JSON.stringify({ uid: w.uid, writerId: w.wid, access_token: 't', refresh_token: 'r' }));
  }, [ME, cloud]);
  await p.goto('http://127.0.0.1:8131/LCARS.html');
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    if (typeof tourEnd === 'function' && document.getElementById('tour')) tourEnd(true);
    if (typeof closeModal === 'function') closeModal();
  });
  return { c, p };
}

(async () => {
  const pass = [], fail = [], errors = [];
  const ok = (c, l) => (c ? pass : fail).push(l);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const net = { posts: [], down: false };
  try {
    const { p } = await ctxFor(browser, net, errors, true);
    const toast = () => p.evaluate(() => (document.getElementById('lcars-toast') || {}).textContent || '');
    const badge = () => p.evaluate(() => {
      const b = document.getElementById('s-sync');
      return { shown: !!b && !b.classList.contains('hidden') && b.offsetWidth > 0, text: b ? b.textContent.trim() : '' };
    });

    await p.evaluate(() => mkDoc('Shore Leave', null, null));
    await p.waitForTimeout(300);
    const id = await p.evaluate(() => curId);
    // Let the creation save settle so what follows is the status change alone.
    await p.waitForTimeout(400);
    net.posts.length = 0;

    // --- the Status dropdown -------------------------------------------------
    await p.selectOption('#doc-status', 'complete');
    await p.waitForTimeout(700);
    const last = () => net.posts[net.posts.length - 1];
    ok(net.posts.length >= 1, 'changing the Status dropdown reaches the account without another keystroke');
    ok(!!last() && last().docs[id] && last().docs[id].status === 'complete',
       'and what reached it carries the new status');
    ok(/Marked complete · saved to your account/.test(await toast()), 'the writer is told it saved: ' + await toast());
    const b1 = await badge();
    ok(b1.shown && /Saved to account/.test(b1.text), 'the status bar shows it synced: ' + b1.text);

    // --- the posted date -----------------------------------------------------
    net.posts.length = 0;
    await p.evaluate(() => { const i = document.getElementById('doc-posted-input'); i.value = '2026-10-06'; onPostedDateChange(); });
    await p.waitForTimeout(700);
    ok(!!last() && last().docs[id].postedAt === '2026-10-06' && last().docs[id].status === 'complete',
       'setting a posted date syncs at once, with the date and the status');
    ok(/Marked posted · saved to your account/.test(await toast()), 'and says so: ' + await toast());

    // --- the sidebar context menu -------------------------------------------
    net.posts.length = 0;
    await p.evaluate(i => setStatus('doc', i, 'archived'), id);
    await p.waitForTimeout(700);
    ok(!!last() && last().docs[id].status === 'archived', 'archiving from the sidebar syncs at once');
    ok(/Archived · saved to your account/.test(await toast()), 'and says so: ' + await toast());

    // --- when the server refuses --------------------------------------------
    net.down = true;
    await p.evaluate(i => setStatus('doc', i, 'active'), id);
    await p.waitForTimeout(800);
    const b2 = await badge();
    ok(b2.shown && /Not synced/.test(b2.text), 'a failed sync shows Not synced in the status bar: ' + b2.text);
    ok(/Not saved — kept on this device/.test(await toast()) && /Service unavailable/.test(await toast()),
       'and the toast relays what the server said rather than claiming success: ' + await toast());
    ok(await p.evaluate(i => JSON.parse(localStorage.getItem('lcars_v1')).docs[i].status === 'active', id),
       'the change is still kept on this device');
    net.down = false;
    await p.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/sync-error.png' : '/dev/null' }).catch(() => {});

    // --- offline-only --------------------------------------------------------
    const off = await ctxFor(browser, { posts: [], down: false }, errors, false);
    await off.p.evaluate(() => mkDoc('Offline sim', null, null));
    await off.p.waitForTimeout(300);
    await off.p.selectOption('#doc-status', 'complete');
    await off.p.waitForTimeout(400);
    ok(await off.p.evaluate(() => document.getElementById('s-sync').classList.contains('hidden')),
       'offline-only shows no sync indicator — there is no account to sync to');
    ok(/saved on this device/.test(await off.p.evaluate(() => document.getElementById('lcars-toast').textContent)),
       'and the toast says it was saved on this device');
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
