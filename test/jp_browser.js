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
  shares: {},        // doc_id -> shared_docs row
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
      } else if (url.includes('/rest/v1/jp_docs') && route.request().method() === 'POST') {
        const p = JSON.parse(body);
        DB.docs[p.doc_id] = { ...p, version: 1, locked_by: null, locked_at: null, updated_at: Date.now() };
        DB.members[p.doc_id] = [p.owner_uid];
        out = [DB.docs[p.doc_id]];
      } else if (url.includes('/rest/v1/jp_docs') && route.request().method() === 'DELETE') {
        const id = decodeURIComponent(url.split('doc_id=eq.')[1].split('&')[0]);
        if (DB.docs[id] && DB.docs[id].owner_uid === who.uid) { delete DB.docs[id]; delete DB.members[id]; }
        out = [];
      } else if (url.includes('/rest/v1/jp_members') && route.request().method() === 'DELETE') {
        const id = decodeURIComponent(url.split('doc_id=eq.')[1].split('&')[0]);
        if (DB.members[id]) DB.members[id] = DB.members[id].filter(u => u !== who.uid);
        out = [];
      } else if (url.includes('/rest/v1/jp_invitations')) {
        out = DB.invites.filter(i => i.status === 'open' && url.includes(encodeURIComponent(i.doc_id)));
      } else if (url.includes('/rest/v1/shared_docs')) {
        // Mirrors the policy: the publisher OR anybody on the joint sim.
        const m = route.request().method();
        const idOf = u => decodeURIComponent(u.split('doc_id=eq.')[1].split('&')[0]);
        const visible = row => row && (row.owner_uid === who.uid ||
                                       (DB.members[row.doc_id] || []).includes(who.uid));
        if (m === 'POST') {
          const p = JSON.parse(body);
          const prev = DB.shares[p.doc_id];
          if (prev && !visible(prev)) { status = 403; out = { message: 'row-level security' }; }
          else {
            DB.shares[p.doc_id] = { token: (prev && prev.token) || 'tok-' + p.doc_id, ...prev, ...p };
            out = [DB.shares[p.doc_id]];
          }
        } else if (m === 'DELETE') {
          const id = idOf(url);
          if (visible(DB.shares[id])) delete DB.shares[id];
          out = [];
        } else {
          const row = DB.shares[idOf(url)];
          out = visible(row) ? [row] : [];
        }
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

  // The rollout gate is gone. The mock answers my_role() with 'writer', so this
  // context is an ordinary writer -- who used to be refused with a "still being
  // tested" toast and shown no button at all.
  await a.p.evaluate(() => jpPaint());
  ok(await a.p.evaluate(() => jpCanCreate() === true), 'an ordinary writer can start a joint sim');
  ok(await a.p.evaluate(() => !document.getElementById('jp-make-row').classList.contains('hidden')),
     'and is offered "make this joint" on a solo sim');
  await a.p.evaluate(() => jpConfirmMakeJoint(curId));
  await a.p.waitForTimeout(200);
  ok(await a.p.evaluate(() => /joint sim/i.test(document.getElementById('mo-title').textContent)),
     'and gets the confirm dialog rather than a refusal');
  await a.p.evaluate(() => { const m = document.getElementById('mo'); if (m) m.classList.add('hidden'); });

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

  // Restoring a snapshot is writing, and it was the one editing path with no
  // guard on it: it used to replace the sim on screen and doc.content with an
  // old revision on a sim this writer did not hold.
  const restored = await b.p.evaluate(id => {
    const d = S.docs[id];
    const before = d.content;
    _histList = [{ content:'<div>An older revision.</div>', savedAt: Date.now()-1000, wordCount: 3 }];
    const c = window.confirm; window.confirm = () => true;
    restoreSnapshot(0);
    window.confirm = c;
    return { changed: d.content !== before,
             editor: /An older revision/.test(document.getElementById('editor').innerText) };
  }, docId);
  ok(!restored.changed, 'a writer without the sim cannot restore an old revision over it');
  ok(!restored.editor, 'and the sim on screen is left alone');

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

  // --- second round of reported bugs -------------------------------------
  // THE PROMPT THAT WOULD NOT GO AWAY. Joint sims are stripped from the payload
  // blob, so counting them on the local side made this browser look permanently
  // ahead of its own account -- "62 sims here, 60 in your account" on every
  // single load, for a difference that was not one.
  const counts = await a.p.evaluate(() => {
    const local = Object.keys(S.docs).length;
    const localSolo = Object.keys(S.docs).filter(id => !isJointDoc(S.docs[id])).length;
    return { local, localSolo, payload: Object.keys(cloudPayload().docs).length };
  });
  ok(counts.local > counts.localSolo, 'the browser really does hold a joint sim');
  ok(counts.localSolo === counts.payload,
     'the count compared against the account excludes joint sims, so the reconcile prompt stops firing');

  // THE HAND-BACK THAT UNDID ITSELF. Releasing flushed the editor, which
  // re-armed the debounced save, which fired seconds later -- and jp_save takes
  // the lock for whoever saves, so the turn came straight back.
  await a.p.evaluate(id => jpTakeLock(id), docId);
  await a.p.waitForTimeout(400);
  await a.p.evaluate(() => {
    document.getElementById('editor').innerHTML = '<div>A short turn, then hand back.</div>';
    schedSave();
  });
  await a.p.evaluate(id => jpReleaseLock(id, true), docId);
  await a.p.waitForTimeout(4500);          // longer than the 2.5s save debounce
  ok(DB.docs[docId].locked_by === null,
     'a hand-off stays handed off — the pending save does not take the turn back');
  ok(DB.docs[docId].content.includes('A short turn'),
     'and the turn that was handed back is the one that was saved');

  // Filing a sim that is in no mission at all -- the case with no right-click
  // to reach, because it is not in the tree to right-click on.
  await a.p.evaluate(id => { S.docs[id].missionId = null; S.docs[id].sceneId = null;
                             delete S.jpFiling[id]; persist(); renderNav(); openDoc(id); }, docId);
  await a.p.waitForTimeout(400);
  ok(await a.p.evaluate(() => {
       const b = document.getElementById('btn-file-sim');
       return !!b && !!b.offsetParent && /Not filed/.test(document.getElementById('btn-file-lbl').textContent);
     }),
     'a sim filed nowhere offers a way to file it from Sim Details, and says it is unfiled');

  await a.p.evaluate(id => fileSimDialog(id), docId);
  await a.p.waitForTimeout(300);
  ok(await a.p.evaluate(() => {
       const m = document.getElementById('fs-m');
       return !!m && [...m.options].some(o => o.value === '__new');
     }),
     'and the filing dialog can create a new mission rather than sending you away to make one');

  // The header mark is a way home without becoming a new-looking control.
  ok(await a.p.evaluate(() => {
       const h = document.querySelector('.hdr-home');
       const cs = getComputedStyle(h);
       return cs.padding === '0px' && (cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent');
     }),
     'the header mark is clickable but keeps the look it always had');

  // --- third round ---------------------------------------------------------
  // FILING MUST TAKE EFFECT AT ONCE. jpApplyRow used to replace the doc object
  // in S.docs, so a dialog holding a reference across a poll wrote into an
  // orphan: Sim Details showed the new filing, the sim list did not, and it
  // only appeared once a later refresh restored it.
  await a.p.evaluate(id => {
    S.missions['m2'] = { id:'m2', name:'Shore Leave', year:2026, status:'active' };
    S.scenes['s2']   = { id:'s2', name:'Robin & Wil Visit Earth', missionId:'m2', status:'active' };
    S.docs[id].missionId = null; S.docs[id].sceneId = null;
    delete S.jpFiling[id]; persist(); renderNav(); openDoc(id);
  }, docId);
  await a.p.waitForTimeout(400);

  // Force the exact race: refresh the row from the server (which is what a poll
  // does) while the filing dialog is open, then commit it.
  await a.p.evaluate(id => fileSimDialog(id), docId);
  await a.p.waitForTimeout(250);
  await a.p.evaluate(id => jpReload(id), docId);          // the poll landing mid-dialog
  await a.p.waitForTimeout(400);
  await a.p.evaluate(() => {
    document.getElementById('fs-m').value = 'm2'; fsMissionChange();
    document.getElementById('fs-s').value = 's2'; fsSceneChange();
    doModal();
  });
  await a.p.waitForTimeout(500);
  ok(await a.p.evaluate(id => S.docs[id].missionId === 'm2' && S.docs[id].sceneId === 's2', docId),
     'filing a joint sim lands on the doc the app actually renders, even if a refresh interrupts');
  ok(await a.p.evaluate(() => {
       const t = document.getElementById('nav-tree');
       return !!t && t.textContent.includes('Robin & Wil Visit Earth');
     }),
     'and it appears in the sim list immediately, without having to take the sim first');

  // One badge, not two.
  await a.p.evaluate(id => { S.docs[id].postType = 'jp'; persist(); renderNav(); }, docId);
  await a.p.waitForTimeout(250);
  const badges = await a.p.evaluate(id => {
    const row = [...document.querySelectorAll('#nav-tree .nd')]
      .find(n => n.getAttribute('onclick') || ''.includes(id));
    const all = [...document.querySelectorAll('#nav-tree .nd .tag')].map(t => t.textContent.trim());
    return { joint: all.filter(t => t === 'JOINT').length, jp: all.filter(t => t === 'JP').length };
  }, docId);
  ok(badges.joint === 1 && badges.jp === 0,
     'a joint sim tagged JP shows one badge, not JOINT and JP side by side');

  // --- deleting a joint sim ------------------------------------------------
  // The reported bug: deleting from the sim list removed the local copy only,
  // so the next refresh pulled the sim straight back and it stayed on the
  // dashboard throughout. A joint sim does not live in S.docs alone.
  const delId = 'doc-del';
  await a.p.evaluate(id => {
    S.docs[id] = { id, title:'Doomed JP', content:'<div>x</div>', chars:[], myChars:[], charColors:{},
                   status:'active', createdAt:Date.now(), updatedAt:Date.now() };
    persist(); jpMakeJoint(id);
  }, delId);
  await a.p.waitForTimeout(700);
  ok(!!DB.docs[delId], 'a second joint sim exists to delete');

  // A member sees "leave", not "delete for everyone".
  await a.p.evaluate(id => jpInvite(id, 'B222'), delId);
  await a.p.waitForTimeout(300);
  await b.p.evaluate(() => jpLoadInvites());
  await b.p.waitForTimeout(400);
  await b.p.evaluate(() => jpAccept(_jpInvites[0].id));
  await b.p.waitForTimeout(900);
  await b.p.evaluate(() => { const m = document.getElementById('mo'); if (m) m.classList.add('hidden'); });
  await b.p.evaluate(id => delDoc(id), delId);
  await b.p.waitForTimeout(300);
  ok(await b.p.evaluate(() => /Leave this joint sim/i.test(document.getElementById('mo-title').textContent)),
     'a member deleting a joint sim is offered leaving it, not deleting everyone else’s copy');
  await b.p.evaluate(() => doModal());
  await b.p.waitForTimeout(800);
  ok(!!DB.docs[delId], 'and leaving does not destroy the sim for the others');
  ok(await b.p.evaluate(id => !S.docs[id], delId), 'while it does leave their own list');

  // The owner deletes it properly, and it stays deleted.
  await a.p.evaluate(id => delDoc(id), delId);
  await a.p.waitForTimeout(300);
  ok(await a.p.evaluate(() => /Delete this joint sim/i.test(document.getElementById('mo-title').textContent)),
     'the owner is warned it removes the sim for everyone');
  await a.p.evaluate(() => doModal());
  await a.p.waitForTimeout(900);
  ok(!DB.docs[delId], 'the shared row is actually deleted, not just the local copy');
  await a.p.evaluate(() => jpRefreshList());
  await a.p.waitForTimeout(700);
  ok(await a.p.evaluate(id => !S.docs[id], delId),
     'and it does not come back on the next refresh');

  // --- a share link on a joint sim ----------------------------------------
  // shared_docs is keyed by doc_id and carries authors as a list precisely so a
  // joint sim shares as ONE sim. Neither half had ever been exercised.
  await a.p.evaluate(id => publishShare(S.docs[id], null), docId);
  await a.p.waitForTimeout(500);
  const share = DB.shares[docId];
  ok(!!share, 'a joint sim publishes a share link');
  ok(!!share && (share.authors || []).length === 2,
     'and is signed by everyone on the sim, not just whoever pressed Share');
  ok(!!share && (share.authors || []).some(x => x.writer_id === 'B222'),
     'including the writer who did not publish it');

  // canShare() is false over http, which is what the test server speaks, so the
  // dialog's own gate is stubbed out -- what is under test here is the row
  // being visible to the other writer, not the https check.
  const seen = await b.p.evaluate(id => { canShare = () => true; return fetchShare(id); }, docId);
  ok(!!seen, 'another writer on the joint sim can see the share link');

  await b.p.evaluate(id => publishShare(S.docs[id], null), docId);
  await b.p.waitForTimeout(500);
  ok(DB.shares[docId] && DB.shares[docId].token === share.token,
     'and republishing keeps the same link rather than failing on the other writer\'s row');

  console.log('\n--- browser checks ---');
  pass.forEach(l => console.log('PASS: ' + l));
  fail.forEach(l => console.log('FAIL: ' + l));
  if (errors.length) { console.log('\nPAGE ERRORS:'); [...new Set(errors)].slice(0, 12).forEach(e => console.log('  ' + e)); }
  console.log('\n' + pass.length + ' passed, ' + fail.length + ' failed, ' + new Set(errors).size + ' page errors');
  await browser.close();
  process.exit(fail.length || errors.length ? 1 : 0);
})();
