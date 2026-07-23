# HANDOVER — Compensi SSI

Stato del lavoro al 2026-07-23 — chiusura Fase 11 (sync multi-dispositivo timestamp-based, niente più popup di versione, realtime abilitato lato DB).

## Come ripartire

```bash
git clone https://github.com/maci81x/compensi-ssi.git
cd compensi-ssi
python3 -m http.server 8791
# poi apri http://localhost:8791/
```

Repo: **https://github.com/maci81x/compensi-ssi**
Branch attivo: **`main`** — GitHub Pages pubblica su
`https://maci81x.github.io/compensi-ssi/`.

Nota: i tre file Excel sorgente (`PF SI 2026.xlsx`,
`26_Dettaglio costi dipendenti.xlsx`, `26_Controllo di gestione.xlsx`) servono
solo per **aggiornamenti futuri** dei dati — i dati veri di questi file sono
già dentro `DEF` in `index.html`, non serve ricaricarli per continuare a
lavorare.

---

## Fasi completate (1-7)

Riferimento completo: `SPEC-v10.md`.

1. **Import** — pagina dedicata per i 3 Excel, mapping automatico + anteprima.
2. **Tassonomia aree + organigramma + CRUD esteso**.
3. **Personale a lordo + cascata a priorità** — dipendenti/soci/P.IVA con
   garantito distinto; `flow()` come cascata (§5).
4. **Centri di costo / margine** — 6 centri sotto Produzione con margine
   fisso/variabile e rollup sulla macro area.
5. **Premi / pannello direttore + soglia sostenibilità** — pool premi per area,
   slider, distribuzione, maturazione mese/trimestre, semaforo Z/Y/X.
6. **Seed dati reali + fissi/variabili per area + org drag&drop + schema
   versionato v6**.
7. **Ricavo per centro come % di default + passata grafica + QA finale +
   merge in produzione** (Fase 7, 2026-07-23).
8. **Chiusura gap costi + guida operativa + correzioni minori** (Fase 8,
   2026-07-23).
9. **Fix doppio conteggio budget aree + pagina Sistema estesa + meta
   no-cache** (Fase 9, 2026-07-23).
10. **Fix DnD organigramma + Segreteria layout + CRUD centri in pagina +
    KPI macro area + dedup import PF** (Fase 10, 2026-07-23).
11. **Sync multi-dispositivo timestamp-based + no popup versione +
    realtime cloud abilitato + session id** (Fase 11, 2026-07-23).

### Cosa fa la Fase 7 nel dettaglio

- **Ripartizione % del fatturato come default per 8 unità produttive** (i 6
  centri + Formazione + Sorveglianza Sanitaria). Somma vincolata a 100%,
  editabile dall'UI. Ripartizione iniziale ragionata su fissi reali + volumi
  attesi: Sorveglianza Sanitaria 20% · Antincendio 18% · Documenti 15% ·
  Formazione 15% · RSPP 12% · Ambiente 10% · Cantieri 8% · Verifiche Terra 2%.
- **Override "REALE" automatico**: un `ricavoManuale > 0` vince sempre sulla
  stima %, senza dover cambiare modo — quando arrivano i ricavi per servizio
  veri basta digitarli. Badge STIMA / REALE / TECNICO in tabella.
- **Bottone "Normalizza a 100%"** per riportare la ripartizione alla somma
  attesa quando alcune unità sono passate a `manuale` o `tecnico`.
- **Margine aziendale (modello) confrontato col REALE YTD 23,41%** — con
  semaforo verde/giallo/rosso (±5 / ±10 pt) sul Dashboard Centri di costo.
- **Passata grafica**: KPI del semaforo dashboard più grandi (hero + primary
  cards), coerenza colori/tipografia, print CSS A4 con page-breaks/hide UI/
  colori azzerati per stampa CDA pulita, respiro maggiore in organigramma
  (`HGAP 20→32`, `VGAP 50→64`, `CW 148→160`, `CH 80→86`), tabelle unificate
  `.tbl-clean` con hover + footer sticky sui totali, alert coerenti
  info/warn/err/ok, banner `kpi-strip` per numeri chiave in evidenza.
