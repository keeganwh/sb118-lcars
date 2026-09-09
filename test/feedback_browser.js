// App Feedback, driven in a real browser against a mock of the database half.
//
// Two contexts, because the whole feature is two people: a writer files a
// report and a super admin actions it. The mock mirrors the security definer
// functions' semantics -- in particular that only a super admin gets the queue,
// and that archiving nulls the capture paths. The real role checks are tested
// against a real Postgres in supabase/test/.
//
// What this proves is the client half: the panel opens without disturbing the
// app, the capture is built and previewed, the report round-trips, the reply
// reaches the writer, and a purge deletes the storage objects BEFORE the row.
//
//   python3 -m http.server 8131 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/feedback_browser.js
//
const { chromium } = require('playwright');

const W = { uid: 'uid-www', wid: 'W111', role: 'writer' };
const S = { uid: 'uid-sss', wid: 'S999', role: 'super_admin' };

const DB = { reports: [], objects: {}, order: [] };   // order: what happened, in sequence

function rpc(fn, a, me) {
  const who = me === W.uid ? W : S;
  switch (fn) {
    case 'my_role': return who.role;
    case 'feedback_submit': {
      if (!String(a.p_body || '').trim()) throw new Error('Tell us what happened.');
      DB.order.push('row:' + a.p_id);
      DB.reports.push({
        id: a.p_id, writer_uid: me, writer_id: who.wid, display_name: null,
        kind: a.p_kind, body: a.p_body.trim(), app_version: a.p_app_version,
        context: a.p_context, capture_page: a.p_capture_page, capture_shot: a.p_capture_shot,
        status: 'new', admin_note: null, status_at: null, status_by: null,
        archived_at: null, capture_purged_at: null, writer_seen_at: null,
        created_at: new Date().toISOString(),
      });
      return a.p_id;
    }
    case 'admin_list_feedback':
      if (who.role !== 'super_admin') throw new Error('Only a super admin can read the feedback queue.');
      return DB.reports.filter(r => a.p_include_archived || !r.archived_at);
    case 'admin_feedback_status': {
      if (who.role !== 'super_admin') throw new Error('Only a super admin can action feedback.');
      if (!['new','implementing','will_revisit','rejected'].includes(a.p_status))
        throw new Error('Unknown status: ' + a.p_status);
      const r = DB.reports.find(x => x.id === a.p_id);
      r.status = a.p_status;
      if (a.p_note) { r.admin_note = a.p_note; r.writer_seen_at = null; }
      r.status_at = new Date().toISOString(); r.status_by = who.wid;
      return null;
    }
    case 'admin_feedback_archive': {
      const r = DB.reports.find(x => x.id === a.p_id);
      DB.order.push('archive:' + a.p_id);
      r.archived_at = new Date().toISOString();
      r.capture_page = null; r.capture_shot = null;
      r.capture_purged_at = new Date().toISOString();
      return null;
    }
    case 'admin_feedback_delete':
      DB.order.push('delete:' + a.p_id);
      DB.reports = DB.reports.filter(x => x.id !== a.p_id);
      return null;
    case 'feedback_withdraw': {
      const r = DB.reports.find(x => x.id === a.p_id);
      if (!r || r.writer_uid !== me) throw new Error('That report is not yours, or is already gone.');
      DB.order.push('withdraw:' + a.p_id);
      DB.reports = DB.reports.filter(x => x.id !== a.p_id);
      return null;
    }
    case 'feedback_mark_seen':
      DB.reports.forEach(r => { if (r.writer_uid === me) r.writer_seen_at = new Date().toISOString(); });
      return null;
    case 'admin_list_writers': return [];
    case 'admin_usage_overview':
      if (who.role !== 'super_admin') throw new Error('Only a super admin can view usage.');
      return [{ writer_id: W.wid, display_name: null, role: 'writer', last_active: new Date().toISOString(),
                doc_count: 3, snapshot_count: 2, joint_count: 1, file_bytes: 5000, bytes: 21000 }];
    default: return null;
  }
}

