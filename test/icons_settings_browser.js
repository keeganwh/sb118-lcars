// ic() emits <svg><use href="#i-NAME"> and renders NOTHING, with no error,
// when the symbol is absent. Settings passes its icon names as bare strings
// through setBtn() and SET_SECTIONS rather than calling ic('name') inline, so
// a grep for ic('x') and #i-x misses them entirely -- which is how eight rows
// (Display name, Change my PIN, Sync data now, Back up my data, Restore from a
// backup, Built with Claude Code and two contents-rail entries) lost their
// icon in the Batch 5C icon review and shipped looking deliberate.
//
// This walks what is actually RENDERED and resolves each <use> against the
// sprite, signed in (where the account rows only exist) at both widths.
//
//   python3 -m http.server 8131 -d .
//   NODE_PATH=/opt/node22/lib/node_modules node test/icons_settings_browser.js
const { chromium } = require('playwright');
const OUT=require('os').tmpdir();
const S={settings:{sidebarOpen:true,charsOpen:true,theme:'dark',skin:'prime',vibe:'calm',prefs:{wizardDone:true,seenWhatsNew:'9.9'},myChars:[]},
 docs:{},missions:{},scenes:{},characters:{}};
const AUTH={writerId:'A239809JP3',token:'tok',refresh:'ref',uid:'u1',expires:Date.now()+9e8};
let FAIL=false;
(async()=>{
 const b=await chromium.launch({args:['--no-sandbox'],executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 for (const [w,tag] of [[1280,'desktop'],[390,'390']]) {
  const ctx=await b.newContext({viewport:{width:w,height:1000}});
  await ctx.route('**/*',async r=>{
   const u=r.request().url();
   if(!u.includes('/rest/v1')&&!u.includes('/auth/v1')) return r.continue();
   let out=[];
   if(u.includes('/rest/v1/state')) out = r.request().method()==='GET'
     ? [{payload:S,updated_at:new Date().toISOString()}] : {};
   else if(u.includes('/rest/v1/writers')) out=[{writer_id:'A239809JP3',display_name:'Jean Luc Picard',role:'writer',deleted_at:null}];
   else if(u.includes('/auth/v1/token')) out={access_token:'tok',refresh_token:'ref',user:{id:'u1',identities:[]}};
   else if(u.includes('/auth/v1/user')) out={id:'u1',identities:[]};
   else if(u.includes('/rpc/')) out=null;
   await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)});
  });
  await ctx.addInitScript(([s,a])=>{localStorage.setItem('lcars_v1',JSON.stringify(s));
    localStorage.setItem('lcars_mode_v1','cloud');localStorage.setItem('lcars_auth_v1',JSON.stringify(a));},[S,AUTH]);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://localhost:8131/LCARS.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>showView('settings')); await p.waitForTimeout(900);
  const res=await p.evaluate(()=>{
    const bad=[],rows=[];
    document.querySelectorAll('#view-settings svg.ic use').forEach(u=>{
      const n=(u.getAttribute('href')||'').slice(3);
      const sym=document.getElementById('i-'+n);
      const host=u.closest('button')||u.parentElement;
      const row=host.textContent.trim().split('\n')[0].slice(0,30);
      rows.push(row+' -> '+n);
      if(!sym||!sym.children.length){bad.push('BROKEN #i-'+n+' on "'+row+'"');return;}
      const r=u.parentElement.getBoundingClientRect();
      if((r.width<6||r.height<6) && getComputedStyle(host).display!=='none') bad.push('NOBOX #i-'+n+' on "'+row+'"');
    });
    return {bad,rows};
  });
  console.log('--- '+tag+' (signed in): '+res.rows.length+' icons rendered');
  console.log(res.bad.length?('    FAIL: '+JSON.stringify(res.bad)):'    PASS: every rendered icon resolves to a symbol with geometry and a real box');
  if(errs.length){console.log('    FAIL: pageerror '+errs[0]);FAIL=true;}
  await p.screenshot({path:`${OUT}/settings-in-${tag}.png`, fullPage:true});
  await ctx.close();
 }
 await b.close();
})();
