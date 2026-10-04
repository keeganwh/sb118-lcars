// The committed live-writing bundle: does it load, and does it actually merge?
//
// `live-bundle.js` is 317KB of compiled library code nobody reads, so what
// stands in for reading it is this: load the real committed file in a real
// browser and make it prove the two things it exists to do.
//
//   1. It attaches exactly ONE global and every name the app needs is on it.
//   2. Two documents edited independently converge to the SAME text -- which is
//      the whole claim of a CRDT and the only reason to carry the file at all.
//
// Run this after vendor/build.sh, and after any version bump in it. It needs no
// server for the first half, but the second half loads the real app:
//
//   python3 -m http.server 8141 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/live_bundle_browser.js
//
const { chromium } = require('playwright');
const path = require('path');

const BUNDLE = path.join(__dirname, '..', 'live-bundle.js');

(async () => {
  const pass = [], fail = [], errors = [];
  const ok = (c, l) => (c ? pass : fail).push(l);
  const browser = await chromium.launch({ args: ['--no-sandbox'],
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await browser.newPage();
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource|ERR_CERT|ERR_CONNECTION|net::/.test(m.text())) return;
    errors.push('console: ' + m.text());
  });

  await p.setContent('<!doctype html><html><body><div id="ed"></div></body></html>');
  const before = await p.evaluate(() => Object.keys(window));
  await p.addScriptTag({ path: BUNDLE });
  const added = await p.evaluate(b => Object.keys(window).filter(k => !b.includes(k)), before);

  ok(await p.evaluate(() => !!window.LCARSLive), 'the committed bundle loads and attaches LCARSLive');

  // Two globals, both accounted for: ours, and Yjs's own guard against being
  // loaded twice. Anything ELSE appearing here is a library leaking a name into
  // a page that already has 9,700 lines of hand-written JS in it, so the list is
  // allow-listed rather than counted -- a count passes when one name is swapped
  // for another.
  const ALLOWED = ['LCARSLive', '__ $YJS$ __'];
  const unexpected = added.filter(k => !ALLOWED.includes(k));
  ok(unexpected.length === 0,
     'and leaks no global beyond LCARSLive and Yjs\'s own load guard' +
     (unexpected.length ? ' — unexpected: ' + unexpected.join(', ') : ''));

  // The check that actually protects the app: work out which globals are the
  // APP's own -- by diffing a blank page against LCARS.html -- then load the
  // bundle on top and confirm it changed none of them.
  //
  // Snapshotting all of `window` does not work: properties like `window.event`
  // are live browser getters that differ on every read, which reads as a
  // collision and is not one.
  const blank = await browser.newPage();
  await blank.setContent('<!doctype html><html><body></body></html>');
  const baseline = await blank.evaluate(() => Object.keys(window));
  await blank.close();

  const app = await browser.newPage();
  const appErrs = [];
  app.on('pageerror', e => appErrs.push(e.message));
  // A blocked external resource is not a JS error. lcars.css pulls Google Fonts
  // and the sandbox proxy refuses it, which has nothing to do with the bundle.
  app.on('console', m => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource|ERR_CERT|ERR_CONNECTION|net::/.test(m.text())) return;
    appErrs.push('console: ' + m.text());
  });
  await app.goto('http://127.0.0.1:8141/LCARS.html');
  await app.waitForTimeout(800);

  const appOwn = await app.evaluate(b => Object.keys(window).filter(k => !b.includes(k)), baseline);
  ok(appOwn.length > 50, 'the app really did load, so this check means something (' + appOwn.length + ' app globals)');

  const clobbered = await app.evaluate(async (names) => {
    const snap = {};
    for (const k of names) { try { snap[k] = window[k]; } catch (e) {} }
    const s = document.createElement('script');
    s.src = 'live-bundle.js';
    await new Promise((res, rej) => { s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    const hits = [];
    for (const k of names) { try { if (window[k] !== snap[k]) hits.push(k); } catch (e) {} }
    return hits;
  }, appOwn);

  ok(clobbered.length === 0,
     'the bundle overwrites none of the app\'s own globals' +
     (clobbered.length ? ' — clobbered: ' + clobbered.join(', ') : ''));
  ok(await app.evaluate(() => !!window.LCARSLive), 'and LCARSLive is available inside the real app');
  ok(appErrs.length === 0, 'and the real app raises no error with the bundle loaded' +
     (appErrs.length ? ' — ' + appErrs[0] : ''));
  await app.close();

  const missing = await p.evaluate(() => {
    const need = ['Y','ySyncPlugin','yCursorPlugin','yUndoPlugin','undo','redo',
                  'prosemirrorToYXmlFragment','yXmlFragmentToProsemirrorJSON',
                  'Schema','PMDOMParser','DOMSerializer','EditorState','TextSelection',
                  'EditorView','keymap','baseKeymap','toggleMark','chainCommands','history'];
    return need.filter(k => !window.LCARSLive[k]);
  });
  ok(missing.length === 0, 'every name the app needs is present' +
     (missing.length ? ' — missing: ' + missing.join(', ') : ''));

  // The claim. Two writers, apart, then each told what the other did.
  const merge = await p.evaluate(() => {
    const { Y } = window.LCARSLive;
    const a = new Y.Doc(), b = new Y.Doc();
    a.getText('t').insert(0, 'Hopper: The bridge was quiet.');
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));          // b joins the sim
    a.getText('t').insert(29, ' Rivera: Not for long.');  // both type at once
    b.getText('t').insert(0, 'OOC: ');
    const ua = Y.encodeStateAsUpdate(a), ub = Y.encodeStateAsUpdate(b);
    Y.applyUpdate(b, ua); Y.applyUpdate(a, ub);
    return { A: a.getText('t').toString(), B: b.getText('t').toString() };
  });
  ok(merge.A === merge.B, 'two writers editing at once converge on the same text');
  ok(/OOC: /.test(merge.A) && /Rivera: Not for long\./.test(merge.A),
     'and neither writer loses what the other typed');

  // Out-of-order and duplicate delivery must be harmless -- the property that
  // lets updates travel over polling rather than a WebSocket.
  const commutes = await p.evaluate(() => {
    const { Y } = window.LCARSLive;
    const base = new Y.Doc(); base.getText('t').insert(0, 'start. ');
    const seed = Y.encodeStateAsUpdate(base);
    const mk = (word, at) => { const d = new Y.Doc(); Y.applyUpdate(d, seed);
      d.getText('t').insert(at, word); return Y.encodeStateAsUpdate(d); };
    const u1 = mk('one ', 7), u2 = mk('two ', 7);
    const fwd = new Y.Doc(); Y.applyUpdate(fwd, seed);
    Y.applyUpdate(fwd, u1); Y.applyUpdate(fwd, u2); Y.applyUpdate(fwd, u1);  // dup
    const rev = new Y.Doc(); Y.applyUpdate(rev, seed);
    Y.applyUpdate(rev, u2); Y.applyUpdate(rev, u1);
    return { fwd: fwd.getText('t').toString(), rev: rev.getText('t').toString() };
  });
  ok(commutes.fwd === commutes.rev,
     'updates applied in either order, with a duplicate thrown in, give the same result');

  // And a real editor mounts on a real node and types through the CRDT.
  const pm = await p.evaluate(() => {
    const L = window.LCARSLive;
    const schema = new L.Schema({
      nodes: { doc: { content: 'block+' },
               paragraph: { group: 'block', content: 'inline*',
                            toDOM: () => ['div', 0], parseDOM: [{ tag: 'div' }, { tag: 'p' }] },
               text: { group: 'inline' } },
      marks: { strong: { toDOM: () => ['strong', 0], parseDOM: [{ tag: 'strong' }, { tag: 'b' }] } },
    });
    const ydoc = new L.Y.Doc();
    const frag = ydoc.getXmlFragment('prosemirror');
    const view = new L.EditorView(document.getElementById('ed'), {
      state: L.EditorState.create({ schema,
        plugins: [L.ySyncPlugin(frag), L.yUndoPlugin(), L.keymap(L.baseKeymap)] }),
    });
    view.dispatch(view.state.tr.insertText('Typed through the CRDT'));
    return { dom: document.getElementById('ed').innerText.trim(),
             inCrdt: frag.toString().includes('Typed through the CRDT'),
             editable: view.dom.contentEditable };
  });
  ok(pm.dom === 'Typed through the CRDT', 'an editor mounts and what you type reaches the DOM');
  ok(pm.inCrdt, 'and the same text is in the shared document, not just on screen');
  ok(pm.editable === 'true', 'and the editor is genuinely editable');

  console.log('\n--- live-writing bundle ---');
  pass.forEach(l => console.log('PASS: ' + l));
  fail.forEach(l => console.log('FAIL: ' + l));
  if (errors.length) { console.log('\nPAGE ERRORS:'); [...new Set(errors)].slice(0, 10).forEach(e => console.log('  ' + e)); }
  console.log('\n' + pass.length + ' passed, ' + fail.length + ' failed, ' + new Set(errors).size + ' page errors');
  await browser.close();
  process.exit(fail.length || errors.length ? 1 : 0);
})();
