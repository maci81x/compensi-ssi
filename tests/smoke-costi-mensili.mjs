// §CostiMensili2026 — Test per la serie mensile costi dipendenti.
// Verifica:
//  (a) seed applicato: 13/13 dipendenti hanno costoAziendaMensile2026[12]
//      con Gen-Giu numerici e Lug-Dic null, Σ Gen-Giu = 260.593,91
//  (b) meseCompletoIdx() = 5 (Giugno), mesiCompletiList() ha 6 mesi
//  (c) applicando ogni mese Gen-Giu i 4 invarianti hanno i valori attesi
//      (dipendenti dal mese; Sistema/Fornitori restano fissi)
//  (d) applicando Luglio (fuori "mese completo"): incassato cambia ma
//      costi dipendenti restano ai valori precedenti (niente proiezione)
//  (e) ripristinaCostoMediaAnnua torna a garantito 40916.15
import { chromium } from 'playwright';

// Valori attesi per mese completo (Gen-Giu 2026) — calcolati a partire
// dal seed COSTI_MENSILI_2026_SEED. Garantito personale = Σ costi mensili
// dipendenti + Σ fissoMensile soci (19200). Sistema/Fornitori invariati.
const ATTESI = {
  Gennaio:  { inc: 122537, sistema: 43994.28, garantito: 62288.72, fornitori: 20356.43 },
  Febbraio: { inc: 122615, sistema: 43994.28, garantito: 63870.80, fornitori: 20356.43 },
  Marzo:    { inc: 101594, sistema: 43994.28, garantito: 62925.12, fornitori: 20356.43 },
  Aprile:   { inc: 123420, sistema: 43994.28, garantito: 62224.55, fornitori: 20356.43 },
  Maggio:   { inc: 161195, sistema: 43994.28, garantito: 62566.02, fornitori: 20356.43 },
  Giugno:   { inc: 160782, sistema: 43994.28, garantito: 61918.70, fornitori: 20356.43 },
};
const TOL = 0.02;

const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.route('**://*.supabase.co/**', r => r.abort());
const p = await ctx.newPage();
p.on('pageerror', e => console.error('PAGEERR', e.message));
await p.goto('http://localhost:8791/');
await p.evaluate('localStorage.clear()');
await p.goto('http://localhost:8791/');
await p.waitForFunction('typeof applicaMeseRealeIncassato === "function" && typeof meseCompletoIdx === "function"');
await new Promise(r => setTimeout(r, 800));

// (a) Seed
const seed = await p.evaluate(`(() => {
  const dip = S.personale.filter(p=>p.natura==='dipendente');
  const withSerie = dip.filter(p=>Array.isArray(p.costoAziendaMensile2026) && p.costoAziendaMensile2026.length===12);
  const sommaGenGiu = withSerie.reduce((s,p)=>s + p.costoAziendaMensile2026.slice(0,6).reduce((x,v)=>x+(v||0),0), 0);
  const allLugDicNull = withSerie.every(p=>p.costoAziendaMensile2026.slice(6).every(v=>v===null));
  return { nDip: dip.length, nSerie: withSerie.length, sommaGenGiu: Math.round(sommaGenGiu*100)/100, allLugDicNull };
})()`);
console.log('seed:', seed);

// (b) mese completo
const mesi = await p.evaluate(`(() => ({
  idx: meseCompletoIdx(),
  lista: mesiCompletiList().map(r=>r.mese),
}))()`);
console.log('mese completo:', mesi);

