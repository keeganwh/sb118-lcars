// The copy button lost its icon after a copy and never got it back.
//
// copyPost() saved the button's content with textContent and restored it the
// same way. The content is an <svg>, so textContent read as the empty string
// and the restore wiped the icon -- permanently, until a reload. It looked
// intermittent because it only happened once you had pressed Copy.
//
//   python3 -m http.server 8129 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/copybutton_browser.js
const { chromium } = require('playwright');
(async () => {
  const pass=[], fail=[], errs=[]; const ok=(c,l)=>(c?pass:fail).push(l);
  const b = await chromium.launch({ args:['--no-sandbox'], executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ permissions: ['clipboard-read','clipboard-write'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto('http://127.0.0.1:8129/LCARS.html');
  await p.evaluate(()=>localStorage.setItem('lcars_mode_v1','local'));
  await p.goto('http://127.0.0.1:8129/LCARS.html');
  await p.waitForTimeout(1300);
  await p.evaluate(()=>{const m=document.getElementById('mo');if(m)m.classList.add('hidden'); mkDoc('Copy check',null,null);});
  await p.waitForTimeout(500);
  await p.evaluate(()=>{document.getElementById('editor').innerHTML='<div>Some text.</div>';flushSave();});

  const hasIcon = () => p.evaluate(() => {
    const b = document.getElementById('btn-copy');
    const u = b.querySelector('svg use');
    return !!u && !!document.querySelector(u.getAttribute('href'));
  });
  ok(await hasIcon(), 'the copy button has its icon to begin with');

  await p.evaluate(() => copyPost());
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Copied/.test(document.getElementById('btn-copy').textContent)),
     'pressing it confirms the copy');

  await p.waitForTimeout(2200);            // past the 1.5s restore
  ok(await hasIcon(), 'and the icon comes back afterwards, rather than leaving an empty button');

  // Pressing it twice in quick succession must not strand it either.
  await p.evaluate(() => copyPost());
  await p.waitForTimeout(200);
  await p.evaluate(() => copyPost());
  await p.waitForTimeout(2200);
  ok(await hasIcon(), 'and two copies in a row still leave the icon intact');

  pass.forEach(l=>console.log('PASS: '+l)); fail.forEach(l=>console.log('FAIL: '+l));
  if (errs.length) console.log([...new Set(errs)].join('\n'));
  console.log('\n'+pass.length+' passed, '+fail.length+' failed');
  await b.close(); process.exit(fail.length?1:0);
})();
