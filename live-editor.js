// ================================================================
// LCARS LIVE EDITOR — the spike
// ================================================================
// Loaded by LCARS.html, after live-bundle.js and before lcars.js. It holds the
// schema a joint sim is co-authored through, and the markers and character
// colours as decorations. Optional at runtime: jpLiveAvailable() checks for it,
// so the app works exactly as before if it is missing.
//
// It began as ROADMAP Batch 7's spike -- can a Yjs-backed ProseMirror editor
// hold a real LCARS sim without losing anything -- and `test/live_spike_browser.js`
// is still that verdict, kept as a standing check on the round trip.
//
// THE FINDING THIS IS BUILT ON, which the planning brief did not know:
//
// The brief said the marker, name-bolding and character-colour passes were
// "the project" -- bulk innerHTML rewrites that a character-level CRDT cannot
// survive, because replacing innerHTML reads as "deleted everything, inserted
// everything" and destroys concurrent edits.
//
// That is true of `transformNow()` as written. But reading lcars-render.js shows
// those passes are PURE FUNCTIONS OF THE TEXT. `lrApplyMarkers()` begins by
// stripping every span it has ever written -- am, cm, tm, lm, om, bk -- and
// re-derives them from the characters themselves (`::action::`, `oO thought Oo`,
// `((location))`). `lrApplyCharColors()` does the same with `data-char-clr`.
//
// So the marker spans are not content. They are a VIEW of the content, rebuilt
// from scratch on every pass, and they have no business in a shared document.
// ProseMirror already has the right shape for this: decorations are presentation
// that live outside the document, so applying them generates NO transaction and
// therefore NO CRDT edit. The passes do not need reconciling with the CRDT --
// they need demoting out of the document, which is possible precisely because
// they were already derived.
//
// What the shared document holds is only what a writer actually authored:
// block structure, indentation, real bold and italic, and the text.
// ================================================================

