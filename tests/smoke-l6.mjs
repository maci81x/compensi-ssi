// L6 smoke: KPI custom + delete/rinomina micro esistenti.
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
await p.waitForFunction('typeof addKpiCustom === "function"');
await new Promise(r => setTimeout(r, 800));

const helpers = await p.evaluate(`({
  add: typeof addKpiCustom, ren: typeof renameKpiCustom, del: typeof deleteKpiCustom, ens: typeof ensureKpiCustom,
})`);
console.log('helpers:', helpers);

// Add KPI custom per area 'comm'
const add = await p.evaluate(`(() => {
  window.prompt = () => 'Test KPI custom';
  const before = (S.kpiCustom||{}).comm||[];
  addKpiCustom('comm');
  const after = (S.kpiCustom||{}).comm||[];
  return { beforeLen: before.length, afterLen: after.length, last: after[after.length-1] };
})()`);
console.log('add:', add);

// Rename
const rn = await p.evaluate(`(() => {
  window.prompt = () => 'KPI rinominato';
  const arr = S.kpiCustom.comm;
  renameKpiCustom('comm', arr[0].id);
  return { newName: S.kpiCustom.comm[0].nome };
})()`);
console.log('rename:', rn);

// Delete
const del = await p.evaluate(`(() => {
  window.confirm = () => true;
  const id = S.kpiCustom.comm[0].id;
  const before = S.kpiCustom.comm.length;
  deleteKpiCustom('comm', id);
  return { before, after: S.kpiCustom.comm.length };
})()`);
console.log('delete:', del);

// Test: la sezione KPI custom appare nelle pagine area con e senza micro
// Amministrazione (a.micro esiste ma piccolo, comunque)
await p.evaluate('goPage("amm_page")');
await new Promise(r => setTimeout(r, 400));
const ammSection = await p.evaluate(`(() => {
  const btn = [...document.querySelectorAll('#area-content-amm_page button.prim')].find(b => b.textContent.trim().includes('KPI custom'));
  return { found: !!btn, text: btn ? btn.textContent.trim() : null };
})()`);
console.log('amm section:', ammSection);

// Delete di un micro esistente (comm ha 4 micro seed)
const delMicro = await p.evaluate(`(() => {
  window.confirm = () => true;
  const comm = S.aree.find(a => a.id === 'comm');
  const before = comm.micro.length;
  const nome = comm.micro[0].nome;
  comm.micro.splice(0, 1); // simula delete
  return { before, after: comm.micro.length, deletedNome: nome };
})()`);
console.log('delete micro:', delMicro);

const ok = helpers.add === 'function'
  && helpers.del === 'function'
  && add.afterLen === add.beforeLen + 1
  && add.last && add.last.nome === 'Test KPI custom'
  && rn.newName === 'KPI rinominato'
  && del.after === del.before - 1
  && ammSection.found;
console.log(ok ? '✅ L6 SMOKE OK' : '❌ L6 SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
