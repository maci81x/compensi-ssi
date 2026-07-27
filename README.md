# Compensi SSI

App gestione compensi mensili SI Soluzioni Impresa (SSI) — Poggibonsi, Toscana.

## Funzionalità

- Flusso mensile: incassato → GRFM → aree → personale → utili
- Organigramma interattivo con mini-org per area
- Tabella commerciale con CA e agenti
- Dashboard produzione, formazione, amministrazione, HR
- Storico snapshot mensili sincronizzati su cloud (Supabase)
- Simulatore what-if e proiezioni
- Export PDF

## Deploy

GitHub Pages: [maci81x.github.io/compensi-ssi](https://maci81x.github.io/compensi-ssi)

## Stack

- Vanilla HTML/CSS/JS (single file, no build)
- Supabase (PostgreSQL) per salvataggio snapshot
- Chart.js per grafici
- jsPDF per export

## Tabella Supabase

`compensi_snapshots`: id, created_at, mese, data_json (jsonb), note

## Test — verifica invarianti e smoke test

I test vivono in [`tests/`](./tests) e verificano che i numeri chiave
del blocco finale (**Sistema 43.994,28 · garantito personale 40.916,15 ·
liquidità 3.537 · fornitori totali 20.356,43**) non regrediscano dopo
modifiche al codice. Ogni sotto-blocco del BLOCCO L (`L1`–`L6`) ha uno
smoke test dedicato.

### Setup (una tantum)

```bash
cd tests
npm install                  # scarica playwright (~5 MB) e le sue dipendenze
npx playwright install chromium   # scarica il binario Chromium (~95 MB)
```

`node_modules/`, `package-lock.json` e il binario Chromium (scaricato
nella cache utente di Playwright) sono esclusi da git — vanno reinstallati
dopo un `git clone`.

### Avvio del server locale

I test si aspettano l'app servita su `http://localhost:8791/` (variabile
d'ambiente `BASE` per sovrascrivere). Dalla root del repo:

```bash
python3 -m http.server 8791
```

### Eseguire i test

Da qualsiasi cwd, il modo più semplice è dalla root del repo:

```bash
node tests/invariants.mjs                # check invarianti (~5 s)
node tests/smoke-l1.mjs                  # CRUD Persone
node tests/smoke-l2l3.mjs                # CRUD Aree/Centri + blacklist
node tests/smoke-l4.mjs                  # delete riga griglia Produzione
node tests/smoke-l5.mjs                  # VOCI_TEC dinamico
node tests/smoke-l6.mjs                  # CRUD KPI custom
node tests/smoke-g.mjs                   # incidenza aree 2 livelli
node tests/smoke-h.mjs                   # scheda AREA + resp designati
node tests/smoke-f.mjs                   # §F compensi responsabili
node tests/smoke-e1.mjs                  # §E1 catalogo KPI + pannello target
node tests/smoke-i.mjs                   # §I erogato per servizio + audit CRUD
```

Oppure tutti in sequenza via `npm run smoke` da dentro `tests/`:

```bash
cd tests && npm run smoke
```

Ogni test blocca le chiamate Supabase (`ctx.route('**://*.supabase.co/**',
r => r.abort())`) e fa `localStorage.clear()` a inizio — nessun rischio
di sovrascrivere lo stato cloud condiviso durante il test. Exit code `0`
= verde, `1` = rosso.

### Quando lanciare cosa

- **Prima di committare qualsiasi modifica a `index.html`**: `node
  tests/invariants.mjs` — deve restare verde. Se rompe, indagare
  `flow()` / `totSistema` / `garantitoNatura` / aree.fornitori.
- **Dopo un cambio che tocca uno dei blocchi L**: rilanciare lo smoke
  del blocco corrispondente + invariants.
- **Prima di aprire un nuovo sotto-blocco (E/F/G/H/I)**: rilanciare tutto
  (`cd tests && npm run smoke`) per confermare la baseline.