(function () {
  'use strict';

  // The marker patterns, as text ranges rather than HTML replacements.
  //
  // DRIFT WARNING. These mirror `lrApplyMarkers()` in lcars-render.js, which is
  // the shipped definition. Two copies of a marker pattern is exactly the
  // duplication that file exists to prevent, so they are NOT left to trust:
  // `test/live_spike_browser.js` asserts that these and lrApplyMarkers agree on
  // real sim content, and fails if they diverge. If this spike is adopted, the
  // follow-up is to export the patterns from lcars-render.js and delete these.
  const MARKERS = [
    // cls          pattern                                   note
    ['am',  /::((?:(?!::)[\s\S])*?)::/g],                   // action
    ['cm',  /=\/\\=((?:(?!=\/\\=)[\s\S])*?)=\/\\=/g],       // comms
    ['tm',  /\boO\s(?:(?!\boO\s)[\s\S])*?\sOo\b/g],         // thought
    ['om',  /\(\(OOC[^)<>]*\)\)/g],                         // OOC -- before lm
    ['lm',  /\(\((?!OOC)[^)<>]+\)\)/g],                     // location
  ];
  const ACADEMY_BRACKETS = /\[[^\]\n<]+\]/g;

  // ── The schema ───────────────────────────────────────────────────────────
  // Only what a writer authors. Deliberately NOT in here: marker spans, the
  // character-colour attributes, and `strong.cn` auto-bolding -- all derived.
  //
  // `<p>` parses to the same node as `<div>` and serialises back as `<div>`.
  // That is not a liberty: the project already normalises p -> div on the way
  // out (see lrToReadingHtml and the copy handler) because `<p>` carries a
  // margin everywhere except inside #editor, which is what made sims pasted
  // from Google Docs copy out double spaced.
  function buildSchema(L) {
    const blockAttrs = {
      indent: { default: 0 },         // ind-1..4
      style: { default: null },       // margin-left, and whatever a paste dragged in
      charOverride: { default: null },// data-char-override
    };
    const readBlock = dom => ({
      indent: (() => { const m = /\bind-([1-4])\b/.exec(dom.getAttribute('class') || ''); return m ? +m[1] : 0; })(),
      style: dom.getAttribute('style') || null,
      charOverride: dom.getAttribute('data-char-override') || null,
    });
    const writeBlock = node => {
      const a = {};
      if (node.attrs.indent) a.class = 'ind-' + node.attrs.indent;
      if (node.attrs.style) a.style = node.attrs.style;
      if (node.attrs.charOverride) a['data-char-override'] = node.attrs.charOverride;
      return a;
    };

    return new L.Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          group: 'block', content: 'inline*', attrs: blockAttrs,
          parseDOM: [{ tag: 'div', getAttrs: readBlock }, { tag: 'p', getAttrs: readBlock }],
          toDOM: node => ['div', writeBlock(node), 0],
        },
        bullet_list: {
          group: 'block', content: 'list_item+',
          parseDOM: [{ tag: 'ul' }], toDOM: () => ['ul', 0],
        },
        ordered_list: {
          group: 'block', content: 'list_item+',
          parseDOM: [{ tag: 'ol' }], toDOM: () => ['ol', 0],
        },
        list_item: {
          content: 'inline*', attrs: blockAttrs,
          parseDOM: [{ tag: 'li', getAttrs: readBlock }],
          toDOM: node => ['li', writeBlock(node), 0],
        },
        text: { group: 'inline' },
      },
      marks: {
        // One mark for bold, with a flag for "LCARS put this here". boldNames()
        // only ever strips strong.cn, so a writer's own bold has to be
        // distinguishable from the automatic kind or it would be eaten.
        strong: {
          attrs: { auto: { default: false } },
          parseDOM: [
            { tag: 'strong', getAttrs: d => ({ auto: /\bcn\b/.test(d.getAttribute('class') || '') }) },
            { tag: 'b', getAttrs: d => ({ auto: /\bcn\b/.test(d.getAttribute('class') || '') }) },
            { style: 'font-weight', getAttrs: v => /^(bold(er)?|[5-9]\d\d)$/.test(v) ? { auto: false } : false },
          ],
          toDOM: m => m.attrs.auto ? ['strong', { class: 'cn' }, 0] : ['strong', 0],
        },
        em: {
          parseDOM: [{ tag: 'em' }, { tag: 'i' }, { style: 'font-style=italic' }],
          toDOM: () => ['em', 0],
        },
      },
    });
  }

  // ── Markers as decorations ───────────────────────────────────────────────
  // The whole point. This adds spans to what is DRAWN and never to the
  // document, so it produces no transaction, so the CRDT never sees it. The
  // editor's `transformNow()` did the opposite: it rewrote innerHTML, which to
  // a CRDT is a total delete and reinsert.
  function markerPlugin(L, getOpts) {
    const { Plugin } = L;
    return new Plugin({
      props: {
        decorations(state) {
          const opts = getOpts ? getOpts() : {};
          const fmts = opts.fmts || {};
          const decos = [];
          state.doc.descendants((node, pos) => {
            if (!node.isTextblock) return;
            const text = node.textContent;
            if (!text) return;
            const base = pos + 1;      // inside the textblock
            const taken = [];
            const free = (from, to) => !taken.some(r => from < r[1] && to > r[0]);
            const add = (from, to, cls) => {
              if (!free(from, to)) return;
              taken.push([from, to]);
              decos.push(L.Decoration.inline(base + from, base + to, { class: cls }));
            };
            for (const [cls, re] of MARKERS) {
              if (cls === 'am' && !fmts.action) continue;
              if (cls === 'cm' && !fmts.comms) continue;
              if (cls === 'tm' && !fmts.thought && !opts.thoughtItalic) continue;
              re.lastIndex = 0;
              let m;
              while ((m = re.exec(text)) !== null) {
                add(m.index, m.index + m[0].length,
                    cls === 'tm' && !fmts.thought ? 'tm-em' : cls);
                if (m[0].length === 0) re.lastIndex++;
              }
            }
            if (opts.academy) {
              ACADEMY_BRACKETS.lastIndex = 0;
              let m;
              while ((m = ACADEMY_BRACKETS.exec(text)) !== null)
                add(m.index, m.index + m[0].length, 'bk');
            }
            return false;        // textblocks do not nest
          });
          return L.DecorationSet.create(state.doc, decos);
        },
      },
    });
  }

  // ── Character colours, also decorations ──────────────────────────────────
  // Same argument. lrApplyCharColors strips and re-derives from "Name:" at the
  // start of a block, so it is a view of the text, not content.
  function charColorPlugin(L, getColors) {
    return new L.Plugin({
      props: {
        decorations(state) {
          const colors = (getColors ? getColors() : null) || {};
          const names = Object.keys(colors);
          if (!names.length) return null;
          const decos = [];
          state.doc.descendants((node, pos) => {
            if (!node.isTextblock) return;
            const over = node.attrs.charOverride;
            const text = node.textContent.trimStart();
            let hex = null;
            if (over) {
              const k = names.find(n => n.toLowerCase() === over.toLowerCase());
              if (k) hex = colors[k];
            } else {
              for (const n of names) {
                const safe = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (new RegExp('^' + safe + '\\s*:', 'i').test(text)) { hex = colors[n]; break; }
              }
            }
            if (hex) decos.push(L.Decoration.node(pos, pos + node.nodeSize,
              { style: 'color:' + hex, 'data-char-clr': '1' }));
            return false;
          });
          return L.DecorationSet.create(state.doc, decos);
        },
      },
    });
  }

  // ── Stored HTML <-> document ─────────────────────────────────────────────
  // A sim comes out of S.docs as an HTML string, and has to go back as one that
  // the existing copy handler, share link and render passes all still accept.
  function htmlToDoc(L, schema, html) {
    const tmp = document.createElement('div');
    // Strip the derived layer on the way in. These are rebuilt by the
    // decoration plugins, and carrying them into the document would make
    // presentation into content -- which is the bug this design avoids.
    tmp.innerHTML = String(html == null ? '' : html);
    tmp.querySelectorAll('span.am,span.cm,span.tm,span.lm,span.om,span.bk,span.cc-nm')
       .forEach(sp => { while (sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp);
                        sp.parentNode.removeChild(sp); });
    tmp.querySelectorAll('[data-char-clr]').forEach(el => {
      el.removeAttribute('data-char-clr');
      el.style.removeProperty('color');
      if (!el.getAttribute('style')) el.removeAttribute('style');
    });
    return L.PMDOMParser.fromSchema(schema).parse(tmp);
  }

  function docToHtml(L, schema, doc) {
    const frag = L.DOMSerializer.fromSchema(schema).serializeFragment(doc.content);
    const tmp = document.createElement('div');
    tmp.appendChild(frag);
    // An empty block must survive as <div><br></div>: that is how the editor
    // keeps a blank line, and a bare <div></div> collapses.
    tmp.querySelectorAll('div,li').forEach(el => {
      if (!el.firstChild) el.appendChild(document.createElement('br'));
    });
    return tmp.innerHTML;
  }

  window.LCARSLiveEditor = {
    MARKERS, ACADEMY_BRACKETS,
    buildSchema, markerPlugin, charColorPlugin, htmlToDoc, docToHtml,
  };
})();
