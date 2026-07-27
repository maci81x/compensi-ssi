# HANDOVER — Compensi SSI

Stato del lavoro al **2026-07-27** (blocco finale A–D, L, G, H, F, E1
completati e validati), per continuare su un altro portatile.

## Come ripartire

```bash
git clone https://github.com/maci81x/compensi-ssi.git
cd compensi-ssi
git checkout blocco-finale        # branch del blocco finale (A–D fatti)
python3 -m http.server 8791
# poi apri http://localhost:8791/
```

> **Percorso reale del repo su questa macchina: `~/Sites/compensi-ssi`**
> (NON `~/Downloads/compensi-ssi` — quel path non esiste qui, anche se compare
> negli appunti di avvio).

Repo: **https://github.com/maci81x/compensi-ssi**
Branch di lavoro attuale: **`blocco-finale`** (contiene A–D; parte da
`ssi-compensi-import-phase`). **Non è mergiato su `main`, non toccare Pages** —
il sito live resta quello attuale su `main`. Nessun merge finché il blocco
finale non è validato tutto insieme.

Server locale già attivo in dev su `http://localhost:8791/`.

Nota: i tre file Excel sorgente (`PF SI 2026.xlsx`, `26_Dettaglio costi dipendenti.xlsx`, `26_Controllo di gestione.xlsx`) servono solo per **aggiornamenti futuri** dei dati — i dati veri di questi file sono già stati trascritti dentro `DEF` nel codice (`index.html`), non serve ricaricarli per continuare a lavorare. Il template `template_import_storico_vendite.xlsx` (§B) sta in `~/Desktop`.

---

## BLOCCO FINALE (A–L) — stato al 2026-07-24

Branch **`blocco-finale`**. Commit in ordine: A → fix flusso → B → C → D → fix D.

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

### ✅ L — CRUD ovunque + fix KPI Commerciale (2026-07-26)

Schema portato a **v9**. Fix e sei sotto-blocchi, ciascuno con smoke test
Playwright (`/tmp/ssi-check/smoke-l*.mjs`) e verifica invarianti dopo ogni
commit (`/tmp/ssi-check/invariants.mjs`):

- **Fix (7aeb4bf)** — Il KPI Commerciale aveva default `DVR da chiudere`
  (era da tecnici). Ora default vuoto con placeholder "es. Preventivi in
  trattativa da chiudere"; migrazione azzera lo stato esistente solo se
  ancora sul vecchio placeholder.
- **L1 (c83054e)** — Persone: helper globali `deletePersona`/`renamePersona`
  con pulizia riferimenti (`S.areeCA.agentiIds`, `caId`, `datiArea.comm.
  agenti`, `datiArea.form._per`) prima dello splice. Bottoni ✏/⚙/✕ affiancati
  al nome in Step 4 Risorse, tabella agenti Commerciale (`buildAgentRow`),
  formatori Formazione, pop persona. Amm/Mkt/SorvSan/Seg non elencano
  persone individualmente — CRUD accessibile via Step 4 o organigramma.
- **L2/L3 (f7e366d)** — Aree + Centri di costo: `renameArea`/`deleteArea`
  con ri-genitorializzazione dei figli al parent (no orfani), pulizia
  area/areaResp/slots.area delle persone, e **blacklist S.areeCancellate**
  per aree ufficiali eliminate (rispettata da `normalizzaOrgUfficiale`, così
  la delete è persistente). Pannello "Aree ufficiali cancellate" in
  Struttura con bottone ↺ ripristino. Bottoni ✏/🗑 su ogni riga Struttura
  e Centri di costo + "+ Nuovo centro (sotto ASF)".
- **L4 (989a5f9)** — Griglia Produzione tecnici: bottone 🗑 per riga tecnico
  che disattiva lo slot (`comp.generato_tecnico.on=false`) — la riga
  sparisce dalla griglia ma slot/valori/storico restano. Ri-attivabile
  dal pop persona. Non-distruttivo.
- **L5 (87679dd)** — Colonne griglia dinamiche: `VOCI_TEC` era hardcoded,
  ora è seed default `VOCI_TEC_DEFAULT` che alimenta **S.produzioneVoci**
  in migrazione v9. Toolbar CRUD sopra la griglia (✏ rinomina · ⇄ unità
  €↔h · ✕ elimina · + Nuova voce). `calcSlot.generato_tec` itera sulla
  lista dinamica — con seed default il risultato è identico al vecchio
  hardcoded (verificato: 1000·0,22 + 10·25 + 5·150 = 1220 prima e dopo).
