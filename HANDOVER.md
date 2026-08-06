# HANDOVER — Compensi SSI

Stato del lavoro al **2026-08-06** (blocco finale A–D, **L** e **H** completati
e validati), per continuare su un altro portatile.

## Come ripartire

```bash
git clone https://github.com/maci81x/compensi-ssi.git
cd compensi-ssi
git checkout blocco-finale        # branch del blocco finale (A–D, L e H fatti)
python3 -m http.server 8791
# poi apri http://localhost:8791/
```

> **Percorso reale del repo su questa macchina: `~/Sites/compensi-ssi`**
> (NON `~/Downloads/compensi-ssi` — quel path non esiste qui, anche se compare
> negli appunti di avvio).

Repo: **https://github.com/maci81x/compensi-ssi**
Branch di lavoro attuale: **`blocco-finale`** (contiene A–D, L e H; parte da
`ssi-compensi-import-phase`). **Non è mergiato su `main`, non toccare Pages** —
il sito live resta quello attuale su `main`. Nessun merge finché il blocco
finale non è validato tutto insieme.

Server locale già attivo in dev su `http://localhost:8791/`.

Nota: i tre file Excel sorgente (`PF SI 2026.xlsx`, `26_Dettaglio costi dipendenti.xlsx`, `26_Controllo di gestione.xlsx`) servono solo per **aggiornamenti futuri** dei dati — i dati veri di questi file sono già stati trascritti dentro `DEF` nel codice (`index.html`), non serve ricaricarli per continuare a lavorare. Il template `template_import_storico_vendite.xlsx` (§B) sta in `~/Desktop`.

---

## BLOCCO FINALE (A–L) — stato al 2026-08-06

Branch **`blocco-finale`**. Commit in ordine: A → fix flusso → B → C → D → fix D → L → H.

### ✅ FATTI E VALIDATI (numeri prima → dopo, verificati con Playwright)

- **A — Incassato reale** (`a415de2`): default incassato **200.000 → 136.363**
  (media incassato reale 2026, 954.538/7 mesi). Serie `incassatoMensile2026`
  (gen–lug). Dashboard: pannello **scostamento fatturato→incassato**
  (fatturato medio 174.265 vs incassato 136.363, gap −37.902 = 21,7%). Picker
  "incassato reale mensile" in Step 1. Migrazione schema **v6→v7** (sostituisce
  il placeholder solo se ancora 200.000/130.000; un valore digitato resta).
- **Fix flusso** (`c975d9e`): **`altriCostiOperativi` mancava in `flow()`** —
  costo reale (15.000/mese) che esce dall'azienda ma non era in sistema/tasse/
  prioritari → aggiunto a **P1**. **GRFM 5% → 2%**. Effetto: liquidità §5 a
  136.363 = **3.537 (2,59%)**, combacia col dato reale atteso. Editabile dal CDA
  in Passo 3.
- **B — Import storico vendite** (`025097f`): nuova card Import,
  `template_import_storico_vendite.xlsx`. Parser blocchi ANNO/VENDUTO/TACITI
  RINNOVI/INCASSATO × agente × 12 mesi. Anteprima con conteggio nuove/aggiornate,
  **dedup per importKey = `anno|sezione|agente`**. Dati in
  `S.storicoVendite[anno][sezione][agente]=[12]`. 2026 operativo, 2024/2025 solo
  stagionalità. Verificato: reimport = 0 nuove, nessun duplicato.
- **C — Stagionalità** (`55b45e4`): due indici **distinti** venduto/incassato in
  `S.stagionalita`, ricalcolabili dallo storico 2024-2025
  (`ricalcolaStagionalita`) — la formula riproduce **esatti** i valori attesi.
  KPI: tag per micro (vendita/cassa) + selettore mese, mostra target grezzo E
  destagionalizzato (target × indice/100). Editor indici in Struttura.
