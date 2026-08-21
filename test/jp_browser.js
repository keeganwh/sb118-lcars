// Joint Posts, driven in two real browsers.
//
// A single browser context proves nothing about clobbering, which is the entire
// point of the feature -- so this runs two, with two Writer IDs, against one
// shared mock of jp_docs that keeps state between them. The mock mirrors the
// real functions' semantics, the version check above all.
//
// It does NOT talk to Supabase; the sandbox cannot reach it. What it proves is
// the client half: that the turn bar, the read-only enforcement, the save path
// and the stale-write refusal behave as intended when two people are actually
// on the same sim. The database half has its own tests in supabase/test/.
//
//   python3 -m http.server 8129 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/jp_browser.js
//
const { chromium } = require('playwright');

const A = { uid: 'uid-aaa', wid: 'A111', name: null };          // no display name: falls back to the ID
const B = { uid: 'uid-bbb', wid: 'B222', name: 'Ensign Rivera' };

// The shared server state both contexts talk to. Mirrors the real functions'
// semantics -- in particular the version check, which is what we are testing.
const DB = {
  docs: {},           // doc_id -> row
  members: {},        // doc_id -> [uid]
  invites: [],
  LOCK_MS: 5 * 60 * 1000,   // must match jp_lock_minutes() in schema.sql
};
const widOf  = u => (u === A.uid ? A.wid : B.wid);
const nameOf = u => (u === A.uid ? A.name : B.name);
const lockActive = d => !!(d.locked_by && Date.now() - d.locked_at < DB.LOCK_MS);

