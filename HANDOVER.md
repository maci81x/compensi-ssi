# HANDOVER — Compensi SSI

Stato del lavoro al **2026-07-27** — **BLOCCO FINALE COMPLETO + BATCH2 UX**.
Completati e validati: A, B, C, D, L, G, H, F, E1, I; E2 rinviato con nota;
audit universale eseguito; batch2 UX (P1-P5) integrato per rifiniture pre-
merge (KPI risultato + catalogo servizi + fix bug erogato + modelli import
+ guide in-page). Regression 12/12 verde.

## 🚀 STATO 2026-07-29 — motore import-pf / COSTI FISSI: CHIUSO E IN PRODUZIONE

- Merge `prep-import-pf` → `main` eseguito. Schema v14. Regression 14/14 verde.
- Invarianti a riposo (nuova baseline, OSM rimosso dai prioritari):
  **Sistema 43.994,28 · Fornitori 20.356,43 · Liquidità 6.078 · Garantito 40.916,15**.
- Cosa fa `applyImport` ora: fix parser PF (hyperlink, subtotali, IVA ristretto)
  + backfill `importKey` sui seed + `prioMatchKey` + propagazione a Sistema **E**
  Fornitori (`propagateFornitoreVal`, con ricalcolo `fornitoreFisso` e cross-parent
  `sorvsan → c_medici_competenti` / `form → c_docenti`).
- Import dei **DATI** PF NON ancora eseguito (solo il motore è in produzione).
  Quando si importerà `PF.xlsx` dalla UI, atteso dal dry-run: 170 merge
  `sistemaFissi` + 9 merge prioritari + propagazione fornitori dei 6 centri +
  2 sole nuove prioritarie (IRPEF/Contributi 4.818,88 + F24 DM10 3.393,54).
  Post-import atteso: **Sistema → 50.806,38**, **Liquidità media → −10.409**
  (tasse dentro), **Fornitori resta 20.356,43** (no-op perché val PF = val seed).

### TODO prossime sessioni

1. Import PF dalla UI (azione manuale) + ispezionare le ~10 righe "nuove"
   (costi veri o naming da allineare).
2. Decidere il doppio **OSM / O.S.M.F.** nel PF.
3. Collegare le voci PF alle macro-aree (ultimo pezzo del blocco import-pf).
4. Collaudo a video del **garantito mese-su-mese** in produzione.
5. In sospeso su altro branch: **ignora-premi** (scelta semantica A/B/C, merge
   fermo su branch `ignora-premi`).
6. Futuro: **Tab Personale** (anagrafica + switch dip↔P.IVA + serie costi mensili).

## 🎯 Branch `blocco-finale` — ARCHIVIATO (2026-07-29)

Il branch è stato **mergiato su `main` con commit `74337bc`** (chiusura
blocco finale + batch2 UX + Fasi 7/11) e successivamente **cancellato
locale e remoto** in data 2026-07-29. Tutto il suo contenuto è già in
`main`, che nel frattempo è avanzato con Fase 12, `org-segreteria`,
`CostiMensili2026` e `prep-import-pf`.

Regression finale automatizzata al momento del merge: **12/12 verdi** —
invariants + smoke L1..L6 + G + H + F + E1 + I + batch2. Invarianti a
quella data (blocco D, 2026-07-24): **Sistema 43.994,28 · Garantito
personale 40.916,15 · Liquidità 3.537 · Fornitori totali 20.356,43**.
Baseline attuale post-import-pf: vedi sezione in cima.

## 🆕 Batch2 UX (2026-07-27) — 5 rifiniture pre-merge

Solo UI/dato di display + estensione motore KPI (che al default a KPI=0
non muove nulla). Invarianti confermati IDENTICI.

