// §H — Scheda AREA + FIX responsabili corretti + editor + nodi org persone.
// Verifica:
//  1) Schema v10: aree hanno responsabiliIds/capiAreaIds col seed corretto
//     (amm→[p04], comm→[p01,p05], prod→[p03,p07]; capi comm→[p05])
//  2) openSchedaArea('amm') mostra SOLO Francesco Martini (non tutti i
//     dipendenti amm), openSchedaArea('comm') mostra Roberto + Raia con
//     badge CA su Raia
//  3) addResponsabileFromSelect / removeResponsabile / toggleCapoArea
//     modificano solo responsabiliIds/capiAreaIds; persona.isResp intatto
//  4) Nodi persona Samuele e Raia presenti nell'organigramma (type
//     'org_person'), cliccabili (apre openPersonaPop)
//  5) Le regressioni H originali restano verdi (titolo 'Area: X', ecc.)
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
await p.waitForFunction('typeof openSchedaArea === "function" && typeof addResponsabileFromSelect === "function"');
await new Promise(r => setTimeout(r, 800));

// (1) Schema v10 + seed responsabiliIds/capiAreaIds
const seed = await p.evaluate(`(() => {
  const amm = S.aree.find(a => a.id === 'amm');
  const comm = S.aree.find(a => a.id === 'comm');
  const prod = S.aree.find(a => a.id === 'prod');
  return {
    schemaVersion: S.schemaVersion,
    ammResp: amm.responsabiliIds, ammCapi: amm.capiAreaIds,
    commResp: comm.responsabiliIds, commCapi: comm.capiAreaIds,
    prodResp: prod.responsabiliIds, prodCapi: prod.capiAreaIds,
    // aree senza seed → []
    formResp: S.aree.find(a=>a.id==='form').responsabiliIds,
  };
})()`);
console.log('seed:', seed);

// (2) Scheda AREA — sezione responsabili corretta (non tutte le persone)
const macroAmm = await p.evaluate(`(() => {
  openSchedaArea('amm');
  const body = document.getElementById('pop-body').innerHTML;
  const title = document.getElementById('pop-title').textContent;
  // Il DOM offre un test più affidabile della regex sull'HTML: cerco i
  // bottoni della sezione "Responsabili designati" (chi ha il pulsante
  // ✕ 'Rimuovi responsabile') vs le OPTION del select "aggiungi".
  const removeBtns = document.querySelectorAll('#pop-body button[onclick^="removeResponsabile("]');
  const designati = [...removeBtns].map(btn => {
    // il badge del nome è il bottone precedente (openPersonaPop)
    const span = btn.closest('span');
    return span ? span.textContent.trim() : '';
  });
  // OPTION del select aggiungi (persone non designate)
  const options = [...document.querySelectorAll('#sch-add-resp-amm option')].map(o => o.textContent.trim());
  return {
    title,
    designati,
    optionsAdder: options.slice(0, 6),
    hasDesignatiSection: body.includes('Responsabili designati'),
    hasAdderSelect: !!document.getElementById('sch-add-resp-amm'),
  };
})()`);
console.log('scheda amm:', macroAmm);

const macroComm = await p.evaluate(`(() => {
  closePop();
  openSchedaArea('comm');
  const body = document.getElementById('pop-body').innerHTML;
  return {
    hasRoberto: body.includes('Roberto Macinai'),
    hasRaia: body.includes('Alessandro Raia'),
    hasCABadge: />CA</.test(body),
    // Necci è agente comm ma NON responsabile → non deve apparire nella
    // sezione responsabili (può apparire come persona sotto)
    respSectionRaiaHasCA: body.indexOf('Alessandro Raia') > 0,
  };
})()`);
console.log('scheda comm:', macroComm);

