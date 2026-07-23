# SSI · Compensi — Brief operativo v10 (per Claude Code)

> **Come usarlo:** salva questo file nel repo (`SPEC-v10.md`) e dì a Claude Code di implementarlo
> partendo dal file esistente `index.html` (v9.2). **Non riscrivere da zero**: estendi il modello dati
> `S`, la cascata `flow()` e le pagine già presenti. Preserva tutto ciò che è elencato in §12.

---

## 1. Obiettivo (il "perché")

L'app deve modellare l'azienda come **sostenibile a partire dal cashflow reale**: l'**incassato del mese
= 100%**, e ogni voce (tasse, costi prioritari, personale, budget aree, premi, utili) è una fetta che,
sommata, fa 100%. È una **"coperta"**: se tiri da una parte, un'altra si stringe — secondo una regola di
**priorità esplicita**, non a mano. Chi lavora guadagna per **ciò che produce** e per **l'andamento della
propria area**. L'app deve **rispecchiare la contabilità** (file PF + dipendenti).

---

## 2. File sorgente → mappatura dati

Tre file Excel (già forniti). L'import (§10) li legge; questa è la mappatura autorevole.

### 2.1 `PF SI 2026.xlsx` → foglio **"2026 PF"** (costi consuntivo, per area, fisso/variabile)
- **Col A = macro area.** Valori reali presenti: `Commerciale`, `Sistema`, `Produzione`,
  `Formazione`, `Sorveglianza Sanitaria`, `Marketing`, `IVA`.
- **Riga 66** apre il blocco **COSTI FISSI**; **riga 151** (col B = "COSTI VARIABILI") apre i **VARIABILI**.
  → La natura (fisso/variabile) di ogni voce si deduce dalla **posizione della riga** rispetto a 151.
- **Col B** = categoria/voce, **Col C** = fornitore/descrizione, **Col D = totale annuo €**,
  **Col E = %**, **Col F–Q = mesi (consuntivo)**.

### 2.2 `PF SI 2026.xlsx` → foglio **"PREVISIONALE 2026"** (budget, % di incidenza)
- Esprime ogni blocco come **% sull'incassato** (Col D) → è la base per i **budget di default** delle aree.
- Pesi 2026 di riferimento: Costi fissi ~59% · Personale ~24,8% · Soci ~10,6% (4× €4.800/mese:
  Giovanna, Marco, Francesco, Roberto) · Servizi ~15,3% · **Accantonamenti 2%**.
- Incassato budget ~2.176.900 (108% del venduto, recuperi crediti al 25%).
- **Col C = annuo**, **Col D = %**, **Col E,F,… = mesi**. Usa questi come **default** di `budget.fisso`
  e `budget.variabilePct` per area (poi tutto è modificabile a mano).

### 2.3 `26_Dettaglio costi dipendenti.xlsx` → foglio **"2026"** (lordo/costo azienda)
- **Col A = nome dipendente**, **Col B = COSTO AZIENDA annuo** → **mensile = B / 12** (garantito).
- 13 dipendenti: 9 produzione (Cipriani, Gambini, Golini, Biotti, Pelliccia, Corti, Cristofori, Corsi,
  Aldinucci) + 4 ufficio (Necci, Caserta, Guardiani, Deplano). Colonne mensili F–…: lordo paga,
  gg/ore lavorate, **costo giorno/costo orario** → usa il **costo orario** per il costo variabile dei centri (§6).
- ⚠️ Qui ci sono **solo i dipendenti**. Soci e P.IVA **non** sono in questo file (vedi §7).

### 2.4 `26_Controllo di gestione.xlsx` → foglio **"GESTIONALE"** (storico, solo andamento)
- Fatturato/incassato/venduto/costi esterni per mese, 2024→2026. **Non alimenta i calcoli**: serve
  solo come grafico di andamento indicativo (storico).

> **Nota per Code:** al momento dell'import, alcuni blocchi del previsionale possono essere annidati
> (es. "Costi fissi" che ingloba Personale/Servizi). Risolvi con **anteprima + conferma** (§10): mostra a
> Roberto la decomposizione prima di sovrascrivere `S`.

---

## 3. Tassonomia aree e organigramma (nuova)

Allinea le aree a quelle della contabilità (PF col A), con questa gerarchia:

```
CDA (Utili)
 └─ Segreteria / Direzione        (STAFF, a lato del CDA — solo costo)
 └─ SSI srl   (− GRFM %)
     ├─ AMMINISTRAZIONE           (COSTO puro, no fatturato)
     ├─ COMMERCIALE
     │    └─ MARKETING            (area propria: budget/fissi/variabili/dir. — a supporto del commerciale)
     └─ PRODUZIONE                (= somma del VALORE prodotto dai centri)
          ├─ FORMAZIONE           (sotto-area)
          ├─ SORVEGLIANZA SANITARIA (sotto-area)
          └─ CENTRI DI COSTO:  Analisi · Antincendio · Ambiente · Estintori · Cantieri ·
                               RSPP · Verifiche Terra · Documenti · Privacy · Acustica … (aggiungibili)
```

