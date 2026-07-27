// L4 smoke: disattivaRigaTecnico rimuove riga ma preserva slot+valori.
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.route('**://*.supabase.co/**', r => r.abort());
const p = await ctx.newPage();
p.on('pageerror', e => console.error('PAGEERR', e.message));
await p.goto('http://localhost:8791/');
await p.evaluate('localStorage.clear()');
await p.goto('http://localhost:8791/');
await p.waitForFunction('typeof disattivaRigaTecnico === "function"');
await new Promise(r => setTimeout(r, 800));

await p.evaluate('goPage("produzione")');
await new Promise(r => setTimeout(r, 500));

const btns = await p.evaluate(`(() => {
  const rows = document.querySelectorAll('#prod-tec-grid tbody tr');
  let n = 0;
  rows.forEach(r => r.querySelectorAll('button').forEach(b => { if (b.textContent.trim() === '🗑') n++; }));
  return { rows: rows.length, deleteBtns: n };
})()`);
console.log('grid state:', btns);

const disat = await p.evaluate(`(() => {
  window.confirm = () => true;
  // trova primo tecnico attivo
  const pi = S.personale.findIndex(p => (p.slots||[]).some(sl => sl.comp && sl.comp.generato_tecnico && sl.comp.generato_tecnico.on));
  if (pi < 0) return { skip: 'nessun tecnico attivo' };
  const p = S.personale[pi];
  const si = p.slots.findIndex(sl => sl.comp && sl.comp.generato_tecnico && sl.comp.generato_tecnico.on);
  // salva un valore non zero per verificare preservazione
  const before = p.slots[si].comp.generato_tecnico.documenti;
  p.slots[si].comp.generato_tecnico.documenti = 12345;
  const beforeOn = p.slots[si].comp.generato_tecnico.on;
  disattivaRigaTecnico(pi, si);
  const afterOn = S.personale[pi].slots[si].comp.generato_tecnico.on;
  const afterVal = S.personale[pi].slots[si].comp.generato_tecnico.documenti;
  const stillInPersonale = !!S.personale[pi];
  return { pi, before, beforeOn, afterOn, afterVal, stillInPersonale };
})()`);
console.log('disattiva:', disat);

// re-render e conta righe
await new Promise(r => setTimeout(r, 300));
const after = await p.evaluate(`(() => {
  const rows = document.querySelectorAll('#prod-tec-grid tbody tr');
  return { rows: rows.length };
})()`);
console.log('grid dopo:', after);

const ok = btns.deleteBtns > 0
  && disat.afterOn === false
  && disat.afterVal === 12345
  && disat.stillInPersonale === true
  && after.rows < btns.rows;
console.log(ok ? '✅ L4 SMOKE OK' : '❌ L4 SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
