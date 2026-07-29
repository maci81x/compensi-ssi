// Dry-run import PF: SIMULAZIONE su copia, ZERO scritture su S / Supabase / disco.
// Uso una tantum. NON è uno smoke test.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const PF_PATH = process.argv[2] || '/Users/admin/Downloads/PF.xlsx';
const b64 = readFileSync(PF_PATH).toString('base64');

const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.route('**://*.supabase.co/**', r => r.abort());
const p = await ctx.newPage();
p.on('pageerror', e => console.error('PAGEERR', e.message));
await p.goto('http://localhost:8791/');
await p.evaluate('localStorage.clear()');
await p.goto('http://localhost:8791/');
await p.waitForFunction('typeof parsePFSheet === "function" && typeof classifyPFRow === "function" && typeof flow === "function" && typeof XLSX !== "undefined" && typeof backfillImportKeysAll === "function" && typeof prioMatchKey === "function"');
await new Promise(r => setTimeout(r, 500));

await p.evaluate(`
  window.scheduleSync = () => {};
  window.saveLocal = () => {};
`);

// Snapshot A: DEFAULT (post-rimozione OSM, pre-backfill)
const A = await p.evaluate(`(() => {
  const f = flow();
  const forn = S.aree.reduce((s,a)=>{ const det=(a.fornitori||[]).filter(f=>!(f.escludi===true)).reduce((x,y)=>x+(y.valMensile||0),0); return s + ((a.fornitori&&a.fornitori.length)?det:(a.fornitoreFisso||0)); },0);
  return {
    schemaVersion: S.schemaVersion,
    sistema: Math.round(f.sistema*100)/100,
    garantito: Math.round(f.garantitoPersonale*100)/100,
    liquidita: Math.round(f.liquidita),
    fornitori: Math.round(forn*100)/100,
    utili: Math.round(f.utili),
    prioP1: Math.round(f.prioritariP1*100)/100,
    nSF: (S.sistemaFissi||[]).length,
    nPR: (S.prioritari||[]).length,
    prios: (S.prioritari||[]).map(p=>({nome:p.nome,val:p.val,tipo:p.tipo}))
  };
})()`);

// Backfill importKey (sistemaFissi + prioritari)
const bkf = await p.evaluate(`(() => {
  const res = backfillImportKeysAll();
  const f = flow();
  const forn = S.aree.reduce((s,a)=>{ const det=(a.fornitori||[]).filter(f=>!(f.escludi===true)).reduce((x,y)=>x+(y.valMensile||0),0); return s + ((a.fornitori&&a.fornitori.length)?det:(a.fornitoreFisso||0)); },0);
  return {
    sf: res.sistemaFissi, pr: res.prioritari,
    sistema: Math.round(f.sistema*100)/100,
    garantito: Math.round(f.garantitoPersonale*100)/100,
    liquidita: Math.round(f.liquidita),
    fornitori: Math.round(forn*100)/100,
    nSFwithKey: (S.sistemaFissi||[]).filter(x=>x.importKey).length,
    nPRwithKey: (S.prioritari||[]).filter(x=>x.importKey).length
  };
})()`);

// Parse PF
const parseResult = await p.evaluate(async (b64) => {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const wb = XLSX.read(bin, { type: 'array' });
  const voci = parsePFSheet(wb);
  if (!voci) return { error: 'foglio "2026 PF" non trovato', sheets: wb.SheetNames };
  window.__pendingPF = voci;
  autoMergePFByImportKey(voci);
  const nonEsc = voci.filter(v => !v.escludi);
  return {
    nTot: voci.length, nNonEsc: nonEsc.length,
    sheetsAvailable: wb.SheetNames,
    totAnnuoNonEsc: Math.round(nonEsc.reduce((s,v)=>s+(v.annuo||0),0)*100)/100
  };
}, b64);

if (parseResult.error) {
  console.error('❌ PARSE FAIL:', parseResult.error);
  await b.close();
  process.exit(1);
}