Regole:
- **HR eliminata** (non presidiata) — rimuovere come area-costo (resta al più un ruolo storico su risorsa).
- **Segreteria** resta, come **staff a lato del CDA**.
- **Sotto-aree/centri aggiungibili liberamente** dall'UI; ognuno è un mini centro di costo (§6).
- Estrai da `index.html` (v9.2) tutte le info già presenti per ogni area (KPI, responsabili, micro-aree,
  incidenze) e **rimappale** su questa tassonomia — non perdere dati esistenti.

---

## 4. Modello dati `S` (estensione)

Mantieni l'impianto `const DEF → let S`. Estendi/rivedi così (nomi indicativi, adatta all'esistente):

```js
S.grfmPct = 2;                 // % holding GRFM — configurabile (default 2)
S.incassato, S.periodicita …   // invariati

// Voci prioritarie (priorità 1) — aggiungibili a runtime
S.prioritari = [
  { id, nome, val€, tipo:'leasing|f24|iva|rateizzo|tfr|accantonamento|custom', priorita:1 }
];

// AREE — rework
S.aree = [{
  id, nome, parentId,                      // parentId per sotto-aree/centri
  natura: 'produttiva'|'costo'|'staff'|'supporto',
  priorita: 1|2|3,                         // grado "coperta" — MODIFICABILE in corsa (§8)
  budget: { fisso€, variabilePct },        // entrambi editabili a mano (default da previsionale §2.2)
  kpi: [{ id, nome, target, effettivo, peso }],
  // solo per centri produttivi:
  fornitoreFisso€,                         // costo fisso del centro (es. laboratorio Analisi)
  chiusa: false                            // "sotto-area chiusa" → entra nel rollup macro (§5)
}];

// PERSONALE — 3 nature
S.personale = [{
  id, nome, natura:'dipendente'|'socio'|'piva',
  areaId, centroId,
  costoAziendaAnnuo€,      // dipendente (da file §2.3) → mensile = /12  [GARANTITO, prio 1]
  costoOrario€,            // dipendente (da file) → per costo variabile centri (§6)
  fissoMensile€,           // socio (es. 4800) [GARANTITO, prio 1]
  // piva: nessun garantito; il compenso è costo VARIABILE dell'area (fattura)
  variabile: {            // premi/benefit da KPI (§9)
    modo:'mese'|'trimestre',
    maturato€, liquidato€, storico:[{ mese, maturato€, liquidato€ }]
  },
  kpiGateAreaId           // area i cui KPI fanno da cancello sul variabile (§9)
}];

S.snaps = [ … ];          // storico snapshot — invariato, ma includi maturato/liquidato premi
```

---

## 5. Cascata `flow()` con priorità (motore)

```
inc                      = incassato del mese (100%)
grfm                     = inc * S.grfmPct/100                        [prio 1]
prioritari               = Σ S.prioritari[].val                        [prio 1]  (leasing, F24, IVA, rateizzi, TFR, accant. + custom)
garantito                = Σ personale (dipendenti costoAziendaAnnuo/12 + soci fissoMensile)   [prio 1]
────────────────────────
LIQUIDITÀ DISPONIBILE     = inc − grfm − prioritari − garantito         ← voce evidenziata in UI

budgetAreeFisso          = Σ area.budget.fisso                         [prio 2]
budgetAreeVar            = Σ area.budget.variabilePct/100 * inc        [prio 2]
poolPremi (proposto)     = Σ premi sbloccati dai KPI (§9)              [prio 3]

// AUTO-COMPRESSIONE (la "coperta"):
// se LIQUIDITÀ DISPONIBILE < budgetAreeFisso + budgetAreeVar + poolPremi:
//   comprimi PRIMA prio 3 (premi), POI prio 2 (variabile aree), MAI prio 1.
//   La priorità di ogni voce è MODIFICABILE (§8) → l'ordine di compressione segue quella.
utili                    = LIQUIDITÀ DISPONIBILE − budgetAreeFisso − budgetAreeVar − poolPremiEffettivo
```

### 5.1 Rollup area (richiesta esplicita di Roberto)
Quando le **sotto-aree sono "chiuse"** (`chiusa:true`), la **macro area** deve mostrare:
- **valore prodotto €**, **costo € (fisso+variabile+personale imputato)**, **margine €** e **margine %** (§6);
- **peso su SSI**: `costoArea / incassato` → in **% e in € assoluti**.
Vista aggregata: ogni macro area = card con questi 4-5 numeri; somma dei pesi coerente con la coperta.

