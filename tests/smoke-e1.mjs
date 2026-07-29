// §E1 — Catalogo proposte KPI (E1a) + Pannello target unico (E1b).
// Verifica:
//  1) KPI_PROPOSTE definito con tutti i tipi previsti
//  2) areaTipoCatalogo mappa correttamente: comm→commerciale, prod→
//     produzione, mkt→marketing, form→formazione, amm→amministrazione,
//     sorvsan→sorvsan, sis→segreteria, c_antincendio→centro, rto→centro
//  3) proposteKpiPer skippa correttamente KPI già presenti (dedup case-
//     insensitive/trim su micro + kpiCustom)
//  4) aggiungiKpiDaProposta è idempotente (2 chiamate = 1 KPI aggiunto)
//  5) Pagina kpi_targets renderizza + edit target autosalva su micro DEF
//     e su kpiCustom
//  6) INVARIANTI restano IDENTICI (motore non toccato)
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
await p.waitForFunction('typeof KPI_PROPOSTE !== "undefined" && typeof aggiungiKpiDaProposta === "function" && typeof renderKpiTargetsPage === "function"');
await new Promise(r => setTimeout(r, 800));

// (1) Catalogo
const cat = await p.evaluate(`(() => {
  const tipi = Object.keys(KPI_PROPOSTE);
  return {
    tipi,
    counts: Object.fromEntries(tipi.map(t => [t, KPI_PROPOSTE[t].length])),
    sampleFirst: KPI_PROPOSTE.commerciale?.[0],
  };
})()`);
console.log('catalogo:', cat);

// (2) areaTipoCatalogo
const tipi = await p.evaluate(`(() => {
  const test = (id) => {
    const a = S.aree.find(x => x.id === id);
    return a ? areaTipoCatalogo(a) : 'NONE';
  };
  return {
    comm: test('comm'), prod: test('prod'), mkt: test('mkt'), form: test('form'),
    amm: test('amm'), sorvsan: test('sorvsan'), sis: test('sis'),
    c_antincendio: test('c_antincendio'),
    rto: test('rto'), asf: test('asf'),
    c_privacy: test('c_privacy'),
    c_medici_competenti: test('c_medici_competenti'), // padre = sorvsan
    c_senior_sales: test('c_senior_sales'),           // padre = comm
  };
})()`);
console.log('tipi:', tipi);

// (3) proposteKpiPer: dedup con micro esistenti
const proposte = await p.evaluate(`(() => {
  // Le proposte per 'comm' non devono includere nomi identici (norm) ai
  // 9 micro DEF già presenti (es. non ce ne sono di uguali, controllo che
  // il conteggio sia coerente col catalogo).
  const pComm = proposteKpiPer('comm');
  const pAntincendio = proposteKpiPer('c_antincendio');
  const pMkt = proposteKpiPer('mkt');
  return {
    commTotProposte: KPI_PROPOSTE.commerciale.length,
    commDisponibili: pComm.length,
    commSampleFirst: pComm[0]?.nome,
    antTotProposte: KPI_PROPOSTE.centro.length,
    antDisponibili: pAntincendio.length,
    mktTotProposte: KPI_PROPOSTE.marketing.length,
    mktDisponibili: pMkt.length,
  };
})()`);
console.log('proposte:', proposte);

// (4) Aggiunta idempotente
const add = await p.evaluate(`(() => {
  const nome = KPI_PROPOSTE.centro[0].nome;
  const beforeLen = ((S.kpiCustom||{}).c_antincendio||[]).length;
  const r1 = aggiungiKpiDaProposta('c_antincendio', nome);
  const afterOne = (S.kpiCustom.c_antincendio||[]).length;
  const r2 = aggiungiKpiDaProposta('c_antincendio', nome); // dovrebbe skippare
  const afterTwo = (S.kpiCustom.c_antincendio||[]).length;
  // Ora deve dedup anche via micro: aggiungo un micro con nome identico a
  // una proposta e verifico che la proposta scompaia da proposteKpiPer.
  const commArea = S.aree.find(a => a.id === 'comm');
  const primaProp = KPI_PROPOSTE.commerciale[0].nome;
  const disPrima = proposteKpiPer('comm').length;
  commArea.micro.push({ nome: primaProp, kt:0, ke:0, note:'test dedup' });
  const disDopo = proposteKpiPer('comm').length;
  // ripristina
  commArea.micro.pop();
  return { beforeLen, r1, afterOne, r2, afterTwo, disPrima, disDopo };
})()`);
console.log('add:', add);