// (3) Editor — add / remove / toggle
const editor = await p.evaluate(`(() => {
  window.confirm = () => true;
  window.prompt = () => null;
  closePop();
  const commBefore = { r: [...S.aree.find(a=>a.id==='comm').responsabiliIds], c: [...S.aree.find(a=>a.id==='comm').capiAreaIds] };
  // Rimuovi Alessandro Raia
  removeResponsabile('comm','p05');
  const afterRemove = { r: [...S.aree.find(a=>a.id==='comm').responsabiliIds], c: [...S.aree.find(a=>a.id==='comm').capiAreaIds] };
  // Ri-aggiungi (senza select: uso il helper)
  openSchedaArea('comm');
  const sel = document.getElementById('sch-add-resp-comm');
  if (sel) sel.value = 'p05';
  addResponsabileFromSelect('comm');
  const afterAdd = { r: [...S.aree.find(a=>a.id==='comm').responsabiliIds], c: [...S.aree.find(a=>a.id==='comm').capiAreaIds] };
  // Toggle CA su Raia
  toggleCapoArea('comm','p05');
  const afterToggle = { r: [...S.aree.find(a=>a.id==='comm').responsabiliIds], c: [...S.aree.find(a=>a.id==='comm').capiAreaIds] };
  // Verifica isResp intatto
  const roberto = S.personale.find(p=>p.id==='p01');
  const raia = S.personale.find(p=>p.id==='p05');
  return {
    commBefore, afterRemove, afterAdd, afterToggle,
    robertoIsResp: roberto.isResp, raiaIsResp: raia.isResp,
    robertoAreaResp: roberto.areaResp,
  };
})()`);
console.log('editor:', editor);

// (4) Nodi persona Samuele e Raia nell'organigramma
await p.evaluate('goPage("org")');
await new Promise(r => setTimeout(r, 500));
const orgNodes = await p.evaluate(`(() => {
  // Le persone sono renderizzate come <text> dentro l'SVG. Cerco per testo.
  const el = document.getElementById('org-tree');
  const svg = el ? el.querySelector('svg') : null;
  const texts = svg ? [...svg.querySelectorAll('text')].map(t => t.textContent) : [];
  return {
    hasSamueleNode: texts.some(t => /Samuele/i.test(t)),
    hasRaiaNode: texts.some(t => /Alessandro/i.test(t)),
    hasPERSONABadge: texts.some(t => t === 'PERSONA'),
  };
})()`);
console.log('org nodes:', orgNodes);

// (5) Regressione H originale
const regressione = await p.evaluate(`(() => {
  closePop();
  openSchedaArea('c_privacy');
  const body = document.getElementById('pop-body').innerHTML;
  const title = document.getElementById('pop-title').textContent;
  return {
    title,
    startsWithArea: title.startsWith('Area: '),
    hasBudget: /Budget/.test(body),
    nessunResp: /nessun responsabile designato/.test(body),
  };
})()`);
console.log('regressione H:', regressione);

const ok =
  // Schema v14: v11 responsabili, v12 ricavoPct default, v13 Gaia in
  // sis.responsabiliIds + esclusaDaCompensiF (§Segreteria),
  // v14 §CostiMensili2026 seed serie costi dip Gen-Giu.
  seed.schemaVersion === 14 &&
  JSON.stringify(seed.ammResp) === '["p04"]' &&
  JSON.stringify(seed.commResp) === '["p01","p05"]' &&
  JSON.stringify(seed.commCapi) === '["p05"]' &&
  JSON.stringify(seed.prodResp) === '["p03"]' &&
  JSON.stringify(seed.formResp) === '["p11"]' &&
  macroAmm.designati.length === 1 && macroAmm.designati[0].includes('Francesco Martini') &&
  !macroAmm.designati.some(x => x.includes('Mattia Guardiani')) &&
  macroAmm.optionsAdder.some(o => o.includes('Mattia Guardiani')) &&
  macroAmm.hasDesignatiSection && macroAmm.hasAdderSelect &&
  macroComm.hasRoberto && macroComm.hasRaia && macroComm.hasCABadge &&
  editor.afterRemove.r.length === 1 && !editor.afterRemove.r.includes('p05') &&
  editor.afterAdd.r.includes('p05') &&
  editor.afterToggle.c.includes('p05') &&
  // isResp NON deve essere toccato dagli helper §H (regressione fondamentale):
  // p01 e p05 hanno isResp:true nel seed DEF → devono restare true.
  editor.robertoIsResp === true && editor.raiaIsResp === true &&
  editor.robertoAreaResp === 'comm' &&
  orgNodes.hasSamueleNode && orgNodes.hasRaiaNode && orgNodes.hasPERSONABadge &&
  regressione.startsWithArea && regressione.hasBudget && regressione.nessunResp;
console.log(ok ? '✅ H SMOKE OK' : '❌ H SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