- **P1 — KPI risultato mensile + toggle "considera"** (sblocca §F):
  Rinominata la colonna "Effettivo" → "Risultato mese" nel pannello 🎯
  KPI & target. Aggiunta colonna "Considera" per i KPI custom (default
  true; se OFF il KPI non concorre a `kpiA(a)`). Esteso `kpiA(a)` per
  includere anche `S.kpiCustom[a.id]` (prima solo `a.micro`). Verifica:
  portando i micro-KPI di comm a K=100%, Roberto passa da F=0 a F=198,52;
  azzerando torna a 0. Nuovo helper `kpiRaggiungimentoCustom(k)`.
- **P2 — Catalogo servizi centro + select servizio/tipologia + fix bug
  erogato**: `S.cataloghiServizi[centroId]=[{id,nome,tipologia}]` con
  seed lazy: (1) centri tecnici → VOCI_TEC_DEFAULT (Documenti/Analisi/
  RSPP/…); (2) altri centri con micro/fornitori → derivazione; (3)
  fallback 3 placeholder etichettati "Servizio A/B/C (placeholder —
  rinomina)". `TIPOLOGIE_EROGATO_DEFAULT` = ['Standard','Extra',
  'Ricorrente','Una tantum','Straordinario']. Helper add/rename/delete
  + `importCatalogoServiziFile`. In `renderErogatoPage` "Servizio" e
  "Tipologia" ora sono `<select>` popolati dal catalogo del centro
  (mai testo libero); sezione collassabile "📚 Catalogo servizi di
  questo centro" con warning se contiene placeholder. **Fix bug**
  del valore=10000 non committato: aggiunto `oninput` (oltre a
  `onchange`) sull'input number → il valore atterra in S al primo
  carattere. Verifica: digitando 10000 e cliccando toggle senza tab,
  attivo passa correttamente da 0 a 10000.
- **P3 — Checkbox "Ignora persona" visibile**: era in linea con isResp/
  isCapoArea (spesso tagliata dal flex-wrap). Ora è in un box dedicato
  con background che cambia (amber se attiva) e testo esplicativo
  dinamico che conferma lo stato.
- **P4 — Modelli scaricabili accanto a ogni import**: `_downloadCSV(name,
  rows)` genera CSV con BOM per Excel IT (delimiter `;`). Tre template
  attuali:
  - `downloadTemplateErogato(areaId)`: intestazioni + esempio +
    LEGENDA con servizi ammessi del centro + tipologie ammesse
  - `downloadTemplateCatalogoServizi()`: nome/tipologia + legenda
  - `downloadTemplateKpiCustom()`: area/nome/target/effettivo/unita/
    note + elenco aree disponibili
  Pulsante "📄 Modello" affiancato a ogni pulsante "📥 Import" nelle
  pagine Erogato, KPI targets, e nella sezione catalogo servizi.
- **P5 — Guide "come funziona" in ogni pagina**: componente CSS
  `.guida-box` (`<details>` collassabile) aggiunto in cima a: Erogato,
  KPI targets, Struttura, Sistema, Produzione, Centri di costo, e le
  6 pagine area (Comm/Form/Amm/Mkt/SorvSan/Seg). Contenuti brevi,
  operativi, in italiano: cosa fa la pagina, come inserire manuale/
  import, significato di toggle e delete, soglia 80 per §F dove
  pertinente.

Nuovo smoke `tests/smoke-batch2.mjs` verifica in un colpo:
 - P1: kpiA include kpiCustom (17% quando aggiungi un KPI custom
   100/100); Roberto F=198,52 al K=100%; torna a 0 al reset
 - P2a: seed catalogo corretto (c_ambiente=12 voci da VOCI_TEC,
   c_privacy=3 placeholder, rto=3, tipologie=5)
 - P2b: CRUD catalogo idempotente (add + dedup + delete)
 - P2c: bug erogato fixato (10000 + toggle = attivo 10000)
 - P3: checkbox `pp-escl` esistente, visibile, box con background
 - P4: 4 funzioni download definite
 - P5: guide presenti su 12 pagine principali
 - INVARIANTI IDENTICI al default