---

## 6. Centri di costo / margine (aree produttive)

Per ogni **centro** (Analisi, Antincendio, …):
```
valore€        = € generati sul centro (dalla griglia Produzione tecnici già esistente)
costoFisso€    = area.fornitoreFisso (es. laboratorio/fornitore)
costoVar€      = Σ (ore tecnico sul centro × costoOrario tecnico)      // da file dipendenti §2.3
margine€       = valore − costoFisso − costoVar
margine%       = margine / valore
```
- **Produzione** (macro) = **Σ valore centri** − Σ costi centri.
- **KPI primario del centro = margine %** (con target). È l'indicatore che dice se il centro conviene
  e "quanto serve all'area" economicamente. Mettilo in evidenza sul cruscotto.

---

## 7. Personale — 3 nature

- **Dipendente:** garantito mensile = `costoAziendaAnnuo/12` (da file §2.3), priorità 1. `costoOrario` alimenta §6.
- **Socio:** `fissoMensile` garantito (default €4.800), priorità 1.
- **P.IVA (agenti/tecnici a fattura):** **nessun garantito**; il compenso è **costo variabile dell'area**
  (scala col fatturato). Non entra in "garantito", entra nel budget variabile dell'area.
- Il **variabile/premio** (tutte le nature) è calcolato dai KPI (§9), mai garantito.

---

## 8. Priorità "coperta" — modificabile in corsa

- Ogni voce (prioritari, aree, premi) ha `priorita ∈ {1,2,3}`, **editabile dall'UI in qualsiasi momento**.
- L'ordine di **auto-compressione** (§5) segue la priorità corrente: si comprime dal grado 3 verso l'1,
  **mai il grado 1**.
- Roberto deve poter **spostare una voce** da un grado all'altro e vedere subito l'effetto sulla cascata.

---

## 9. Premi / pannello direttore d'area

### 9.1 Calcolo
- Il **variabile individuale = quota personale × cancello area**: la quota (ciò che la risorsa ha
  prodotto/venduto) matura solo se i **KPI dell'area** (`kpiGateAreaId`) sono ≥ soglia (soglia bonus in
  v9 = 101% del target — **riusa la logica già presente nel file GitHub**, non reinventarla).
- Il sistema calcola un **pool premi proposto** per area (da margine/KPI), **entro la capienza** della
  liquidità disponibile.

### 9.2 UI — proposta automatica + slider (richiesta A)
- Per ogni area con KPI ok: mostra la **ricompensa proposta in automatico**.
- Fornisci una **linea/slider** che Roberto può **alzare o abbassare**; in tempo reale restituisce:
  **valore della ricompensa** e **eventuale sforamento** rispetto alla capienza.
- Il **direttore d'area** può **distribuire** il pool tra le sue persone **oppure non distribuirlo e
  tenerlo per sé**. Al CDA interessa solo che l'**area resti economicamente sostenibile**.

### 9.3 Maturazione (richiesta B)
- Toggle **mese / trimestre** per la maturazione dei premi.
- Default: **liquidare sul mese**; il residuo non liquidato **si accumula** (`maturato€`).
- **Storico** premi per risorsa/area: `{mese, maturato€, liquidato€}` — visibile e negli snapshot.

---

## 10. Import PF + Previsionale + Dipendenti (pagina dedicata)

- Nuova **pagina/tab "Import"** nella sidebar.
- Upload `.xlsx` (aggiungi **SheetJS/xlsx.js** via CDN se non presente). Legge i fogli §2.1 / §2.2 / §2.3.
- **Mapping automatico:** PF col A→area · riga vs 151→fisso/variabile · previsionale col D→% default budget ·
  dipendenti col B→costo azienda.
- **Anteprima + conferma** prima di sovrascrivere `S` (mostra decomposizione, evidenzia annidamenti §2).
- **Fase 2 (non ora):** collegamento live al Google Sheet via "pubblica sul web → CSV" (un link, niente OAuth).

---

## 11. Soglia di sostenibilità (break-even di liquidità)

Semaforo live nel Dashboard CDA:
```
Z (rosso)  = prioritari + garantito                    → sotto: a rischio i GARANTITI
Y (giallo) = Z + budget fisso aree                     → sotto: niente VARIABILI
X (verde)  = Y + budget variabile + accantonamenti     → sotto: intacchi UTILI/accantonamenti
```
Confronta `incassato` con X/Y/Z e mostra il colore + di quanto sei sopra/sotto ciascuna soglia.

---

## 12. Da PRESERVARE (non rompere)