- **L6 (acfe765)** — KPI per area (scope minimale): sui micro-KPI esistenti
  aggiunti ✕ delete + rename inline sul nome; nuovo array parallelo
  **S.kpiCustom[areaKey]=[]** con card CRUD (nome/target/effettivo/unità)
  esposte anche nelle aree senza micro. `S.datiArea`/`S.kpiObiettivi`
  non toccati (rifattorizzazione completa lasciata a §E).

Invarianti tenuti in ogni commit: Sistema 43.994,28 · garantito personale
40.916,15 · liquidità 3.537 · fornitori totali 20.356,43.

### ✅ G+H — Incidenza aree a 2 livelli + scheda AREA (2026-07-26)

Solo rendering, motore di calcolo intatto (`flow()`/`areaBudget`/`areaCosto`
non toccati). Invarianti confermati identici (Sistema 43.994,28 · garantito
personale 40.916,15 · liquidità 3.537 · fornitori totali 20.356,43).

- **G — Dashboard incidenza a 2 livelli**: `renderSimAree` refattorizzata
  (pagina Simulatore, sezione "Incidenza aree"). Ora mostra SOLO le macro
  top-level (aree con `parentId` nullo/vuoto) con % sul totale; click sulla
  card → esplode le sotto-voci figlie con doppia percentuale "macro" e "tot".
  Helper `_sumSubtree(areaId)` aggrega ricorsivamente budget/costo del
  sottoalbero, così una macro che contiene N centri chiusi mostra il vero
  peso. **Bug `0.00%%` fixato** (line 7361 vecchia): `${P(a.incPct)}%`
  produceva doppio simbolo — `P()` già ritorna una stringa con `%`
  inclusa. Ora tutte le percentuali usano solo `P(...)` senza il `+'%'`
  di troppo. Aggiunto CSS `.sim-sub-grid`/`.sim-sub-item` per la vista
  espansa. Torta doughnut allineata: ora mostra solo le macro (prima le 30
  aree).