## 📋 Matrice CRUD dopo audit universale (2026-07-27)

Per ogni contesto dati: (M) manuale · (I) import · (X) ignora · (D) elimina.

| Contesto | M | I | X | D | Note |
|---|:-:|:-:|:-:|:-:|---|
| Persone (S.personale) | ✔ | ✔ | ✔ *new* | ✔ | Toggle 👁 "Ignora nel calcolo" (`p.escludiDaCalcolo`) nel pop persona, default OFF. Import dipendenti Excel già presente. |
| Aree/Organigramma (S.aree) | ✔ | ✗ | ✔ | ✔ | `chiusa` flag + blacklist `S.areeCancellate` per ufficiali. Import batch aree non pertinente (config statica). |
| Centri di costo | ✔ | ✗ | ✔ | ✔ | Come aree; `chiusa:true` esclude dal rollup. |
| KPI base (a.micro) | ✔ | ✔ | ✔ *batch2* | ✔ | Sempre inclusi in `kpiA(a)` (fonte DEF, i micro sono la baseline). "Considera" nel pannello 🎯 dice "sempre" — non escludibili. Per escludere: eliminare o azzerare target. |
| KPI custom (S.kpiCustom) | ✔ | ✔ | ✔ *batch2* | ✔ | Nuovo toggle "Considera" (default true): se OFF il KPI custom NON entra in `kpiA(a)` senza cancellarlo. Il **risultato mese** è il campo `effettivo` (rinominato in UI "Risultato mese"). |
| Catalogo servizi centro (S.cataloghiServizi) *batch2* | ✔ | ✔ | ✗ | ✔ | Nuovo modello: `{[centroId]:[{id,nome,tipologia}]}`. Seed lazy dai VOCI_TEC per centri tecnici, placeholder per gli altri. Alimenta i `<select>` "Servizio" nella pagina Erogato. Import con dedup case-insensitive. |
| Tipologie erogato (S.tipologieErogato) *batch2* | ✔ | ✗ | ✗ | ✔ | Lista fissa (default 5 valori). Alimenta `<select>` "Tipologia" delle righe erogato. |
| Catalogo proposte KPI (§E1a) | ✔ | — | — | — | Sorgente dati statica (KPI_PROPOSTE); ogni proposta si "promuove" a KPI custom con click. |
| Target KPI | ✔ | ✔ | — | — | Pannello unico §E1b + import batch KPI include target. |
| Responsabili (responsabiliIds/capiAreaIds) | ✔ | ✗ | ✔ | ✔ | Editor nella scheda AREA (§H). Import non necessario (configurazione statica). "Ignora" = rimuovi resp. |
| Erogato per servizio (S.erogatoServizi) | ✔ *new* | ✔ *new* | ✔ *new* | ✔ *new* | §I completo: manuale + import Excel/CSV additivo con dedup + toggle "considera" per riga + delete. |
| Voci sistema (S.sistemaFissi) | ✔ | ✔ | ✔ *new* | ✔ | Toggle 👁 sulla riga in pagina Sistema (`v.escludi`), default OFF. Import PF già presente. |
| Fornitori area | ✔ | ✔ | ✔ *new* | ✔ | Toggle 👁 sulla riga in Centri di costo (`f.escludi`), default OFF. Import PF popola fornitori. |
| Dati mensili per area | ✔ | ✗ | — | ✔ | Editor per area + resetAreaDati. Import non pertinente (dati mese ≠ import batch). |
| Snapshot mensili (S.snaps) | ✔ | — | — | ✔ | Snap automatico + delete cloud/local. |
| Prioritari (S.prioritari) | ✔ | — | — | ✔ | Editor in pagina Sistema. |
| Voci griglia Produzione (S.produzioneVoci) | ✔ | ✗ | — | ✔ | Toolbar CRUD in Produzione (§L L5). |

*Le voci contrassegnate `*new*` sono aggiunte del batch finale 2026-07-27.*

