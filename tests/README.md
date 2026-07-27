# tests/ — smoke test Playwright per compensi-ssi

Script per verificare che gli **invarianti del blocco finale**
(Sistema 43.994,28 · garantito personale 40.916,15 · liquidità 3.537 ·
fornitori totali 20.356,43) e i comportamenti CRUD del **BLOCCO L**
non regrediscano.

## Setup

```bash
npm install
npx playwright install chromium
```

## Uso

Assumendo `python3 -m http.server 8791` attivo dalla root del repo:

```bash
node invariants.mjs           # solo invarianti (~5 s)
node smoke-l1.mjs             # CRUD Persone
node smoke-l2l3.mjs           # CRUD Aree/Centri + blacklist
node smoke-l4.mjs             # delete riga griglia Produzione
node smoke-l5.mjs             # colonne griglia dinamiche
node smoke-l6.mjs             # CRUD KPI custom

npm run smoke                 # tutti in sequenza (~40 s)
```

`BASE=http://…` per servire da URL diverso da `http://localhost:8791/`.

## Note

- Tutti gli script bloccano Supabase (`ctx.route`) e fanno
  `localStorage.clear()` — nessuna scrittura sul cloud condiviso.
- `node_modules/` e `package-lock.json` sono in `.gitignore` (peso ~400 MB
  con playwright + Chromium).
- Nuovi test: seguire il pattern dei `smoke-l*.mjs`, con `chromium.launch()`
  + probe via `page.evaluate('…S/flow…')` come stringa, non arrow function
  (S è `let` top-level, non su `window`, ma le `page.evaluate` string-based
  hanno accesso al closure dello script).