// SIMULATORE unificato: prende una funzione filter(v) che decide quali righe includere,
// simula applyImport SU COPIA con:
// - merge sistemaFissi via importKey (già gestito dalla logica esistente + mergeInto)
// - merge prioritari via prioMatchKey (NUOVO §prep-import-pf)
// - propagazione a aree[X].fornitori via propagateFornitoreVal (NUOVO §prep-import-pf)
async function simula(labelIncludeFn) {
  return await p.evaluate((includeFnSrc) => {
    const voci = window.__pendingPF;
    const sfCopy = JSON.parse(JSON.stringify(S.sistemaFissi || []));
    const prCopy = JSON.parse(JSON.stringify(S.prioritari || []));
    const areeCopy = JSON.parse(JSON.stringify(S.aree || []));
    const includeFn = new Function('v', 'monthly', 'cls', 'return (' + includeFnSrc + ')(v, monthly, cls);');
    // Snapshot 2 centri di interesse PRE-import (comm + c_antincendio)
    const snapshotCentro = (id) => {
      const a = areeCopy.find(x=>x.id===id);
      if (!a) return null;
      return {
        id, fornitoreFisso: a.fornitoreFisso,
        fornitori: (a.fornitori||[]).map(f=>({nome:f.nome, val:f.valMensile}))
      };
    };
    const centroPre_comm = snapshotCentro('comm');
    const centroPre_ambiente = snapshotCentro('c_ambiente');
    // Simula propagateFornitoreVal SU COPIA (senza toccare S reale)
    const propOnCopy = (nome, monthly) => {
      const norm = (s)=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
      const nomeNorm = norm(nome);
      if (!nomeNorm) return null;
      for (const area of areeCopy) {
        if (!Array.isArray(area.fornitori) || !area.fornitori.length) continue;
        const forn = area.fornitori.find(f => norm(f.nome) === nomeNorm);
        if (forn) {
          const oldVal = forn.valMensile||0;
          if (Math.abs(oldVal-monthly) < 0.001) return null;
          forn.valMensile = monthly;
          area.fornitoreFisso = area.fornitori.filter(f=>!(f.escludi===true)).reduce((s,f)=>s+(f.valMensile||0),0);
          return {areaId: area.id, nomeForn: forn.nome, oldVal, newVal: monthly};
        }
      }
      return null;
    };
    let nPropForn = 0;
    const propForn = (nome, monthly) => { if(propOnCopy(nome, monthly)) nPropForn++; };

    let nMergeSF=0, nMergePR=0;
    const nuoveSist=[], nuovePrio=[];

    voci.filter(v => !v.escludi).forEach(v => {
      const key = pfImportKey(v);
      const monthly = Math.round((v.annuo/12)*100)/100;
      const cls = classifyPFRow(v);
      if (!includeFn(v, monthly, cls)) return;

      // Merge sistemaFissi via importKey mergeInto (auto-computato in autoMergePFByImportKey)
      if (v.mergeInto) {
        const sf = sfCopy.find(x => x.id === v.mergeInto);
        if (sf) {
          sf.val = monthly;
          sf.importKey = key;
          nMergeSF++;
          propForn(sf.nome, monthly);
          return;
        }
      }
      // Prioritari: merge via prioMatchKey
      if (cls.dest === 'prioritari') {
        const nome = v.voce || v.cat || v.areaPF;
        const pkey = prioMatchKey(nome, cls.tipo);
        const existing = prCopy.find(x => x.importKey === pkey);
        if (existing) {
          existing.val = monthly;
          existing.importKey = pkey;
          nMergePR++;
          return;
        }
        nuovePrio.push({ nome, val: monthly, tipo: cls.tipo, areaPF: v.areaPF });
        prCopy.push({ id: 'sim_'+Math.random().toString(36).slice(2,9),
          nome, val: monthly, tipo: cls.tipo, priorita: 1, importKey: pkey });
        return;
      }
      // Sistema nuove (fuzzy check informativo)
      const nv = normalizeStr(v.voce);
      const fuzzyMatch = nv ? sfCopy.find(sf => {
        const nsf = normalizeStr(sf.nome);
        if (!nsf) return false;
        const simile = nsf.includes(nv) || nv.includes(nsf);
        const vicino = sf.val > 0 && Math.abs(sf.val - monthly) / sf.val < 0.2;
        return simile && vicino;
      }) : null;
      nuoveSist.push({
        nome: v.voce||v.cat||v.areaPF, val: monthly, areaId: cls.areaId,
        cat: v.cat, areaPF: v.areaPF,
        fuzzyMatch: fuzzyMatch ? { nome: fuzzyMatch.nome, val: fuzzyMatch.val } : null
      });
      const nomeNew = v.voce||v.cat||v.areaPF;
      sfCopy.push({
        id: 'sim_'+Math.random().toString(36).slice(2,9),
        nome: nomeNew, cat: v.cat||v.areaPF, areaPF: v.areaPF,
        natura: v.natura, areaId: cls.areaId, val: monthly, importKey: key
      });
      propForn(nomeNew, monthly);
    });

    // Invarianti DOPO (sostituzione temp: sistemaFissi + prioritari + aree)
    const origSF = S.sistemaFissi, origPR = S.prioritari, origAree = S.aree;
    S.sistemaFissi = sfCopy; S.prioritari = prCopy; S.aree = areeCopy;
    const fAfter = flow();
    const fornAfter = S.aree.reduce((s,a)=>{ const det=(a.fornitori||[]).filter(f=>!(f.escludi===true)).reduce((x,y)=>x+(y.valMensile||0),0); return s + ((a.fornitori&&a.fornitori.length)?det:(a.fornitoreFisso||0)); },0);
    S.sistemaFissi = origSF; S.prioritari = origPR; S.aree = origAree;

    const snapCentroPost = (id) => {
      const a = areeCopy.find(x=>x.id===id);
      if (!a) return null;
      return { id, fornitoreFisso: a.fornitoreFisso, fornitori: (a.fornitori||[]).map(f=>({nome:f.nome, val:f.valMensile})) };
    };

    return {
      nMergeSF, nMergePR, nPropForn,
      nNuoveSist: nuoveSist.length, nNuovePrio: nuovePrio.length,
      nuoveSist, nuovePrio,
      nSfDopo: sfCopy.length, nPrDopo: prCopy.length,
      sistema: Math.round(fAfter.sistema*100)/100,
      garantito: Math.round(fAfter.garantitoPersonale*100)/100,
      liquidita: Math.round(fAfter.liquidita),
      fornitori: Math.round(fornAfter*100)/100,
      utili: Math.round(fAfter.utili),
      prioP1: Math.round(fAfter.prioritariP1*100)/100,
      centroPre_comm, centroPost_comm: snapCentroPost('comm'),
      centroPre_ambiente, centroPost_ambiente: snapCentroPost('c_ambiente')
    };
  }, labelIncludeFn);
}