**Regola comune audit**: tutti i toggle `escludi`/`escludiDaCalcolo`/
`considera` hanno default sicuro (OFF/false) → gli invarianti seed
restano identici. Ogni import è additivo con dedup — mai sovrascrittura
in silenzio.

## 📜 Stato completo dei blocchi

| Blocco | Stato | Commit | Note |
|---|---|---|---|
| A | ✅ | `a415de2` | Incassato reale |
| Fix flusso | ✅ | `c975d9e` | altriCostiOperativi + GRFM 2% |
| B | ✅ | `025097f` | Import storico vendite |
| C | ✅ | `55b45e4` | Stagionalità (indici, non ancora applicati ai target — vedi E2 sotto) |
| D | ✅ | `c219764`+`851ecd3` | Organigramma ufficiale |
| L (L1..L6) | ✅ | `c83054e`..`acfe765` | CRUD ovunque + fix KPI Commerciale |
| G | ✅ | `a95d751` | Incidenza aree 2 livelli + fix %% |
| H | ✅ | `a95d751`+`5d53930` | Scheda AREA + responsabili distinti + nodi org |
| F | ✅ | `6339b01` | Compensi responsabili macro (curva cap 2,5%) |
| E1 | ✅ | `ed1bd3f` | Catalogo proposte + pannello target |
| **I + audit** | ✅ | *(questo commit)* | Erogato per servizio + audit CRUD universale |
| **E2** | ⏸ RINVIATO | — | Vedi nota sotto. |

## ⏸ E2 (stagionalità sui target KPI) — RINVIATO

**Motivo**: mancano i dati storici sufficienti per costruire indici di
stagionalità affidabili applicabili automaticamente ai target del mese
corrente. Gli indici già in `S.stagionalita` (§C) coprono `venduto`/
`incassato` sugli anni 2024-2025, ma per i KPI diversi da fatturato (es.
"Nr visite mediche", "Nr corsi erogati", "Nr appuntamenti") non abbiamo
storico storicizzato per KPI/area/mese.

**Piano ripresa**: riprendere l'anno prossimo (2027) quando lo storico
2026 mensile per KPI sarà disponibile:
1. Aggiungere `S.storicoKPI[anno][areaId][kpiKey]=[12]` con seed dallo
   snapshot mensile
2. `ricalcolaStagionalitaKPI()` analogo a `ricalcolaStagionalita()` di §C
3. Nel pannello target unico (§E1b): toggle "applica stagionalità" per
   riga → target destagionalizzato = target medio × indice / 100
4. Il compenso §F userà automaticamente il target destagionalizzato (K =
   effettivo / target destagionalizzato × 100)

Nel frattempo l'utente inserisce i target manualmente nel pannello unico
(§E1b) — che è già coerente col mese in corso.

## ⏭ Nessun blocco pendente

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

### ⏳ Blocchi rimasti

Vedi in cima a questo file:
 - **§I completato** (Erogato per servizio) — 2026-07-27
 - **§E2 rinviato** al 2027 quando lo storico KPI sarà disponibile

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

## Roadmap delle Fasi 1-12 (storico)

## Fasi completate (1-12)

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
12. **Backfill importKey su sistemaFissi seminato + policy RLS UPDATE/DELETE
    su compensi_snapshots + docs finali + guida chi-fa-cosa** (Fase 12,
    2026-07-24, chiusura app).

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
| Schema version | 10 ✓ (bump Fase 12: backfill importKey) |
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

## Punti aperti (chiusi nella Fase 12)

1. **~~Policy RLS su `compensi_snapshots`~~** — **RISOLTO Fase 12**: aggiunte
   policy `UPDATE` e `DELETE` per il ruolo `anon` sulla tabella
   `compensi_snapshots` (migrazione DB
   `compensi_snapshots_update_delete_policies` applicata su Supabase). Il
   bottone "elimina snapshot" ora funziona per tutti. Test dal vivo passato:
   snap fittizio creato via app → cancellato via app → cloud pulito.

