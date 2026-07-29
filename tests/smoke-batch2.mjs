// Smoke batch2 (P1..P5): KPI risultato attiva §F · catalogo servizi + select
// erogato + fix bug oninput · checkbox ignora persona visibile · modelli
// scaricabili · guide in-page.
// Regola invariante: al DEFAULT (nessuna azione) i 4 invarianti restano
// IDENTICI. Verifica esplicita finale.
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
await p.waitForFunction('typeof kpiA === "function" && typeof ensureCatalogoServizi === "function" && typeof downloadTemplateErogato === "function"');
await new Promise(r => setTimeout(r, 800));

// (P1) — KPI risultato attiva §F
// Verifico che portando i micro-KPI di comm a K=100% (target=risultato),
// il calcCompensoF di Roberto passi da 0 a un valore positivo, e
// riportando a 0 torni a 0.
const p1 = await p.evaluate(`(() => {
  const roberto = S.personale.find(x => x.id === 'p01');
  const comm = S.aree.find(a => a.id === 'comm');
  const kaBefore = kpiA(comm);           // atteso: 0 (tutti ke=0 con kt>0)
  const fBefore = calcCompensoF(roberto).importo;
  // Setto tutti i micro con kt>0 a ke=kt (K=100%)
  const backup = comm.micro.map(m => ({ kt: m.kt, ke: m.ke }));
  comm.micro.forEach(m => { if (m.kt > 0) m.ke = m.kt; });
  const kaOn = kpiA(comm);
  const fOn = calcCompensoF(roberto).importo;
  // Ripristino
  comm.micro.forEach((m, i) => { m.kt = backup[i].kt; m.ke = backup[i].ke; });
  const kaAfter = kpiA(comm);
  const fAfter = calcCompensoF(roberto).importo;
  return { kaBefore, fBefore, kaOn, fOn, kaAfter, fAfter, kBefore100: kaOn === 100 };
})()`);
console.log('P1 KPI→F:', p1);

// (P1) — kpiA include kpiCustom con considera:true (default). Aggiungo un
// kpiCustom con target=100, effettivo=100 → contributo a kpiA.
const p1custom = await p.evaluate(`(() => {
  const amm = S.aree.find(a => a.id === 'amm');
  const kaBefore = kpiA(amm);
  // Aggiungo custom
  const arr = ensureKpiCustom('amm');
  arr.push({id:'kt1', nome:'KPI test', target:100, effettivo:100, unita:'', considera:true});
  const kaWith = kpiA(amm);
  // Escludo (considera:false)
  arr[arr.length-1].considera = false;
  const kaExcluded = kpiA(amm);
  // Cleanup
  arr.pop();
  return { kaBefore, kaWith, kaExcluded };
})()`);
console.log('P1 kpiCustom in kpiA:', p1custom);

// (P2a) — Catalogo servizi seedato
const p2a = await p.evaluate(`(() => {
  const cAmb = ensureCatalogoServizi('c_ambiente');    // centro tecnico → seed da VOCI_TEC
  const cPrv = ensureCatalogoServizi('c_privacy');     // centro senza tecnico → seed placeholder
  const cRto = ensureCatalogoServizi('rto');
  return {
    ambSize: cAmb.length, ambFirst: cAmb[0]?.nome,
    prvSize: cPrv.length, prvHasPlaceholder: cPrv.some(s => /placeholder/i.test(s.nome)),
    rtoSize: cRto.length,
    tipDefault: ensureTipologieErogato().length,
  };
})()`);
console.log('P2a catalogo:', p2a);

// (P2b) — CRUD catalogo
const p2b = await p.evaluate(`(() => {
  window.confirm = () => true;
  window.prompt = () => 'Servizio nuovo';
  const before = ensureCatalogoServizi('c_privacy').length;
  addServizioCatalogo('c_privacy');
  const after = ensureCatalogoServizi('c_privacy').length;
  // dedup: ri-aggiungere stesso nome → no-op
  addServizioCatalogo('c_privacy');
  const afterDup = ensureCatalogoServizi('c_privacy').length;
  // cleanup: rimuovi ultima
  const last = ensureCatalogoServizi('c_privacy').slice(-1)[0];
  deleteServizioCatalogo('c_privacy', last.id);
  return { before, after, afterDup, delta: after - before, cleaned: ensureCatalogoServizi('c_privacy').length };
})()`);
console.log('P2b CRUD catalogo:', p2b);

