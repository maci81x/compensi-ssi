// §G — Dashboard incidenza 2 livelli + fix bug 0.00%%
// Verifica:
//  1) Nella grid non compare mai "%%" (doppio simbolo)
//  2) Sono renderizzate SOLO le macro area (top-level, parentId nullo/vuoto)
//  3) Click su una macro con figli espande la sotto-griglia (.sim-sub-item)
//  4) Le percentuali "macro"/"tot" sono presenti nelle sotto-voci
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.route('**://*.supabase.co/**', r => r.abort());
const p = await ctx.newPage();
p.on('pageerror', e => console.error('PAGEERR', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE.ERR', m.text()); });
await p.goto('http://localhost:8791/');
await p.evaluate('localStorage.clear()');
await p.goto('http://localhost:8791/');
await p.waitForFunction('typeof renderSimAree === "function"');
await new Promise(r => setTimeout(r, 800));

// Vai alla pagina simulatore che contiene la sezione Incidenza aree
await p.evaluate('goPage("sim")');
await new Promise(r => setTimeout(r, 500));

const initial = await p.evaluate(`(() => {
  const el = document.getElementById('sim-aree-grid');
  const html = el ? el.innerHTML : '';
  const items = el ? el.querySelectorAll('.sim-area-item') : [];
  const macros = S.aree.filter(a => !a.parentId).map(a => a.nome);
  return {
    hasDoublePct: /%%/.test(html),
    nItems: items.length,
    nMacros: macros.length,
    macros,
    firstText: items[0] ? items[0].textContent.replace(/\\s+/g,' ').trim().slice(0,90) : null,
  };
})()`);
console.log('initial:', initial);

// Espandi la prima macro che ha figli
const expand = await p.evaluate(`(() => {
  const macroWithChildren = S.aree.find(a => !a.parentId && S.aree.some(x => x.parentId === a.id));
  if (!macroWithChildren) return { skip: 'no macro with children' };
  toggleSimIncidenza(macroWithChildren.id);
  const el = document.getElementById('sim-aree-grid');
  const subs = el.querySelectorAll('.sim-sub-item');
  const html = el.innerHTML;
  return {
    macroId: macroWithChildren.id,
    macroNome: macroWithChildren.nome,
    nFigliAttesi: S.aree.filter(x => x.parentId === macroWithChildren.id).length,
    nSubsRes: subs.length,
    hasMacroLabel: /macro/.test(html),
    hasTotLabel: /tot/.test(html),
    hasDoublePctAfterExpand: /%%/.test(html),
  };
})()`);
console.log('expand:', expand);

// Collassa
const collapse = await p.evaluate(`(() => {
  const macroId = S.aree.find(a => !a.parentId && S.aree.some(x => x.parentId === a.id)).id;
  toggleSimIncidenza(macroId);
  const el = document.getElementById('sim-aree-grid');
  return { nSubs: el.querySelectorAll('.sim-sub-item').length };
})()`);
console.log('collapse:', collapse);

const ok = !initial.hasDoublePct
  && initial.nItems === initial.nMacros
  && initial.nItems > 0 && initial.nItems < 15   // 30 aree totali → macro ≤ ~7
  && expand.nSubsRes === expand.nFigliAttesi
  && expand.hasMacroLabel && expand.hasTotLabel
  && !expand.hasDoublePctAfterExpand
  && collapse.nSubs === 0;
console.log(ok ? '✅ G SMOKE OK' : '❌ G SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