- **Supabase** sync multi-dispositivo (progetto `qujxbvootvollmziaqrd`, tabella `compensi_snapshots`) + fallback locale.
- **Login** card singola "SSI · Direzione" (un bottone, no PIN).
- **Snapshot mensili + Storico**, **Export/Import JSON**, **Export PDF** (jsPDF).
- **Design system** DM Sans/Mono, **Chart.js** grafici.
- **Organigramma** e **griglia Produzione tecnici** (buone, vanno rimappate non buttate).
- Deploy **GitHub Pages** `maci81x.github.io/compensi-ssi`.

---

## 13. Ordine di implementazione consigliato

1. **Import** (§10) → così i dati veri entrano subito e validi la mappatura.
2. **Tassonomia aree + organigramma** (§3) e rework `S.aree` (§4).
3. **Personale 3 nature + lordo** (§7) e cascata con priorità (§5, §8).
4. **Centri di costo / margine** (§6) + rollup area (§5.1).
5. **Premi / pannello direttore** con slider (§9) + **soglia sostenibilità** (§11).
6. QA sui numeri contro PF/Previsionale, poi snapshot.
7. **Ricavo per centro come % di default + passata grafica CDA-ready** (§D
   sotto, Fase 7 chiusa 2026-07-23).
8. **Chiusura gap costi aziendali + guida operativa aggiornata + correzioni
   minori** (§E sotto, Fase 8 chiusa 2026-07-23).
9. **Fix doppio conteggio budget aree + pagina Sistema estesa + meta
   no-cache** (§F sotto, Fase 9 chiusa 2026-07-23).
10. **DnD organigramma + Segreteria layout + CRUD centri in pagina +
    KPI macro area + dedup import PF** (§G-I sotto, Fase 10 chiusa
    2026-07-23).

## 15. Fase 7 — Ricavo per centro % + passata grafica (chiusa 2026-07-23)

### 15.1 Ripartizione % del fatturato (SPEC §D)
- **8 unità produttive** con ricavo assegnato come % di `S.incassato`:
  i 6 centri sotto `prod` + `form` (Formazione) + `sorvsan` (Sorv. Sanitaria).
- **Costante** `UNITA_PRODUTTIVE_RIC_PCT_IDS` in `index.html` (near line 3095).
- **Default v7** (`RIC_PCT_DEFAULT_V7`) ragionato su fissi reali + volumi
  attesi, somma 100%:
  Sorveglianza Sanitaria 20 · Antincendio 18 · Documenti 15 · Formazione 15 ·
  RSPP 12 · Ambiente 10 · Cantieri 8 · Verifiche Terra 2.
- **Override "REALE"** automatico: `ricavoManuale > 0` vince sempre — cioè
  quando l'utente inserisce un ricavo reale (da contabilità o gestionale)
  quello sostituisce la stima senza cambio di modo. Badge STIMA/REALE/TECNICO.
- **Sum tracker** in UI: mostra somma corrente vs attesa (100 meno i pesi
  delle unità switchate a manuale/tecnico). Bottone "Normalizza a 100%" che
  scala proporzionalmente le % rimaste.
- **Margine aziendale confrontato col REALE YTD 23,41%** in Dashboard Centri
  di costo — semaforo verde/giallo/rosso su Δ ≤ 5 / ≤ 10 / > 10 pt.
  Formula: `(incassato − fornitori centri − sistema − prioritari − tasse) /
  incassato`. Comparabile con `(fatturato − costi esterni) / fatturato` del
  foglio REALE.
- **Contribuzione centri** (Σ valore − Σ costi centri) mostrata come metric
  informativa separata, NON confrontabile col margine reale aziendale (copre
  solo costi imputabili ai centri, non gli overhead).

### 15.2 Schema v7 + migrazione
- `CURRENT_SCHEMA_VERSION = 7`, nuovo step `SCHEMA_MIGRATIONS[to:7]`.
- Applica DEF v7 SOLO dove l'utente non ha già un override esplicito
  (`ricavoManuale > 0` o `ricavoPct > 0` con modo `percentuale`).
- Un `ricavoModo === 'tecnico'` legacy viene ribaltato a `percentuale` (il
  vecchio default era `tecnico`); l'utente può rimettere `tecnico` dall'UI.

### 15.3 Passata grafica CDA-ready
- **KPI gerarchizzati**: `.mc.hero` (banner semaforo 30px), `.mc.primary`
  (Liquidità/Utili/Margine 26px). Su Dashboard CDA i primi 3 numeri che il
  lettore vede sono liquidità disponibile, utili del mese, margine modello.
- **Print CSS A4** esteso (`@page` + page-breaks + colori azzerati + tabelle
  con `thead/tfoot` ripetuti). Pronto per stampa CDA di Dashboard, Centri di
  costo, Premi. Nasconde nav/topbar/pulsanti/select/notif.
