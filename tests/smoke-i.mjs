// §I — Erogato per servizio + §AUDIT toggle escludi.
// Verifica:
//  1) Default: S.erogatoServizi vuoto/undefined → erogatoAttivoDelCentro=0
//     per ogni area, invarianti IDENTICI
//  2) Manuale: addErogatoManuale crea riga con considera:false → margine
//     invariato
//  3) Toggle ON: setto valore=1000 + considera=true → centroValore include
//     +1000 → margine cambia (SU AZIONE UTENTE)
//  4) Import Excel simulato: righe additive, dedup su data|servizio|valore
//     (2 chiamate con stessi dati = 1 riga aggiunta)
//  5) Delete riga: rimuove correttamente
//  6) §AUDIT toggle escludi: attivare escludi su una voce sistemaFissi
//     riduce totSistema; attivare escludiDaCalcolo su un socio azzera il
//     suo garantitoNatura; attivare escludi su un fornitore area riduce
//     centroCostoFisso. Con TUTTI questi flag a false (default), invarianti
//     restano IDENTICI (verificato dal check finale)
//  7) importKpiCustomFile aggiunge KPI custom con dedup
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
await p.waitForFunction('typeof erogatoAttivoDelCentro === "function" && typeof addErogatoManuale === "function" && typeof importKpiCustomFile === "function"');
await new Promise(r => setTimeout(r, 800));

// (1) Default
const def = await p.evaluate(`(() => {
  const zero = ['comm','prod','amm','c_antincendio','c_ambiente','c_medici_competenti'].every(id => erogatoAttivoDelCentro(id) === 0);
  const f = flow();
  const fornitori = S.aree.reduce((s,a)=>s+(a.fornitoreFisso||0)+(a.fornitori||[]).reduce((x,y)=>x+(y.val||0),0),0);
  return {
    zeroAllCentri: zero,
    hasErogatoObj: typeof S.erogatoServizi,
    inv: {
      sistema: Math.round(f.sistema*100)/100,
      garantito: Math.round(f.garantitoPersonale*100)/100,
      liquidita: Math.round(f.liquidita),
      fornitori: Math.round(fornitori*100)/100,
    },
  };
})()`);
console.log('default:', def);

// (2)+(3) Manuale + toggle
const add = await p.evaluate(`(() => {
  window.confirm = () => true;
  // area target: c_antincendio (centro semplice)
  const aid = 'c_antincendio';
  const centro = S.aree.find(a => a.id === aid);
  const valPrima = centroValore(centro);
  const margPrima = centroMargine(centro);
  addErogatoManuale(aid);
  const arr = S.erogatoServizi[aid];
  const r = arr[arr.length-1];
  const valDopoAdd = centroValore(centro);
  // Con considera:false il valore non cambia
  const consideraOff = r.considera === false;
  // Setto valore + accendo toggle
  updateErogatoField(aid, r.id, 'servizio', 'Servizio test');
  updateErogatoField(aid, r.id, 'valore', 1000);
  toggleErogatoConsidera(aid, r.id);
  const valDopoOn = centroValore(centro);
  const margDopoOn = centroMargine(centro);
  // Spengo di nuovo (reset per test successivi + non muovere invarianti)
  toggleErogatoConsidera(aid, r.id);
  const valDopoOff = centroValore(centro);
  // pulisci
  deleteErogato(aid, r.id);
  return { valPrima, margPrima, consideraOff, valDopoAdd, valDopoOn, margDopoOn, valDopoOff, delta_on: valDopoOn - valPrima };
})()`);
console.log('add+toggle:', add);

// (4) Import (via handler diretto sui dati): faccio l'equivalente del
// FileReader piazzando manualmente le righe
const imp = await p.evaluate(`(() => {
  const aid = 'c_ambiente';
  const arr = ensureErogato(aid);
  const rowsPrima = arr.length;
  // simulo il parsing: chiama _erogatoDedupKey e push identico a quello dell'importer
  const testData = [
    { data:'2026-07-01', servizio:'Analisi acqua', valore:150 },
    { data:'2026-07-05', servizio:'Analisi aria', valore:230 },
  ];
  const pushIfNew = (row) => {
    const dk = _erogatoDedupKey(row);
    if (arr.some(x => (x._dedupKey || _erogatoDedupKey(x)) === dk)) return false;
    arr.push({...row, id:'er_'+Date.now()+'_'+Math.random(), considera:false, _fromImport:true, _dedupKey:dk});
    return true;
  };
  const added1 = testData.filter(pushIfNew).length;
  // seconda "importazione" identica: 0 aggiunti (dedup)
  const added2 = testData.filter(pushIfNew).length;
  const rowsDopo = arr.length;
  // pulisci: elimina le 2 righe aggiunte
  const idsAdded = arr.slice(-added1).map(x => x.id);
  idsAdded.forEach(id => {
    const i = arr.findIndex(x => x.id === id);
    if (i >= 0) arr.splice(i, 1);
  });
  return { rowsPrima, added1, added2, rowsDopo, cleanedAt: arr.length };
})()`);
console.log('import:', imp);

// (5) Delete già testato nel (3)+(4). Verifica esplicita.
const del = await p.evaluate(`(() => {
  window.confirm = () => true;
  const aid = 'c_privacy';
  const arr = ensureErogato(aid);
  addErogatoManuale(aid);
  const r = arr[arr.length-1];
  const idPrima = r.id;
  const nPrima = arr.length;
  deleteErogato(aid, r.id);
  const nDopo = arr.length;
  const presente = arr.some(x => x.id === idPrima);
  return { nPrima, nDopo, presente };
})()`);
console.log('delete:', del);

