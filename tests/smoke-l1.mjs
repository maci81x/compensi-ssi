// Smoke test L1: bottoni ✏/⚙/✕ presenti + deletePersona pulisce riferimenti.
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
await p.waitForFunction('typeof deletePersona === "function"');
await new Promise(r => setTimeout(r, 800));

// helper deletePersona esistono
const helpers = await p.evaluate(`({
  del: typeof deletePersona,
  ren: typeof renamePersona,
})`);
console.log('helpers:', helpers);

// vai alla pagina Commerciale e conta i bottoni ✏/⚙/✕ nella tabella agenti
await p.evaluate('goPage("comm_page")');
await new Promise(r => setTimeout(r, 500));
const commBtns = await p.evaluate(`(() => {
  const rows = document.querySelectorAll('#area-content-comm_page tr');
  let ed=0, cog=0, del=0;
  rows.forEach(r => {
    r.querySelectorAll('button').forEach(b => {
      const t = b.textContent.trim();
      if (t === '✏') ed++;
      if (t === '⚙' || t === '⚙️') cog++;
      if (t === '✕') del++;
    });
  });
  return { ed, cog, del, rows: rows.length };
})()`);
console.log('commerciale:', commBtns);

// simula deletePersona di un agente e verifica cleanup areeCA
const cleanup = await p.evaluate(`(() => {
  // sovrascrivi confirm per accettare
  window.confirm = () => true;
  const pIdx = S.personale.findIndex(x => x.id === 'p_alb'); // Alberto Mancini è in ac_raia
  if (pIdx < 0) return { skip: 'p_alb non trovato' };
  const wasInCA = (S.areeCA||[]).some(ca => ca.agentiIds.includes('p_alb'));
  deletePersona(pIdx);
  const stillInCA = (S.areeCA||[]).some(ca => ca.agentiIds.includes('p_alb'));
  const stillInPers = S.personale.some(x => x.id === 'p_alb');
  const inDatiAgenti = !!(S.datiArea && S.datiArea.comm && S.datiArea.comm.agenti && S.datiArea.comm.agenti['p_alb']);
  return { wasInCA, stillInCA, stillInPers, inDatiAgenti };
})()`);
console.log('cleanup:', cleanup);

const ok = helpers.del === 'function'
  && helpers.ren === 'function'
  && commBtns.ed > 0
  && commBtns.del > 0
  && cleanup.wasInCA === true
  && cleanup.stillInCA === false
  && cleanup.stillInPers === false
  && cleanup.inDatiAgenti === false;
console.log(ok ? '✅ L1 SMOKE OK' : '❌ L1 SMOKE FAIL');
await b.close();
process.exit(ok ? 0 : 1);
