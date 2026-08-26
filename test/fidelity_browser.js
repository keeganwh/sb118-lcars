// ================================================================
// OUTPUT FIDELITY AUDIT — the three render passes must agree
// ================================================================
// Three passes turn a stored sim into something someone reads:
//   1. the editor's `copy` handler  — the authority. What lands in Gmail.
//   2. lrToReadingHtml()            — the share viewer at /s/<token>.
//   3. applyMarkers()               — a WRITER'S aid. Tints markers so they can
//                                     be spotted mid-sim. No reader sees it.
// This drives one sim through all three and compares what a reader ends up
// with: block structure, bold/italic, colour, indentation, marker punctuation.
//
//   python3 -m http.server 8131 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/fidelity_browser.js
const { chromium } = require('playwright');

// One sim exercising every feature the roadmap item names: locations,
// dialogue tags, OOC, thoughts, markers, indentation and pasted-from-Docs
// content (which arrives as <p>, with spans and inline styles of its own).
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
  '<p></p>',
  '<p>A second pasted paragraph, after an empty one.</p>',
  '<ul><li>bullet one</li><li>bullet two</li></ul>',
  '<div>Doe: A closing line.</div>',
].join('');

(async () => {
  const pass=[], fail=[], errs=[], notes=[];
  const ok=(c,l)=>(c?pass:fail).push(l);
  const b = await chromium.launch({ args:['--no-sandbox'], executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ permissions:['clipboard-read','clipboard-write'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto('http://127.0.0.1:8131/LCARS.html');
  await p.evaluate(()=>localStorage.setItem('lcars_mode_v1','local'));
  await p.goto('http://127.0.0.1:8131/LCARS.html');
  await p.waitForTimeout(1300);
  await p.evaluate(()=>{const m=document.getElementById('mo');if(m)m.classList.add('hidden');});

  // A sim with a coloured character, so the colour pass runs for real.
  const res = await p.evaluate(SIM => {
    mkDoc('Fidelity audit', null, null);
    const doc = S.docs[curId];
    doc.content = SIM;
    doc.charColors = { 'Doe': '#33ccff' };
    doc.chars = ['Doe'];
    persist();
    // openDoc() flushes the *current* doc first, and mkDoc has already made this
    // one current with an empty editor -- reopening without clearing curId would
    // save that empty editor straight over the content we just set.
    const id = curId; curId = null;
    openDoc(id);

    // Pass 1 — the copy handler, driven by a real copy event on the editor.
    const ed = document.getElementById('editor');
    ed.focus();
    document.execCommand('selectAll');
    const dt = new DataTransfer();
    ed.dispatchEvent(new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true }));

    const prefs = getPrefs();
    return {
      stored:  doc.content,
      editor:  ed.innerHTML,
      copyHtml:  dt.getData('text/html'),
      copyText:  dt.getData('text/plain'),
      reading: lrToReadingHtml(doc.content, {
        format: { boldLocations: !!prefs.boldLocations,
                  italicOOC:     !!prefs.italicOOC,
                  thoughtItalic: !!prefs.thoughtItalic },
        academy: false,
      }),
      markers: applyMarkers(doc.content),
      prefs: { boldLocations: !!prefs.boldLocations, italicOOC: !!prefs.italicOOC,
               thoughtItalic: !!prefs.thoughtItalic, autoBoldNames: !!prefs.autoBoldNames },
    };
  }, SIM);

  console.log('--- prefs in play ---'); console.log(JSON.stringify(res.prefs));
  const dump = (k) => { console.log('\n--- ' + k + ' ---'); console.log(res[k]); };
  ['editor','copyHtml','reading','markers'].forEach(dump);
  console.log('\n--- copyText ---'); console.log(JSON.stringify(res.copyText));

  // ---- comparisons -------------------------------------------------
  const has = (s, re) => re.test(s);

  // 1. No colour reaches a reader, by either route.
  ok(!has(res.copyHtml, /color\s*:/i), 'copy-out carries no colour at all');
  ok(!has(res.reading,  /color\s*:/i), 'the reading pass carries no colour at all');
  ok(!has(res.copyHtml, /data-char-clr/), 'copy-out carries no character-colour attributes');
  ok(!has(res.reading,  /data-char-clr/), 'the reading pass carries no character-colour attributes');

  // 2. No marker tint spans (the writer's aid) reach a reader.
  const tint = /class="(am|cm|tm|lm|om|bk)"/;
  ok(!has(res.copyHtml, tint), 'copy-out has no marker tint spans');
  ok(!has(res.reading,  tint), 'the reading pass has no marker tint spans');
  ok(has(res.markers,   tint), 'applyMarkers DOES tint — it is the writer-only pass');

  // 3. Locations bold, OOC/thoughts per prefs — the two reader passes agree.
  const boldLoc  = s => /<strong>\(\(USS Example, Deck 12\)\)<\/strong>/.test(s);
  const emOOC    = s => /<em>\(\(OOC: a note to the group\.\)\)<\/em>/.test(s);
  const emThink  = s => /<em>oO That cannot be right\. Oo<\/em>/.test(s);
  ok(boldLoc(res.copyHtml) === boldLoc(res.reading),
     'locations: copy-out and the reading pass agree (' + boldLoc(res.copyHtml) + '/' + boldLoc(res.reading) + ')');
  ok(emOOC(res.copyHtml) === emOOC(res.reading),
     'OOC: copy-out and the reading pass agree (' + emOOC(res.copyHtml) + '/' + emOOC(res.reading) + ')');
  ok(emThink(res.copyHtml) === emThink(res.reading),
     'thoughts: copy-out and the reading pass agree (' + emThink(res.copyHtml) + '/' + emThink(res.reading) + ')');

  // 4. Marker punctuation survives as plain text in both.
  ['::He steps toward the console.::', '=/\\= Bridge to Engineering =/\\=']
    .forEach(m => {
      const strip = s => s.replace(/<[^>]+>/g,'').replace(/ /g,' ');
      ok(strip(res.copyHtml).includes(m), 'copy-out keeps the marker punctuation: ' + m);
      ok(strip(res.reading).includes(m),  'the reading pass keeps it too: ' + m);
    });

  // 5. <p> normalisation — copy-out must not ship <p>, which double-spaces.
  ok(!has(res.copyHtml, /<p[\s>]/i), 'copy-out contains no <p> (they double-space everywhere else)');
  ok(!has(res.reading, /<p[\s>]/i), 'the reading pass contains no <p> either');

  // 6. Indentation survives as margin-left in both.
  ok(has(res.copyHtml, /margin-left:\s*4em/), 'copy-out turns ind-2 into margin-left:4em');
  ok(/<ul[^>]*style="[^"]*margin-top:\s*0/.test(res.copyHtml),
     'copy-out states a zero margin on a list, so mail clients do not add a gap');
  notes.push('reading pass keeps ind-2 as: ' +
    (/class="ind-2"/.test(res.reading) ? 'class="ind-2"'
      : /margin-left/.test(res.reading) ? 'margin-left' : 'NOTHING — indent lost'));

  // 6b. Lists must state their own margin, since a mail client's default
  // stylesheet puts a gap above and below one and LCARS's does not.
  const ul = /<ul[^>]*>/.exec(res.copyHtml);
  notes.push('copy-out <ul> tag: ' + (ul ? ul[0] : 'none in this sim'));

  // 7. Empty lines: one blank line per empty block, no more, no fewer.
  const blanks = (res.copyText.match(/\n\s*\n/g)||[]).length;
  notes.push('blank-line runs in the plain-text clipboard: ' + blanks);
  ok(!/\n\s*\n\s*\n/.test(res.copyText), 'no tripled blank lines in the plain-text copy');

  // 8. Pasted-from-Docs styling must not survive into a reader's copy.
  ok(!has(res.copyHtml, /font-family/i), 'copy-out drops pasted font-family');
  ok(!has(res.reading, /font-family/i), 'the reading pass drops pasted font-family');


  // ---- Google Docs paste round trip ---------------------------------
  // Docs puts the whole selection inside <b id="docs-internal-guid-..."
  // style="font-weight:normal"> and marks real bold as <span
  // style="font-weight:700">. Whether that survives paste decides what the
  // writer sees, and it is the case the roadmap item names.
  const DOCS = `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-abc"><p dir="ltr" style="line-height:1.38"><span style="font-family:Arial;color:#000000;font-weight:400;">Plain words, then </span><span style="font-family:Arial;font-weight:700;">a bold run</span><span style="font-family:Arial;font-weight:400;">, then </span><span style="font-family:Arial;font-style:italic;font-weight:400;">an italic run</span><span style="font-weight:400;">.</span></p><p dir="ltr"><span style="font-family:Arial;">Second Docs paragraph.</span></p></b>`;

  const paste = await p.evaluate(DOCS => {
    mkDoc('Docs paste', null, null);
    const ed = document.getElementById('editor');
    ed.focus();
    const dt = new DataTransfer();
    dt.setData('text/html', DOCS);
    dt.setData('text/plain', 'Plain words, then a bold run, then an italic run.\nSecond Docs paragraph.');
    ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles:true, cancelable:true }));
    flushSave();
    // What the WRITER sees, measured rather than inferred from the markup.
    const weights = [...ed.querySelectorAll('p,div')]
      .map(el => getComputedStyle(el).fontWeight);
    ed.focus(); document.execCommand('selectAll');
    const cd = new DataTransfer();
    ed.dispatchEvent(new ClipboardEvent('copy', { clipboardData: cd, bubbles:true, cancelable:true }));
    return { stored: S.docs[curId].content, weights,
             copyHtml: cd.getData('text/html'),
             reading: lrToReadingHtml(S.docs[curId].content, { format: {}, academy: false }) };
  }, DOCS);

  console.log('\n--- Docs paste, stored ---');   console.log(paste.stored);
  console.log('--- Docs paste, copied out ---'); console.log(paste.copyHtml);
  console.log('--- computed font-weight of each pasted block in the editor ---');
  console.log(JSON.stringify(paste.weights));

  const allBoldInEditor = paste.weights.length && paste.weights.every(w => +w >= 600);
  ok(!allBoldInEditor, 'a Google Docs paste does NOT come in entirely bold');
  ok(/<(b|strong)[\s>]/i.test(paste.copyHtml) === /<(b|strong)[\s>]/i.test(paste.stored),
     'the bold in a pasted sim survives copy-out as it survived the paste');
  ok(/a bold run/.test(paste.copyHtml.replace(/<[^>]+>/g,'')) &&
     /<(b|strong)>[^<]*a bold run/.test(paste.copyHtml),
     'the run that was actually bold in Docs is still bold on the clipboard');

  console.log('\n--- notes ---'); notes.forEach(n=>console.log('  ' + n));
  console.log('');
  pass.forEach(l=>console.log('PASS: '+l)); fail.forEach(l=>console.log('FAIL: '+l));
  if (errs.length) console.log([...new Set(errs)].join('\n'));
  console.log('\n'+pass.length+' passed, '+fail.length+' failed');
  await b.close(); process.exit(0);
})();