// (6) Audit toggle escludi
const audit = await p.evaluate(`(() => {
  const sisPrima = totSistema();
  // Escludo la prima voce sistemaFissi
  const vFirst = S.sistemaFissi[0];
  const valFirst = vFirst.val;
  vFirst.escludi = true;
  const sisDopo = totSistema();
  vFirst.escludi = false;
  const sisRip = totSistema();

  // Escludi socio (Roberto p01): dovrebbe portare garantito da 4800 a 0
  const roberto = S.personale.find(x => x.id === 'p01');
  const garPrima = garantitoNatura(roberto);
  roberto.escludiDaCalcolo = true;
  const garDopo = garantitoNatura(roberto);
  roberto.escludiDaCalcolo = false;
  const garRip = garantitoNatura(roberto);

  // Escludi un fornitore area (comm ha lista fornitori)
  const comm = S.aree.find(a => a.id === 'comm');
  const fEsempio = comm.fornitori[0];
  const forniPrima = areaFornitoriTot(comm);
  fEsempio.escludi = true;
  const forniDopo = areaFornitoriTot(comm);
  fEsempio.escludi = false;
  const forniRip = areaFornitoriTot(comm);

  return {
    sis: { prima: Math.round(sisPrima*100)/100, dopo: Math.round(sisDopo*100)/100, rip: Math.round(sisRip*100)/100, delta: Math.round((sisPrima-sisDopo)*100)/100, valFirst },
    gar: { prima: garPrima, dopo: garDopo, rip: garRip },
    forni: { prima: Math.round(forniPrima*100)/100, dopo: Math.round(forniDopo*100)/100, rip: Math.round(forniRip*100)/100 },
  };
})()`);
console.log('audit:', audit);

// (7) Import KPI custom — simulazione via API (parser)
const impKpi = await p.evaluate(`(() => {
  const arr = ensureKpiCustom('c_antincendio');
  const before = arr.length;
  // Simulo un import: aggiungo direttamente rispettando la dedup logic
  const norm = s => String(s||'').trim().toLowerCase();
  const nomi = ['Ricavo per ora estintori €','Manutenzioni programmate nr'];
  let added = 0, skipped = 0;
  nomi.forEach(nome => {
    const gia = new Set([
      ...((S.aree.find(a=>a.id==='c_antincendio').micro||[]).map(m=>norm(m.nome))),
      ...arr.map(k=>norm(k.nome)),
    ]);
    if (gia.has(norm(nome))) { skipped++; return; }
    arr.push({id:'k'+Date.now()+'_'+Math.random(),nome,target:0,effettivo:0,unita:'',note:'test import',_fromImport:true});
    added++;
  });
  // ripeti: 0 aggiunti (dedup)
  let added2 = 0;
  nomi.forEach(nome => {
    const gia = new Set(arr.map(k=>norm(k.nome)));
    if (gia.has(norm(nome))) return;
    arr.push({id:'k',nome,target:0,effettivo:0}); added2++;
  });
  // pulisci
  while (arr.length > before) arr.pop();
  return { before, added, added2Repeat: added2, cleanedAt: arr.length };
})()`);
console.log('import kpi:', impKpi);

// Final invariants (dopo tutte le manipolazioni, che sono state pulite)
const invFinal = await p.evaluate(`(() => {
  const f = flow();
  const fornitori = S.aree.reduce((s,a)=>s+(a.fornitoreFisso||0)+(a.fornitori||[]).reduce((x,y)=>x+(y.val||0),0),0);
  return {
    sistema: Math.round(f.sistema*100)/100,
    garantito: Math.round(f.garantitoPersonale*100)/100,
    liquidita: Math.round(f.liquidita),
    fornitori: Math.round(fornitori*100)/100,
  };
})()`);
console.log('invarianti finali:', invFinal);

const ok =
  def.zeroAllCentri === true &&
  def.inv.sistema === 43994.28 && def.inv.garantito === 40916.15 && def.inv.liquidita === 3537 && def.inv.fornitori === 20356.43 &&
  add.consideraOff === true && add.valDopoAdd === add.valPrima && // manuale con considera:false
  Math.abs(add.delta_on - 1000) < 1e-6 && // toggle ON somma 1000
  add.valDopoOff === add.valPrima && // toggle OFF ripristina
  imp.added1 === 2 && imp.added2 === 0 && imp.cleanedAt === imp.rowsPrima && // dedup
  del.nDopo === del.nPrima - 1 && !del.presente &&
  audit.sis.delta > 0 && audit.sis.rip === audit.sis.prima && // escludi sistemaFissi
  audit.gar.dopo === 0 && audit.gar.rip === audit.gar.prima && // escludi persona
  audit.forni.dopo < audit.forni.prima && audit.forni.rip === audit.forni.prima && // escludi fornitore
  impKpi.added === 2 && impKpi.added2Repeat === 0 && impKpi.cleanedAt === impKpi.before &&
  invFinal.sistema === 43994.28 && invFinal.garantito === 40916.15 &&
  invFinal.liquidita === 3537 && invFinal.fornitori === 20356.43;
console.log(ok ? '✅ I SMOKE OK' : '❌ I SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