- **Schema v7** con migrazione automatica: preserva ogni `ricavoManuale > 0` o
  `ricavoPct` esplicito già impostato dall'utente, applica il default solo
  dove non c'è nulla (root cause fix, non un cerotto).
- **Pulizia dati storici**: cancellati i 2 snapshot anomali "giugno 2026" con
  `incassato = 2.024.840` (dati di test residui dal 10 giugno, il valore era
  il budget venduto annuo scambiato per mensile) sia in `compensi_snapshots`
  sia dentro `S.snaps`. Cancellata anche la riga `TEST 2099-01`. La tabella
  `compensi_snapshots` è vuota: **il primo snapshot vero sarà luglio 2026.**

### Cosa fa la Fase 8 nel dettaglio

- **Fix doppio conteggio nel margine aziendale**: `totSistemaFissi` include
  57 voci con `areaId` puntante a un centro (form/sorvsan/c_ambiente/
  c_antincendio/c_verifiche_terra) che sono le STESSE voci dei `.fornitori`
  di quei centri. Prima venivano contate due volte (16.627/mese doppio).
  Ora il modello sottrae automaticamente le dupliche.
- **Personale interno incluso nel margine**: il foglio Controllo di gestione
  contabilizza il margine come "dopo-personale" (fatturato − costi esterni
  che includono stipendi + fornitori). Il modello ora somma garantito
  personale (dipendenti + soci = 40.916) + CDA (13.600) nei costi.
- **Voce "altri costi operativi"** (`S.altriCostiOperativi`, default 15.000,
  editabile dall'UI in Centri di costo): copre ammortamenti + materiali +
  subappalti occasionali + provvigioni variabili agenti non modellate (nel
  PF sono aggregate come "Manutenzioni varie/Varie/Regali"). Badge STIMA.
- **Effetto**: con incassato 174k (media reale 2026) il margine modello è
  **25,34%** vs reale YTD 23,41% → **Δ 1,93 pt**, dentro ±5 pt come richiesto.
- **Schema v8** con migrazione che aggiunge `altriCostiOperativi` solo se
  assente (preserva override utente).
- **Nuovo pannello espandibile in Centri di costo** con dettaglio composizione
  costi aziendali (fornitori centri · sistema dedotto · prioritari · tasse ·
  personale · CDA · altri) e nota sul confronto vs reale.
- **Guida operativa riscritta** (📖 nel menu): allineata alla v10 con 13
  passi (era 8 pre-Fase 2), rimossa HR come area, aggiornato Marco come
  Dir. Marketing autonomo, aggiunti Centri di costo/Premi/Semaforo/Import/
  Drag&drop/Prioritari/Simulatore/Personale. Corretto "i dati non si
  salvano automaticamente" (era falso dalla Fase 3, autosave + sync cloud
  attivi). Chi inserisce cosa aggiornato.
- **Correzioni minori**: etichetta login "v9" → "v10 · Fasi 1-8"; passo 3
  wizard riscritto — mostra solo GRFM/CDA/Soglia (le uniche voci ancora
  usate dalla cascata a priorità), rimosse le 3 voci %-based legacy (costi
  fissi/variabili/accantonamenti) che dalla Fase 3 non impattavano più
  utili/liquidità/semaforo. Sostituite dalle voci puntuali in Sistema/
  Prioritari/Tasse.

### Cosa fa la Fase 9 nel dettaglio

