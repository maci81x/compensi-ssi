// §F — Compensi responsabili macro area (non capo area). Curva continua,
// cap 2,5% sul margine diretto. Verifica:
//  1) Schema v11: S.compensiF esiste con parametri default; rto ha p07,
//     mkt ha p02, form ha p11, prod non ha p07
//  2) isRespF: ritorna area macro per Roberto/Marco/Giovanna/Francesco/
//     Niccolò; null per Raia (CA), Samuele (sotto rto = non macro),
//     Gaia (non responsabile), Mattia (non responsabile)
//  3) aliquotaF: 0 sotto 80; sale 0→1% tra 80 e 100; 1% a 100; 2,5% cap
//     a 130 e oltre
//  4) Con KPI attuali=0% ovunque, calcCompensoF.importo=0 per tutti →
//     invarianti INVARIATI (Sistema 43994.28, Garantito 40916.15,
//     Liquidità 3537, Fornitori 20356.43)
//  5) Simulando K=100% su Commerciale (mettendo micro[0].ke=micro[0].kt),
//     il compenso F di Roberto salta a 1% × margine_direct_comm.
//  6) UI: openSchedaArea('comm') mostra la sezione "Compenso §F" con il
//     preview per Roberto.
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
await p.waitForFunction('typeof calcCompensoF === "function" && typeof aliquotaF === "function"');
await new Promise(r => setTimeout(r, 800));

// (1) Schema + seed
const seed = await p.evaluate(`(() => {
  return {
    schemaVersion: S.schemaVersion,
    hasCompensiF: !!S.compensiF,
    cf: S.compensiF,
    rtoResp: S.aree.find(a=>a.id==='rto')?.responsabiliIds,
    prodResp: S.aree.find(a=>a.id==='prod')?.responsabiliIds,
    mktResp: S.aree.find(a=>a.id==='mkt')?.responsabiliIds,
    formResp: S.aree.find(a=>a.id==='form')?.responsabiliIds,
    commResp: S.aree.find(a=>a.id==='comm')?.responsabiliIds,
    commCapi: S.aree.find(a=>a.id==='comm')?.capiAreaIds,
    ammResp: S.aree.find(a=>a.id==='amm')?.responsabiliIds,
  };
})()`);
console.log('seed:', seed);

// (2) isRespF
const respCheck = await p.evaluate(`(() => {
  const ids = ['p01','p02','p03','p04','p05','p07','p11','p12','p15'];
  return ids.reduce((acc,id)=>{
    const p = S.personale.find(x=>x.id===id);
    const a = isRespF(p);
    acc[id]={ nome: p?p.nome:'?', areaF: a?a.id:null };
    return acc;
  },{});
})()`);
console.log('isRespF:', respCheck);

// (3) aliquotaF valori chiave
const alq = await p.evaluate(`(() => ({
  K0: aliquotaF(0),
  K50: aliquotaF(50),
  K79: aliquotaF(79),
  K80: aliquotaF(80),
  K90: aliquotaF(90),
  K100: aliquotaF(100),
  K115: aliquotaF(115),
  K130: aliquotaF(130),
  K200: aliquotaF(200),
}))()`);
console.log('aliquotaF:', alq);

// (4) Con KPI=0, F=0 per tutti + invarianti
const scen0 = await p.evaluate(`(() => {
  const rows = ['p01','p02','p03','p04','p11'].map(id => {
    const p = S.personale.find(x=>x.id===id);
    return { nome: p.nome, F: calcCompensoF(p) };
  });
  const f = flow();
  return {
    rows,
    tot: totCompensoFRichiesto(),
    invSistema: f.sistema, invGar: f.garantitoPersonale, invLiq: Math.round(f.liquidita), invUtili: Math.round(f.utili),
    poolP2Rich: Math.round(f.poolP2Rich), poolP2Eff: Math.round(f.poolP2Eff),
  };
})()`);
console.log('scenario K=0:', scen0);