- **H — Click su area organigramma apre scheda AREA**: nuovo
  `openSchedaArea(areaId)` che apre il popover esistente con dati aggregati
  dell'area (budget/costo/margine %, KPI area con dettaglio micro, rollup
  discendenti se presenti, responsabili, sotto-aree cliccabili, elenco
  persone) + bottoni "▶ Vai a pagina X" (se l'area ha una page dedicata:
  comm/prod/form/amm/mkt/sorvsan/sis), "⚙ Struttura", "👤 Configura resp"
  se c'è un solo responsabile. Il click nell'organigramma non fa più
  partire il popover "Configura persona" del responsabile (bug: l'`if(n.pi
  >=0) fg.addEventListener('click', openPersonaPop)` a line 4720 ora esclude
  `type==='area'`). L'`endDrag` chiama `openSchedaArea(n.areaId)` anziché
  `goPage(areaPageMap[...])` — la navigazione alla pagina resta come pulsante
  esplicito dentro la scheda.

### ✅ H FIX 1/2/3 — Responsabili corretti + editor + nodi persona (2026-07-26)

Schema portato a **v10**. Sempre puro rendering/dato di display: motore
`flow()` / `areaBudget` / `areaCosto` / `garantitoNatura` intatto.
Invarianti confermati identici (Sistema 43.994,28 · garantito personale
40.916,15 · liquidità 3.537 · fornitori totali 20.356,43).

- **FIX 1 — Responsabili designati distinti dalle persone**: la sezione
  "Responsabili" della scheda AREA mostrava tutte le persone dell'area
  (`p.areaResp===id` → identico a "N persone"). Nuovi campi per ogni area:
  - `area.responsabiliIds[]` — designazione responsabili (input futuro §F)
  - `area.capiAreaIds[]` — subset che è anche Capo Area (rilevante per comm)
  Seed nel DEF + migrazione v10 (idempotente):
  - `amm.responsabiliIds = ['p04']` (Francesco Martini)
  - `comm.responsabiliIds = ['p01','p05']`, `capiAreaIds = ['p05']` (Roberto
    Macinai + Alessandro Raia con distinzione CA)
  - `prod.responsabiliIds = ['p03','p07']` (Giovanna Panti + Samuele/RTO)
  - `form/mkt/sorvsan/sis.responsabiliIds = []` (da designare da UI)
  `openSchedaArea` ora legge questi array. Il flag `persona.isResp` NON è
  toccato (alimenta ancora `comp.ore_resp`). Nessun compenso calcolato —
  pura designazione.
- **FIX 2 — Editor responsabili nel pannello AREA**: nella scheda AREA
  ogni responsabile mostra un badge cliccabile con: nome (apre pop persona),
  toggle `+CA/✕CA` (Capo Area), `✕` rimuovi. Sotto: select "Aggiungi" con
  le persone dell'area non ancora designate + pulsante `+ resp.` Helper
  globali `addResponsabileFromSelect(areaId)`, `removeResponsabile(areaId,
  pid)`, `toggleCapoArea(areaId, pid)`. Ogni azione fa `renderAll()` che
  salva su LS + Supabase (autosave).
- **FIX 3 — Nodi persona esplicti nell'organigramma**: aggiunti nodi
  `type:'org_person'` (badge PERSONA) per **Samuele** (p07, sub "RTO") sotto
  Produzione e **Alessandro Raia** (p05, sub "Capo Area") sotto Commerciale.
  Non creano nuove risorse: usano persone esistenti nel personale. Pattern
  simile a Gaia (`cda_staff`) ma agganciati via `lnk(nProd, nSamuele)` e
  `lnk(nComm, nRaia)` prima di `posT` → entrano nel layout ricorsivo come
  primi figli. Il click apre `openPersonaPop` (listener esistente gestisce
  `n.pi>=0 && n.type!=='area'`).

Smoke test:
 - `tests/smoke-g.mjs` (verifica no `%%`, macro renderizzate, espansione
   sotto con doppia %)
 - `tests/smoke-h.mjs` **esteso**: 5 verifiche in una — seed schema v10,
   responsabili corretti in scheda amm (Francesco sì, Mattia solo in select
   "aggiungi"), badge CA su Raia in comm, editor add/remove/toggle non tocca
   `p.isResp`, nodi Samuele/Raia presenti nell'SVG organigramma con badge
   PERSONA, regressione H originale (Area:X invece di Configura, ecc.)

### ✅ F — Compensi responsabili macro-area (2026-07-26)

Schema portato a **v11**. Regola confermata: F applica ai responsabili
designati di aree con budget proprio (`variabilePct>0 || fisso>0`), NON
in `capiAreaIds`. Esclusi automaticamente: Raia (CA), Samuele (spostato
a rto — area senza budget proprio), Gaia (non responsabile).

**5 responsabili in F (mappatura definitiva)**:
| id | Persona | Area |
|---|---|---|
| p01 | Roberto Macinai | comm (Commerciale) |
| p02 | Marco Macinai | mkt (Marketing) |
| p03 | Giovanna Panti | prod (Produzione) |
| p04 | Francesco Martini | amm (Amministrazione) |
| p11 | Niccolò | form (Formazione) |

**Formula (parametri modificabili dal pannello CDA)**:
```
K < 80        → r = 0
80 ≤ K < 100  → r = 1,0% × (K − 80) / 20        (0 → 1,0% linearmente)
100 ≤ K < 130 → r = 1,0% + 0,05% × (K − 100)    (1,0% → 2,5% linearmente)
K ≥ 130       → r = 2,5%                         (cap)