function rpc(fn, args, me) {
  const d = DB.docs[args && args.p_doc_id];
  const isMember = d && DB.members[d.doc_id].includes(me);
  switch (fn) {
    case 'jp_list':
      return Object.values(DB.docs)
        .filter(x => DB.members[x.doc_id].includes(me))
        .map(x => ({ doc_id: x.doc_id, owner_uid: x.owner_uid, owner_wid: widOf(x.owner_uid),
          title: x.title, status: x.status, post_type: x.post_type, posted_at: x.posted_at,
          academy: x.academy, version: x.version, locked_by: x.locked_by,
          lock_wid: x.locked_by ? widOf(x.locked_by) : null,
          lock_name: x.locked_by ? nameOf(x.locked_by) : null,
          owner_wid: widOf(x.owner_uid), owner_name: nameOf(x.owner_uid),
          mission_name: x.mission_name, scene_name: x.scene_name,
          lock_active: lockActive(x),
          member_count: DB.members[x.doc_id].length, updated_at: new Date(x.updated_at).toISOString() }));
    case 'jp_doc':
      if (!isMember) return [];
      return [{ ...d, lock_wid: d.locked_by ? widOf(d.locked_by) : null,
                lock_name: d.locked_by ? nameOf(d.locked_by) : null, lock_active: lockActive(d),
                updated_at: new Date(d.updated_at).toISOString() }];
    case 'jp_roster':
      if (!isMember) return [];
      return DB.members[d.doc_id].map(u => ({ member_uid: u, writer_id: widOf(u), display_name: nameOf(u),
        role: u === d.owner_uid ? 'owner' : 'writer', joined_at: new Date().toISOString() }));
    case 'jp_my_invites':
      return DB.invites.filter(i => i.writer_id === widOf(me) && i.status === 'open')
        .map(i => ({ id: i.id, doc_id: i.doc_id, title: DB.docs[i.doc_id].title, from_wid: widOf(i.invited_by),
                     created_at: new Date().toISOString() }));
    case 'jp_invite': {
      const wid = String(args.p_writer_id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (wid !== A.wid && wid !== B.wid) return null;      // unknown: silent
      DB.invites.push({ id: 'inv-' + DB.invites.length, doc_id: args.p_doc_id, writer_id: wid,
                        invited_by: me, status: 'open' });
      return null;
    }
    case 'jp_accept_invite': {
      const inv = DB.invites.find(i => i.id === args.p_id);
      inv.status = 'accepted';
      if (!DB.members[inv.doc_id].includes(me)) DB.members[inv.doc_id].push(me);
      return inv.doc_id;
    }
    case 'jp_decline_invite': {
      const inv = DB.invites.find(i => i.id === args.p_id); if (inv) inv.status = 'declined';
      return null;
    }
    case 'jp_take_lock':
      if (d.locked_by && d.locked_by !== me && lockActive(d))
        return [{ locked_by: d.locked_by, locked_at: new Date(d.locked_at).toISOString(), got: false }];
      d.locked_by = me; d.locked_at = Date.now();
      return [{ locked_by: me, locked_at: new Date(d.locked_at).toISOString(), got: true }];
    case 'jp_release_lock':
      if (d.locked_by === me || d.owner_uid === me) { d.locked_by = null; d.locked_at = null; }
      return null;
    case 'jp_save':
      if (!isMember) throw new Error('not a member');
      if (d.locked_by && d.locked_by !== me && lockActive(d)) throw new Error('JP_LOCKED');
      if (d.version !== args.p_version) throw new Error('JP_STALE');
      d.content = args.p_content; d.title = args.p_title; d.status = args.p_status;
      d.meta = args.p_meta; d.version += 1; d.locked_by = me; d.locked_at = Date.now();
      d.updated_at = Date.now();
      return d.version;
    case 'my_role': return 'writer';
    default: return null;
  }
}

async function ctxFor(browser, who, errors) {
  const c = await browser.newContext();
  await c.route('**/*', async route => {
    const url = route.request().url();
    if (!/supabase|SUPA/i.test(url) && !url.includes('/rest/v1') && !url.includes('/auth/v1')) return route.continue();
    const body = route.request().postData();
    let out = {}, status = 200;
    try {
      if (url.includes('/rest/v1/rpc/')) {
        const fn = url.split('/rpc/')[1].split('?')[0];
        out = rpc(fn, body ? JSON.parse(body) : {}, who.uid);
      } else if (url.includes('/rest/v1/state')) {
        out = route.request().method() === 'GET' ? [] : {};
      } else if (url.includes('/rest/v1/jp_docs')) {
        const p = JSON.parse(body);
        DB.docs[p.doc_id] = { ...p, version: 1, locked_by: null, locked_at: null, updated_at: Date.now() };
        DB.members[p.doc_id] = [p.owner_uid];
        out = [DB.docs[p.doc_id]];
      } else if (url.includes('/rest/v1/jp_invitations')) {
        out = DB.invites.filter(i => i.status === 'open' && url.includes(encodeURIComponent(i.doc_id)));
      } else if (url.includes('/rest/v1/snapshots')) {
        out = [];
      } else out = [];
    } catch (e) { status = 400; out = { message: e.message }; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(out) });
  });
  const p = await c.newPage();
  p.on('pageerror', e => errors.push(who.wid + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(who.wid + ' console: ' + m.text()); });
  await p.goto('http://127.0.0.1:8129/LCARS.html');
  await p.evaluate(w => {
    localStorage.setItem('lcars_mode_v1', 'cloud');
    localStorage.setItem('lcars_auth_v1', JSON.stringify({ uid: w.uid, writerId: w.wid, access_token: 't', refresh_token: 'r' }));
  }, who);
  await p.goto('http://127.0.0.1:8129/LCARS.html');
  await p.waitForTimeout(700);
  return { c, p };
}