- **Organigramma**: `CW 148→160`, `CH 80→86`, `HGAP 20→32`, `VGAP 50→64`,
  `PAD 24→28`. Card più leggibili senza zoom, drag&drop già evidente
  (esistente Fase 6).
- **Coerenza componenti**: nuove classi riusabili `.kpi-strip / .kpi-cell /
  .pane / .pane-title / .alert{.info|.warn|.err|.ok} / .tbl-clean /
  .tbl-foot / .badge.b-info`. Colori sempre via variabili semaforo
  (`--green/amber/red`) — nessun HEX inline nuovo.

### 15.4 Pulizia dati (2026-07-23)
- Cancellati da `compensi_snapshots` i 2 snapshot "giugno 2026" anomali
  (`incassato = 2.024.840` = budget annuo scambiato per mensile, non dato
  reale — snapshot di test del 10 giugno) e la riga `TEST 2099-01`.
- Rimosse anche le voci gemelle da `S.snaps` in `compensi_stato`.
- Tabella `compensi_snapshots` **vuota**: primo snapshot reale = luglio 2026.

## 16. Fase 8 — Chiusura gap costi aziendali (chiusa 2026-07-23)

### 16.1 Diagnosi (§E)
Il modello pre-Fase 8 sottostimava ~50k/mese di costi esterni rispetto al
foglio Controllo di gestione (77k modellati vs ~128k reali), portando a un
margine 40,6% vs reale 23,4% (Δ 17 pt). Due cause distinte:

- **BUG doppio conteggio** (~16,6k/mese): `totSistemaFissi` in
  `margineAziendaleStimato` includeva già le 57 voci con `areaId` puntante
  a un centro (form/sorvsan/c_ambiente/c_antincendio/c_verifiche_terra),
  che sono le STESSE voci di `S.aree[centro].fornitori` — quindi contate
  due volte.
- **GAP personale interno** (~54k/mese): il "margine 23% del foglio
  Controllo di gestione" è dopo-personale (fatturato − costi esterni che
  includono stipendi). Il modello escludeva garantito personale + CDA.

### 16.2 Fix (formula margineAziendaleStimato in index.html)
```
margine_aziendale = incassato − (
  fornitori_centri +
  sistema_dedotto (totSistemaFissi − voci con areaId nei centri) +
  prioritari +
  tasse +
  garantito_personale (dipendenti + soci) +
  cda +
  altri_costi_operativi (S.altriCostiOperativi, default 15k)
) / incassato
```

- Il dedup è a runtime: nessuna migrazione dei dati (`S.sistemaFissi` resta
  intatto, la formula filtra).
- `S.altriCostiOperativi` è configurabile: rappresenta ammortamenti +
  materiali + subappalti occasionali + provvigioni variabili agenti — voci
  del foglio REALE non ancora catalogate puntualmente. Badge STIMA.

### 16.3 Effetto validato
| Incassato | Margine modello | vs Reale YTD 23,41% |
|---|---:|---|
| 130.000 (default) | −0,08% | Δ 23,5 pt — default troppo basso vs realtà |
| **174.265** (media reale 5 mesi 2026) | **25,34%** | **Δ 1,93 pt ✅** entro ±5 pt |
| 200.000 (cloud attuale) | 34,95% | Δ 11,5 pt — mese sopra media |

### 16.4 Schema v8 + migrazione
- `CURRENT_SCHEMA_VERSION = 8`.
- Migrazione `to:8`: aggiunge `S.altriCostiOperativi = 15000` solo se
  assente. Non tocca altri campi.

### 16.5 UI (Centri di costo)
- Nuovo pannello espandibile con **composizione costi aziendali**
  dettagliata (7 righe: fornitori centri · sistema dedotto · prioritari ·
  tasse · personale interno · CDA · altri costi operativi editabili).
- Footer con totale + % dell'incassato.
- Il pannello è aperto di default quando margine diverge >5 pt dal reale,
  chiuso altrimenti.

### 16.6 Guida operativa riscritta
- Da 8 passi (pre-Fase 2) a **13 passi** allineati alla v10.
- Corretto "i dati non si salvano automaticamente" (dalla Fase 3 c'è
  autosave localStorage + sync cloud).
- Aggiornato passo "aree operative" con tassonomia corrente (Formazione,
  Marketing, Sorveglianza Sanitaria, Amministrazione, Segreteria — HR
  rimossa).
- Aggiunti passi mancanti: Personale a lordo, Centri di costo + %
  ripartizione, Premi & pannello direttore, Semaforo X/Y/Z, Simulatore +
  break-even, Organigramma drag&drop, Import Excel, Voci prioritarie.
- "Chi inserisce cosa" allineato (Marco = Dir. Marketing autonomo sotto
  Commerciale, non più "HR/MKT").