// Scenario 1: FULL import (tutte le righe non escluse)
const S1 = await simula('function(v, monthly, cls) { return true; }');

// Scenario 2: SENZA IRPEF/Contributi e F24 DM10 (le 2 vere nuove critiche)
const S2 = await simula(`function(v, monthly, cls) {
  const nome = (v.voce || v.cat || v.areaPF || '').toUpperCase();
  if (nome.includes('IRPEF') && nome.includes('CONTRIBUT')) return false;
  if (nome.includes('F24 DM10')) return false;
  return true;
}`);

// Verifica difensiva stato reale
const chk = await p.evaluate(`(() => {
  const f = flow();
  const forn = S.aree.reduce((s,a)=>{ const det=(a.fornitori||[]).filter(f=>!(f.escludi===true)).reduce((x,y)=>x+(y.valMensile||0),0); return s + ((a.fornitori&&a.fornitori.length)?det:(a.fornitoreFisso||0)); },0);
  return { sistema: Math.round(f.sistema*100)/100, liquidita: Math.round(f.liquidita), fornitori: Math.round(forn*100)/100, nSF: (S.sistemaFissi||[]).length, nPR: (S.prioritari||[]).length };
})()`);

// ═══════ REPORT ═══════
const line = (l,x,y) => {
  const d = y - x, s = d>=0?'+':'', m = Math.abs(d)<0.02?'  ':(d>0?'↑ ':'↓ ');
  console.log(`  ${l.padEnd(20)} ${String(x).padStart(12)}  →  ${String(y).padStart(12)}  ${m}(${s}${d.toFixed(2)})`);
};

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║ DRY-RUN import PF — §prep-import-pf con backfill esteso + OSM rimosso     ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log('File PF:', PF_PATH, ' fogli:', parseResult.sheetsAvailable.join(', '));

