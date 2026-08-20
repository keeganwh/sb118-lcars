// ================================================================
// LCARS SHARED RENDER PASS
// ================================================================
// The display transforms that turn a stored sim into what a reader sees:
// marker spans (action, comms, thought, location, OOC, Academy brackets) and
// per-character colouring.
//
// This lives in its own file because two pages need it. The app loads it and
// wraps each function with the current editor state; share.html loads it and
// passes the published copy's own settings. Keeping one implementation is the
// whole point -- a marker change made in only one of two copies renders shared
// sims wrongly, and nobody notices for weeks.
//
// Everything here is pure: state comes in as arguments, never off a global.
// Load it BEFORE lcars.js.

const LR_ZWS = String.fromCharCode(0x200B); // caret anchor left behind by the editor

// Apply marker spans to stored sim HTML.
//   opts.fmts          {action, comms, thought} -- which markers are switched on
//   opts.thoughtItalic  fall back to <em> for thoughts when fmts.thought is off
//   opts.academy        Academy sim: also mark [bracketed] text
function lrApplyMarkers(html, opts) {
  opts = opts || {};
  const fmts = opts.fmts || {};
  html = html.split(LR_ZWS).join('');
  html = html.replace(/<span class="am">([\s\S]*?)<\/span>/g, '$1');
  html = html.replace(/<span class="cm">([\s\S]*?)<\/span>/g, '$1');
  html = html.replace(/<span class="bk">([\s\S]*?)<\/span>/g, '$1');
  html = html.replace(/<span class="lm">([\s\S]*?)<\/span>/g, '$1');
  html = html.replace(/<span class="om">([\s\S]*?)<\/span>/g, '$1');
  html = html.replace(/<span class="tm"><em>(oO\s[\s\S]*?\sOo)<\/em><\/span>/g, '$1');
  html = html.replace(/<span class="tm">(oO\s[\s\S]*?\sOo)<\/span>/g, '$1');
  html = html.replace(/<em>(oO\s[\s\S]*?\sOo)<\/em>/g, '$1');
  if (fmts.action)
    html = html.replace(/::((?:(?!::)[\s\S])*?)::/g, (_,i) => `<span class="am">::${i}::</span>`);
  if (fmts.comms)
    html = html.replace(/=\/\\=((?:(?!=\/\\=)[\s\S])*?)=\/\\=/g, (_,i) => `<span class="cm">=/\\= ${i.trim()} =/\\=</span>`);
  // Prevent matching across paragraph (div) boundaries in innerHTML
  const thoughtRe = /\boO\s((?:(?!<div|<\/div>)[\s\S])*?)\sOo\b/g;
  // Italic is applied via CSS on .tm, not via <em>, so typing after a thought doesn't inherit italic
  if (fmts.thought)
    html = html.replace(thoughtRe, (_,i) => `<span class="tm">oO ${i} Oo</span>`);
  else if (opts.thoughtItalic)
    html = html.replace(thoughtRe, (_,i) => `<em>oO ${i} Oo</em>`);
  // OOC: any ((OOC...)) — must start with OOC (case-sensitive); runs first so Location doesn't catch it
  html = html.replace(/\(\((OOC[^)<>]*)\)\)/g, (_,i) => `<span class="om">((${i}))</span>`);
  // Location: any ((text)) that does NOT start with OOC
  html = html.replace(/\(\((?!OOC)([^)<>]+)\)\)/g, (_,i) => `<span class="lm">((${i}))</span>`);
  if (opts.academy)
    html = html.replace(/\[([^\]\n<]+)\]/g, (_,i) => `<span class="bk">[${i}]</span>`);
  return html;
}

// Colour each block by the character speaking in it.
//   colors  {characterName: '#rrggbb'}
// Runs a strip pass even when colors is empty, so removing the last colour
// clears markup applied on an earlier pass.
function lrApplyCharColors(html, colors) {
  colors = colors || {};
  if (!Object.keys(colors).length && !/data-char-clr|cc-nm/.test(html)) return html;

  // Pre-compute lowercased color map for fast lookup
  const lcolorMap = {};
  Object.entries(colors).forEach(([k,v]) => { lcolorMap[k.toLowerCase()] = {name:k, hex:v}; });

  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const blocks = tmp.querySelectorAll('div,p,li');
  blocks.forEach(bl => {
    // Strip any previously applied color coding first
    if (bl.hasAttribute('data-char-clr')) {
      bl.removeAttribute('data-char-clr');
      bl.style.removeProperty('color');
      bl.querySelectorAll('span.cc-nm').forEach(s => {
        while (s.firstChild) s.parentNode.insertBefore(s.firstChild, s);
        s.parentNode.removeChild(s);
      });
    }

    // Manual paragraph override takes priority
    const overrideChar = bl.getAttribute('data-char-override');
    if (overrideChar) {
      const entry = lcolorMap[overrideChar.toLowerCase()];
      if (entry) {
        bl.setAttribute('data-char-clr','1');
        bl.style.color = entry.hex;
      }
      return;
    }

    // Get the text content of just this block (not nested blocks)
    const text = bl.childNodes.length
      ? [...bl.childNodes].filter(n=>n.nodeType===3||n.nodeType===1)
          .map(n=>n.nodeType===3?n.textContent:(n.innerText||n.textContent)).join('')
      : '';
    const trimText = text.trimStart();

    // Colour single-speaker lines only ("Name:" / "Name: …"). Multi-name lines
    // (e.g. "Name1/Name2:") are left at the default colour — colouring just one
    // name there required fragile <span> wrapping that broke removal and the
    // [Names] bolding pass, so it is deliberately not attempted.
    for (const [lname, entry] of Object.entries(lcolorMap)) {
      const {name, hex} = entry;
      const safeN = name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      if (new RegExp(`^${safeN}\\s*:`, 'i').test(trimText)) {
        bl.setAttribute('data-char-clr','1');
        bl.style.color = hex;
        break;
      }
    }
  });

  return tmp.innerHTML;
}