Compenso F = r × margine diretto area (0 se margine ≤ 0)
```

**Base = margine DIRETTO** (bud area − costo area del solo nodo), non
il roll: il responsabile macro governa il proprio nodo, non i margini
dei centri interni chiusi (che sono responsabilità dei sub-manager).
Esempio: Giovanna prende F sul +12.622 diretto di Produzione, non su
−39.469 del roll con 16 centri.

**Natura = VARIABILE, priorità 2 nel pool comprimibile**: F entra in
`flow().pool2e3` come voce `{nome:'Compensi F', val:totCompensoFRichiesto,
priorita:S.compensiF.priorita||2}`. Se la liquidità non basta viene
compresso insieme al budget aree (default P2). Non tocca il garantito
personale (40.916,15 resta invariato).

**Integrazione**: `calcCompensoF(p)` è chiamata SOLO da `flow()` e dalla
UI (openSchedaArea). NON è dentro `calcPersona.totale` → evita loop
circolare (areaCosto→calcPersona→calcCompensoF→areaCosto).

**Invarianti al K attuale=0% (tutti i micro non compilati)**: identici
al pre-F (Sistema 43.994,28 · Garantito 40.916,15 · Liquidità 3.537 ·
Fornitori 20.356,43). F si attiverà quando si compilerà `micro[i].ke`
per portare i KPI area sopra 80%.

**UI**:
- `openSchedaArea` mostra sezione "💰 Compenso §F responsabili" con
  riga per ogni resp: K, r, margine, importo richiesto. Bottone "⚙
  formula" per aprire `openCompensiFParams()` (soglia/base/inc/cap/
  priorità + preview aliquote sui bordi + toggle enabled).
- `S.compensiF.enabled=false` disattiva tutto (utile per stress test).

Smoke test `tests/smoke-f.mjs` verifica: schema v11, seed mappature,
isRespF discrimina correttamente (5 in F, 4 esclusi), aliquotaF su
bordi (0, 79, 80, 90, 100, 115, 130, 200), K=0% → F=0 e invarianti
identici, simulazione K=100% su Commerciale → Roberto prende 198,52.

### ✅ E1 — Catalogo proposte KPI + Pannello target unico (2026-07-27)

Puro rendering/dato di display: motore intatto. Invarianti identici
(Sistema 43.994,28 · Garantito personale 40.916,15 · Liquidità 3.537 ·
Fornitori totali 20.356,43).

**Stato KPI pre-E1**: 51 KPI micro DEF su 7 aree macro/funzionali
(comm 9, prod 10, amm 9, mkt 3, form 10, sorvsan 2, sis 8); 23 aree
tecniche (RTO, ASF, centri, sicurezza) senza KPI; kpiCustom vuoto.

**E1a — Catalogo proposte KPI per tipo area**:
Costante `KPI_PROPOSTE` con 9 categorie tipo (commerciale/produzione/
formazione/amministrazione/marketing/sorvsan/segreteria/centro/
trasversale) e ~44 proposte totali (target consigliato, unità, note).
`areaTipoCatalogo(a)` mappa area→tipo con regole:
 - comm/prod/amm/mkt/form/sorvsan/sis → tipo omonimo
 - rto/asf/CENTRI_IDS/figli di ASF/sicurezza → 'centro'
 - sotto-aree di macro riconosciute → tipo del padre (es. c_medici_
   competenti → 'sorvsan', c_senior_sales → 'commerciale')
 - fallback: 'trasversale'
`proposteKpiPer(areaId)` restituisce proposte NON già presenti (dedup
case-insensitive/trim su micro DEF + kpiCustom).
`aggiungiKpiDaProposta(areaId, nome)` idempotente: se già presente
non duplica. `aggiungiTuttiKpiProposte(areaId)` con conferma per popolare
un centro vuoto in un colpo. UI nella scheda AREA: sezione "📚 Catalogo
proposte KPI (tipo: X) — N" con button per ogni proposta + "+ Aggiungi
tutti". Ogni aggiunta atterra in `S.kpiCustom[areaId]` — mai tocca micro
esistenti.

**E1b — Pannello target unico** (nuova pagina `kpi_targets`):
Voce nav "🎯 KPI & target" (dopo Struttura). Aggrega TUTTI i KPI (micro
DEF + kpiCustom) di TUTTE le aree in una vista piatta raggruppata per
area, con edit inline dei target che autosalva via `renderAll()` (LS +
Supabase). Filtri: testo (nome KPI o area), "solo aree con resp. §F",
"nascondi target=0" (default on). Per ogni area mostra KPI area
aggregato + badge §F ("attivo r=X%" se KPI area ≥ 80%, "sotto soglia"
altrimenti). Shortcut alla scheda area dai risultati. `renderKpiTargets
Page()` chiamata da goPage e ri-chiamata a ogni edit per feedback
immediato del % KPI cambiato.

Smoke test `tests/smoke-e1.mjs`: verifica catalogo (9 tipi definiti),
areaTipoCatalogo (13 mapping), proposteKpiPer (dedup con micro + custom),
aggiungiKpiDaProposta idempotente, pagina kpi_targets renderizza + edit
target su micro/custom autosalva, invarianti identici.

### ⏳ ANCORA DA FARE — blocchi E2, I

- **E2 — Stagionalità target** *(rimasto in sospeso dopo E1)*: applicare
  automaticamente ai target del mese corrente il peso di stagionalità già
  presente in §C (`S.stagionalita.venduto`/`incassato` mese × 100).
  Distinguere tra target "grezzo" (mensile costante) e "destagionalizzato"
  (target × indice / 100). Il pannello target unico dovrà mostrare
  entrambi.
- **I — Erogato per servizio**: inserimento manuale per centro (tempi, valore
  erogato, tipologia, centro di costo), modificabile/eliminabile. Margine col
  metodo "Marginalità" del PF: prezzo vendita netto − var. commerciali − var.
  interni − incidenza costi fissi.

### Note tecniche per continuare

- Schema attuale **v11**. Ogni bump di `CURRENT_SCHEMA_VERSION` richiede un nuovo
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