async function ctxFor(browser, who, errors) {
  const c = await browser.newContext();
  await c.route('**/*', async route => {
    const url = route.request().url();
    if (!/supabase/i.test(url) && !url.includes('/rest/v1') && !url.includes('/auth/v1')
        && !url.includes('/storage/v1')) return route.continue();
    const m = route.request().method();
    const body = route.request().postData();
    let out = {}, status = 200, headers = {};
    try {
      if (url.includes('/storage/v1/object/signed/')) {
        // Supabase serves an uploaded page as text/plain -- which is exactly
        // why the app renders it itself rather than opening the URL.
        return route.fulfill({ status: 200, contentType: 'text/plain',
                               body: DB.objects[DB.signedFor] || '<p>capture</p>' });
      } else if (url.includes('/storage/v1/object/sign/')) {
        DB.signedFor = decodeURIComponent(url.split('/object/sign/app-feedback/')[1] || '');
        out = { signedURL: '/object/signed/x?token=t' };
      } else if (url.includes('/storage/v1/object/app-feedback')) {
        const path = decodeURIComponent(url.split('/object/app-feedback/')[1] || '');
        if (m === 'POST') {
          if (DB.storageDown) { status = 400; out = { message: 'Bucket not found' }; }
          else { DB.objects[path] = body || 'x'; DB.order.push('upload:' + path); }
        }
        else if (m === 'DELETE') {
          (JSON.parse(body || '{}').prefixes || []).forEach(p => {
            DB.order.push('rm:' + p); delete DB.objects[p];
          });
        }
      } else if (url.includes('/rest/v1/rpc/')) {
        out = rpc(url.split('/rpc/')[1].split('?')[0], body ? JSON.parse(body) : {}, who.uid);
      } else if (url.includes('/rest/v1/feedback_reports')) {
        const mine = DB.reports.filter(r => r.writer_uid === who.uid);
        if (url.includes('admin_note=not.is.null')) {
          const n = mine.filter(r => r.admin_note && !r.writer_seen_at).length;
          // Cross-origin, so the header has to be exposed or the browser hides
          // it from the app -- real Supabase exposes it; a mock must say so too.
          headers = { 'content-range': '0-0/' + n,
                      'access-control-expose-headers': 'content-range' };
          out = [];
        } else out = mine;
      } else out = [];
    } catch (e) { status = 400; out = { message: e.message }; }
    await route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(out) });
  });
  const p = await c.newPage();
  p.on('pageerror', e => errors.push(who.wid + ': ' + e.message));
  await p.goto('http://127.0.0.1:8131/LCARS.html');
  await p.evaluate(w => {
    localStorage.setItem('lcars_mode_v1', 'cloud');
    localStorage.setItem('lcars_auth_v1', JSON.stringify({ uid: w.uid, writerId: w.wid, access_token: 't', refresh_token: 'r' }));
  }, who);
  await p.goto('http://127.0.0.1:8131/LCARS.html');
  await p.waitForTimeout(800);
  // Boot raises prompts on a timer and they queue up. Clear whatever is showing
  // before the test starts driving, or the first assertion measures the wizard.
  await p.evaluate(() => { if (typeof closeModal === 'function') closeModal(); });
  return { c, p };
}

