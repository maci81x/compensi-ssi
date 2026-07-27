// L5 smoke: VOCI_TEC dinamico. La formula generato_tec deve produrre lo
// STESSO risultato del vecchio hardcoded (con seed default). Add/rename/delete
// funzionano. UI toolbar presente.
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
await p.waitForFunction('typeof addVoceTec === "function"');
await new Promise(r => setTimeout(r, 800));

const seed = await p.evaluate(`(() => {
  ensureProduzioneVoci();
  return {
    len: S.produzioneVoci.length,
    keys: S.produzioneVoci.map(v => v.k).join(','),
    hasDoc: !!S.produzioneVoci.find(v => v.k === 'documenti'),
    hasSorv: !!S.produzioneVoci.find(v => v.k === 'sorveglianza'),
  };
})()`);
console.log('seed:', seed);

// Test: la formula generato_tec produce lo stesso risultato dell'hardcoded
// per un valore campione (setto documenti=1000, ore_form_h=10, laika_ore=5).
const formulaCheck = await p.evaluate(`(() => {
  // Trova un tecnico attivo
  const pi = S.personale.findIndex(p => (p.slots||[]).some(sl => sl.comp && sl.comp.generato_tecnico && sl.comp.generato_tecnico.on));
  if (pi < 0) return { skip: 'no tec' };
  const p = S.personale[pi];
  const si = p.slots.findIndex(sl => sl.comp && sl.comp.generato_tecnico && sl.comp.generato_tecnico.on);
  const g = p.slots[si].comp.generato_tecnico;
  g.documenti = 1000;   // × 0.22 = 220
  g.ore_form_h = 10;    // × 25   = 250
  g.laika_ore = 5;      // × 150  = 750
  g.analisi = 0; g.rspp = 0; g.pacchetti = 0; g.cantieri = 0; g.estintori = 0; g.sorveglianza = 0;
  const expected = 220 + 250 + 750;
  const got = calcSlot(p, p.slots[si]).generato_tec;
  return { expected, got, match: Math.abs(expected - got) < 0.01 };
})()`);
console.log('formula:', formulaCheck);

// Test add voce
const addV = await p.evaluate(`(() => {
  window.prompt = () => 'Test voce';
  const before = S.produzioneVoci.length;
  addVoceTec();
  const after = S.produzioneVoci.length;
  const newV = S.produzioneVoci[after-1];
  return { before, after, newV };
})()`);
console.log('add:', addV);

// Test rename
const rn = await p.evaluate(`(() => {
  window.prompt = () => 'Rinominata';
  const k = S.produzioneVoci[0].k;
  renameVoceTec(k);
  return { k, newLbl: S.produzioneVoci[0].lbl };
})()`);
console.log('rename:', rn);

// Test delete
const del = await p.evaluate(`(() => {
  window.confirm = () => true;
  const before = S.produzioneVoci.length;
  const kDel = S.produzioneVoci[S.produzioneVoci.length-1].k;
  deleteVoceTec(kDel);
  const after = S.produzioneVoci.length;
  return { before, after, kDel, presente: S.produzioneVoci.some(v => v.k === kDel) };
})()`);
console.log('delete:', del);

// Toolbar visibile in pagina produzione
await p.evaluate('goPage("produzione")');
await new Promise(r => setTimeout(r, 400));
const toolbar = await p.evaluate(`(() => {
  const btn = document.querySelector('#prod-tec-grid button.prim');
  return { addBtnText: btn ? btn.textContent.trim() : null };
})()`);
console.log('toolbar:', toolbar);

const ok = seed.len === 9
  && seed.hasDoc && seed.hasSorv
  && formulaCheck.match === true
  && addV.after === addV.before + 1
  && addV.newV && addV.newV.lbl === 'Test voce'
  && rn.newLbl === 'Rinominata'
  && del.after === del.before - 1
  && !del.presente
  && toolbar.addBtnText && toolbar.addBtnText.includes('Nuova voce');
console.log(ok ? '✅ L5 SMOKE OK' : '❌ L5 SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