### 16.7 Correzioni minori
- Etichetta login footer: **v9 → v10 · Fasi 1-8**.
- Passo 3 wizard **semplificato**: mostrava 4 voci %-based (GRFM, costi
  fissi, costi variabili, accantonamenti). Solo GRFM (`S.voci[0]`) è ancora
  usata autoritativa dalla cascata; le altre 3 erano legacy (calcolate ma
  non sommate agli utili dalla Fase 3, sostituite da Sistema/Prioritari/
  Tasse puntuali in €). Ora il passo mostra solo GRFM + CDA + Soglia KPI
  con banner esplicativo. Voci legacy restano in `S.voci` per compatibilità
  waterfall/simulatore legacy.

## 17. Fase 9 — Fix doppio conteggio budget aree + Sistema esteso (chiusa 2026-07-23)

### 17.1 Bug diagnosticato (§F)
Nel `flow()` la cascata sottraeva `poolP2 = Σ (area.budget.fisso +
area.budget.variabilePct × inc)` come costo di priorità 2 — cioè il tetto
% del previsionale (Commerciale 17,25% + Produzione 11,31% + Amministrazione
10,46% + Marketing 5,77% + Formazione 8,5% + Segreteria 3,92% = 57,21%
dell'incassato = 99.697/mese con inc=174k). Ma i costi reali di queste
aree sono **già** contati altrove:

- Provvigioni agenti, docenti esterni, medici, spese marketing, fornitori
  centri → in `sistemaFissi` con `areaId` puntante all'area (sommati in
  `totSistema()` = 43.994 include 27.905 di queste voci con areaId).
- Personale dipendente + soci di ogni area → in `garantitoPersonale` P1
  (40.916/mese).

**Totale ~68,8k/mese contato due volte**. Utili sempre 0 anche con
incassato realistico perché la cascata comprimeva il pool per non
andare negativa.

### 17.2 Soluzione applicata
```
// PRIMA (Fase 3-8, buggato):
pool2e3 = [ ...prioritariNon1,
            ...S.aree.map(a => budgetArea(a, inc)),   // <-- doppio conteggio
            {nome:'Premi', val:premiRichiesti, priorita:3} ];

// DOPO (Fase 9):
pool2e3 = [ ...prioritariNon1,
            {nome:'Premi', val:premiRichiesti, priorita:3} ];
// Budget area esposto come flow().budgetAreeTeorico, monitoraggio, non costo.

// altriCostiOperativi spostato in P1 (era solo in margineAziendaleStimato):
prioritariBase.push({nome:'Altri costi operativi', val:S.altriCostiOperativi, priorita:1});
```

### 17.3 Effetto validato (con incassato reale)
| Incassato | flow.utili | flow.margine% | vs reale 23,41% |
|---|---:|---:|---:|
| 130.000 (default troppo basso) | −6.599 | −5,08% | segnala perdita (corretto) |
| **174.265** (media reale 5 mesi 2026) | **35.453** | **20,34%** | **Δ 3,07 pt ✅** |
| 200.000 (cloud) | 61.188 | 30,60% | Δ 7,19 pt (mese sopra media) |

Coerente con `margineAziendaleStimato` (Fase 8, includeva già gli stessi
costi). La piccola differenza residua tra i due (~5 pt) è dovuta al fatto
che flow include GRFM come costo che consuma liquidità SSI, mentre
margineAziendaleStimato lo esclude (GRFM è trattenuta holding, non
"costo esterno" ai fini del margine reale del foglio Controllo di
gestione).

### 17.4 Pagina Sistema estesa (SPEC §F, richiesta esplicita utente)
- Blocchi **COSTI FISSI** / **COSTI VARIABILI** separati:
  - Ognuno con **tabella** completa (nome · categoria · area · natura ·
    €/mese · %inc · azioni).
  - **Totale € e % dell'incassato** in intestazione di ciascun blocco.
- Banner `kpi-strip` in cima con 3 card: fissi filtrati · variabili
  filtrati · totale filtrato (con % incassato).
- **Filtri**:
  - Area: 13 aree del modello + "— Nessuna area (overhead puro)" + tutte.
  - Natura: solo fissi / solo variabili / tutte.
  - Ricerca testuale su nome/categoria/area (debounce 250ms).
  - Bottone "Reset filtri".
- Ogni **riga** ha dropdown per cambiare in-place:
  - **Area** (con save immediato).
  - **Natura** (fisso↔variabile con save immediato).
- CRUD completo: nome/valore inline editing, aggiungi voce, aggiungi
  categoria, elimina voce (con conferma).
- Persistenza filtri tra render (window.sistemaFilters).

### 17.5 Meta no-cache
Aggiunti nell'HTML `<head>`:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