console.log('\n=== BASELINE (A) — default post-rimozione OSM, pre-backfill ===');
console.log(`  Sistema:              ${A.sistema}`);
console.log(`  Garantito:            ${A.garantito}`);
console.log(`  Liquidità:            ${A.liquidita}      (era 3537 col seed vecchio OSM=2541.67; rimozione OSM la fa salire di 2541.67)`);
console.log(`  Fornitori:            ${A.fornitori}`);
console.log(`  Utili:                ${A.utili}`);
console.log(`  prioritariP1:         ${A.prioP1}       (era 6088.56, ora -2541.67)`);
console.log(`  nSistemaFissi:        ${A.nSF}      | nPrioritari: ${A.nPR}  (era 11, ora 10 senza OSM)`);

console.log('\n=== BACKFILL importKey (esteso a prioritari) ===');
console.log(`  sistemaFissi: backfillate ${bkf.sf.backfilled} / skip ${bkf.sf.skipped} / collisioni ${bkf.sf.collisioni}`);
console.log(`  prioritari:   backfillate ${bkf.pr.backfilled} / skip ${bkf.pr.skipped} / collisioni ${bkf.pr.collisioni}`);
console.log(`  Voci con importKey: sf=${bkf.nSFwithKey}/${A.nSF} · pr=${bkf.nPRwithKey}/${A.nPR}`);
console.log('  INVARIANTI post-backfill (devono restare = baseline A):');
line('Sistema',   A.sistema,   bkf.sistema);
line('Garantito', A.garantito, bkf.garantito);
line('Liquidità', A.liquidita, bkf.liquidita);
line('Fornitori', A.fornitori, bkf.fornitori);

console.log('\n=== PARSE PF ===');
console.log(`  Righe totali: ${parseResult.nTot}  |  non escluse: ${parseResult.nNonEsc}  |  Σ annuo importato: ${parseResult.totAnnuoNonEsc} €`);

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║ SCENARIO 1 — FULL IMPORT (tutte le righe non escluse)                     ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log(`  Merge sistemaFissi: ${S1.nMergeSF}  | Merge prioritari: ${S1.nMergePR}  | Nuove SF: ${S1.nNuoveSist}  | Nuove Prio: ${S1.nNuovePrio}`);
console.log(`  Nº voci: sf ${A.nSF}→${S1.nSfDopo} (+${S1.nSfDopo-A.nSF})  |  pr ${A.nPR}→${S1.nPrDopo} (+${S1.nPrDopo-A.nPR})`);
console.log('  INVARIANTI baseline A → dopo full import:');
line('Sistema',   A.sistema,   S1.sistema);
line('Garantito', A.garantito, S1.garantito);
line('Liquidità', A.liquidita, S1.liquidita);
line('Fornitori', A.fornitori, S1.fornitori);
line('Utili',     A.utili,     S1.utili);
line('PrioP1',    A.prioP1,    S1.prioP1);