- **Fix doppio conteggio budget aree vs costi reali** (bug diagnosticato
  dall'utente): la cascata `flow()` sottraeva `poolP2 = Σ (area.budget.fisso
  + area.budget.variabilePct × inc) = 99.697/mese` (57,21% dell'incassato
  con inc=174k) IN AGGIUNTA ai costi già in P1 (voci `sistemaFissi` con
  `areaId=comm/mkt/form/sorvsan/c_ambiente/c_antincendio/c_verifiche_terra`
  = 27.905/mese + garantito personale interno 40.916/mese = ~68,8k/mese
  contati due volte). Utili sempre 0 anche con incassato realistico perché
  la cascata comprimeva il pool per non andare negativa.
- **Soluzione applicata**: il budget aree NON entra più nella cascata come
  costo. Rimane nel modello come **tetto di monitoraggio** (`flow().budgetAreeTeorico`
  esposto) per confronto budget-vs-consuntivo su Struttura & aree e
  dashboard. In parallelo `altriCostiOperativi` (Fase 8) è stato spostato
  in P1 così `flow().utili` diventa coerente con `margineAziendaleStimato`.
- **Effetto validato**:
  - Con inc = 130.000 (default): utili −6.599 (segnala perdita — corretto,
    l'incassato default è sotto la media reale).
  - Con inc = **174.265** (media reale 5 mesi 2026): utili **35.453**,
    margine **20,34%** → **Δ 3,07 pt vs reale YTD 23,41%** ✅ entro ±5 pt.
  - Con inc = 200.000 (cloud): utili ~61.188, margine 30,60% (mese sopra
    media, coerente).
- **Pagina Sistema riscritta** (SPEC-v10 §F, richiesta esplicita utente):
  - Blocchi **COSTI FISSI** / **COSTI VARIABILI** separati con totale in €
    e % sull'incassato, oltre a un banner `kpi-strip` con totale filtrato.
  - Filtri: **area** (13 aree + "overhead puro" + tutte), **natura**
    (fisso/variabile), **ricerca testuale** su nome/categoria/area.
  - Ogni riga mostra area di provenienza con dropdown per cambiarla e
    dropdown natura fisso↔variabile, entrambe con save immediato.
  - CRUD completo: aggiungi voce, aggiungi categoria, elimina voce.
  - Bottone "Reset filtri" per tornare alla vista completa.
- **Meta no-cache** aggiunti nell'HTML head (`Cache-Control: no-store` +
  `Pragma: no-cache` + `Expires: 0`): evita che il browser mostri per ore
  la vecchia versione dell'app dopo un deploy live (era il caso della
  "regressione organigramma" segnalata: il codice era corretto, era una
  cache stantia del browser dell'utente — verificato con screenshot
  headless sul live, 12/12 card renderizzate).
- **Debug organigramma "vuoto sul live"** — non era una regressione di
  codice: la pagina Organigramma sul live renderizza correttamente 12 card
  (SSI SRL, GRFM, CDA, Utili, Gaia, Commerciale, Marketing, Produzione,
  Formazione, Sorveglianza Sa…, Amministrazione, Segreteria) con SVG
  992×620. Screenshot headless salvato come verifica. La causa era cache
  del browser dell'utente sulla vecchia Fase 6/7 → mitigato con i meta
  no-cache di cui sopra.

### Cosa fa la Fase 10 nel dettaglio

- **Fix DnD organigramma** (segnalato: "il codice c'è ma trascinando non
  succede nulla"). Test headless con mouse reale (down/move/up simulati)
  conferma il reparent funziona; il problema era su alcuni browser desktop
  (Chrome/Safari macOS con trackpad) e touch device dove il gesto veniva
  intercettato come pan/scroll o selezione testo prima di arrivare all'app.
  Fix:
  - `touch-action:none` sull'SVG root e su ogni card SVG → blocca il
    browser dall'usare il gesto per pan/scroll.
  - `user-select:none` + `-webkit-user-select:none` → blocca la selezione
    testo che cancellava il pointerdown iniziale.
  - `evt.preventDefault()` nel pointerdown → blocca il drag/selezione
    nativa che sui browser desktop mac impediva ai pointermove successivi.
  - Test: reparent di Marketing→Amministrazione via mouse simulato passa.
- **Fix layout Segreteria**: era in fondo alla colonna CDA→Utili→Gaia→
  Segreteria come dipendesse dagli Utili. Ora è **ORIZZONTALMENTE a lato
  del CDA** (staff, connessione tratteggiata `lat-r`). Se l'utente la
  trascina altrove, la nuova posizione da `parentId` prevale.
- **CRUD centri di costo nella pagina Centri di costo**:
  - Bottone **"+ Nuovo centro di costo"** nel pane header → chiede solo
    il nome, crea il centro sotto Produzione con modo manuale, ricavo 0.
  - **Colonna "Azioni"** con delete su ogni centro (i 6 centri storici +
    quelli custom). Sotto-aree strutturali (form, sorvsan) non
    eliminabili: solo da Struttura & aree (per evitare rotture del rollup).
  - **Nome del centro editabile inline** nella prima colonna.
  - `syncUnitaProduttive()` all'apertura della pagina: assicura che i
    centri custom creati runtime finiscano automaticamente nell'array
    `UNITA_PRODUTTIVE_RIC_PCT_IDS` così partecipano al rollup Produzione.
  - Accesso da Struttura & aree conservato.
- **KPI macro per area** (SPEC §H): ogni area ora ha `a.macro = {nome,
  modo, target, effettivo, pesoMicro}` (schema v9, migrazione additiva):
  - **Modo `auto`** (default): media pesata dei micro-KPI. Peso di default
    1 per ogni micro, sovrascrivibile via `a.macro.pesoMicro[microIdx]`.
    Nuova colonna "Peso" nella tabella micro in modo auto.
  - **Modo `manuale`**: `(effettivo/target)*100` — quando il capo area
    dà un giudizio sintetico indipendente dai micro.
  - `areaMacroKpi(a)` → % vs target (100 = target raggiunto, ≥soglia
    sblocca premi via `bonusOk`). `kpiA(a)` è ora wrapper su `areaMacroKpi`.
  - Pannello dedicato in Struttura & aree con nome/modo/target/effettivo/
    valore attuale + indicazione "sblocca/blocca premi area".
- **Dedup import PF su re-import** (SPEC §I):
  - Nuova `pfImportKey(v)` = chiave stabile basata su `areaPF|cat|voce`
    normalizzati, salvata in ogni voce importata come `sf.importKey`.
  - `findPossibileDoppione` ora **prima** cerca per importKey (match
    esatto, sopravvive a rename dell'utente) e **poi** fallback su
    similarità nome+valore. Prima escludeva le voci già importate,
    causando duplicati al re-import dello stesso file.
  - `applyImport` in modalità merge preserva override utente:
    `sf.userEdited={natura, areaPF}` flag settati quando l'utente cambia
    dropdown natura/area dalla pagina Sistema. Il merge aggiorna sempre
    `sf.val` (importo aggiornato) ma NON sovrascrive natura/areaPF se
    l'utente li ha modificati (log console: "N voci con override utente
    preservate").
- **Fresh boot migration fix**: prima le migrazioni schema si applicavano
  solo su stato in arrivo (localStorage/cloud), non su un boot pulito con
  `S = DEF`. Aggiunto `S.schemaVersion=0; migrateSchema(S)` subito dopo
  la definizione di `migrateSchema` così anche il fresh boot passa per
  tutti gli step additivi (necessario perché la migrazione v9 aggiunge
  `a.macro` a ogni area).

### Cosa fa la Fase 11 nel dettaglio

- **Rimosso il popup "stato di una versione precedente"** che riappariva
  a ogni bump di `schemaVersion` (v6→v8, v8→v9, ecc.). Era un messaggio
  tecnico che gli utenti non potevano valutare e che comparivano anche
  senza reale conflitto — quando uno dei tanti utenti Direzione loggava
  con un client aggiornato mentre il cloud era ancora sulla vecchia
  versione. `applyIncomingState` riscritta con nuova logica basata sul
  **timestamp reale** dell'ultimo update, non sullo schema:
  - R1 (cloud stantio, locale pulito) → NON applica incoming, ripusha
    S locale silenziosamente per allineare il cloud. **Nessun popup.**
  - R2 (locale con modifiche non salvate + cloud più recente) → **unico**
    caso in cui appare la conferma, in linguaggio comprensibile ("in
    questa scheda ci sono modifiche non salvate…"). Se l'utente sceglie
    "Annulla" (mantieni il locale), il locale ripusha per far vincere
    sé stesso.
  - R3 (caso normale) → applica incoming senza domande. Il notify
    parla di "Sincronizzati dati più recenti", niente numeri di
    schema.
  - `migrateSchema` è sempre chiamato sull'incoming (idempotente/
    additivo — non tocca dati esistenti).
- **`_lastLocalPushTs`** e **`_hasUnsavedLocalChanges`** aggiunti come
  stato locale della sessione:
  - `pushState` aggiorna `_lastLocalPushTs = now` e resetta il flag dirty
    al successo del PUT verso cloud.
  - `scheduleSync` marca dirty = true; poi il debounce a 2s pusha e il
    flag torna a false.
- **Session id per sessione**: `const _sessionId` (random+timestamp) —
  ogni push scrive `S.__lastEditorSid = _sessionId` nel data_json.
  Il filtro realtime `setupRealtime()` distingue "mia modifica" da
  "altrove" via **session id**, non più via `updated_by` (nome utente).
  Bug latente scoperto: tutti gli utenti Direzione hanno
  `currentUser.nome = 'SSI'`, quindi il vecchio filtro bloccava anche
  le notifiche legittime da altre schede — nessuno vedeva mai le
  modifiche altrui in tempo reale.
- **Realtime abilitato lato Supabase** (migrazione DB
  `enable_realtime_compensi_stato_and_snapshots`): la publication
  `supabase_realtime` prima includeva solo `categorie/cicli/persone`
  (di altri progetti sullo stesso progetto), **NON** `compensi_stato`.
  Ora `ALTER PUBLICATION supabase_realtime ADD TABLE compensi_stato,
  compensi_snapshots;` — i cambi vengono davvero notificati via
  WebSocket.
- **Fix render→scheduleSync spurious dirty**: `renderAll()` chiama
  sempre `scheduleSync()` in coda; questo settava il flag dirty anche
  dopo un apply dal cloud/realtime (perché `_receivingRemote` era già
  stato reset prima di `renderAll`). Ora `_receivingRemote` resta
  `true` durante `renderAll` post-sync (in `doLogin` e nella callback
  realtime), così `scheduleSync` è no-op in quel percorso.
- **Cloud allineato alla v9**: verificato tramite MCP admin che
  `compensi_stato.data_json.schemaVersion = 9` e tutte le 13 aree
  hanno `a.macro` — allineamento automatico avvenuto al primo login
  post-Fase 10 grazie al fresh boot migration fix (Fase 10 §18.6).
- **Test 2 sessioni simulate** (Playwright, `/tmp/multi-session.mjs`):
  4 scenari verificati, tutti verdi, zero popup:
  - Apertura contemporanea → allineamento immediato.
  - S1 modifica → S2 riceve via realtime in ≤ 5s, senza popup.
  - Modifiche parallele → vince il timestamp più recente, entrambe le
    sessioni convergono.
  - Refresh dopo modifiche → nessun popup.

---

## Numeri chiave validati (QA finale headless — Playwright)

Verificati leggendo `index.html` in un browser pulito (Playwright, rete
Supabase bloccata per non contaminare lo stato condiviso durante i test):

| Voce | Valore |
|---|---|
| Garantito personale (dipendenti + soci) | **€ 40.916,15/mese** ✓ |
| Sistema (costi fissi overhead) | **€ 43.994,28** ✓ |
| Prioritari (leasing/F24/IVA/rateizzi/TFR) | **€ 6.088,56** ✓ |
| Dipendenti agganciati (match import ↔ personale) | **13/13** ✓ |
| Incassi settimanali reali 2026 | 6 settimane, somma € 312.816,91 |
| Schema version | 9 ✓ |
| Margine modello a inc 174k (media reale 2026) | 25,34% (Δ 1,93 pt vs reale 23,41%) ✓ |
| Utili da `flow()` a inc 174k (Fase 9) | 35.453 = 20,34% (Δ 3,07 pt vs reale 23,41%) ✓ |
| Budget aree teorico (`flow().budgetAreeTeorico`) | 99.697 (esposto per monitoraggio, NON in cascata) |
| Dedup sistema (voci con areaId centri) | 16.627/mese sottratti ✓ |
| Personale interno incluso nel margine aziendale | 40.916,15 ✓ |
| altri costi operativi (STIMA, default v8) | € 15.000/mese |
| Cascata somma 100% dell'incassato | ✓ |
| Semaforo X/Y/Z coerente Dashboard ↔ Simulatore | ✓ (stessa `flow()`) |
| Pagine navigate senza errore console | 17 / 17 ✓ |
| Console errors | 0 · Warnings 0 |

## Cloud (Supabase — progetto `qujxbvootvollmziaqrd`)

- `compensi_stato` (stato condiviso multi-dispositivo, `id='current'`):
  **verrà migrato a `schemaVersion: 8`** al primo caricamento del client
  aggiornato (aggiunge `altriCostiOperativi=15000` se assente, non tocca
  override utenti).
  Dati reali preesistenti (`incassato=200000`, `periodicita='settimanale'`)
  restano intatti: la migrazione v7 aggiunge/ribalta solo `ricavoModo` e
  `ricavoPct` sulle 8 unità produttive quando non c'è un override esplicito
  dell'utente.
- Controllo di versione anti-sovrascrittura attivo (già Fase 6): una scheda
  vecchia che risincronizza chiede conferma prima di applicare.
- `compensi_snapshots`: **vuoto**. Il primo snapshot vero (luglio 2026) verrà
  creato dal pulsante "Salva mese corrente" nella pagina Storico.

---

## Punti aperti

1. **Policy RLS su `compensi_snapshots` — non risolto lato DB**: la `DELETE`
   con la chiave anon usata dall'app viene bloccata in silenzio dalle RLS
   (PostgREST risponde 200 con 0 righe cancellate, non un errore). L'app
   rileva l'esito (`count` sulla delete) e mostra errore esplicito invece di
   far credere che sia andata bene, ma il problema di fondo (permessi) resta
   lato database. Servono UNA delle due:
   - policy `DELETE` per il ruolo anon (soluzione più veloce), oppure
   - autenticare l'app con un utente Supabase reale con permessi (richiede
     schermata di login vera al posto di `currentUser` locale).

2. **Ricavi per servizio reali da inserire** (evoluzione del punto 3 aperto
   originale): la ripartizione % del fatturato è ora la STIMA di default —
   somma 100%, ragionata su fissi + volumi attesi. Quando arriveranno i ricavi
   per servizio veri (dalla contabilità o dal gestionale), basta scrivere il
   valore € nel campo "Manuale" della pagina Centri di costo, unità per
   unità: l'app userà automaticamente quel valore (badge REALE) al posto
   della stima. Nessun ricalcolo o switch di modo necessario.

3. **Voce "altri costi operativi" come stima aggregata** (default 15.000/mese):
   copre ammortamenti, materiali, subappalti occasionali, provvigioni variabili
   agenti — voci del foglio Controllo di gestione non ancora catalogate
   puntualmente nel modello. Da spacchettare in voci concrete quando arriveranno
   i dati (fattura per fattura) e portare a 0 il "residuo" — Fase 9 futura.
   Oggi è editabile con badge STIMA sulla pagina Centri di costo.