Motivazione: dopo un deploy Live, il browser può servire per ore la
vecchia versione dalla cache (GitHub Pages ha `cache-control:
max-age=600` di suo). Con questi meta ogni load prende la nuova versione
subito. Root cause fix del sintomo "regressione X" riportato da utenti
mentre l'app in realtà era già stata aggiornata.

### 17.6 Debug organigramma "vuoto sul live"
Segnalato dall'utente come regressione bloccante. Verificato con
screenshot headless sul live (`https://maci81x.github.io/compensi-ssi/`):
- SVG 992×620 renderizzato correttamente.
- 12/12 card visibili (GRFM, SSI SRL €200k, CDA €13.6k, Utili €0, Gaia,
  Commerciale €34.5k, Marketing €11.5k, Produzione €22.6k, Formazione
  €17k, Sorveglianza Sa…, Amministrazione €20.9k, Segreteria €7.8k).
- 0 errori console.

Non era regressione codice → cache browser utente (mitigato con meta
no-cache §17.5).

## 18. Fase 10 — Fix DnD org + layout Segreteria + CRUD centri in pagina + KPI macro area + dedup import PF (chiusa 2026-07-23)

### 18.1 Fix DnD organigramma (§G)
Segnalato: il codice DnD (pointerdown/pointermove/setPointerCapture) c'è
ma trascinare le card non fa nulla. Test headless con mouse simulato
conferma il reparent funziona in headless; ipotesi era touch-action /
user-select mancanti su desktop mac (Chrome/Safari) o touch device
intercettano il gesto come pan/scroll o selezione.

Fix:
- `svg.style.touchAction='none'` + `user-select:none` +
  `-webkit-user-select:none` sull'SVG root.
- `fg.style.touchAction='none'` su ogni card SVG.
- `evt.preventDefault()` nel pointerdown handler.

Test: reparent Marketing→Amministrazione via `page.mouse.down/move/up`
di Playwright passa. Prima del fix su alcuni browser il gesto veniva
consumato dal browser prima di arrivare all'handler.

### 18.2 Layout Segreteria (§G)
Prima: Segreteria era nella colonna verticale CDA → Utili → Gaia →
**Segreteria** (posizionata a `nSis.y = nGaia.y + CH + 20`), come se
dipendesse dagli Utili.

Fix: `nSis.x = nCDA.x + CW + 30; nSis.y = nCDA.y;` — Segreteria a lato
del CDA, stessa fascia y (357), connessione orizzontale `lat-r` (linea
tratteggiata di staff). Se l'utente la trascina altrove, la nuova
posizione da `parentId` prevale (`sisIsDefault` false).

### 18.3 CRUD centri di costo nella pagina Centri di costo (§G)
Richiesto dall'utente: `addArea()` esisteva ma il bottone solo in
Struttura & aree. Portata la gestione completa nella pagina Centri di
costo:
- Nuove funzioni `addCentroDaCentri()` (nome via prompt, crea sotto
  Produzione con modo manuale) e `eliminaCentroCosto(id)` (con conferma
  + rimozione di ripartizioneCentri/oreEffettiveCentro del personale che
  puntava a quel centro).
- Colonna "Azioni" con ✕ per riga: solo i 6 centri storici + custom sono
  eliminabili (form/sorvsan strutturali, non eliminabili qui).
- Nome del centro editabile inline (input nella prima colonna).
- `syncUnitaProduttive()` aggiunto in cima a `renderCentriCostoPage`:
  garantisce che centri custom (aggiunti runtime) siano nell'array
  `UNITA_PRODUTTIVE_RIC_PCT_IDS` — necessario perché `const` array
  perde i push tra reload; syncUnitaProduttive li reidenta da S.aree
  ad ogni render.
- Accesso da Struttura & aree conservato per compatibilità.

### 18.4 KPI MACRO per area (§H)
Richiesto: KPI macro sintetico per ogni area con target ed effettivo,
calcolato come media pesata dei micro OPPURE manuale. Deve fare da
cancello per i premi. CRUD completo.

Modello dati (schema v9, migrazione additiva su ogni area):
```js
a.macro = {
  nome: 'KPI '+a.nome,   // rinominabile dall'UI
  modo: 'auto' | 'manuale',
  target: 100,           // rilevante in modo manuale (in auto è implicito 100%)
  effettivo: 0,          // rilevante in modo manuale
  pesoMicro: {},         // { microIdx: peso }, default 1 se assente
};
```

Motore:
- `areaMacroKpi(a)`: se `modo=='manuale'` → `(effettivo/target)*100`.
  Altrimenti media pesata dei `kpiM(micro)` non-null con pesi da
  `a.macro.pesoMicro` (default 1).
- `kpiA(a)` diventa wrapper su `areaMacroKpi(a)` — tutte le viste
  esistenti (waterfall, gate premi, semaforo bonus) prendono il macro.