// (5) Simula K=100 sul primo micro-KPI di comm → verifica il compenso di Roberto
const scen100 = await p.evaluate(`(() => {
  const comm = S.aree.find(a=>a.id==='comm');
  // Setto tutti i micro di comm a ke=kt (K=100%)
  const backup = comm.micro.map(m => ({kt: m.kt, ke: m.ke}));
  comm.micro.forEach(m => { m.kt = 100; m.ke = 100; });
  const roberto = S.personale.find(p=>p.id==='p01');
  const F = calcCompensoF(roberto);
  const f = flow();
  const totF = totCompensoFRichiesto();
  // Ripristina
  comm.micro.forEach((m,i) => { m.kt = backup[i].kt; m.ke = backup[i].ke; });
  return {
    KRoberto: F.K, rRoberto: F.r, margineComm: F.margine, importoRoberto: F.importo,
    totFAll: totF,
    invSistema: f.sistema, invGar: f.garantitoPersonale, invLiq: Math.round(f.liquidita),
    invUtili: Math.round(f.utili), poolP2Rich: Math.round(f.poolP2Rich),
  };
})()`);
console.log('scenario K=100 su Commerciale:', scen100);

// (6) UI scheda area
await p.evaluate('openSchedaArea("comm")');
await new Promise(r => setTimeout(r, 300));
const ui = await p.evaluate(`(() => {
  const body = document.getElementById('pop-body').innerHTML;
  return {
    hasCompensoF: /Compenso §F/.test(body),
    hasFormulaLine: /Formula: r\\(K/.test(body),
    hasRoberto: body.includes('Roberto Macinai'),
  };
})()`);
console.log('UI scheda comm:', ui);

const ok = seed.schemaVersion === 13 &&  // v13 = §Segreteria (Gaia resp. sis, esclusa §F)
  seed.hasCompensiF && seed.cf.enabled === true && seed.cf.cap === 0.025 &&
  JSON.stringify(seed.rtoResp) === '["p07"]' &&
  JSON.stringify(seed.prodResp) === '["p03"]' &&
  JSON.stringify(seed.mktResp) === '["p02"]' &&
  JSON.stringify(seed.formResp) === '["p11"]' &&
  // Marco → mkt (sotto comm ma con budget proprio), Niccolò → form
  respCheck.p01.areaF === 'comm' && respCheck.p02.areaF === 'mkt' &&
  respCheck.p03.areaF === 'prod' && respCheck.p04.areaF === 'amm' &&
  respCheck.p11.areaF === 'form' &&
  // esclusi da F: Raia (CA), Samuele (RTO/no budget), Gaia, Mattia
  respCheck.p05.areaF === null && respCheck.p07.areaF === null &&
  respCheck.p12.areaF === null && respCheck.p15.areaF === null &&
  alq.K0 === 0 && alq.K79 === 0 &&
  Math.abs(alq.K80) < 1e-9 &&
  Math.abs(alq.K90 - 0.005) < 1e-9 &&
  Math.abs(alq.K100 - 0.01) < 1e-9 &&
  Math.abs(alq.K130 - 0.025) < 1e-9 &&
  alq.K200 === 0.025 &&
  scen0.tot === 0 && scen0.rows.every(r => r.F.importo === 0) &&
  Math.abs(scen0.invSistema - 43994.28) < 1 &&
  Math.abs(scen0.invGar - 40916.15) < 1 &&
  scen0.invLiq === 3537 &&
  scen100.KRoberto === 100 && Math.abs(scen100.rRoberto - 0.01) < 1e-9 &&
  Math.abs(scen100.margineComm - 19852.28) < 1 &&
  Math.abs(scen100.importoRoberto - 198.52) < 1 &&
  ui.hasCompensoF && ui.hasFormulaLine && ui.hasRoberto;
console.log(ok ? '✅ F SMOKE OK' : '❌ F SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
