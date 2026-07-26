// Smoke test L2/L3: renameArea, deleteArea, blacklist persistente, ripristino.
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
await p.waitForFunction('typeof deleteArea === "function"');
await new Promise(r => setTimeout(r, 800));

const helpers = await p.evaluate(`({
  ren: typeof renameArea, del: typeof deleteArea, add: typeof addArea, rip: typeof ripristinaAreaUfficiale,
})`);
console.log('helpers:', helpers);

// Test rinomina un'area custom
const rn = await p.evaluate(`(() => {
  window.prompt = () => 'Custom Rinominata';
  const nameBefore = S.aree.find(a => a.id === 'c_privacy').nome;
  renameArea('c_privacy');
  const nameAfter = S.aree.find(a => a.id === 'c_privacy').nome;
  return { nameBefore, nameAfter };
})()`);
console.log('rename:', rn);

// Test eliminazione di un centro ufficiale + blacklist
const del = await p.evaluate(`(() => {
  window.confirm = () => true;
  const existsBefore = !!S.aree.find(a => a.id === 'c_privacy');
  deleteArea('c_privacy');
  const existsAfter = !!S.aree.find(a => a.id === 'c_privacy');
  const inBlacklist = (S.areeCancellate||[]).includes('c_privacy');
  return { existsBefore, existsAfter, inBlacklist };
})()`);
console.log('delete c_privacy:', del);

// Simula un reload: verifica che normalizzaOrgUfficiale NON ri-crei l'area
const afterNorm = await p.evaluate(`(() => {
  normalizzaOrgUfficiale(S);
  return { present: !!S.aree.find(a => a.id === 'c_privacy'), blacklistLen: (S.areeCancellate||[]).length };
})()`);
console.log('dopo normalizza:', afterNorm);

// Ripristino
const rip = await p.evaluate(`(() => {
  ripristinaAreaUfficiale('c_privacy');
  return { present: !!S.aree.find(a => a.id === 'c_privacy'), blacklistLen: (S.areeCancellate||[]).length };
})()`);
console.log('ripristino:', rip);

// Test delete di un'area con figli (Ambiente sotto ASF — non ha figli attualmente; provo Sicurezza che ha 5 figli)
const cascade = await p.evaluate(`(() => {
  window.confirm = () => true;
  const figliBefore = S.aree.filter(a => a.parentId === 'c_sicurezza').map(a => a.id);
  const parentBefore = S.aree.find(a => a.id === 'c_sicurezza').parentId;
  deleteArea('c_sicurezza');
  const figliAfter = S.aree.filter(a => figliBefore.includes(a.id)).map(a => ({ id: a.id, parent: a.parentId }));
  return { parentBefore, figliBefore, figliAfter };
})()`);
console.log('cascade sicurezza:', cascade);

const ok = helpers.ren === 'function'
  && helpers.del === 'function'
  && rn.nameAfter === 'Custom Rinominata'
  && del.existsBefore && !del.existsAfter && del.inBlacklist
  && afterNorm.present === false && afterNorm.blacklistLen === 1
  && rip.present === true && rip.blacklistLen === 0
  && cascade.figliBefore.length > 0
  && cascade.figliAfter.every(f => f.parent === cascade.parentBefore);
console.log(ok ? '✅ L2/L3 SMOKE OK' : '❌ L2/L3 SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