// (c) Ogni mese Gen-Giu: applica + confronta
const scenari = [];
for (const mese of Object.keys(ATTESI)) {
  const r = await p.evaluate(`(() => {
    applicaMeseRealeIncassato('${mese}', 2026);
    const f = flow();
    const forn = S.aree.reduce((s,a)=>s+(a.fornitoreFisso||0)+(a.fornitori||[]).reduce((x,y)=>x+(y.val||0),0),0);
    const mIdx = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'].indexOf('${mese}');
    const sommaCostiDip = S.personale.filter(p=>p.natura==='dipendente' && Array.isArray(p.costoAziendaMensile2026))
      .reduce((s,p)=>s+(p.costoAziendaMensile2026[mIdx]||0),0);
    const sommaSoci = S.personale.filter(p=>p.natura==='socio').reduce((s,p)=>s+(p.fissoMensile||0),0);
    return {
      inc: f.inc,
      sistema: Math.round(f.sistema*100)/100,
      garantito: Math.round(f.garantitoPersonale*100)/100,
      fornitori: Math.round(forn*100)/100,
      quadraturaGarantito: Math.abs((sommaCostiDip+sommaSoci) - f.garantitoPersonale) < 0.02,
    };
  })()`);
  scenari.push({ mese, got: r });
}

// (d) Luglio (fuori mese-completo): applicando SOLO cambia incassato,
// costi restano a Giugno (l'ultimo applicato). Nessuna proiezione.
const luglio = await p.evaluate(`(() => {
  // Reset a Giugno prima
  applicaMeseRealeIncassato('Giugno', 2026);
  const garGiu = flow().garantitoPersonale;
  // Applico Luglio (incassato c'è, costi no)
  applicaMeseRealeIncassato('Luglio', 2026);
  const f = flow();
  const forn = S.aree.reduce((s,a)=>s+(a.fornitoreFisso||0)+(a.fornitori||[]).reduce((x,y)=>x+(y.val||0),0),0);
  return {
    inc: f.inc,               // deve essere 162395 (luglio)
    garantitoLug: Math.round(f.garantitoPersonale*100)/100,
    garantitoGiuPrima: Math.round(garGiu*100)/100,
    // Luglio: nessuna proiezione, quindi garantito DEVE essere identico a giugno
    stessoGarantito: Math.abs(f.garantitoPersonale - garGiu) < 0.02,
  };
})()`);
console.log('luglio (solo incassato):', luglio);

// (e) Ripristina media annua
const ripr = await p.evaluate(`(() => {
  ripristinaCostoMediaAnnua();
  return { garantito: Math.round(flow().garantitoPersonale*100)/100 };
})()`);
console.log('dopo ripristino media annua:', ripr);

// Verifiche
const ok_a = seed.nDip === 13 && seed.nSerie === 13 && Math.abs(seed.sommaGenGiu - 260593.91) < 0.5 && seed.allLugDicNull;
const ok_b = mesi.idx === 5 && mesi.lista.length === 6 && mesi.lista[5] === 'Giugno';
const ok_c = scenari.every(s => {
  const a = ATTESI[s.mese], g = s.got;
  const passInc = a.inc === g.inc;
  const passSis = Math.abs(a.sistema - g.sistema) < TOL;
  const passGar = Math.abs(a.garantito - g.garantito) < TOL;
  const passFor = Math.abs(a.fornitori - g.fornitori) < TOL;
  const passQ = g.quadraturaGarantito;
  if (!(passInc && passSis && passGar && passFor && passQ)) {
    console.log('  FAIL', s.mese, '→', g, 'atteso', a);
  }
  return passInc && passSis && passGar && passFor && passQ;
});
console.log('scenari Gen-Giu:', ok_c ? 'OK ✅' : 'FAIL ❌');
const ok_d = luglio.inc === 162395 && luglio.stessoGarantito;
const ok_e = ripr.garantito === 40916.15;

const ok = ok_a && ok_b && ok_c && ok_d && ok_e;
console.log('\n(a) seed:', ok_a?'✅':'❌', '  (b) mese completo:', ok_b?'✅':'❌', '  (c) scenari:', ok_c?'✅':'❌', '  (d) luglio no proiez:', ok_d?'✅':'❌', '  (e) ripristino:', ok_e?'✅':'❌');
console.log(ok ? '✅ COSTI-MENSILI SMOKE OK' : '❌ COSTI-MENSILI SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