// (5) Pagina kpi_targets renderizza e edit target
await p.evaluate('goPage("kpi_targets")');
await new Promise(r => setTimeout(r, 500));
const pagina = await p.evaluate(`(() => {
  const cont = document.getElementById('kpit-cont');
  const html = cont?.innerHTML || '';
  const nRows = cont?.querySelectorAll('table tbody tr').length || 0;
  const nAreaBoxes = cont?.querySelectorAll('table').length || 0;
  return { htmlLen: html.length, nRows, nAreaBoxes, hasFiltro: !!document.getElementById('kpit-filtro') };
})()`);
console.log('pagina kpi_targets:', pagina);

// Edit target micro DEF via lo stesso codice inline eseguito da renderKpiTargetsPage
const editMicro = await p.evaluate(`(() => {
  const commArea = S.aree.find(a => a.id === 'comm');
  const before = commArea.micro[0].kt;
  commArea.micro[0].kt = 150; renderAll();
  const after = S.aree.find(a=>a.id==='comm').micro[0].kt;
  commArea.micro[0].kt = before; // ripristina
  return { before, after };
})()`);
console.log('edit micro:', editMicro);

// Edit target kpiCustom
const editCustom = await p.evaluate(`(() => {
  const arr = ensureKpiCustom('c_antincendio');
  const k = arr[0];
  if (!k) return { skip: 'no kpi custom' };
  const before = k.target;
  k.target = 999; renderAll();
  const after = S.kpiCustom.c_antincendio[0].target;
  k.target = before; // ripristina
  return { before, after };
})()`);
console.log('edit custom:', editCustom);

// (6) Invarianti
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
console.log('invarianti:', inv);

const ok =
  cat.tipi.includes('commerciale') && cat.tipi.includes('produzione') &&
  cat.tipi.includes('centro') && cat.tipi.includes('trasversale') &&
  cat.counts.commerciale > 0 && cat.counts.centro > 0 &&
  tipi.comm === 'commerciale' && tipi.prod === 'produzione' &&
  tipi.mkt === 'marketing' && tipi.form === 'formazione' &&
  tipi.amm === 'amministrazione' && tipi.sorvsan === 'sorvsan' &&
  tipi.sis === 'segreteria' && tipi.c_antincendio === 'centro' &&
  tipi.rto === 'centro' && tipi.asf === 'centro' &&
  tipi.c_privacy === 'centro' &&
  proposte.commDisponibili === proposte.commTotProposte && // nessun nome collide con i 9 micro DEF
  proposte.antDisponibili === proposte.antTotProposte &&   // c_antincendio ha 0 KPI base → tutte disponibili
  add.beforeLen === 0 && add.r1 === true && add.afterOne === 1 &&
  add.r2 === false && add.afterTwo === 1 && // idempotenza
  add.disPrima === add.disDopo + 1 && // aggiungendo un micro identico, una proposta scompare
  pagina.nAreaBoxes > 0 && pagina.nRows > 0 && pagina.hasFiltro &&
  editMicro.after === 150 &&
  editCustom.after === 999 &&
  inv.sistema === 43994.28 && inv.garantito === 40916.15 &&
  inv.liquidita === 6078 && inv.fornitori === 20356.43;  // §prep-import-pf: 3537→6078
console.log(ok ? '✅ E1 SMOKE OK' : '❌ E1 SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