if (S1.nNuoveSist) {
  console.log('\n  === NUOVE Sistema (dettaglio) ===');
  S1.nuoveSist.sort((a,b)=>b.val-a.val).forEach(n => {
    const note = n.fuzzyMatch ? `⚠️ fuzzy: "${n.fuzzyMatch.nome}" (${n.fuzzyMatch.val})` : (n.val===0?'(a 0)':'');
    console.log(`     ${(n.nome||'').padEnd(52).slice(0,52)} | ${(n.areaId||'-').padEnd(5)} | ${String(n.val).padStart(9)} | ${note}`);
  });
}
if (S1.nNuovePrio) {
  console.log('\n  === NUOVE Prioritari (dettaglio) ===');
  S1.nuovePrio.sort((a,b)=>b.val-a.val).forEach(n => {
    console.log(`     ${(n.nome||'').padEnd(50).slice(0,50)} val=${String(n.val).padStart(9)} tipo=${(n.tipo||'').padEnd(10)} area=${n.areaPF||''}`);
  });
}

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║ PROPAGAZIONE FORNITORI — 2 centri (comm, c_ambiente) pre → post           ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
const showCentro = (label, pre, post) => {
  console.log(`\n  Centro [${label}]  fornitoreFisso: ${pre.fornitoreFisso} → ${post.fornitoreFisso} (Δ ${(post.fornitoreFisso - pre.fornitoreFisso).toFixed(2)})`);
  console.log('  fornitori:');
  pre.fornitori.forEach((f,i) => {
    const p = post.fornitori[i];
    const same = Math.abs(f.val - p.val) < 0.001;
    console.log(`     ${(f.nome||'').padEnd(38)} ${String(f.val).padStart(10)} → ${String(p.val).padStart(10)} ${same?'  =':' ↕'}`);
  });
};
showCentro('comm', S1.centroPre_comm, S1.centroPost_comm);
showCentro('c_ambiente', S1.centroPre_ambiente, S1.centroPost_ambiente);
console.log(`\n  Totale fornitori propagati (S1): ${S1.nPropForn}`);

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║ SCENARIO 2 — FULL IMPORT MENO IRPEF/Contributi e F24 DM10                 ║');
console.log("║ (per isolare l'impatto delle 2 nuove: 4818,88 + 3393,54 = 8212,42/m)      ║");
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log(`  Merge sistemaFissi: ${S2.nMergeSF}  | Merge prioritari: ${S2.nMergePR}  | Nuove SF: ${S2.nNuoveSist}  | Nuove Prio: ${S2.nNuovePrio}`);
console.log('  INVARIANTI baseline A → dopo import (esclusi IRPEF+DM10):');
line('Sistema',   A.sistema,   S2.sistema);
line('Garantito', A.garantito, S2.garantito);
line('Liquidità', A.liquidita, S2.liquidita);
line('Fornitori', A.fornitori, S2.fornitori);
line('Utili',     A.utili,     S2.utili);
line('PrioP1',    A.prioP1,    S2.prioP1);

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║ IMPATTO ISOLATO delle 2 nuove critiche (IRPEF+DM10)                       ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
line('Liquidità S2→S1', S2.liquidita, S1.liquidita);
line('PrioP1 S2→S1',    S2.prioP1,    S1.prioP1);
console.log(`  Delta Liquidità = -8.212,42 atteso (IRPEF 4818.88 + DM10 3393.54). Effettivo: ${(S1.liquidita - S2.liquidita).toFixed(2)}`);

console.log('\n=== VERIFICA DIFENSIVA (stato reale intatto) ===');
console.log(`  Sistema: ${chk.sistema} ${chk.sistema===A.sistema?'✅':'❌'}  |  Liquidità: ${chk.liquidita} ${chk.liquidita===A.liquidita?'✅':'❌'}`);
console.log(`  Fornitori: ${chk.fornitori} ${chk.fornitori===A.fornitori?'✅':'❌'}  |  nSF: ${chk.nSF} ${chk.nSF===A.nSF?'✅':'❌'}  |  nPR: ${chk.nPR} ${chk.nPR===A.nPR?'✅':'❌'}`);

await b.close();
