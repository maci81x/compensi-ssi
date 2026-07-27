// Verifica invarianti compensi-ssi (Sistema/garantito personale/liquidità/
// fornitori totali). Serve i valori attesi dal blocco finale D (2026-07-24).
//
// Uso: BASE=http://localhost:8791/ node tests/invariants.mjs
// (BASE default = http://localhost:8791/ — deve puntare al server dev con
// index.html servito). Playwright è risolto via node_modules del dir tests/.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8791/';
const EXPECT = {
  sistema: 43994.28,
  garantito: 40916.15,   // = garantitoPersonale (esclusa CDA); flow() lo espone come garantitoPersonale
  liquidita: 3537,
  fornitori: 20356.43,
};
const TOL = 1; // ± 1 € tolleranza (arrotondamenti)

const browser = await chromium.launch();
const ctx = await browser.newContext();
// Blocca Supabase — nessuna scrittura sullo stato condiviso durante il test.
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
page.on('pageerror', e => console.error('PAGEERR', e.message));

await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate('localStorage.clear()');
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction('typeof flow === "function"');
await new Promise(r => setTimeout(r, 800));

const got = await page.evaluate(`(() => {
  const f = flow();
  const fornitori = S.aree.reduce((s, a) => {
    const fixed = a.fornitoreFisso || 0;
    const dyn = (a.fornitori || []).reduce((x, y) => x + (y.val || 0), 0);
    return s + fixed + dyn;
  }, 0);
  return {
    sistema: Math.round(f.sistema * 100) / 100,
    // HANDOVER "garantito 40.916,15" = garantito PERSONALE (dipendenti+soci, esclusa CDA)
    garantito: Math.round(f.garantitoPersonale * 100) / 100,
    garantitoConCDA: Math.round(f.garantito * 100) / 100,
    liquidita: Math.round(f.liquidita),
    fornitori: Math.round(fornitori * 100) / 100,
    inc: f.inc, cda: f.cda, grfm: f.grfm, prioritariP1: f.prioritariP1,
    schemaVersion: S.schemaVersion,
    nAree: S.aree.length,
    nPers: S.personale.length,
  };
})()`);

const rows = Object.entries(EXPECT).map(([k, exp]) => {
  const g = got[k];
  const ok = Math.abs(g - exp) <= TOL;
  return { k, exp, got: g, ok };
});
const ok = rows.every(r => r.ok);
console.log('BASE=', BASE, ' schemaVersion=', got.schemaVersion, ' nAree=', got.nAree, ' nPers=', got.nPers);
console.log('inc=', got.inc, 'cda=', got.cda, 'grfm=', got.grfm.toFixed(2), 'prioritariP1=', got.prioritariP1.toFixed(2), 'garantitoConCDA=', got.garantitoConCDA);
rows.forEach(r => console.log((r.ok ? '  ok  ' : '  FAIL ') + r.k.padEnd(11) + ' exp=' + r.exp + ' got=' + r.got));
console.log(ok ? '✅ INVARIANTI OK' : '❌ INVARIANTI ROTTI');
await browser.close();
process.exit(ok ? 0 : 1);
