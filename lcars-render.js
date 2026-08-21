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

// Turn a stored sim into what a READER sees, as opposed to what a writer sees
// while writing it.
//
// The difference matters and it is easy to get backwards. In the editor the
// markers are tinted -- action pink, comms green, thoughts blue -- so a writer
// can pick them out at a glance. None of that belongs in a finished sim: the
// highlights are scaffolding, and a reader wants the sim as it goes out to the
// group. So this produces exactly what the app's copy handler puts on the
// clipboard: locations bold, OOC and thoughts italic, the marker punctuation
// itself left as plain text, and no coloured blocks anywhere.
//
// Colour of every kind is left out, character colouring included. That is not
// an omission: copy-out strips colour and keeps only margin-left, so a shared
// sim carrying it would not match what the app actually produces. Per-character
// colours are a way of telling your own speakers apart while writing, and mean
// nothing to a reader who does not know the scheme.
//
// Names are already bold in the stored content -- boldNames() writes real
// <strong> into the document -- so there is nothing to reapply here.
//
// Academy sims are plain text by rule. They get the markers found and unwrapped
// like everything else, and none of the formatting.
function lrToReadingHtml(html, opts) {
  opts = opts || {};
  const fmt = opts.academy ? {} : (opts.format || {});

  // Run the editor's own pass first, purely to FIND the markers. Everything it
  // wraps is unwrapped again below -- going through it rather than
  // re-implementing the patterns is what stops the two drifting apart.
  let out = lrApplyMarkers(html, {
    fmts: { action: true, comms: true, thought: true },
    thoughtItalic: false,   // handled below, as a real <em>
    academy: false,         // [brackets] are an editing aid, never formatting
  });

  const tmp = document.createElement('div');
  tmp.innerHTML = out;

  const swap = (sel, tag) => tmp.querySelectorAll(sel).forEach(sp => {
    const el = document.createElement(tag);
    while (sp.firstChild) el.appendChild(sp.firstChild);
    sp.parentNode.replaceChild(el, sp);
  });
  if (fmt.boldLocations) swap('span.lm', 'strong');
  if (fmt.italicOOC)     swap('span.om', 'em');
  if (fmt.thoughtItalic) swap('span.tm', 'em');

  // Whatever is left of a marker span goes, text intact.
  tmp.querySelectorAll('span.am,span.cm,span.tm,span.lm,span.om,span.bk').forEach(sp => {
    while (sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp);
    sp.parentNode.removeChild(sp);
  });

  return tmp.innerHTML;
}

// How long a share link has left, in words.
//
// Lives here, in the file both pages load, because the writer's share dialog
// and the reader's page must say the same thing -- two copies of this would
// drift and one of them would start rounding differently.
//
// Relative, never a clock time. An absolute time renders in whichever timezone
// the reader happens to be in, so "expires 2:30 PM" means two different moments
// to the writer and the person they sent it to. "In 3 days" means the same
// thing everywhere.
//
// Returns null when there is no expiry to describe.
function lrExpiresIn(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const ms = d - Date.now();
  if (ms <= 0) return 'Expired';

  const mins = Math.round(ms / 60000);
  if (mins < 1)  return 'Expires in less than a minute';
  if (mins < 60) return `Expires in ${mins} minute${mins === 1 ? '' : 's'}`;

  // Round to the unit being shown, so 90 minutes reads "2 hours" rather than
  // "1 hour". Hours run all the way to 48 before days take over: "36 hours" is
  // more use to someone deciding whether to read now than "2 days" would be.
  const hours = Math.round(ms / 3600000);
  if (hours < 48) return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`;

  const days = Math.round(ms / 86400000);
  return `Expires in ${days} day${days === 1 ? '' : 's'}`;
}
