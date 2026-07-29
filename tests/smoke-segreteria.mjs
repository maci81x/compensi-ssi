// §Segreteria — Gaia responsabile di sis MA fuori §F (esclusaDaCompensiF).
// Verifica:
//  1) Schema v13 attivo
//  2) sis.responsabiliIds include 'p12' (Gaia)
//  3) sis.esclusaDaCompensiF === true
//  4) sis.nota descrittiva presente
//  5) isRespF(Gaia) === null (esclusa)
//  6) calcCompensoF(Gaia).importo === 0
//  7) Anche simulando kpiA(sis)=100% via micro-KPI temporaneo, Gaia resta a 0
//     (test più stringente: verifica che la formula stessa non attivi §F,
//      non solo il fatto che kpiA=null)
//  8) Il nodo cda_staff "Gaia" NON è più nell'organigramma
//  9) 4 invarianti IDENTICI
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.route('**://*.supabase.co/**', r => r.abort());
const p = await ctx.newPage();
p.on('pageerror', e => console.error('PAGEERR', e.message));
await p.goto('http://localhost:8791/');
await p.evaluate('localStorage.clear()');
await p.goto('http://localhost:8791/');
await p.waitForFunction('typeof calcCompensoF === "function"');
await new Promise(r => setTimeout(r, 800));

const stato = await p.evaluate(`(() => {
  const sis = S.aree.find(a => a.id === 'sis');
  const gaia = S.personale.find(pp => pp.id === 'p12');
  return {
    schemaVersion: S.schemaVersion,
    sisResp: sis.responsabiliIds,
    sisEsclusaF: sis.esclusaDaCompensiF,
    sisNota: sis.nota,
    isRespFGaia: isRespF(gaia) ? isRespF(gaia).id : null,
    gaiaCompF: calcCompensoF(gaia).importo,
    totCompF: totCompensoFRichiesto(),
  };
})()`);
console.log('stato:', stato);

// Test stringente: aggiungo temporaneamente un micro-KPI a sis con K=100,
// e verifico che Gaia RESTI a 0 (perché sis è esclusaDaCompensiF).
const stress = await p.evaluate(`(() => {
  const sis = S.aree.find(a => a.id === 'sis');
  sis.micro = sis.micro || [];
  sis.micro.push({nome:'test', kt:100, ke:100, note:''});
  const gaia = S.personale.find(pp => pp.id === 'p12');
  const kaSis = kpiA(sis);
  const F = calcCompensoF(gaia);
  // Ripristino
  sis.micro.pop();
  return { kaSisSim: kaSis, gaiaCompFSim: F.importo, isRespFGaiaSim: F.area ? F.area.id : null };
})()`);
console.log('stress test (sis K=100%):', stress);

// Verifica organigramma: nessun nodo cda_staff con label "Gaia"
await p.evaluate('goPage("org")');
await new Promise(r => setTimeout(r, 500));
const org = await p.evaluate(`(() => {
  const svg = document.querySelector('#org-tree svg');
  const texts = svg ? [...svg.querySelectorAll('text')].map(t => t.textContent.trim()) : [];
  // "Gaia" NON deve apparire più come nodo diretto
  const gaiaNodo = texts.includes('Gaia');
  const dirCDA = texts.includes('DIRETTO CDA');
  // Segreteria deve apparire
  const sisNodo = texts.includes('Segreteria');
  return { gaiaNodo, dirCDA, sisNodo, totalTexts: texts.length };
})()`);
console.log('organigramma:', org);

// Invarianti
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
  stato.schemaVersion === 14 &&  // v14 = §CostiMensili2026 aggiunta al bump
  Array.isArray(stato.sisResp) && stato.sisResp.includes('p12') &&
  stato.sisEsclusaF === true &&
  stato.sisNota && stato.sisNota.includes('segreteria di direzione') &&
  stato.isRespFGaia === null &&
  stato.gaiaCompF === 0 &&
  stato.totCompF === 0 &&
  // stress: sis ha KPI attivo (kaSis > 0), ma Gaia resta con F=0 perché
  // sis è esclusaDaCompensiF (regola di sicurezza)
  stress.kaSisSim > 0 && stress.gaiaCompFSim === 0 && stress.isRespFGaiaSim === null &&
  org.gaiaNodo === false && org.dirCDA === false && org.sisNodo === true &&
  inv.sistema === 43994.28 && inv.garantito === 40916.15 && inv.liquidita === 6078 && inv.fornitori === 20356.43;  // §prep-import-pf: 3537→6078
console.log(ok ? '✅ SEGRETERIA SMOKE OK' : '❌ SEGRETERIA SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