- `bonusOk(kpiA(a))` inalterato → il gate dei premi area usa la nuova
  logica trasparentemente.

UI in Struttura & aree (renderStep5):
- Pannello dedicato in cima a ogni area con nome/modo/target(/effettivo)/
  valore attuale + indicazione "sblocca/blocca premi area".
- In modo auto: colonna "Peso" nella tabella micro editabile per ogni
  micro-KPI.
- In modo manuale: colonna Peso nascosta + nota "non contribuiscono al
  macro in modo manuale" nella tabella micro.

### 18.5 Dedup import PF su re-import (§I)
Diagnosi: `findPossibileDoppione(v)` escludeva le voci già importate
(`if(sf.areaPF)return false`), quindi al re-import dello stesso file le
righe apparivano tutte come "nuove" e venivano DUPLICATE. Inoltre
`applyImport` in modalità merge sovrascriveva `natura` e `areaPF` senza
preservare eventuali override manuali dell'utente.

Fix:
1. Nuova `pfImportKey(v) = 'PF/'+normalizeStr(areaPF+'|'+cat+'|'+voce)`
   — chiave stabile che sopravvive a rename di `sf.nome` e cambio di
   `sf.val` (val nuovo può essere diverso).
2. Ogni voce importata (nuova o merge) riceve `sf.importKey=key`.
3. `findPossibileDoppione` cerca **prima** per importKey (match esatto,
   priorità massima) e **poi** fallback su similarità nome+valore. Ora
   trova anche voci con `areaPF` settato (era il bug).
4. `applyImport` merge branch: rispetta `sf.userEdited={natura, areaPF}`
   — se true, non li sovrascrive. Aggiorna sempre `sf.val` (importo
   aggiornato è comunque atteso).
5. Nella pagina Sistema, i dropdown natura/area settano
   `sf.userEdited.natura=true` / `sf.userEdited.areaPF=true` quando
   l'utente li cambia manualmente.
6. Log console: `[applyImport] N voci con override utente preservate`
   quando si trigga il branch.

### 18.6 Fresh boot migration fix
Bug scoperto durante il QA della Fase 10: le migrazioni schema si
applicavano solo su stato in arrivo (localStorage/cloud in
`restoreLocal`/`applyIncomingState`), NON su un fresh boot dove
`S = JSON.parse(JSON.stringify(DEF))` e `S.schemaVersion === CURRENT_SCHEMA_VERSION`
già dal DEF, quindi `SCHEMA_MIGRATIONS.filter(m=>m.to>v)` restituiva
lista vuota.

Impatto: il campo `a.macro` (aggiunto dalla migrazione v9) non veniva
creato su una installazione pulita perché il DEF non lo include.

Fix: `S.schemaVersion=0; migrateSchema(S);` subito dopo la definizione
di `migrateSchema`. Le migrazioni sono tutte additive/idempotenti,
quindi rieseguirle da 0 su un DEF nuovo non crea problemi (aggiungono
solo campi mancanti).

---

## 14. Da confermare in fase di implementazione (con Roberto)

- Decomposizione esatta dei blocchi del Previsionale (annidamenti fissi/personale/servizi) → in anteprima import.
- Elenco iniziale dei **costi prioritari** di default (leasing, F24, IVA, rateizzi cartelle, TFR, consulenti fissi):
  Roberto conferma quali sono "priorità 1" alla prima compilazione.
- Formula esatta del **pool premi proposto** (in % del margine area? del variabile maturato?) — parti da
  "quota personale × gate KPI area" già presente in v9 e affina con Roberto.
- **Aperto lato DB (Fase 5, ancora aperto):** le policy RLS di
  `compensi_snapshots` non consentono la `DELETE` con la chiave anon usata dal
  client. L'app rileva l'esito e mostra errore esplicito, ma serve UNA:
  policy DELETE per ruolo anon, oppure login Supabase reale (oggi solo
  `currentUser` locale). L'MCP admin bypassa comunque le RLS (usato per la
  pulizia snapshot del 2026-07-23).
- **Chiuso in Fase 8 (2026-07-23):** il gap costi 50k/mese è stato risolto
  fixando il doppio conteggio in `margineAziendaleStimato` (voci
  sistemaFissi con areaId nei centri) e includendo personale interno +
  `altriCostiOperativi` (default 15k, editabile). Con incassato 174k
  medio 2026 il margine modello è 25,34% vs reale 23,41% (Δ 1,93 pt).
  Vedi §16 per il dettaglio. **Rimane aperto Fase 9**: spacchettare
  `altriCostiOperativi` in voci concrete (ammortamenti, materiali,
  subappalti, provvigioni variabili) quando arriveranno i dati puntuali.