(async () => {
  const errors = [];
  const browser = await chromium.launch({ args:['--no-sandbox'], executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const a = await ctxFor(browser, A, errors);
  const b = await ctxFor(browser, B, errors);
  const pass = [], fail = [];
  const ok = (c, l) => (c ? pass : fail).push(l);

  // A makes a sim and turns it joint.
  await a.p.evaluate(() => { mkDoc('Away Team', null, null); });
  await a.p.waitForTimeout(200);
  const docId = await a.p.evaluate(() => curId);
  await a.p.evaluate(() => { document.getElementById('editor').innerHTML = '<div>A writes the opening.</div>'; flushSave(); });
  await a.p.evaluate(id => jpMakeJoint(id), docId);
  await a.p.waitForTimeout(400);
  ok(!!DB.docs[docId], 'the sim reaches jp_docs when made joint');
  ok(await a.p.evaluate(id => S.docs[id].docType === 'joint', docId), 'and is marked joint locally');

  // The blob must never carry it.
  ok(await a.p.evaluate(id => !cloudPayload().docs[id], docId),
     'a joint sim is stripped from the payload blob');

  // A invites B; B sees and accepts.
  await a.p.evaluate(id => jpInvite(id, 'b-222'), docId);
  await a.p.waitForTimeout(300);
  await b.p.evaluate(() => jpLoadInvites());
  await b.p.waitForTimeout(300);
  ok(await b.p.evaluate(() => _jpInvites.length === 1), 'the invited writer sees the invitation');
  ok(await b.p.evaluate(() => !document.getElementById('btn-jp-invites').classList.contains('hidden')),
     'and the header shows the invites button');
  await b.p.evaluate(() => jpAccept(_jpInvites[0].id));
  await b.p.waitForTimeout(600);
  ok(await b.p.evaluate(id => !!S.docs[id], docId), 'accepting puts the sim in their list');
  ok(await b.p.evaluate(id => S.docs[id].content.includes('A writes the opening'), docId),
     'and they get the text that was already written');

  // --- the lock, across two real browsers ---------------------------------
  await a.p.evaluate(id => openDoc(id), docId);
  await b.p.evaluate(id => openDoc(id), docId);
  await a.p.waitForTimeout(500); await b.p.waitForTimeout(500);

  ok(await a.p.evaluate(() => !document.getElementById('jp-bar').classList.contains('hidden')),
     'the turn bar shows on a joint sim');
  ok(await a.p.evaluate(() => document.body.classList.contains('jp-readonly')),
     'nobody holds the sim, so it opens read-only');
  ok(await a.p.evaluate(() => document.getElementById('editor').getAttribute('contenteditable') === 'false'),
     'and the editor is genuinely not editable, not merely greyed');

  await a.p.evaluate(id => jpTakeLock(id), docId);
  await a.p.waitForTimeout(400);
  ok(await a.p.evaluate(() => !document.body.classList.contains('jp-readonly')),
     'taking the sim makes it writable');

  const got = await b.p.evaluate(id => jpTakeLock(id), docId);
  await b.p.waitForTimeout(300);
  ok(got === false, 'the second writer is refused the turn');
  ok(await b.p.evaluate(() => document.body.classList.contains('jp-readonly')),
     'and stays read-only');
  ok(await b.p.evaluate(() => /A111 is writing/.test(document.getElementById('jp-bar').textContent)),
     'and is told who has it — by Writer ID when they have set no display name');

  // A writes and saves.
  await a.p.evaluate(() => {
    document.getElementById('editor').innerHTML = '<div>A writes the opening.</div><div>And a second beat.</div>';
    flushSave();
  });
  await a.p.waitForTimeout(3200);
  ok(DB.docs[docId].version === 2, 'the holder’s save goes through and the version advances');
  ok(DB.docs[docId].content.includes('second beat'), 'and the server has the new text');

  // --- the dangerous case -------------------------------------------------
  // A's turn lapses. B takes it and writes. A's tab still believes it is at
  // version 2 and tries to save -- this is the clobber the lock cannot stop.
  DB.docs[docId].locked_at = Date.now() - (DB.LOCK_MS + 60 * 1000);
  const gotB = await b.p.evaluate(id => jpTakeLock(id), docId);
  await b.p.waitForTimeout(500);
  ok(gotB === true, 'an expired turn can be taken by the next writer');
  await b.p.evaluate(() => {
    document.getElementById('editor').innerHTML = '<div>B’s reply, which must survive.</div>';
    flushSave();
  });
  await b.p.waitForTimeout(3200);
  ok(DB.docs[docId].content.includes('must survive'), 'the new holder’s writing is saved');

  const before = DB.docs[docId].content;
  await a.p.evaluate(() => {
    document.getElementById('editor').innerHTML = '<div>A clobbers everything.</div>';
    flushSave();
  });
  await a.p.waitForTimeout(3500);
  ok(DB.docs[docId].content === before,
     'a lapsed writer cannot clobber the next holder’s work');
  ok(await a.p.evaluate(() => document.getElementById('editor').innerText.includes('A clobbers')),
     'and their own text is still on screen, not thrown away');

  // --- offline ------------------------------------------------------------
  await a.p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }); jpPaint(); });
  await a.p.waitForTimeout(200);
  ok(await a.p.evaluate(() => document.body.classList.contains('jp-readonly')),
     'offline, a joint sim is read-only');
  ok(await a.p.evaluate(() => /Offline/.test(document.getElementById('jp-bar').textContent)),
     'and says so rather than silently refusing');
  ok(await a.p.evaluate(id => S.docs[id].content.length > 0, docId),
     'and the sim is still readable offline, not vanished');

  // --- the bugs reported from the first real use -------------------------
  // The offline check above left A offline on purpose; put it back, or every
  // check below is really just testing the offline banner again.
  await a.p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true }); jpPaint(); });
  await a.p.waitForTimeout(200);

  // A display name, when there is one, is what a person is called.
  await a.p.evaluate(id => jpTakeLock(id), docId);   // A holds it again
  await a.p.waitForTimeout(300);
  await a.p.evaluate(id => jpReleaseLock(id, true), docId);
  await a.p.waitForTimeout(500);
  await b.p.evaluate(id => jpTakeLock(id), docId);
  await b.p.waitForTimeout(400);
  await a.p.evaluate(() => jpPollOnce());
  await a.p.waitForTimeout(600);
  ok(await a.p.evaluate(() => /Ensign Rivera is writing/.test(document.getElementById('jp-bar').textContent)),
     'a writer with a display name is named by it, not by their Writer ID');

  // HAND-OFF MUST NOT EAT A SHORT TURN. The reported bug: type a little, press
  // Hand back before the save debounce, and the sim came back empty, because
  // the hand-off sent doc.content -- which flushSave had not refreshed yet.
  await b.p.evaluate(() => {
    document.getElementById('editor').innerHTML = '<div>Just one short line.</div>';
  });
  await b.p.evaluate(id => jpReleaseLock(id, true), docId);   // immediately, no debounce
  await b.p.waitForTimeout(1500);
  ok(DB.docs[docId].content.includes('Just one short line'),
     'handing back immediately after typing saves the turn rather than wiping it');
  ok(await b.p.evaluate(id => (S.docs[id].snapshots || []).length > 0, docId),
     'and a hand-off leaves a snapshot to come back to');

  // FILING MUST SURVIVE A SERVER REFRESH. The reported bug: a joint sim
  // disappeared from the mission/scene tree and was reachable only from the
  // dashboard, because the row carries no filing and renderNav drops a doc
  // whose mission it cannot find.
  await a.p.evaluate(id => {
    S.missions['m1'] = { id:'m1', name:'The Artemis Initiative', year:2026, status:'active' };
    S.scenes['s1']   = { id:'s1', name:'Deck Twelve', missionId:'m1', status:'active' };
    S.docs[id].missionId = 'm1'; S.docs[id].sceneId = 's1';
    jpRememberFiling(S.docs[id]); persist();
  }, docId);
  await a.p.evaluate(id => jpReload(id), docId);
  await a.p.waitForTimeout(800);
  ok(await a.p.evaluate(id => S.docs[id].missionId === 'm1' && S.docs[id].sceneId === 's1', docId),
     'a joint sim stays filed where the writer put it after a refresh from the server');
  ok(await a.p.evaluate(id => {
        const tree = document.getElementById('nav-tree');
        return !!tree && tree.textContent.includes('The Artemis Initiative');
     }, docId),
     'and appears in the mission tree, not only on the dashboard');

  // Two writers may file the same sim differently.
  await b.p.evaluate(id => {
    S.missions['m9'] = { id:'m9', name:'Something Else Entirely', year:2026, status:'active' };
    S.docs[id].missionId = 'm9'; S.docs[id].sceneId = null;
    jpRememberFiling(S.docs[id]); persist();
  }, docId);
  await b.p.evaluate(id => jpReload(id), docId);
  await b.p.waitForTimeout(700);
  const aFiling = await a.p.evaluate(id => S.docs[id].missionId, docId);
  const bFiling = await b.p.evaluate(id => S.docs[id].missionId, docId);
  ok(aFiling === 'm1' && bFiling === 'm9',
     'and two writers can file the same joint sim in different places');

  // The turn bar has to stay put when the sim is long enough to scroll.
  ok(await a.p.evaluate(() => getComputedStyle(document.getElementById('jp-bar')).position === 'sticky'),
     'the turn bar sticks rather than scrolling away');

  console.log('\n--- browser checks ---');
  pass.forEach(l => console.log('PASS: ' + l));
  fail.forEach(l => console.log('FAIL: ' + l));
  if (errors.length) { console.log('\nPAGE ERRORS:'); [...new Set(errors)].slice(0, 12).forEach(e => console.log('  ' + e)); }
  console.log('\n' + pass.length + ' passed, ' + fail.length + ' failed, ' + new Set(errors).size + ' page errors');
  await browser.close();
  process.exit(fail.length || errors.length ? 1 : 0);
})();
