// ================================================================
// LCARS SHARE VIEWER
// ================================================================
// Everything /s/<token> runs. It reads one published sim and renders it, and
// that is the whole job -- no auth, no editor, no sync, no localStorage. A
// share link should not make a reader download the application.
//
// The render itself is lcars-render.js, the same file the app uses, so a shared
// sim renders identically rather than approximately.

const SUPA_URL  = 'https://nyjpqaelilrqzmnangft.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55anBxYWVsaWxycXptbmFuZ2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzMwMDIsImV4cCI6MjEwMjI0OTAwMn0.uYUMt49TBW3S_LLse5ZreDQgfL74frlf01jSoHa1qkU';

const $ = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');

// ----------------------------------------------------------------
// SANITISE
// ----------------------------------------------------------------
// A shared sim is one writer's HTML rendered on the same origin as everybody
// else's account. Whatever the editor does or does not strip on the way in,
// this page cannot assume it: a row could have been written straight to
// PostgREST with a session and a crafted payload. So the guard lives on the
// read side, where it cannot be skipped.
//
// Allow-list, not block-list -- an unknown tag is unwrapped rather than
// trusted. Style survives only as colour and margin-left, which is what
// character colouring and indentation need and nothing else.
const ALLOWED_TAGS = new Set([
  'DIV','P','SPAN','BR','B','STRONG','I','EM','U','S','STRIKE','A','UL','OL',
  'LI','BLOCKQUOTE','H1','H2','H3','H4','H5','H6','HR','SUB','SUP','IMG',
]);
const ALLOWED_ATTRS = new Set(['class','data-char-clr','data-char-override','data-block-id']);
const SAFE_STYLE = /(?:^|;)\s*(color|margin-left)\s*:\s*([^;]+)/gi;

function sanitiseStyle(value) {
  const keep = [];
  let m;
  SAFE_STYLE.lastIndex = 0;
  while ((m = SAFE_STYLE.exec(value))) {
    const v = m[2].trim();
    if (/url\s*\(|expression|javascript:/i.test(v)) continue;
    keep.push(`${m[1].toLowerCase()}:${v}`);
  }
  return keep.join(';');
}

function sanitise(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  const walk = node => {
    // Snapshot the children first: the loop rewrites the list as it goes.
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) return;                 // text, always fine
      if (child.nodeType !== 1) { child.remove(); return; }  // comments etc

      const tag = child.tagName;
      // Tags whose *content* is dangerous go entirely, children and all.
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' ||
          tag === 'OBJECT' || tag === 'EMBED' || tag === 'LINK' ||
          tag === 'META' || tag === 'FORM' || tag === 'SVG') {
        child.remove();
        return;
      }

      walk(child);

      if (!ALLOWED_TAGS.has(tag)) {
        // Unknown but harmless: keep the words, drop the element.
        while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
        child.remove();
        return;
      }

      [...child.attributes].forEach(a => {
        const name = a.name.toLowerCase();
        if (name === 'style') {
          const safe = sanitiseStyle(a.value);
          if (safe) child.setAttribute('style', safe);
          else child.removeAttribute('style');
          return;
        }
        if (tag === 'A' && name === 'href') {
          if (/^(https?:|mailto:)/i.test(a.value.trim())) {
            child.setAttribute('rel', 'noopener noreferrer nofollow');
            child.setAttribute('target', '_blank');
          } else child.removeAttribute('href');
          return;
        }
        if (tag === 'IMG' && (name === 'src' || name === 'alt')) {
          if (name === 'src' && !/^(https?:|data:image\/)/i.test(a.value.trim()))
            child.removeAttribute('src');
          return;
        }
        // Everything else, including every on* handler, goes.
        if (!ALLOWED_ATTRS.has(name)) child.removeAttribute(a.name);
      });
    });
  };

  walk(tpl.content);
  return tpl.innerHTML;
}

// ----------------------------------------------------------------
// PRESENTATION
// ----------------------------------------------------------------
const STATUS_LABEL = { active: 'Active', complete: 'Completed', archived: 'Archived' };

// Display name leads, Writer ID sits under it as a subtitle. With no display
// name set the Writer ID is promoted to the byline rather than leaving the
// page looking like it forgot who wrote it.
function renderByline(authors) {
  const list = Array.isArray(authors) ? authors : [];
  const named = list.filter(a => a && (a.display_name || a.writer_id));
  if (!named.length) return;

  const withNames = named.map(a => a.display_name).filter(Boolean);
  const ids = named.map(a => a.writer_id).filter(Boolean);

  if (withNames.length === named.length) {
    $('by').textContent = 'by ' + withNames.join(' · ');
    $('by-sub').textContent = ids.join(' · ');
  } else {
    $('by').textContent = 'by ' + named.map(a => a.display_name || a.writer_id).join(' · ');
    $('by-sub').textContent = withNames.length ? ids.join(' · ') : '';
  }
}

function renderDate(iso) {
  if (!iso) return;
  const d = new Date(iso);
  if (isNaN(d)) return;
  $('updated').textContent = 'Updated ' + d.toLocaleDateString(undefined,
    { year: 'numeric', month: 'long', day: 'numeric' });
}

function render(doc) {
  document.title = (doc.title || 'Shared sim') + ' — LCARS';
  $('title').textContent = doc.title || 'Untitled sim';
  renderByline(doc.authors);
  renderDate(doc.doc_updated_at);

  const status = doc.status || 'active';
  const pill = $('status');
  if (STATUS_LABEL[status]) {
    pill.textContent = STATUS_LABEL[status];
    pill.classList.add(status);
  } else pill.remove();

  // Sanitise first, then run the shared render pass. In that order: the render
  // pass introduces markup of its own, and re-sanitising afterwards would strip
  // the marker spans it just added.
  const clean = sanitise(doc.content || '');
  const marked = lrApplyMarkers(clean, {
    fmts: doc.fmts || {},
    thoughtItalic: !!doc.thought_italic,
    academy: !!doc.academy,
  });
  $('body').innerHTML = lrApplyCharColors(marked, doc.char_colors || {});

  hide('loading');
  show('sheet');
  show('foot');
}

// ----------------------------------------------------------------
// LOAD
// ----------------------------------------------------------------
// The token is the last path segment of /s/<token>. Anything that is not a
// plain hex token is treated as "not available" without a network call --
// there is no request worth making for it.
function tokenFromPath() {
  const m = location.pathname.match(/\/s\/([0-9a-f]{16,64})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

async function load() {
  const token = tokenFromPath();
  if (!token) { hide('loading'); show('gone'); return; }

  let rows;
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/rpc/get_shared_doc', {
      method: 'POST',
      headers: { 'apikey': SUPA_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token }),
    });
    if (!r.ok) throw new Error('rpc responded ' + r.status);
    rows = await r.json();
  } catch (e) {
    hide('loading'); show('failed');
    return;
  }

  // Unknown, revoked and expired all come back the same way, on purpose.
  if (!Array.isArray(rows) || !rows.length) { hide('loading'); show('gone'); return; }
  render(rows[0]);
}

load();
