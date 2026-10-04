// ROADMAP Batch 7 spike — can a Yjs-backed editor hold a real LCARS sim?
//
// The brief said to spike ONLY this, with nothing shared between browsers,
// because the editor is the risk and not the merge algorithm. So: one real sim,
// through a Yjs-backed ProseMirror editor, and back out.
//
// What has to be true for this to be worth building on:
//
//   1. ROUND TRIP. A real sim's stored HTML goes in and comes back out
//      unchanged in meaning -- indents, pasted <p> styles, bold runs, lists.
//      If this loses anything, writers lose sims, and nothing else matters.
//   2. THE PASSES GENERATE NO EDITS. Markers and character colours must be
//      decorations, not document changes. Asserted the only way that counts:
//      the Yjs document's state vector must be IDENTICAL before and after a
//      full redraw with every pass switched on.
//   3. THE MARKERS STILL AGREE WITH THE SHIPPED PASS. The decoration patterns
//      mirror lrApplyMarkers(), and two copies of a marker pattern is the exact
//      duplication lcars-render.js exists to prevent -- so they are checked
//      against it rather than trusted.
//   4. COPY-OUT IS UNAFFECTED. lrToReadingHtml() must produce the same reading
//      HTML from the round-tripped sim as from the original.
//
//   python3 -m http.server 8142 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/live_spike_browser.js
//
const { chromium } = require('playwright');

// The fidelity suite's sample, which is already the realistic one: every marker
// type, an indent, pasted <p> with inline colour and font, a pasted bold run,
// an empty pasted paragraph, a list, and dialogue tags.
const SIM = [
  '<div>((USS Example, Deck 12))</div>',
  '<div><br></div>',
  '<div>Doe: This is a dialogue tag with a name in front of it.</div>',
  '<div>::He steps toward the console.::</div>',
  '<div>oO That cannot be right. Oo</div>',
  '<div>=/\\= Bridge to Engineering =/\\=</div>',
  '<div class="ind-2">An indented line, two levels in.</div>',
  '<div>((OOC: a note to the group.))</div>',
  '<div><br></div>',
  '<p style="color:#ff0000;font-family:Arial">Pasted from Google Docs, red and Arial.</p>',
  '<p><span style="font-weight:700">Bold run pasted from Docs.</span></p>',
  '<p>A second pasted paragraph, after an empty one.</p>',
  '<ul><li>bullet one</li><li>bullet two</li></ul>',
  '<div>Doe: A closing line.</div>',
].join('');