// (P2c) — Fix bug erogato: valore inserito con oninput viene committato
// PRIMA del click sul toggle. Riproduco: aggiungo riga, digito value,
// clicco toggle senza blur esplicito. Verifica: attivo > 0.
await p.evaluate('goPage("erogato")');
await new Promise(r => setTimeout(r, 400));
const p2c = await p.evaluate(`(() => {
  window.confirm = () => true;
  const aid = document.getElementById('ero-area-sel').value;
  addErogatoManuale(aid);
  const arr = S.erogatoServizi[aid];
  const rId = arr[arr.length-1].id;
  // Simulo digitazione con oninput: emetto 'input' sul number
  const inps = document.querySelectorAll('#ero-cont table input[type="number"]');
  const inpVal = [...inps].pop();
  inpVal.value = '10000';
  inpVal.dispatchEvent(new Event('input', {bubbles:true})); // ora updateErogatoField
  // Setto anche il servizio dal select (per completezza)
  const selServ = [...document.querySelectorAll('#ero-cont table select')][0];
  if (selServ && selServ.options.length > 1) {
    selServ.value = selServ.options[1].value;
    selServ.dispatchEvent(new Event('change', {bubbles:true}));
  }
  // Ora click sul toggle
  const chk = [...document.querySelectorAll('#ero-cont table input[type="checkbox"]')].pop();
  chk.click();
  // Verifica
  const r = S.erogatoServizi[aid].find(x => x.id === rId);
  const attivo = erogatoAttivoDelCentro(aid);
  // Cleanup
  deleteErogato(aid, rId);
  return { valore: r.valore, considera: r.considera, attivo };
})()`);
console.log('P2c fix bug:', p2c);

// (P3) — Checkbox "Ignora persona" visibile e funzionante
const p3 = await p.evaluate(`(() => {
  openPersonaPop(S.personale.findIndex(x => x.id === 'p01'));
  const cb = document.getElementById('pp-escl');
  const visible = cb && cb.offsetWidth > 0 && cb.offsetHeight > 0;
  const parentBox = cb?.closest('div');
  const hasBg = parentBox && getComputedStyle(parentBox).backgroundColor !== 'rgba(0, 0, 0, 0)';
  closePop();
  return { esiste: !!cb, visibile: visible, boxColorato: hasBg };
})()`);
console.log('P3 ignora persona:', p3);

// (P4) — Modelli scaricabili (verifica che le funzioni esistano)
const p4 = await p.evaluate(`(() => {
  return {
    downloadErogato: typeof downloadTemplateErogato,
    downloadCatalogo: typeof downloadTemplateCatalogoServizi,
    downloadKpi: typeof downloadTemplateKpiCustom,
    downloadCSV: typeof _downloadCSV,
  };
})()`);
console.log('P4 modelli:', p4);

// (P5) — Guide in-page presenti
const p5 = await p.evaluate(`(() => {
  const pages = ['erogato','kpi_targets','struttura','sistema','comm_page','form_page','amm_page','mkt_page','sorvsan_page','seg_page','produzione','centri_costo'];
  const map = {};
  pages.forEach(pid => {
    const pg = document.getElementById('page-'+pid);
    map[pid] = pg ? !!pg.querySelector('details.guida-box') : 'NO PAGE';
  });
  return map;
})()`);
console.log('P5 guide:', p5);

// INVARIANTI FINALI — regola invariabile
const inv = await p.evaluate(`(() => {
  const f = flow();
  const fornitori = S.aree.reduce((s,a)=>s+(a.fornitoreFisso||0)+(a.fornitori||[]).reduce((x,y)=>x+(y.val||0),0),0);
  return {
    sistema: Math.round(f.sistema*100)/100,
    garantito: Math.round(f.garantitoPersonale*100)/100,
    liquidita: Math.round(f.liquidita),
    fornitori: Math.round(fornitori*100)/100,
  };
})()`);
console.log('INVARIANTI:', inv);

const ok =
  // P1
  p1.kaBefore === 0 && p1.fBefore === 0 &&
  p1.kBefore100 === true && p1.fOn > 0 &&
  p1.kaAfter === 0 && p1.fAfter === 0 &&
  p1custom.kaWith !== p1custom.kaBefore && // custom entra
  p1custom.kaExcluded === p1custom.kaBefore && // considera:false esclude
  // P2a — catalogo seedato con contenuto giusto
  p2a.ambSize > 0 && p2a.prvSize >= 3 && p2a.prvHasPlaceholder && p2a.rtoSize > 0 && p2a.tipDefault > 0 &&
  // P2b — CRUD catalogo idempotente
  p2b.delta === 1 && p2b.afterDup === p2b.after && p2b.cleaned === p2b.before &&
  // P2c — fix bug erogato
  p2c.valore === 10000 && p2c.considera === true && p2c.attivo === 10000 &&
  // P3 — checkbox ignora persona visibile
  p3.esiste && p3.visibile && p3.boxColorato &&
  // P4 — modelli
  p4.downloadErogato === 'function' && p4.downloadCatalogo === 'function' &&
  p4.downloadKpi === 'function' && p4.downloadCSV === 'function' &&
  // P5 — guide su tutte le pagine principali
  Object.values(p5).every(v => v === true) &&
  // INVARIANTI
  inv.sistema === 43994.28 && inv.garantito === 40916.15 && inv.liquidita === 6078 && inv.fornitori === 20356.43;  // §prep-import-pf: 3537→6078
console.log(ok ? '✅ BATCH2 SMOKE OK' : '❌ BATCH2 SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