- **D — Organigramma ufficiale** (`c219764` + fix `851ecd3`): RTO→ASF come
  **nodi** con conteggi propri; 6 centri tecnici ri-genitorizzati sotto ASF;
  aggiunte Sicurezza (+ Analisi acque/tamponi/alimenti, Edilizia, Tarature,
  SSL CEM-ROA, Campionamento polveri), Privacy, Certificazioni/Accreditamenti;
  Medici Competenti (sotto sorvsan), Segreteria Formativa + Docenti (sotto form),
  Ufficio Acquisti (sotto amm), Senior/Junior Sales + Bandi e Gare (sotto comm).
  **nAree 13 → 30.** Migrazione schema **v7→v8** (`normalizzaOrgUfficiale`,
  idempotente). **Invarianti confermati**: Sistema **43.994,28**, garantito
  **40.916,15**, liquidità **3.537**, budget aree var **78.013**, fornitori
  totali **20.356,43** (spostati, non duplicati). Medici Competenti (7.201,77) e
  Docenti (1.703,52) ereditano i costi **spostandoli** dal padre (no doppio
  conteggio). `areaRollup` ora aggrega i discendenti chiusi fino a ogni confine.

- **L — CRUD ovunque** (`e960aa0` → `2120153`): si può modificare, rinominare
  ed eliminare in **ogni** contesto. Schema **v8→v9** (migrazione additiva:
  **non tocca la topologia delle 30 aree**, verificato id/nomi/padri identici
  prima e dopo).
  - **Blocco CRUD condiviso**: `renamePersona` / `deletePersona` /
    `sganciaPersonaDaArea` / `renameArea` / `deleteArea` / `addCentro` /
    `deleteCAArea` / `addKpiCustom`… — un solo posto, stesso comportamento
    ovunque. `crudCommit()` = `renderAll()` (ricalcolo `flow()` + salvataggio).
    `crudRename()`: annullare non cambia nulla, nome vuoto non cancella il nome.
  - **Persone** (L1): rinomina + elimina in schede risorsa (passo 4), popover
    Configura, mini-organigrammi di area (✎ · ⚙ · ⊖ togli dall'area · 🗑) e
    righe agenti del Commerciale. `personaStorico()` elenca nella conferma cosa
    si perde (slot, storico premi, riga griglia, dati mensili, ruolo di capo
    area) e con storico presente chiede una **seconda** conferma.
    `deletePersona` ripulisce `areeCA`, `datiArea[*].agenti/_per` e le
    distribuzioni premi: niente capi area fantasma né righe orfane.
  - **Centri di costo** (L2): `addCentro()` dalla pagina Centri di costo
    (prima esistevano solo come dati), ✎/🗑 per riga. Nasce chiuso e a zero →
    entra nel rollup §5.1 senza spostare margine, budget o cascata.
    `isCentro()`/`centriAree()`/`centriIds()` sostituiscono i confronti su
    `CENTRI_IDS`, che resta solo come seed della migrazione v6.
  - **Aree organigramma** (L3): azioni su hover sulla card (✎ rinomina ·
    + sotto-area · 🗑 elimina), **inclusa la card Segreteria**, che prima non
    aveva nulla. `deleteArea` non lascia figli orfani (risalgono al nonno).
    **Le 30 aree ufficiali non si resettano, non si rigenerano, non si
    ri-seedano**: si rendono solo editabili una alla volta.
  - **Griglia Produzione** (L4, opzione 1): il 🗑 sulla riga **disattiva** lo
    slot (`generato_tecnico.on=false`), reversibile dal pannello "righe
    disattivate" sotto la tabella; i dati restano. La cancellazione totale
    della persona resta in `deletePersona`.
  - **Colonne griglia** (L5): le 9 voci cablate diventano dato di stato
    (`S.vociTec`), aggiungibili/rinominabili/eliminabili con etichetta, unità
    (€/h) e coefficiente di default. `calcSlot` somma sulle voci vive con la
    stessa formula → generato invariato al centesimo.
  - **KPI** (L6, opzione 1): `a.kpiCustom` **array parallelo**, minimale, in
    pagina area e in Struttura (dove ci sono tutte e 30 le aree). Sono
    monitoraggio: **non** fanno da cancello sui premi (`kpiA`/`areaKpiOk`
    restano su `a.micro`) — il refactor completo è il blocco **E**.
    Aggiunti anche ✎/🗑 con conferma sui KPI micro esistenti.
  - **Fix**: default KPI Commerciale non è più `DVR da chiudere` (KPI da
    tecnici) → campo vuoto con placeholder commerciale; la migrazione lo
    azzera solo se è ancora esattamente quel placeholder.
    `renderAll()` non ri-renderizzava `page-centri_costo`.
  - **Invarianti confermati dopo tutto il blocco**: Sistema **43.994,28**,
    garantito **40.916,15**, liquidità **3.536,75**, fornitori **20.356,43**,
    budget aree var **78.013,27**, 30 aree, 18 pagine renderizzate con 0
    errori JS.

- **H — Click su area = scheda AREA** (`aef28f9` → `8c8c37e`): cliccando una
  card dell'organigramma si apriva la scheda della **persona** responsabile
  ("Configura Giovanna Panti"). Causa: il nodo area si porta dietro l'indice
  del responsabile (`n.pi`, da `persona.areaResp`) e finiva nel ramo generico
  `if(n.pi>=0)` che aggancia `openPersonaPop`; in parallelo il `pointerup`
  faceva `goPage(areaPageMap[id]||id)`, quindi i due effetti si sommavano — e
  per le **23 aree senza pagina dedicata** `goPage` riceveva un id inesistente,
  nascondendo tutte le `.page` senza riaprirne nessuna (schermo vuoto).
  - Ora il ramo persona esclude i nodi area (`n.pi>=0&&n.type!=='area'`) e il
    ramo "click senza movimento" di `endDrag` chiama `openAreaCard(areaId)`.
    Il routing resta in `endDrag` e **non** in un listener `click`: col pointer
    capture del drag&drop il `click` scatta comunque a fine trascinamento e
    aprirebbe la scheda dopo ogni riparentamento.
  - **`openAreaCard(areaId)`** è modellata su `openOrgPopFlow`, non su
    `openPersonaPop`: **non assegna `popCb`** e tiene nascosta la barra azioni
    del popover, quindi non può salvare campi persona per sbaglio. Contiene:
    badge tipo/natura/chiusa/padre + OK-OVER, **Responsabile** (da
    `areaResponsabile()`, stesso criterio dell'organigramma — `a.resp` è testo
    libero e non viene usato), incidenza/budget/costo effettivo/fornitore fisso
    (stesse formule di `renderStruttura`), rollup delle sotto-aree chiuse se
    presente, mini-organigramma delle persone (`renderMiniOrg`, con fallback a
    elenco piatto per le 23 aree che non ha cablate), micro KPI **in sola
    lettura**, blocco KPI custom di §L, placeholder onesto per l'erogato per
    tipologia di servizio (blocco **I**) e azioni: ✎ rinomina · + sotto-area ·
    ↗ apri pagina dedicata (solo per le 7 che ce l'hanno) · Modifica dettagli
    in Struttura · 🗑 elimina.
  - `renderStruttura` **non è stata toccata**: resta l'unica fonte di verità
    per l'editing fine delle aree, e la scheda ci rimanda con un bottone.
  - **Invarianti confermati**: Sistema **43.994,28**, garantito **40.916,15**,
    liquidità **3.536,75**, fornitori **20.356,43**, budget aree var
    **78.013,27**, 30 aree, 18 pagine con **0 errori JS** — invariati anche
    dopo le interazioni di test (la scheda non scrive su `S`).

### Risposte di Roberto ai 5 punti aperti di D (validazione 2026-07-24)

1. **Nesting RTO→ASF**: confermato. ASF sotto RTO, servizi sotto ASF.
2. **Incendio vs Antincendio**: sono la stessa cosa → **unificati in
   Antincendio** (conserva Barbagli 17.817, ESMA 9.137, Tavanti 6.808, GTA 4.936
   annui = i suoi fornitori mensili ×12); nodo "Incendio" eliminato (fix
   `851ecd3`).
3. **Analisi**: due nodi Analisi **distinti** — uno sotto **Ambiente** (acustico
   Gracci, fumi/polveri Ecogam) che **resta dov'è**; uno sotto **Sicurezza**
   (acque/tamponi/alimenti) che **nasce vuoto** (nessun fornitore identificato
   nel PF) e si popolerà quando arriveranno i costi. Confermato: lasciarla vuota.
4. **Rollup Produzione**: confermato aggregare tutti i discendenti fermandosi ai
   confini "chiusa".
5. Persone ed erogato per le nuove aree arrivano con **E** e **I**.

### ⏳ DA FARE — blocchi E, F, G, I

- **E — KPI**: precaricare la proposta KPI per ogni area (marcati calcolabili vs
  manuali), tutti creabili/modificabili/monitorabili/eliminabili; **pannello
  target unico** dove il CDA imposta i target per tutte le aree con peso di
  stagionalità applicato in automatico (§C già pronta). *Il CRUD minimale sui
  KPI c'è già (§L: `a.kpiCustom` + ✎/🗑 sui micro); qui manca la proposta
  precaricata, la distinzione calcolabile/manuale, il pannello target unico e
  il collegamento dei KPI custom al cancello premi.*
- **F — Compensi responsabili**: fisso a mano modificabile (riproporziona tutto
  in tempo reale); variabile con **crescita continua** (no scaglioni): KPI<80→0;
  80–100 → aliquota 1,0%×(KPI−80)/20; ≥100 → 1,0%+0,05%×(KPI−100); cap 2,5% a
  130%. Aliquota sull'incassato dell'area. Parametri (soglia 80, base 1,0%,
  incremento 0,05%, cap) modificabili dal CDA. Vincolo: somma = 100% incassato;
  totale premi ≤ liquidità (già c'è la compressione §8). Responsabili intermedi
  (RTO/ASF/micro) prendono sul LORO ramo. *(GRFM 2% già fatto nel fix flusso.)*
- **G — Dashboard incidenza a 2 livelli**: "Incidenza aree" mostra SOLO le macro;
  click → esplode le sotto-aree. "i" cliccabile per spiegare i numeri. **Fix bug
  `0.00%%`** (doppio simbolo percentuale).
- **I — Erogato per servizio**: inserimento manuale per centro (tempi, valore
  erogato, tipologia, centro di costo), modificabile/eliminabile. *Lo slot in
  cui montarlo è già nella scheda area di §H (placeholder esplicito).* Margine col
  metodo "Marginalità" del PF: prezzo vendita netto − var. commerciali − var.
  interni − incidenza costi fissi.

### Note tecniche per continuare

- Schema attuale **v9**. Ogni bump di `CURRENT_SCHEMA_VERSION` richiede un nuovo
  step in `SCHEMA_MIGRATIONS` (migra aggiungendo solo ciò che manca, mai
  sovrascrive dati reali).
- Verifica rapida senza toccare il cloud condiviso: Playwright con rete Supabase
  **bloccata** (`ctx.route('**://*.supabase.co/**', r=>r.abort())`), poi
  `localStorage.clear()`. Vedi gli script in `/tmp/ssi-*.mjs` usati per validare
  A–D (import di `playwright` per path assoluto dalla cache npx).
- Controllo sintassi JS: estrai lo `<script>` principale e `node --check`.

---

## Fasi completate (1-6)

Riferimento completo: `SPEC-v10.md` nel repo.

1. **Import** — pagina dedicata per caricare i 3 Excel, mapping automatico (area/fisso-variabile/dipendenti), anteprima + conferma prima di sovrascrivere `S`.
2. **Tassonomia aree + organigramma + CRUD esteso** — aree allineate alla contabilità reale (Commerciale, Produzione, Amministrazione, Marketing, Formazione, Sorveglianza Sanitaria, Segreteria), organigramma SVG interattivo.
3. **Personale a lordo (natura) + cascata a priorità** — dipendenti/soci/P.IVA con garantito distinto; `flow()` ricalcolato come cascata a priorità (§5): incassato − GRFM − prioritari − garantito = liquidità disponibile − budget aree − premi = utili.
4. **Centri di costo / margine** — 6 centri sotto Produzione (Antincendio, Ambiente, Cantieri, RSPP, Verifiche Terra, Documenti), margine = valore − costo fisso − costo variabile, rollup sulla macro area quando i centri sono "chiusi".
5. **Premi / pannello direttore + soglia sostenibilità** — pool premi per area da margine/KPI (cancello 101%), slider con capienza in tempo reale, distribuzione tra le persone, maturazione mese/trimestre con storico; semaforo Z/Y/X su Dashboard CDA; grafici legacy riallineati alla nuova cascata.
6. **Seed dati reali + fissi/variabili per area + org drag&drop + schema versionato** — vedi dettaglio sotto.

### Cosa fa la Fase 6 nel dettaglio

- **Seed costi centri dal PF**: fornitore fisso + dettaglio fornitori (espandibile, CRUD) per Sorveglianza Sanitaria, Ambiente, Antincendio, Formazione, Commerciale, Verifiche Terra. Analisi assorbito in Ambiente, Estintori in Antincendio (erano la stessa cosa nel PF), Privacy/Acustica rimossi (nessun dato reale).
- **Vista Fissi vs Variabili per area** — in "Struttura & aree", raggruppa `S.sistemaFissi` per area con drill-down.
- **Dati reali 2026** dal Controllo di gestione — fatturato/costi esterni mensili (gen-mag) per precompilare l'incassato, margine reale come benchmark vs margine modello su Dashboard CDA (alert se divergono >5 punti).
- **Ricavo per centro switchabile** tecnico/manuale/% fatturato.
- **Organigramma drag & drop** — trascinare una card su un'altra cambia il `parentId`, con controllo anti-ciclo, flash di conferma e pulsante Annulla.
- **Schema versionato + migrazione automatica** (root cause fix, non un cerotto): `CURRENT_SCHEMA_VERSION` + `SCHEMA_MIGRATIONS` — uno stato che arriva (locale, cloud, realtime) da una versione precedente viene migrato aggiungendo solo ciò che manca, mai sovrascrivendo dati presenti; se lo stato in arrivo da cloud/realtime è più vecchio di quello corrente, si chiede conferma esplicita prima di applicarlo.

---

## Numeri chiave validati

Verificati leggendo `index.html` in un browser pulito (Playwright, rete Supabase bloccata per non scrivere sullo stato condiviso durante i test) e confrontati uno per uno con le cifre attese:

| Voce | Valore |
|---|---|
| Garantito personale (dipendenti + soci, esclusa CDA) | **€ 40.916,15/mese** |
| Sistema (costi fissi overhead) | **€ 43.994,28** |
| Prioritari (voci prioritarie — leasing/F24/IVA/rateizzi/TFR) | **€ 6.088,56** |
| Dipendenti agganciati (match import ↔ personale) | **13/13** |
| Incassi settimanali reali 2026 | **6 settimane, somma € 312.816,91** (identica al totale di riga 7 del foglio sorgente — quella riga è il totale, non una settimana, correttamente esclusa) |

## Cloud (Supabase — progetto `qujxbvootvollmziaqrd`)

- `compensi_stato` (stato condiviso multi-dispositivo, tabella `id='current'`): **migrato a `schemaVersion: 6`**, ora ha 13 aree (7 macro/sotto-aree + 6 centri di costo). `incassato=200000` e `periodicita='settimanale'` — dati reali preesistenti — **preservati intatti** dalla migrazione, non toccati.
- Controllo di versione anti-sovrascrittura attivo: se un dispositivo con codice più vecchio si ricollega, il suo stato viene migrato e **si chiede conferma prima di applicarlo** — non può più sovrascrivere in silenzio lavoro più recente di un altro dispositivo/scheda dimenticata aperta.
- `compensi_snapshots` (storico snapshot mensili): 2 righe reali "giugno 2026" (vedi punti aperti sotto per il valore anomalo).

---

## Punti aperti

1. **Policy RLS su `compensi_snapshots`**: la `DELETE` con la chiave anon usata dall'app viene bloccata in silenzio dalle RLS (PostgREST risponde 200 con 0 righe cancellate, non un errore) — il bottone "🗑 elimina snapshot" nell'app quindi non cancella nulla in cloud. L'app ora rileva l'esito e mostra un errore esplicito invece di far credere che sia andata a buon fine, ma il problema di fondo (permessi) resta lato database: serve una policy che permetta DELETE al ruolo usato dall'app, o autenticare l'app con un ruolo che ce l'ha (oggi non c'è un vero login Supabase, solo `currentUser` locale).

2. **Snapshot giugno 2026 con valore anomalo**: incassato registrato **€ 2.024.840**, ma il fatturato mensile reale (dal Controllo di gestione) è nell'ordine di €150-200k — quindi è circa **10× troppo alto** e falsa qualunque grafico storico che lo includa. Da verificare con chi l'ha inserito (probabile errore di battitura, es. una cifra di troppo) e correggere sia in `compensi_snapshots` sia nel blob `S.snaps` dentro `compensi_stato`. Non l'ho corretto io: è un dato storico reale, la decisione se e come editarlo spetta a chi lo ha inserito.

3. **Ricavo per centro da alimentare**: l'infrastruttura (modo tecnico/manuale/%, editabile in "Centri di costo" e in "Produzione tecnici") è pronta, ma i valori per i centri senza produzione tecnica collegata (Cantieri, RSPP, Documenti, Verifiche Terra) sono ancora a zero — vanno inseriti a mano o via % del fatturato quando si hanno i dati.

4. **Passata grafica** — non ancora fatta, l'app ha ricevuto solo lavoro funzionale finora.

5. **Merge finale su `main` e push su Pages** — deliberatamente non fatto finché il lavoro non è validato: il branch `ssi-compensi-import-phase` resta separato da `main`, il sito live su GitHub Pages non è stato toccato.