(async () => {
  const pass = [], fail = [], errors = [], notes = [];
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

  // lcars-render.js is loaded so the decoration patterns can be checked against
  // the SHIPPED marker pass rather than against a copy of it.
  await p.goto('http://127.0.0.1:8142/test/spike-harness.html');
  await p.waitForTimeout(300);

  const r = await p.evaluate((simHtml) => {
    const L = window.LCARSLive, E = window.LCARSLiveEditor;
    const out = {};
    const schema = E.buildSchema(L);

    // --- 1. Round trip -----------------------------------------------------
    const doc = E.htmlToDoc(L, schema, simHtml);
    const back = E.docToHtml(L, schema, doc);
    out.back = back;
    const norm = h => { const d = document.createElement('div'); d.innerHTML = h; return d.innerHTML; };
    // p -> div is a deliberate normalisation the project already performs on the
    // way out, so compare against the sim with that same normalisation applied.
    const expectDiv = (() => {
      const d = document.createElement('div'); d.innerHTML = simHtml;
      d.querySelectorAll('p').forEach(para => {
        const n = document.createElement('div');
        [...para.attributes].forEach(a => n.setAttribute(a.name, a.value));
        while (para.firstChild) n.appendChild(para.firstChild);
        para.parentNode.replaceChild(n, para);
      });
      return d.innerHTML;
    })();
    out.expectDiv = norm(expectDiv);

    const text = h => { const d = document.createElement('div'); d.innerHTML = h; return (d.innerText || '').replace(/\s+/g, ' ').trim(); };
    out.textIn = text(simHtml); out.textOut = text(back);

    const feat = h => { const d = document.createElement('div'); d.innerHTML = h; return {
      blocks: d.querySelectorAll('div,li').length,
      ind2: d.querySelectorAll('.ind-2').length,
      lists: d.querySelectorAll('ul,ol').length,
      items: d.querySelectorAll('li').length,
      // Effective bold: a real tag OR an inline font-weight, since a Docs paste
      // arrives as the latter and the schema normalises it to the former.
      bold: [...d.querySelectorAll('strong,b,[style*="font-weight"]')]
              .filter(e => !e.closest('strong,b') || e.matches('strong,b'))
              .map(e => e.textContent.trim()).filter(Boolean).sort().join('|'),
      blanks: [...d.querySelectorAll('div')].filter(e => e.querySelector('br') && !e.textContent.trim()).length,
      marginLeft: [...d.querySelectorAll('[style*="margin-left"]')].length,
    }; };
    out.fIn = feat(expectDiv); out.fOut = feat(back);

    // --- 2. The passes must generate NO document edits ---------------------
    const ydoc = new L.Y.Doc();
    const frag = ydoc.getXmlFragment('sim');
    // SEED FIRST. ySyncPlugin treats the Yjs fragment as the only source of
    // truth, so creating the state with `doc` and an empty fragment gives an
    // empty editor -- silently, with no error raised. The sim goes into the
    // fragment, and the state is then built from the schema with no doc.
    L.prosemirrorToYXmlFragment(doc, frag);
    out.seededLen = frag.toString().length;
    const view = new L.EditorView(document.getElementById('ed'), {
      state: L.EditorState.create({
        schema,
        plugins: [
          L.ySyncPlugin(frag),
          L.yUndoPlugin(),
          L.keymap(L.baseKeymap),
          E.markerPlugin(L, () => ({ fmts: { action: true, comms: true, thought: true },
                                     thoughtItalic: true, academy: true })),
          E.charColorPlugin(L, () => ({ Doe: '#4682b4' })),
        ],
      }),
    });

    const sv = () => Array.from(L.Y.encodeStateVector(ydoc)).join(',');
    const svBefore = sv();
    const updatesSeen = [];
    ydoc.on('update', u => updatesSeen.push(u.length));
    // Force a full redraw with every pass on: decorations recompute.
    view.updateState(view.state);
    view.dispatch(view.state.tr.setMeta('force', Date.now()));   // no doc change
    const svAfter = sv();
    out.svUnchanged = svBefore === svAfter;
    out.updatesFromPasses = updatesSeen.length;

    // The decorations must nonetheless be VISIBLE -- a pass that draws nothing
    // would trivially generate no edits.
    const dom = view.dom;
    out.drawn = {
      am: dom.querySelectorAll('.am').length,
      cm: dom.querySelectorAll('.cm').length,
      tm: dom.querySelectorAll('.tm,.tm-em').length,
      lm: dom.querySelectorAll('.lm').length,
      om: dom.querySelectorAll('.om').length,
      bk: dom.querySelectorAll('.bk').length,
      coloured: dom.querySelectorAll('[data-char-clr]').length,
    };
    // And the document must still contain no marker markup at all.
    out.docHasMarkerSpans = /class="(am|cm|tm|lm|om|bk)"/.test(E.docToHtml(L, schema, view.state.doc));

    // A real edit MUST still reach the CRDT, or the binding is inert.
    view.dispatch(view.state.tr.insertText('X', 1));
    out.svChangedOnRealEdit = sv() !== svAfter;

    // --- 3. Markers agree with the shipped pass ----------------------------
    // Compare the ranges this plugin would mark against what lrApplyMarkers
    // actually wraps, per block, on the same text.
    const shipped = window.lrApplyMarkers(simHtml, {
      fmts: { action: true, comms: true, thought: true }, thoughtItalic: false, academy: true });
    const sd = document.createElement('div'); sd.innerHTML = shipped;
    const shippedMarked = [...sd.querySelectorAll('span.am,span.cm,span.tm,span.lm,span.om,span.bk')]
      .map(s => s.getAttribute('class') + ':' + s.textContent).sort();
    // The same, derived from the plugin's own patterns over the same text.
    const mine = [];
    const blocks = [...sd.querySelectorAll('div,p,li')];
    for (const bl of blocks) {
      const t = bl.textContent;
      const taken = [];
      for (const [cls, re] of E.MARKERS) {
        re.lastIndex = 0; let m;
        while ((m = re.exec(t)) !== null) {
          const a = m.index, b = a + m[0].length;
          if (taken.some(r => a < r[1] && b > r[0])) continue;
          taken.push([a, b]); mine.push(cls + ':' + m[0]);
          if (!m[0].length) re.lastIndex++;
        }
      }
      E.ACADEMY_BRACKETS.lastIndex = 0; let m2;
      while ((m2 = E.ACADEMY_BRACKETS.exec(t)) !== null) {
        const a = m2.index, b = a + m2[0].length;
        if (taken.some(r => a < r[1] && b > r[0])) continue;
        taken.push([a, b]); mine.push('bk:' + m2[0]);
      }
    }
    out.shippedMarked = shippedMarked;
    out.mineMarked = mine.sort();

    // --- 3b. Academy brackets, which the shared sample does not contain ----
    const aDoc = E.htmlToDoc(L, schema, '<div>Doe: [she is lying] and knows it.</div>');
    const aY = new L.Y.Doc();
    L.prosemirrorToYXmlFragment(aDoc, aY.getXmlFragment('sim'));
    const aHost = document.createElement('div'); document.body.appendChild(aHost);
    const aView = new L.EditorView(aHost, {
      state: L.EditorState.create({ schema, plugins: [
        L.ySyncPlugin(aY.getXmlFragment('sim')),
        E.markerPlugin(L, () => ({ fmts: {}, academy: true })),
      ] }),
    });
    const aSv = Array.from(L.Y.encodeStateVector(aY)).join(',');
    aView.updateState(aView.state);
    out.academyDrawn = aHost.querySelectorAll('.bk').length;
    out.academyText = (aHost.querySelector('.bk') || {}).textContent || null;
    out.academyNoEdit = Array.from(L.Y.encodeStateVector(aY)).join(',') === aSv;
    // Switched off, nothing should be marked.
    const aOffHost = document.createElement('div'); document.body.appendChild(aOffHost);
    const aOff = new L.Y.Doc();
    L.prosemirrorToYXmlFragment(E.htmlToDoc(L, schema, '<div>Doe: [she is lying] and knows it.</div>'),
                                aOff.getXmlFragment('sim'));
    new L.EditorView(aOffHost, {
      state: L.EditorState.create({ schema, plugins: [
        L.ySyncPlugin(aOff.getXmlFragment('sim')),
        E.markerPlugin(L, () => ({ fmts: {}, academy: false })),
      ] }),
    });
    out.academyOffDrawn = aOffHost.querySelectorAll('.bk').length;

    // --- 4. Copy-out unaffected -------------------------------------------
    const fmt = { boldLocations: true, italicOOC: true, thoughtItalic: true };
    out.readIn = window.lrToReadingHtml(simHtml, { format: fmt });
    out.readOut = window.lrToReadingHtml(back, { format: fmt });
    return out;
  }, SIM);

  // --- assertions ---------------------------------------------------------
  ok(r.textIn === r.textOut, 'every word survives the round trip');
  if (r.textIn !== r.textOut) notes.push('  in : ' + r.textIn + '\n  out: ' + r.textOut);

  ok(r.fIn.blocks === r.fOut.blocks, `block count survives (${r.fIn.blocks} -> ${r.fOut.blocks})`);
  ok(r.fOut.ind2 === r.fIn.ind2, 'the indented line keeps its indent');
  ok(r.fOut.lists === r.fIn.lists && r.fOut.items === r.fIn.items, 'the bulleted list survives as a list');
  ok(r.fOut.bold === r.fIn.bold, 'the bold run pasted from Docs is still bold');
  if (r.fOut.bold !== r.fIn.bold) notes.push('  bold in : ' + r.fIn.bold + '\n  bold out: ' + r.fOut.bold);
  ok(r.fOut.blanks === r.fIn.blanks, `blank lines survive (${r.fIn.blanks})`);

  ok(r.svUnchanged, 'THE KEY ONE: markers and colours generate no CRDT edit at all');
  ok(r.updatesFromPasses === 0, 'and the shared document emits no update when they redraw');
  ok(r.drawn.am && r.drawn.cm && r.drawn.tm && r.drawn.lm && r.drawn.om,
     'while still drawing every marker type: ' + JSON.stringify(r.drawn));
  ok(r.drawn.coloured > 0, 'and still colouring the speaker\'s lines');
  ok(r.docHasMarkerSpans === false, 'and the shared document holds no marker markup');
  ok(r.svChangedOnRealEdit, 'a real keystroke still does reach the shared document');
  ok(r.seededLen > 0, 'the sim really did reach the shared document when seeded (' + r.seededLen + ' chars)');

  const same = JSON.stringify(r.shippedMarked) === JSON.stringify(r.mineMarked);
  ok(same, 'the decoration patterns mark exactly what the shipped lrApplyMarkers wraps');
  if (!same) notes.push('  shipped: ' + JSON.stringify(r.shippedMarked) + '\n  mine   : ' + JSON.stringify(r.mineMarked));

  ok(r.academyDrawn === 1 && r.academyText === '[she is lying]',
     'an Academy sim gets its [brackets] marked (' + JSON.stringify(r.academyText) + ')');
  ok(r.academyNoEdit, 'and marking them generates no CRDT edit either');
  ok(r.academyOffDrawn === 0, 'and a non-Academy sim leaves brackets alone');

  // Copy-out. The round trip turns out to produce ONE difference, and it is an
  // improvement rather than a loss, so it is asserted as such instead of being
  // smoothed over.
  //
  // The sample deliberately carries the raw Google Docs shape --
  // `<span style="font-weight:700">` -- because the fidelity suite uses it to
  // exercise the paste path. lrToReadingHtml() strips `style` and keeps the bare
  // `<span>`, so the bold is LOST on the way to the group. Parsing through the
  // schema reads the weight off the style and stores a real `<strong>`, which
  // survives. cleanPasteHTML() normalises this at paste time now, so a sim
  // pasted today is unaffected; a sim stored BEFORE that fix is repaired by the
  // round trip.
  const repaired = r.readIn
    .split('<span>Bold run pasted from Docs.</span>')
    .join('<strong>Bold run pasted from Docs.</strong>');
  ok(repaired === r.readOut,
     'copy-out is unchanged by the round trip, except that bold pasted from Docs survives it');
  ok(/<span>Bold run pasted from Docs\.<\/span>/.test(r.readIn) &&
     /<strong>Bold run pasted from Docs\.<\/strong>/.test(r.readOut),
     'and that one difference is bold being KEPT rather than dropped');
  if (repaired !== r.readOut) {
    let i = 0; while (i < repaired.length && repaired[i] === r.readOut[i]) i++;
    notes.push('  copy-out diverges at char ' + i + ':\n    in : ...' +
               repaired.slice(Math.max(0, i - 60), i + 120) + '\n    out: ...' +
               r.readOut.slice(Math.max(0, i - 60), i + 120));
  }

  console.log('\n--- live-writing spike ---');
  pass.forEach(l => console.log('PASS: ' + l));
  fail.forEach(l => console.log('FAIL: ' + l));
  if (notes.length) { console.log('\nDETAIL:'); notes.forEach(n => console.log(n)); }
  if (errors.length) { console.log('\nPAGE ERRORS:'); [...new Set(errors)].slice(0, 8).forEach(e => console.log('  ' + e)); }
  console.log('\n' + pass.length + ' passed, ' + fail.length + ' failed, ' + new Set(errors).size + ' page errors');
  await browser.close();
  process.exit(fail.length || errors.length ? 1 : 0);
})();
