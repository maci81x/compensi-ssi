// §H — Click su area organigramma apre la scheda AREA, non il pannello persona.
// Verifica:
//  1) openSchedaArea è funzione globale
//  2) Aprendola su una macro (comm) → titolo "Area: Commerciale", NON "Configura ..."
//  3) Il body contiene i dati aggregati (Budget/Costo/Margine/KPI)
//  4) La scheda su un centro figlio funziona (rto, c_antincendio) — cioè su
//     aree senza pagina dedicata
//  5) Il popover chiude e non stampa "Configura" quando l'area ha un
//     responsabile (regressione bug open-both).
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
await p.waitForFunction('typeof openSchedaArea === "function"');
await new Promise(r => setTimeout(r, 800));

const helpers = await p.evaluate(`({ sch: typeof openSchedaArea })`);
console.log('helpers:', helpers);

// Apri scheda area su Commerciale (macro con responsabile e pagina)
const macro = await p.evaluate(`(() => {
  openSchedaArea('comm');
  const title = document.getElementById('pop-title').textContent;
  const body = document.getElementById('pop-body').innerHTML;
  const btnGo = /Vai a pagina/.test(body);
  const btnStruttura = /Struttura &amp; aree|Struttura & aree/.test(body);
  return {
    title,
    hasBudget: /Budget/.test(body),
    hasCosto: /Costo/.test(body),
    hasMargine: /Margine/.test(body),
    hasKPIArea: /KPI area/.test(body),
    startsWithArea: title.startsWith('Area: '),
    isNotConfigure: !title.startsWith('Configura'),
    hasGoPageBtn: btnGo,
    hasStrutturaBtn: btnStruttura,
  };
})()`);
console.log('macro comm:', macro);

// Chiudi e apri su un centro senza pagina dedicata (c_antincendio)
const centro = await p.evaluate(`(() => {
  closePop();
  openSchedaArea('c_antincendio');
  const title = document.getElementById('pop-title').textContent;
  const body = document.getElementById('pop-body').innerHTML;
  return {
    title,
    hasBudget: /Budget/.test(body),
    hasGoPageBtn: /Vai a pagina/.test(body),  // non deve esistere per centri
  };
})()`);
console.log('centro c_antincendio:', centro);

// Apri su un'area senza responsabile (c_privacy) — non deve rompersi
const privacy = await p.evaluate(`(() => {
  closePop();
  openSchedaArea('c_privacy');
  const title = document.getElementById('pop-title').textContent;
  const body = document.getElementById('pop-body').innerHTML;
  return { title, mentionsNessunResp: /nessun responsabile/.test(body) };
})()`);
console.log('privacy:', privacy);

// Regressione L1/L2/L3 aperti dalla scheda area (link a persone/sotto-aree devono chiamare le funzioni giuste)
const linksOk = await p.evaluate(`(() => {
  closePop();
  openSchedaArea('comm');
  const body = document.getElementById('pop-body').innerHTML;
  return {
    hasPersonBtn: /openPersonaPop\\(/.test(body),
    hasSubAreaBtn: /openSchedaArea\\(/.test(body),
  };
})()`);
console.log('links:', linksOk);

const ok = helpers.sch === 'function'
  && macro.startsWithArea && macro.isNotConfigure
  && macro.hasBudget && macro.hasCosto && macro.hasMargine && macro.hasKPIArea
  && macro.hasGoPageBtn
  && centro.title === 'Area: Antincendio'
  && centro.hasBudget && !centro.hasGoPageBtn
  && privacy.mentionsNessunResp
  && linksOk.hasPersonBtn && linksOk.hasSubAreaBtn;
console.log(ok ? '✅ H SMOKE OK' : '❌ H SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