2. **Ricavi per servizio reali da inserire** (evoluzione del punto 3 aperto
   originale): resta come **evoluzione futura**, non blocco tecnico. Vedi la
   sezione "Cosa resta aperto" in cima al documento — la ripartizione STIMA
   % è il default; quando arrivano i ricavi veri, Francesco li inserisce
   nel campo "Manuale €" della pagina "Centri di costo".

### Cosa fa la Fase 12 nel dettaglio (2026-07-24, chiusura app)

- **Backfill importKey su S.sistemaFissi seminato** (SPEC §M): le 183 voci
  del seed DEF non avevano `importKey` (solo le nuove voci importate ce
  l'avevano da Fase 10). Al prossimo aggiornamento del PF il dedup si
  sarebbe affidato alla sola similarità nome+valore — protezione più
  debole. Migrazione schema **v10** (idempotente/additiva): per ogni
  voce `sistemaFissi` con `areaPF` ma senza `importKey`, calcola
  `pfImportKey({areaPF, cat, voce:nome})` e la salva. Vale anche per
  gli stati salvati sul cloud (la migrazione gira automaticamente su
  ogni loadState).
- **Auto-merge in preview import**: nuova funzione `autoMergePFByImportKey`
  chiamata in `handleImportPF` subito dopo il parse. Per ogni voce PF
  con `importKey` esatto match in `sistemaFissi`, pre-imposta
  `mergeInto = sf.id`. L'utente vede il badge "unita con «X»" già
  apparecchiato e può ancora annullare voce per voce.
- **Test tripla superata** (`/tmp/backfill-test.mjs`):
  - **Test 1** — re-import stesso PF: 183 hit di importKey → 183 voci
    mergiate, 0 create. `sistemaFissi.length` invariato (183 → 183),
    Sistema totale invariato (**€ 43.994,28 → € 43.994,28**).
  - **Test 2** — modifica importo nel PF e reimporta: voce aggiornata
    (val 748,82 → 2.246,46), nessun duplicato (183 → 183).
  - **Test 3** — cambio a mano natura+area di una voce (con
    `userEdited`) e reimporta: override utente **preservato** (natura
    resta "variabile", areaPF resta "Formazione", il PF originale non
    li ha sovrascritti).
- **Policy RLS UPDATE + DELETE su `compensi_snapshots`** (SPEC §N):
  aggiunte via migrazione DB `compensi_snapshots_update_delete_policies`.
  Test dal vivo: snap fittizio `TEST_RLS_*` creato via `saveSnap()` →
  cancellato via `deleteSnap()` → cloud pulito (verificato con SELECT
  post-delete). L'app ora può gestire il ciclo di vita snapshot senza
  workaround admin.
- **Documentazione finale**: HANDOVER + SPEC riscritti con:
  - Numeri chiave validati (tabella in cima).
  - Struttura aree definitiva (13 aree, tassonomia v10).
  - Guida "chi inserisce cosa" per Roberto/Francesco/Giovanna/Samuele/
    Niccolò/Marco/direttori d'area con frequenza.
  - Cosa resta aperto per evoluzione futura (ricavi per servizio,
    spacchettamento altri costi operativi).
- **Nessun altro punto tecnico aperto**: realtime abilitato, cloud
  allineato, popup di versione eliminato, DnD funzionante, KPI macro
  attivi, sistema fissi/variabili navigabile e correggibile.

3. **Voce "altri costi operativi" come stima aggregata** (default 15.000/mese):
   copre ammortamenti, materiali, subappalti occasionali, provvigioni variabili
   agenti — voci del foglio Controllo di gestione non ancora catalogate
   puntualmente nel modello. Da spacchettare in voci concrete quando arriveranno
   i dati (fattura per fattura) e portare a 0 il "residuo" — Fase 9 futura.
   Oggi è editabile con badge STIMA sulla pagina Centri di costo.