(async () => {
  const errors = [];
  // getDisplayMedia() always raises a picker. These flags make headless
  // Chromium answer it with the current tab, which is what preferCurrentTab
  // asks for -- they stand in for the click, they do not remove the prompt.
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--auto-accept-this-tab-capture',
           '--enable-usermedia-screen-capturing', '--allow-http-screen-capture'],
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const w = await ctxFor(browser, W, errors);
  const s = await ctxFor(browser, S, errors);
  const pass = [], fail = [];
  const ok = (c, l) => (c ? pass : fail).push(l);

  // --- the button ----------------------------------------------------------
  ok(await w.p.evaluate(() => !document.getElementById('btn-feedback').classList.contains('hidden')),
     'a signed-in writer gets the feedback button');
  ok(await w.p.evaluate(() => {
        const r = document.getElementById('btn-feedback');
        return document.querySelectorAll('#btn-feedback').length === 1 && r.closest('.hdr-right') !== null;
     }), 'there is exactly one of it, and it lives in the header row that IS the phone menu');

  // --- filing --------------------------------------------------------------
  await w.p.evaluate(() => { mkDoc('Away Team', null, null); });
  await w.p.waitForTimeout(200);
  await w.p.evaluate(() => {
    document.getElementById('editor').innerHTML = '<div>Secret unposted prose.</div>';
    flushSave();
  });
  const docId = await w.p.evaluate(() => curId);

  await w.p.evaluate(() => fbOpen());
  await w.p.waitForTimeout(200);
  ok(await w.p.evaluate(() => !document.getElementById('fb-panel').classList.contains('hidden')),
     'the panel opens');
  // Non-blocking is the whole design: the editor is still there and still editable.
  ok(await w.p.evaluate(() =>
      document.getElementById('mo').classList.contains('hidden')
      && document.getElementById('editor').isContentEditable
      && document.getElementById('fb-panel').getAttribute('aria-modal') === 'false'
      && getComputedStyle(document.getElementById('fb-panel')).position === 'fixed'),
     'and does not block the app behind it — no modal, no scrim, the editor still writable');

  // The capture, with sim text left out (the default).
  const capStripped = await w.p.evaluate(() => fbBuildCapture(true));
  ok(!capStripped.includes('Secret unposted prose'), 'the default capture leaves the sim text out');
  ok(/characters of sim text left out/.test(capStripped), 'and says so where the text was');
  ok(capStripped.includes('data-vibe=') && capStripped.includes('data-skin='),
     'the capture records skin, mode and vibe — style is three axes here, not one');
  ok(capStripped.includes('<symbol') || capStripped.includes('symbol id='),
     'the icon sprite travels with it, so the capture is not a grid of empty boxes');
  ok(!/<script/i.test(capStripped), 'and no scripts come with it');
  const capFull = await w.p.evaluate(() => fbBuildCapture(false));
  ok(capFull.includes('Secret unposted prose'), 'unticking the box does send the sim text');

  // The warning has to change when the open sim is joint -- that text is
  // somebody else's writing.
  await w.p.evaluate(id => { S.docs[id].docType = 'joint'; }, docId);
  await w.p.evaluate(() => { document.getElementById('fb-strip').checked = false; fbPaintCapNote(); });
  ok(/co-writers/.test(await w.p.evaluate(() => document.getElementById('fb-cap-note').textContent)),
     'sending sim text from a joint sim warns that it is a co-writer’s writing too');
  await w.p.evaluate(id => { delete S.docs[id].docType; }, docId);

  await w.p.evaluate(() => { document.getElementById('fb-strip').checked = true; fbPaintCapNote(); });

  // --- the screenshot ------------------------------------------------------
  ok(await w.p.evaluate(() => fbCanShoot() && !!document.getElementById('fb-shoot')),
     'a desktop browser is offered a real screenshot of the tab');
  await w.p.evaluate(() => fbCaptureShot());
  await w.p.waitForTimeout(1500);
  const shot = await w.p.evaluate(() => _fbShot ? { n: _fbShot.name, t: _fbShot.type, s: _fbShot.size } : null);
  ok(!!shot && shot.t === 'image/png' && shot.s > 1000, 'and it comes back as a real PNG of some size');
  // The preview must not depend on a popup: window.open + document.write came
  // up blank on iOS Safari, which is where these reports get filed from.
  await w.p.evaluate(() => fbPreview());
  await w.p.waitForTimeout(300);
  ok(await w.p.evaluate(() => {
      const f = document.getElementById('fb-view-frame');
      return !!f && f.hasAttribute('sandbox') && (f.srcdoc || '').includes('<!doctype html');
     }), 'the writer’s preview renders in a sandboxed frame in the app, not in a popup');
  await w.p.evaluate(() => fbCloseView());
  ok(await w.p.evaluate(() => !!document.querySelector('#fb-shot-prev .fb-thumb')),
     'shown to the writer before it is sent, because a tab capture can catch more than they meant');
  // The panel is over the thing being reported, so it must not be in the frame.
  ok(await w.p.evaluate(() => document.getElementById('fb-panel').style.visibility === ''),
     'and the panel is put back after being hidden for the frame');
  await w.p.evaluate(() => fbClearShot());
  ok(await w.p.evaluate(() => !_fbShot && !document.querySelector('#fb-shot-prev .fb-thumb')),
     'the writer can drop the screenshot again');
  await w.p.evaluate(() => fbCaptureShot());
  await w.p.waitForTimeout(1500);

  await w.p.evaluate(() => { document.getElementById('fb-text').value = 'The toolbar vanished on a phone.'; });
  await w.p.evaluate(() => fbSend());
  await w.p.waitForTimeout(500);

  ok(DB.reports.length === 1 && DB.reports[0].body === 'The toolbar vanished on a phone.',
     'the report reaches the database');
  const rep = DB.reports[0];
  ok(!!rep.capture_page && Object.keys(DB.objects).includes(rep.capture_page),
     'the capture is uploaded and the row points at it');
  ok(rep.capture_page.startsWith(W.uid + '/' + rep.id + '/'),
     'stored under the writer’s own folder, in the report’s own prefix');
  ok(DB.order.indexOf('upload:' + rep.capture_page) < DB.order.indexOf('row:' + rep.id),
     'the capture is uploaded before the row exists — the row names a path that is already there');
  ok(rep.context && rep.context.skin && rep.context.viewport && rep.context.docType,
     'and the context block carries the state the report was filed in');
  ok(rep.status === 'new', 'it arrives as new');
  ok(!!rep.capture_shot && rep.capture_shot.endsWith('.png')
     && Object.keys(DB.objects).includes(rep.capture_shot),
     'the screenshot is uploaded alongside the page copy and the row points at it');

  // An empty report is refused before it reaches the network.
  const before = DB.reports.length;
  await w.p.evaluate(() => { fbTab('new'); });
  await w.p.waitForTimeout(200);
  await w.p.evaluate(() => { document.getElementById('fb-text').value = '   '; fbSend(); });
  await w.p.waitForTimeout(300);
  ok(DB.reports.length === before, 'an empty report is not sent');

  // A broken attachment must not cost the writer their words. This is the case
  // a real test hit on a preview deployment: the storage bucket did not exist
  // yet, and the whole report went with it.
  DB.storageDown = true;
  await w.p.evaluate(() => { fbTab('new'); });
  await w.p.waitForTimeout(250);
  await w.p.evaluate(() => { document.getElementById('fb-text').value = 'Second report, storage broken.'; fbSend(); });
  await w.p.waitForTimeout(700);
  const second = DB.reports.find(r => r.body === 'Second report, storage broken.');
  ok(!!second, 'a report still sends when the capture cannot be uploaded');
  ok(!!second && !second.capture_page && !second.capture_shot,
     'and arrives with no capture rather than not arriving at all');
  DB.storageDown = false;

  // --- the admin side ------------------------------------------------------
  await s.p.evaluate(() => openAdmin());
  await s.p.waitForTimeout(600);
  ok(await s.p.evaluate(() => /toolbar vanished/.test(document.getElementById('adm-fb').textContent)),
     'a super admin sees the report in the admin view');
  ok(await s.p.evaluate(() => /storage broken/.test(document.getElementById('adm-fb').textContent)),
     'including the one whose attachment never made it');
  ok(await s.p.evaluate(() => /Page capture/.test(document.getElementById('adm-fb').textContent)),
     'with its capture linked');
  // Opening the signed URL showed an admin the source code and offered them a
  // page.txt download, because Storage will not serve it as HTML.
  await s.p.evaluate(id => fbOpenCapture(_fbReports.find(r => r.id === id).capture_page), rep.id);
  await s.p.waitForTimeout(700);
  ok(await s.p.evaluate(() => {
      const f = document.getElementById('fb-view-frame');
      return !!f && f.hasAttribute('sandbox') && (f.srcdoc || '').includes('<!doctype html');
     }), 'and the admin sees it RENDERED in a sandboxed frame, not as source text');
  await s.p.evaluate(() => fbCloseView());
  ok(await s.p.evaluate(() => /21|KB/.test(document.getElementById('adm-usage').textContent)),
     'and the usage overview alongside it');

  // An ordinary writer's admin view offers neither.
  await w.p.evaluate(() => openAdmin());
  await w.p.waitForTimeout(400);
  ok(await w.p.evaluate(() => !document.getElementById('adm-fb') && !document.getElementById('adm-usage')),
     'an ordinary writer’s admin view has no feedback queue and no usage table');
  await w.p.evaluate(() => goHome());

  // Actioning it, with a note back.
  await s.p.evaluate(id => {
    document.getElementById('fb-st-' + id).value = 'implementing';
    document.getElementById('fb-nt-' + id).value = 'Fixed in the next release.';
    fbSaveStatus(id);
  }, rep.id);
  await s.p.waitForTimeout(500);
  ok(rep.status === 'implementing' && rep.admin_note === 'Fixed in the next release.',
     'the admin sets a status and writes a note back');

  // --- the reply reaches the writer ---------------------------------------
  await w.p.evaluate(() => fbRefreshBadge());
  await w.p.waitForTimeout(300);
  ok(await w.p.evaluate(() => !document.getElementById('fb-badge').classList.contains('hidden')),
     'the writer’s button badges, which is the only way they are told');
  await w.p.evaluate(() => { fbOpen(); fbTab('mine'); });
  await w.p.waitForTimeout(500);
  ok(await w.p.evaluate(() => /Fixed in the next release/.test(document.getElementById('fb-body').textContent)),
     'and the reply is on their own copy of the report');
  await w.p.waitForTimeout(400);
  ok(await w.p.evaluate(() => document.getElementById('fb-badge').classList.contains('hidden')),
     'reading it clears the badge');

  // --- withdrawing ---------------------------------------------------------
  // The writer takes back the second report -- the one that arrived with no
  // capture -- and it goes entirely.
  await w.p.evaluate(() => { fbOpen(); fbTab('mine'); });
  await w.p.waitForTimeout(500);
  ok(await w.p.evaluate(() => /Withdraw/.test(document.getElementById('fb-body').textContent)),
     'a writer can see a way to take a report back');
  await w.p.evaluate(id => fbConfirmWithdraw(id), second.id);
  await w.p.waitForTimeout(200);
  // The warning has to change once somebody has acted on it.
  ok(await w.p.evaluate(() => /Nobody has looked at it yet/.test(document.getElementById('mo-body').textContent)),
     'and is told nobody has looked at an untouched one');
  await w.p.evaluate(() => doModal());
  await w.p.waitForTimeout(600);
  ok(!DB.reports.some(r => r.id === second.id), 'withdrawing deletes the report outright');

  // The one the admin actioned warns before it goes, and still goes.
  await w.p.evaluate(() => fbLoadMine());
  await w.p.waitForTimeout(500);
  await w.p.evaluate(id => fbConfirmWithdraw(id), rep.id);
  await w.p.waitForTimeout(200);
  ok(await w.p.evaluate(() => /already looked at this one/.test(document.getElementById('mo-body').textContent)),
     'and warned when the team has already acted on it');
  await w.p.evaluate(() => closeModal());

  // --- archiving destroys the capture -------------------------------------
  const capPath = rep.capture_page, shotPath = rep.capture_shot;
  await s.p.evaluate(() => loadFeedback());
  await s.p.waitForTimeout(400);
  await s.p.evaluate(id => fbConfirmArchive(id), rep.id);
  await s.p.waitForTimeout(200);
  await s.p.evaluate(() => doModal());
  await s.p.waitForTimeout(600);
  ok(!DB.objects[capPath] && !DB.objects[shotPath],
     'archiving deletes the stored capture AND the screenshot — both, or the promise is not kept');
  ok(rep.archived_at && !rep.capture_page && rep.capture_purged_at,
     'and the row records that the capture is gone');
  ok(DB.order.indexOf('rm:' + capPath) < DB.order.indexOf('archive:' + rep.id),
     'the object goes BEFORE the row is cleared — the other order orphans bytes nobody can find');
  ok(await s.p.evaluate(() => !/toolbar vanished/.test(document.getElementById('adm-fb').textContent)),
     'and the archived report leaves the open list');

  // --- deleting ------------------------------------------------------------
  await s.p.evaluate(() => fbAdminTab(true));
  await s.p.waitForTimeout(500);
  ok(await s.p.evaluate(() => /toolbar vanished/.test(document.getElementById('adm-fb').textContent)),
     'but is still there under “including archived”');
  await s.p.evaluate(id => fbConfirmDelete(id), rep.id);
  await s.p.waitForTimeout(200);
  await s.p.evaluate(() => doModal());
  await s.p.waitForTimeout(600);
  ok(!DB.reports.some(r => r.id === rep.id), 'and a super admin can delete it outright');

  await browser.close();
  pass.forEach(l => console.log('PASS: ' + l));
  fail.forEach(l => console.log('FAIL: ' + l));
  errors.forEach(e => console.log('PAGE ERROR: ' + e));
  console.log('\n' + pass.length + ' passed, ' + fail.length + ' failed, ' + errors.length + ' page errors.');
  process.exit(fail.length || errors.length ? 1 : 0);
})();
